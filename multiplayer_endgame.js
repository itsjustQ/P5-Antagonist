// ========== MULTIPLAYER: STATS, TITLES AND THE END OF THE GAME ==========
// Every combat turn tracks what each player's beetle and ants got up to, for the end-of-game titles. The end of the
// game is one of three showdowns:
//   loneSurvivor - one beetle left: the fake-out, then three bonus achievements; each one another player earned sends
//                  that player's queen at the survivor (the final stand). Beat them all and the survivor wins; fall, and
//                  the queens still standing fight it out in the tournament.
//   tournament   - the last beetles fell in the same round: every player's queen (with her upgrades, and the abilities
//                  of their ant design) fights in a bracket seeded by score, bonus achievements counted first.
//   roundLimit   - the round limit was reached with 2+ beetles alive: bonus achievements are added, best score wins.

// ---------- Tracking (wrappers around the game's own functions, so sketch.js stays as it is) ----------

let mpAntLanded = [];     // By ant: frame it last landed or came out of a bunker (Camper)
let mpAntLastHit = [];    // By ant: frame it last hit the beetle (Loyalty)
let mpAntClose = [];      // By ant: frames spent within 100px of the beetle this life (Tempting Fate)
let mpAntWasAir = [];
let mpAntWasBunker = [];
let mpSeenMines = new WeakSet();
let mpLastKillSource = null;
let mpTrack = null;       // This turn's beetle tracking

function mpWrap(name, after) {
  const orig = window[name];
  if (typeof orig !== 'function' || orig.mpWrapped) return;
  const wrapped = function (...args) {
    if (!mpInCombat()) return orig.apply(this, args);
    const ctx = after.before ? after.before(...args) : null;
    const result = orig.apply(this, args);
    after.after(ctx, result, ...args);
    return result;
  };
  wrapped.mpWrapped = true;
  window[name] = wrapped;
}

function mpOwnerOf(i) {
  const o = mpAntOwner[i];
  return o !== undefined && o >= 0 ? mp.players[o] : null;
}

function mpInstallTracking() {
  mpWrap('createAntBullet', { after: (ctx, b, i) => {
    const o = mpOwnerOf(i);
    if (!o || !b) return;
    const speed = Math.sqrt((b.speedX || 0) ** 2 + (b.speedY || 0) ** 2) || b.trueSpeed || 0;
    o.stats.fastestBullet = Math.max(o.stats.fastestBullet, speed);
    o.stats.biggestBullet = Math.max(o.stats.biggestBullet, b.size || 0);
    // Smallest: tracked as how far under full size it was, so "most" means smallest
    if (b.size > 0) o.stats.smallestBullet = Math.max(o.stats.smallestBullet, 1 / b.size);
    if (b.size < 1) o.stats.smallBullets++;
    if (getSpecialType(i) !== 0) o.stats.specialBullets++;
    if (b.pathType === -2) o.stats.homingBullets++;
  } });
  mpWrap('handlePlayerHit', {
    before: () => ({ health: health, shield: shield }),
    after: (ctx, r, i, kb, bx, by, km, bs, isMine, size, hitInfo) => {
      const o = mpOwnerOf(i);
      if (!o) return;
      const dealt = (ctx.health - health) + (ctx.shield - shield);
      if (dealt <= 0) return;
      mpAntLastHit[i] = frameCount;
      // From behind: more than 120 degrees off where the beetle faces
      const facing = playerRotationValue * Math.PI / 180;
      const from = Math.atan2(by - playerY, bx - playerX);
      let diff = Math.abs(from - facing) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (!isMine && diff > Math.PI * 2 / 3) o.stats.backShots++;
      if (hitInfo && hitInfo.highArc && !isMine) o.stats.highArcDamage += dealt;
      const path = getPathType(i);
      if (!isMine && (path === 2 || path === 3 || path === -1 || path === -2)) o.stats.calculatedHits++;
      if (getFireType(i) === -2) o.stats.ignoredCooldowns++; // Hit reload fires again right away
    } });
  mpWrap('queueAvengeShot', { after: (ctx, r, i) => { const o = mpOwnerOf(i); if (o) o.stats.ignoredCooldowns++; } });
  mpWrap('addKillScore', { after: (ctx, r, base, size, source) => {
    mpLastKillSource = source;
    if (source === 'bullet') mp.players[mp.turn].stats.antsShot++;
  } });
  mpWrap('onAntDied', { after: (ctx, r, i) => {
    const o = mpOwnerOf(i);
    const p = mp.players[mp.turn];
    if (o) o.stats.antDeaths++;
    if (frameCount - (mpAntLanded[i] || -9999) < 60) p.stats.campEats++;
    if (o && frameCount - (mpAntLastHit[i] || -9999) < 60) o.stats.loyalDeaths++;
    if (mpTrack && mpTrack.stillFrames >= 30 && mpLastKillSource !== 'bullet' && mpLastKillSource !== 'shockwave') p.stats.standingRunIns++;
    mpAntClose[i] = 0;
    mpLastKillSource = null;
  } });
  mpWrap('eatAphid', { after: () => { mp.players[mp.turn].stats.aphidsEaten++; } });
  mpWrap('boostAntFromAphid', { after: (ctx, r, i) => { const o = mpOwnerOf(i); if (o) o.stats.aphidsDrunk++; } });
  const structure = (ctx, r, bullet, ownerId) => { const o = mpOwnerOf(ownerId); if (o) o.stats.structures++; };
  mpWrap('spawnEnemyTerritory', { after: structure });
  mpWrap('spawnEnemyWall', { after: structure });
  mpWrap('spawnDeathRefire', { after: structure });
}

// Start of a combat turn
function mpCombatStatsStart(p) {
  mpInstallTracking();
  mpAntLanded = [];
  mpAntLastHit = [];
  mpAntClose = [];
  mpAntWasAir = [];
  mpAntWasBunker = [];
  mpSeenMines = new WeakSet();
  mpTrack = { x: playerX, y: playerY, health: health, shield: shield, stillFrames: 0, dirs: [], hits: 0 };
  aphidSpawnRateMultiplier = mp.finalStand && mp.finalStand.ladybug ? 2 : 1;
}

// Every combat frame (from mpUpdateQueens)
function mpCombatTick() {
  if (!mpInCombat() || !mpTrack || end || roundIntroTimer > 0) return;
  const p = mp.players[mp.turn];
  const s = p.stats;
  const t = mpTrack;
  // These are stamped later in the frame than this runs, so count each new stamp
  if (lastBeetleDashFrame !== t.dashStamp) { if (t.dashStamp !== undefined) s.dashes++; t.dashStamp = lastBeetleDashFrame; }
  if (lastBeetleShockwaveFrame !== t.waveStamp) { if (t.waveStamp !== undefined) s.shockwaves++; t.waveStamp = lastBeetleShockwaveFrame; }
  if (lastBeetleShotFrame !== t.shotStamp) { if (t.shotStamp !== undefined) s.bulletsFired++; t.shotStamp = lastBeetleShotFrame; }
  s.bestCombo = Math.max(s.bestCombo, combo || 0);
  if (isPlayerFlying()) s.beetleAirFrames++;
  // Movement: the player's own, or pushed and thrown around by someone else's ants or queen
  const moved = dist(t.x, t.y, playerX, playerY);
  const grabbed = mpQueens.some(q => q.grab || q.guards.some(g => g.grab));
  if (moved > 0.01) {
    if (playerKnockedBack || grabbed) {
      s.movedByOthers += moved;
      const by = lastBeetleDamager >= 1 ? mpOwnerOf(lastBeetleDamager) : (mpLastQueenHitOwner !== null ? mp.players[mpLastQueenHitOwner] : null);
      if (by) by.stats.movedOthers += moved;
    } else {
      s.distance += moved;
    }
  }
  t.stillFrames = moved < 0.3 ? t.stillFrames + 1 : 0;
  const cx = getGameplayWidth() / 2, cy = getGameplayHeight() / 2;
  if (moved < 0.3 && dist(playerX, playerY, cx, cy) < Math.min(getGameplayWidth(), getGameplayHeight()) * 0.15) s.centerStillFrames++;
  t.x = playerX;
  t.y = playerY;
  // Circles: up, right, down, left in a row (or the other way round)
  let dir = null;
  if (isUpPressed()) dir = 'U';
  else if (isRightPressed()) dir = 'R';
  else if (isDownPressed()) dir = 'D';
  else if (isLeftPressed()) dir = 'L';
  if (dir && dir !== t.dirs[t.dirs.length - 1]) {
    t.dirs.push(dir);
    if (t.dirs.length > 4) t.dirs.shift();
    const seq = t.dirs.join('');
    if (seq.length === 4 && ('URDLURDL'.includes(seq) || 'ULDRULDR'.includes(seq))) {
      s.circles++;
      t.dirs = [];
    }
  }
  // Hits and shields
  if (health < t.health - 1e-6 || shield < t.shield - 1e-6) t.hits++;
  if (Math.floor(t.shield) > Math.floor(Math.max(0, shield))) s.shieldsBurned += Math.floor(t.shield) - Math.floor(Math.max(0, shield));
  t.health = health;
  t.shield = shield;
  // Ants: airtime, landings, lingering near the beetle, landmines laid
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i]) continue;
    const o = mpOwnerOf(i);
    if (!o) continue;
    const air = antAirHeight[i] > 0;
    if (air) o.stats.antAirFrames++;
    if (mpAntWasAir[i] && !air) mpAntLanded[i] = frameCount;
    mpAntWasAir[i] = air;
    const bunkered = !!antInBunker[i];
    if (mpAntWasBunker[i] && !bunkered) mpAntLanded[i] = frameCount;
    mpAntWasBunker[i] = bunkered;
    if (dist(antX[i], antY[i], playerX, playerY) < 100) {
      mpAntClose[i] = (mpAntClose[i] || 0) + 1;
      if (mpAntClose[i] === 180) o.stats.temptingFate++;
    }
  }
  for (const m of landMines) {
    if (m.isPlayerMine || mpSeenMines.has(m)) continue;
    mpSeenMines.add(m);
    const o = mpOwnerOf(m.owner);
    if (o) o.stats.structures++;
  }
}

// End of a combat turn
function mpCombatStatsEnd(p, died) {
  if (mpTrack) p.stats.nonLethalHits += Math.max(0, mpTrack.hits - (died ? 1 : 0));
  mpTrack = null;
  aphidSpawnRateMultiplier = 1;
}

function mpOnPlayerKilled(killer, victim) {
  killer.stats.kills++;
  if (!killer.alive) killer.stats.killsAfterDeath++;
  mp.killLog = mp.killLog || [];
  mp.killLog.push({ killer: killer.index, victim: victim.index, order: victim.deathOrder });
}

// Upstairs Neighbor Activities: the longest run of a player's kills where each victim sat next to the last one in
// turn order (wrapping around, and skipping players who were already out)
function mpNeighborChains() {
  const log = (mp.killLog || []).slice().sort((a, b) => a.order - b.order);
  const n = mp.players.length;
  const best = {};
  const chain = {};
  const deadBefore = order => new Set(mp.players.filter(p => p.deathOrder !== null && p.deathOrder < order).map(p => p.index));
  for (const k of log) {
    const prev = chain[k.killer];
    let len = 1;
    if (prev) {
      // Neighbors of the previous victim among the players still in when it fell
      const gone = deadBefore(prev.order);
      const ring = [];
      for (let s = 0; s < n; s++) if (!gone.has(s)) ring.push(s);
      const at = ring.indexOf(prev.victim);
      const left = ring[(at - 1 + ring.length) % ring.length];
      const right = ring[(at + 1) % ring.length];
      if (k.victim === left || k.victim === right) len = prev.len + 1;
    }
    chain[k.killer] = { victim: k.victim, order: k.order, len: len };
    best[k.killer] = Math.max(best[k.killer] || 0, len);
  }
  return best;
}

// ---------- Titles ----------

const MP_SPECIAL_UPGRADES = [27, 30, 32, 33, 34, 44, 45, 46, 47, 54, 59, 60, 9, 51, 57, 58]; // Shots, shockwaves and dashes
const MP_DEFENSE_UPGRADES = [3, 5, 18, 19, 48, 50, 51, 52, 53, 55, 63];
const MP_BEETLE_NAMED = [9, 10, 36, 59, 60];

// Each: name, what it's for, and the value per player (the top value has to be unique and above 0 to be awarded)
function mpTitleDefs() {
  const chains = mpNeighborChains();
  const owned = (p, ids) => ids.reduce((a, id) => a + (p.upgrades[id] > 0 ? 1 : 0), 0);
  const levels = (p, ids) => ids.reduce((a, id) => a + p.upgrades[id], 0);
  return [
    ['queensSpawned', 'Most queens spawned', p => p.stats.queensSpawned],
    ['queensTargeted', 'Most targeted by queens', p => p.stats.queensTargeted],
    ['kills', 'Most player kills', p => p.stats.kills],
    ['antsShot', 'Most ants shot', p => p.stats.antsShot],
    ['bestCombo', 'Largest combo', p => p.stats.bestCombo],
    ['throws', 'Bully', p => p.stats.throws, 'their queens and guards threw beetles the most'],
    ['dashes', 'Most dashes used', p => p.stats.dashes],
    ['circles', 'Most circles done', p => p.stats.circles],
    ['distance', 'Most distance traveled', p => Math.round(p.stats.distance)],
    ['shockwaves', 'Most shockwaves used', p => p.stats.shockwaves],
    ['bulletsFired', 'Most bullets fired', p => p.stats.bulletsFired],
    ['versatile', 'Versatile', p => owned(p, MP_SPECIAL_UPGRADES), 'the most special shot, shockwave and dash upgrades'],
    ['defensive', 'Most defensive', p => levels(p, MP_DEFENSE_UPGRADES), 'the most defense upgrades'],
    ['shieldsBurned', 'Most shields burned', p => p.stats.shieldsBurned],
    ['beetleAir', 'Most airtime (beetle)', p => p.stats.beetleAirFrames],
    ['antAir', 'Most airtime (ants)', p => p.stats.antAirFrames],
    ['fastestBullet', 'Fastest bullet', p => Math.round(p.stats.fastestBullet * 100) / 100],
    ['antDeaths', 'Most Negative Feedback', p => p.stats.antDeaths, 'their ants died the most'],
    ['slotsHeld', 'Multitudes', p => p.stats.slotsHeld, 'held the most ant slots'],
    ['biggestBullet', 'Biggest Bullet', p => Math.round(p.stats.biggestBullet * 100) / 100],
    ['smallestBullet', 'Smallest Bullet', p => Math.round(p.stats.smallestBullet * 100) / 100],
    ['obedient', 'Obedient', p => p.stats.suggestionsFollowed, 'followed the most slider suggestions'],
    ['nonLethal', 'Why Won\'t You Die', p => p.stats.nonLethalHits, 'took the most hits without dying'],
    ['abduction', 'Abduction', p => Math.round(p.stats.movedOthers), 'pushed and threw other beetles around the most'],
    ['rememberMe', 'Remember Me', p => p.deathOrder === 1 ? 1 : 0, 'the first one out'],
    ['cheater', 'Cheater!', p => p.stats.standingRunIns, 'the most ants ran into them while they stood still'],
    ['camper', 'Camper', p => p.stats.campEats, 'ate the most ants right as they landed or came out of a bunker'],
    ['temptingFate', 'Tempting Fate', p => p.stats.temptingFate, 'their ants lingered next to beetles the longest and lived'],
    ['makeUpYourMind', 'Make Up Your Mind', p => p.stats.abilitySwitches, 'switched abilities the most'],
    ['taken', 'Taken', p => Math.round(p.stats.movedByOthers), 'got pushed and thrown around the most'],
    ['backShots', 'Back Shots', p => p.stats.backShots, 'their ants shot the most beetles in the back'],
    ['thief', 'Thief', p => p.stats.aphidsDrunk, 'their ants drank from the most aphids'],
    ['beetleiest', 'Beetleiest Beetle', p => owned(p, MP_BEETLE_NAMED), 'the most upgrades with "beetle" in the name'],
    ['easyMeals', 'Easy Meals', p => p.stats.aphidsEaten, 'ate the most aphids'],
    ['comingDown', 'Y\'all Coming Down With Me', p => p.stats.killsAfterDeath, 'the most kills after their own beetle was out'],
    ['termsAndConditions', 'I Have Read the Terms and Conditions', p => p.stats.upgradeFrames, 'the longest on the upgrade screen'],
    ['aintGotTime', 'Ain\'t Got Time', p => p.stats.upgradeFrames, 'the least time on the upgrade screen', 'min'],
    ['legalGuardian', 'Waiting for My Legal Guardian', p => p.stats.centerStillFrames, 'stood still in the middle the longest'],
    ['architect', 'Architect', p => p.stats.structures, 'their ants built the most landmines, bunkers and the like'],
    ['neighbors', 'Upstairs Neighbor Activities', p => (chains[p.index] || 0) >= 2 ? chains[p.index] : 0, 'the longest chain of neighbors taken out'],
    ['special', 'I\'m Special!', p => p.stats.specialBullets, 'their ants fired the most special bullets'],
    ['splitter', 'Splitter', p => p.stats.smallBullets, 'their ants fired the most small bullets'],
    ['noCooldowns', 'Who Needs Cooldowns?', p => p.stats.ignoredCooldowns, 'their ants skipped the most cooldowns'],
    ['rainingPain', 'Raining Pain', p => Math.round(p.stats.highArcDamage * 10) / 10, 'the most damage from high arcs'],
    ['calculated', 'Calculated', p => p.stats.calculatedHits, 'the most hits with tricky bullet paths'],
    ['inescapable', 'Inescapable', p => p.stats.homingBullets, 'their ants fired the most heat-seeking bullets'],
    ['loyalty', 'Loyalty', p => p.stats.loyalDeaths, 'the most ants that died right after landing a hit']
  ].map(([id, name, value, desc, mode]) => ({ id, name, value, desc: desc || '', mode: mode || 'max' }));
}

// Who holds each title: { def, holder (player index), value }, or null if it's tied or never happened
function mpEvaluateTitle(def) {
  const vals = mp.players.map(p => def.value(p));
  const best = def.mode === 'min' ? Math.min(...vals) : Math.max(...vals);
  if (!(best > 0)) return null;
  const holders = vals.map((v, k) => v === best ? k : -1).filter(k => k >= 0);
  if (holders.length !== 1) return null;
  return { def: def, holder: holders[0], value: best };
}

function mpEligibleTitles() {
  return mpTitleDefs().map(mpEvaluateTitle).filter(t => t);
}

// Three random eligible titles (fewer when there aren't enough: the rest are empty spaces)
function mpDrawThreeTitles() {
  const pool = mpEligibleTitles();
  const out = [];
  for (let k = 0; k < 3; k++) {
    if (pool.length === 0) out.push(null);
    else out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

// ---------- Showdowns ----------

function mpStartShowdown(kind, survivor) {
  mp.showdown = { kind: kind, survivor: survivor ? survivor.index : null, step: 'intro', frames: 0 };
  mp.finalStand = null;
  if (kind === 'loneSurvivor') {
    mp.showdown.bonus = mpDrawThreeTitles();
    mp.showdown.step = 'fakeout';
  } else if (kind === 'roundLimit') {
    mp.showdown.bonus = mpDrawThreeTitles();
    mp.showdown.step = 'bonus';
  } else {
    mp.showdown.bonus = mpDrawThreeTitles();
    mp.showdown.step = 'bonus';
    mp.showdown.entrants = mp.players.map(p => p.index);
  }
  mpSetPhase('showdown');
}

function mpAwardBonus() {
  for (const t of mp.showdown.bonus) {
    if (!t) continue;
    mp.players[t.holder].bonusPoints += MP_BONUS_ACHIEVEMENT_POINTS;
  }
}

function mpDrawShowdown(inp) {
  const sd = mp.showdown;
  sd.frames++;
  if (sd.step === 'fakeout') mpDrawFakeout(inp);
  else if (sd.step === 'bonus') mpDrawBonusReveal(inp, false);
  else if (sd.step === 'bracket') mpDrawBracket(inp);
}

// ----- The lone survivor fake-out -----

function mpDrawFakeout(inp) {
  const sd = mp.showdown;
  const p = mp.players[sd.survivor];
  const t = sd.frames;
  const W = getMenuWidth(), H = getMenuHeight();
  const gold = Math.min(1, t / 40);
  // 1-2: gold, a highlight on the beetle, a shake and confetti; 3: purple creeps in from the edges; 4: all purple
  const creep = constrain((t - 170) / 110, 0, 1);
  const allPurple = constrain((t - 280) / 40, 0, 1);
  push();
  noStroke();
  fill(lerp(20, 235, gold), lerp(16, 185, gold), lerp(10, 60, gold));
  rect(0, 0, W, H);
  // Purple vignette from the edges
  if (creep > 0) {
    const ctx = drawingContext;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * (0.9 - 0.85 * creep), W / 2, H / 2, H * 1.1);
    g.addColorStop(0, 'rgba(70,10,110,0)');
    g.addColorStop(1, `rgba(70,10,110,${0.95 * creep})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  fill(60, 8, 95, 255 * allPurple);
  rect(0, 0, W, H);
  pop();
  if (t > 60 && t < 200) mp.shake = Math.max(mp.shake, 3 + (t - 60) / 30);
  // The beetle, lit up
  push();
  noStroke();
  fill(255, 250, 200, 120 * gold * (1 - allPurple));
  ellipse(W / 2, H / 2 + 10, 260 + 20 * Math.sin(t * 0.1), 260 + 20 * Math.sin(t * 0.1));
  pop();
  mpDrawMenuBeetle(W / 2, H / 2 + 10, 170, -Math.PI / 2, p.color);
  // Confetti, as if a crown is about to go on
  if (t > 60 && t < 230) {
    sd.confetti = sd.confetti || [];
    for (let k = 0; k < 3; k++) sd.confetti.push({ x: W / 2 + random(-40, 40), y: H / 2 - 40, vx: random(-4, 4), vy: random(-7, -2), c: random([[255, 80, 80], [80, 160, 255], [255, 230, 80], [120, 255, 140], [255, 140, 220]]), life: 90 });
  }
  if (sd.confetti) {
    push();
    noStroke();
    for (const c of sd.confetti) {
      c.x += c.vx; c.y += c.vy; c.vy += 0.15; c.life--;
      fill(c.c[0], c.c[1], c.c[2], 255 * Math.min(1, c.life / 30));
      rect(c.x, c.y, 6, 9);
    }
    pop();
    sd.confetti = sd.confetti.filter(c => c.life > 0);
  }
  push();
  textAlign(CENTER, CENTER);
  if (t < 230) {
    fill(80, 50, 0, 255 * gold);
    textSize(46);
    text(`${p.name} is the last beetle standing!`, W / 2, 80);
    if (t > 100) {
      textSize(24);
      text('The champion...', W / 2, 130);
    }
  } else {
    fill(230, 200, 255, 255 * allPurple);
    textSize(40);
    text('...but not so fast.', W / 2, 80);
  }
  pop();
  if (t > 330 || (t > 40 && (inp.confirm || inp.click) && t < 300 && (sd.frames = 300))) {
    sd.step = 'bonus';
    sd.frames = 0;
  }
}

// ----- The bonus achievements, one at a time -----

function mpDrawBonusReveal(inp) {
  const sd = mp.showdown;
  const W = getMenuWidth(), H = getMenuHeight();
  const lone = sd.kind === 'loneSurvivor';
  mpBackground(lone ? [60, 8, 95] : [24, 16, 36]);
  mpTitle(lone ? 'Bonus achievements' : sd.kind === 'roundLimit' ? `Round ${mp.round}: the round limit` : 'Every beetle has fallen', 50, 40);
  push();
  textAlign(CENTER, CENTER);
  textSize(17);
  fill(220);
  text(lone ? 'Every achievement another player earned brings their queen back to challenge the survivor.' :
    sd.kind === 'roundLimit' ? `Each bonus achievement is worth ${MP_BONUS_ACHIEVEMENT_POINTS.toLocaleString()} points. Then the best score wins.` :
    `Each bonus achievement is worth ${MP_BONUS_ACHIEVEMENT_POINTS.toLocaleString()} points before the queens are seeded.`, W / 2, 92);
  pop();
  const each = 70;
  const shown = Math.min(3, Math.floor(sd.frames / each));
  for (let k = 0; k < 3; k++) {
    const x = W / 2 + (k - 1) * 380;
    const y = 270;
    const age = sd.frames - k * each;
    if (age < 0) continue;
    const s = Math.min(1, age / 14);
    const t = sd.bonus[k];
    push();
    translate(x, y);
    scale(0.6 + 0.4 * s);
    rectMode(CENTER);
    if (!t) {
      // A disappointing empty space where a title would have been
      noFill();
      stroke(120, 120, 120, 200);
      strokeWeight(2);
      drawingContext.setLineDash([8, 8]);
      rect(0, 0, 330, 230, 16);
      drawingContext.setLineDash([]);
      noStroke();
      fill(140);
      textAlign(CENTER, CENTER);
      textSize(20);
      text('...nothing.', 0, -10);
      textSize(14);
      text('Nobody earned this one outright.', 0, 22);
    } else {
      const p = mp.players[t.holder];
      fill(20, 10, 30, 230);
      stroke(p.color[0], p.color[1], p.color[2]);
      strokeWeight(4);
      rect(0, 0, 330, 230, 16);
      noStroke();
      textAlign(CENTER, CENTER);
      rectMode(CORNER);
      fill(255, 215, 110);
      mpFitBox(t.def.name, 24, 300, 50);
      text(t.def.name, -150, -95, 300, 50);
      fill(200);
      mpFitBox(t.def.desc, 14, 300, 40);
      text(t.def.desc, -150, -45, 300, 40);
      fill(p.color[0], p.color[1], p.color[2]);
      fitTextSize(p.name, 28, 300);
      stroke(0);
      strokeWeight(3);
      text(p.name, 0, 14);
      noStroke();
      fill(240);
      const effect = lone ? (t.holder === sd.survivor ? 'The survivor\'s reward: every ladybug upgrade, and twice the aphids' : `${p.name}'s queen returns!`) : `+${MP_BONUS_ACHIEVEMENT_POINTS.toLocaleString()} points`;
      mpFitBox(effect, 15, 300, 50);
      text(effect, -150, 55, 300, 50);
    }
    pop();
    // Each queen that comes back appears under her card
    if (lone && t && t.holder !== sd.survivor && age > 20) {
      const p = mp.players[t.holder];
      push();
      translate(x, y + 175);
      imageMode(CENTER);
      tint(220, 160, 255, 255 * Math.min(1, (age - 20) / 20));
      image(mpAntImage(), 0, 0, 90, 90);
      noTint();
      noFill();
      stroke(p.color[0], p.color[1], p.color[2]);
      strokeWeight(3);
      ellipse(0, 6, 100, 64);
      pop();
    }
  }
  if (shown >= 3 && sd.frames > 3 * each + 40) {
    mpContinueHint(lone ? 'Face them' : sd.kind === 'roundLimit' ? 'See who won' : 'To the tournament');
    if (inp.confirm || inp.click) mpAfterBonus();
  }
}

function mpAfterBonus() {
  const sd = mp.showdown;
  if (sd.kind === 'roundLimit') {
    mpAwardBonus();
    const ranked = mpStandings();
    mpFinishGame(ranked[0].index, 'score');
    return;
  }
  if (sd.kind === 'tournament') {
    mpAwardBonus();
    mpStartTournament(mp.players.map(p => p.index));
    return;
  }
  // Lone survivor: the reward if they earned any, and every other player's queen comes back to face them
  const surv = mp.players[sd.survivor];
  const queens = sd.bonus.filter(t => t && t.holder !== sd.survivor).map(t => t.holder);
  const ladybug = sd.bonus.some(t => t && t.holder === sd.survivor);
  if (ladybug) {
    for (const id of [36, 37, 38, 39, 40, 41, 42, 43, 56]) surv.upgrades[id] = UPGRADE_MAX_LEVELS[id];
  }
  for (const t of sd.bonus) if (t && t.holder === sd.survivor) surv.bonusPoints += MP_BONUS_ACHIEVEMENT_POINTS;
  if (queens.length === 0) {
    // All three were the survivor's own: no fight, just a victory
    mpFinishGame(surv.index, 'flawless');
    return;
  }
  mp.finalStand = { queens: queens, ladybug: ladybug };
  mp.pendingQueens = queens.map(o => ({ owner: o, target: surv.index }));
  mp.turn = surv.index;
  mpHandoff('combat', surv);
}

// The final stand's combat ended (called from mpOnCombatEnd's flow)
function mpFinishFinalStand(died) {
  const surv = mp.players[mp.turn];
  const standing = mp.finalStand.alive || [];
  mp.finalStand = null;
  if (!died) {
    mpFinishGame(surv.index, 'survivor');
    return;
  }
  // The queens that were still standing fight it out
  const entrants = [...new Set(standing)];
  // Every queen fell before the survivor did: the survivor outlasted them all
  if (entrants.length === 0) mpFinishGame(surv.index, 'survivor');
  else if (entrants.length === 1) mpFinishGame(entrants[0], 'queen');
  else mpStartTournament(entrants);
}

// ---------- The queen tournament ----------

// Pair up the seeds for one round of the bracket: duels, with a three-way instead of a bye
function mpBracketFights(seeds) {
  const n = seeds.length;
  if (n <= 1) return [];
  if (n === 2) return [[seeds[0], seeds[1]]];
  if (n === 3) return [[seeds[0], seeds[1], seeds[2]]];
  if (n === 4) return [[seeds[0], seeds[3]], [seeds[1], seeds[2]]];
  if (n === 5) return [[seeds[0], seeds[4]], [seeds[1], seeds[2], seeds[3]]];
  if (n === 6) return [[seeds[0], seeds[5]], [seeds[1], seeds[4]], [seeds[2], seeds[3]]];
  if (n === 7) return [[seeds[0], seeds[6]], [seeds[1], seeds[5]], [seeds[2], seeds[3], seeds[4]]];
  return [[seeds[0], seeds[7]], [seeds[1], seeds[6]], [seeds[2], seeds[5]], [seeds[3], seeds[4]]];
}

function mpSeedByScore(indices) {
  return indices.slice().sort((a, b) => mpTotalPoints(mp.players[b]) - mpTotalPoints(mp.players[a]) || a - b);
}

function mpStartTournament(entrants) {
  const sd = mp.showdown || (mp.showdown = { kind: 'tournament', frames: 0 });
  sd.step = 'bracket';
  sd.frames = 0;
  sd.rounds = [];
  sd.eliminated = []; // Player indices, first out first (ties together)
  sd.seeds = mpSeedByScore(entrants);
  sd.fights = mpBracketFights(sd.seeds);
  sd.fightIndex = 0;
  sd.winners = [];
  sd.rounds.push({ fights: sd.fights.map(f => ({ players: f, winner: undefined })) });
  if (sd.seeds.length === 1) {
    mpFinishGame(sd.seeds[0], 'queen');
    return;
  }
  // From the final stand the game is still on the combat phase: go to the bracket screen
  if (mp.phase !== 'showdown') mpSetPhase('showdown');
}

function mpDrawBracket(inp) {
  const sd = mp.showdown;
  const W = getMenuWidth();
  mpBackground([26, 14, 40]);
  mpTitle('Queen tournament', 46, 44);
  push();
  textAlign(CENTER, CENTER);
  textSize(16);
  fill(210);
  text('Seeded by score. Every queen has her upgrades and her player\'s ant design. Ant bullets hit enemy ants too.', W / 2, 88);
  pop();
  // Rounds so far, left to right
  const colW = Math.min(360, (W - 80) / Math.max(1, sd.rounds.length + 1));
  sd.rounds.forEach((round, r) => {
    const x = 60 + r * colW;
    round.fights.forEach((fight, k) => {
      const y = 140 + k * (fight.players.length * 30 + 34);
      push();
      rectMode(CORNER);
      fill(0, 0, 0, 120);
      noStroke();
      rect(x - 10, y - 8, colW - 30, fight.players.length * 30 + 16, 8);
      fight.players.forEach((pi, m) => {
        const p = mp.players[pi];
        const won = fight.winner !== undefined && fight.winner === pi;
        const lost = fight.winner !== undefined && fight.winner !== pi;
        mpColorChip(x + 10, y + 12 + m * 30, 16, p.color);
        textAlign(LEFT, CENTER);
        textSize(17);
        fill(lost ? 110 : won ? color(255, 215, 110) : 235);
        text(p.name + (won ? '  ♛' : ''), x + 28, y + 12 + m * 30);
      });
      if (fight.winner === null) {
        fill(255, 120, 120);
        textSize(13);
        textAlign(RIGHT, CENTER);
        text('draw: nobody advances', x + colW - 46, y + fight.players.length * 15 + 4);
      }
      pop();
    });
  });
  const cur = sd.rounds[sd.rounds.length - 1];
  const next = cur.fights[sd.fightIndex];
  if (next) {
    mpContinueHint(`Watch: ${next.players.map(i => mp.players[i].name).join(' vs ')}`);
    if (sd.frames > 20 && (inp.confirm || inp.click)) mpStartDuel(next.players);
  }
}

// After a fight: next fight, next bracket round, or the champion
function mpOnDuelOver(winner) {
  const sd = mp.showdown;
  const cur = sd.rounds[sd.rounds.length - 1];
  const fight = cur.fights[sd.fightIndex];
  fight.winner = winner;
  for (const pi of fight.players) if (pi !== winner) sd.eliminated.push(pi);
  if (winner !== null) sd.winners.push(winner);
  sd.fightIndex++;
  sd.step = 'bracket';
  sd.frames = 0;
  if (sd.fightIndex < cur.fights.length) return;
  let advancing = sd.winners;
  if (advancing.length === 0) {
    // Everyone drew: the same queens go again
    advancing = cur.fights.flatMap(f => f.players);
    sd.eliminated = sd.eliminated.filter(pi => !advancing.includes(pi));
  }
  if (advancing.length === 1) {
    mpFinishGame(advancing[0], 'queen');
    return;
  }
  // The format follows how many are left, even if a draw left an odd number
  const seeds = mpSeedByScore(advancing);
  sd.rounds.push({ fights: mpBracketFights(seeds).map(f => ({ players: f, winner: undefined })) });
  sd.fightIndex = 0;
  sd.winners = [];
}

// ---------- The end ----------

// how: 'survivor' (beat the queens), 'flawless' (earned all three), 'queen' (tournament), 'score' (round limit),
// 'last' (only one player was ever left)
function mpFinishGame(winner, how) {
  const sd = mp.showdown || {};
  mp.result = { winner: winner, how: how, tournament: sd.rounds ? sd : null };
  // Survival order: the winner's beetle first if it lived, then the rest by when they fell (last out first)
  const survival = mp.players.slice().sort((a, b) => (b.alive - a.alive) || ((b.deathOrder || 0) - (a.deathOrder || 0)));
  mp.result.survival = survival.map(p => p.index);
  // Leaderboards in order of how the game was won
  const boards = [];
  const ants = { key: 'ants', title: 'Best ants', rows: mp.players.slice().sort((a, b) => b.designDamage - a.designDamage).map(p => ({ p: p, v: `${Math.round(p.designDamage * 10) / 10} damage` })) };
  const score = { key: 'score', title: 'Overall score', rows: mpStandings().map(s => ({ p: mp.players[s.index], v: Math.round(s.total).toLocaleString() })) };
  const surv = { key: 'survival', title: 'Survival order', rows: survival.map(p => ({ p: p, v: p.alive ? 'still standing' : `out in round ${p.diedRound}` })) };
  if (how === 'queen') boards.push(ants);
  if (how === 'score') boards.push(score);
  if (how === 'survivor' || how === 'flawless' || how === 'last') boards.push(surv);
  for (const b of [surv, ants, score]) if (!boards.includes(b)) boards.push(b);
  if (mp.result.tournament) {
    const t = mp.result.tournament;
    const order = [winner].concat(t.eliminated.slice().reverse()).filter((v, k, arr) => arr.indexOf(v) === k);
    for (const p of mp.players) if (!order.includes(p.index)) order.push(p.index);
    boards.push({ key: 'tournament', title: 'Queen tournament', rows: order.map((pi, k) => ({ p: mp.players[pi], v: k === 0 ? 'champion' : `place ${k + 1}` })) });
  }
  mp.result.boards = boards;
  mp.result.shoutouts = mpDrawThreeTitles();
  mp.result.allTitles = mpEligibleTitles();
  mp.result.popups = mp.result.allTitles.filter(t => !mp.result.shoutouts.includes(t));
  mp.result.step = 'winner';
  mp.result.frames = 0;
  mp.result.showAll = false;
  mpSetPhase('gameOver');
  gamemusic.stop();
  if (!endmusic.isPlaying()) endmusic.play();
}

function mpDrawGameOver(inp) {
  const R = mp.result;
  R.frames++;
  const W = getMenuWidth(), H = getMenuHeight();
  const wp = mp.players[R.winner];
  if (R.showAll) {
    mpDrawAllTitles(inp);
    return;
  }
  if (R.step === 'winner') {
    mpBackground([wp.color[0] * 0.3, wp.color[1] * 0.3, wp.color[2] * 0.3]);
    const t = R.frames;
    // A victory burst (bigger for a flawless win)
    push();
    noStroke();
    for (let k = 0; k < (R.how === 'flawless' ? 40 : 20); k++) {
      const a = k / (R.how === 'flawless' ? 40 : 20) * Math.PI * 2 + t * 0.01;
      const r = 120 + (t * 3 % 400);
      fill(wp.color[0], wp.color[1], wp.color[2], 200 * (1 - (t * 3 % 400) / 400));
      ellipse(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r * 0.6, 14);
    }
    pop();
    mpDrawMenuBeetle(W / 2, H / 2 + 20, 180, -Math.PI / 2, wp.color);
    if (typeof drawQueenCrown === 'function') drawQueenCrown(W / 2, H / 2 - 70, 1.6, 255);
    mpTitle(`${wp.name} wins!`, 90, 60);
    push();
    textAlign(CENTER, CENTER);
    textSize(22);
    fill(255);
    const how = { survivor: 'The last beetle standing, and it beat the queens that came back for it.',
      flawless: 'The last beetle standing, and every bonus achievement was theirs. Flawless.',
      queen: 'Their queen won the tournament.', score: `The best score when the round limit hit.`,
      last: 'The last beetle standing.' }[R.how];
    text(how, W / 2, 150);
    pop();
    if (t > 60) {
      mpContinueHint('Shout-outs');
      if (inp.confirm || inp.click) { R.step = 'shout'; R.frames = 0; R.shoutIndex = 0; }
    }
    return;
  }
  if (R.step === 'shout') {
    // Three quick shout-outs, one at a time
    mpBackground([20, 16, 30]);
    const k = R.shoutIndex;
    const t = R.shoutouts[k];
    const age = R.frames;
    mpTitle(`Shout-out ${k + 1} of 3`, 60, 30);
    push();
    translate(W / 2, H / 2);
    scale(Math.min(1, 0.5 + age / 20));
    textAlign(CENTER, CENTER);
    if (t) {
      const p = mp.players[t.holder];
      fill(255, 215, 110);
      textSize(46);
      text(t.def.name, 0, -60);
      fill(200);
      textSize(18);
      text(t.def.desc, 0, -14);
      fill(p.color[0], p.color[1], p.color[2]);
      stroke(0);
      strokeWeight(5);
      textSize(56);
      text(p.name, 0, 50);
    } else {
      fill(120);
      textSize(30);
      text('...', 0, -20);
      textSize(18);
      text('(nobody earned this one outright)', 0, 20);
    }
    pop();
    if (age > 45 && (inp.confirm || inp.click || age > 240)) {
      R.shoutIndex++;
      R.frames = 0;
      if (R.shoutIndex >= 3) { R.step = 'boards'; R.frames = 0; }
    }
    return;
  }
  // Leaderboards, scrolling through slowly, with the other titles popping up around them
  mpBackground();
  const per = 360;
  const b = R.boards[Math.floor(R.frames / per) % R.boards.length];
  mpTitle(b.title, 46, 40);
  const rowH = Math.min(46, 360 / b.rows.length);
  b.rows.forEach((row, k) => {
    const y = 96 + k * (rowH + 6);
    const slide = constrain((R.frames % per - k * 6) / 20, 0, 1);
    push();
    translate((1 - slide) * -60, 0);
    rectMode(CORNER);
    noStroke();
    fill(0, 0, 0, 150 * slide);
    rect(330, y, 620, rowH, 8);
    fill(row.p.color[0], row.p.color[1], row.p.color[2], 255 * slide);
    rect(330, y, 12, rowH, 8, 0, 0, 8);
    fill(255, 255 * slide);
    textAlign(LEFT, CENTER);
    textSize(Math.min(22, rowH * 0.5));
    text(`${k + 1}.  ${row.p.name}`, 356, y + rowH / 2);
    textAlign(RIGHT, CENTER);
    fill(255, 215, 110, 255 * slide);
    text(row.v, 930, y + rowH / 2);
    pop();
  });
  // Other titles pop up one by one around the screen
  R.popupSpots = R.popupSpots || R.popups.map((t, k) => ({ x: k % 2 ? random(980, 1180) : random(100, 300), y: random(120, 560) }));
  const showing = Math.min(R.popups.length, Math.floor(R.frames / 150));
  for (let k = 0; k < showing; k++) {
    const t = R.popups[k];
    const p = mp.players[t.holder];
    const s = R.popupSpots[k];
    const age = R.frames - k * 150;
    push();
    translate(s.x, s.y);
    scale(Math.min(1, age / 12));
    rectMode(CENTER);
    fill(20, 20, 30, 220);
    stroke(p.color[0], p.color[1], p.color[2]);
    strokeWeight(2);
    rect(0, 0, 200, 58, 8);
    noStroke();
    textAlign(CENTER, CENTER);
    fill(255, 215, 110);
    textSize(13);
    text(t.def.name, 0, -12);
    fill(p.color[0], p.color[1], p.color[2]);
    textSize(16);
    text(p.name, 0, 12);
    pop();
  }
  const allBtn = { x: W / 2 - 330, y: H - 64, w: 300, h: 46 };
  const menuBtn = { x: W / 2 + 30, y: H - 64, w: 300, h: 46 };
  R.sel = R.sel || 0;
  if (inp.left || inp.right) R.sel = 1 - R.sel;
  if (mpMouseIn(allBtn) && mpMouseMoved()) R.sel = 0;
  if (mpMouseIn(menuBtn) && mpMouseMoved()) R.sel = 1;
  mpButton(allBtn, 'Who did what (all titles)', R.sel === 0, { color: [255, 215, 110], size: 18 });
  mpButton(menuBtn, 'Main menu', R.sel === 1, { color: [200, 200, 200], size: 18 });
  const pick = inp.click ? (mpMouseIn(allBtn) ? 0 : mpMouseIn(menuBtn) ? 1 : -1) : inp.confirm ? R.sel : -1;
  if (pick === 0) { R.showAll = true; R.allScroll = 0; }
  if (pick === 1) {
    mpQuit();
    returnToMainMenu();
    menuNavigationCooldown = 20;
  }
}

function mpDrawAllTitles(inp) {
  const R = mp.result;
  const W = getMenuWidth();
  mpBackground();
  mpTitle('Who did what', 40, 40);
  const defs = mpTitleDefs();
  const rowH = 24;
  if (inp.down) R.allScroll = Math.min(R.allScroll + 1, Math.max(0, defs.length - 22));
  if (inp.up) R.allScroll = Math.max(0, R.allScroll - 1);
  defs.slice(R.allScroll, R.allScroll + 22).forEach((def, k) => {
    const t = mpEvaluateTitle(def);
    const y = 82 + k * rowH;
    push();
    textAlign(LEFT, CENTER);
    textSize(15);
    fill(255, 215, 110);
    text(def.name, 120, y);
    textAlign(RIGHT, CENTER);
    if (t) {
      const p = mp.players[t.holder];
      fill(p.color[0], p.color[1], p.color[2]);
      text(p.name, W - 120, y);
    } else {
      fill(110);
      text('nobody (tied, or it never happened)', W - 120, y);
    }
    pop();
  });
  mpContinueHint('Back');
  if (inp.confirm || inp.click || inp.back) R.showAll = false;
}
