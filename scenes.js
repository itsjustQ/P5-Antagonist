// ========== ROUND SCENES ==========
// Short stylized scenes that play before a round's countdown, showing the beetle as the hunter, and the retreat
// that plays when a round ends. Scenes only move sprites the game already has around, plus a few shapes and
// anime-style emotes. Times are in frames (60 a second) and positions are in the round's gameplay space.
//
// A scene starts from the round as nextRound() built it: every real ant has a home (antX/antY) and the beetle's
// home is the center. Scenes either start with the ants already home, or bring them in at the end, so the
// countdown that follows always starts from exactly what the round looks like.

let roundScene = null;            // The scene playing before the countdown, or null
let roundScenePending = false;    // startRoundIntro() asked for one; it's built once the round's ants exist
let roundsUntilAbilityScene = 0;  // Generic rounds left before the next ability scene (3-5, random)
let abilitySceneAfterQueen = false;
let sceneAbilitySeen = {};        // Ability key -> round it first showed up this run (the newest gets priority)
let sceneForcedId = null;         // Dev/tutorial override for the next scene

const SCENE_MAX_FRAMES = 840;     // Nothing runs longer than 14 seconds
const SCENE_SKIP_GRACE = 15;      // Frames before a scene can be skipped (so the key that started the round doesn't)

function sceneEase(kind, x) {
  x = constrain(x, 0, 1);
  switch (kind) {
    case 'linear': return x;
    case 'in': return x * x;
    case 'out': return 1 - (1 - x) * (1 - x);
    case 'back': { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
    case 'snap': return 1 - Math.pow(1 - x, 4);
    default: return x * x * (3 - 2 * x);
  }
}

function sceneLerpAngle(a, b, f) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * f;
}

// ---------- Actors ----------

class SceneActor {
  constructor(scene, kind, x, y, opts = {}) {
    this.scene = scene;
    this.kind = kind;            // 'beetle', 'ant' or 'queen'
    this.x = x;
    this.y = y;
    this.angle = opts.angle || 0;
    this.size = opts.size || 1;  // Ant size gene (sprite is 45 + 15 * size)
    this.alpha = opts.alpha === undefined ? 1 : opts.alpha;
    this.scale = 1;
    this.air = 0;
    this.visible = opts.visible !== false;
    this.look = opts.look === undefined ? 'move' : opts.look; // 'move', another actor, or an angle
    this.turnRate = 0.25;
    this.moves = [];
    this.timed = [];             // { t, fn } one-shots on this actor
    this.fades = [];
    this.emotes = [];
    this.flashUntil = -1;
    this.shakeUntil = -1;
    this.shakeAmp = 0;
    this.spin = 0;
    this.dig = null;             // { t0, dur } rising out of the ground
    this.burrow = null;          // { t0, dur } sinking into the ground
    this.home = null;
    this.tint = null;
    this.shield = false;
    this.fuse = null;            // { t0, dur, r }
    this.trail = false;          // Speed-line streaks behind fast moves
    this.shade = 0;              // 0-1: how much of it is still lost in shadow (a dark silhouette at 1)
  }

  imageSize() {
    if (this.kind === 'beetle') return 130;
    if (this.kind === 'queen') return 45 + 15 * QOQ_ANT_SIZE; // Only the Queen of Queens appears in scenes
    return 45 + 15 * this.size;
  }

  // Move to (x, y) from wherever it is at t0. opts: { arc: hop height, trail: speed lines }
  move(t0, dur, x, y, ease = 'inOut', opts = {}) {
    this.moves.push({ t0: t0, dur: Math.max(1, dur), x: x, y: y, ease: ease, arc: opts.arc || 0, trail: !!opts.trail, started: false, done: false });
    this.scene.extend(t0 + dur);
    return this;
  }

  // Move along a list of points, spending `each` frames per leg
  path(t0, each, points, ease = 'linear', opts = {}) {
    let t = t0;
    for (const p of points) {
      this.move(t, each, p[0], p[1], ease, opts);
      t += each;
    }
    return this;
  }

  at(t, fn) {
    this.timed.push({ t: t, fn: fn, done: false });
    this.scene.extend(t);
    return this;
  }

  face(t, target) { return this.at(t, () => { this.look = target; }); }
  show(t, on = true) { return this.at(t, () => { this.visible = on; }); }
  fade(t0, dur, to) {
    this.fades.push({ t0: t0, dur: Math.max(1, dur), to: to, from: null });
    this.scene.extend(t0 + dur);
    return this;
  }
  emote(t, type, dur = 60) {
    this.emotes.push({ t: t, type: type, dur: dur });
    this.scene.extend(t);
    return this;
  }
  flash(t, dur = 12) { return this.at(t, () => { this.flashUntil = this.scene.t + dur; }); }
  shake(t, dur, amp = 3) { return this.at(t, () => { this.shakeUntil = this.scene.t + dur; this.shakeAmp = amp; }); }
  digUp(t0, dur = 34) {
    this.visible = false;
    this.at(t0, () => {
      this.visible = true;
      this.dig = { t0: t0, dur: dur };
      this.scene.dirt(this.x, this.y, 10 + 4 * this.size);
    });
    this.scene.extend(t0 + dur);
    return this;
  }
  burrowDown(t0, dur = 26) {
    this.at(t0, () => {
      this.burrow = { t0: t0, dur: dur };
      this.scene.dirt(this.x, this.y, 8 + 4 * this.size);
    });
    return this.show(t0 + dur, false);
  }
  // Eaten / squashed: a pop and it's gone
  die(t, kind = 'eat') {
    return this.at(t, () => {
      this.visible = false;
      this.scene.poof(this.x, this.y, kind === 'squash' ? 26 : 18, kind === 'explode');
    });
  }

  update(t) {
    for (const e of this.timed) {
      if (!e.done && t >= e.t) {
        e.done = true;
        e.fn();
      }
    }
    for (const f of this.fades) {
      if (t < f.t0) continue;
      if (f.from === null) f.from = this.alpha;
      this.alpha = lerp(f.from, f.to, constrain((t - f.t0) / f.dur, 0, 1));
    }
    const px = this.x;
    const py = this.y;
    this.air = 0;
    this.trail = false;
    for (const m of this.moves) {
      if (m.done || t < m.t0) continue;
      if (!m.started) {
        m.started = true;
        m.sx = this.x;
        m.sy = this.y;
      }
      const f = constrain((t - m.t0) / m.dur, 0, 1);
      const e = sceneEase(m.ease, f);
      this.x = lerp(m.sx, m.x, e);
      this.y = lerp(m.sy, m.y, e);
      if (m.arc) this.air = Math.sin(f * Math.PI) * m.arc;
      if (m.trail && f < 1) this.trail = true;
      if (f >= 1) m.done = true;
    }
    if (this.airOverride) this.air = Math.max(this.air, this.airOverride);
    const vx = this.x - px;
    const vy = this.y - py;
    this.speed = Math.sqrt(vx * vx + vy * vy);
    let want = null;
    if (this.look === 'move') {
      if (this.speed > 0.2) want = Math.atan2(vy, vx);
    } else if (this.look instanceof SceneActor) {
      want = Math.atan2(this.look.y - this.y, this.look.x - this.x);
    } else if (typeof this.look === 'number') {
      want = this.look;
    } else if (this.look && this.look.x !== undefined) {
      want = Math.atan2(this.look.y - this.y, this.look.x - this.x);
    }
    if (want !== null) this.angle = sceneLerpAngle(this.angle, want, this.speed > 6 ? 0.6 : this.turnRate);
    if (this.spin) this.angle += this.spin;
  }

  drawShadow() {
    if (!this.visible || this.alpha <= 0.01) return;
    const s = this.imageSize() * this.scale;
    let rise = 1;
    if (this.dig) rise = constrain((this.scene.t - this.dig.t0) / this.dig.dur, 0, 1);
    if (this.burrow) rise = 1 - constrain((this.scene.t - this.burrow.t0) / this.burrow.dur, 0, 1);
    const airScale = map(constrain(this.air, 0, 120), 0, 120, 1, 0.55);
    drawGroundShadow(this.x, this.y, s * 0.55 * airScale * rise, s * 0.25 * airScale * rise, 0, 80 * this.alpha);
  }

  draw() {
    if (!this.visible || this.alpha <= 0.01) return;
    const t = this.scene.t;
    let s = this.imageSize() * this.scale;
    let sx = 0;
    let sy = 0;
    if (t < this.shakeUntil) {
      sx = random(-this.shakeAmp, this.shakeAmp);
      sy = random(-this.shakeAmp, this.shakeAmp);
    }
    let rise = 1;
    if (this.dig) rise = constrain((t - this.dig.t0) / this.dig.dur, 0, 1);
    if (this.burrow) rise = 1 - constrain((t - this.burrow.t0) / this.burrow.dur, 0, 1);
    const sink = (1 - rise) * s * 0.35;

    if (this.trail) {
      // Streaks behind a fast move
      push();
      strokeWeight(2);
      for (let k = 0; k < 5; k++) {
        stroke(255, 255, 255, 140 - k * 22);
        const off = (k - 2) * s * 0.12;
        const back = s * (0.5 + k * 0.08);
        const ca = Math.cos(this.angle);
        const sa = Math.sin(this.angle);
        line(this.x - ca * back - sa * off, this.y - sa * back + ca * off,
          this.x - ca * (back + s * 0.9) - sa * off, this.y - sa * (back + s * 0.9) + ca * off);
      }
      pop();
    }

    push();
    angleMode(DEGREES);
    imageMode(CENTER);
    translate(this.x + sx, this.y + sy - this.air + sink);
    if (this.dig || this.burrow) {
      // Only the part above ground shows
      drawingContext.save();
      drawingContext.beginPath();
      drawingContext.rect(-s, -s, s * 2, s - sink + s * 0.05);
      drawingContext.clip();
    }
    rotate(this.angle * 180 / Math.PI);
    const img = this.kind === 'beetle' ? beetle : ant;
    const flashing = t < this.flashUntil && (t % 6) < 3;
    const lit = 1 - this.shade;
    if (this.kind === 'queen') tint(220 * lit, 160 * lit, 255 * lit, 255 * this.alpha);
    else if (this.tint) tint(this.tint[0], this.tint[1], this.tint[2], 255 * this.alpha);
    else if (flashing) tint(255, 120, 120, 255 * this.alpha);
    else if (this.alpha < 1) tint(255, 255 * this.alpha);
    image(img, 0, 0, s, s);
    if (this.dig || this.burrow) drawingContext.restore();
    pop();

    if (this.kind === 'queen') drawQueenCrown(this.x, this.y - this.air - s * 0.45, this.scale, 255 * this.alpha * lit);
    if (this.shield) {
      push();
      fill(120, 200, 255, 50 * this.alpha);
      stroke(150, 215, 255, 220 * this.alpha);
      strokeWeight(2.5);
      ellipse(this.x, this.y - this.air, s * 1.05);
      pop();
    }
    if (this.fuse && t >= this.fuse.t0) {
      const f = constrain((t - this.fuse.t0) / this.fuse.dur, 0, 1);
      const pulse = 0.5 + 0.5 * Math.sin(t * (0.3 + 0.9 * f));
      const c = f > 0.67 ? [255, 70, 50] : [190, 190, 190];
      push();
      noFill();
      stroke(c[0], c[1], c[2], 90 + 165 * pulse);
      strokeWeight(2 + 2 * f);
      ellipse(this.x, this.y, lerp(this.fuse.r * 2 + 20, 24, f));
      noStroke();
      fill(c[0], c[1], c[2], 90 * pulse);
      ellipse(this.x, this.y, 40);
      pop();
    }
  }

  drawEmotes() {
    if (!this.visible && this.kind !== 'ant') return;
    const t = this.scene.t;
    for (const e of this.emotes) {
      const age = t - e.t;
      if (age < 0 || age > e.dur) continue;
      drawSceneEmote(e.type, this.x, this.y - this.air - this.imageSize() * this.scale * 0.5 - 8, age, e.dur, this);
    }
  }
}

// Anime-style reactions over an actor's head. age/dur in frames.
function drawSceneEmote(type, x, y, age, dur, actor) {
  const popIn = age < 6 ? map(age, 0, 6, 0.3, 1.25) : (age < 10 ? map(age, 6, 10, 1.25, 1) : 1);
  const a = 255 * Math.min(1, (dur - age) / 10);
  push();
  translate(x, y);
  scale(popIn);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  switch (type) {
    case '!':
    case '?':
    case '!?':
    case '!!':
    case '...': {
      textSize(type === '...' ? 22 : 26);
      stroke(0, a);
      strokeWeight(4);
      fill(type === '?' ? color(140, 220, 255, a) : color(255, 235, 60, a));
      const shown = type === '...' ? '.'.repeat(1 + Math.floor(age / 12) % 3) : type;
      text(shown, 0, -6 + (type === '?' ? Math.sin(age * 0.2) * 2 : 0));
      break;
    }
    case 'sweat': {
      noStroke();
      fill(120, 190, 255, a);
      const dy = Math.min(10, age * 0.25);
      translate(18, -4 + dy);
      ellipse(0, 4, 10, 12);
      triangle(-4.6, 2, 4.6, 2, 0, -8);
      break;
    }
    case 'anger': {
      // The red cross-vein
      stroke(230, 30, 30, a);
      strokeWeight(3.5);
      noFill();
      const s = 7 + 1.5 * Math.sin(age * 0.5);
      translate(16, -2);
      for (const [qx, qy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        arc(qx * s * 0.75, qy * s * 0.75, s, s, qx < 0 ? (qy < 0 ? 0 : 270) : (qy < 0 ? 90 : 180), qx < 0 ? (qy < 0 ? 90 : 360) : (qy < 0 ? 180 : 270));
      }
      break;
    }
    case 'rage': {
      // Steam out of the head and a red pulse
      noStroke();
      for (let k = 0; k < 4; k++) {
        const p = ((age * 0.04) + k / 4) % 1;
        fill(255, 255, 255, a * (1 - p) * 0.8);
        ellipse((k % 2 ? 1 : -1) * (8 + p * 10), -p * 26, 8 + p * 10);
      }
      fill(255, 40, 30, a * (0.3 + 0.2 * Math.sin(age * 0.6)));
      ellipse(0, 18, 46);
      break;
    }
    case 'dizzy': {
      noStroke();
      fill(255, 240, 60, a);
      for (let k = 0; k < 5; k++) {
        const ang = age * 0.15 + k * Math.PI * 2 / 5;
        ellipse(Math.cos(ang) * 22, 14 + Math.sin(ang) * 7, 7);
      }
      break;
    }
    case 'shock': {
      stroke(255, 255, 255, a);
      strokeWeight(2.5);
      for (let k = 0; k < 7; k++) {
        const ang = -Math.PI / 2 + (k - 3) * 0.32;
        line(Math.cos(ang) * 14, Math.sin(ang) * 14 + 10, Math.cos(ang) * 26, Math.sin(ang) * 26 + 10);
      }
      break;
    }
    case 'glare': {
      // Narrowed red eyes beam toward where it faces
      stroke(255, 60, 40, a);
      strokeWeight(3);
      const ang = actor ? actor.angle : 0;
      line(0, 8, Math.cos(ang) * 30, 8 + Math.sin(ang) * 30);
      break;
    }
    case 'alert': {
      // The queen-order style shout arcs
      noFill();
      for (let k = 0; k < 3; k++) {
        const p = ((age / 26) - k * 0.18);
        if (p <= 0 || p >= 1) continue;
        stroke(255, 230, 120, a * (1 - p));
        strokeWeight(3 * (1 - p) + 1);
        ellipse(0, 12, 20 + p * 90, 20 + p * 90);
      }
      break;
    }
  }
  pop();
}

// ---------- The scene ----------

class RoundScene {
  constructor(id) {
    this.id = id;
    this.t = 0;
    this.duration = 1;
    this.actors = [];
    this.events = [];
    this.fx = [];
    this.ground = [];            // Things on the ground (territories, mounds, bunkers, mines)
    this.shakeUntil = -1;
    this.shakeAmp = 0;
    this.flashUntil = -1;
    this.overlay = null;         // Full-screen effect (tiger beetle blur) drawn under the actors
    this.W = getGameplayWidth();
    this.H = getGameplayHeight();
    this.cx = playerX;
    this.cy = playerY;
    this.roster = [];
    this.beetle = this.actor('beetle', -120, this.cy);
    this.beetle.home = { x: this.cx, y: this.cy };
    for (let i = 1; i <= enemyCount; i++) {
      if (antDormant[i]) continue;
      const a = this.actor('ant', antX[i], antY[i], { size: antSize[i], look: this.beetle });
      a.antIndex = i;
      a.home = { x: antX[i], y: antY[i] };
      a.featured = false;
      this.roster.push(a);
    }
  }

  extend(t) { this.duration = Math.max(this.duration, t); }
  actor(kind, x, y, opts) {
    const a = new SceneActor(this, kind, x, y, opts);
    this.actors.push(a);
    return a;
  }
  // A throwaway ant that isn't one of the round's (it gets eaten, blown up, or runs off)
  extra(x, y, opts = {}) {
    const a = this.actor('ant', x, y, Object.assign({ size: 1 }, opts));
    a.extra = true;
    return a;
  }
  at(t, fn) {
    this.events.push({ t: t, fn: fn, done: false });
    this.extend(t);
  }
  shake(t, dur, amp = 6) { this.at(t, () => { this.shakeUntil = this.t + dur; this.shakeAmp = amp; }); }
  flash(t, dur = 10) { this.at(t, () => { this.flashUntil = this.t + dur; this.flashDur = dur; }); }

  // Round ants that have an ability (most points first), to star in the scene
  feature(test, count) {
    const list = this.roster.filter(a => !a.featured && test(a.antIndex));
    list.sort((p, q) => getAntRatio(q.antIndex) - getAntRatio(p.antIndex));
    const picked = list.slice(0, count);
    for (const a of picked) a.featured = true;
    return picked;
  }
  // Ants not starring in the scene
  crowd() { return this.roster.filter(a => !a.featured); }

  // --- Where the crowd starts and how it gets home ---
  // 'present': already home from the start. 'run': hidden, then runs in from the nearest edge at t0.
  // 'dig': hidden, then digs out of the ground at home from t0.
  gather(t0, mode, opts = {}) {
    const crowd = this.crowd();
    const stagger = opts.stagger === undefined ? 30 : opts.stagger;
    let last = t0;
    crowd.forEach((a, k) => {
      const delay = crowd.length > 1 ? Math.floor((k / (crowd.length - 1)) * stagger + random(0, 6)) : 0;
      if (mode === 'present') {
        a.x = a.home.x;
        a.y = a.home.y;
        a.look = opts.look || this.beetle;
      } else if (mode === 'run') {
        a.visible = false;
        const from = opts.from ? opts.from(a) : this.edgeBehind(a.home.x, a.home.y);
        a.x = from.x;
        a.y = from.y;
        a.look = 'move';
        const dur = Math.round(dist(from.x, from.y, a.home.x, a.home.y) / (opts.speed || 5.5));
        a.show(t0 + delay).move(t0 + delay, dur, a.home.x, a.home.y, 'out').face(t0 + delay + dur, this.beetle);
        last = Math.max(last, t0 + delay + dur);
      } else if (mode === 'dig') {
        a.x = a.home.x;
        a.y = a.home.y;
        a.look = this.beetle;
        a.angle = Math.atan2(this.cy - a.y, this.cx - a.x);
        a.digUp(t0 + delay);
        last = Math.max(last, t0 + delay + 34);
      }
    });
    return last;
  }

  // Send the stars (and anything else given) home
  sendHome(t0, actors, speed = 4.5, ease = 'inOut') {
    let last = t0;
    for (const a of actors) {
      if (!a.home) continue;
      a.at(t0, () => { a.look = 'move'; });
      const dur = Math.max(10, Math.round(dist(a.x, a.y, a.home.x, a.home.y) / speed));
      a.move(t0, dur, a.home.x, a.home.y, ease).face(t0 + dur, this.beetle);
      last = Math.max(last, t0 + dur);
    }
    return last;
  }

  // Off-screen point past the edge closest to (x, y)
  edgeBehind(x, y, pad = 60) {
    const d = [x, this.W - x, y, this.H - y];
    const m = Math.min(...d);
    if (m === d[0]) return { x: -pad, y: y };
    if (m === d[1]) return { x: this.W + pad, y: y };
    if (m === d[2]) return { x: x, y: -pad };
    return { x: x, y: this.H + pad };
  }

  // Lay the crowd out somewhere else first (a cluster or a trail); they head home at t0
  layout(points, t0, speed = 4) {
    const crowd = this.crowd();
    crowd.forEach((a, k) => {
      const p = points(k, crowd.length);
      a.x = p.x;
      a.y = p.y;
    });
    return this.sendHome(t0, crowd, speed);
  }

  cluster(cx, cy, spread) {
    return (k, n) => {
      const ang = k * 2.4;
      const r = spread * Math.sqrt((k + 0.5) / Math.max(1, n));
      return { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r };
    };
  }

  // --- Effects ---
  addFx(fx) {
    fx.age = 0;
    this.fx.push(fx);
    return fx;
  }
  dirt(x, y, n = 10) {
    for (let k = 0; k < n; k++) {
      const a = random(Math.PI * 2);
      const sp = random(1, 3.5);
      this.addFx({ kind: 'particle', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5, g: 0.12, life: random(20, 34),
        size: random(4, 9), color: [120, 70, 30] });
    }
    this.addFx({ kind: 'mound', x: x, y: y, life: 40 });
  }
  dust(x, y, n = 8, dir = null) {
    for (let k = 0; k < n; k++) {
      const a = dir === null ? random(Math.PI * 2) : dir + random(-0.6, 0.6);
      const sp = random(0.8, 3);
      this.addFx({ kind: 'puff', x: x + random(-8, 8), y: y + random(-8, 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: random(26, 44), size: random(14, 26), color: [222, 180, 130] });
    }
  }
  poof(x, y, size = 18, green = false) {
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2;
      this.addFx({ kind: 'puff', x: x, y: y, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, life: 24, size: size * 0.8,
        color: green ? [110, 230, 60] : [235, 235, 235] });
    }
    this.addFx({ kind: 'ring', x: x, y: y, life: 16, r: size * 2.2, color: [255, 255, 255] });
  }
  ring(x, y, r, color = [255, 255, 255], life = 20) { this.addFx({ kind: 'ring', x: x, y: y, life: life, r: r, color: color }); }
  boom(x, y, r, opts = {}) {
    // Acid explosion (green) or the beetle's bombs (orange)
    const col = opts.orange ? [255, 170, 60] : [0, 220, 0];
    this.addFx({ kind: 'boom', x: x, y: y, r: r, life: opts.life || 34, color: col });
    for (let k = 0; k < 10; k++) {
      const a = random(Math.PI * 2);
      this.addFx({ kind: 'puff', x: x, y: y, vx: Math.cos(a) * random(1, 3.5), vy: Math.sin(a) * random(1, 3.5), life: random(30, 55),
        size: r * random(0.35, 0.6), color: [200, 200, 200] });
    }
  }
  // A bullet. opts: { size, speed, aim:{x,y} or angle (a number, or a function read when it fires), aura:[r,g,b], life, fadeIn, ghost, accel, curve, homing: actor,
  //   hit: actor (pops on it), onHit(), color, split: { at, count } }
  bullet(t, from, opts) {
    this.at(t, () => {
      const ox = from.x !== undefined ? from.x : from[0];
      const oy = from.y !== undefined ? from.y : from[1];
      let ang = typeof opts.angle === 'function' ? opts.angle() : opts.angle;
      if (ang === undefined) {
        const aim = typeof opts.aim === 'function' ? opts.aim() : (opts.aim || this.beetle);
        ang = Math.atan2(aim.y - oy, aim.x - ox);
      }
      const sp = opts.speed || 6;
      this.addFx(Object.assign({ kind: 'bullet', x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: opts.life || 160,
        size: opts.size || 1 }, opts, { angle: ang }));
      if (opts.sound !== false && typeof playSpitSound === 'function') playSpitSound();
    });
  }
  beam(t, from, opts) {
    // Warns for `warn` frames (unless ghost), then fires for `dur`
    this.at(t, () => {
      const ox = from.x;
      const oy = from.y;
      const aim = typeof opts.aim === 'function' ? opts.aim() : opts.aim;
      const ang = opts.angle !== undefined ? opts.angle : Math.atan2(aim.y - oy, aim.x - ox);
      this.addFx({ kind: 'beam', from: from, x: ox, y: oy, angle: ang, warn: opts.warn === undefined ? 30 : opts.warn, dur: opts.dur || 40,
        width: opts.width || 30, ghost: !!opts.ghost, life: (opts.warn === undefined ? 30 : opts.warn) + (opts.dur || 40),
        len: opts.len || 2000, color: opts.color });
    });
  }
  stream(t, from, opts) {
    this.at(t, () => {
      this.addFx({ kind: 'stream', from: from, angle: opts.angle, aim: opts.aim, sweep: opts.sweep || 0, len: opts.len || 230,
        width: opts.width || 26, life: opts.dur || 90, follow: opts.follow || null, ghostFrom: !!opts.ghostFrom });
    });
  }
  // Something placed on the ground for a while: { kind: 'territory'|'nest'|'mound'|'bunker'|'turret'|'mine'|'portal', x, y, r }
  place(t, thing, until = Infinity) {
    this.at(t, () => {
      thing.t0 = this.t;
      thing.until = until;
      this.ground.push(thing);
      if (thing.kind === 'mound' || thing.kind === 'bunker') this.dirt(thing.x, thing.y, 8);
    });
    return thing;
  }

  // --- Running it ---
  update() {
    for (const e of this.events) {
      if (!e.done && this.t >= e.t) {
        e.done = true;
        e.fn();
      }
    }
    for (const a of this.actors) a.update(this.t);
    for (let k = this.fx.length - 1; k >= 0; k--) {
      const f = this.fx[k];
      f.age++;
      if (!stepSceneFx(this, f)) this.fx.splice(k, 1);
    }
    this.ground = this.ground.filter(g => this.t < g.until);
  }

  draw() {
    push();
    if (this.t < this.shakeUntil) translate(random(-this.shakeAmp, this.shakeAmp), random(-this.shakeAmp, this.shakeAmp));
    for (const g of this.ground) drawSceneGround(this, g);
    if (this.overlay) this.overlay(this, 'under');
    for (const f of this.fx) if (SCENE_UNDER_FX.has(f.kind)) drawSceneFx(this, f);
    for (const a of this.actors) a.drawShadow();
    const sorted = this.actors.slice().sort((p, q) => (p.air > 0) - (q.air > 0));
    for (const a of sorted) a.draw();
    for (const f of this.fx) if (!SCENE_UNDER_FX.has(f.kind)) drawSceneFx(this, f);
    for (const a of this.actors) a.drawEmotes();
    if (this.overlay) this.overlay(this, 'over');
    pop();
  }
}

// Effects drawn on the ground, under the actors
const SCENE_UNDER_FX = new Set(['mound', 'boom', 'shadowPool']);

function stepSceneFx(S, f) {
  switch (f.kind) {
    case 'particle':
      f.x += f.vx;
      f.y += f.vy;
      f.vy += f.g;
      return f.age < f.life;
    case 'puff':
      f.x += f.vx;
      f.y += f.vy;
      f.vx *= 0.92;
      f.vy *= 0.92;
      return f.age < f.life;
    case 'bullet': {
      if (f.accel) {
        const sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
        if (f.age > (f.accelDelay || 0) && sp < (f.maxSpeed || 15)) {
          f.vx *= f.accel;
          f.vy *= f.accel;
        }
        if (f.age > (f.accelDelay || 0) && f.age % 8 === 0) S.addFx({ kind: 'ring', x: f.x, y: f.y, life: 14, r: 14 * f.size, color: [255, 255, 255] });
      }
      if (f.curve) {
        const ang = Math.atan2(f.vy, f.vx) + f.curve;
        const sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
        f.vx = Math.cos(ang) * sp;
        f.vy = Math.sin(ang) * sp;
      }
      if (f.homing) {
        const want = Math.atan2(f.homing.y - f.y, f.homing.x - f.x);
        const ang = sceneLerpAngle(Math.atan2(f.vy, f.vx), want, f.homingRate || 0.06);
        const sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
        f.vx = Math.cos(ang) * sp;
        f.vy = Math.sin(ang) * sp;
      }
      if (f.split && f.age === f.split.at) {
        for (let k = 0; k < f.split.count; k++) {
          const a = k / f.split.count * Math.PI * 2;
          S.addFx({ kind: 'bullet', x: f.x, y: f.y, vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5, life: f.split.life || 40, size: 0.5,
            fadeOut: 12, angle: a });
        }
        S.dust(f.x, f.y, 4);
        return false;
      }
      if (f.portal && f.age === f.portal.at) {
        // Vanish here and come back out somewhere else, aimed at the beetle
        S.addFx({ kind: 'portal', x: f.x, y: f.y, life: 26 });
        const to = f.portal.to();
        f.x = to.x;
        f.y = to.y;
        const ang = Math.atan2(S.beetle.y - f.y, S.beetle.x - f.x) + (f.portal.miss || 0);
        const sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
        f.vx = Math.cos(ang) * sp;
        f.vy = Math.sin(ang) * sp;
        S.addFx({ kind: 'portal', x: f.x, y: f.y, life: 26 });
        if (f.portal.next) f.portal = f.portal.next;
      }
      f.x += f.vx;
      f.y += f.vy;
      if (f.hit && f.hit.visible && dist(f.x, f.y, f.hit.x, f.hit.y - f.hit.air) < 22 + 6 * f.size) {
        f.hit.flashUntil = S.t + 14;
        S.addFx({ kind: 'ring', x: f.x, y: f.y, life: 12, r: 26, color: [120, 255, 120] });
        if (f.onHit) f.onHit(f);
        if (typeof sShieldHit1 !== 'undefined' && !sHit1.isPlaying()) sHit1.play();
        return false;
      }
      return f.age < f.life && f.x > -200 && f.x < S.W + 200 && f.y > -200 && f.y < S.H + 200;
    }
    case 'stream':
      return f.age < f.life;
    default:
      return f.age < (f.life || 30);
  }
}

function drawSceneFx(S, f) {
  const lifeT = f.life ? f.age / f.life : 0;
  push();
  noStroke();
  switch (f.kind) {
    case 'particle':
      fill(f.color[0], f.color[1], f.color[2], 255 * (1 - lifeT));
      ellipse(f.x, f.y, f.size);
      break;
    case 'puff':
      fill(f.color[0], f.color[1], f.color[2], 180 * (1 - lifeT));
      ellipse(f.x, f.y, f.size * (1 + lifeT * 0.8));
      break;
    case 'ring':
      noFill();
      stroke(f.color[0], f.color[1], f.color[2], 230 * (1 - lifeT));
      strokeWeight(3 * (1 - lifeT) + 1);
      ellipse(f.x, f.y, f.r * 2 * sceneEase('out', lifeT));
      break;
    case 'mound':
      fill(110, 62, 25, 200 * (1 - lifeT));
      ellipse(f.x, f.y + 6, 50 * (1 - lifeT * 0.4), 18 * (1 - lifeT * 0.4));
      break;
    case 'boom': {
      const grow = sceneEase('snap', Math.min(1, f.age / 8));
      const a = 230 * (1 - lifeT);
      fill(255, 255, 230, a * (f.age < 6 ? 1 : 0.2));
      ellipse(f.x, f.y, f.r * 1.2 * grow);
      fill(f.color[0], f.color[1], f.color[2], a * 0.55);
      ellipse(f.x, f.y, f.r * 2 * grow);
      fill(f.color[0] * 0.8, f.color[1] * 0.85, f.color[2] * 0.8, a);
      ellipse(f.x, f.y, f.r * 1.6 * grow);
      break;
    }
    case 'bullet': {
      let a = 255;
      if (f.fadeIn) a *= Math.min(1, f.age / f.fadeIn);
      if (f.fadeOut && f.life - f.age < f.fadeOut) a *= (f.life - f.age) / f.fadeOut;
      if (f.ghost) a *= constrain(map(dist(f.x, f.y, S.beetle.x, S.beetle.y), 60, 170, 1, 0), 0, 1);
      if (f.aura) {
        fill(f.aura[0], f.aura[1], f.aura[2], (83 + 70 * Math.sin(frameCount * 0.3)) * a / 255);
        ellipse(f.x, f.y - (f.h || 0), 25 * f.size);
      }
      if (f.h) {
        fill(0, 0, 0, 60 * a / 255);
        ellipse(f.x, f.y, 12 * f.size);
      }
      push();
      angleMode(DEGREES);
      imageMode(CENTER);
      translate(f.x, f.y - (f.h || 0));
      rotate(Math.atan2(f.vy, f.vx) * 180 / Math.PI);
      tint(255, a);
      image(bulletImage, 0, 0, 20 * f.size, 20 * f.size);
      pop();
      break;
    }
    case 'beam': {
      const from = f.from;
      const ox = from.x !== undefined ? from.x : f.x;
      const oy = from.y !== undefined ? from.y - (from.air || 0) : f.y;
      const ex = ox + Math.cos(f.angle) * f.len;
      const ey = oy + Math.sin(f.angle) * f.len;
      if (f.age < f.warn) {
        if (!f.ghost) {
          const t = f.age / f.warn;
          stroke(255, 60, 60, 60 + 160 * t);
          strokeWeight(1 + 2 * t);
          line(ox, oy, ex, ey);
        }
      } else {
        const life = f.age - f.warn;
        const fadeT = constrain((f.dur - life) / (f.dur / 3), 0, 1);
        const w = f.width * Math.min(1, life / 4) * (0.4 + 0.6 * fadeT);
        const glow = f.color ? f.color.glow : [60, 220, 255];
        const core = f.color ? f.color.core : [225, 250, 255];
        strokeCap(ROUND);
        stroke(glow[0], glow[1], glow[2], 255 * fadeT * 0.35);
        strokeWeight(w * 1.6);
        line(ox, oy, ex, ey);
        stroke(glow[0], glow[1], glow[2], 255 * fadeT * 0.8);
        strokeWeight(w);
        line(ox, oy, ex, ey);
        stroke(core[0], core[1], core[2], 255 * fadeT);
        strokeWeight(w * 0.35);
        line(ox, oy, ex, ey);
      }
      break;
    }
    case 'stream': {
      const from = f.from;
      let ang = f.angle;
      if (f.aim) {
        const aim = typeof f.aim === 'function' ? f.aim() : f.aim;
        ang = Math.atan2(aim.y - from.y, aim.x - from.x);
      }
      ang += Math.sin(f.age * 0.08) * f.sweep;
      const grow = Math.min(1, f.age / 15) * Math.min(1, (f.life - f.age) / 10);
      const ox = from.x;
      const oy = from.y - (from.air || 0);
      dexStream(ox, oy, ox + Math.cos(ang) * f.len * grow, oy + Math.sin(ang) * f.len * grow, 0, 1, { width: f.width });
      f.tipX = ox + Math.cos(ang) * f.len * grow;
      f.tipY = oy + Math.sin(ang) * f.len * grow;
      break;
    }
    case 'portal': {
      noFill();
      stroke(255, 120, 255, 255 * (1 - lifeT));
      strokeWeight(3);
      ellipse(f.x, f.y, 36 * (1 - lifeT * 0.5), 50 * (1 - lifeT * 0.5));
      stroke(110, 235, 255, 200 * (1 - lifeT));
      ellipse(f.x, f.y, 22, 34);
      break;
    }
    case 'skyMark': {
      // Where something will land from above: a shadow that grows and darkens
      const t = constrain(f.age / f.life, 0, 1);
      fill(0, 0, 0, 40 + 90 * t);
      ellipse(f.x, f.y, f.r * 2 * t, f.r * 0.9 * t);
      noFill();
      stroke(255, 60, 40, 120 + 100 * t);
      strokeWeight(2);
      ellipse(f.x, f.y, f.r * 2, f.r * 0.9);
      break;
    }
    case 'shadowPool': {
      // A pool of darkness something huge is about to come out of
      const a = Math.min(1, f.age / 40, (f.life - f.age) / 40);
      for (let k = 0; k < 5; k++) {
        fill(8, 2, 12, 70 * a);
        ellipse(f.x, f.y, f.r * (2.6 - k * 0.35), f.r * (1.6 - k * 0.22));
      }
      break;
    }
    case 'title': {
      // A name card across the middle of the scene
      const a = 255 * Math.min(1, f.age / 15, (f.life - f.age) / 20);
      const grow = sceneEase('snap', Math.min(1, f.age / 12));
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      textSize(S.H * 0.09 * (1.3 - 0.3 * grow));
      stroke(0, a);
      strokeWeight(6);
      strokeJoin(ROUND);
      fill(225, 160, 255, a);
      text(f.text, S.W / 2, S.H * 0.7);
      textStyle(NORMAL);
      break;
    }
    case 'line': {
      stroke(f.color[0], f.color[1], f.color[2], 220 * (1 - lifeT));
      strokeWeight(f.w || 2);
      line(f.x1, f.y1, f.x2, f.y2);
      break;
    }
  }
  pop();
}

function drawSceneGround(S, g) {
  const age = S.t - g.t0;
  const grow = sceneEase('back', Math.min(1, age / 14));
  const left = g.until === Infinity ? 999 : g.until - S.t;
  const fade = Math.min(1, left / 12);
  push();
  switch (g.kind) {
    case 'territory':
    case 'nest':
      angleMode(DEGREES);
      dexTerritory(g.x, g.y, g.r * grow, g.kind === 'nest', 255 * fade);
      break;
    case 'mound':
      noStroke();
      fill(0, 0, 0, 60 * fade);
      ellipse(g.x + 3, g.y + 5, g.r * 2 * grow, g.r * 1.3 * grow);
      fill(140, 82, 38, 255 * fade);
      ellipse(g.x, g.y, g.r * 2 * grow, g.r * 1.7 * grow);
      fill(170, 105, 55, 255 * fade);
      ellipse(g.x - g.r * 0.2, g.y - g.r * 0.25, g.r * 1.1 * grow, g.r * 0.8 * grow);
      break;
    case 'bunker':
      noStroke();
      fill(120, 72, 32, 255 * fade);
      ellipse(g.x, g.y, g.r * 2.3 * grow);
      fill(25, 15, 8, 255 * fade);
      ellipse(g.x, g.y, g.r * 1.6 * grow);
      break;
    case 'turret': {
      const s = 30 * grow;
      fill(0, 200, 0, 180 * fade);
      stroke(0, 255, 0, 255 * fade);
      strokeWeight(2);
      ellipse(g.x, g.y, s);
      noStroke();
      fill(255, 40, 40, 255 * fade);
      ellipse(g.x, g.y, s * (0.35 + 0.1 * Math.sin(frameCount * 0.4)));
      break;
    }
    case 'mine': {
      let a = 255 * fade;
      if (g.hidden) a *= constrain(map(dist(g.x, g.y, S.beetle.x, S.beetle.y), 50, 110, 1, 0), 0, 1);
      const s = 28;
      fill(0, 200, 0, a * 0.7);
      stroke(0, 255, 0, a);
      strokeWeight(2);
      ellipse(g.x, g.y, s);
      noStroke();
      fill(255, 255, 0, a);
      ellipse(g.x, g.y, s * 0.3);
      break;
    }
  }
  pop();
}

// ---------- Choosing a scene ----------

// Ability keys each round ant brings (the queen's ability list, plus the exotic combos the scenes look for)
function getSceneAbilityKeys(i) {
  const keys = getAntQueenAbilities(i).map(a => QUEEN_ABILITIES[a].key);
  const stream = isStreamFire(i);
  const special = getSpecialType(i);
  if (special === -2 && stream) keys.push('ghostAnts');
  if (special === 1 && specialExplosion[i] >= 1 && stream) keys.push('explodingAnts');
  if (special === -3 && stream) keys.push('hoverAnts');
  if (special === 1 && specialExplosion[i] < 1 && getPathType(i) === 1 && !stream) keys.push('airStrike');
  if (special === -2 && getDeathType(i) === 1 && !stream && !isBeamAccelerate(i)) keys.push('hiddenLandmine');
  if (special === -2 && isBeamAccelerate(i)) keys.push('ghostBeam');
  // Portal stream ants teleport themselves rather than their shots, so they get their own scene instead of portal's
  if (stream && keys.includes('portal')) keys[keys.indexOf('portal')] = 'portalStream';
  return keys;
}

function sceneHas(key) {
  return i => getSceneAbilityKeys(i).includes(key);
}

function countAntsWith(key) {
  let n = 0;
  for (let i = 1; i <= enemyCount; i++) {
    if (!antDormant[i] && getSceneAbilityKeys(i).includes(key)) n++;
  }
  return n;
}

// The beetle's own abilities that have scenes
const BEETLE_SCENE_ABILITIES = {
  flight: () => upgrade48Level > 0,
  quickDash: () => upgrade3Level >= 4,
  bombs: () => upgrade33Level > 0,
  tiger: () => upgrade10Level > 0
};

function noteSceneAbilities() {
  const present = new Set();
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i]) continue;
    for (const k of getSceneAbilityKeys(i)) present.add(k);
  }
  for (const k in BEETLE_SCENE_ABILITIES) if (BEETLE_SCENE_ABILITIES[k]()) present.add('beetle:' + k);
  for (const k of present) if (sceneAbilitySeen[k] === undefined) sceneAbilitySeen[k] = level;
  return present;
}

function resetRoundScenes() {
  roundScene = null;
  roundScenePending = false;
  roundsUntilAbilityScene = 3 + Math.floor(Math.random() * 3);
  abilitySceneAfterQueen = false;
  sceneAbilitySeen = {};
}

// Ability combinations with their own scenes
const EXOTIC_SCENE_KEYS = new Set(['ghostAnts', 'explodingAnts', 'hoverAnts', 'airStrike', 'hiddenLandmine', 'portalStream']);

function pickRoundScene() {
  const present = noteSceneAbilities();
  if (sceneForcedId) {
    const forced = ROUND_SCENES.find(s => s.id === sceneForcedId);
    sceneForcedId = null;
    if (forced) return forced;
  }
  // The final level's rounds before the Queen of Queens: every one opens with a scene about its ants' abilities,
  // exotic combinations first
  if (typeof isFinalLevel === 'function' && isFinalLevel() && finalLevel.phase === 'warmup') {
    const antScenes = ROUND_SCENES.filter(s => s.need && !s.key.startsWith('beetle:') && s.need(present));
    if (antScenes.length > 0) {
      const weights = antScenes.map(s => EXOTIC_SCENE_KEYS.has(s.key) || (s.key === 'ghost' && present.has('ghostBeam')) ? 8 : 1);
      let roll = Math.random() * weights.reduce((p, q) => p + q, 0);
      for (let k = 0; k < antScenes.length; k++) {
        roll -= weights[k];
        if (roll <= 0) return antScenes[k];
      }
      return antScenes[antScenes.length - 1];
    }
  }
  let abilityRound = false;
  if (level > 1) {
    roundsUntilAbilityScene--;
    if (roundsUntilAbilityScene <= 0 || abilitySceneAfterQueen) abilityRound = true;
  }
  if (abilityRound) {
    const options = ROUND_SCENES.filter(s => s.need && s.need(present));
    if (options.length > 0) {
      roundsUntilAbilityScene = 3 + Math.floor(Math.random() * 3);
      abilitySceneAfterQueen = false;
      // Slight priority for the newest ability on the field
      let newest = -1;
      for (const s of options) newest = Math.max(newest, sceneAbilitySeen[s.key] || 0);
      const weights = options.map(s => (sceneAbilitySeen[s.key] || 0) === newest ? 2.5 : 1);
      let roll = Math.random() * weights.reduce((p, q) => p + q, 0);
      for (let k = 0; k < options.length; k++) {
        roll -= weights[k];
        if (roll <= 0) return options[k];
      }
      return options[options.length - 1];
    }
  }
  if (level <= 1) return ROUND_SCENES.find(s => s.id === 'default');
  const r = Math.random();
  if (r < 0.08) return ROUND_SCENES.find(s => s.id === 'surrounded');
  if (r < 0.3) return ROUND_SCENES.find(s => s.id === 'chase');
  return ROUND_SCENES.find(s => s.id === 'default');
}

function shouldPlayRoundScenes() {
  return !multiplayerMode && !(typeof tutorialBlocksScenes === 'function' && tutorialBlocksScenes());
}

// Called on the first frame of a round that wants a scene (its ants exist by now)
function buildRoundScene() {
  roundScenePending = false;
  const def = pickRoundScene();
  const S = new RoundScene(def.id);
  try {
    def.build(S);
  } catch (err) {
    console.error('Round scene failed to build', def.id, err);
    return null;
  }
  // Whatever happened, everybody ends up home
  S.duration = Math.min(S.duration + 30, SCENE_MAX_FRAMES);
  return S;
}

function drawRoundSceneFrame() {
  if (roundScenePending) {
    roundScene = buildRoundScene();
    if (!roundScene) {
      finishRoundScene();
      return;
    }
  }
  const S = roundScene;
  drawBackground();
  beginGameplayScaling();
  S.update();
  S.draw();
  endGameplayScaling();

  if (S.t < S.flashUntil) {
    push();
    noStroke();
    fill(255, 255 * (S.flashUntil - S.t) / (S.flashDur || 10));
    rect(0, 0, windowWidth, windowHeight);
    pop();
  }
  // Letterbox bars and the skip hint
  const bar = windowHeight * 0.06 * Math.min(1, S.t / 15, (S.duration - S.t) / 15);
  push();
  noStroke();
  fill(0);
  rect(0, 0, windowWidth, bar);
  rect(0, windowHeight - bar, windowWidth, bar);
  if (S.t > SCENE_SKIP_GRACE) {
    fill(255, 150);
    textAlign(RIGHT, CENTER);
    textSize(14);
    text('Enter / Click: skip', windowWidth - 18, windowHeight - bar / 2);
  }
  pop();

  S.t++;
  const skip = S.t > SCENE_SKIP_GRACE && (isConfirmPressed() || isBackPressed() || (mouseIsPressed && menuNavigationCooldown === 0));
  if (skip || S.t >= S.duration) finishRoundScene();
}

function finishRoundScene() {
  roundScene = null;
  roundScenePending = false;
  roundIntroTimer = ROUND_INTRO_FRAMES;
  roundIntroSnapshot = null;
  menuNavigationCooldown = 15;
}

// ---------- Round end: the ants retreat ----------
// No freeze: the game keeps running while the round-over message shows, and every ant runs off to the right,
// deeper into ant territory. The beetle holds its ground. Then the upgrade and round-over screens slide in.
const RETREAT_FRAMES = 150;
let retreatSpeeds = [];

function startRoundRetreat() {
  // Bullets in the air fizzle out
  for (let i = 1; i <= enemyCount; i++) {
    for (const b of enemyBullets[i] || []) spawnSmokeImpact(b.x, b.y, 10, 2);
    enemyBullets[i] = [];
  }
  enemyBeams = [];
  enemyStreams = [];
  antStream = [];
  queenProjectiles = [];
  retreatSpeeds = [];
  for (let i = 1; i <= enemyCount; i++) retreatSpeeds[i] = random(2.2, 3.4);
}

function drawRoundRetreatFrame(age) {
  drawBackground();
  beginGameplayScaling();
  const ramp = Math.min(1, age / 30);
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i] || !retreatSpeeds[i]) continue;
    antX[i] += retreatSpeeds[i] * ramp;
    antY[i] += Math.sin(age * 0.15 + i) * 0.6;
    antAirHeight[i] = 0;
    antInBunker[i] = null;
  }
  drawEnemySmokeImpacts();
  // Ants face the way they're running: drawEnemy turns them toward the beetle, so point that far off to the right
  const beetleX = playerX;
  const beetleY = playerY;
  playerX = getGameplayWidth() * 10;
  drawEnemy();
  playerX = beetleX;
  playerY = beetleY;
  drawBeetleShadow();
  push();
  angleMode(DEGREES);
  imageMode(CENTER);
  translate(playerX, playerY);
  rotate(playerRotationValue);
  image(beetle, 0, 0, 130, 130);
  pop();
  endGameplayScaling();
}

// ---------- The scenes ----------
// build(S): S.beetle starts off screen left; every round ant is in S.roster at its home. need(present) says
// whether the scene can play (present = the set of ability keys on the field, with 'beetle:' ones for the beetle).

function sceneBeetleWalkIn(S, t0, dur, from) {
  const b = S.beetle;
  b.x = from.x;
  b.y = from.y;
  b.look = 'move';
  b.move(t0, dur, S.cx, S.cy, 'out');
  return t0 + dur;
}

// Two ants run from the beetle and turn on it. Returns { a, b, t } where t is when they turn around.
function sceneTwoAntChase(S, key, spots) {
  const pair = S.feature(sceneHas(key), 2);
  const b = S.beetle;
  b.x = -140;
  b.y = S.cy;
  pair.forEach((a, k) => {
    a.x = -40;
    a.y = S.cy + (k ? 40 : -40);
    a.look = 'move';
    a.move(0, 110, spots[k].x, spots[k].y, 'out').face(110, b);
  });
  b.move(0, 120, S.cx - 30, S.cy, 'out');
  return { a: pair[0], b: pair[1], t: 112 };
}

const ROUND_SCENES = [
  // --- Every-round scenes ---
  {
    id: 'default',
    build: S => {
      const b = S.beetle;
      const zoom = movementSpeed >= 5 || dashSpeedStat >= 4;
      const dig = Math.random() < 0.5;
      const side = -1; // The beetle always pushes in from the left, the way into ant territory
      const from = { x: side < 0 ? -140 : S.W + 140, y: S.cy };
      let arrive;
      if (dig) S.crowd().forEach(a => { a.visible = false; });
      else S.gather(0, 'present');
      if (zoom) {
        // Damn near flying in along the ground, then skidding to a halt in a cloud of dust
        b.x = from.x;
        b.y = from.y;
        b.look = side < 0 ? 0 : Math.PI;
        b.move(20, 20, S.cx, S.cy, 'snap', { trail: true });
        for (let k = 0; k < 4; k++) S.at(22 + k * 4, () => S.dust(b.x, b.y + 20, 3, side < 0 ? Math.PI : 0));
        S.at(38, () => S.dust(S.cx, S.cy + 20, 14, side < 0 ? Math.PI : 0));
        b.shake(38, 10, 2);
        S.shake(38, 8, 3);
        arrive = 60;
      } else {
        arrive = sceneBeetleWalkIn(S, 0, 150, from);
        b.face(arrive, side < 0 ? 0 : Math.PI);
      }
      if (dig) {
        const done = S.gather(arrive + 10, 'dig', { stagger: 45 });
        b.emote(arrive + 16, '!', 50);
        b.face(arrive + 20, S.roster.length ? S.roster[0] : 0);
        S.extend(done + 25);
      } else {
        S.roster.slice(0, 6).forEach((a, k) => a.emote(arrive - 10 + k * 3, '!', 45));
        S.extend(arrive + 50);
      }
    }
  },
  {
    id: 'chase',
    build: S => {
      // Chasing one ant, the beetle runs into a whole crowd of them
      const b = S.beetle;
      S.gather(0, 'present');
      const prey = S.extra(-50, S.cy + 30, { size: 0.9 });
      prey.path(0, 55, [[S.W * 0.3, S.cy - 30], [S.W * 0.62, S.cy + 40], [S.W + 80, S.cy - 20]], 'linear');
      b.x = -170;
      b.y = S.cy + 30;
      b.look = prey;
      b.path(0, 55, [[S.W * 0.18, S.cy - 10], [S.W * 0.42, S.cy + 20]], 'linear');
      b.move(110, 22, S.cx, S.cy, 'out');
      S.at(130, () => S.dust(S.cx, S.cy + 20, 8));
      b.face(132, 0);
      b.emote(134, '!', 50);
      b.at(150, () => { b.look = S.roster.length ? S.roster[Math.floor(S.roster.length / 2)] : 0; });
      S.roster.slice(0, 8).forEach((a, k) => a.emote(138 + k * 2, '!', 40));
      S.extend(200);
    }
  },
  {
    id: 'surrounded',
    build: S => {
      // Just walking, and suddenly surrounded
      const b = S.beetle;
      b.x = -120;
      b.y = S.cy;
      b.look = 'move';
      b.move(0, 140, S.cx, S.cy, 'out');
      const done = S.gather(120, 'run', { stagger: 30, speed: 7 });
      b.emote(130, '!?', 60);
      b.face(150, 0).face(175, Math.PI).face(200, -Math.PI / 2);
      b.emote(195, 'sweat', 60);
      S.extend(Math.max(done, 210) + 25);
    }
  },

  // --- The beetle's abilities ---
  {
    id: 'flight', key: 'beetle:flight', need: p => p.has('beetle:flight'),
    build: S => {
      // The ants march in a trail; the beetle drops out of the sky into the middle of it
      const b = S.beetle;
      const crowd = S.crowd();
      crowd.forEach((a, k) => {
        const f = (k + 0.5) / Math.max(1, crowd.length);
        a.x = lerp(-40, S.W + 40, f);
        a.y = S.cy + Math.sin(f * Math.PI * 3) * S.H * 0.18;
        a.look = 'move';
        const nf = f + 0.06;
        a.move(0, 90, lerp(-40, S.W + 40, nf), S.cy + Math.sin(nf * Math.PI * 3) * S.H * 0.18, 'linear');
      });
      b.x = S.cx;
      b.y = S.cy;
      b.visible = false;
      S.addFx({ kind: 'skyMark', x: S.cx, y: S.cy, r: 50, life: 70 });
      b.show(52);
      for (let k = 0; k <= 22; k++) {
        b.at(52 + k, () => {
          const f = k / 22;
          b.scale = lerp(1.7, 1, f);
          b.airOverride = k < 22 ? lerp(320, 0, f * f) : 0;
        });
      }
      S.at(74, () => { S.dust(S.cx, S.cy + 10, 18); S.ring(S.cx, S.cy, 120, [255, 255, 255], 24); });
      S.shake(74, 14, 7);
      crowd.forEach((a, k) => { a.face(78, b); a.emote(80 + (k % 6) * 2, '!', 40); });
      S.sendHome(120, crowd, 3.5);
      S.extend(230);
    }
  },
  {
    id: 'quickDash', key: 'beetle:quickDash', need: p => p.has('beetle:quickDash'),
    build: S => {
      // Ant to ant to ant, lightning fast, eating each one, until it lands in a crowd
      const b = S.beetle;
      S.gather(0, 'present');
      const spots = [[S.W * 0.12, S.cy - 80], [S.W * 0.24, S.cy + 70], [S.W * 0.33, S.cy - 60], [S.W * 0.4, S.cy + 50]];
      b.x = -100;
      b.y = S.cy;
      let t = 20;
      for (const [x, y] of spots) {
        const v = S.extra(x, y, { size: 0.8 });
        v.emote(t - 6, '!', 20);
        b.move(t, 8, x, y, 'snap', { trail: true });
        v.die(t + 8);
        t += 22;
      }
      b.move(t, 10, S.cx, S.cy, 'snap', { trail: true });
      S.at(t + 10, () => S.dust(S.cx, S.cy + 15, 10));
      b.emote(t + 18, '!', 45);
      b.at(t + 30, () => { b.look = S.roster.length ? S.roster[0] : 0; });
      S.roster.slice(0, 8).forEach((a, k) => a.emote(t + 14 + k * 2, '!', 40));
      S.extend(t + 90);
    }
  },
  {
    id: 'bombs', key: 'beetle:bombs', need: p => p.has('beetle:bombs'),
    build: S => {
      // The ants huddle; something blows up at the edge of the screen, and the beetle walks out of the smoke
      const b = S.beetle;
      S.layout(S.cluster(S.cx + 60, S.cy, 110), 150, 3.2);
      S.at(40, () => S.boom(20, S.cy, 110, { orange: true }));
      S.shake(40, 18, 8);
      S.flash(40, 8);
      S.crowd().forEach((a, k) => { a.face(44, { x: 0, y: S.cy }); a.emote(46 + (k % 5) * 3, '!', 45); });
      b.x = -60;
      b.y = S.cy;
      b.look = 'move';
      b.move(60, 100, S.cx, S.cy, 'out');
      b.face(160, 0);
      S.extend(240);
    }
  },
  {
    id: 'tiger', key: 'beetle:tiger', need: p => p.has('beetle:tiger'),
    build: S => {
      // Running through the forest with everything blurring past, then stopping dead in the middle of the ants
      const b = S.beetle;
      b.x = S.cx;
      b.y = S.cy;
      b.look = 0;
      S.crowd().forEach(a => { a.visible = false; a.show(180); a.x = a.home.x; a.y = a.home.y; a.look = b; });
      const trees = [];
      for (let k = 0; k < 14; k++) trees.push({ x: random(S.W), y: random(S.H), w: random(20, 60), c: random(60, 110) });
      S.overlay = (S2, layer) => {
        const fade = S2.t < 180 ? 1 : Math.max(0, 1 - (S2.t - 180) / 14);
        if (fade <= 0) return;
        if (layer === 'under') {
          push();
          noStroke();
          fill(30, 45, 20, 200 * fade);
          rect(0, 0, S2.W, S2.H);
          for (const tr of trees) {
            tr.x -= 38;
            if (tr.x < -200) { tr.x = S2.W + random(50, 300); tr.y = random(S2.H); }
            fill(tr.c, tr.c * 0.6, tr.c * 0.3, 160 * fade);
            rect(tr.x, 0, tr.w * 4, S2.H);
          }
          pop();
        } else {
          push();
          strokeWeight(2);
          for (let k = 0; k < 26; k++) {
            const y = (k * 37 + S2.t * 13) % S2.H;
            const x = (k * 151 - S2.t * 45) % (S2.W + 300);
            stroke(255, 255, 255, 120 * fade);
            line(x + 300, y, x + 300 + 140, y);
          }
          pop();
        }
      };
      for (let k = 0; k < 18; k++) b.at(k * 10, () => { b.y = S.cy + Math.sin(k) * 2; });
      S.at(180, () => S.dust(S.cx - 20, S.cy + 20, 12, Math.PI));
      S.flash(180, 6);
      b.emote(190, '!', 50);
      S.crowd().forEach((a, k) => a.emote(188 + (k % 6) * 2, '!', 40));
      b.at(210, () => { b.look = S.roster.length ? S.roster[0] : 0; });
      S.extend(265);
    }
  },

  // --- Ant abilities ---
  {
    id: 'beam2', key: 'beam', need: () => countAntsWith('beam') >= 2,
    build: S => {
      // Both ants beam the beetle, and it barely backs up enough to fit between them
      const c = sceneTwoAntChase(S, 'beam', [{ x: S.cx + 180, y: S.cy - 120 }, { x: S.cx + 180, y: S.cy + 120 }]);
      const b = S.beetle;
      const cross = { x: S.cx + 70, y: S.cy };
      b.move(c.t - 6, 16, S.cx + 45, S.cy, 'linear'); // Still chasing, right up near where the beams cross
      S.beam(c.t + 5, c.a, { aim: cross, warn: 34, dur: 46, width: 26 });
      S.beam(c.t + 5, c.b, { aim: cross, warn: 34, dur: 46, width: 26 });
      b.emote(c.t + 12, '!', 40);
      b.at(c.t + 20, () => { b.look = 0; });
      b.move(c.t + 22, 16, S.cx, S.cy, 'snap');
      b.emote(c.t + 45, 'sweat', 60);
      S.shake(c.t + 39, 10, 4);
      const t = c.t + 95;
      S.sendHome(t, [c.a, c.b]);
      const done = S.gather(t, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'beamWalk', key: 'beam', need: p => p.has('beam'),
    build: S => {
      // A beam out of the forest barely misses, and then they're everywhere
      const b = S.beetle;
      const shooter = S.feature(sceneHas('beam'), 1)[0];
      sceneBeetleWalkIn(S, 0, 150, { x: -120, y: S.cy });
      shooter.x = S.W + 60;
      shooter.y = S.cy - 160;
      shooter.visible = false;
      S.beam(95, { x: S.W + 60, y: S.cy - 150 }, { aim: { x: -100, y: S.cy + 140 }, warn: 0, dur: 40, width: 30 });
      b.at(96, () => { b.look = 0; });
      b.move(96, 10, S.cx - 40, S.cy - 50, 'snap');
      S.shake(96, 10, 5);
      b.emote(100, '!!', 50);
      b.emote(130, 'sweat', 50);
      b.move(140, 25, S.cx, S.cy);
      shooter.show(150);
      S.sendHome(150, [shooter], 4);
      const done = S.gather(160, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'recoil2', key: 'recoil', need: () => countAntsWith('recoil') >= 2,
    build: S => {
      // They shoot at each other and get shoved out of the way of the beetle's charge
      const c = sceneTwoAntChase(S, 'recoil', [{ x: S.cx + 150, y: S.cy - 22 }, { x: S.cx + 150, y: S.cy + 22 }]);
      const b = S.beetle;
      c.a.face(c.t, c.b);
      c.b.face(c.t, c.a);
      b.move(c.t + 4, 22, S.cx + 330, S.cy, 'in', { trail: true });
      S.bullet(c.t + 10, c.a, { aim: () => c.b, speed: 7, life: 40 });
      S.bullet(c.t + 10, c.b, { aim: () => c.a, speed: 7, life: 40 });
      c.a.move(c.t + 11, 16, S.cx + 150, S.cy - 120, 'snap');
      c.b.move(c.t + 11, 16, S.cx + 150, S.cy + 120, 'snap');
      S.at(c.t + 26, () => S.dust(b.x, b.y + 20, 10, 0));
      b.emote(c.t + 34, '?', 60);
      b.face(c.t + 40, Math.PI);
      b.move(c.t + 70, 50, S.cx, S.cy);
      b.at(c.t + 122, () => { b.look = 0; });
      const t = c.t + 100;
      S.sendHome(t, [c.a, c.b]);
      const done = S.gather(t, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'ghostAnts2', key: 'ghostAnts', need: () => countAntsWith('ghostAnts') >= 2,
    build: S => {
      // Two ants vanish; the beetle looks around, then barely jumps back from two streams of acid
      const c = sceneTwoAntChase(S, 'ghostAnts', [{ x: S.cx + 170, y: S.cy - 90 }, { x: S.cx + 170, y: S.cy + 90 }]);
      const b = S.beetle;
      c.a.fade(c.t + 4, 20, 0);
      c.b.fade(c.t + 4, 20, 0);
      b.emote(c.t + 30, '?', 80);
      b.face(c.t + 40, -Math.PI / 2).face(c.t + 70, Math.PI / 2).face(c.t + 100, 0);
      b.move(c.t + 72, 34, S.cx + 40, S.cy, 'inOut'); // Creeping forward, looking for them
      S.stream(c.t + 112, c.a, { aim: { x: S.cx + 40, y: S.cy }, len: 170, dur: 60 });
      S.stream(c.t + 112, c.b, { aim: { x: S.cx + 40, y: S.cy }, len: 170, dur: 60 });
      b.move(c.t + 114, 16, S.cx, S.cy, 'out', { arc: 24 });
      b.emote(c.t + 116, '!', 40);
      b.emote(c.t + 140, 'sweat', 50);
      c.a.fade(c.t + 175, 15, 1);
      c.b.fade(c.t + 175, 15, 1);
      const t = c.t + 180;
      S.sendHome(t, [c.a, c.b]);
      const done = S.gather(t - 20, 'run');
      S.extend(Math.max(done, t + 40) + 20);
    }
  },
  {
    id: 'explodingAnts', key: 'explodingAnts', need: p => p.has('explodingAnts'),
    build: S => {
      // A stand-off; the ant blows itself up when the beetle gets too close
      const b = S.beetle;
      const kamikaze = S.extra(S.cx + 190, S.cy, { size: 1 });
      kamikaze.look = b;
      b.x = -120;
      b.y = S.cy;
      b.look = kamikaze;
      b.move(0, 70, S.cx - 70, S.cy, 'out');
      b.move(80, 90, S.cx + 70, S.cy, 'linear');
      kamikaze.emote(70, '!', 40);
      kamikaze.at(110, () => { kamikaze.fuse = { t0: 110, dur: 60, r: 90 }; });
      kamikaze.shake(140, 30, 3);
      b.emote(150, '!?', 30);
      S.at(170, () => { kamikaze.visible = false; S.boom(kamikaze.x, kamikaze.y, 120); });
      S.shake(170, 18, 9);
      b.move(171, 22, S.cx - 30, S.cy, 'snap', { arc: 18 });
      b.flash(171, 20);
      b.emote(196, 'sweat', 60);
      b.move(220, 30, S.cx, S.cy);
      const done = S.gather(215, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'hoverAnts', key: 'hoverAnts', need: p => p.has('hoverAnts'),
    build: S => {
      // They fly in on their streams of acid
      const b = S.beetle;
      const flyers = S.feature(sceneHas('hoverAnts'), 6);
      const arrive = sceneBeetleWalkIn(S, 0, 120, { x: -120, y: S.cy });
      flyers.forEach((a, k) => {
        const from = S.edgeBehind(a.home.x, a.home.y, 80);
        a.x = from.x;
        a.y = from.y;
        a.look = 'move';
        const t0 = arrive - 10 + k * 8;
        a.move(t0, 70, a.home.x, a.home.y, 'out');
        for (let f = 0; f <= 70; f++) a.at(t0 + f, () => { a.airOverride = f < 70 ? 40 * Math.min(1, (70 - f) / 15) : 0; });
        S.stream(t0, a, { angle: Math.atan2(from.y - a.home.y, from.x - a.home.x) + 0.5, len: 60, width: 18, dur: 70 });
        a.face(t0 + 70, b);
      });
      b.emote(arrive, '!', 50);
      b.at(arrive + 5, () => { b.look = flyers[0]; });
      const done = S.gather(arrive + 40, 'run');
      S.extend(Math.max(done, arrive + 100) + 20);
    }
  },
  {
    id: 'portalStream', key: 'portalStream', need: p => p.has('portalStream'),
    build: S => {
      // It waits calmly as the beetle walks up... then steps through a portal behind it, charges up and lets
      // loose, and the beetle only just gets out of the way
      const b = S.beetle;
      const ant = S.feature(sceneHas('portalStream'), 1)[0];
      const stop = { x: S.cx + 10, y: S.cy };
      const spot = { x: stop.x - 170, y: S.cy + 25 }; // Where it comes out, behind the beetle
      ant.x = S.cx + 150;
      ant.y = S.cy;
      ant.look = b;
      b.x = -100;
      b.y = S.cy;
      b.look = ant;
      b.move(0, 110, stop.x, stop.y, 'out');
      ant.emote(50, '...', 50);
      const jump = 115;
      ant.at(jump, () => {
        S.addFx({ kind: 'portal', x: ant.x, y: ant.y, life: 26 });
        ant.x = spot.x;
        ant.y = spot.y;
        ant.angle = Math.atan2(stop.y - spot.y, stop.x - spot.x);
        S.addFx({ kind: 'portal', x: ant.x, y: ant.y, life: 26 });
      });
      b.emote(jump + 4, '?', 40);
      // Charging up: acid gathers into a swelling glob at its mouth
      const charge = jump + 8;
      const fire = jump + 55;
      const mouth = () => ({ x: ant.x + Math.cos(ant.angle) * 22, y: ant.y + Math.sin(ant.angle) * 22 });
      for (let t = charge; t < fire; t += 2) {
        S.at(t, () => {
          const m = mouth();
          const a = random(Math.PI * 2);
          const d = random(30, 50);
          S.addFx({ kind: 'particle', x: m.x + Math.cos(a) * d, y: m.y + Math.sin(a) * d, vx: -Math.cos(a) * d / 12,
            vy: -Math.sin(a) * d / 12, g: 0, life: 12, size: random(5, 9), color: [150, 255, 60] });
        });
      }
      S.overlay = (S, layer) => {
        if (layer !== 'over' || S.t < charge || S.t > fire + 4) return;
        const m = mouth();
        const r = 26 * Math.min(1, (S.t - charge) / (fire - charge)) * (1 + 0.15 * Math.sin(S.t * 0.8));
        push();
        noStroke();
        fill(110, 220, 40, 90);
        ellipse(m.x, m.y, r * 1.8);
        fill(215, 255, 150, 230);
        ellipse(m.x, m.y, r);
        pop();
      };
      ant.shake(charge + 12, fire - charge - 12, 2);
      // Lets loose at where the beetle is standing, then holds its aim as the beetle jumps clear at the last moment
      ant.at(fire, () => { ant.look = ant.angle; });
      S.stream(fire, ant, { aim: { x: stop.x, y: stop.y }, len: 300, width: 26, dur: 70 });
      b.emote(fire - 2, '!', 20);
      b.move(fire + 5, 7, stop.x + 10, stop.y - 65, 'snap', { arc: 12 });
      b.flash(fire + 5, 10);
      b.emote(fire + 16, 'sweat', 60);
      b.face(fire + 20, ant);
      b.emote(fire + 80, 'anger', 50);
      S.sendHome(fire + 85, [ant]);
      const done = S.gather(fire + 80, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'ghostBullets', key: 'ghost', need: p => p.has('ghost'),
    build: S => {
      // Bullets drift by out of nowhere... then the beetle sees who's shooting
      const b = S.beetle;
      const shooter = S.feature(sceneHas('ghost'), 1)[0];
      const beam = getSceneAbilityKeys(shooter.antIndex).includes('ghostBeam');
      sceneBeetleWalkIn(S, 0, 100, { x: -120, y: S.cy });
      shooter.x = S.W - 90;
      shooter.y = S.cy - 120;
      shooter.alpha = 0;
      shooter.look = b;
      for (let k = 0; k < 3; k++) {
        const y = S.cy - 90 + k * 90;
        S.bullet(90 + k * 25, { x: S.W * 0.85, y: y }, { angle: Math.PI + random(-0.1, 0.1), speed: 2.6, life: 260, fadeIn: 30, sound: false });
      }
      b.emote(110, '?', 80);
      b.face(110, 0).face(150, -0.4).face(185, 0.4);
      shooter.fade(200, 20, 1);
      b.at(205, () => { b.look = shooter; });
      b.emote(210, '!', 50);
      let end = 270;
      if (beam) {
        // An invisible beam, straight out of nowhere
        S.beam(250, shooter, { aim: { x: S.cx + 40, y: S.cy + 40 }, warn: 0, dur: 40, width: 28, ghost: true });
        b.move(250, 10, S.cx - 40, S.cy - 30, 'snap');
        S.shake(250, 10, 5);
        b.emote(255, '!!', 50);
        b.emote(285, 'sweat', 60);
        b.move(300, 25, S.cx, S.cy);
        end = 330;
      }
      S.sendHome(end - 40, [shooter]);
      const done = S.gather(end - 40, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'airStrike', key: 'airStrike', need: p => p.has('airStrike'),
    build: S => {
      // Cornered, one ant lobs something interesting into the sky
      const b = S.beetle;
      const shooter = S.feature(sceneHas('airStrike'), 1)[0];
      const corner = { x: S.W - 90, y: 90 };
      const pals = S.crowd().slice(0, 2);
      pals.forEach(a => { a.featured = true; });
      [shooter, ...pals].forEach((a, k) => { a.x = corner.x - k * 40; a.y = corner.y + (k % 2) * 40; a.look = b; });
      b.x = -120;
      b.y = S.cy + 60;
      b.look = shooter;
      b.move(0, 110, S.cx + 120, S.cy - 40, 'out');
      [shooter, ...pals].forEach((a, k) => a.emote(60 + k * 4, 'sweat', 50));
      S.at(120, () => {
        S.addFx({ kind: 'bullet', x: shooter.x, y: shooter.y, vx: 0, vy: 0, h: 0, life: 50, size: 1.6, aura: [80, 220, 80], climb: true });
      });
      for (let f = 0; f < 50; f++) S.at(120 + f, () => {
        const blt = S.fx.find(x => x.climb);
        if (blt) blt.h = f * f * 0.4;
      });
      b.at(125, () => { b.look = -Math.PI / 2; });
      b.emote(125, '?', 50);
      const target = { x: S.cx + 120, y: S.cy - 40 };
      S.at(175, () => S.addFx({ kind: 'skyMark', x: target.x, y: target.y, r: 70, life: 45 }));
      b.emote(180, '!', 40);
      b.at(182, () => { b.look = shooter; });
      b.move(184, 22, S.cx, S.cy, 'snap');
      S.at(220, () => S.boom(target.x, target.y, 110));
      S.shake(220, 16, 8);
      b.emote(226, 'sweat', 50);
      S.sendHome(240, [shooter, ...pals]);
      const done = S.gather(240, 'run');
      S.extend(done + 20);
    }
  },

  // --- Fire types ---
  {
    id: 'alternating', key: 'alternating', need: p => p.has('alternating'),
    build: S => {
      // Dodges the first shot, dodges the second the same way, and eats the quick third one
      const b = S.beetle;
      const shooter = S.feature(sceneHas('alternating'), 1)[0];
      shooter.x = S.W * 0.82;
      shooter.y = S.cy;
      shooter.look = b;
      b.x = -120;
      b.y = S.cy;
      b.look = shooter;
      b.move(0, 70, S.W * 0.3, S.cy, 'out');
      S.bullet(70, shooter, { aim: { x: S.W * 0.3, y: S.cy }, speed: 6 });
      b.move(82, 10, S.W * 0.3 + 30, S.cy - 50, 'snap');
      b.move(110, 50, S.W * 0.5, S.cy - 30, 'linear');
      S.bullet(150, shooter, { aim: { x: S.W * 0.5, y: S.cy - 30 }, speed: 6 });
      b.move(160, 10, S.W * 0.5 + 10, S.cy - 80, 'snap');
      S.bullet(162, shooter, { aim: { x: S.W * 0.5 + 10, y: S.cy - 80 }, speed: 8, hit: b });
      b.emote(196, 'dizzy', 60);
      b.shake(196, 30, 2);
      b.move(255, 40, S.cx, S.cy);
      S.sendHome(260, [shooter]);
      const done = S.gather(260, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'hitReload', key: 'hitReload', need: p => p.has('hitReload'),
    build: S => {
      // A chase all over the screen; the third shot lands, and the reload flash fires twice more
      const b = S.beetle;
      const prey = S.feature(sceneHas('hitReload'), 1)[0];
      prey.x = S.W * 0.3;
      prey.y = S.H * 0.3;
      prey.look = b;
      b.x = -120;
      b.y = S.H * 0.7;
      b.look = prey;
      const legs = [[S.W * 0.7, S.H * 0.3], [S.W * 0.7, S.H * 0.72], [S.W * 0.3, S.H * 0.72]];
      let t = 20;
      let at = { x: prey.x, y: prey.y };
      for (let k = 0; k < 2; k++) {
        S.bullet(t, prey, { speed: 7, aim: () => ({ x: b.x, y: b.y - 70 }) });
        b.move(t + 6, 18, at.x, at.y, 'in', { trail: true });
        prey.move(t + 12, 14, legs[k][0], legs[k][1], 'snap', { arc: 10 });
        at = { x: legs[k][0], y: legs[k][1] };
        t += 50;
      }
      S.bullet(t, prey, { speed: 9, hit: b });
      b.emote(t + 14, '!', 30);
      prey.at(t + 16, () => S.ring(prey.x, prey.y, 50, [255, 255, 255], 14));
      S.bullet(t + 22, prey, { speed: 10, hit: b });
      S.bullet(t + 30, prey, { speed: 10, hit: b });
      b.move(t + 46, 14, S.cx, S.cy, 'snap');
      b.emote(t + 62, 'sweat', 50);
      S.sendHome(t + 70, [prey]);
      const done = S.gather(t + 70, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'burst2', key: 'burst', need: () => countAntsWith('burst') >= 2,
    build: S => {
      // A spread of bullets with no way around it
      const c = sceneTwoAntChase(S, 'burst', [{ x: S.cx + 190, y: S.cy - 70 }, { x: S.cx + 190, y: S.cy + 70 }]);
      const b = S.beetle;
      for (const a of [c.a, c.b]) {
        for (let k = -3; k <= 3; k++) {
          // Aimed when it fires: at build time the ants are still off-screen to the left
          S.bullet(c.t + 4, a, { angle: () => Math.atan2(S.cy - a.y, S.cx - 30 - a.x) + k * 0.16, speed: 4.2, life: 64, fadeOut: 14, sound: k === 0 });
        }
      }
      b.emote(c.t + 10, '!', 40);
      b.move(c.t + 10, 26, S.cx - 90, S.cy, 'snap');
      b.move(c.t + 70, 30, S.cx, S.cy);
      b.emote(c.t + 40, 'sweat', 50);
      const t = c.t + 80;
      S.sendHome(t, [c.a, c.b]);
      const done = S.gather(t, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'delayedBurst', key: 'delayedBurst', need: p => p.has('delayedBurst'),
    build: S => {
      // Rushing through, ducking bullets and eating ants... until one bursts in its face
      const b = S.beetle;
      const last = S.feature(sceneHas('delayedBurst'), 1)[0];
      b.x = -100;
      b.y = S.cy;
      let t = 0;
      const prey = [[S.W * 0.14, S.cy - 60], [S.W * 0.26, S.cy + 60], [S.W * 0.38, S.cy - 40]];
      for (const [x, y] of prey) {
        const v = S.extra(x, y, { size: 0.9 });
        v.look = b;
        S.bullet(t + 6, v, { speed: 6, aim: () => ({ x: b.x, y: b.y }), life: 60 });
        b.move(t, 14, x - 40, y + (y < S.cy ? 50 : -50), 'out');
        b.move(t + 16, 8, x, y, 'snap');
        v.die(t + 24);
        t += 32;
      }
      last.x = S.W * 0.78;
      last.y = S.cy;
      last.look = b;
      b.move(t, 30, S.cx + 20, S.cy, 'linear');
      const splitAt = { x: S.cx + 60, y: S.cy };
      S.bullet(t + 4, last, { speed: dist(last.x, last.y, splitAt.x, splitAt.y) / 18, aim: splitAt, split: { at: 18, count: 6, life: 30 } });
      b.at(t + 23, () => { b.look = last; });
      b.move(t + 26, 12, S.cx, S.cy, 'snap');
      b.flash(t + 26, 14);
      b.emote(t + 28, '!', 50);
      S.sendHome(t + 60, [last]);
      const done = S.gather(t + 50, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'rapid', key: 'rapid', need: p => p.has('rapid'),
    build: S => {
      // No openings: the beetle circles all the way round and ends up back in the middle
      const b = S.beetle;
      const gunner = S.feature(sceneHas('rapid'), 1)[0];
      const center = { x: S.cx + 150, y: S.cy };
      gunner.x = center.x;
      gunner.y = center.y;
      gunner.look = b;
      b.x = -100;
      b.y = S.cy;
      b.look = 'move';
      b.move(0, 50, S.cx, S.cy, 'out');
      const pts = [];
      for (let k = 1; k <= 16; k++) {
        const a = Math.PI + k / 16 * Math.PI * 2;
        pts.push([center.x + Math.cos(a) * 150, center.y + Math.sin(a) * 150]);
      }
      b.path(55, 11, pts, 'linear');
      for (let k = 0; k < 30; k++) {
        S.bullet(55 + k * 6, gunner, { speed: 7, size: 0.6, aim: () => ({ x: b.x - 25 * Math.sin((55 + k * 6) * 0.05), y: b.y + 25 }), life: 50, sound: k % 3 === 0 });
      }
      b.emote(70, 'sweat', 80);
      b.at(232, () => { b.look = gunner; });
      b.emote(236, 'anger', 50);
      S.sendHome(240, [gunner]);
      const done = S.gather(235, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'stream2', key: 'stream', need: () => countAntsWith('stream') >= 2,
    build: S => {
      // Two streams sweeping back and forth, and the beetle weaving between them
      const c = sceneTwoAntChase(S, 'stream', [{ x: S.cx + 200, y: S.cy - 110 }, { x: S.cx + 200, y: S.cy + 110 }]);
      const b = S.beetle;
      S.stream(c.t + 4, c.a, { aim: { x: S.cx, y: S.cy - 30 }, sweep: 0.25, len: 250, dur: 110 });
      S.stream(c.t + 4, c.b, { aim: { x: S.cx, y: S.cy + 30 }, sweep: 0.25, len: 250, dur: 110 });
      b.path(c.t + 10, 18, [[S.cx - 40, S.cy - 40], [S.cx - 70, S.cy + 30], [S.cx - 30, S.cy - 20], [S.cx, S.cy]], 'inOut');
      b.emote(c.t + 12, '!', 40);
      b.emote(c.t + 70, 'sweat', 60);
      const t = c.t + 120;
      S.sendHome(t, [c.a, c.b]);
      const done = S.gather(t, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'alarm', key: 'alarm', need: p => p.has('alarm'),
    build: S => {
      // The closer the beetle gets, the faster it shoots, until it's shooting like crazy
      const b = S.beetle;
      const guard = S.feature(sceneHas('alarm'), 1)[0];
      guard.x = S.W * 0.82;
      guard.y = S.cy;
      guard.look = b;
      b.x = -100;
      b.y = S.cy;
      b.look = guard;
      // Closing in, side-stepping harder and harder
      const legs = [];
      const legTimes = [40, 40, 30, 30, 20, 20, 14, 14];
      let x = -100;
      const closest = guard.x - 75; // Well inside its inner alarm radius by the last leg
      legTimes.forEach((d, k) => {
        x += (closest + 100) / legTimes.length;
        legs.push({ d: d, x: x, y: S.cy + (k % 2 ? 1 : -1) * (14 + k * 4) });
      });
      let lt = 0;
      for (const leg of legs) {
        b.move(lt, leg.d, leg.x, leg.y, 'inOut');
        lt += leg.d;
      }
      const shots = [20, 70, 110, 140, 160, 175, 186, 194, 200, 205, 210, 214, 218];
      shots.forEach((t, k) => S.bullet(t, guard, { speed: 6 + k * 0.2, aim: () => ({ x: b.x, y: b.y + (k % 2 ? 60 : -60) }), life: 70, sound: k % 2 === 0 }));
      guard.at(110, () => { guard.tint = [255, 200, 140]; });
      guard.at(170, () => { guard.tint = [255, 120, 110]; });
      guard.shake(170, 50, 2);
      b.emote(185, '!', 30);
      b.at(200, () => { b.look = 'move'; });
      b.move(200, 24, S.cx, S.cy, 'snap');
      b.face(226, 0);
      b.emote(226, 'sweat', 60);
      guard.at(230, () => { guard.tint = null; });
      S.sendHome(240, [guard]);
      const done = S.gather(235, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'avenge', key: 'avenge', need: p => p.has('avenge'),
    build: S => {
      // It saw everything
      const b = S.beetle;
      const witness = S.feature(sceneHas('avenge'), 1)[0];
      const group = [];
      for (let k = 0; k < 5; k++) group.push(S.extra(S.cx + 120 + Math.cos(k * 1.3) * 26, S.cy + Math.sin(k * 1.3) * 26, { size: 0.9 }));
      group.forEach(a => { a.look = b; });
      witness.x = S.W * 0.85;
      witness.y = S.cy - 120;
      witness.look = { x: S.cx + 120, y: S.cy };
      b.x = -100;
      b.y = S.cy;
      b.look = 'move';
      b.move(0, 50, S.cx - 40, S.cy, 'out');
      b.move(55, 12, S.cx + 120, S.cy, 'snap', { trail: true });
      group.forEach(a => a.die(66, 'squash'));
      S.shake(66, 8, 4);
      witness.emote(80, '!', 40);
      witness.emote(120, 'rage', 120);
      witness.shake(120, 60, 3);
      witness.at(120, () => { witness.tint = [255, 140, 120]; witness.look = b; });
      b.at(110, () => { b.look = witness; });
      for (let k = 0; k < 5; k++) S.bullet(160 + k * 8, witness, { speed: 7, aura: [255, 60, 60], aim: () => ({ x: b.x + random(-60, 60), y: b.y + random(-60, 60) }) });
      b.emote(165, '!', 30);
      b.move(170, 20, S.cx, S.cy, 'snap');
      b.emote(195, 'sweat', 60);
      witness.at(220, () => { witness.tint = null; });
      S.sendHome(225, [witness]);
      const done = S.gather(220, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'curve', key: 'curve', need: () => countAntsWith('curve') >= 3,
    build: S => {
      // Three curving bullets block every path and trap it in the middle
      const b = S.beetle;
      const three = S.feature(sceneHas('curve'), 3);
      three.forEach((a, k) => {
        const ang = -Math.PI / 2 + k * Math.PI * 2 / 3;
        a.x = S.cx + Math.cos(ang) * 200;
        a.y = S.cy + Math.sin(ang) * 170;
        a.look = b;
      });
      b.x = -100;
      b.y = S.cy;
      b.look = 'move';
      b.move(0, 60, S.cx, S.cy, 'out');
      b.at(60, () => { b.look = three[0]; });
      b.move(62, 18, S.cx + (three[0].x - S.cx) * 0.35, S.cy + (three[0].y - S.cy) * 0.35, 'in');
      three.forEach(a => {
        for (let k = 0; k < 3; k++) {
          S.bullet(70 + k * 8, a, { angle: Math.atan2(S.cy - a.y, S.cx - a.x) - 0.6, speed: 4, curve: 0.035, life: 120, sound: k === 0 });
        }
      });
      b.move(82, 12, S.cx, S.cy, 'snap');
      b.emote(90, '!?', 60);
      b.face(100, three[1]).face(130, three[2]).face(160, three[0]);
      b.emote(165, 'sweat', 60);
      S.sendHome(200, three);
      const done = S.gather(195, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'homing', key: 'homing', need: p => p.has('homing'),
    build: S => {
      // Two easy meals, then a bullet that won't stop following
      const b = S.beetle;
      const hunter = S.feature(sceneHas('homing'), 1)[0];
      b.x = -100;
      b.y = S.cy;
      let t = 0;
      for (const [x, y] of [[S.W * 0.22, S.cy - 70], [S.W * 0.36, S.cy + 70]]) {
        const v = S.extra(x, y, { size: 0.9 });
        v.look = b;
        S.bullet(t + 6, v, { speed: 6, aim: () => ({ x: b.x, y: b.y }), life: 50 });
        b.move(t, 14, x - 30, y + (y < S.cy ? 60 : -60), 'out');
        b.move(t + 16, 8, x, y, 'snap');
        v.die(t + 24);
        t += 32;
      }
      hunter.x = S.W * 0.82;
      hunter.y = S.cy;
      hunter.look = b;
      S.bullet(t + 4, hunter, { speed: 4.5, aura: [255, 60, 60], homing: b, homingRate: 0.05, life: 240, fadeOut: 30 });
      b.emote(t + 20, '!', 40);
      const ring = [];
      for (let k = 0; k < 12; k++) {
        const a = Math.PI * 1.2 + k / 12 * Math.PI * 2;
        ring.push([S.cx + Math.cos(a) * S.W * 0.35, S.cy + Math.sin(a) * S.H * 0.32]);
      }
      b.path(t + 10, 18, ring, 'linear');
      b.move(t + 10 + 12 * 18, 20, S.cx, S.cy);
      b.emote(t + 250, 'sweat', 50);
      S.sendHome(t + 240, [hunter]);
      const done = S.gather(t + 235, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'accelerate', key: 'accelerate', need: p => p.has('accelerate'),
    build: S => {
      // Slow bullets... that suddenly aren't
      const b = S.beetle;
      const gunners = S.feature(sceneHas('accelerate'), 3);
      S.layout(S.cluster(S.cx + 60, S.cy, 140), 200, 3.5);
      gunners.forEach((a, k) => { a.x = S.cx + 170; a.y = S.cy - 80 + k * 80; a.look = b; });
      b.x = -100;
      b.y = S.cy;
      b.move(0, 30, S.cx - 40, S.cy, 'snap', { trail: true });
      S.at(30, () => S.dust(S.cx - 40, S.cy + 20, 10));
      gunners.forEach((a, k) => S.bullet(55 + k * 6, a, { speed: 0.8, accel: 1.08, accelDelay: 50, maxSpeed: 14, aim: () => ({ x: b.x, y: b.y + (k - 1) * 30 }), life: 160 }));
      b.emote(65, '...', 50);
      b.emote(120, '!', 40);
      b.move(124, 12, S.cx - 40, S.cy - 90, 'snap');
      b.move(172, 20, S.cx, S.cy, 'out');
      b.emote(194, 'anger', 50);
      S.sendHome(200, gunners);
      S.extend(260);
    }
  },
  {
    id: 'portal', key: 'portal', need: p => p.has('portal'),
    build: S => {
      // The bullet disappears halfway, and comes back from impossible angles
      const b = S.beetle;
      const shooter = S.feature(sceneHas('portal'), 1)[0];
      shooter.x = S.W * 0.82;
      shooter.y = S.cy;
      shooter.look = b;
      b.x = -100;
      b.y = S.cy;
      b.look = shooter;
      b.move(0, 80, S.cx - 30, S.cy, 'out');
      const behind = () => ({ x: b.x - 140, y: b.y + random(-80, 80) });
      const side = () => ({ x: b.x + random(-60, 60), y: b.y + (random() < 0.5 ? -130 : 130) });
      S.bullet(70, shooter, {
        speed: 5, aim: { x: S.cx - 30, y: S.cy }, life: 260,
        portal: { at: 20, to: behind, miss: 0.35, next: { at: 50, to: side, miss: -0.4, next: { at: 80, to: behind, miss: 0.3, next: { at: 999 } } } }
      });
      b.emote(92, '!?', 40);
      b.face(95, Math.PI).face(124, -Math.PI / 2).face(152, Math.PI);
      b.move(96, 8, S.cx - 30, S.cy - 30, 'snap');
      b.move(126, 8, S.cx - 30, S.cy + 20, 'snap');
      b.move(154, 8, S.cx - 30, S.cy - 10, 'snap');
      b.emote(140, 'dizzy', 50);
      b.shake(195, 10, 3);
      b.move(205, 25, S.cx, S.cy);
      b.face(230, shooter);
      b.emote(232, 'anger', 50);
      S.sendHome(235, [shooter]);
      const done = S.gather(230, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'proximityExplosion', key: 'proximityExplosion', need: p => p.has('proximityExplosion'),
    build: S => {
      // Two easy kills, then the third bullet explodes in its face: showdown
      const b = S.beetle;
      const bomber = S.feature(sceneHas('proximityExplosion'), 1)[0];
      b.x = -100;
      b.y = S.cy;
      let t = 0;
      for (const [x, y] of [[S.W * 0.22, S.cy - 70], [S.W * 0.36, S.cy + 70]]) {
        const v = S.extra(x, y, { size: 0.9 });
        v.look = b;
        S.bullet(t + 6, v, { speed: 6, aim: () => ({ x: b.x, y: b.y }), life: 50 });
        b.move(t, 14, x - 30, y + (y < S.cy ? 60 : -60), 'out');
        b.move(t + 16, 8, x, y, 'snap');
        v.die(t + 24);
        t += 32;
      }
      bomber.x = S.W * 0.82;
      bomber.y = S.cy;
      bomber.look = b;
      b.move(t, 30, S.cx + 30, S.cy, 'linear');
      const blastAt = { x: S.cx + 70, y: S.cy };
      S.bullet(t + 2, bomber, { speed: dist(bomber.x, bomber.y, blastAt.x, blastAt.y) / 24, aim: blastAt, aura: [80, 220, 80], life: 24 });
      S.at(t + 26, () => S.boom(blastAt.x, blastAt.y, 70));
      S.shake(t + 26, 12, 6);
      b.at(t + 27, () => { b.look = bomber; });
      b.move(t + 27, 14, S.cx, S.cy, 'snap');
      b.flash(t + 27, 14);
      b.emote(t + 50, 'glare', 70);
      bomber.emote(t + 50, 'glare', 70);
      S.sendHome(t + 110, [bomber]);
      const done = S.gather(t + 100, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'knockback2', key: 'knockback', need: () => countAntsWith('knockback') >= 2,
    build: S => {
      // Hit and sent flying back to the middle
      const c = sceneTwoAntChase(S, 'knockback', [{ x: S.cx + 230, y: S.cy - 60 }, { x: S.cx + 230, y: S.cy + 60 }]);
      const b = S.beetle;
      b.move(c.t - 10, 30, S.cx + 120, S.cy, 'linear');
      S.bullet(c.t + 2, c.a, { speed: 8, aura: [220, 220, 220], hit: b });
      S.bullet(c.t + 2, c.b, { speed: 8, aura: [220, 220, 220], hit: b });
      b.move(c.t + 16, 26, S.cx, S.cy, 'out', { arc: 30 });
      b.at(c.t + 16, () => { b.spin = 0.4; });
      b.at(c.t + 42, () => { b.spin = 0; b.look = c.a; });
      S.at(c.t + 42, () => S.dust(S.cx, S.cy + 20, 10));
      b.emote(c.t + 46, 'dizzy', 50);
      const t = c.t + 90;
      S.sendHome(t, [c.a, c.b]);
      const done = S.gather(t, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'launch', key: 'launch', need: p => p.has('launch'),
    build: S => {
      // Every dash, it launches straight over the beetle's head: up in the air, nothing on the ground can touch it.
      // They swap sides each time, the beetle dashing through the spot where the ant just was.
      const b = S.beetle;
      const hopper = S.feature(sceneHas('launch'), 1)[0];
      hopper.x = S.cx + 130;
      hopper.y = S.cy;
      hopper.look = b;
      b.x = -100;
      b.y = S.cy;
      b.look = hopper;
      let beetleAt = { x: S.cx - 130, y: S.cy };
      let antAt = { x: hopper.x, y: hopper.y };
      b.move(0, 50, beetleAt.x, beetleAt.y, 'out');
      let t = 60;
      [20, -25, 10].forEach((dy, k) => {
        const dir = Math.sign(antAt.x - beetleAt.x);
        const dashTo = { x: antAt.x + dir * 60, y: antAt.y };   // Right through where the ant was standing
        const land = { x: beetleAt.x - dir * 60, y: S.cy + dy }; // Behind where the beetle started
        b.at(t, () => { b.look = 'move'; }); // Eyes on where it's dashing, then back on the ant once it stops
        b.move(t, 18, dashTo.x, dashTo.y, 'in', { trail: true });
        b.face(t + 20, hopper);
        // Takes off as the beetle comes at it, at the top of its hop as the beetle passes underneath
        hopper.move(t + 4, 24, land.x, land.y, 'out', { arc: 75 });
        S.at(t + 18, () => S.dust(b.x, b.y + 20, 6, dir > 0 ? Math.PI : 0));
        b.shake(t + 18, 8, 2);
        if (k === 0) b.emote(t + 22, '?', 35);
        beetleAt = dashTo;
        antAt = land;
        t += 50;
      });
      b.emote(t, 'anger', 70);
      b.shake(t, 30, 2);
      b.move(t + 30, 30, S.cx, S.cy);
      S.sendHome(t + 30, [hopper]);
      const done = S.gather(t + 30, 'run');
      S.extend(done + 20);
    }
  },

  // --- Death types ---
  {
    id: 'hiddenLandmine', key: 'hiddenLandmine', need: p => p.has('hiddenLandmine'),
    build: S => {
      // Invisible mines, right where it was about to step
      const b = S.beetle;
      const layer = S.feature(sceneHas('hiddenLandmine'), 1)[0];
      layer.x = S.W - 100;
      layer.y = S.cy + 120;
      layer.alpha = 0;
      layer.look = b;
      const mines = [[S.cx + 60, S.cy], [S.cx + 30, S.cy - 70], [S.cx + 40, S.cy + 70], [S.cx - 60, S.cy - 60], [S.cx - 70, S.cy + 50]];
      mines.forEach(([x, y]) => S.place(0, { kind: 'mine', x: x, y: y, hidden: true }, 9999));
      b.x = -100;
      b.y = S.cy;
      b.move(0, 130, S.cx, S.cy, 'linear');
      b.emote(120, '!', 40);
      b.move(130, 8, S.cx - 6, S.cy, 'snap');
      b.emote(150, 'sweat', 70);
      b.face(160, -Math.PI / 2).face(190, Math.PI / 2).face(215, 0);
      layer.fade(200, 20, 1);
      b.at(222, () => { b.look = layer; });
      b.emote(224, '!', 40);
      S.at(255, () => { S.ground = S.ground.filter(g => g.kind !== 'mine'); });
      S.sendHome(250, [layer]);
      const done = S.gather(250, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'turret', key: 'turret', need: p => p.has('turret'),
    build: S => {
      // Crashing into a crowd, with turrets lining it up
      const b = S.beetle;
      S.layout(S.cluster(S.cx + 70, S.cy, 130), 170, 3.5);
      const spots = [[S.cx + 210, S.cy - 130], [S.cx + 230, S.cy + 120], [S.cx - 150, S.cy - 150]];
      spots.forEach(([x, y]) => S.place(20, { kind: 'turret', x: x, y: y }, 250));
      b.x = -100;
      b.y = S.cy;
      b.move(0, 30, S.cx - 30, S.cy, 'snap', { trail: true });
      S.at(30, () => S.dust(S.cx - 30, S.cy + 20, 10));
      spots.forEach(([x, y], k) => {
        for (let s = 0; s < 3; s++) S.bullet(60 + k * 10 + s * 32, { x: x, y: y }, { speed: 6.5, aim: () => ({ x: b.x, y: b.y }), life: 80, sound: s === 0 });
      });
      b.emote(55, '!', 40);
      b.path(66, 16, [[S.cx - 60, S.cy - 50], [S.cx - 20, S.cy + 40], [S.cx - 70, S.cy + 10], [S.cx, S.cy]], 'inOut');
      b.emote(140, 'sweat', 60);
      S.extend(270);
    }
  },
  {
    id: 'territory', key: 'territory', need: p => p.has('territory'),
    build: S => {
      // One plants a territory, they all pile in and fire like crazy
      const b = S.beetle;
      const planter = S.feature(sceneHas('territory'), 1)[0];
      const spot = { x: S.cx + 180, y: S.cy };
      const pals = S.crowd().slice(0, 5);
      pals.forEach(a => { a.featured = true; });
      const group = [planter, ...pals];
      group.forEach((a, k) => { a.x = spot.x + 120 + k * 20; a.y = spot.y - 100 + k * 40; a.look = b; });
      b.x = -100;
      b.y = S.cy;
      b.look = 'move';
      b.move(0, 80, S.cx - 40, S.cy, 'out');
      planter.move(40, 30, spot.x, spot.y);
      S.place(72, { kind: 'territory', x: spot.x, y: spot.y, r: 90 }, 300);
      group.forEach((a, k) => {
        if (a === planter) return;
        a.move(80 + k * 3, 30, spot.x + Math.cos(k * 1.2) * 50, spot.y + Math.sin(k * 1.2) * 50, 'out');
      });
      b.emote(90, '?', 40);
      group.forEach((a, k) => {
        for (let s = 0; s < 4; s++) S.bullet(120 + s * 10 + k * 3, a, { speed: 6.5, aim: () => ({ x: b.x + random(-40, 40), y: b.y + random(-40, 40) }), life: 40, fadeOut: 10, sound: s === 0 && k < 2 });
      });
      b.emote(125, '!', 40);
      b.move(126, 30, S.cx - 120, S.cy, 'snap');
      b.move(200, 40, S.cx, S.cy);
      b.emote(170, 'sweat', 50);
      S.sendHome(250, group);
      const done = S.gather(245, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'nest', key: 'nest', need: p => p.has('nest'),
    build: S => {
      // Rammed full speed, and the beetle's the one that goes flying
      const b = S.beetle;
      const target = S.feature(sceneHas('nest'), 1)[0];
      target.x = S.cx + 170;
      target.y = S.cy;
      target.look = b;
      b.x = -100;
      b.y = S.cy;
      b.look = target;
      b.move(0, 70, S.cx - 30, S.cy, 'out');
      S.place(60, { kind: 'nest', x: target.x, y: target.y, r: 80 }, 330);
      target.at(70, () => { target.shield = true; });
      target.emote(62, '!', 30);
      b.move(90, 16, S.cx + 110, S.cy, 'in', { trail: true });
      S.at(106, () => S.ring(S.cx + 140, S.cy, 60, [150, 215, 255], 16));
      S.shake(106, 10, 6);
      b.move(106, 28, S.cx, S.cy, 'out', { arc: 26 });
      b.at(106, () => { b.spin = -0.35; });
      b.at(134, () => { b.spin = 0; b.look = target; });
      b.emote(140, '?', 50);
      b.emote(195, 'glare', 70);
      target.at(270, () => { target.shield = false; });
      S.sendHome(270, [target]);
      const done = S.gather(260, 'run');
      S.extend(done + 20);
    }
  },
  {
    id: 'mound', key: 'mound', need: p => p.has('mound'),
    build: S => {
      // It keeps putting mounds in the way, then calls the pack
      const b = S.beetle;
      const builder = S.feature(sceneHas('mound'), 1)[0];
      builder.x = S.W * 0.4;
      builder.y = S.cy;
      builder.look = 'move';
      b.x = -100;
      b.y = S.cy;
      b.look = builder;
      const legs = [[S.W * 0.62, S.cy - 80], [S.W * 0.75, S.cy + 60], [S.W * 0.82, S.cy - 20]];
      let t = 10;
      legs.forEach(([x, y], k) => {
        builder.move(t, 30, x, y, 'out');
        S.place(t + 20, { kind: 'mound', x: S.W * (0.42 + k * 0.13), y: lerp(S.cy, y, 0.5), r: 26 }, 320);
        b.move(t, 34, S.W * (0.42 + k * 0.13) - 58, lerp(S.cy, y, 0.5), 'in'); // Up against the mound
        S.at(t + 34, () => S.dust(b.x + 30, b.y, 6));
        b.shake(t + 34, 10, 2);
        t += 45;
      });
      builder.face(t, b);
      builder.emote(t + 4, 'alert', 40);
      b.emote(t + 10, '!', 40);
      b.move(t + 15, 40, S.cx, S.cy);
      S.sendHome(t + 50, [builder]);
      const done = S.gather(t + 20, 'run', { speed: 7 });
      S.extend(Math.max(done, t + 90) + 20);
    }
  },
  {
    id: 'bunker', key: 'bunker', need: p => p.has('bunker'),
    build: S => {
      // Strolling past some holes, until they start shooting
      const b = S.beetle;
      const holes = [[S.cx - 140, S.cy - 120], [S.cx + 160, S.cy - 100], [S.cx + 120, S.cy + 130], [S.cx - 170, S.cy + 110]];
      holes.forEach(([x, y]) => S.place(0, { kind: 'bunker', x: x, y: y, r: 26 }, 240));
      b.x = -100;
      b.y = S.cy;
      b.move(0, 140, S.cx, S.cy, 'linear');
      holes.forEach(([x, y], k) => {
        for (let s = 0; s < 3; s++) S.bullet(100 + k * 9 + s * 28, { x: x, y: y }, { speed: 6.5, aim: () => ({ x: b.x, y: b.y }), life: 60, sound: s === 0 });
      });
      b.emote(108, '!', 40);
      b.move(112, 10, S.cx - 30, S.cy - 30, 'snap');
      b.move(140, 10, S.cx + 20, S.cy + 20, 'snap');
      b.move(168, 12, S.cx, S.cy, 'snap');
      b.emote(185, 'sweat', 50);
      // The bunkers cave in and the ants spill out of them
      S.crowd().forEach((a, k) => {
        const h = holes[k % holes.length];
        a.visible = false;
        a.x = h[0];
        a.y = h[1];
        a.show(240 + (k % 8) * 3);
        a.move(240 + (k % 8) * 3, 40, a.home.x, a.home.y, 'out').face(282 + (k % 8) * 3, b);
      });
      holes.forEach(([x, y]) => S.at(240, () => S.dust(x, y, 10)));
      S.extend(320);
    }
  }
];
