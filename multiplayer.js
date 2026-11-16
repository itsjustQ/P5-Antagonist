// ========== MULTIPLAYER ==========
// Local, turn-based, up to eight players on one device. Every player has a beetle and designs their own ants. A round
// is two phases: every living beetle takes a combat turn (in player order) against the ants the OTHER players designed,
// then every player (dead or alive) gets an upgrade turn. Points from the beetle (eating ants) and from the player's
// ants (100 per point of damage to someone else's beetle) go into one total, which sets how many upgrade levels the
// player has. A level buys a beetle upgrade, two make a gene token for the ants, and queen upgrades and queen spawns
// cost levels too. Last beetle standing wins; if the last beetles die in the same round, the queens fight it out.
//
// This file owns the multiplayer screens and turn flow. The combat itself is the normal game (sketch.js), set up with
// the turn player's beetle and the opposing ants: mpStartCombat() loads them and endGame() hands back via mpOnCombatEnd().

const MP_MAX_PLAYERS = 8;
const MP_COLORS = [
  { name: 'Red', rgb: [228, 52, 52] },
  { name: 'Blue', rgb: [62, 112, 255] },
  { name: 'Green', rgb: [58, 196, 82] },
  { name: 'Yellow', rgb: [246, 212, 48] },
  { name: 'Purple', rgb: [160, 82, 226] },
  { name: 'Pink', rgb: [255, 122, 196] },
  { name: 'Black', rgb: [24, 24, 28] },
  { name: 'White', rgb: [242, 242, 242] }
];
const MP_ANT_POINTS_PER_DAMAGE = 100;  // An ant earns this many points per point of damage it deals (final)
const MP_MAX_SLOTS = 16;
const MP_START_SLOTS = 5;     // Ant slots in round 1, whatever the player count
const MP_LEVELS_PER_TOKEN = 1;
const MP_LEVEL_COST_SCALE = 1 / 3; // Each upgrade level costs a third of the points it does in the normal game
const MP_QUEEN_COST_LEVELS = 3;
const MP_QUEEN_METER_FULL = 10;
const MP_NAME_MAX = 20;
const MP_ROUND_LIMITS = [10, 15, 20];  // There's always a limit: the best score wins if more than one beetle lasts that long
const MP_START_LEVELS_MAX = 20;          // Starting upgrade levels: 0 to this, set before the game
const MP_START_LEVELS_DEFAULT = 10;
const MP_BONUS_ACHIEVEMENT_POINTS = 10000;
// Opposing ants get their slots by damage rank: every design gets 1 ant, the rest split by these shares per place
const MP_RANK_SHARES = {
  1: [1],
  2: [0.62, 0.38],
  3: [0.47, 0.31, 0.22],
  4: [0.34, 0.25, 0.24, 0.17],
  5: [0.28, 0.26, 0.19, 0.17, 0.10],
  6: [0.29, 0.21, 0.19, 0.12, 0.10, 0.09],
  7: [0.32, 0.22, 0.21, 0.11, 0.10, 0.02, 0.02]
};
// Queen special upgrades: [levels, value at each level]
const MP_QUEEN_HEALTH = [4, 7, 10, 13, 16, 19, 22, 25];          // 4 + 3 per level, 7 levels
const MP_QUEEN_GUARD_SECONDS = [10, 8.33, 6.67, 5];              // Royal guards every this many seconds, 3 steps
const MP_QUEEN_GUARD_COUNT = [0, 1, 2, 3, 4, 5];                 // Guards each time (0 = none until bought)
const MP_QUEEN_FIRE_SECONDS = [15, 13, 11, 9, 7, 5, 3];          // One attack every this many seconds, 6 steps

let mp = null; // The multiplayer game, or null

function mpActive() {
  return mp !== null;
}

function mpInCombat() {
  return mp !== null && mp.phase === 'combat';
}

// ---------- Ant designs ----------
// A design is what a player sets for their ants. Stats with gene caps are stepped (every step up from where a new design
// starts costs a gene token); everything else is a slider, and only sliders mutate when the ants spawn. Abilities are picked
// directly (one per category, level 1 or 2), and size below full is bought with tokens.

// Stepped stats: the free steps, then the paid steps (each one is that stat's next gene cap)
const MP_STEPPED = {
  bulletSpeed:   { label: 'Bullet travel time', unit: 'f', free: [300, 275, 250], paid: [200, 150, 120, 90], fmt: v => Math.round(v) + ' frames', better: 'lower' },
  bulletCooldown:{ label: 'Cooldown', free: [200, 175, 150], paid: [120, 100, 90, 79], fmt: v => Math.round(v) + ' frames', better: 'lower' },
  antSpeed:      { label: 'Ant speed', free: [1, 1.5, 2], paid: [2.5, 3, 3.5], fmt: v => v.toFixed(1) },
  bulletSize:    { label: 'Bullet size', free: [1, 1.25, 1.5], paid: [2, 2.5, 3], fmt: v => v.toFixed(2) + 'x' },
  radiusMultiplier: { label: 'Blast / beam / stream width', free: [0.5, 1, 1.5], paid: [2, 2.5, 3], fmt: v => v.toFixed(1) + 'x' },
  residueMultiplier: { label: 'Residue / duration', free: [0.5, 1, 1.5], paid: [2, 2.5, 3], fmt: v => v.toFixed(1) + 'x' },
  bulletKnockbackMultiplier: { label: 'Knockback strength', free: [2], paid: [3, 4, 5], fmt: v => v.toFixed(0) + 'x' },
  bulletCamoFlashRate: { label: 'Camouflage flashes / sec', free: [3, 2, 1.5], paid: [1, 0.75, 0.5, 0.25], fmt: v => v.toFixed(2), better: 'lower' },
  bulletBurstCount: { label: 'Bullets per burst', free: [2, 2.5, 3], paid: [4, 5, 5.5], fmt: v => Math.floor(v) + '' },
  bulletBurstSpread: { label: 'Burst spread', free: [Math.PI / 3, 1.5, 2], paid: [2.5, 3, 3.14], fmt: v => Math.round(v * 180 / Math.PI) + '°' },
  bulletCooldownMultiplier: { label: 'Slow shot multiplier', free: [1, 2, 3], paid: [4, 5, 5.5], fmt: v => v.toFixed(1) + 'x' },
  bulletCurveStrength: { label: 'Curve strength', free: [0.015, 0.03, 0.05], paid: [0.075, 0.1], fmt: v => v.toFixed(3) },
  bulletAccelerateDelay: { label: 'Frames before speeding up', free: [200, 175, 150], paid: [100, 60, 30], fmt: v => Math.round(v) + ' frames', better: 'lower' }
};

// Sliders: range and how far each spawned ant can mutate from the design (the normal game's mutation sizes)
const MP_SLIDERS = {
  shotOffsetX: { label: 'Aim offset (left / right)', min: -500, max: 500, mut: 50, fmt: v => Math.round(v) + ' px' },
  shotOffsetY: { label: 'Aim offset (up / down)', min: -500, max: 500, mut: 50, fmt: v => Math.round(v) + ' px' },
  distanceFromAnchor: { label: 'Distance kept', min: 0.1, max: 1000, mut: 100, fmt: v => Math.round(v) + ' px' },
  anchorOffsetX: { label: 'Anchor offset (left / right)', min: -500, max: 500, mut: 50, fmt: v => Math.round(v) + ' px' },
  anchorOffsetY: { label: 'Anchor offset (up / down)', min: -500, max: 500, mut: 50, fmt: v => Math.round(v) + ' px' },
  standingPointX: { label: 'Spot (left / right)', min: 0, max: 1280, mut: 100, fmt: v => Math.round(v) + '' },
  standingPointY: { label: 'Spot (up / down)', min: 0, max: 652, mut: 100, fmt: v => Math.round(v) + '' },
  angleFromSpawn: { label: 'Spawn angle', min: 0, max: Math.PI * 2, mut: Math.PI / 3, fmt: v => Math.round(v * 180 / Math.PI) + '°' },
  explosionProximity: { label: 'Explosion trigger range', min: 0.1, max: 1000, mut: 100, fmt: v => Math.round(v) + ' px' },
  bulletExplodeAfter: { label: 'Fuse', min: 40, max: 800, mut: 50, fmt: v => Math.round(v) + ' frames' },
  alarmInnerRadius: { label: 'Alarm inner radius', min: 25, max: 100, mut: 10, fmt: v => Math.round(v) + ' px' },
  bulletBurstDelay: { label: 'Split delay', min: 10, max: 60, mut: 5, fmt: v => Math.round(v) + ' frames' },
  bunkerRange: { label: 'Bunker reach', min: 1, max: 70, mut: 5, fmt: v => Math.round(v) + ' px' },
  blinkDelay: { label: 'Blink delay', min: 10, max: 120, mut: 10, fmt: v => Math.round(v) + ' frames' },
  bulletArcDuration: { label: 'Arc time', min: 130, max: 600, mut: 50, fmt: v => Math.round(v) + ' frames' }
};

// Abilities by category: [stat, level 1 name, level 2 name]
const MP_ABILITIES = {
  fire: [['fireAlternating', 'Alternating Fire', 'Hit Reload'], ['fireRapid', 'Rapid Fire', 'Spray'], ['fireBurst', 'Burst Fire', 'Delayed Burst'], ['fireAlarm', 'Agitate', 'Avenge']],
  path: [['pathHighArc', 'High Arc', 'Split Arc'], ['pathAccelerate', 'Accelerate', 'Beam'], ['pathCurve', 'Curving', 'Heat-Seeking'], ['pathBlink', 'Blink', 'Portal']],
  special: [['specialExplosion', 'Timed Explosive', 'Proximity Explosive'], ['specialKnockback', 'Knockback', 'Vacuum'], ['specialRecoil', 'Recoil', 'Launch'], ['specialCamo', 'Camouflage', 'Ghost']],
  death: [['deathLandmine', 'Smear', 'Landmine'], ['deathRefire', 'Refire', 'Turret'], ['deathTerritory', 'Territory', 'Nest'], ['deathMound', 'Mound', 'Bunker']]
};
const MP_CATEGORY_NAMES = { fire: 'Fire', path: 'Path', special: 'Special', death: 'Death' };
const MP_MOVES = ['Follow the beetle', 'Follow other ants', 'Go to a spot', 'Stay at spawn'];
const MP_SIZES = [
  { key: 'third', label: 'One third', value: 1 / 3, tokens: 3 },
  { key: 'half', label: 'Half', value: 0.5, tokens: 2 },
  { key: 'full', label: 'Full', value: 1, tokens: 0 },
  { key: 'g125', label: '1.25x', value: 1.25, tokens: 1 },
  { key: 'g150', label: '1.5x', value: 1.5, tokens: 1 },
  { key: 'g200', label: 'Giant 2x', value: 2, tokens: 1 },
  { key: 'g250', label: 'Giant 2.5x', value: 2.5, tokens: 2 },
  { key: 'g300', label: 'Giant 3x', value: 3, tokens: 3 }
];

function mpDefaultDesign() {
  const d = {
    steps: {},          // Stepped stat -> step index (0 = the first free step)
    paidRounds: {},     // Stepped stat -> rounds each paid step was bought (for the refund lock)
    sliders: {},
    move: 0,            // MP_MOVES index
    keepDistance: false,
    size: 2,            // MP_SIZES index (2 = full)
    sizeRound: 0,       // Round the current size was bought (refund lock)
    abilities: {}       // Category -> { stat, level, since, l2Since }
  };
  for (const k in MP_STEPPED) d.steps[k] = Math.min(1, MP_STEPPED[k].free.length - 1);
  d.steps.bulletSpeed = 1;
  d.steps.bulletCooldown = 1;
  d.steps.antSpeed = 1;
  d.steps.bulletSize = 0;
  d.steps.bulletBurstCount = 0;
  d.steps.bulletCooldownMultiplier = 1;
  for (const k in MP_SLIDERS) {
    const s = MP_SLIDERS[k];
    d.sliders[k] = { shotOffsetX: 0, shotOffsetY: 0, distanceFromAnchor: 200, anchorOffsetX: 0, anchorOffsetY: 0,
      standingPointX: 640, standingPointY: 326, angleFromSpawn: Math.PI, explosionProximity: 200, bulletExplodeAfter: 100,
      alarmInnerRadius: 75, bulletBurstDelay: 40, bunkerRange: 35, blinkDelay: 60, bulletArcDuration: 300 }[k];
    if (d.sliders[k] === undefined) d.sliders[k] = (s.min + s.max) / 2;
  }
  return d;
}

function mpStepValues(stat) {
  const s = MP_STEPPED[stat];
  return s.free.concat(s.paid);
}

function mpStepValue(design, stat) {
  return mpStepValues(stat)[design.steps[stat]];
}

// Paid steps a stepped stat is on (each one is a gene cap token)
function mpPaidSteps(design, stat) {
  return Math.max(0, design.steps[stat] - mpFreeTop(stat));
}

// Every step up from where a new design starts is a gene cap (1 level each), so it's always clear what costs a level.
// Steps below the start are free.
let mpFreeTops = null;
function mpFreeTop(stat) {
  if (!mpFreeTops) mpFreeTops = mpDefaultDesign().steps;
  return mpFreeTops[stat];
}

function mpAbilityName(cat, ab) {
  if (!ab) return 'None';
  const row = MP_ABILITIES[cat].find(r => r[0] === ab.stat);
  return row ? row[ab.level === 2 ? 2 : 1] : 'None';
}

// Which stepped stats and sliders matter for this design (others are hidden in the editor and kept as they are)
function mpRelevantStats(d) {
  const ab = d.abilities;
  const has = (cat, stat, level) => ab[cat] && ab[cat].stat === stat && (level === undefined || ab[cat].level === level);
  const fire = ab.fire ? ab.fire.stat : null;
  const path = ab.path ? ab.path.stat : null;
  const special = ab.special ? ab.special.stat : null;
  const death = ab.death ? ab.death.stat : null;
  const stream = has('fire', 'fireRapid', 2);
  const beam = has('path', 'pathAccelerate', 2);
  const out = new Set(['bulletSpeed', 'bulletCooldown', 'antSpeed', 'bulletSize', 'shotOffsetX', 'shotOffsetY', 'angleFromSpawn']);
  if (d.keepDistance) ['distanceFromAnchor', 'anchorOffsetX', 'anchorOffsetY'].forEach(k => out.add(k));
  if (d.move === 2) ['standingPointX', 'standingPointY'].forEach(k => out.add(k));
  if (fire === 'fireBurst' || fire === 'fireRapid') { out.add('bulletBurstCount'); out.add('bulletBurstSpread'); }
  if (has('fire', 'fireBurst', 2)) out.add('bulletBurstDelay');
  if (fire === 'fireAlternating') out.add('bulletCooldownMultiplier');
  if (has('fire', 'fireAlarm', 1)) out.add('alarmInnerRadius');
  if (path === 'pathHighArc') out.add('bulletArcDuration');
  if (path === 'pathCurve') out.add('bulletCurveStrength');
  if (path === 'pathAccelerate') out.add('bulletAccelerateDelay');
  if (path === 'pathBlink') out.add('blinkDelay');
  if (special === 'specialExplosion') { out.add(ab.special.level === 2 ? 'explosionProximity' : 'bulletExplodeAfter'); }
  if (special === 'specialKnockback') out.add('bulletKnockbackMultiplier');
  if (has('special', 'specialCamo', 1)) out.add('bulletCamoFlashRate');
  if (death === 'deathMound') out.add('bunkerRange');
  if (special === 'specialExplosion' || path === 'pathHighArc' || stream || beam || death === 'deathLandmine' || death === 'deathTerritory') out.add('radiusMultiplier');
  if (special === 'specialExplosion' || path === 'pathHighArc' || stream || beam || death) out.add('residueMultiplier');
  return out;
}

// The stats object for applyStatsToAnt: the design, with every slider mutated by up to its mutation size.
// Returns { stats, deltas } (deltas: slider -> how far this ant's value is from the design's).
function mpBuildAntStats(design, mutate) {
  const s = {};
  const deltas = {};
  for (const k in MP_STEPPED) s[k] = mpStepValue(design, k);
  for (const k in MP_SLIDERS) {
    const def = MP_SLIDERS[k];
    let v = design.sliders[k];
    if (mutate) {
      const max = k === 'standingPointX' ? getGameplayWidth() : k === 'standingPointY' ? getGameplayHeight() : def.max;
      const nv = constrain(v + random(-def.mut, def.mut), def.min, max);
      deltas[k] = (nv - v) / (def.mut || 1);
      v = nv;
    }
    s[k] = v;
  }
  // Spots are in arena units
  s.standingPointX = s.standingPointX / 1280 * getGameplayWidth();
  s.standingPointY = constrain(s.standingPointY / 652 * getGameplayHeight(), scoreBarHeight, getGameplayHeight() - expBarHeight - expBarBuffer);
  s.followValue = design.move;
  s.autonomy = design.keepDistance ? 1 : 0;
  const size = MP_SIZES[design.size];
  s.antSize = size.value;
  // Abilities: the chosen stat wins its category (level 2 sits between its two caps), the rest stay at 0
  const investments = [];
  for (const cat in MP_ABILITIES) {
    for (const row of MP_ABILITIES[cat]) s[row[0]] = 0;
    s[cat + 'Potential'] = 0.3;
    const ab = design.abilities[cat];
    if (!ab) continue;
    s[cat + 'Potential'] = 0.9;
    s[ab.stat] = ab.level === 2 ? 1.5 : 0.9;
    investments.push({ target: ab.stat, type: 'trait', category: cat, lockedUntilRound: 0, percentage: 1, cost: ABILITY_TOKEN_COST });
    if (ab.level === 2) investments.push({ target: ab.stat, type: 'cap', tier: 0, cap: 1, inverse: false, lockedUntilRound: 0, percentage: 1 });
  }
  // Paid steps are gene caps, so the game's own limits line up with them
  for (const k in MP_STEPPED) {
    const tiers = moduleStatCapTiers[k];
    if (!tiers) continue;
    for (let t = 0; t < mpPaidSteps(design, k); t++) {
      investments.push({ target: k, type: 'cap', tier: t, cap: tiers.caps[t], inverse: !!tiers.inverse, lockedUntilRound: 0, percentage: 1 });
    }
  }
  if (size.value > 1.5) {
    const n = Math.round((size.value - 1.5) / 0.5);
    for (let t = 0; t < n; t++) investments.push({ target: 'antSize', type: 'cap', tier: t, cap: moduleStatCapTiers.antSize.caps[t], inverse: false, lockedUntilRound: 0, percentage: 1 });
  }
  if (size.key === 'half' || size.key === 'third') investments.push({ target: 'antSize', type: 'size', size: size.key, cost: size.tokens, lockedUntilRound: 0, percentage: 1 });
  s.geneTokenInvestments = investments;
  s.geneTokens = 0;
  // The speed and bullet limits that come with size
  s.antSpeed = Math.min(s.antSpeed, 4.5 - s.antSize);
  s.bulletSize = Math.min(s.bulletSize, Math.min(3, s.antSize + 1));
  return { stats: s, deltas: deltas };
}

// ---------- Players ----------

function mpCreatePlayer(index) {
  return {
    index: index,
    name: 'Player ' + (index + 1),
    color: MP_COLORS[index].rgb,
    colorName: MP_COLORS[index].name,
    alive: true,
    diedRound: null,
    deathOrder: null,
    killedBy: null,           // Player index whose ants (or queen) killed this beetle, or -1
    upgrades: new Array(UPGRADE_COUNT).fill(0),
    beetlePoints: 0,
    antPoints: 0,
    bonusPoints: 0,
    levelsSpent: 0,
    startLevels: 0,           // Free levels everyone starts with (the setup screen's setting)
    geneTokens: 0,
    rerolls: UPGRADE_REROLLS_PER_RUN,  // Beetle shop rerolls for the whole game, like a run
    design: mpDefaultDesign(),
    designDamage: 0,          // All the damage this player's ants have ever done (ranks the designs for slots)
    damageThisRound: 0,
    queen: { meter: 0, health: 0, guardFreq: 0, guardCount: 0, fireRate: 0 },
    samples: [],              // { deltas, damage } per spawned ant, for the slider suggestions
    stats: mpEmptyStats()
  };
}

function mpEmptyStats() {
  return {
    queensSpawned: 0, queensTargeted: 0, kills: 0, antsShot: 0, bestCombo: 0, throws: 0, dashes: 0, circles: 0,
    distance: 0, shockwaves: 0, bulletsFired: 0, shieldsBurned: 0, beetleAirFrames: 0, antAirFrames: 0, fastestBullet: 0,
    antDeaths: 0, slotsHeld: 0, biggestBullet: 0, smallestBullet: 0, suggestionsFollowed: 0, nonLethalHits: 0,
    movedOthers: 0, standingRunIns: 0, campEats: 0, temptingFate: 0, abilitySwitches: 0, movedByOthers: 0, backShots: 0,
    aphidsDrunk: 0, aphidsEaten: 0, killsAfterDeath: 0, upgradeFrames: 0, centerStillFrames: 0, structures: 0,
    neighborChain: 0, specialBullets: 0, smallBullets: 0, ignoredCooldowns: 0, highArcDamage: 0, calculatedHits: 0,
    homingBullets: 0, loyalDeaths: 0
  };
}

function mpTotalPoints(p) {
  return p.beetlePoints + p.antPoints + p.bonusPoints;
}

// Upgrade levels earned from a points total: the normal game's EXP curve, with every level costing
// MP_LEVEL_COST_SCALE of what it normally does (Increased Metabolism lowers each cost further).
// Returns { levels, into, need, required }: levels earned, points into the next one, its cost, and its cost before
// Increased Metabolism (what the in-combat EXP bar calls expRequired).
function mpLevelState(points, metabolism) {
  const step = getExpStepSize();
  let required = step;
  let left = points;
  let levels = 0;
  for (let n = 1; n < 2000; n++) {
    const cost = Math.round(required * (1 - 0.1 * metabolism));
    if (left < cost) return { levels: levels, into: left, need: cost, required: required };
    left -= cost;
    levels++;
    required += step * Math.ceil((n + 1) / 5);
  }
  return { levels: levels, into: 0, need: 1, required: required };
}

function mpLevelsFromPoints(points, metabolism) {
  return mpLevelState(points, metabolism).levels;
}

// Points into the next level and its cost (for the progress bar)
function mpLevelProgress(p) {
  return mpLevelState(mpTotalPoints(p), p.upgrades[21]);
}

// The in-combat EXP bar is the turn player's own: their levels and progress so far, then what they earn this turn
function mpLoadExpBar(p) {
  const st = mpLevelState(mpTotalPoints(p), p.upgrades[21]);
  expLevel = st.levels + 1; // The normal game counts from level 1
  expRequired = st.required;
  expProgress = st.into;
  upgradeAvailable = false;
  playerExpBarPrev = null;
  playerExpBarTimer = 0;
}

function mpLevelsAvailable(p) {
  return mpLevelsFromPoints(mpTotalPoints(p), p.upgrades[21]) + (p.startLevels || 0) - p.levelsSpent;
}

// EXP Boost raises everything the player earns, beetle and ants alike
function mpPointsMultiplier(p) {
  return 1 + 0.1 * p.upgrades[22];
}

function mpAlivePlayers() {
  return mp.players.filter(p => p.alive);
}

function mpTextColorOn(rgb) {
  return (rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114) > 150 ? [20, 20, 20] : [255, 255, 255];
}

// ---------- Starting and quitting ----------

function mpOpenSetup() {
  mp = {
    phase: 'setup',
    players: [],
    playerCount: 2,
    roundLimitIndex: 0,
    startLevels: MP_START_LEVELS_DEFAULT,
    setupSel: 0,
    round: 1,
    turn: -1,                 // Index of the player whose combat turn it is
    upgradeTurn: -1,
    deathsThisRound: [],
    deathCount: 0,
    pendingQueens: [],        // { owner, target } queens waiting to drop in on target's next turn
    standingsBefore: null,
    shake: 0,
    phaseFrames: 0,
    paused: false,
    pauseSel: 0,
    nav: { held: {}, repeat: {} },
    clickHeld: true,
    backHeld: true,
    lastCombat: null,
    log: []
  };
  startMenu = false;
  difficultyMenu = false;
  pendingGameMode = null;
  menuNavigationCooldown = 15;
}

function mpQuit() {
  mp = null;
  multiplayerMode = false;
  mpAntOwner = [];
}

function mpBeginGame() {
  mp.players = [];
  for (let k = 0; k < mp.playerCount; k++) mp.players.push(mpCreatePlayer(k));
  mp.roundLimit = MP_ROUND_LIMITS[mp.roundLimitIndex];
  for (const p of mp.players) p.startLevels = mp.startLevels;
  mp.round = 1;
  multiplayerMode = true;
  numPlayers = mp.playerCount;
  players = []; // The old multiplayer's list stays empty, so its code paths stay out of the way
  difficulty = 4;
  resetRunState();
  level = 1;
  totalScore = 0;
  discoveryPopupEntry = null; // Nothing left over from a single player run
  discoveryPopupTimer = 0;
  mp.nameIndex = 0;
  mpSetPhase('names');
  mp.nameText = '';
  mp.nameSel = 0;
  mp.oskOpen = false;
}

function mpSetPhase(phase) {
  mp.phase = phase;
  mp.phaseFrames = 0;
  mp.clickHeld = true;
  menuNavigationCooldown = Math.max(menuNavigationCooldown, 12);
}

// ---------- Rounds and turns ----------

function mpStartRound() {
  mp.deathsThisRound = [];
  for (const p of mp.players) p.damageThisRound = 0;
  mp.turn = -1;
  mpNextCombatTurn();
}

// The next living player after mp.turn this round, or -1 once everybody has played
function mpFindNextCombatant(after) {
  for (let k = after + 1; k < mp.players.length; k++) {
    const p = mp.players[k];
    if (p.alive && !mp.deathsThisRound.includes(k)) return k;
  }
  return -1;
}

function mpNextCombatTurn() {
  const next = mpFindNextCombatant(mp.turn);
  if (next < 0) {
    mpEndCombatPhase();
    return;
  }
  mp.turn = next;
  mpHandoff('combat', mp.players[next]);
}

function mpHandoff(kind, p) {
  mp.handoff = { kind: kind, player: p.index };
  mpSetPhase('handoff');
  if (gamemusic.isPlaying()) gamemusic.stop();
  if (!titlemusic.isPlaying()) titlemusic.play();
}

function mpLoadBeetle(p) {
  for (let id = 0; id < UPGRADE_COUNT; id++) setUpgradeLevel(id, p.upgrades[id]);
  upgradeRerolls = p.rerolls === undefined ? UPGRADE_REROLLS_PER_RUN : p.rerolls;
  refillBeetleForRunStart();
  resetShotMode();
  resetShockwaveVariant();
}

// Read the live upgrade levels back (the beetle shop buys through the game's own setters)
function mpSaveBeetle(p) {
  p.upgrades = getCurrentUpgradeLevels().slice(0, UPGRADE_COUNT);
  p.rerolls = upgradeRerolls;  // Orange aphids can add some during a fight
}

function mpStartCombat() {
  const p = mp.players[mp.turn];
  mpSetPhase('combat');
  mp.combatStart = { standings: mpStandings() };
  level = mp.round;
  clearRoundEffects();
  mpLoadBeetle(p);
  mpLoadExpBar(p);
  end = false;
  levelEnd = 0;
  score = 0;
  combo = 0;
  comboTime = 0;
  intermissionMenu = false;
  liveRankingsPrinted = false;
  queenHitCount = 0;
  queenWarningFrames = 0;
  lastBeetleDamager = 0;
  playerRotationValue = 0;
  centerPlayer();
  timeCount = level <= 3 ? 10 : level <= 7 ? 30 : 60;
  if (mp.finalStand) {
    // The final stand: just the queens that came back (each brings her player's ants)
    timeCount = 60;
    mpAntOwner = [];
    mpAntDeltas = [];
    mp.finalStand.queens.forEach((o, k) => {
      const i = k + 1;
      mpPrepareAntSlot(i);
      applyStatsToAnt(i, mpBuildAntStats(mp.players[o].design, true).stats);
      antSizeGene[i] = antSize[i];
      antAbilityLock[i] = {};
      mpAntOwner[i] = o;
      antDormant[i] = true;
      parkAnt(i);
    });
    enemyCount = mp.finalStand.queens.length;
    playerSpeed = movementSpeed / enemyCount;
  } else {
    mpSpawnOpposingAnts(p);
  }
  mpPrepareQueenArrivals(p);
  mpCombatStatsStart(p);
  start = true;
  startMenu = false;
  startRoundIntro();
  titlemusic.stop();
  if (!gamemusic.isPlaying()) gamemusic.play();
}

// The opposing designs for a turn: every other player (dead or alive), in turn order after the turn player
function mpOpposingOrder(p) {
  const n = mp.players.length;
  const out = [];
  for (let k = 1; k < n; k++) out.push(mp.players[(p.index + k) % n]);
  return out;
}

// Split slots between designs by damage rank: 1 each, then the extras by MP_RANK_SHARES. A higher rank never gets
// fewer than a lower one, first gets more than second where the slots allow, and two or more extras never all go to first.
function mpSplitSlots(D, S) {
  const counts = new Array(D).fill(1);
  const E = S - D;
  if (E <= 0 || D === 0) return counts;
  const shares = MP_RANK_SHARES[D];
  const raw = shares.map(s => s * E);
  const ext = raw.map(Math.floor);
  const left = E - ext.reduce((a, b) => a + b, 0);
  const order = raw.map((r, k) => ({ k: k, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f || a.k - b.k);
  for (let n = 0; n < left; n++) ext[order[n % D].k]++;
  ext.sort((a, b) => b - a);
  if (D >= 2 && E >= 2 && ext[1] === 0) { ext[0]--; ext[1]++; }
  if (D >= 3 && ext[0] === ext[1]) {
    for (let r = D - 1; r >= 2; r--) {
      if (ext[r] > 0 && ext[r] - 1 >= (ext[r + 1] || 0)) { ext[r]--; ext[0]++; break; }
    }
  }
  return counts.map((c, k) => c + ext[k]);
}

// How many slots each opposing design gets this turn: [{ player, slots }]
function mpAllocateSlots(p) {
  const order = mpOpposingOrder(p);
  // Round 1 starts with MP_START_SLOTS (when there are more opposing designs, they take turns in the rotation),
  // then one more each round
  const first = mp.startSlots || MP_START_SLOTS;
  const slots = Math.min(MP_MAX_SLOTS, first + mp.round - 1);
  if (order.length === 0) return [];
  if (slots <= order.length) {
    // Fewer slots than designs: the players right after the turn player in turn order, rotating with the turn
    return order.slice(0, slots).map(q => ({ player: q, slots: 1 }));
  }
  // Everybody fits: the extra slots go by each design's damage rank (not score, so dead players aren't left behind)
  const ranked = order.slice().sort((a, b) => b.designDamage - a.designDamage || a.index - b.index);
  const split = mpSplitSlots(ranked.length, slots);
  return ranked.map((q, k) => ({ player: q, slots: split[k] }));
}

let mpAntOwner = [];   // By ant index: the player who designed it
let mpAntDeltas = [];  // By ant index: its slider mutations (for the suggestions)

function mpSpawnOpposingAnts(p) {
  const alloc = mpAllocateSlots(p);
  mpAntOwner = [];
  mpAntDeltas = [];
  let i = 1;
  for (const a of alloc) {
    const size = MP_SIZES[a.player.design.size].value;
    // A big ant always gets in on one slot; with more room it takes its full size. Small ants share a slot.
    const n = Math.max(1, Math.floor(a.slots / size + 1e-6));
    a.player.stats.slotsHeld += a.slots;
    for (let k = 0; k < n; k++, i++) {
      const built = mpBuildAntStats(a.player.design, true);
      mpPrepareAntSlot(i);
      applyStatsToAnt(i, built.stats);
      antSizeGene[i] = antSize[i];
      antAbilityLock[i] = {};
      mpAntOwner[i] = a.player.index;
      mpAntDeltas[i] = built.deltas;
    }
  }
  enemyCount = Math.max(1, i - 1);
  if (i === 1) {
    // Nobody to fight (can't happen with 2+ players), but the game needs an ant
    mpPrepareAntSlot(1);
    applyStatsToAnt(1, mpBuildAntStats(mpDefaultDesign(), false).stats);
    mpAntOwner[1] = -1;
  }
  totalAntSlots = Math.min(MP_MAX_SLOTS, mp.round);
  playerSpeed = movementSpeed / enemyCount;
}

// Fresh per-ant state for a newly placed ant
function mpPrepareAntSlot(i) {
  antX[i] = random(0, getGameplayWidth());
  antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
  antPrevX[i] = antX[i];
  antPrevY[i] = antY[i];
  antPoints[i] = 0;
  antLives[i] = 1;
  antDormant[i] = false;
  antKnockedBack[i] = false;
  antKnockbackTimer[i] = 0;
  antStunned[i] = false;
  antStunTimer[i] = 0;
  antLastShotFrame[i] = 0;
  antAlternatingCooldownState[i] = 0;
  antRapidFireActive[i] = false;
  antAirHeight[i] = 0;
  antRecoilVelX[i] = 0;
  antRecoilVelY[i] = 0;
  antRecoilAirTimer[i] = 0;
  strikeX[i] = 0;
  strikeY[i] = 0;
  strikeTime1[i] = 0;
  drawStrike1[i] = 1;
  bulletShot[i] = 0;
  enemyBullets[i] = [];
  geneTokens[i] = 0;
  geneTokenLastRoundGained[i] = 0;
  antEvoParent[i] = undefined;
}

// Called by endGame() when the turn's beetle dies (died) or the round's timer runs out
function mpOnCombatEnd(died) {
  if (!mpInCombat()) return;
  const p = mp.players[mp.turn];
  // The beetle's points, then every ant's damage for its owner (10 points a point of damage)
  const beetleGain = Math.max(0, Math.round(score));
  p.beetlePoints += beetleGain;
  const antGains = {};
  for (let i = 1; i <= enemyCount; i++) {
    const o = mpAntOwner[i];
    if (o === undefined || o < 0) continue;
    const owner = mp.players[o];
    const dmg = antPoints[i] || 0;
    owner.designDamage += dmg;
    owner.damageThisRound += dmg;
    const gain = Math.round(dmg * MP_ANT_POINTS_PER_DAMAGE * mpPointsMultiplier(owner));
    owner.antPoints += gain;
    antGains[o] = (antGains[o] || 0) + gain;
    if (mpAntDeltas[i]) {
      owner.samples.push({ deltas: mpAntDeltas[i], damage: dmg, round: mp.round });
      if (owner.samples.length > 120) owner.samples.shift();
    }
  }
  const standingQueens = mpQueens.map(q => q.mpOwner).concat(mpArrivals.map(a => a.owner));
  mpOnQueensCombatEnd(antGains);
  let killer = null;
  if (died) {
    p.alive = false;
    p.diedRound = mp.round;
    p.deathOrder = ++mp.deathCount;
    mp.deathsThisRound.push(p.index);
    killer = mpGetKiller();
    p.killedBy = killer;
    if (killer !== null && killer >= 0) mpOnPlayerKilled(mp.players[killer], p);
  }
  mpCombatStatsEnd(p, died);
  mp.lastCombat = { player: p.index, died: died, killer: killer, beetleGain: beetleGain, antGains: antGains };

  // Back to the menus
  start = false;
  end = false;
  levelEnd = 0;
  gamePaused = false;
  clearRoundEffects();
  enemyCount = 0;
  mpAntOwner = [];
  stopRumble();
  gamemusic.stop();
  if (!titlemusic.isPlaying()) titlemusic.play();

  if (mp.finalStand) {
    mp.finalStand.alive = standingQueens;
    mpFinishFinalStand(died);
    return;
  }
  if (mpFindNextCombatant(mp.turn) >= 0) {
    mp.board = { before: mp.combatStart.standings, after: mpStandings() };
    mp.board.shakeAmount = mpBoardShakeAmount(mp.board.before, mp.board.after);  // Lands with the slam
    mp.shake = 0;
    mpSetPhase('turnBoard');
  } else {
    mpEndCombatPhase();
  }
}

// Who landed the killing blow: the ant's (or queen's) owner, or null if unknown
function mpGetKiller() {
  mpLastKillWasQueen = false;
  if (lastBeetleDamager >= 1 && mpAntOwner[lastBeetleDamager] !== undefined) return mpAntOwner[lastBeetleDamager];
  if ((lastBeetleDamager === -1 || lastBeetleDamager === -2) && mpLastQueenHitOwner !== null) {
    mpLastKillWasQueen = true;
    return mpLastQueenHitOwner;
  }
  return null;
}

// After every living beetle has played this round
function mpEndCombatPhase() {
  // Queen meters fill by a slightly random amount every round
  for (const p of mp.players) p.queen.meter = Math.min(MP_QUEEN_METER_FULL, p.queen.meter + 1 + Math.floor(Math.random() * 3));
  const alive = mpAlivePlayers();
  if (alive.length === 0) {
    // The last beetles died in the same round: the queens decide it
    mpStartShowdown('tournament');
    return;
  }
  if (alive.length === 1 && mp.players.length > 1) {
    mpStartShowdown('loneSurvivor', alive[0]);
    return;
  }
  if (mp.roundLimit > 0 && mp.round >= mp.roundLimit) {
    mpStartShowdown('roundLimit');
    return;
  }
  mp.board = { before: mp.combatStart ? mp.combatStart.standings : mpStandings(), after: mpStandings(), round: mp.round };
  mpSetPhase('roundBoard');
}

function mpStartUpgradePhase() {
  mp.upgradeTurn = 0;
  mpHandoff('upgrade', mp.players[0]);
}

function mpFinishUpgradeTurn() {
  const p = mp.players[mp.upgradeTurn];
  mpSaveBeetle(p);
  mp.upgradeTurn++;
  if (mp.upgradeTurn < mp.players.length) {
    mpHandoff('upgrade', mp.players[mp.upgradeTurn]);
  } else if (mp.preGame) {
    // The starting upgrades are done: round 1
    mp.preGame = false;
    mpStartRound();
  } else {
    mp.round++;
    mpStartRound();
  }
}

// After the names: a quick upgrade turn each to spend the starting levels, then round 1
function mpStartFirstRound() {
  if (mp.startLevels > 0) {
    mp.preGame = true;
    mpStartUpgradePhase();
  } else {
    mpStartRound();
  }
}

// Places by total points: [{ index, total }], best first
function mpStandings() {
  return mp.players.map(p => ({ index: p.index, total: mpTotalPoints(p), beetle: p.beetlePoints, ants: p.antPoints }))
    .sort((a, b) => b.total - a.total || a.index - b.index);
}

// ---------- In combat ----------

// A small ring around each ant in its designer's color
function mpDrawAntRing(i, fadeAmount) {
  const o = mp.players[mpAntOwner[i]];
  if (!o) return;
  const c = o.color;
  const s = (45 + 15 * antSize[i]) * 0.78;
  push();
  noFill();
  stroke(c[0], c[1], c[2], 210 * fadeAmount / 255);
  strokeWeight(2.5);
  ellipse(antX[i], antY[i] + 3, s, s * 0.62);
  pop();
}

function mpGetBeetleShadowColor() {
  const c = mp.players[mp.turn].color;
  return [c[0] * 0.35, c[1] * 0.35, c[2] * 0.35];
}

// Whose turn it is, top right
function mpDrawCombatHud() {
  if (!mpInCombat()) return;
  const p = mp.players[mp.turn];
  push();
  textAlign(RIGHT, TOP);
  textSize(24);
  stroke(0);
  strokeWeight(4);
  fill(p.color[0], p.color[1], p.color[2]);
  text(`${p.name}`, windowWidth - 18, 14);
  textSize(15);
  strokeWeight(3);
  fill(255);
  text(`Round ${mp.round}  ·  ${Math.round(score).toLocaleString()} points`, windowWidth - 18, 44);
  pop();
}

// The bigger the change in places, the harder the leaderboard shakes
function mpBoardShakeAmount(before, after) {
  let moved = 0;
  for (let k = 0; k < after.length; k++) {
    const was = before.findIndex(s => s.index === after[k].index);
    moved += Math.abs(was - k);
  }
  // A single swap of neighbours (or nothing) doesn't shake; bigger reshuffles shake harder
  return moved <= 2 ? 0 : Math.min(22, moved * 3);
}
