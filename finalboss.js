// ========== FINAL LEVEL: THE MAIN NEST ==========
// An 11th stop on the map shows up once difficulty 10 is beaten (and stays to be replayed). It plays out as:
//   1. Warm-up rounds: the 10 ants that ever did best against the player (saved on this device) each come back as a
//      group of 10 copies, worst first (#10 ... #1), for 60 seconds each. Each group is scored as a whole, the same
//      way ants are always scored (damage to the beetle / lives); ties go to more damage, then a coin toss.
//   2. The Queen of Queens: the 3 best warm-up groups become her army. She's a queen like any other (her own
//      attacks come from her ants' abilities), plus the arena's 8 tunnels fire stage attacks. Her ants keep
//      evolving every 30 seconds instead of between rounds, since there is no next round.
// Beating her ends the game: the invasive ants die out and order is restored.

// ---------- The all-time best ants ----------
const BEST_ANTS_KEY = 'bestAntsAllTime';
const BEST_ANTS_KEPT = 10;

function getBestAnts() {
  const saved = getItem(BEST_ANTS_KEY);
  return Array.isArray(saved) ? saved : [];
}

// Called when a round ends: any ant that beat one of the saved ten takes its place
function recordBestAnts() {
  if (multiplayerMode || isFinalLevel() || isTutorialRun() || devToolsUseCustomAnts) return;
  const list = getBestAnts();
  const before = JSON.stringify(list.map(e => e.score));
  for (let i = 1; i <= enemyCount; i++) {
    const score = getAntRatio(i);
    if (!(score > 0)) continue;
    const worst = list.length < BEST_ANTS_KEPT ? -Infinity : list[list.length - 1].score;
    if (score <= worst) continue;
    const stats = snapshotAntStats(i);
    const signature = JSON.stringify(stats);
    // Clones share genes; keep only the better showing of the same ant
    const same = list.findIndex(e => JSON.stringify(e.stats) === signature);
    if (same !== -1) {
      if (list[same].score >= score) continue;
      list.splice(same, 1);
    }
    list.push({ score: score, damage: antPoints[i], lives: antLives[i], difficulty: difficulty, round: level, faced: Date.now(), stats: stats });
    list.sort((a, b) => b.score - a.score || b.damage - a.damage);
    list.length = Math.min(list.length, BEST_ANTS_KEPT);
  }
  if (JSON.stringify(list.map(e => e.score)) !== before) storeItem(BEST_ANTS_KEY, list);
}

// ---------- Level state ----------
let finalLevel = null;   // { phase: 'warmup' | 'boss' | 'won', order, index, results, roster, reward }
let finalStage = null;   // The boss fight's tunnels, stage attacks and evolution (see setupBossRound)
let finalEnding = null;  // The ending, once she's beaten
let screenShake = { frames: 0, amp: 0 };

const FINAL_WARMUP_SECONDS = 60;
const FINAL_GROUP_SIZE = 10;
const QOQ_HEALTH = 50;
const QOQ_ANT_SIZE = 6;                // She's the size of a size 6 ant
const QOQ_DECISION_REACH = 0.25;       // Her brain can only move her / her orders this far off its plan (fraction of the arena)
const QOQ_STUCK_FRAMES = 240;          // Sitting still this long (outside a bunker) resets her strategy
const QOQ_SPAWN_FRAMES = 300;          // 10 ants every 5 seconds...
const QOQ_ANTS_PER_SPAWN = 10;
const QOQ_HIT_SPAWNS = 5;              // ...and 5 more every time she's hit
const QOQ_MAX_ALIVE = 50;
const QOQ_FAST_HEALTH = 25;            // At or under: 200% attack speed
const QOQ_STRONG_HEALTH = 15;          // At or under: 150% strength
const QOQ_EVOLVE_FRAMES = 1800;        // The ants evolve every 30 seconds
const STAGE_INTERVAL = 600;            // A stage attack every 10 seconds...
const STAGE_INTERVAL_FAST = 300;       // ...every 5 under 25 health
const STAGE_FIRST_DELAY = 300;         // 5 seconds out of step with her own attacks
const STAGE_RUMBLE_FRAMES = 40;
const TUNNEL_GAP = 60;                 // 1 second between tunnels...
const TUNNEL_GAP_FAST = 30;            // ...half a second under 25 health
const TUNNELS_PER_ATTACK = 4;
const QOQ_REWARDS = [30, 25, 20, 15, 10, 5];

function isFinalLevel() {
  return !!finalLevel;
}

function isFinalBoss() {
  return !!finalLevel && finalLevel.phase === 'boss' && !!finalStage;
}

// The rounds before her are named after the round their ant was first faced in
function getFinalRoundTitle() {
  if (!finalLevel) return null;
  if (finalLevel.phase === 'warmup') {
    const entry = finalLevel.order[finalLevel.index];
    return entry && entry.round ? `ROUND ${entry.round}` : `ROUND ${finalLevel.index + 1}`;
  }
  return 'QUEEN OF QUEENS';
}

// "Faced 11/22/26 5PM · Difficulty 7 · 8th hardest · 18 Damage / 5 Lives"
function getFinalRoundSubtitle() {
  if (!finalLevel || finalLevel.phase !== 'warmup') return null;
  const e = finalLevel.order[finalLevel.index];
  if (!e) return null;
  const parts = [];
  if (e.faced) parts.push('Faced ' + formatFacedDate(e.faced));
  if (e.difficulty) parts.push('Difficulty ' + e.difficulty);
  parts.push(`${ordinal(e.rank)} hardest`);
  if (e.damage !== undefined) parts.push(`${Math.round(e.damage)} Damage / ${e.lives} ${e.lives === 1 ? 'Life' : 'Lives'}`);
  return parts.join('  ·  ');
}

function formatFacedDate(ms) {
  const d = new Date(ms);
  const h = d.getHours();
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)} ${h % 12 || 12}${h < 12 ? 'AM' : 'PM'}`;
}

function ordinal(n) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return n + 'th';
  return n + (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
}

function getQueenOfQueensWins() {
  return getItem('queenOfQueensWins') || 0;
}

function getNextQueenOfQueensReward() {
  return QOQ_REWARDS[Math.min(getQueenOfQueensWins(), QOQ_REWARDS.length - 1)];
}

function leaveFinalLevel() {
  finalLevel = null;
  finalStage = null;
  finalEnding = null;
  screenShake = { frames: 0, amp: 0 };
}

function startFinalLevel() {
  resetRunState(); // Also leaves any earlier final level
  difficulty = 10;
  multiplayerMode = false;
  numPlayers = 1;
  applyPermanentUpgrades();

  let best = getBestAnts();
  if (best.length === 0) {
    // Nothing saved yet (only possible with the dev unlock): use whatever ant is set up now
    best = [{ score: 0, damage: 0, stats: snapshotAntStats(1) }];
  }
  // Worst of the ten first, the best last
  const order = best.map((e, k) => Object.assign({}, e, { rank: k + 1 })).reverse();
  finalLevel = { phase: 'warmup', order: order, index: 0, results: [], roster: null, reward: 0 };
  level = 1;
  setupWarmupRound();

  start = true;
  startMenu = false;
  difficultyMenu = false;
  pendingGameMode = null;
  titlemusic.stop();
  endmusic.stop();
  if (!gamemusic.isPlaying()) gamemusic.play();
  startRoundIntro();
}

// Spawn `count` copies of a stats object as ants 1..count, spread around the arena away from the beetle
function spawnFinalGroup(stats, count) {
  enemyCount = count;
  totalAntSlots = count;
  for (let i = 1; i <= count; i++) {
    applyStatsToAnt(i, stats);
    antPoints[i] = 0;
    antLives[i] = 1;
    antHitSpots[i] = [];
    enemyBullets[i] = [];
    const a = (i / count) * Math.PI * 2 + random(-0.2, 0.2);
    const r = random(220, 300);
    placeSpawnedAnt(i, getGameplayWidth() / 2 + Math.cos(a) * r * 1.6, getGameplayHeight() / 2 + Math.sin(a) * r * 0.8);
  }
  playerSpeed = movementSpeed / enemyCount;
}

function setupWarmupRound() {
  const entry = finalLevel.order[finalLevel.index];
  spawnFinalGroup(entry.stats, FINAL_GROUP_SIZE);
  timeCount = FINAL_WARMUP_SECONDS;
}

// nextRound() for the final level
function finalLevelNextRound() {
  clearRoundEffects();
  beamHealthFlashFrames = 0;
  beamShieldFlashFrames = 0;
  end = false;
  liveRankingsPrinted = false;
  intermissionMenu = false;
  intermissionMenuCooldown = 0;
  level++;
  levelEnd = 0;
  score = 0;
  health = getStartingHealth();
  playerRotationValue = 0;
  bulletShot[enemyIndex] = 0;
  centerPlayer();
  shield = shieldQuantity > 0 ? shieldQuantity : 0;
  shot = bulletQuantity > 0 ? bulletQuantity : 0;
  dashCoolDown = 0;
  endmusic.stop();
  if (!gamemusic.isPlaying()) gamemusic.play();

  finalLevel.index++;
  if (finalLevel.index < finalLevel.order.length) {
    setupWarmupRound();
  } else {
    setupBossRound();
  }
  startRoundIntro();
}

// When a round's timer runs out: score the warm-up group as a whole
function onFinalRoundEnded() {
  if (!finalLevel || finalLevel.phase !== 'warmup') return;
  let points = 0;
  let lives = 0;
  for (let i = 1; i <= enemyCount; i++) {
    points += antPoints[i] || 0;
    lives += antLives[i] || 0;
  }
  const entry = finalLevel.order[finalLevel.index];
  finalLevel.results.push({ entry: entry, score: lives > 0 ? points / lives : 0, damage: points, coin: Math.random() });
}

// The three best warm-up groups, best first
function getFinalRoster() {
  const ranked = finalLevel.results.slice().sort((a, b) => b.score - a.score || b.damage - a.damage || b.coin - a.coin);
  const roster = ranked.slice(0, 3).map(r => r.entry.stats);
  if (roster.length === 0) roster.push(finalLevel.order[finalLevel.order.length - 1].stats);
  while (roster.length < 3) roster.push(roster[0]);
  return roster;
}

// ---------- The Queen of Queens ----------

function getTunnel(index) {
  const W = getGameplayWidth();
  const H = getGameplayHeight();
  const side = index < 4 ? -1 : 1;
  const row = index % 4;
  return {
    index: index,
    side: side,
    row: row,
    x: side < 0 ? 16 : W - 16,
    y: H * (0.125 + 0.25 * row),
    inward: side < 0 ? 0 : Math.PI,
    sec: { x0: side < 0 ? 0 : W / 2, x1: side < 0 ? W / 2 : W, y0: H * row / 4, y1: H * (row + 1) / 4 }
  };
}

function inSection(sec, x, y) {
  return x >= sec.x0 && x < sec.x1 && y >= sec.y0 && y < sec.y1;
}

function setupBossRound() {
  finalLevel.phase = 'boss';
  finalLevel.roster = getFinalRoster();
  const W = getGameplayWidth();
  const H = getGameplayHeight();

  // Her three ants (the templates she spawns copies of), plus two copies of each out from the start
  enemyCount = 0;
  const templates = [];
  finalLevel.roster.forEach((stats, k) => {
    const i = ++enemyCount;
    applyStatsToAnt(i, stats);
    antPoints[i] = 0;
    antLives[i] = 1;
    antHitSpots[i] = [];
    enemyBullets[i] = [];
    // Her three best gather at the top: either side of her, and one just in front
    placeSpawnedAnt(i, W * [0.36, 0.5, 0.64][k], H * [0.2, 0.36, 0.2][k]);
    templates.push(i);
  });
  for (const t of templates) {
    for (let c = 0; c < 2; c++) {
      const i = ++enemyCount;
      cloneAntGenes(t, i);
      antPoints[i] = 0;
      antLives[i] = 1;
      antHitSpots[i] = [];
      enemyBullets[i] = [];
      const tunnel = getTunnel(Math.floor(random(8)));
      placeSpawnedAnt(i, tunnel.x + Math.cos(tunnel.inward) * 60, tunnel.y + random(-20, 20));
    }
  }
  playerSpeed = movementSpeed / enemyCount;
  timeCount = 999;

  startQueenFight();
  for (let i = 1; i <= enemyCount; i++) antQueenType[i] = i <= 3 ? i : templates[Math.floor((i - 4) / 2)];
  queen.types = templates.slice();
  queen.final = true;
  queen.title = 'QUEEN OF QUEENS';
  queen.maxHealth = QOQ_HEALTH;
  queen.health = QOQ_HEALTH;
  queen.baseSpawnFrames = QOQ_SPAWN_FRAMES;
  queen.spawnFrames = QOQ_SPAWN_FRAMES;
  queen.antsPerSpawn = QOQ_ANTS_PER_SPAWN;
  queen.hitSpawns = QOQ_HIT_SPAWNS;
  queen.maxAlive = QOQ_MAX_ALIVE;
  queen.spawnCharges = 0;
  queen.attackSpeed = 1;
  queen.strength = 1;
  queen.x = W / 2;
  queen.y = H * 0.18;
  queen.introFrames = 0; // Her entrance scene already introduced her
  updateQueenDecision();

  finalStage = {
    timer: STAGE_FIRST_DELAY,
    attack: null,
    shots: [],
    areas: [],
    pending: [],
    beams: [],
    evolveTimer: QOQ_EVOLVE_FRAMES,
    generation: 1,
    gen: {},              // Template ant index -> generation it belongs to
    portalCooldown: [],
    phaseShown: 0
  };
  for (const t of templates) finalStage.gen[t] = 1;
  sceneForcedId = 'queenOfQueens';
}

function getAntGeneration(i) {
  if (!finalStage) return 0;
  return finalStage.gen[antQueenType[i]] || 0;
}

// ---------- Evolution during the fight ----------
// Every 30 seconds the best ants of the current generation (scored the usual way) become the parents of a new
// generation. Older ants that are still alive keep fighting, but only the newest generation gets spawned or bred.
function evolveFinalAnts() {
  const gen = finalStage.generation;
  const candidates = [];
  for (let i = 1; i <= enemyCount; i++) {
    if (getAntGeneration(i) === gen) candidates.push(i);
  }
  candidates.sort((a, b) => getAntRatio(b) - getAntRatio(a) || Math.random() - 0.5);
  const parents = candidates.slice(0, 3);
  if (parents.length === 0) return;
  while (parents.length < 3) parents.push(parents[0]);

  const newTypes = [];
  for (const p of parents) {
    if (enemyCount >= QUEEN_MAX_ANTS) break;
    const n = ++enemyCount;
    cloneAntGenes(p, n);
    mutateAntGenes(n);
    antQueenType[n] = n;
    antPoints[n] = 0;
    antLives[n] = 1;
    antHitSpots[n] = [];
    enemyBullets[n] = [];
    parkAnt(n);
    antDormant[n] = true;
    finalStage.gen[n] = gen + 1;
    newTypes.push(n);
  }
  if (newTypes.length === 0) return;
  finalStage.generation = gen + 1;
  queen.types = newTypes;
  updateQueenDecision();
  queen.label = `GENERATION ${gen + 1}`;
  queen.labelFrames = 120;
  queen.adaptFlash = 60;
  queenEffects.push({ kind: 'ring', x: queen.x, y: queen.y, life: 0, frames: 40, maxR: 220, color: [120, 255, 120] });
}

// Nudge an ant's genes the way a new generation would
function mutateAntGenes(n) {
  const rate = 0.4;
  const traits = ['fireBurst', 'fireRapid', 'fireAlternating', 'fireAlarm', 'pathHighArc', 'pathCurve', 'pathAccelerate', 'pathBlink',
    'specialExplosion', 'specialKnockback', 'specialCamo', 'specialRecoil'];
  const s = snapshotAntStats(n);
  for (const key of traits) {
    s[key] = constrain((s[key] || 0) + random(-rate, rate), 0, getMaxAllowedValue(key, n));
  }
  for (const key of ['deathLandmine', 'deathRefire', 'deathTerritory', 'deathMound']) {
    s[key] = constrain((s[key] || 0) + random(-rate / 2, rate / 2), 0, getMaxAllowedValue(key, n));
  }
  for (const key of ['firePotential', 'pathPotential', 'specialPotential']) s[key] = constrain(s[key] + random(-rate, rate), 0, 1);
  s.deathPotential = constrain(s.deathPotential + random(-rate / 2, rate / 2), 0, 1);
  s.bulletSpeed = constrain(s.bulletSpeed + random(-50, 50), getMinAllowedValue('bulletSpeed', n), 300);
  s.bulletCooldown = constrain(Math.floor(s.bulletCooldown + random(-5, 5)), getMinAllowedValue('bulletCooldown', n), 200);
  s.antSpeed = constrain(s.antSpeed + random(-0.3, 0.3), 0.9, Math.min(3.5, 4.5 - s.antSize));
  s.followValue = constrain(s.followValue + random(-rate, rate), -0.5, 3.49);
  s.autonomy = constrain(s.autonomy + random(-rate, rate), -0.5, 1.5);
  applyStatsToAnt(n, s);
}

// ---------- Stage attacks ----------

// The abilities her current ants have (each is a kind of tunnel attack), plus the plain acid barrage, which is
// always an option so the tunnels never go a whole fight only shoving or buffing
function getStageAbilities() {
  const keys = ['none'];
  for (const t of queen.types) {
    for (const k of getAntQueenAbilities(t).map(a => QUEEN_ABILITIES[a].key)) {
      keys.push(k);
      if (QUEEN_HARMLESS_ABILITIES.has(k)) keys.push('none'); // Harmless ones make the barrage more likely
    }
  }
  return keys;
}

const STAGE_ATTACK_NAMES = {
  none: 'Acid Barrage', alternating: 'Alternating Fire', hitReload: 'Hit Reload', burst: 'Burst Fire', delayedBurst: 'Delayed Burst',
  rapid: 'Rapid Fire', stream: 'Stream Fire', alarm: 'Alarm', avenge: 'Avenge', curve: 'Clockwise Curve', homing: 'Homing Curve',
  highArc: 'High Arc', splitArc: 'Split Arc', accelerate: 'Accelerate', beam: 'Beam', blink: 'Blink', portal: 'Portal',
  timeExplosion: 'Time Explosion', proximityExplosion: 'Proximity Explosion', camo: 'Camouflage', ghost: 'Ghost', knockback: 'Knockback',
  vacuum: 'Vacuum', recoil: 'Recoil', launch: 'Launch', smear: 'Smear', landmine: 'Landmine Conversion', refire: 'Refire',
  turret: 'Turret', territory: 'Territory', nest: 'Nest', mound: 'Mound', bunker: 'Bunker'
};

function isQueenFast() {
  return queen && queen.health <= QOQ_FAST_HEALTH;
}

function beginStageAttack(forcedKey) {
  const keys = getStageAbilities();
  const key = forcedKey || keys[Math.floor(Math.random() * keys.length)];
  const all = [0, 1, 2, 3, 4, 5, 6, 7];
  for (let k = all.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [all[k], all[j]] = [all[j], all[k]];
  }
  finalStage.attack = {
    key: key,
    tunnels: all.slice(0, TUNNELS_PER_ATTACK),
    fired: 0,
    life: 0,
    gap: isQueenFast() ? TUNNEL_GAP_FAST : TUNNEL_GAP,
    hit: false,
    repeats: 0,
    doneAt: Infinity
  };
  // A rumble warns that the tunnels are about to go (no flash for every attack)
  shakeScreen(STAGE_RUMBLE_FRAMES, 5);
  if (!sLoseShield.isPlaying()) sLoseShield.play();
}

function shakeScreen(frames, amp) {
  screenShake.frames = Math.max(screenShake.frames, frames);
  screenShake.amp = Math.max(screenShake.frames > 0 ? screenShake.amp : 0, amp);
}

function getScreenShake() {
  if (screenShake.frames <= 0) return { x: 0, y: 0 };
  return { x: random(-screenShake.amp, screenShake.amp), y: random(-screenShake.amp, screenShake.amp) };
}

function stageLater(frames, fn) {
  finalStage.pending.push({ at: frameCount + frames, fn: fn });
}

// A stage bullet: o = { size, speed, angle, dmgSpeed, accel, split, curveTo, refire, onHit }
function stageShot(x, y, angle, size, speed, o = {}) {
  const scale = getQueenAttackScale();
  const shot = Object.assign({ x: x, y: y, sx: x, sy: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: size * scale,
    sizeScale: scale, life: 0, dmgSpeed: speed }, o);
  finalStage.shots.push(shot);
  playSpitSound();
  return shot;
}

function randomQueenType() {
  return queen.types[Math.floor(Math.random() * queen.types.length)];
}

function fireTunnel(attack, order) {
  const T = getTunnel(attack.tunnels[order]);
  const aim = angleToBeetle(T.x, T.y);
  const fast = isQueenFast();
  queenEffectsPushFlash(T);
  switch (attack.key) {
    case 'none':
      stageShot(T.x, T.y, aim, 3, 7);
      break;
    case 'alternating': {
      const n = order % 2 === 0 ? 3 : 1;
      for (let k = 0; k < n; k++) stageLater(k * 8, () => stageShot(T.x, T.y, angleToBeetle(T.x, T.y), 2, 7));
      break;
    }
    case 'hitReload':
      stageShot(T.x, T.y, aim, 1.5, 10, { onHit: () => { attack.hit = true; } });
      break;
    case 'burst':
      for (let k = 0; k < 6; k++) stageShot(T.x, T.y, aim + (k - 2.5) * 0.17, 1, 7);
      break;
    case 'delayedBurst':
      stageShot(T.x, T.y, aim, 3, 7, { burstAfter: getGameplayWidth() / 3 });
      break;
    case 'rapid':
      for (let k = 0; k < 10; k++) {
        stageLater(k * 4, () => stageShot(T.x, T.y, angleToBeetle(T.x, T.y) + Math.sin(k * 1.2) * 0.35, 0.5, 8));
      }
      break;
    case 'stream':
      finalStage.areas.push({ kind: 'stream', tunnel: T, sec: T.sec, life: 0, frames: 90 });
      break;
    case 'alarm':
      for (let k = 0; k < 3; k++) {
        const i = queenSpawnAnt(randomQueenType(), T.x + Math.cos(T.inward) * 50, T.y + (k - 1) * 30);
        if (i === -1) break;
      }
      break;
    case 'avenge':
      finalStage.areas.push({ kind: 'avenge', tunnel: T, sec: T.sec, life: 0, frames: 300 });
      break;
    case 'curve': {
      // Bends round, skips the next tunnel on its side and goes into the one after it
      const target = getTunnel(T.row <= 1 ? T.index + 2 : T.index - 2);
      stageShot(T.x, T.y, T.inward, 3, 6, { curveTo: target, curveT: 0 });
      break;
    }
    case 'homing': {
      for (const side of [-1, 1]) {
        queenProjectiles.push({ kind: 'ant', mode: 'homing', type: randomQueenType(), angle: aim + side * 0.25, speed: 8, life: 0,
          x: T.x, y: T.y + side * 16, tracker: null });
      }
      break;
    }
    case 'highArc':
    case 'splitArc': {
      const target = clampToPlayArea(playerX + random(-40, 40), playerY + random(-40, 40), 20);
      const split = attack.key === 'splitArc';
      const grow = getQueenAttackScale();
      const offsets = split ? [[0, 0], [-110, -50], [110, 50]] : [[0, 0]];
      for (const [ox, oy] of offsets) {
        const p = clampToPlayArea(target.x + ox, target.y + oy, 20);
        finalStage.shots.push({ arc: true, sx: T.x, sy: T.y, tx: p.x, ty: p.y, x: T.x, y: T.y, vx: 0, vy: 0, life: 0, duration: 80,
          height: 240, size: (split ? 1.5 : 3) * grow, radius: (split ? 50 : 140) * grow, damage: split ? 1.2 : 3.5 });
      }
      playSpitSound();
      break;
    }
    case 'accelerate':
      stageShot(T.x, T.y, aim, 2.5, 1, { accelTo: 18, accelOver: getGameplayWidth() * 2 / 3, dmgSpeed: 18 });
      break;
    case 'beam': {
      const warn = fast ? 30 : 60;
      finalStage.beams.push({ tunnel: T, life: 0, warn: warn, fire: 45, hit: false, width: 120 * getQueenAttackScale() });
      break;
    }
    case 'blink':
      if (order % 2 === 1) swapSections(getTunnel(attack.tunnels[order - 1]).sec, T.sec);
      break;
    case 'portal':
      if (order % 2 === 1) finalStage.areas.push({ kind: 'portal', a: getTunnel(attack.tunnels[order - 1]), b: T, life: 0, frames: 300 });
      break;
    case 'timeExplosion': {
      const spot = inSection(T.sec, playerX, playerY) ? { x: playerX, y: playerY } :
        { x: random(T.sec.x0 + 60, T.sec.x1 - 60), y: random(T.sec.y0 + 30, T.sec.y1 - 30) };
      queenEffects.push({ kind: 'timeBomb', life: 0, x: spot.x, y: spot.y, at: 150, radius: 140 * getQueenAttackScale(), owner: -1, tracker: null });
      break;
    }
    case 'proximityExplosion': {
      const grow = getQueenAttackScale();
      fireQueenAcid(T.x, T.y, aim, 2.5 * grow, 4.5, { prox: { trigger: 90 * grow, radius: 120 * grow, owner: -1 }, maxLife: 400, sizeScale: grow });
      break;
    }
    case 'camo':
    case 'ghost':
      finalStage.areas.push({ kind: attack.key, tunnel: T, sec: T.sec, life: 0, frames: 300 });
      break;
    case 'knockback': {
      const d = dist(playerX, playerY, T.x, T.y);
      knockPlayerFrom(T.x, T.y, 20 * Math.max(0.4, 1 - d / (getGameplayWidth() * 0.9)));
      if (inSection(T.sec, playerX, playerY)) queenHitPlayer(1.5);
      queenEffects.push({ kind: 'ring', x: T.x, y: T.y, life: 0, frames: 26, maxR: 500 * getQueenAttackScale(), color: [255, 255, 255] });
      break;
    }
    case 'vacuum':
      finalStage.areas.push({ kind: 'vacuum', tunnel: T, sec: T.sec, life: 0, frames: 150 });
      break;
    case 'recoil':
      for (let i = 1; i <= enemyCount; i++) {
        if (antDormant[i] || !inSection(T.sec, antX[i], antY[i]) || antInBunker[i]) continue;
        const a = Math.atan2(T.y - antY[i], T.x - antX[i]);
        antRecoilVelX[i] = Math.cos(a) * 10;
        antRecoilVelY[i] = Math.sin(a) * 10;
      }
      break;
    case 'launch':
      for (let i = 1; i <= enemyCount; i++) {
        if (antDormant[i] || !inSection(T.sec, antX[i], antY[i])) continue;
        antRecoilAirDuration[i] = 60;
        antRecoilAirTimer[i] = 60;
        antRecoilAirPeak[i] = 45;
      }
      break;
    case 'smear': {
      const owner = randomQueenType();
      for (let k = 0; k < 7; k++) {
        spawnEnemySmear(random(T.sec.x0 + 30, T.sec.x1 - 30), random(T.sec.y0 + 20, T.sec.y1 - 20), 2, owner);
      }
      break;
    }
    case 'landmine':
      convertSectionToMines(T.sec);
      break;
    case 'refire':
      stageShot(T.x, T.y, T.inward, 2, 8, { refireTo: getTunnel(T.side < 0 ? T.index + 4 : T.index - 4) });
      break;
    case 'turret':
      for (let k = 0; k < 3; k++) stageLater(k * 14, () => stageShot(T.x, T.y, angleToBeetle(T.x, T.y), 1.5, 8));
      break;
    case 'territory':
    case 'nest':
      finalStage.areas.push({ kind: attack.key, tunnel: T, sec: T.sec, life: 0, frames: 480 });
      break;
    case 'mound': {
      // A wall of mounds just past the beetle, cutting off the way away from the tunnel
      const away = Math.atan2(playerY - T.y, playerX - T.x);
      const cx = playerX + Math.cos(away) * 75;
      const cy = playerY + Math.sin(away) * 75;
      for (let k = -2; k <= 2; k++) {
        const gap = 42 * getQueenAttackScale();
        const p = clampToPlayArea(cx - Math.sin(away) * k * gap, cy + Math.cos(away) * k * gap, 10);
        enemyWalls.push(makeQueenWall(p.x, p.y, MOUND_RADIUS * getQueenAttackScale(), false, 2, 480));
      }
      break;
    }
    case 'bunker': {
      const cx = (T.sec.x0 + T.sec.x1) / 2;
      const cy = (T.sec.y0 + T.sec.y1) / 2;
      const wall = makeQueenWall(cx, cy, 44, true, 999, 300);
      enemyWalls.push(wall);
      for (let i = 1; i <= enemyCount; i++) {
        if (antDormant[i] || antInBunker[i] || !inSection(T.sec, antX[i], antY[i])) continue;
        enterBunker(i, wall);
      }
      break;
    }
  }
}

function queenEffectsPushFlash(T) {
  queenEffects.push({ kind: 'ring', x: T.x, y: T.y, life: 0, frames: 18, maxR: 70, color: [210, 140, 255] });
}

// Blink: the ants in one section and the ants in the other trade places
function swapSections(a, b) {
  const dx = b.x0 - a.x0;
  const dy = b.y0 - a.y0;
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i] || antInBunker[i]) continue;
    let moved = false;
    if (inSection(a, antX[i], antY[i])) {
      spawnBlinkFlash(antX[i], antY[i], 30, false);
      antX[i] += dx;
      antY[i] += dy;
      moved = true;
    } else if (inSection(b, antX[i], antY[i])) {
      spawnBlinkFlash(antX[i], antY[i], 30, false);
      antX[i] -= dx;
      antY[i] -= dy;
      moved = true;
    }
    if (moved) {
      antPrevX[i] = antX[i];
      antPrevY[i] = antY[i];
      spawnBlinkFlash(antX[i], antY[i], 30, false);
    }
  }
}

// Landmine Conversion: every bullet in the section turns into a landmine
function convertSectionToMines(sec) {
  for (let i = 1; i <= enemyCount; i++) {
    const list = enemyBullets[i] || [];
    for (let k = list.length - 1; k >= 0; k--) {
      const b = list[k];
      if (!inSection(sec, b.x, b.y)) continue;
      landMines.push(makeQueenMine(b.x, b.y, b.size || 1, i));
      list.splice(k, 1);
    }
  }
  const owner = randomQueenType();
  for (let k = finalStage.shots.length - 1; k >= 0; k--) {
    const s = finalStage.shots[k];
    if (s.arc || !inSection(sec, s.x, s.y)) continue;
    landMines.push(makeQueenMine(s.x, s.y, Math.min(3, s.size), owner));
    finalStage.shots.splice(k, 1);
  }
  for (let k = queenProjectiles.length - 1; k >= 0; k--) {
    const p = queenProjectiles[k];
    if (p.kind !== 'acid' || !inSection(sec, p.x, p.y)) continue;
    landMines.push(makeQueenMine(p.x, p.y, Math.min(3, p.size), owner));
    removeQueenProjectile(k);
  }
  const mid = { x: (sec.x0 + sec.x1) / 2, y: (sec.y0 + sec.y1) / 2 };
  queenEffects.push({ kind: 'ring', x: mid.x, y: mid.y, life: 0, frames: 24, maxR: 200, color: [255, 255, 0] });
}

// Avenge sections: a dead ant comes right back out of the tunnel
function onFinalAntDied(i) {
  if (!isFinalBoss()) return;
  for (const area of finalStage.areas) {
    if (area.kind !== 'avenge' || !inSection(area.sec, antX[i], antY[i])) continue;
    const type = finalStage.gen[antQueenType[i]] === finalStage.generation ? antQueenType[i] : randomQueenType();
    const T = area.tunnel;
    stageLater(20, () => {
      if (!queen) return;
      const k = queenSpawnAnt(type, T.x + Math.cos(T.inward) * 50, T.y + random(-25, 25));
      if (k !== -1) queenEffects.push({ kind: 'ring', x: antX[k], y: antY[k], life: 0, frames: 20, maxR: 45, color: [255, 80, 60] });
    });
    return;
  }
}

// Territory / nest sections for updateAntCooldownBoosts: null if the ant isn't in one
function getStageAreaBoost(i) {
  if (!finalStage || finalStage.areas.length === 0) return null;
  let found = null;
  for (const area of finalStage.areas) {
    if (area.kind !== 'territory' && area.kind !== 'nest') continue;
    if (!inSection(area.sec, antX[i], antY[i])) continue;
    if (!found) found = { boost: 1, shieldGain: 0, shieldCap: 1 };
    found.boost = 2; // Twice as fast, where a normal territory is 1.5
    if (area.kind === 'nest') {
      found.shieldGain = Math.max(found.shieldGain, 1 / 240);
      found.shieldCap = 2; // Double a normal nest's shield
    }
  }
  return found;
}

// ---------- Per frame ----------

// Called every gameplay frame from draw() (inside gameplay scaling)
function updateFinalStage() {
  if (screenShake.frames > 0) screenShake.frames--;
  if (!isFinalBoss()) return;
  drawStageTunnels();
  if (!queen || end) {
    drawStageAreas();
    return;
  }
  const S = finalStage;

  // Her two thresholds
  queen.attackSpeed = queen.health <= QOQ_FAST_HEALTH ? 2 : 1;
  queen.strength = queen.health <= QOQ_STRONG_HEALTH ? 1.5 : 1;
  const phase = queen.health <= QOQ_STRONG_HEALTH ? 2 : (queen.health <= QOQ_FAST_HEALTH ? 1 : 0);
  if (phase > S.phaseShown) {
    S.phaseShown = phase;
    queen.label = phase === 1 ? 'FRENZY: ATTACKS 2x FASTER' : 'FURY: ATTACKS 1.5x STRONGER';
    queen.labelFrames = 150;
    shakeScreen(30, 8);
  }

  // Safety net: if she's been pinned against the edge of the arena for 4 seconds, she gets a fresh strategy
  if (!queen.bunker && queen.vacuumFrames <= 0 && !isInPlayArea(queen.x, queen.y, 70)) {
    if (!S.stillFrom || dist(queen.x, queen.y, S.stillFrom.x, S.stillFrom.y) > 40) {
      S.stillFrom = { x: queen.x, y: queen.y, frame: frameCount };
    } else if (frameCount - S.stillFrom.frame > QOQ_STUCK_FRAMES) {
      queen.brain = createQueenBrain();
      queen.bestBrain = null;
      queen.bestFitness = -Infinity;
      updateQueenDecision();
      S.stillFrom = null;
    }
  } else {
    S.stillFrom = null;
  }

  for (let k = S.pending.length - 1; k >= 0; k--) {
    if (frameCount >= S.pending[k].at) {
      const p = S.pending[k];
      S.pending.splice(k, 1);
      p.fn();
    }
  }

  // Evolution
  if (--S.evolveTimer <= 0) {
    S.evolveTimer = QOQ_EVOLVE_FRAMES;
    evolveFinalAnts();
  }

  // Stage attacks
  if (!S.attack) {
    S.timer -= 1;
    const interval = isQueenFast() ? STAGE_INTERVAL_FAST : STAGE_INTERVAL;
    if (S.timer > interval) S.timer = interval;
    if (S.timer <= 0) {
      S.timer = interval;
      beginStageAttack();
    }
  } else {
    const A = S.attack;
    A.life++;
    while (A.fired < A.tunnels.length && A.life >= STAGE_RUMBLE_FRAMES + A.fired * A.gap) {
      fireTunnel(A, A.fired);
      A.fired++;
      if (A.fired === A.tunnels.length) A.doneAt = A.life + 70;
    }
    if (A.life >= A.doneAt) {
      // Hit Reload: if any of them hit, they all fire again in the same order
      if (A.key === 'hitReload' && A.hit && A.repeats < 3) {
        A.hit = false;
        A.repeats++;
        A.fired = 0;
        A.life = STAGE_RUMBLE_FRAMES;
        A.doneAt = Infinity;
      } else {
        S.attack = null;
      }
    }
  }

  updateStageShots();
  updateStageAreas();
  updateStageBeams();
}

function updateStageShots() {
  const S = finalStage;
  const W = getGameplayWidth();
  const hidden = tigerBeetleActive && tigerBeetleMoving;
  for (let k = S.shots.length - 1; k >= 0; k--) {
    const s = S.shots[k];
    s.life++;

    if (s.arc) {
      // High / split arc: lofted, then a shockwave where it lands
      const t = Math.min(1, s.life / s.duration);
      s.x = lerp(s.sx, s.tx, t);
      s.y = lerp(s.sy, s.ty, t);
      s.h = Math.sin(t * Math.PI) * s.height;
      if (!hidden) {
        push();
        noStroke();
        fill(0, 0, 0, 40 + 90 * t);
        ellipse(s.tx, s.ty, s.radius * 2 * t, s.radius * 0.9 * t);
        noFill();
        stroke(255, 60, 40, 100 + 120 * t);
        strokeWeight(2);
        ellipse(s.tx, s.ty, s.radius * 2, s.radius * 0.9);
        pop();
        drawQueenAcid({ x: s.x, y: s.y - s.h, vx: s.tx - s.sx, vy: s.ty - s.sy, size: s.size, life: s.life });
      }
      if (t >= 1) {
        spawnSmokeImpact(s.tx, s.ty, s.radius, 7);
        queenEffects.push({ kind: 'ring', x: s.tx, y: s.ty, life: 0, frames: 24, maxR: s.radius * 1.4, color: [220, 150, 255] });
        if (!isPlayerUntouchable() && dist(playerX, playerY, s.tx, s.ty) < s.radius) queenHitPlayer(s.damage);
        shakeScreen(10, s.radius > 100 ? 7 : 3);
        S.shots.splice(k, 1);
      }
      continue;
    }

    if (s.curveTo) {
      // Half an ellipse bulging out into the arena, ending in the target tunnel
      s.curveT += 0.012;
      const T0 = { x: s.sx, y: s.sy };
      const T1 = s.curveTo;
      const cy = (T0.y + T1.y) / 2;
      const ry = (T1.y - T0.y) / 2;
      const rx = W * 0.32;
      const ang = s.curveT * Math.PI;
      const inward = T1.side < 0 ? 1 : -1;
      const nx = T0.x + inward * Math.sin(ang) * rx;
      const ny = cy - Math.cos(ang) * ry;
      s.vx = nx - s.x;
      s.vy = ny - s.y;
      s.x = nx;
      s.y = ny;
      s.dmgSpeed = 7;
      if (s.curveT >= 1) {
        S.shots.splice(k, 1);
        continue;
      }
    } else {
      if (s.accelTo) {
        const traveled = dist(s.x, s.y, s.sx, s.sy);
        const speed = 1 + (s.accelTo - 1) * Math.min(1, traveled / s.accelOver);
        const a = Math.atan2(s.vy, s.vx);
        s.vx = Math.cos(a) * speed;
        s.vy = Math.sin(a) * speed;
        if (s.life % 8 === 0 && speed > 4) speedRings.push({ x: s.x, y: s.y, size: 8 * s.size, maxSize: 25 * s.size, alpha: 255, life: 0 });
      }
      s.x += s.vx;
      s.y += s.vy;
      if (s.burstAfter && dist(s.x, s.y, s.sx, s.sy) >= s.burstAfter) {
        // Delayed burst: a firework of 6 pieces
        for (let p = 0; p < 6; p++) stageShot(s.x, s.y, p / 6 * Math.PI * 2 + random(0.2), 1, 5);
        spawnSmokeImpact(s.x, s.y, 30, 3);
        S.shots.splice(k, 1);
        continue;
      }
      if (s.refireTo && Math.abs(s.x - s.refireTo.x) < 20) {
        // Refire: the opposite tunnel throws it straight back at the beetle
        const T = s.refireTo;
        speedRings.push({ x: T.x, y: T.y, size: 20, maxSize: 70, alpha: 255, life: 0 });
        stageLater(20, () => stageShot(T.x, T.y, angleToBeetle(T.x, T.y), s.size / (s.sizeScale || 1), 8));
        S.shots.splice(k, 1);
        continue;
      }
    }

    // Mounds stop it; the beetle's own walls take the hit
    const ownWall = getPlayerWallHitBy(s.x, s.y, s.vx, s.vy);
    if (ownWall || getEnemyMoundAt(s.x, s.y, 4)) {
      if (ownWall) damagePlayerWall(ownWall, s.size * getBulletSpeedTier(s.dmgSpeed).damageMultiplier);
      S.shots.splice(k, 1);
      continue;
    }
    if (!isPlayerUntouchable() && dist(s.x, s.y, playerX, playerY) < 22 + 6 * s.size) {
      if (!tryDashDeflect(s.x, s.y)) {
        queenHitPlayer(s.size / (s.sizeScale || 1) * getBulletSpeedTier(s.dmgSpeed).damageMultiplier, false, { vx: s.vx, vy: s.vy });
        if (s.onHit) s.onHit();
      }
      S.shots.splice(k, 1);
      continue;
    }
    if (s.x < -60 || s.x > W + 60 || s.y < -60 || s.y > getGameplayHeight() + 60) {
      S.shots.splice(k, 1);
      continue;
    }
    if (!hidden) drawQueenAcid(s);
  }
}

function updateStageAreas() {
  const S = finalStage;
  for (let k = S.areas.length - 1; k >= 0; k--) {
    const a = S.areas[k];
    a.life++;
    if (a.kind === 'stream') {
      // Acid floods the tunnel's whole section for 1.5 seconds
      if (a.life > 12 && !isPlayerUntouchable() && inSection(a.sec, playerX, playerY)) queenHitPlayer(2 / 60, true);
    } else if (a.kind === 'vacuum') {
      const T = a.tunnel;
      const d = dist(playerX, playerY, T.x, T.y);
      if (!isPlayerUntouchable() && d > 1) {
        const pull = Math.min(5.5, Math.max(0, d - 34)) * Math.min(1, a.life / 20);
        const p = clampToPlayArea(playerX + (T.x - playerX) / d * pull, playerY + (T.y - playerY) / d * pull, 10);
        playerX = p.x;
        playerY = p.y;
        if (d < 60) queenHitPlayer(3 / 60, true);
      }
    } else if (a.kind === 'portal') {
      runStagePortal(a);
    }
    if (a.life >= a.frames) S.areas.splice(k, 1);
  }
  drawStageAreas();
}

// Portal: anything (ants and bullets) that reaches one tunnel comes out of the other
function runStagePortal(area) {
  const S = finalStage;
  const mouths = [area.a, area.b];
  const reach = 50;
  const exitFrom = (T) => mouths[0] === T ? mouths[1] : mouths[0];
  for (const T of mouths) {
    const out = exitFrom(T);
    for (let i = 1; i <= enemyCount; i++) {
      if (antDormant[i] || antInBunker[i]) continue;
      if ((S.portalCooldown[i] || 0) > frameCount) continue;
      if (dist(antX[i], antY[i], T.x, T.y) > reach) continue;
      spawnBlinkFlash(antX[i], antY[i], 30, true);
      antX[i] = out.x + Math.cos(out.inward) * 55;
      antY[i] = out.y;
      antPrevX[i] = antX[i];
      antPrevY[i] = antY[i];
      S.portalCooldown[i] = frameCount + 90;
      spawnBlinkFlash(antX[i], antY[i], 30, true);
    }
    const sendBullet = (b, setVel) => {
      if ((b.portalCd || 0) > frameCount || dist(b.x, b.y, T.x, T.y) > reach) return;
      b.x = out.x + Math.cos(out.inward) * 30;
      b.y = out.y;
      b.portalCd = frameCount + 60;
      setVel(b);
      spawnBlinkFlash(b.x, b.y, 24, true);
    };
    for (let i = 1; i <= enemyCount; i++) {
      for (const b of enemyBullets[i] || []) {
        sendBullet(b, bb => {
          const sp = Math.sqrt(bb.speedX * bb.speedX + bb.speedY * bb.speedY) || 3;
          bb.speedX = Math.cos(out.inward) * sp;
          bb.speedY = Math.sin(out.inward) * sp;
        });
      }
    }
    for (const s of S.shots) {
      if (s.arc || s.curveTo) continue;
      sendBullet(s, bb => {
        const sp = Math.sqrt(bb.vx * bb.vx + bb.vy * bb.vy) || 3;
        bb.vx = Math.cos(out.inward) * sp;
        bb.vy = Math.sin(out.inward) * sp;
        bb.sx = bb.x;
        bb.sy = bb.y;
      });
    }
  }
}

function updateStageBeams() {
  const S = finalStage;
  const W = getGameplayWidth();
  const hidden = tigerBeetleActive && tigerBeetleMoving;
  for (let k = S.beams.length - 1; k >= 0; k--) {
    const b = S.beams[k];
    b.life++;
    const T = b.tunnel;
    const endX = T.side < 0 ? W : 0;
    if (b.life < b.warn) {
      // The tunnel lights up before it fires
      if (!hidden) {
        const t = b.life / b.warn;
        push();
        noStroke();
        fill(255, 230, 255, 80 + 150 * t * (0.6 + 0.4 * Math.sin(b.life * 0.8)));
        ellipse(T.x, T.y, 60 + 40 * t);
        stroke(255, 60, 60, 50 + 120 * t);
        strokeWeight(1 + 2 * t);
        line(T.x, T.y, endX, T.y);
        pop();
      }
      continue;
    }
    const life = b.life - b.warn;
    if (life === 0) {
      playSpitSound();
      shakeScreen(12, 5);
    }
    if (!b.hit && !isPlayerUntouchable() && Math.abs(playerY - T.y) < b.width / 2 + 20) {
      b.hit = true;
      if (shield > 0) beamShieldFlashFrames = BEAM_HIT_FLASH_FRAMES;
      else beamHealthFlashFrames = BEAM_HIT_FLASH_FRAMES;
      queenHitPlayer(2.5 * getBulletSpeedTier(BEAM_HIT_SPEED).damageMultiplier);
    }
    if (!hidden) {
      const fadeT = constrain((b.fire - life) / (b.fire / 3), 0, 1);
      const w = b.width * Math.min(1, life / 4) * (0.4 + 0.6 * fadeT);
      const c = QUEEN_BEAM_COLORS;
      push();
      strokeCap(SQUARE);
      stroke(c.glow[0], c.glow[1], c.glow[2], 90 * fadeT);
      strokeWeight(w * 1.5);
      line(T.x, T.y, endX, T.y);
      stroke(c.glow[0], c.glow[1], c.glow[2], 210 * fadeT);
      strokeWeight(w);
      line(T.x, T.y, endX, T.y);
      stroke(c.core[0], c.core[1], c.core[2], 255 * fadeT);
      strokeWeight(w * 0.35);
      line(T.x, T.y, endX, T.y);
      pop();
    }
    if (life >= b.fire) S.beams.splice(k, 1);
  }
}

// ---------- Drawing ----------

// The nest: a dark floor with countless tunnels along the sides (drawn under everything, in window space)
function drawFinalArenaBackground() {
  if (!isFinalLevel()) return;
  beginGameplayScaling();
  const W = getGameplayWidth();
  const H = getGameplayHeight();
  push();
  noStroke();
  // Little tunnels everywhere along the walls
  for (let k = 0; k < 46; k++) {
    const left = k % 2 === 0;
    const y = cineRand(k * 5 + 1) * H;
    const x = left ? cineRand(k * 9 + 2) * 60 : W - cineRand(k * 9 + 2) * 60;
    const r = 8 + cineRand(k * 13 + 3) * 14;
    fill(20, 8, 26, 200);
    ellipse(x, y, r * 2, r * 1.5);
    fill(8, 2, 10);
    ellipse(x, y, r * 1.2, r * 0.9);
  }
  // Darker toward the walls
  const ctx = drawingContext;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.65);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  pop();
  endGameplayScaling();
}

function drawStageTunnels() {
  const A = finalStage.attack;
  for (let k = 0; k < 8; k++) {
    const T = getTunnel(k);
    const order = A ? A.tunnels.indexOf(k) : -1;
    const armed = order !== -1 && order >= A.fired;
    push();
    noStroke();
    fill(70, 30, 85);
    ellipse(T.x, T.y, 70, 96);
    fill(10, 2, 14);
    ellipse(T.x, T.y, 46, 70);
    if (armed) {
      const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.4);
      fill(210, 140, 255, 60 + 120 * pulse);
      ellipse(T.x, T.y, 40, 62);
      noFill();
      stroke(230, 170, 255, 200);
      strokeWeight(3);
      ellipse(T.x, T.y, 80, 108);
    }
    pop();
  }
}

function drawStageAreas() {
  const S = finalStage;
  if (!S) return;
  for (const a of S.areas) {
    const t = Math.min(1, a.life / 12) * Math.min(1, (a.frames - a.life) / 15);
    const sec = a.sec;
    push();
    if (a.kind === 'stream') {
      // A torrent of acid filling the section from the tunnel
      const T = a.tunnel;
      const reach = (sec.x1 - sec.x0) * Math.min(1, a.life / 12);
      const x0 = T.side < 0 ? sec.x0 : sec.x1 - reach;
      noStroke();
      fill(0, 220, 0, 110 * t);
      rect(x0, sec.y0 + 6, reach, sec.y1 - sec.y0 - 12, 20);
      fill(150, 255, 120, 120 * t);
      for (let k = 0; k < 6; k++) {
        const yy = sec.y0 + (k + 0.5) * (sec.y1 - sec.y0) / 6 + Math.sin(frameCount * 0.3 + k) * 4;
        rect(x0, yy - 3, reach, 6, 3);
      }
    } else if (a.kind === 'territory' || a.kind === 'nest') {
      noStroke();
      fill(255, 185, 60, 40 * t);
      rect(sec.x0, sec.y0, sec.x1 - sec.x0, sec.y1 - sec.y0);
      noFill();
      stroke(255, 200, 80, 200 * t);
      strokeWeight(2);
      drawingContext.setLineDash([12, 10]);
      drawingContext.lineDashOffset = -frameCount * 0.6;
      rect(sec.x0 + 3, sec.y0 + 3, sec.x1 - sec.x0 - 6, sec.y1 - sec.y0 - 6, 8);
      drawingContext.setLineDash([]);
      if (a.kind === 'nest') {
        stroke(110, 190, 255, 160 * t * (0.6 + 0.4 * Math.sin(frameCount * 0.12)));
        strokeWeight(3);
        rect(sec.x0 + 14, sec.y0 + 14, sec.x1 - sec.x0 - 28, sec.y1 - sec.y0 - 28, 8);
      }
    } else if (a.kind === 'avenge') {
      noFill();
      stroke(255, 80, 60, 140 * t * (0.6 + 0.4 * Math.sin(frameCount * 0.2)));
      strokeWeight(2);
      rect(sec.x0 + 4, sec.y0 + 4, sec.x1 - sec.x0 - 8, sec.y1 - sec.y0 - 8, 8);
    } else if (a.kind === 'vacuum') {
      const T = a.tunnel;
      noFill();
      for (let r = 0; r < 4; r++) {
        const phase = ((frameCount * 3 + r * 40) % 160) / 160;
        stroke(255, 255, 255, 140 * t * phase);
        strokeWeight(2);
        ellipse(T.x, T.y, 500 * (1 - phase));
      }
    } else if (a.kind === 'portal') {
      for (const T of [a.a, a.b]) {
        noFill();
        stroke(255, 120, 255, 220 * t);
        strokeWeight(4);
        ellipse(T.x, T.y, 70 + 8 * Math.sin(frameCount * 0.2), 100);
        stroke(110, 235, 255, 180 * t);
        strokeWeight(2);
        ellipse(T.x, T.y, 50, 76 + 8 * Math.sin(frameCount * 0.25));
      }
      stroke(255, 120, 255, 50 * t);
      drawingContext.setLineDash([6, 10]);
      line(a.a.x, a.a.y, a.b.x, a.b.y);
      drawingContext.setLineDash([]);
    }
    pop();
  }
}

// Camouflage and ghost sections cover everything drawn in them (with a hole around the beetle)
function drawFinalStageOverlays() {
  if (!isFinalBoss() || end) return;
  if (tigerBeetleActive && tigerBeetleMoving) return;
  const ground = getGroundColor();
  const ctx = drawingContext;
  for (const a of finalStage.areas) {
    if (a.kind !== 'camo' && a.kind !== 'ghost') continue;
    const ghost = a.kind === 'ghost';
    const fade = Math.min(1, a.life / 20, (a.frames - a.life) / 20);
    const alpha = ghost ? fade : fade * (0.5 + 0.5 * Math.sin(frameCount * 0.12));
    const hole = ghost ? 150 : 45;
    const sec = a.sec;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sec.x0, sec.y0, sec.x1 - sec.x0, sec.y1 - sec.y0);
    ctx.moveTo(playerX + hole, playerY);
    ctx.arc(playerX, playerY, hole, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${ground[0]}, ${ground[1]}, ${ground[2]}, ${alpha})`;
    ctx.fill('evenodd');
    ctx.restore();
  }
}

// ---------- Winning ----------

function onQueenOfQueensDefeated() {
  const reward = getNextQueenOfQueensReward();
  storeItem('queenOfQueensWins', getQueenOfQueensWins() + 1);
  storeItem('queensAvailable', getQueensAvailable() + reward);
  finalLevel.phase = 'won';
  finalLevel.reward = reward;
  finalStage = null;
  // Without her, every ant on the field dies out
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i]) continue;
    spawnSmokeImpact(antX[i], antY[i], 25, 3);
    parkAnt(i);
    antDormant[i] = true;
    enemyBullets[i] = [];
  }
}

function isFinalEndingDue() {
  return !!finalLevel && finalLevel.phase === 'won' && !finalEnding;
}

function startFinalEnding() {
  finalEnding = { t: 0, reward: finalLevel.reward };
  gamemusic.stop();
  if (!titlemusic.isPlaying()) titlemusic.play();
}

const FINAL_ENDING_LINES = [
  'The Queen of Queens has fallen.',
  'Without her, the invasive ants die out.',
  'The forest finds its balance again.',
  'Order is restored.'
];

function drawFinalEnding() {
  const E = finalEnding;
  E.t++;
  beginMenuScaling();
  const w = getMenuWidth();
  const h = getMenuHeight();
  // The ground slowly goes from the nest's purple back to the forest's orange
  const f = constrain(E.t / 360, 0, 1);
  const c = lerpRgb(GROUND_NEST, GROUND_ORANGE, sceneEase('inOut', f));
  push();
  angleMode(DEGREES);
  noStroke();
  fill(c[0], c[1], c[2]);
  rect(0, 0, w, h);
  // Leaves drift back in
  for (let k = 0; k < 24; k++) {
    const a = constrain((E.t - 60 - k * 8) / 60, 0, 1);
    if (a <= 0) continue;
    push();
    translate(cineRand(k + 50) * w, cineRand(k + 90) * h);
    rotate(cineRand(k + 120) * 360);
    fill(150 + cineRand(k) * 40, 80 + cineRand(k + 1) * 30, 35, 200 * a);
    ellipse(0, 0, 40, 16);
    pop();
  }
  // The beetle, finally at rest
  push();
  imageMode(CENTER);
  translate(w / 2, h * 0.36);
  rotate(-90 + Math.sin(E.t * 0.03) * 4);
  image(beetle, 0, 0, 150, 150);
  pop();

  textAlign(CENTER, CENTER);
  stroke(0);
  strokeWeight(5);
  strokeJoin(ROUND);
  FINAL_ENDING_LINES.forEach((line, k) => {
    const a = constrain((E.t - 40 - k * 90) / 30, 0, 1);
    fill(255, 255 * a);
    textSize(k === FINAL_ENDING_LINES.length - 1 ? 40 : 28);
    text(line, w / 2, h * 0.58 + k * 40);
  });
  const rewardA = constrain((E.t - 420) / 30, 0, 1);
  if (rewardA > 0) {
    fill(255, 210, 120, 255 * rewardA);
    textSize(24);
    text(`+${E.reward} queens to spend  ·  Queen of Queens defeated ${getQueenOfQueensWins()} time${getQueenOfQueensWins() === 1 ? '' : 's'}`, w / 2, h * 0.85);
    noStroke();
    fill(255, 120 + 80 * Math.sin(frameCount * 0.08));
    textSize(18);
    text('Press Enter to return to the main menu', w / 2, h * 0.92);
  }
  pop();
  endMenuScaling();

  if (E.t > 60 && (isConfirmPressed() || (E.t > 420 && mouseIsPressed))) {
    leaveFinalLevel();
    returnToMainMenu();
    menuNavigationCooldown = 20;
  }
}

// ---------- The map's panel for the nest ----------

function drawFinalLevelPanel(x, y, w, h) {
  const best = getBestAnts();
  const wins = getQueenOfQueensWins();
  if (wins === 0) {
    drawUnknownNestPanel(x, y, w, h);
    return;
  }
  push();
  rectMode(CORNER);
  fill(25, 12, 32);
  stroke(200, 130, 255);
  strokeWeight(2);
  rect(x, y, w, h, 12);
  noStroke();
  textAlign(LEFT, BASELINE);
  const left = x + 30;
  const headerY = y + 34;
  fill(220, 160, 255);
  textSize(22);
  text('??? - The Main Nest', left, headerY);
  fill(205);
  textSize(17);
  const rounds = Math.max(1, best.length);
  const lines = [
    `${rounds} round${rounds === 1 ? '' : 's'} against the ants that did best against you, back for more`,
    'The best 3 groups become the army of the Queen of Queens',
    'Her tunnels attack with her ants\' abilities, and her ants evolve as you fight',
    'Single player only'
  ];
  lines.forEach((l, k) => text('• ' + l, left, headerY + 32 + k * 24));
  const divider = x + w * 0.68;
  stroke(80);
  line(divider, y + 18, divider, y + h - 18);
  noStroke();
  const right = divider + 26;
  fill(220, 160, 255);
  textSize(22);
  text('The Queen of Queens', right, headerY);
  fill(150);
  textSize(16);
  text('Defeated', right, headerY + 40);
  text('Next reward', right + 130, headerY + 40);
  text('Best ant score', right, headerY + 110);
  fill(255);
  textSize(30);
  text(wins, right, headerY + 76);
  text(`${getNextQueenOfQueensReward()} queens`, right + 130, headerY + 76);
  text(best.length ? best[0].score.toFixed(2) : '—', right, headerY + 146);
  pop();
}

// Before she's ever been beaten: the stop is a mystery
function drawUnknownNestPanel(x, y, w, h) {
  push();
  rectMode(CORNER);
  fill(18, 8, 24);
  stroke(140, 90, 180);
  strokeWeight(2);
  rect(x, y, w, h, 12);
  noStroke();
  textAlign(CENTER, CENTER);
  fill(200, 150, 240, 200 + 55 * Math.sin(frameCount * 0.05));
  textSize(26);
  textStyle(BOLD);
  text('???', x + w / 2, y + h * 0.3);
  textStyle(NORMAL);
  fill(170);
  textSize(18);
  text('Something waits at the heart of ant territory.', x + w / 2, y + h * 0.55);
  fill(120);
  textSize(15);
  text('Single player only', x + w / 2, y + h * 0.78);
  pop();
}

// ---------- Her entrance ----------
ROUND_SCENES.push({
  id: 'queenOfQueens',
  build: S => {
    const b = S.beetle;
    const top = { x: queen.x, y: queen.y };

    // The beetle comes up from the bottom into the nest
    b.x = S.cx;
    b.y = S.H + 100;
    b.look = 'move';
    b.move(0, 120, S.cx, S.cy, 'out');
    b.face(120, -Math.PI / 2);

    // The whole room shakes, dirt raining down from above
    S.shake(130, 80, 7);
    for (let k = 0; k < 40; k++) {
      S.at(130 + k * 2, () => S.addFx({ kind: 'particle', x: random(S.W), y: random(-10, 30), vx: random(-0.3, 0.3), vy: random(1, 3),
        g: 0.12, life: random(30, 60), size: random(3, 7), color: [90, 50, 70] }));
    }
    b.emote(135, '!?', 50);

    // The three ants that did best gather at the top of the screen
    const best = S.roster.filter(a => a.antIndex <= 3);
    best.forEach((a, k) => {
      a.featured = true;
      const T = getTunnel(k % 2 === 0 ? k / 2 * 4 : 4);
      a.visible = false;
      a.x = T.x;
      a.y = T.y;
      a.look = 'move';
      const t0 = 165 + k * 12;
      a.show(t0).move(t0, 55, a.home.x, a.home.y, 'out').face(t0 + 55, b);
      a.emote(t0 + 58, '!', 40);
    });

    // Out of the shadows, the massive Queen of Queens
    S.at(240, () => S.addFx({ kind: 'shadowPool', x: top.x, y: top.y, r: 140, life: 230 }));
    const q = S.actor('queen', top.x, top.y, { look: b });
    q.angle = Math.PI / 2;
    q.visible = false;
    q.alpha = 0;
    q.scale = 2.2;
    q.shade = 1;
    q.show(265).fade(265, 35, 1);
    for (let k = 0; k <= 60; k++) q.at(275 + k, () => { q.shade = 1 - k / 60; });
    S.shake(275, 40, 11);
    b.at(270, () => { b.look = q; });
    S.at(320, () => S.addFx({ kind: 'title', text: 'THE QUEEN OF QUEENS', life: 170 }));
    b.emote(330, 'sweat', 70);
    q.emote(345, 'alert', 50);

    // She settles down to fighting size, and the rest of her army pours out of the tunnels
    for (let k = 0; k <= 30; k++) q.at(420 + k, () => { q.scale = lerp(2.2, 1, sceneEase('inOut', k / 30)); });
    S.crowd().forEach((a, k) => {
      const T = getTunnel(k % 8);
      a.visible = false;
      a.x = T.x;
      a.y = T.y;
      a.look = 'move';
      a.show(430 + k * 3).move(430 + k * 3, 45, a.home.x, a.home.y, 'out').face(475 + k * 3, b);
    });
    b.emote(470, 'glare', 60);
    S.extend(520);
  }
});
