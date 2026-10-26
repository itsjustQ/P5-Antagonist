let playerX, playerY;
let playerRotationValue = 0;
let bg;
let tx;
let ty;
let start = false;
let startMenu = false;
let difficultyMenu = false;
let difficultySelection = 5; // Stop picked on the difficulty map (1-10, 11 = the nest)
let difficulty = 5; // 1-10: 1-3=easy, 4-5=medium, 6-7=hard, 8-10=insane
// Opening cinematic: plays on first launch only, then the splash screen takes over
let openingCinematic = false;
let cinematicFrame = 0;
let cinematicTimer = 0; // frames spent on the current still
let cinematicFlash = 0; // white flash when cutting to the splash screen
let pendingGameMode = null; // stores whether we're starting single or multiplayer
let preGameUpgradeMenu = false; // For difficulty 8-10
let antdex = false;
let antdexReturnState = 'menu';
let antdexOpenCooldown = 0;
let antdexInputBlocked = false; // A tutorial card is over the Antdex (or Esc is still held from it)
let intermissionMenu = false;
let intermissionMenuCooldown = 0;
let gameOverMenu = false;
let gameOverMenuCooldown = 0;
let startMenuSelection = 0;
let gameOverMenuSelection = 0;
let intermissionMenuSelection = 0;
let menuNavigationCooldown = 0;

function getTokensPerFiveRounds() {
  return difficulty; // Difficulty level = tokens gained every 5 rounds
}

function getInitialTokensForDifficulty() {
  return difficulty; // Difficulty level = starting tokens
}

function getDifficultyTier() {
  if (difficulty <= 3) return 'easy';
  if (difficulty <= 5) return 'medium';
  if (difficulty <= 7) return 'hard';
  return 'insane';
}

// Tier label/color for a 1-10 difficulty value (used by the difficulty menu)
function getDifficultyTierInfo(value) {
  if (value <= 3) return { name: 'Easy', color: [100, 255, 100] };
  if (value <= 5) return { name: 'Medium', color: [255, 255, 100] };
  if (value <= 7) return { name: 'Hard', color: [255, 150, 100] };
  return { name: 'Insane', color: [255, 80, 80] };
}

// Per-difficulty records (single player): best score and highest round reached
function getDifficultyRecord(value) {
  let bestScore = getItem('highScore_difficulty' + value);
  let bestRound = getItem('highestRound_difficulty' + value);
  return { score: bestScore == null ? 0 : bestScore, round: bestRound == null ? 0 : bestRound };
}

function updateDifficultyRecord(runScore, roundReached) {
  if (multiplayerMode || isFinalLevel() || isTutorialRun()) return;
  let record = getDifficultyRecord(difficulty);
  if (runScore > record.score) storeItem('highScore_difficulty' + difficulty, runScore);
  if (roundReached > record.round) storeItem('highestRound_difficulty' + difficulty, roundReached);
}

function getDifficultyCompletedRound(value) {
  let completed = getItem('completedRound_difficulty' + value);
  if (completed == null) completed = 0;
  // Reaching round N means round N-1 was completed (covers runs saved before this was tracked)
  return max(completed, getDifficultyRecord(value).round - 1);
}

function updateDifficultyCompletedRound(roundCompleted) {
  if (multiplayerMode || isFinalLevel() || isTutorialRun()) return;
  if (roundCompleted > getDifficultyCompletedRound(difficulty)) {
    storeItem('completedRound_difficulty' + difficulty, roundCompleted);
  }
}

// Difficulty unlocks: moving on from a difficulty takes a total number of queens defeated (lifetime), some of
// which have to be from that difficulty itself
function isDifficultyUnlocked(value) {
  if (value <= 1 || devToolsUnlockAllDifficulties) return true;
  return getTotalQueensCollected() >= getQueensRequiredToAdvance(value - 1) &&
    getQueensCollectedOnDifficulty(value - 1) >= getQueensRequiredOnDifficulty(value - 1);
}

function openDifficultyMenu() {
  difficultyMenu = true;
  // Keep the last pick if it's still allowed, otherwise jump to the highest unlocked level
  if (!isDifficultyUnlocked(difficultySelection)) {
    difficultySelection = 1;
    while (difficultySelection < 10 && isDifficultyUnlocked(difficultySelection + 1)) difficultySelection++;
  }
}

// Small padlock centered at (x, y), roughly `s` pixels tall
function drawLockIcon(x, y, s, alpha) {
  push();
    rectMode(CENTER);
    noFill();
    stroke(200, alpha);
    strokeWeight(s * 0.12);
    arc(x, y - s * 0.12, s * 0.5, s * 0.6, PI, TWO_PI);
    line(x - s * 0.25, y - s * 0.12, x - s * 0.25, y + s * 0.05);
    line(x + s * 0.25, y - s * 0.12, x + s * 0.25, y + s * 0.05);
    noStroke();
    fill(200, alpha);
    rect(x, y + s * 0.2, s * 0.75, s * 0.5, s * 0.08);
  pop();
}


// Stops on the difficulty map (see map.js)
function getDifficultyButtonRect(value) {
  return getMapStopRect(value);
}

function applyHardModeRandomInitialAbility(antIndex) {
  // Hard mode gets one extra initial token that is immediately spent on a random trait ability.
  if (geneTokens[antIndex] <= 0) {
    debugLog(`Hard mode: Ant ${antIndex} had no extra token to spend`);
    return;
  }

  const randomTraits = [
    { target: 'specialExplosion', category: 'special', potential: 'specialPotential' },
    { target: 'specialKnockback', category: 'special', potential: 'specialPotential' },
    { target: 'specialCamo', category: 'special', potential: 'specialPotential' },
    { target: 'specialRecoil', category: 'special', potential: 'specialPotential' },
    { target: 'fireBurst', category: 'fire', potential: 'firePotential' },
    { target: 'fireRapid', category: 'fire', potential: 'firePotential' },
    { target: 'fireAlternating', category: 'fire', potential: 'firePotential' },
    { target: 'fireAlarm', category: 'fire', potential: 'firePotential' },
    { target: 'deathLandmine', category: 'death', potential: 'deathPotential' },
    { target: 'deathRefire', category: 'death', potential: 'deathPotential' },
    { target: 'deathTerritory', category: 'death', potential: 'deathPotential' },
    { target: 'deathMound', category: 'death', potential: 'deathPotential' },
    { target: 'pathHighArc', category: 'path', potential: 'pathPotential' },
    { target: 'pathCurve', category: 'path', potential: 'pathPotential' },
    { target: 'pathAccelerate', category: 'path', potential: 'pathPotential' },
    { target: 'pathBlink', category: 'path', potential: 'pathPotential' }
  ];

  const trait = random(randomTraits);

  // Spend the dedicated 6th token.
  geneTokens[antIndex]--;

  // Ensure the category can express abilities.
  eval(trait.potential + '[' + antIndex + '] = max(' + trait.potential + '[' + antIndex + '], 0.6)');
  
  // Nudge the selected trait to win its category for expression.
  // For tiered (threshold-gated) stats, cap at 0.9 to prevent unlocking tier 2 without cap investment
  // For bulletAccelerateDelay (inverse stat), set to 150 (tier 1, better than default 200)
  let initialValue = 0.9;
  if (THRESHOLD_GATED_STATS.includes(trait.target)) {
    initialValue = 0.9; // Start with tier 1 (stays <1 for timed explosions, curved bullets, accelerating bullets, smears, alternating fire, or camouflage)
  } else if (trait.target === 'bulletAccelerateDelay') {
    initialValue = 150; // Start with tier 1 (150 frames, better than default 200)
  }
  
  if (trait.target === 'bulletAccelerateDelay') {
    eval(trait.target + '[' + antIndex + '] = min(' + trait.target + '[' + antIndex + '], ' + initialValue + ')');
  } else {
    eval(trait.target + '[' + antIndex + '] = max(' + trait.target + '[' + antIndex + '], ' + initialValue + ')');
  }

  geneTokenInvestments[antIndex].push({
    target: trait.target,
    type: 'trait',
    category: trait.category,
    lockedUntilRound: 3,
    percentage: 1
  });

  debugLog(`Hard mode: Ant ${antIndex} 6th token spent on ${trait.target}`);
}

// Developer tools variables
let devTools = false;
let devToolsReturnState = 'menu';
let devToolsKeyCooldown = 0;
let devToolsSelectedUpgrade = 0;
let devToolsNavigationCooldown = 0;
let devToolsScrollOffset = 0; // scroll offset for upgrade list
let devToolsTab = 'single'; // 'single', 'multi', or 'ants'
let devToolsPlayerTab = 0; // which player in multiplayer mode (0-5)
let devToolsAntTab = 0; // which ant in ants mode (0=1st, 1=2nd, 2=3rd)
let devToolsTabSwitchCooldown = 0;
let devToolsAntStatIndex = 0; // which stat is selected in ants tab
let devToolsAntScrollOffset = 0; // scroll position for ant stats
let devToolsUseCustomAnts = false; // whether to use custom ant stats in nextRound()
let devToolsUnlockAllDifficulties = false; // bypass the queens-defeated difficulty unlock requirements

// Custom ant genetic stats for dev tools (3 ants: 1st, 2nd, 3rd place)
let customAntStats = [
  // 1st place ant (index 0)
  {
    bulletSpeed: 260,
    bulletCooldown: 160,
    antSpeed: 1.95,
    shotOffsetX: 0,
    shotOffsetY: 0,
    standingPointX: 640,
    standingPointY: 326,
    followValue: 0,
    autonomy: 0,
    distanceFromAnchor: 200,
    anchorOffsetX: 0,
    anchorOffsetY: 0,
    // Special category (mutation-based)
    specialExplosion: 0.2,
    specialKnockback: 0.2,
    specialCamo: 0.2,
    specialRecoil: 0.2,
specialPotential: 0.3,
    bulletKnockbackMultiplier: 2,
    bulletCamoFlashRate: 2.5,
// Fire category (mutation-based)
    fireBurst: 0.1,
    fireRapid: 0.1,
    fireAlternating: 0.1,
    fireAlarm: 0.1,
    alarmInnerRadius: 75,
    firePotential: 0.3,
    bulletBurstCount: 2,
    bulletBurstSpread: 1.5,
    bulletBurstDelay: 40,
    bulletCooldownMultiplier: 2,
    // Death category (mutation-based)
    deathLandmine: 0.3,
    deathRefire: 0.2,
    deathTerritory: 0.2,
    deathMound: 0.2,
    bunkerRange: 35,
    deathPotential: 0.3,
    // Path category (mutation-based)
    pathHighArc: 0.1,
    pathCurve: 0.1,
    pathAccelerate: 0.1,
    pathBlink: 0.1,
    blinkDelay: 60,
    bulletAccelerateDelay: 200,
    pathPotential: 0.3,
    bulletArcDuration: 200,
    bulletCurveStrength: 0.015,
    explosionProximity: 200,
    angleFromSpawn: Math.PI,
    bulletSize: 1,
    radiusMultiplier: 1,
    residueMultiplier: 1,
    bulletExplodeAfter: 200,
    antSize: 1,
    // Gene Token System
    geneTokens: 2,
    geneTokenInvestments: [],
    geneTokenLastRoundGained: 0
  },
  // 2nd place ant (index 1)
  {
    bulletSpeed: 260,
    bulletCooldown: 160,
    antSpeed: 1.95,
    shotOffsetX: 0,
    shotOffsetY: 0,
    standingPointX: 640,
    standingPointY: 326,
    followValue: 0,
    autonomy: 0,
    distanceFromAnchor: 200,
    anchorOffsetX: 0,
    anchorOffsetY: 0,
    // Special category (mutation-based)
    specialExplosion: 0.2,
    specialKnockback: 0.2,
    specialCamo: 0.2,
    specialRecoil: 0.2,
specialPotential: 0.3,
    bulletKnockbackMultiplier: 2,
    bulletCamoFlashRate: 2.5,
// Fire category (mutation-based)
    fireBurst: 0.1,
    fireRapid: 0.1,
    fireAlternating: 0.1,
    fireAlarm: 0.1,
    alarmInnerRadius: 75,
    firePotential: 0.3,
    bulletBurstCount: 2,
    bulletBurstSpread: 1.5,
    bulletBurstDelay: 40,
    bulletCooldownMultiplier: 2,
    // Death category (mutation-based)
    deathLandmine: 0.3,
    deathRefire: 0.2,
    deathTerritory: 0.2,
    deathMound: 0.2,
    bunkerRange: 35,
    deathPotential: 0.3,
    // Path category (mutation-based)
    pathHighArc: 0.1,
    pathCurve: 0.1,
    pathAccelerate: 0.1,
    pathBlink: 0.1,
    blinkDelay: 60,
    bulletAccelerateDelay: 200,
    pathPotential: 0.3,
    bulletArcDuration: 200,
    bulletCurveStrength: 0.015,
    explosionProximity: 200,
    angleFromSpawn: Math.PI,
    bulletSize: 1,
    radiusMultiplier: 1,
    residueMultiplier: 1,
    bulletExplodeAfter: 200,
    antSize: 1,
    // Gene Token System
    geneTokens: 2,
    geneTokenInvestments: [],
    geneTokenLastRoundGained: 0
  },
  // 3rd place ant (index 2)
  {
    bulletSpeed: 260,
    bulletCooldown: 160,
    antSpeed: 1.95,
    shotOffsetX: 0,
    shotOffsetY: 0,
    standingPointX: 640,
    standingPointY: 326,
    followValue: 0,
    autonomy: 0,
    distanceFromAnchor: 200,
    anchorOffsetX: 0,
    anchorOffsetY: 0,
    // Special category (mutation-based)
    specialExplosion: 0.2,
    specialKnockback: 0.2,
    specialCamo: 0.2,
    specialRecoil: 0.2,
specialPotential: 0.3,
    bulletKnockbackMultiplier: 2,
    bulletCamoFlashRate: 2.5,
// Fire category (mutation-based)
    fireBurst: 0.1,
    fireRapid: 0.1,
    fireAlternating: 0.1,
    fireAlarm: 0.1,
    alarmInnerRadius: 75,
    firePotential: 0.3,
    bulletBurstCount: 2,
    bulletBurstSpread: 1.5,
    bulletBurstDelay: 40,
    bulletCooldownMultiplier: 2,
    // Death category (mutation-based)
    deathLandmine: 0.3,
    deathRefire: 0.2,
    deathTerritory: 0.2,
    deathMound: 0.2,
    bunkerRange: 35,
    deathPotential: 0.3,
    // Path category (mutation-based)
    pathHighArc: 0.1,
    pathCurve: 0.1,
    pathAccelerate: 0.1,
    pathBlink: 0.1,
    blinkDelay: 60,
    bulletAccelerateDelay: 200,
    pathPotential: 0.3,
    bulletArcDuration: 200,
    bulletCurveStrength: 0.015,
    explosionProximity: 200,
    angleFromSpawn: Math.PI,
    bulletSize: 1,
    radiusMultiplier: 1,
    residueMultiplier: 1,
    bulletExplodeAfter: 200,
    antSize: 1,
    // Gene Token System
    geneTokens: 2,
    geneTokenInvestments: [],
    geneTokenLastRoundGained: 0
  }
];

// Multiplayer variables
let multiplayerMode = false;
let playerSelectScreen = false;
let playerSelectSelection = 0; // 0 = 2 players, 1 = 3 players, etc.
let numPlayers = 1;
let currentPlayerIndex = 0; // Track whose turn it is
let players = [];
let playerColors = [
  [100, 200, 255],  // Blue
  [255, 100, 100],  // Red
  [100, 255, 100],  // Green
  [255, 255, 100],  // Yellow
  [255, 150, 255],  // Pink
  [255, 150, 100]   // Orange
];
let multiplayerScoreboard = false;
let multiplayerWinner = -1;
let showPlayerTurnScreen = false;
let playerTurnScreenTimer = 0;

// Gamepad variables
let gamepad = null;
let gamepadConnected = false;
let previousGamepadButtons = {};
let leftStickDeadzone = 0.15;

let antDexEntries = [];      // Built by buildAntDexEntries(): {id, section, name, desc, stats, scene, check, discovered}
let antDexDiscovered = null;  // {entry id: true}, loaded from storage when the entries are built
let dexScrollY = 0;       // current scroll offset
let dexTargetScroll = 0;  // for smooth scrolling
let dexScrollSpeed = 20;  // scroll sensitivity
const DEX_SECTIONS = ['stats', 'abilities', 'exotic'];
let dexCategory = 'stats';
let dexProgressDisplay = { stats: 0, abilities: 0, exotic: 0 }; // Eased progress bar fill per section
let dexTabSwitchCooldown = 0;
let dexTabRegions = {
  stats: { x: 0, y: 0, w: 0, h: 0 },
  abilities: { x: 0, y: 0, w: 0, h: 0 },
  exotic: { x: 0, y: 0, w: 0, h: 0 }
};

// Discovery pop-up card: each newly discovered entry gets a turn, oldest first
let discoveryQueue = [];
let discoveryPopupEntry = null;
let discoveryPopupTimer = 0;
const DISCOVERY_POPUP_FRAMES = 240;        // ~4 seconds
const DISCOVERY_POPUP_QUEUED_FRAMES = 150; // Shorter while more cards are waiting
let discoveryPopupY = 0;          // for smooth slide
let discoveryPopupTargetY = 0;    // target Y position

let speedTime = 0.25;
let dashCoolDown;
let dash = false;
let dashReady = true;
let dashReadyFlash = 0; // Flash timer when dash becomes ready
let dashStripeOffset = 0; // Stripe animation offset for Tiger Beetle
const MAX_HEALTH = 100;
const HEALTH_BAR_SHOW_FRAMES = 60; // Frames the health bar stays visible after health changes
const HEALTH_BAR_FADE_FRAMES = 20; // Last frames of the timer spent fading out
let healthBarTimer = 0; // Frames left showing the player health bar
let healthBarPrev = null; // Health last frame, to detect changes
let healthStripeOffset = 0; // Stripe animation offset for the 91-100 rainbow health bar
let dashPrevPressed = false; // Track previous dash button state for toggle
let dashButtonTouched = false; // Track if dash button is currently touched

// Shockwave attack variables
let windAttackReady = true;
let windAttackCooldown = 0;
let windAttackActive = false;
let windAttackAnimRadius = 0; // Current animation radius
let windAttackAlpha = 0; // Fade alpha
let windAttackPrevPressed = false; // Track previous shockwave attack state
let windAttackReadyFlash = 0; // Flash timer when ready

let shield = 0;
let shot = 0;
let shotBreak = 0;
let playerBullets = []; 
let playerBulletShot = false;
let playerBulletRotationValue;

// Special shot modes. Q / right click / left trigger cycles through them in this order (locked ones
// are skipped); holding it for SHOT_MODE_HOLD_RESET_FRAMES goes back to the default shot.
const SHOT_MODE_DEFAULT = 0;
const SHOT_MODE_SPRAY = 1;
const SHOT_MODE_PIERCE = 2;
const SHOT_MODE_IMPACT = 3;
const SHOT_MODE_TIMED = 4;
const SHOT_MODE_PROXIMITY = 5;
const SHOT_MODES = [
  { name: 'Default', color: [58, 166, 18], center: null },
  { name: 'Spray', color: [160, 160, 160], center: null },
  { name: 'Piercing', color: [50, 120, 255], center: null },
  { name: 'Impact Bomb', color: [40, 200, 40], center: [255, 225, 0] },
  { name: 'Timed Bomb', color: [40, 200, 40], center: [255, 140, 0] },
  { name: 'Proximity Bomb', color: [40, 200, 40], center: [230, 30, 30] }
];
const SPECIAL_SHOT_AMMO_COST = 2;           // A special shot uses 2 regular ammo at once
const SHOT_MODE_HOLD_RESET_FRAMES = 20;
const SHOT_MODE_MENU_LINGER_FRAMES = 30;    // Mode menu stays up this long after the button stops being used
const TIMED_BOMB_FUSE_FRAMES = 60;
const PLAYER_BOMB_BLAST_FRAMES = 24;
const PLAYER_SPRAY_FRAMES = 18;
let shotMode = SHOT_MODE_DEFAULT;
let shotModePrev = SHOT_MODE_DEFAULT;       // The mode the player just switched away from
let shotModeHeldFrames = 0;
let shotModeMenuTimer = 0;
let shotModeMenuScroll = 0;                 // Rows the mode menu still has to scroll (eases to 0)
let playerShotMode = SHOT_MODE_DEFAULT;     // Mode of the shot queued in playerBulletShot
let playerSprays = [];                      // Spray cones (visual only, damage is instant)
let playerBombBlasts = [];                  // Bomb explosions (visual only, damage is instant)
let liveRankingsPrinted = false;
let level = 1;
const BASE_PLAYER_SPEED = 4;
let levelEnd = 0;

// Debug logging: per-shot/per-hit logs pile up in the browser console and slow the game over time
const DEBUG_LOGGING = false;
function debugLog(...args) {
  if (DEBUG_LOGGING) console.log(...args);
}

let deathAnimations = [];
let floatingTexts = [];
let speedRings = []; // Sonic boom rings from accelerated bullets


let enemyCount = 1;
let totalAntSlots = 1;  // Total "slots" available for ants (size determines slot usage)
let enemyIndex;

//enemy one
let antX = [];
let antY = [];
let strikeX = [];
let strikeY = [];
let strikeTime1 = [];
let drawStrike1 = [];
let bulletShot = [];
let bulletCount = [];
let shotAngleX = [];
let shotAngleY = [];
let bulletSpeed = [];
let bulletCooldown = [];
let bulletAngle = [];
let enemyBullets = [];
let landMines = []; // Land mines from expired bullets
let antSpeed = [];
let antPoints = [];
let antLives = [];
let shotOffsetX = [];
let shotOffsetY = [];
let followBeetle = [];
let followAnt = [];
let standStill = [];
let findLocation = [];
let followValue = [];
let keepDistance = [];
let followTarget = [];
let autonomy = [];

// Special category (mutation-based)
let specialExplosion = [];
let specialKnockback = [];
let specialCamo = [];  // <1 = camouflage (flashing opacity), >=1 = ghost (invisible until near the beetle)
let specialRecoil = [];  // <1 = recoil (firing pushes the ant back), >=1 = launch (recoil also hops the ant into the air)
let specialPotential = [];
let bulletKnockbackMultiplier = [];
let bulletCamoFlashRate = []; // Camouflage bullets: opacity flashes per second (lower = better, longer invisible stretches)

// Fire category (mutation-based)
let fireBurst = [];
let fireRapid = [];
let fireAlternating = [];
let fireAlarm = [];  // <1 = alarm (fires faster while the beetle is close), >=1 = avenge (fires again when a nearby ant dies)
let firePotential = [];
let bulletBurstCount = [];
let bulletBurstSpread = [];
let bulletBurstDelay = []; // Delayed burst fire type: frames before the shot splits (max DELAYED_BURST_MAX_DELAY)
let bulletCooldownMultiplier = [];
let antAlternatingCooldownState = []; // For alternating cooldown fire type: 0 = fast, 1 = slow
let antHitReloadFlashFrame = []; // For hit reload fire type: frame the reload flash started
let antRapidFireActive = []; // Tracks if ant is currently in rapid fire sequence
let antRapidFireCount = []; // How many bullets left to fire in rapid fire sequence
let antRapidFireNextFrame = []; // Frame when next rapid fire bullet should spawn
let alarmInnerRadius = []; // Alarm fire type: inner radius (25-100px) where the ant fires 2x faster; the outer radius follows it
let antAvengeQueue = [];   // Avenge fire type: witnessed deaths still waiting for their reload + shot
let antAvengeArmed = [];   // Avenge fire type: a reload is under way and its shot hasn't gone yet
let antCooldownBoost = []; // How much faster each ant's cooldown is running this frame (alarm / territory, max 3x)

// Death category (mutation-based)
let deathLandmine = [];
let deathRefire = [];  // <1 = refire (dead bullets fire again once), >=1 = turret (dead bullets become a turret that fires 3 times)
let deathTerritory = [];  // <1 = territory (dead bullets leave an area that speeds up ant cooldowns), >=1 = nest (the area also grows ant shields)
let deathMound = [];  // <1 = mound (dead bullets leave a short-lived wall), >=1 = bunker (dead bullets leave a hole ants can hide in)
let bunkerRange = []; // How close (1-70px) to a bunker's edge an ant has to be to get in
let antShield = [];   // Nest: shield (0-1) an ant has built up; absorbs damage and stops it being run over
let antInBunker = []; // The bunker each ant is hiding in, or null
let deathPotential = [];

// Path category (mutation-based)
let pathHighArc = [];
let pathCurve = [];  // <1 = curved, >=1 = homing (heat-seeking)
let pathAccelerate = [];  // Whether to use accelerating bullets (0-1, competes with pathHighArc/pathCurve)
let pathBlink = [];  // <1 = blink (bullets jump ahead once), >=1 = portal (the jump also re-aims them at the target)
let blinkDelay = []; // Blink / portal: frames after firing (10-120) before a bullet jumps
let bulletAccelerateDelay = [];  // Frames before acceleration starts (200 = slow, 30 = fast, inverse stat)
let pathPotential = [];
let bulletArcDuration = [];
let bulletCurveStrength = [];

let explodeOnTermination = [];
let triggerExplodeViaProximity = [];
let explosionProximity = [];
let standingPointX = [];
let standingPointY = [];
let anchorPointX = [];
let anchorPointY = [];
let distanceFromAnchor = [];
let anchorOffsetX = []; // Keep Distance: offset added to the anchor target's X
let anchorOffsetY = []; // Keep Distance: offset added to the anchor target's Y
let spawnX = [];
let spawnY = [];
let angleFromSpawn = [];
let movementMutationRate = [];
let bulletSize = [];
let antSize = [];
let antHealth = [];
let antMaxHealth = [];
let antLastHitTime = [];
let antKnockedBack = [];
let antKnockbackTimer = [];
let antKnockbackVelX = [];
let antKnockbackVelY = [];
let antStunned = [];
let antStunTimer = [];
let antLastShotFrame = [];
let antAirHeight = [];
let antRecoilVelX = [];     // Recoil push from firing (special type 3 / -3), decays separately from knockback
let antRecoilVelY = [];
let antRecoilAirTimer = []; // Launch (special type -3): frames left in the hop after firing
let antRecoilAirDuration = []; // Launch: total frames of the current hop (scales with the shot that caused it)
let antRecoilAirPeak = [];     // Launch: peak height (px) of the current hop
const ANT_SPAWN_BUFFER = 20;
let antMoveX = [];
let antMoveY = [];
let antPrevX = [];
let antPrevY = [];

// Gene Token System
let geneTokens = []; // Number of available tokens per ant
let geneTokenInvestments = []; // Array of objects tracking token investments per ant
let geneTokenLastRoundGained = []; // Track when ant last gained tokens

let bulletSplitCount = []; // NEW: how many pieces (1–5)
let bulletSpread = [];     // NEW: spread angle in degrees (or radians)

let radiusMultiplier = [];
let residueMultiplier = [];

let enemyExplosions = [];
let enemyArcExplosionLinks = [];
let enemyGroundImpacts = [];
let enemySmears = []; // Lingering damage patches left by fading bullets (smear death type)
let deathRefires = []; // Spots where dead bullets fire again (refire / turret death types)
let enemyBeams = []; // Beams fired by beam bullets (accelerate tier 2) when they would start accelerating
let beamHealthFlashFrames = 0; // Frames left of the red damage flash from a beam hit
let beamShieldFlashFrames = 0; // Frames left of the blue shield flash from a beam hit
let enemyStreams = []; // Acid streams sprayed by stream fire ants (rapid fire tier 2); never bullets
let antStream = []; // The stream each ant is currently firing (fusing, charging or spraying), or null
let antStreamEndFrame = []; // frameCount each ant last stopped spraying (ghost stream ants fade back in from it)
let antSelfDestructFuse = []; // Proximity explosion stream ants: { life, lives } while their self-destruct fuse burns, or null
let enemySmokeImpacts = []; // Grey smoke puffs from explosions and exploding streams (visual only)
let enemyTerritories = []; // Territory / nest areas left by dead bullets
let enemyWalls = []; // Mounds and bunkers left by dead bullets
let blinkFlashes = []; // Flashes where blink / portal bullets (and streams) reappear
let bulletExplodeAfter = [];

let buttons = {};


//let canvasSize = 600;
let playerSpeed = 3;
let scoreBarHeight = 0; // Top/bottom HUD bars were removed; the play area now uses the full screen
let expBarHeight = 0;
let expBarBuffer = 15;
let sideBuffer = 25;
let score = 0;
let totalScore = 0;
let intermissionScore = 0;  // Saved score for display during intermission
let health = 10;
let playerLastDamageFrame = 0;  // Track when player last took damage for regeneration
let playerKnockedBack = false;
let playerKnockbackTimer = 0;
let playerKnockbackInitialTimer = 0; // Store initial timer for halfway calculation
let playerKnockbackVelX = 0;
let playerKnockbackVelY = 0;
let playerKnockbackTargetX = 0; // Target velocity for acceleration phase
let playerKnockbackTargetY = 0;
let playerKnockbackAccelerating = false; // Track if in acceleration phase
let timeCount = 10;
let highScore = 0;
let end = false;
let comboTime = 0;
let combo = 0;
let comboConstant = 50;
let comboPoints = 0;
let streakPoints = 0;
const COMBO_TIME_MAX = 60; // comboTime is reset to this on every kill
let comboSparks = []; // Sparks burst from the combo meter when the combo bonus steps up
let comboSparkTier = 0; // Combo bonus step last frame, to detect step-ups

// Player EXP bar (under the health bar)
const EXP_BAR_SHOW_FRAMES = 90; // Frames the player EXP bar stays visible after EXP changes
let playerExpBarTimer = 0;
let playerExpBarPrev = null;

// Round intro: frozen screen with "ROUND N" and a 3-2-1 countdown
const ROUND_INTRO_COUNT_FRAMES = 60; // Frames per countdown number
const ROUND_INTRO_FRAMES = ROUND_INTRO_COUNT_FRAMES * 3;
const ROUND_GO_FRAMES = 40; // "GO!" fades over live gameplay after the countdown
let roundIntroTimer = 0; // Frames left in the countdown (0 = not running)
let roundIntroSnapshot = null; // Frozen image of the round's first frame
let roundGoTimer = 0;

// EXP Level System
let expLevel = 1;
let expProgress = 0;
let expRequired = 500;
let upgradeAvailable = false;
let upgradeMenuActive = false;
let selectedUpgrade = 0;  // 0, 1, or 2 for three options
let upgradeKeyDebounce = 0;
let upgradeEnterPressed = false;  // Track if Enter was pressed to prevent bleed-through
const UPGRADE_REROLLS_PER_RUN = 3;
let upgradeRerolls = UPGRADE_REROLLS_PER_RUN;  // Rerolls left this run (do not regenerate)
let upgradeRerollPressed = false;  // Track if reroll was pressed to prevent repeat while held
let previousConfirmPressed = false;  // Track previous frame's confirm state for debouncing
let upgrade1Level = 0;  // Walking Speed (max 4)
let upgrade2Level = 0;  // Dash Speed (max 5)
let upgrade3Level = 0;  // Dash Cooldown (max 5)
let upgrade4Level = 0;  // Add Shield (max 9)
let upgrade5Level = 0;  // Add Bullets (max 16)
let upgrade6Level = 0;  // Shield Regeneration (max 5, requires Add Shield)
let upgrade7Level = 0;  // Bullet Reload (max 5, requires Add Bullets)
let upgrade8Level = 0;  // Bullet Speed (max 5, requires Add Bullets)
let upgrade9Level = 0;  // Free-Angle Aiming (max 1, requires Add Bullets)
let upgrade10Level = 0; // Tiger Beetle (max 1, requires Walking Speed maxed)
let upgrade11Level = 0; // Oogpister Beetle (max 1, requires Bullet Reload 3+)
let upgrade12Level = 0; // Horns (max 4, increases dash damage)
let upgrade13Level = 0; // Potent Acid (max 4, increases bullet damage, requires Add Bullets)
let upgrade14Level = 0; // Shockwave Unlock (max 1, unlocks shockwave attack)
let upgrade15Level = 0; // Shockwave Radius (max 5, 90→225)
let upgrade16Level = 0; // Shockwave Damage (max 5, 0.5→1.2)
let upgrade17Level = 0; // Shockwave Cooldown (max 5, 2.25s→0.375s)
let upgrade18Level = 0; // Shockwave Knockback (max 3, 4→10)
let upgrade19Level = 0; // Shockwave Bullet Deflection (max 4, 20%→100% bullet conversion)
let upgrade20Level = 0; // Health Regeneration (max 5, regenerate health after 200 frames)
let upgrade21Level = 0; // Runt Hunter (max 1, ultra rare): ants smaller than normal give points inversely proportional to size
let upgrade22Level = 0; // Increased Metabolism (max 7): each level makes EXP levels 10% cheaper (up to 70%)
let upgrade23Level = 0; // EXP Boost (max 10): each level adds 10% points (up to +100%)
let upgrade24Level = 0; // Combo Surge (max 4): combo bonus steps every 5 → 1 kills
let upgrade25Level = 0; // Dash Harvest (max 1, very rare): double points for dash kills
let upgrade26Level = 0; // Shockwave Harvest (max 1, very rare): double points for shockwave kills
let upgrade27Level = 0; // Bullet Harvest (max 1, very rare): double points for bullet kills
let upgrade28Level = 0; // Spray Acid (max 1, requires Add Bullets): unlocks the spray shot mode (instant grey cone)
let upgrade29Level = 0; // Spray Length (max 4, 100→200px, requires Spray Acid)
let upgrade30Level = 0; // Spray Width (max 4, 20→100px, requires Spray Acid)
let upgrade31Level = 0; // Piercing Acid (max 1, requires Add Bullets): unlocks the piercing shot mode (pierces 1 ant)
let upgrade32Level = 0; // Piercing Depth (max 9, 1→10 ants pierced, requires Piercing Acid)
let upgrade33Level = 0; // Impact Bomb (max 1, requires Add Bullets): unlocks the impact bomb shot mode
let upgrade34Level = 0; // Timed Bomb (max 1, requires Impact Bomb): unlocks the timed bomb shot mode
let upgrade35Level = 0; // Proximity Bomb (max 1, requires Timed Bomb): unlocks the proximity bomb shot mode
let upgrade36Level = 0; // Blast Radius (max 3, 60→180px, requires Impact Bomb)
let upgrade37Level = 0; // Lady Beetle (max 1): aphids spawn on the field
let upgrade38Level = 0; // Aphid Health (max 3, requires Lady Beetle): beetle heal 2→5, ant heal 0.5→1.25
let upgrade39Level = 0; // Aphid Spawn Rate (max 2, requires Lady Beetle): every 20s→15s→10s
let upgrade40Level = 0; // Speedy Aphids (max 1, requires Lady Beetle): movement aphids
let upgrade41Level = 0; // Armored Aphids (max 1, requires Lady Beetle): damage reduction aphids
let upgrade42Level = 0; // Wise Aphids (max 1, requires Lady Beetle): experience aphids
let upgrade43Level = 0; // Healthy Aphids (max 1, requires Lady Beetle): regeneration aphids
let upgrade44Level = 0; // Lucky Aphids (max 1, requires Lady Beetle): reroll aphids
let upgrade45Level = 0; // Mound Ring (max 1, requires Shockwave): shockwave variant, a ring of mounds around the beetle
let upgrade46Level = 0; // Bunker (max 1, requires Shockwave): shockwave variant, hide in a bunker for 3s
let upgrade47Level = 0; // Vortex (max 1, requires Shockwave): shockwave variant, pulls ants in before the blast
let upgrade48Level = 0; // Flight and Slam (max 1, requires Shockwave): shockwave variant, fly then slam down
let upgrade49Level = 0; // Mound Health (max 4, 1→5, requires Mound Ring or Bunker)
let upgrade50Level = 0; // Flight Duration (max 5, 0.5s→3s, requires Flight and Slam)
let upgrade51Level = 0; // Starting Health (max 4, 10→30 health at the start of each round)
let upgrade52Level = 0; // Dash Deflection (max 1): dashing deflects bullets with the shockwave's chance
let upgrade53Level = 0; // Shell Shrapnel (max 1, requires Add Shield): losing a shield to a bullet throws shrapnel back
let upgrade54Level = 0; // Shrapnel Count (max 2, 1→3 pieces per shield, requires Shell Shrapnel)
const UPGRADE_COUNT = 54;
const UPGRADE_MAX_LEVELS = [4, 5, 5, 9, 8, 5, 5, 5, 1, 1, 1, 4, 4, 1, 5, 5, 5, 3, 4, 5, 1, 7, 10, 4, 1, 1, 1, 1, 4, 4, 1, 9, 1, 1, 1, 3, 1, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4, 5, 4, 1, 1, 2];
let displayedUpgrades = [];  // Array of up to 3 randomly selected upgrade indices (0-9)

// Pre-game upgrade menu variables (insane difficulty 8-10)
let preGameUpgradeOptions = [];  // Array of 3 starting-viable upgrade indices
let preGameSelectedUpgrade = 0;  // 0, 1, or 2 for three options
let preGameEnterPressed = false;  // Track if Enter was pressed to prevent bleed-through

// Free aiming variables
let freeAimEnabled = false;  // Based on upgrade9Level
let isAiming = false;  // True when mouse/right stick is being used to aim
let aimAngle = 0;  // Current aim angle in degrees (atan2 returns degrees when angleMode is DEGREES)
let lastAimInputTime = 0;  // Track when last aiming input was received
let aimInputTimeout = 30;  // Frames before reverting to movement-based rotation
let rightStickDeadzone = 0.2;  // Deadzone for right stick aiming
let prevGameplayMouseX = 0;  // Previous frame's gameplay mouse X position
let prevGameplayMouseY = 0;  // Previous frame's gameplay mouse Y position

// Actual upgrade stat variables
let movementSpeed = 3;
let dashSpeedStat = 2;
let dashCooldownStat = 3;
let windCooldownStat = 2.25; // Shockwave cooldown (3/4 of dash cooldown)
let shieldQuantity = 0;
let bulletQuantity = 0;
let shieldRegenerationRate = 600;
let bulletReloadRate = 180;
let playerBulletSpeed = 1;

// Tiger Beetle effect variables
let tigerBeetleActive = false;
let playerPrevX = 0;
let playerPrevY = 0;
let tigerBeetleMoving = false;
let flashingEntities = []; // array of {type, index, owner, fade}
let flashTimer = 0; // frames until next flash selection

// Spatial partitioning grid for collision optimization
let GRID_CELL_SIZE = 150; // Size of each grid cell in pixels
let gridCols = 0;
let gridRows = 0;
let spatialGrid = {}; // Grid cells: key = "x,y", value = {ants: [], enemyBullets: [], playerBullets: [], mines: []}

let beetle;
let ant;
let shieldFull;
let shieldEmpty;
let acidFull;
let acidEmpty;

function preload(){
  beetle = loadImage('img/p5GameBeetle.gif');
  ant = loadImage('img/antenemy.gif');
  bg = loadImage('img/background.png');
  bulletImage = loadImage('img/bullet.gif');
  shieldFull = loadImage('img/shieldfull.png');
  shieldEmpty = loadImage('img/shieldempty.png');
  acidFull = loadImage('img/acidfull.png');
  acidEmpty = loadImage('img/acidempty.png');
  beetleHit = loadImage('img/beetle-hit-loop.gif');
  splashScreen = loadImage('img/antagonist-splashscreen.png');
  
  //sounds
  sFast = loadSound('sounds/fast.mp3');
  sGainShield = loadSound('sounds/gainshield.mp3');
  sGetHit1 = loadSound('sounds/gethit1.mp3');
  sGetHit2 = loadSound('sounds/gethit2.mp3');
  sHit1 = loadSound('sounds/hit1.mp3');
  sHit2 = loadSound('sounds/hit2.mp3');
  sLoseShield = loadSound('sounds/loseshield.mp3');
  sShieldHit1 = loadSound('sounds/shield1.mp3');
  sShieldHit2 = loadSound('sounds/shield2.mp3');
  sSpit1 = loadSound('sounds/spit1.mp3');
  sSpit2 = loadSound('sounds/spit2.mp3');
  
  gamemusic = loadSound('sounds/beetle-theme.mp3');
  titlemusic = loadSound('sounds/beetle-title.mp3');
  endmusic = loadSound('sounds/beetle-end.mp3');
  

}

// The shot/shield icons are static PNGs, painted into their own canvases once at load. If the
// browser drops its graphics state (a GPU reset under heavy load), those canvases can come back
// blank while the animated GIFs repaint themselves, so the icons silently vanish. Check them now
// and then and reload any that were wiped.
let iconImagesReloading = false;

function isIconImageWiped(img) {
  let ctx = img.drawingContext;
  if (!ctx) return false;
  if (ctx.isContextLost && ctx.isContextLost()) return true;
  let data = ctx.getImageData(0, 0, img.width, img.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return false;
  }
  return true;
}

function reloadIconImages() {
  if (iconImagesReloading) return;
  iconImagesReloading = true;
  debugLog('Icon images were wiped; reloading them');
  let remaining = 4;
  let done = () => { if (--remaining === 0) iconImagesReloading = false; };
  loadImage('img/shieldfull.png', img => { shieldFull = img; done(); }, done);
  loadImage('img/shieldempty.png', img => { shieldEmpty = img; done(); }, done);
  loadImage('img/acidfull.png', img => { acidFull = img; done(); }, done);
  loadImage('img/acidempty.png', img => { acidEmpty = img; done(); }, done);
}

function checkIconImages() {
  if (iconImagesReloading) return;
  if ([shieldFull, shieldEmpty, acidFull, acidEmpty].some(isIconImageWiped)) {
    reloadIconImages();
  }
}

function setup() {
  
  openingCinematic = getItem('openingCinematicSeen') !== true;
  // Canvas text only uses a web font once it has loaded, so fetch the title card font up front
  if (document.fonts) document.fonts.load('100px Creepster');
  let gameCanvas = createCanvas(windowWidth, windowHeight);
  gameCanvas.elt.addEventListener('contextmenu', e => e.preventDefault()); // Right click switches shot mode
  // A restored canvas means the browser reset its graphics state, which can wipe the icons too
  drawingContext.canvas.addEventListener('contextrestored', reloadIconImages);
  debugLog('Window Width:', windowWidth);
  debugLog('Window Height:', windowHeight);
  //enemyCount = windowWidth/150 + windowHeight/150;
  //Beetle
  centerPlayer();
  flashingEntities = [];
  flashTimer = 0;
  playerBulletX = playerX;
  playerBulletY = playerY;
  playerBulletRotationValue = playerRotationValue;
  playerSpeed = movementSpeed / totalAntSlots;
  let dashCooldown = 0;

  // Use slot-based spawning system (like nextLevel)
  let antIndex = 1;
  let usedSlots = 0;
  const MAX_ANTS = 500;  // Safety limit
  
  // Check if using custom ant size from dev tools or difficulty setting
  let initialAntSize = 1;  // Default size
  let initialFollowValue = 0;  // Default follow value
  let initialAutonomy = 0;  // Default autonomy
  
  if (devToolsUseCustomAnts && customAntStats[0]) {
    // Dev tools override
    if (customAntStats[0].antSize) initialAntSize = customAntStats[0].antSize;
    if (customAntStats[0].followValue !== undefined) initialFollowValue = customAntStats[0].followValue;
    if (customAntStats[0].autonomy !== undefined) initialAutonomy = customAntStats[0].autonomy;
    debugLog(`Using custom ant stats for initial spawn`);
  } else {
    // Apply difficulty settings based on tier
    const tier = getDifficultyTier();
    if (tier === 'easy') {
      // 1-3: Basic settings
      initialAntSize = 1;
      initialFollowValue = 0;
      initialAutonomy = 0;
    } else if (tier === 'medium') {
      // 4-5: Keep distance movement
      initialAntSize = 1;
      initialFollowValue = 0;
      initialAutonomy = 1;
    } else if (tier === 'hard') {
      // 6-7: Keep distance + random ability
      initialAntSize = 0.5;
      initialFollowValue = 0;
      initialAutonomy = 1;
    } else if (tier === 'insane') {
      // 8-10: Keep distance + random ability + pre-game upgrade
      initialAntSize = 0.33;
      initialFollowValue = 0;
      initialAutonomy = 1;
    }
    debugLog(`Using difficulty ${difficulty} (${tier}): size=${initialAntSize}, follow=${initialFollowValue}, autonomy=${initialAutonomy}`);
  }
  
  while (usedSlots < totalAntSlots && antIndex <= MAX_ANTS) {
    let i = antIndex;
    
    //enemy one
      antX[i] = random(0, getGameplayWidth());
      antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
      spawnX[i] = antX[i] + cos(angleFromSpawn[i]);
      spawnY[i] = antY[i] + sin(angleFromSpawn[i]);
    //debugLog(antX[i]);
    antPrevX[i] = antX[i];
    antPrevY[i] = antY[i];
    
    strikeX[i] = 0;
    strikeY[i] = 0;
    strikeTime1[i] = 0;
    drawStrike1[i] = 1;
    bulletShot[i] = 0;
    //debugLog(bulletShot[i]);
    enemyBullets[i] = [];
    bulletSpeed[i] = 260; // Above first cap (250) for inverse stat
    bulletCooldown[i] = 160; // Above first cap (150) for inverse stat
    antSpeed[i] = 1.95;
    bulletSize[i] = 1;
    antSize[i] = initialAntSize;  // Use custom size if dev tools enabled, otherwise 1
    
    // Cap ant speed based on ant size (small ants can be faster, large ants slower)
    let maxAntSpeed = 4.5 - antSize[i];
    antSpeed[i] = min(antSpeed[i], maxAntSpeed);
    
    // Cap bullet size based on ant size (small ants can't have huge bullets)
    let maxBulletSize = min(3, antSize[i] + 1.0);
    bulletSize[i] = min(bulletSize[i], maxBulletSize);
    
    antMaxHealth[i] = antSize[i];
    antHealth[i] = antMaxHealth[i];
    antLastHitTime[i] = 0;
    antKnockedBack[i] = false;
    antKnockbackTimer[i] = 0;
    antKnockbackVelX[i] = 0;
    antKnockbackVelY[i] = 0;
    antStunned[i] = false;
    antStunTimer[i] = 0;
    antLastShotFrame[i] = 0;
    antAlternatingCooldownState[i] = 0;
    antAirHeight[i] = 0;
    antRecoilVelX[i] = 0;
    antRecoilVelY[i] = 0;
    antRecoilAirTimer[i] = 0;
    bulletSplitCount[i] = 1;          // no split by default
    bulletSpread[i] = 0;              // 0° spread (all bullets same direction)
    bulletExplodeAfter[i] = 200;
    radiusMultiplier[i] = 1;
    residueMultiplier[i] = 1;
    shotOffsetX[i] = 0;
    shotOffsetY[i] = 0;
    followValue[i] = initialFollowValue;
    autonomy[i] = initialAutonomy;
    // Special category (mutation-based)
    specialExplosion[i] = 0.2;
    specialKnockback[i] = 0.2;
    specialCamo[i] = 0.2;
    specialRecoil[i] = 0.2;
    specialPotential[i] = 0.3;
    bulletKnockbackMultiplier[i] = 2;
    bulletCamoFlashRate[i] = 2.5;
// Fire category (mutation-based)
    fireBurst[i] = 0.1;
    fireRapid[i] = 0.1;
    fireAlternating[i] = 0.1;
    fireAlarm[i] = 0.1;
    alarmInnerRadius[i] = ALARM_DEFAULT_INNER_RADIUS;
    firePotential[i] = 0.3;
    bulletBurstCount[i] = 2;
    bulletBurstSpread[i] = 1.5; // Below first cap (2.0)
    bulletBurstDelay[i] = 40;
    bulletCooldownMultiplier[i] = 2;
    // Death category (mutation-based)
    deathLandmine[i] = 0.3;
    deathRefire[i] = 0.2;
    deathTerritory[i] = 0.2;
    deathMound[i] = 0.2;
    bunkerRange[i] = BUNKER_DEFAULT_RANGE;
    deathPotential[i] = 0.3;
    // Path category (mutation-based)
    pathHighArc[i] = 0.1;
    pathCurve[i] = 0.1;
    pathAccelerate[i] = 0.1;
    pathBlink[i] = 0.1;
    blinkDelay[i] = BLINK_DEFAULT_DELAY;
    bulletAccelerateDelay[i] = 200;
    pathPotential[i] = 0.3;
    bulletArcDuration[i] = 200;
    bulletCurveStrength[i] = 0.015;
    bulletBurstCount[i] = 2;
    bulletBurstSpread[i] = 1.5; // Below first cap (2.0)
    bulletBurstDelay[i] = 40;
    bulletCooldownMultiplier[i] = 2;
    antAlternatingCooldownState[i] = 0; // Start with fast cooldown
    antRapidFireActive[i] = false;
    antRapidFireCount[i] = 0;
    antRapidFireNextFrame[i] = 0;
    explosionProximity[i] = 200;
    
    // Gene Token System
    geneTokens[i] = getInitialTokensForDifficulty();
    geneTokenInvestments[i] = []; // Empty array to track investments
    geneTokenLastRoundGained[i] = 0; // Track last round tokens were gained
    
    // Set explosion flags based on genetics
    const specialType = getSpecialType(i);
    if (specialType === 0){
      // No special bullet behavior
      explodeOnTermination[i] = false;
      triggerExplodeViaProximity[i] = false;
    } else if (specialType === 1){
      // Type 1 = Explosions - check trigger type via specialExplosion value
      if (specialExplosion[i] < 1){
        // Time-based explosion (specialExplosion < 1)
        explodeOnTermination[i] = true;
        triggerExplodeViaProximity[i] = false;
      } else {
        // Proximity-based explosion (specialExplosion >= 1)
        explodeOnTermination[i] = false;
        triggerExplodeViaProximity[i] = true;
      }
    } else {
      // Knockback (-1), Camouflage (2), Ghost (-2), Recoil (3), or Launch (-3): no explosions
      explodeOnTermination[i] = false;
      triggerExplodeViaProximity[i] = false;
    }
    
    standingPointX[i] = width / 2;
    standingPointY[i] = height / 2;
    distanceFromAnchor[i] = 200;
    anchorOffsetX[i] = 0;
    anchorOffsetY[i] = 0;
    angleFromSpawn[i] = PI;
    if (Math.round(autonomy[i]) === 0){
      followTarget[i] = true;
      keepDistance[i] = false;
    } else if (Math.round(autonomy[i]) === 1){
      followTarget[i] = false;
      keepDistance[i] = true;
    }
    if (Math.round(followValue[i]) === 0){
      followAnt[i] = false;
      followBeetle[i] = true;
      findLocation[i] = false;
      standStill[i] = false;
    } else if (Math.round(followValue[i]) === 1) {
      followAnt[i] = true;
      followBeetle[i] = false;
      findLocation[i] = false;
      standStill[i] = false;
    } else if (Math.round(followValue[i]) === 2) {
      followAnt[i] = false;
      followBeetle[i] = false;
      findLocation[i] = true;
      standStill[i] = false;
    } else if (Math.round(followValue[i]) === 3) {
      followAnt[i] = false;
      followBeetle[i] = false;
      findLocation[i] = false;
      standStill[i] = true;
    }
    antPoints[i] = 0;
    antLives[i] = 1;
    
    // Check if this ant will fit in remaining slots
    const SLOT_EPSILON = 0.001;
    if (usedSlots + antSize[i] > totalAntSlots + SLOT_EPSILON) {
      debugLog(`  Initial ant ${i} (size ${antSize[i].toFixed(2)}) won't fit in remaining slots (${(totalAntSlots - usedSlots).toFixed(2)}), stopping`);
      break;  // Exit loop, we're done spawning
    }
    
    debugLog(`Initial ant ${i} created: size=${antSize[i].toFixed(2)}, used slots=${(usedSlots + antSize[i]).toFixed(2)}/${totalAntSlots}`);
    
    // Track slot usage and increment counter
    usedSlots += antSize[i];
    antIndex++;
  }
  
  // Set enemyCount to actual number of ants created
  enemyCount = antIndex - 1;
  playerSpeed = movementSpeed / enemyCount;
  debugLog(`Initial setup: Created ${enemyCount} ants using ${usedSlots.toFixed(2)}/${totalAntSlots} slots`);
  
  // Invest initial gene tokens for all ants
  for (let i = 1; i <= enemyCount; i++) {
    let investmentAttempts = 0;
    const maxAttempts = 10; // Prevent infinite loops
    while (geneTokens[i] > 0 && investmentAttempts < maxAttempts) {
      let tokensBefore = geneTokens[i];
      evaluateAndAllocateTokens(i, 0, true); // Round 0 for initial setup, isInitialSetup = true
      if (geneTokens[i] === tokensBefore) {
        // No investment made, break to avoid infinite loop
        break;
      }
      investmentAttempts++;
    }

    if (getDifficultyTier() === 'hard' || getDifficultyTier() === 'insane') {
      geneTokens[i]++; // Extra token for random initial ability
      applyHardModeRandomInitialAbility(i);
    }
  }
  
  // Apply custom ant stats if enabled in dev tools
  if (devToolsUseCustomAnts) {
    applyCustomAntsToInitialPopulation();
  }

  buttons.up = {x: 80, y: windowHeight - 140, w: 60, h: 60};
  buttons.down = {x: 80, y: windowHeight - 60, w: 60, h: 60};
  buttons.left = {x: 20, y: windowHeight - 100, w: 60, h: 60};
  buttons.right = {x: 140, y: windowHeight - 100, w: 60, h: 60};

  buttons.dash = {x: windowWidth - 140, y: windowHeight - 100, w: 80, h: 80};
  buttons.shoot = {x: windowWidth - 50, y: windowHeight - 100, w: 80, h: 80};
  
  updateAntDexEntries();
  
  // Initialize spatial partitioning grid
  initSpatialGrid();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Keep beetle centered in playable area when window resizes
  centerPlayer();
  
  // Update button positions for mobile controls
  buttons.up = {x: 80, y: windowHeight - 140, w: 60, h: 60};
  buttons.down = {x: 80, y: windowHeight - 60, w: 60, h: 60};
  buttons.left = {x: 20, y: windowHeight - 100, w: 60, h: 60};
  buttons.right = {x: 140, y: windowHeight - 100, w: 60, h: 60};
  buttons.dash = {x: windowWidth - 140, y: windowHeight - 100, w: 80, h: 80};
  buttons.shoot = {x: windowWidth - 50, y: windowHeight - 100, w: 80, h: 80};
  
  // Reinitialize spatial grid on resize
  initSpatialGrid();
}

function triggerDiscoveryPopup(entry) {
  discoveryQueue.push(entry);
}

function startNextDiscoveryPopup() {
  discoveryPopupEntry = discoveryQueue.shift();
  discoveryPopupTimer = discoveryQueue.length > 0 ? DISCOVERY_POPUP_QUEUED_FRAMES : DISCOVERY_POPUP_FRAMES;
  discoveryPopupY = windowHeight + 100;          // start off-screen
  discoveryPopupTargetY = windowHeight - 90;     // where it should slide to
}

// Discovery card: the entry's picture and name, sliding up in the bottom right corner
function drawDiscoveryPopup() {
  // New discoveries wait until the round's intro scene and countdown are over (and any tutorial card is closed)
  const introPlaying = start && (roundScene || roundScenePending || roundIntroTimer > 0 || isTutorialPaused());
  if (!discoveryPopupEntry && discoveryQueue.length > 0 && !introPlaying) startNextDiscoveryPopup();
  const entry = discoveryPopupEntry;
  if (!entry) return;

  const popupWidth = 420;
  const popupHeight = 130;
  const popupX = windowWidth - popupWidth - 20;
  discoveryPopupY = lerp(discoveryPopupY, discoveryPopupTargetY, 0.1);
  const top = discoveryPopupY - popupHeight / 2;

  // fade out near the end of its timer
  const fadeOutStart = 60; // last 1 second
  const alpha = map(discoveryPopupTimer, 0, fadeOutStart, 0, 255, true);
  const style = DEX_SECTION_STYLES[entry.section];

  push();
  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, alpha * 0.8);
  stroke(...style.stroke, alpha * 0.7);
  strokeWeight(2);
  rect(popupX, top, popupWidth, popupHeight, 18);
  noStroke();
  const pic = popupHeight - 20;
  drawDexPicture(entry, popupX + 10, top + 10, pic, pic, alpha);

  const tx = popupX + pic + 24;
  const tw = popupWidth - pic - 36;
  textAlign(LEFT, TOP);
  textSize(13);
  fill(...style.stroke, alpha);
  text(`New ${style.tab === 'Stats' ? 'Stat' : style.tab === 'Abilities' ? 'Ability' : 'Exotic'} Discovered!`, tx, top + 14);
  fill(255, 255, 255, alpha);
  textSize(entry.name.length > 24 ? 18 : 21);
  text(entry.name, tx, top + 32, tw, 50);
  fill(200, 200, 200, alpha);
  textSize(12);
  text(entry.stats, tx, top + popupHeight - 44, tw, 34);
  pop();

  // Countdown
  discoveryPopupTimer--;
  if (discoveryPopupTimer <= 0) discoveryPopupEntry = null;
}

// ===== SPATIAL PARTITIONING FUNCTIONS =====
// These functions optimize collision detection by dividing the screen into a grid

function initSpatialGrid() {
  // Calculate grid dimensions based on gameplay area
  gridCols = Math.ceil(getGameplayWidth() / GRID_CELL_SIZE);
  gridRows = Math.ceil(getGameplayHeight() / GRID_CELL_SIZE);
  spatialGrid = {};
}

function getCellKey(x, y) {
  // Convert world coordinates to grid cell key
  let col = Math.floor(x / GRID_CELL_SIZE);
  let row = Math.floor(y / GRID_CELL_SIZE);
  return `${col},${row}`;
}

function updateSpatialGrid() {
  // Clear and rebuild the spatial grid each frame
  spatialGrid = {};
  
  // Add ants to grid
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i]) continue;
    let key = getCellKey(antX[i], antY[i]);
    if (!spatialGrid[key]) spatialGrid[key] = {ants: [], enemyBullets: [], playerBullets: [], mines: []};
    spatialGrid[key].ants.push(i);
  }
  
  // Add enemy bullets to grid
  for (let i = 1; i <= enemyCount; i++) {
    for (let b = 0; b < enemyBullets[i].length; b++) {
      let bullet = enemyBullets[i][b];
      let key = getCellKey(bullet.x, bullet.y);
      if (!spatialGrid[key]) spatialGrid[key] = {ants: [], enemyBullets: [], playerBullets: [], mines: []};
      spatialGrid[key].enemyBullets.push({antIndex: i, bulletIndex: b, bullet: bullet});
    }
  }
  
  // Add player bullets to grid
  for (let i = 0; i < playerBullets.length; i++) {
    let b = playerBullets[i];
    let key = getCellKey(b.x, b.y);
    if (!spatialGrid[key]) spatialGrid[key] = {ants: [], enemyBullets: [], playerBullets: [], mines: []};
    spatialGrid[key].playerBullets.push({index: i, bullet: b});
  }
  
  // Add landmines to grid
  for (let m = 0; m < landMines.length; m++) {
    let mine = landMines[m];
    let key = getCellKey(mine.x, mine.y);
    if (!spatialGrid[key]) spatialGrid[key] = {ants: [], enemyBullets: [], playerBullets: [], mines: []};
    spatialGrid[key].mines.push({index: m, mine: mine});
  }
}

function getNearbyCells(x, y, span = 1) {
  // Get all cells within radius (current cell + 8 surrounding cells, or more rings with a bigger span)
  let cells = [];
  let col = Math.floor(x / GRID_CELL_SIZE);
  let row = Math.floor(y / GRID_CELL_SIZE);

  for (let dc = -span; dc <= span; dc++) {
    for (let dr = -span; dr <= span; dr++) {
      let key = `${col + dc},${row + dr}`;
      if (spatialGrid[key]) {
        cells.push(spatialGrid[key]);
      }
    }
  }
  return cells;
}

function draw() {
  // Poll gamepad each frame
  updateGamepad();
  menuSlideY = 0;

  // Every couple of seconds, make sure the shot/shield icons weren't wiped
  if (frameCount % 120 === 0) {
    checkIconImages();
  }

  if (antdexOpenCooldown > 0) {
    antdexOpenCooldown--;
  }
  if (intermissionMenuCooldown > 0) {
    intermissionMenuCooldown--;
  }
  if (gameOverMenuCooldown > 0) {
    gameOverMenuCooldown--;
  }
  if (menuNavigationCooldown > 0) {
    menuNavigationCooldown--;
  }
  if (dexTabSwitchCooldown > 0) {
    dexTabSwitchCooldown--;
  }
  if (upgradeKeyDebounce > 0) {
    upgradeKeyDebounce--;
  }
  if (devToolsKeyCooldown > 0) {
    devToolsKeyCooldown--;
  }
  if (devToolsNavigationCooldown > 0) {
    devToolsNavigationCooldown--;
  }
  if (devToolsTabSwitchCooldown > 0) {
    devToolsTabSwitchCooldown--;
  }

  // Check for dev tools key combination (Shift + / + \)
  if (keyIsDown(16) && keyIsDown(191) && keyIsDown(220) && devToolsKeyCooldown === 0) {
    if (!devTools) {
      // Save current state before entering dev tools
      if (start) {
        devToolsReturnState = 'game';
      } else if (startMenu) {
        devToolsReturnState = 'menu';
      } else if (intermissionMenu) {
        devToolsReturnState = 'intermission';
      } else if (gameOverMenu) {
        devToolsReturnState = 'gameover';
      } else {
        devToolsReturnState = 'menu';
      }
      devTools = true;
    } else {
      devTools = false;
    }
    devToolsKeyCooldown = 30;
  }

  // Show developer tools
  if (devTools) {
    drawDevTools();
    return;
  }

  // Show multiplayer scoreboard
  if (multiplayerScoreboard) {
    drawMultiplayerScoreboard();
    return;
  }
  
  // Show player turn screen
  if (showPlayerTurnScreen) {
    drawPlayerTurnScreen();
    return;
  }

  if (antdex) {
    // The tutorial's Antdex card holds the Antdex's own input until it's closed
    const tutorialCard = updateTutorialMenus();
    if (tutorialCard) {
      antdexInputBlocked = true;
      dexTabSwitchCooldown = Math.max(dexTabSwitchCooldown, 2);
    } else if (!isBackPressed()) {
      antdexInputBlocked = false;
    }
    updateAntDexEntries();
    antdexScreen();
    drawTutorialMenuCard();
    return;
  }

  // Beating the Queen of Queens: the ending (finalboss.js)
  if (finalEnding) {
    drawFinalEnding();
    return;
  }

  // Show pre-game upgrade menu (insane difficulty 8-10)
  if (preGameUpgradeMenu) {
    drawPreGameUpgradeScreen();
    
    // Handle input for pre-game upgrade menu
    if (preGameUpgradeOptions.length > 0) {
      let numOptions = preGameUpgradeOptions.length;
      
      // Handle left/right arrow navigation
      if (upgradeKeyDebounce === 0) {
        if (isLeftPressed()) {
          preGameSelectedUpgrade = (preGameSelectedUpgrade - 1 + numOptions) % numOptions;
          upgradeKeyDebounce = 10;
        } else if (isRightPressed()) {
          preGameSelectedUpgrade = (preGameSelectedUpgrade + 1) % numOptions;
          upgradeKeyDebounce = 10;
        }
      }
      
      // Handle number key selection
      if (numOptions >= 1 && keyIsDown(49)) {  // 1
        preGameSelectedUpgrade = 0;
      } else if (numOptions >= 2 && keyIsDown(50)) {  // 2
        preGameSelectedUpgrade = 1;
      } else if (numOptions >= 3 && keyIsDown(51)) {  // 3
        preGameSelectedUpgrade = 2;
      }
      
      // Confirm selection with Enter (wait for key release between selections)
      if (isConfirmPressed()) {
        if (!preGameEnterPressed && upgradeKeyDebounce === 0) {
          applyPreGameUpgrade(preGameSelectedUpgrade);
          upgradeKeyDebounce = 20;
        }
        preGameEnterPressed = true;
      } else {
        preGameEnterPressed = false;
      }
      
      // Skip with Escape
      if (isBackPressed() && upgradeKeyDebounce === 0) {
        skipPreGameUpgrade();
        upgradeKeyDebounce = 20;
      }
    }
    
    return;  // Don't show other screens while pre-game menu is active
  }

  if (start == true && isTutorialPaused()) {
    // A tutorial card over the frozen game
    drawTutorialPausedFrame();
  } else if (start == true && (roundScene || roundScenePending)) {
    // Round scene: the beetle hunting down the next batch of ants, before the countdown
    drawRoundSceneFrame();
  } else if (start == true && roundIntroTimer > 0 && roundIntroSnapshot) {
    // Round intro: everything stays frozen until the countdown finishes
    drawRoundIntro();
  } else if (start == true && roundOutroTimer > 0 && roundOutroSnapshot) {
    // Round outro: frozen and darkened with "Victory" / "Queen Defeated" before the round-over screen
    drawRoundOutro();
  } else if (start == true){
      // Only snapshot a round that was already started before this frame; nextRound() runs
      // inside endGame() from the round-over screen, which would otherwise freeze that screen
      let snapshotRoundIntro = roundIntroTimer > 0 && !roundIntroSnapshot;

      // Check if Tiger Beetle is dashing (for visual effects)
      if (tigerBeetleActive) {
        tigerBeetleMoving = dash;
        
        // Handle flash effect when dashing
        if (tigerBeetleMoving) {
          flashTimer--;
          if (flashTimer <= 0) {
            // Select new entity to flash
            flashTimer = 3; // Flash selection every 3 frames
            
            // Randomly choose between ant, bullet, or landmine
            let choice = random();
            if (choice < 0.33 && enemyCount > 0) {
              // Flash an ant
              flashingEntities.push({
                type: 'ant',
                index: floor(random(1, enemyCount + 1)),
                owner: -1,
                fade: 255
              });
            } else if (choice < 0.66) {
              // Flash a bullet - find all bullets
              let allBullets = [];
              for (let i = 1; i <= enemyCount; i++) {
                for (let b = 0; b < enemyBullets[i].length; b++) {
                  allBullets.push({owner: i, index: b});
                }
              }
              if (allBullets.length > 0) {
                let bulletChoice = allBullets[floor(random(allBullets.length))];
                flashingEntities.push({
                  type: 'bullet',
                  index: bulletChoice.index,
                  owner: bulletChoice.owner,
                  fade: 255
                });
              } else {
                // No bullets, flash an ant instead
                flashingEntities.push({
                  type: 'ant',
                  index: floor(random(1, enemyCount + 1)),
                  owner: -1,
                  fade: 255
                });
              }
            } else {
              // Flash a landmine - find all enemy landmines
              let enemyMines = [];
              for (let m = 0; m < landMines.length; m++) {
                if (!landMines[m].isPlayerMine) {
                  enemyMines.push(m);
                }
              }
              if (enemyMines.length > 0) {
                let mineChoice = enemyMines[floor(random(enemyMines.length))];
                flashingEntities.push({
                  type: 'mine',
                  index: mineChoice,
                  owner: -1,
                  fade: 255
                });
              } else {
                // No enemy mines, flash an ant instead
                if (enemyCount > 0) {
                  flashingEntities.push({
                    type: 'ant',
                    index: floor(random(1, enemyCount + 1)),
                    owner: -1,
                    fade: 255
                  });
                }
              }
            }
          }
          
          // Fade out all flashing entities
          for (let i = flashingEntities.length - 1; i >= 0; i--) {
            flashingEntities[i].fade -= 8.5; // Fade over 30 frames (255/30)
            if (flashingEntities[i].fade <= 0) {
              flashingEntities.splice(i, 1); // Remove faded entities
            }
          }
        } else {
          // Not dashing, reset flash
          flashingEntities = [];
          flashTimer = 0;
        }
      } else {
        tigerBeetleMoving = false;
      }
      
      // Update spatial partitioning grid each frame for collision optimization
      updateSpatialGrid();
      
      for (let i = 1; i <= enemyCount; i++) {
        antMoveX[i] = 0;
        antMoveY[i] = 0;
      }
      healthBegin = health;
      shieldBegin = shield;
      
      // UI elements (not scaled)
      drawBackground();
      updateScoreAndTimer();
      
      // Begin gameplay scaling based on level
      beginGameplayScaling();
      autonomousAntMovement();
      updateEnemyTerritories();
      updateEnemyWalls();
      updatePlayerWalls();
      updateAphids();
      drawEnemy();
      updateQueen();
      updateFinalStage(); // Queen of Queens tunnel attacks (finalboss.js)
      updateTutorial();
      drawBeetleShadow();
      // A flying beetle is drawn later, over the bullets (decided once so it's drawn exactly once this frame)
      const beetleDrawnOnTop = isPlayerFlying();
      if (!beetleDrawnOnTop) drawBeetle();
      drawStrikes();
      calculateBonus();
      enemyInteraction1(); // Beetle Eats Enemy
      updateAntCooldownBoosts();
      enemyShoot1();
      drawEnemyArcExplosionLinks();
      drawEnemySmears();
      updateDeathRefires();
      drawEnemyExplosions();
      drawEnemyGroundImpacts();
      updateEnemyBeams();
      updateEnemyStreams();
      drawBlinkFlashes();
      drawEnemySmokeImpacts();
      detectKeyboardInput();
      // Beetle Moves
      beetleShoot();
      beetleDash();
      handleWindAttack(); // Handle shockwave attack
      updateShockwaveVariants(); // Vortex pull, flight, shell shrapnel
      if (beetleDrawnOnTop) drawBeetle();
      drawDeferredEnemyBullets(); // Airborne high arc bullets go over a flying beetle
      dashCollision(); // Check for dash collisions with ants
      handleAntKnockback(); // Handle knocked back ants
      holdBunkeredAnts();
      holdDormantAnts();
      resolveAntWallCollisions();
      holdPlayerInBunker();
      resolvePlayerWallCollisions();
      drawDeathEffects();
      drawSpeedRings();
      updateComboSparks();
      drawQueenOverlays();
      drawFinalStageOverlays();
      endGameplayScaling();
      
      // Draw damage flash effects AFTER gameplay (not scaled)
      if (healthBegin > health || beamHealthFlashFrames > 0){
        noStroke();
        rectMode(CORNER);
        fill(250, 0, 0, 75);
        rect(0, 0, windowWidth, windowHeight);
      }
      if (shieldBegin > shield || beamShieldFlashFrames > 0){
        noStroke();
        rectMode(CORNER);
        fill( 0, 0, 255, 75);
        rect(0, 0, windowWidth, windowHeight);
      }
      if (beamHealthFlashFrames > 0) beamHealthFlashFrames--;
      if (beamShieldFlashFrames > 0) beamShieldFlashFrames--;

      drawRoundTimer();
      drawQueenHud();
      
      // Shield regeneration (outside scaling)
      let maxShields = shieldQuantity > 0 ? shieldQuantity : 0;
      if (shield < maxShields){
        shield = shield + getPlayerRegenMultiplier() / shieldRegenerationRate;
      }
      
      // Health regeneration - if player hasn't taken damage for 200 frames
      if (upgrade20Level > 0 && end == false) {
        if (frameCount - playerLastDamageFrame >= 200 && health < 30) {
          // Regeneration rates: 0.001, 0.005, 0.01, 0.05, 0.1
          let regenRates = [0.001, 0.005, 0.01, 0.05, 0.1];
          let regenAmount = regenRates[upgrade20Level - 1] * getPlayerRegenMultiplier();
          // Scale down regeneration as health increases (full rate at 10, nearly 0 at 30)
          let regenMultiplier = max(0, (30 - health) / 20);
          health = min(health + regenAmount * regenMultiplier, 30);
        }
      }

      // Cap health and show the health bar whenever it changes
      health = min(health, MAX_HEALTH);
      if (healthBarPrev !== null && health !== healthBarPrev) {
        healthBarTimer = HEALTH_BAR_SHOW_FRAMES;
      }
      healthBarPrev = health;
      if (healthBarTimer > 0) healthBarTimer--;

      // Show the player EXP bar whenever EXP changes
      if (playerExpBarPrev !== null && expProgress !== playerExpBarPrev) {
        playerExpBarTimer = EXP_BAR_SHOW_FRAMES;
      }
      playerExpBarPrev = expProgress;
      if (playerExpBarTimer > 0) playerExpBarTimer--;

      endGame();

      // First frame of a round: freeze it as the backdrop for the countdown
      if (snapshotRoundIntro && roundIntroTimer > 0 && !roundIntroSnapshot && start && !end) {
        roundIntroSnapshot = get();
      }
      drawRoundGo();
      drawTutorialOverlay();
      if (frameCount % 1000 === 0 && end === false) {  // roughly every 5 seconds at 60fps
        printLiveAntRankings();
      }

  } else if (openingCinematic) {
    drawOpeningCinematic();
  } else {
    // A tutorial card over a menu reads input before the menu can
    if (updateTutorialMenus()) menuNavigationCooldown = Math.max(menuNavigationCooldown, 2);
    drawStartScreen();
    drawCinematicFlash();
    drawTutorialMenuCard();
  }
  if (start && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    drawMobileControls();
  }
  updateAntDexEntries();
  
  drawDiscoveryPopup();
}

function resetRunState() {
  end = false;
  gameOverMenu = false;
  gameOverMenuCooldown = 0;
  intermissionMenu = false;
  intermissionMenuCooldown = 0;
  liveRankingsPrinted = false;
  combo = 0;
  comboTime = 0;
  comboPoints = 0;
  streakPoints = 0;
  level = 1;
  enemyCount = 1;
  totalAntSlots = 1;
  levelEnd = 0;
  totalScore = 0;
  score = 0;
  health = getStartingHealth();
  timeCount = 10;
  playerRotationValue = 0;
  bulletShot[enemyIndex] = 0;
  bulletSpeed[enemyIndex] = 100;
  centerPlayer();
  tigerBeetleMoving = false;
  flashingEntities = [];
  flashTimer = 0;
  shield = shieldQuantity > 0 ? shieldQuantity : 0;
  shot = bulletQuantity > 0 ? bulletQuantity : 0;
  shotBreak = 0;
  dash = false;
  dashReady = true;
  dashCoolDown = 0;
  dashReadyFlash = 0;
  dashStripeOffset = 0;
  healthBarTimer = 0;
  healthBarPrev = null;
  playerExpBarTimer = 0;
  playerExpBarPrev = null;
  comboSparks = [];
  comboSparkTier = 0;
  dashPrevPressed = false;
  dashButtonTouched = false;
  windAttackReady = true;
  windAttackCooldown = 0;
  windAttackActive = false;
  windAttackAnimRadius = 0;
  windAttackAlpha = 0;
  windAttackPrevPressed = false;
  windAttackReadyFlash = 0;
  clearRoundEffects();
  playerBulletShot = false;
  antX[enemyIndex] = getGameplayWidth() * 0.75;
  antY[enemyIndex] = getGameplayHeight() * 0.5;

  
  // Reset EXP system
  expLevel = 1;
  expProgress = 0;
  expRequired = 500;
  upgradeAvailable = false;
  upgradeMenuActive = false;
  selectedUpgrade = 0;
  upgradeEnterPressed = false;
  upgrade1Level = 0;
  upgrade2Level = 0;
  upgrade3Level = 0;
  upgrade4Level = 0;
  upgrade5Level = 0;
  upgrade6Level = 0;
  upgrade7Level = 0;
  upgrade8Level = 0;
  upgrade9Level = 0;
  upgrade10Level = 0;
  upgrade11Level = 0;
  upgrade12Level = 0;
  upgrade13Level = 0;
  upgrade14Level = 0;
  upgrade15Level = 0;
  upgrade16Level = 0;
  upgrade17Level = 0;
  upgrade18Level = 0;
  upgrade19Level = 0;
  upgrade20Level = 0;
  upgrade21Level = 0;
  upgrade22Level = 0;
  upgrade23Level = 0;
  upgrade24Level = 0;
  upgrade25Level = 0;
  upgrade26Level = 0;
  upgrade27Level = 0;
  upgrade28Level = 0;
  upgrade29Level = 0;
  upgrade30Level = 0;
  upgrade31Level = 0;
  upgrade32Level = 0;
  upgrade33Level = 0;
  upgrade34Level = 0;
  upgrade35Level = 0;
  upgrade36Level = 0;
  upgrade37Level = 0;
  upgrade38Level = 0;
  upgrade39Level = 0;
  upgrade40Level = 0;
  upgrade41Level = 0;
  upgrade42Level = 0;
  upgrade43Level = 0;
  upgrade44Level = 0;
  upgrade45Level = 0;
  upgrade46Level = 0;
  upgrade47Level = 0;
  upgrade48Level = 0;
  upgrade49Level = 0;
  upgrade50Level = 0;
  upgrade51Level = 0;
  upgrade52Level = 0;
  upgrade53Level = 0;
  upgrade54Level = 0;
  upgradeRerolls = UPGRADE_REROLLS_PER_RUN;
  displayedUpgrades = [];
  updateUpgradeBooleans();  // Reset all upgrade booleans to false

  // Queens: hit count, beaten queens and the inherited strategy only last one run
  queenHitCount = 0;
  queensDefeatedThisRun = 0;
  queenInheritedBrain = null;
  lastBeetleShotFrame = -9999;
  resetRoundScenes();
  leaveFinalLevel();
  leaveTutorialRun();
}

function restartGame() {
  // The final level and the tutorial restart themselves
  if (isFinalLevel()) {
    startFinalLevel();
    return;
  }
  if (isTutorialRun()) {
    restartTutorialRun();
    return;
  }
  resetRunState();
  if (!multiplayerMode) applyPermanentUpgrades();
  
  // Apply custom ant stats if enabled in dev tools
  if (devToolsUseCustomAnts) {
    applyCustomAntsToInitialPopulation();
  } else {
    applyDifficultyToInitialPopulation();
  }
  
  start = true;
  startRoundIntro();
  startMenu = false;
  endmusic.stop();
  titlemusic.stop();
  if (!gamemusic.isPlaying()) {
    gamemusic.play();
  }
}

function applyCustomAntsToInitialPopulation() {
  debugLog("Applying custom ant stats to initial population");
  debugLog("Current enemy count:", enemyCount);
  
  // Use first place ant stats for all initial ants
  let s = customAntStats[0];
  ensureCustomAntTierCaps(s);
  debugLog("Custom ant stats:", s);
  
  // Check if we need to respawn ants due to size change
  let customSize = s.antSize || 1;
  let neededAnts = 0;
  let tempSlots = 0;
  
  // Calculate how many ants we need with this size
  while (tempSlots < totalAntSlots && neededAnts < 500) {
    if (tempSlots + customSize > totalAntSlots + 0.001) break;
    tempSlots += customSize;
    neededAnts++;
  }
  
  debugLog(`With size ${customSize}, need ${neededAnts} ants (current: ${enemyCount})`);
  
  // If count changed, we need to respawn
  if (neededAnts !== enemyCount) {
    debugLog(`Respawning population: ${enemyCount} -> ${neededAnts} ants`);
    
    // Clear existing ants beyond the new count
    if (neededAnts < enemyCount) {
      for (let i = neededAnts + 1; i <= enemyCount; i++) {
        enemyBullets[i] = [];
      }
    }
    
    // Initialize new ants if we need more
    if (neededAnts > enemyCount) {
      for (let i = enemyCount + 1; i <= neededAnts; i++) {
        antX[i] = random(0, getGameplayWidth());
        antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
        spawnX[i] = antX[i] + cos(angleFromSpawn[i]);
        spawnY[i] = antY[i] + sin(angleFromSpawn[i]);
        antPrevX[i] = antX[i];
        antPrevY[i] = antY[i];
        strikeX[i] = 0;
        strikeY[i] = 0;
        strikeTime1[i] = 0;
        drawStrike1[i] = 1;
        bulletShot[i] = 0;
        enemyBullets[i] = [];
        antKnockedBack[i] = false;
        antKnockbackTimer[i] = 0;
        antKnockbackVelX[i] = 0;
        antKnockbackVelY[i] = 0;
        antStunned[i] = false;
        antStunTimer[i] = 0;
        antLastShotFrame[i] = 0;
        antAlternatingCooldownState[i] = 0;
        antAirHeight[i] = 0;
        antRecoilVelX[i] = 0;
        antRecoilVelY[i] = 0;
        antRecoilAirTimer[i] = 0;
        antPoints[i] = 0;
        antLives[i] = 1;
        geneTokens[i] = 2;
        geneTokenInvestments[i] = [];
        geneTokenLastRoundGained[i] = 0;
      }
    }
    
    enemyCount = neededAnts;
    playerSpeed = movementSpeed / enemyCount;
    debugLog(`New enemy count: ${enemyCount}`);
  }
  
  // Now apply custom stats to all ants
  for (let i = 1; i <= enemyCount; i++) {
    debugLog(`Setting ant ${i} to custom stats`);
    applyStatsToAnt(i, s);
  }
  
  debugLog("Custom ant stats applied successfully to all ants");
}

// Give ant i everything in a stats object (snapshotAntStats / customAntStats shape), plus its derived flags
function applyStatsToAnt(i, s) {
  bulletSpeed[i] = s.bulletSpeed;
  bulletCooldown[i] = Math.floor(s.bulletCooldown);
  antSpeed[i] = s.antSpeed;
  shotOffsetX[i] = s.shotOffsetX;
  shotOffsetY[i] = s.shotOffsetY;
  standingPointX[i] = s.standingPointX;
  standingPointY[i] = s.standingPointY;
  followValue[i] = s.followValue;
  autonomy[i] = s.autonomy;
  distanceFromAnchor[i] = s.distanceFromAnchor;
  anchorOffsetX[i] = s.anchorOffsetX;
  anchorOffsetY[i] = s.anchorOffsetY;
  // Special category (mutation-based)
  specialExplosion[i] = s.specialExplosion;
  specialKnockback[i] = s.specialKnockback;
  specialCamo[i] = s.specialCamo;
  specialRecoil[i] = s.specialRecoil || 0;
  specialPotential[i] = s.specialPotential;
  bulletKnockbackMultiplier[i] = s.bulletKnockbackMultiplier;
  bulletCamoFlashRate[i] = s.bulletCamoFlashRate;
  // Fire category (mutation-based)
  fireBurst[i] = s.fireBurst;
  fireRapid[i] = s.fireRapid;
  fireAlternating[i] = s.fireAlternating;
  fireAlarm[i] = s.fireAlarm || 0;
  alarmInnerRadius[i] = s.alarmInnerRadius ?? ALARM_DEFAULT_INNER_RADIUS;
  firePotential[i] = s.firePotential;
  bulletBurstCount[i] = s.bulletBurstCount;
  bulletBurstSpread[i] = s.bulletBurstSpread;
  bulletBurstDelay[i] = s.bulletBurstDelay ?? 40;
  bulletCooldownMultiplier[i] = s.bulletCooldownMultiplier;
  // Death category (mutation-based)
  deathLandmine[i] = s.deathLandmine;
  deathRefire[i] = s.deathRefire || 0;
  deathTerritory[i] = s.deathTerritory || 0;
  deathMound[i] = s.deathMound || 0;
  bunkerRange[i] = s.bunkerRange ?? BUNKER_DEFAULT_RANGE;
  deathPotential[i] = s.deathPotential;
  // Path category (mutation-based)
  pathHighArc[i] = s.pathHighArc;
  pathCurve[i] = s.pathCurve;
  pathAccelerate[i] = s.pathAccelerate;
  pathBlink[i] = s.pathBlink || 0;
  blinkDelay[i] = s.blinkDelay ?? BLINK_DEFAULT_DELAY;
  bulletAccelerateDelay[i] = s.bulletAccelerateDelay;
  pathPotential[i] = s.pathPotential;
  bulletArcDuration[i] = Math.max(s.bulletArcDuration ?? 200, HIGH_ARC_MIN_DURATION);
  bulletCurveStrength[i] = s.bulletCurveStrength;
  explosionProximity[i] = s.explosionProximity;
  angleFromSpawn[i] = s.angleFromSpawn;
  bulletSize[i] = s.bulletSize;
  radiusMultiplier[i] = s.radiusMultiplier;
  residueMultiplier[i] = s.residueMultiplier;
  bulletExplodeAfter[i] = s.bulletExplodeAfter;
  antSize[i] = s.antSize;
  // Gene tokens: use the custom ant's investments so its trait tokens and tier caps actually apply
  geneTokenInvestments[i] = JSON.parse(JSON.stringify(s.geneTokenInvestments || []));
  if (s.geneTokens !== undefined) geneTokens[i] = s.geneTokens;
  
  // Apply ant speed cap based on ant size (small ants = faster, large ants = slower)
  let maxAntSpeedCap = 4.5 - antSize[i];
  antSpeed[i] = min(antSpeed[i], maxAntSpeedCap);
  
  // Cap bullet size based on ant size (small ants can't have huge bullets)
  let maxBulletSize = min(3, antSize[i] + 1.0);
  bulletSize[i] = min(bulletSize[i], maxBulletSize);
  
  antMaxHealth[i] = antSize[i];
  antHealth[i] = antMaxHealth[i];
  
  // Set derived boolean values
  if (Math.round(autonomy[i]) === 0){
    followTarget[i] = true;
    keepDistance[i] = false;
  } else if (Math.round(autonomy[i]) === 1){
    followTarget[i] = false;
    keepDistance[i] = true;
  }
  // Set explosion flags based on genetics
  const specialType = getSpecialType(i);
  if (specialType === 0){
    // No special bullet behavior
    explodeOnTermination[i] = false;
    triggerExplodeViaProximity[i] = false;
  } else if (specialType === 1){
    // Type 1 = Explosions - check trigger type via specialExplosion value
    if (specialExplosion[i] < 1){
      // Time-based explosion (specialExplosion < 1)
      explodeOnTermination[i] = true;
      triggerExplodeViaProximity[i] = false;
    } else {
      // Proximity-based explosion (specialExplosion >= 1)
      explodeOnTermination[i] = false;
      triggerExplodeViaProximity[i] = true;
    }
  } else {
    // Knockback (-1), Camouflage (2), Ghost (-2), Recoil (3), or Launch (-3): no explosions
    explodeOnTermination[i] = false;
    triggerExplodeViaProximity[i] = false;
  }
  if (Math.round(followValue[i]) === 0){
    followAnt[i] = false;
    followBeetle[i] = true;
    findLocation[i] = false;
    standStill[i] = false;
  } else if (Math.round(followValue[i]) === 1) {
    followAnt[i] = true;
    followBeetle[i] = false;
    findLocation[i] = false;
    standStill[i] = false;
  } else if (Math.round(followValue[i]) === 2) {
    followAnt[i] = false;
    followBeetle[i] = false;
    findLocation[i] = true;
    standStill[i] = false;
  } else if (Math.round(followValue[i]) === 3) {
    followAnt[i] = false;
    followBeetle[i] = false;
    findLocation[i] = false;
    standStill[i] = true;
  }
  
  debugLog(`Ant ${i} final stats: speed=${bulletSpeed[i]}, cooldown=${bulletCooldown[i]}, antSpeed=${antSpeed[i]}`);
}

// The genes and state every ant starts a run with (the same values setup() gives the first ants)
function resetAntToStartingGenes(i) {
  bulletSpeed[i] = 260; // Above first cap (250) for inverse stat
  bulletCooldown[i] = 160; // Above first cap (150) for inverse stat
  antSpeed[i] = 1.95;
  bulletSize[i] = 1;
  shotOffsetX[i] = 0;
  shotOffsetY[i] = 0;
  standingPointX[i] = width / 2;
  standingPointY[i] = height / 2;
  distanceFromAnchor[i] = 200;
  anchorOffsetX[i] = 0;
  anchorOffsetY[i] = 0;
  angleFromSpawn[i] = PI;
  bulletSplitCount[i] = 1;
  bulletSpread[i] = 0;
  bulletExplodeAfter[i] = 200;
  radiusMultiplier[i] = 1;
  residueMultiplier[i] = 1;
  explosionProximity[i] = 200;
  specialExplosion[i] = 0.2;
  specialKnockback[i] = 0.2;
  specialCamo[i] = 0.2;
  specialRecoil[i] = 0.2;
  specialPotential[i] = 0.3;
  bulletKnockbackMultiplier[i] = 2;
  bulletCamoFlashRate[i] = 2.5;
  fireBurst[i] = 0.1;
  fireRapid[i] = 0.1;
  fireAlternating[i] = 0.1;
  fireAlarm[i] = 0.1;
  alarmInnerRadius[i] = ALARM_DEFAULT_INNER_RADIUS;
  firePotential[i] = 0.3;
  bulletBurstCount[i] = 2;
  bulletBurstSpread[i] = 1.5; // Below first cap (2.0)
  bulletBurstDelay[i] = 40;
  bulletCooldownMultiplier[i] = 2;
  deathLandmine[i] = 0.3;
  deathRefire[i] = 0.2;
  deathTerritory[i] = 0.2;
  deathMound[i] = 0.2;
  bunkerRange[i] = BUNKER_DEFAULT_RANGE;
  deathPotential[i] = 0.3;
  pathHighArc[i] = 0.1;
  pathCurve[i] = 0.1;
  pathAccelerate[i] = 0.1;
  pathBlink[i] = 0.1;
  blinkDelay[i] = BLINK_DEFAULT_DELAY;
  bulletAccelerateDelay[i] = 200;
  pathPotential[i] = 0.3;
  bulletArcDuration[i] = 200;
  bulletCurveStrength[i] = 0.015;
  explodeOnTermination[i] = false;
  triggerExplodeViaProximity[i] = false;
  // Fresh runtime state
  enemyBullets[i] = [];
  antPoints[i] = 0;
  antLives[i] = 1;
  antKnockedBack[i] = false;
  antKnockbackTimer[i] = 0;
  antKnockbackVelX[i] = 0;
  antKnockbackVelY[i] = 0;
  antStunned[i] = false;
  antStunTimer[i] = 0;
  antLastShotFrame[i] = 0;
  antAlternatingCooldownState[i] = 0;
  antRapidFireActive[i] = false;
  antRapidFireCount[i] = 0;
  antRapidFireNextFrame[i] = 0;
  antAirHeight[i] = 0;
  antRecoilVelX[i] = 0;
  antRecoilVelY[i] = 0;
  antRecoilAirTimer[i] = 0;
  antShield[i] = 0;
  antInBunker[i] = null;
  antDormant[i] = false;
}

function applyDifficultyToInitialPopulation() {
  if (devToolsUseCustomAnts) return;

  let sizeValue = 1;
  let followValueSetting = 0;
  let autonomySetting = 0;

  const tier = getDifficultyTier();
  if (tier === 'easy') {
    sizeValue = 1;
    followValueSetting = 0;
    autonomySetting = 0;
  } else if (tier === 'medium') {
    sizeValue = 1;
    followValueSetting = 0;
    autonomySetting = 1;
  } else if (tier === 'hard') {
    sizeValue = 0.5;
    followValueSetting = 0;
    autonomySetting = 1;
  } else if (tier === 'insane') {
    sizeValue = 0.33;
    followValueSetting = 0;
    autonomySetting = 1;
  }

  let neededAnts = 0;
  let usedSlots = 0;
  while (neededAnts < 500) {
    if (usedSlots + sizeValue > totalAntSlots + 0.001) break;
    usedSlots += sizeValue;
    neededAnts++;
  }

  if (neededAnts < 1) neededAnts = 1;

  if (neededAnts > enemyCount) {
    for (let i = enemyCount + 1; i <= neededAnts; i++) {
      antX[i] = random(0, getGameplayWidth());
      antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
      antPrevX[i] = antX[i];
      antPrevY[i] = antY[i];
      enemyBullets[i] = [];
      antPoints[i] = 0;
      antLives[i] = 1;
    }
  }

  enemyCount = neededAnts;
  playerSpeed = movementSpeed / enemyCount;

  for (let i = 1; i <= enemyCount; i++) {
    // Every run starts from the same fresh ants, whatever the last run (or the tutorial) left behind
    resetAntToStartingGenes(i);

    antSize[i] = sizeValue;
    followValue[i] = followValueSetting;
    autonomy[i] = autonomySetting;

    let maxAntSpeed = 4.5 - antSize[i];
    antSpeed[i] = min(antSpeed[i], maxAntSpeed);
    let maxBulletSize = min(3, antSize[i] + 1.0);
    bulletSize[i] = min(bulletSize[i], maxBulletSize);

    antMaxHealth[i] = antSize[i];
    antHealth[i] = antMaxHealth[i];

    if (Math.round(autonomy[i]) === 0){
      followTarget[i] = true;
      keepDistance[i] = false;
    } else if (Math.round(autonomy[i]) === 1){
      followTarget[i] = false;
      keepDistance[i] = true;
    }

    if (Math.round(followValue[i]) === 0){
      followAnt[i] = false;
      followBeetle[i] = true;
      findLocation[i] = false;
      standStill[i] = false;
    } else if (Math.round(followValue[i]) === 1) {
      followAnt[i] = true;
      followBeetle[i] = false;
      findLocation[i] = false;
      standStill[i] = false;
    } else if (Math.round(followValue[i]) === 2) {
      followAnt[i] = false;
      followBeetle[i] = false;
      findLocation[i] = true;
      standStill[i] = false;
    } else if (Math.round(followValue[i]) === 3) {
      followAnt[i] = false;
      followBeetle[i] = false;
      findLocation[i] = false;
      standStill[i] = true;
    }

    geneTokens[i] = getInitialTokensForDifficulty();
    geneTokenInvestments[i] = [];
    geneTokenLastRoundGained[i] = 0;
  }

  for (let i = 1; i <= enemyCount; i++) {
    let investmentAttempts = 0;
    const maxAttempts = 10;
    while (geneTokens[i] > 0 && investmentAttempts < maxAttempts) {
      let tokensBefore = geneTokens[i];
      evaluateAndAllocateTokens(i, 0, true);
      if (geneTokens[i] === tokensBefore) break;
      investmentAttempts++;
    }

    if (getDifficultyTier() === 'hard' || getDifficultyTier() === 'insane') {
      geneTokens[i]++; // Extra token for random initial ability
      applyHardModeRandomInitialAbility(i);
    }
  }

  debugLog(`Applied difficulty ${difficulty} (${getDifficultyTier()}): ${enemyCount} ants, size=${sizeValue}, follow=${followValueSetting}, autonomy=${autonomySetting}`);
}

function syncActualWinnersToCustomStats(topAnts) {
  // Update customAntStats to reflect the actual top 3 performing ants
  // This allows users to see what the winners looked like in dev tools
  for (let i = 0; i < Math.min(3, topAnts.length); i++) {
    let antId = topAnts[i].id;
    if (antId >= 1 && antId <= enemyCount) {
      customAntStats[i] = snapshotAntStats(antId);
    }
  }
  debugLog("Synced actual winners to custom ant stats for viewing");
}

// Everything that makes ant `antId` what it is, as a plain object (the same shape as customAntStats)
function snapshotAntStats(antId) {
  return {
        bulletSpeed: bulletSpeed[antId],
        bulletCooldown: bulletCooldown[antId],
        antSpeed: antSpeed[antId],
        shotOffsetX: shotOffsetX[antId],
        shotOffsetY: shotOffsetY[antId],
        standingPointX: standingPointX[antId],
        standingPointY: standingPointY[antId],
        followValue: followValue[antId],
        autonomy: autonomy[antId],
        distanceFromAnchor: distanceFromAnchor[antId],
        anchorOffsetX: anchorOffsetX[antId],
        anchorOffsetY: anchorOffsetY[antId],
        // Special category (mutation-based)
        specialExplosion: specialExplosion[antId],
        specialKnockback: specialKnockback[antId],
        specialCamo: specialCamo[antId],
        specialRecoil: specialRecoil[antId],
        specialPotential: specialPotential[antId],
        bulletKnockbackMultiplier: bulletKnockbackMultiplier[antId],
        bulletCamoFlashRate: bulletCamoFlashRate[antId],
        // Fire category (mutation-based)
        fireBurst: fireBurst[antId],
        fireRapid: fireRapid[antId],
        fireAlternating: fireAlternating[antId],
        fireAlarm: fireAlarm[antId],
        alarmInnerRadius: alarmInnerRadius[antId],
        firePotential: firePotential[antId],
        bulletBurstCount: bulletBurstCount[antId],
        bulletBurstSpread: bulletBurstSpread[antId],
        bulletBurstDelay: bulletBurstDelay[antId],
        bulletCooldownMultiplier: bulletCooldownMultiplier[antId],
        // Death category (mutation-based)
        deathLandmine: deathLandmine[antId],
        deathRefire: deathRefire[antId],
        deathTerritory: deathTerritory[antId],
        deathMound: deathMound[antId],
        bunkerRange: bunkerRange[antId],
        deathPotential: deathPotential[antId],
        // Path category (mutation-based)
        pathHighArc: pathHighArc[antId],
        pathCurve: pathCurve[antId],
        pathAccelerate: pathAccelerate[antId],
        pathBlink: pathBlink[antId],
        blinkDelay: blinkDelay[antId],
        bulletAccelerateDelay: bulletAccelerateDelay[antId],
        pathPotential: pathPotential[antId],
        bulletArcDuration: bulletArcDuration[antId],
        bulletCurveStrength: bulletCurveStrength[antId],
        explosionProximity: explosionProximity[antId],
        angleFromSpawn: angleFromSpawn[antId],
        bulletSize: bulletSize[antId],
        radiusMultiplier: radiusMultiplier[antId],
        residueMultiplier: residueMultiplier[antId],
        bulletExplodeAfter: bulletExplodeAfter[antId],
        antSize: antSize[antId],
        // Gene Token System
        geneTokens: geneTokens[antId],
        geneTokenInvestments: JSON.parse(JSON.stringify(geneTokenInvestments[antId] || [])), // Deep copy
        geneTokenLastRoundGained: geneTokenLastRoundGained[antId]
  };
}

function returnToMainMenu() {
  resetRunState();
  antdex = false;
  queenShopMenu = false;
  start = false;
  startMenu = true;
  difficultyMenu = false;
  pendingGameMode = null;
  antdexReturnState = 'menu';
  endmusic.stop();
  gamemusic.stop();
  if (!titlemusic.isPlaying()) {
    titlemusic.play();
  }
}

// Menu scaling helpers - makes menus act like 1280x652 while filling screen
const MENU_REFERENCE_WIDTH = 1280;
const MENU_REFERENCE_HEIGHT = 652;

function beginMenuScaling() {
  push();
  let scaleX = windowWidth / MENU_REFERENCE_WIDTH;
  let scaleY = windowHeight / MENU_REFERENCE_HEIGHT;
  scale(scaleX, scaleY);
  if (menuSlideY !== 0) translate(0, menuSlideY);
}

function endMenuScaling() {
  pop();
}

// Get scaled menu dimensions (use these instead of windowWidth/windowHeight in menus)
function getMenuWidth() {
  return MENU_REFERENCE_WIDTH;
}

function getMenuHeight() {
  return MENU_REFERENCE_HEIGHT;
}

// Get scaled mouse coordinates for menu interactions
function getMenuMouseX() {
  let scaleX = windowWidth / MENU_REFERENCE_WIDTH;
  return mouseX / scaleX;
}

function getMenuMouseY() {
  let scaleY = windowHeight / MENU_REFERENCE_HEIGHT;
  return mouseY / scaleY;
}

// Gameplay scaling helpers - reference size changes based on level
function getGameplayReferenceWidth() {
  if (isFinalLevel()) return 1280; // The nest is always the full-size arena
  if (level <= 3) {
    return 853;
  } else if (level <= 7) {
    return 1024;
  } else {
    return 1280;
  }
}

function getGameplayReferenceHeight() {
  if (isFinalLevel()) return 652;
  if (level <= 3) {
    return 435;
  } else if (level <= 7) {
    return 522;
  } else {
    return 652;
  }
}

function beginGameplayScaling() {
  push();
  let refWidth = getGameplayReferenceWidth();
  let refHeight = getGameplayReferenceHeight();
  let scaleX = windowWidth / refWidth;
  let scaleY = windowHeight / refHeight;
  scale(scaleX, scaleY);
  const shake = getScreenShake();
  if (shake.x !== 0 || shake.y !== 0) translate(shake.x, shake.y);
}

function endGameplayScaling() {
  pop();
}

// Put the beetle in the middle of the playable area. Gameplay runs in the current
// round's reference size (not window pixels), so call this after level is set.
function centerPlayer() {
  playerX = getGameplayWidth() / 2;
  playerY = (scoreBarHeight + getGameplayHeight() - expBarHeight) / 2;
  playerPrevX = playerX;
  playerPrevY = playerY;
}

// Get scaled gameplay dimensions
function getGameplayWidth() {
  return getGameplayReferenceWidth();
}

function getGameplayHeight() {
  return getGameplayReferenceHeight();
}

// Get scaled mouse coordinates for gameplay interactions
function getGameplayMouseX() {
  let refWidth = getGameplayReferenceWidth();
  let scaleX = windowWidth / refWidth;
  return mouseX / scaleX;
}

function getGameplayMouseY() {
  let refHeight = getGameplayReferenceHeight();
  let scaleY = windowHeight / refHeight;
  return mouseY / scaleY;
}

// Solid clay-soil orange. Deep enough to read as dirt, but its mid brightness
// still separates it from the bright reds, blues and greens drawn on top.
function drawBackground() {
  // Orange at the forest's edge, darker and more purple the deeper into ant territory (see map.js)
  const c = getGroundColor();
  background(c[0], c[1], c[2]);
  if (typeof drawFinalArenaBackground === 'function') drawFinalArenaBackground();
}

// Track the high score and count down the round timer (the on-screen scoreboard is gone)
function updateScoreAndTimer() {
  highScore = getItem('newHighScore');
  if (highScore == null) {
    highScore = 0;
  }

  // Calculate current run score based on mode
  let currentRunScore;
  if (multiplayerMode && players.length > 0) {
    currentRunScore = players[currentPlayerIndex].totalScore + score;
  } else {
    currentRunScore = totalScore + score;
  }
  
  // Only update high score in single player mode during gameplay (and not when game is over)
  if (!multiplayerMode && !end && currentRunScore > highScore) {
    highScore = currentRunScore;
    storeItem('newHighScore', highScore);
  }
  if (!end) {
    updateDifficultyRecord(currentRunScore, level);
  }

  // The round timer stops while a queen is out: only killing her ends the round
  if (!end && !isQueenFight()) {
    timeCount -= (1 / 100);
  }
}

// Round timer in the upper left corner; turns red for the last 3 seconds
function drawRoundTimer() {
  if (isTutorialRun() && tutorial.stage < TUTORIAL_LAST_ROUND && !isQueenFight()) return; // Tutorial rounds end on what you do
  let secondsLeft = max(0, round(timeCount));
  push();
  textAlign(LEFT, TOP);
  textSize(32);
  stroke(0);
  strokeWeight(4);
  if (isQueenFight()) {
    fill(220, 150, 255);
    text('QUEEN', 18, 14);
    pop();
    return;
  }
  if (secondsLeft <= 3 && !end) {
    fill(255, 70, 50);
  } else {
    fill(255);
  }
  text(secondsLeft, 18, 14);
  pop();
}

// EXP needed for the next level, after Increased Metabolism's discount
function getExpRequired() {
  return Math.round(expRequired * (1 - 0.1 * upgrade22Level));
}

// Add EXP rounded to a whole number
function addExp(amount) {
  amount = Math.round(amount);
  expProgress += amount;

  // Check if upgrade should be available
  if (expProgress >= getExpRequired() && !upgradeAvailable) {
    upgradeAvailable = true;
    // Don't auto-level - wait for upgrade selection at round end
  }
}

// Award points for a kill; the same amount goes to both score and EXP. basePoints is
// before size scaling; source is 'dash', 'shockwave', 'bullet', or null. Returns the points gained.
function addKillScore(basePoints, size, source) {
  // Runt Hunter: ants smaller than normal give points inversely proportional to size
  let sizeFactor = (upgrade21Level > 0 && size < 1) ? 1 / size : size;
  let multiplier = 1 + 0.1 * upgrade23Level;  // EXP Boost
  if (source === 'dash' && upgrade25Level > 0) multiplier *= 2;
  if (source === 'shockwave' && upgrade26Level > 0) multiplier *= 2;
  if (source === 'bullet' && upgrade27Level > 0) multiplier *= 2;
  let points = Math.round(basePoints * sizeFactor * multiplier);
  score += points;
  onTutorialKill(source);
  addExp(isPlayerAphidActive('exp') ? points * 2 : points); // Experience aphid: double EXP (not score)
  return points;
}

function drawStrikes(){
  // Skip rendering if Tiger Beetle is active and moving
  if (tigerBeetleActive && tigerBeetleMoving) {
    return;
  }
  
  if(drawStrike1[enemyIndex] == 1){
  push();
    image(beetleHit, strikeX[enemyIndex], strikeY[enemyIndex], 150, 150);
    strikeTime1[enemyIndex]--;
    if(strikeTime1[enemyIndex] <= 0) {
      drawStrike1[enemyIndex] = 0;
    }
  pop();
  }
}

function drawEnemy(){
  //enemy one
  for (let i = 1; i < enemyCount + 1; i++) {
    if (antDormant[i]) continue;
    // Check if this ant should be visible
    let shouldDraw = true;
    let fadeAmount = 255;
    if (tigerBeetleActive && tigerBeetleMoving) {
      // Check if this ant is in the flashing entities list
      shouldDraw = false;
      for (let f = 0; f < flashingEntities.length; f++) {
        if (flashingEntities[f].type === 'ant' && flashingEntities[f].index === i) {
          shouldDraw = true;
          fadeAmount = flashingEntities[f].fade;
          break;
        }
      }
    }

    // Ghost stream ants turn invisible before they spray and stay hidden while spraying
    const ghostAlpha = getAntStreamGhostAlpha(i);
    if (ghostAlpha <= 0.01) shouldDraw = false;
    fadeAmount *= ghostAlpha;

    // Ants hiding in a bunker can't be seen at all (bunkers are blind holes)
    if (antInBunker[i]) shouldDraw = false;

    if (shouldDraw) {
      // Ground shadow; shrinks and lightens as the ant rises
      let antShadowHeight = constrain(antAirHeight[i], 0, 30);
      let antShadowAlpha = map(antShadowHeight, 0, 30, 80, 40) * (fadeAmount / 255);
      let antShadowScale = (45 + (15 * antSize[i])) * map(antShadowHeight, 0, 30, 1, 0.75);
      angleMode(DEGREES);
      let antShadowAngle = atan2(playerY - antY[i], playerX - antX[i]);
      drawGroundShadow(antX[i], antY[i], antShadowScale * 0.6, antShadowScale * 0.26, antShadowAngle, antShadowAlpha);

      push();
        // Apply fade if Tiger Beetle is active (or a ghost stream ant is fading)
        if ((tigerBeetleActive && tigerBeetleMoving) || ghostAlpha < 1) {
          tint(255, fadeAmount);
        }
        angleMode(DEGREES)
        imageMode(CENTER);
        // Offset ant visual position upward when airborne
        translate(antX[i], antY[i] - antAirHeight[i]);
        let a = atan2(playerY - antY[i], playerX - antX[i]);
        rotate(a);
        let antImageSize = 45 + (15 * antSize[i]);
        image(ant, 0, 0, antImageSize, antImageSize);
      pop();

      // Nest shield: a light blue bubble that fills in as the shield grows
      if (hasAntShield(i)) {
        push();
        const shieldAmount = antShield[i];
        fill(120, 200, 255, 40 * shieldAmount * (fadeAmount / 255));
        stroke(150, 215, 255, (90 + 140 * shieldAmount) * (fadeAmount / 255));
        strokeWeight(1 + 1.5 * shieldAmount);
        ellipse(antX[i], antY[i] - antAirHeight[i], antImageSize * 0.95);
        pop();
      }

      // Alarm ant with the beetle in range: a pulsing ring, orange in the outer radius and red in the inner one
      const alarmBoost = getAlarmBoost(i);
      if (alarmBoost > 1) {
        push();
        noFill();
        const alarmPulse = 0.5 + 0.5 * Math.sin(frameCount * (alarmBoost >= ALARM_INNER_BOOST ? 0.6 : 0.3));
        if (alarmBoost >= ALARM_INNER_BOOST) stroke(255, 60, 40, (120 + 120 * alarmPulse) * (fadeAmount / 255));
        else stroke(255, 170, 40, (90 + 110 * alarmPulse) * (fadeAmount / 255));
        strokeWeight(2);
        ellipse(antX[i], antY[i] - antAirHeight[i], antImageSize * (0.75 + 0.1 * alarmPulse));
        pop();
      }

      // Hit reload ant: white flash after its bullet hits; the ant refires as the flash ends
      if (antHitReloadFlashFrame[i] !== undefined) {
        let flashAge = frameCount - antHitReloadFlashFrame[i];
        if (flashAge >= 0 && flashAge < HIT_RELOAD_FLASH_FRAMES) {
          let flashT = flashAge / HIT_RELOAD_FLASH_FRAMES;
          push();
          noStroke();
          fill(255, 255, 255, 200 * (1 - flashT));
          ellipse(antX[i], antY[i] - antAirHeight[i], antImageSize * lerp(0.5, 0.9, flashT));
          pop();
        }
      }

      // Small ant: blue pulsing aura
      if (antSize[i] < 0.8 && antHealth[i] >= 1) {
        push();
        noStroke();
        let smallFlashSpeed = map(antSize[i], 0.8, 0.3, 3, 12);
        let smallFlashAlpha = 83 + 70 * sin(frameCount * smallFlashSpeed * 0.05);
        fill(80, 150, 255, smallFlashAlpha * ghostAlpha);
        let smallAuraSize = antImageSize * 0.75;
        ellipse(antX[i], antY[i] - antAirHeight[i], smallAuraSize, smallAuraSize);
        pop();
      }

      // Health bar (appears for 1 second after getting hit)
      drawHitHealthBar(antX[i], antY[i] - antAirHeight[i] + antImageSize * 0.35, antHealth[i], antMaxHealth[i], antLastHitTime[i]);

      // Draw yellow circles if ant is stunned
      if (antStunned[i]) {
        push();
        translate(antX[i], antY[i]);
        noStroke();
        fill(255, 255, 0); // Yellow color
        
        // Draw 5 circles rotating around the ant
        let circleCount = 5;
        let radius = antImageSize * 0.35; // Closer to ant
        let rotationOffset = frameCount * 2; // Rotate circles over time
        
        for (let s = 0; s < circleCount; s++) {
          let circleAngle = (360 / circleCount) * s + rotationOffset;
          let circleX = cos(circleAngle) * radius;
          let circleY = sin(circleAngle) * radius + sin(frameCount * 3 + s * 60) * 5; // Bob up and down
          
          // Draw circle
          ellipse(circleX, circleY, 6, 6); // 6 pixel diameter circles
        }
        pop();
      }
    }


  }
  //debugLog(enemyIndex);
}

// Health bar shown for 1 second after something gets hit (ants, mounds and bunkers), centered on x with its top
// at barY. Color by health left: red (<=1, an ant can be run over), yellow (1-1.5), yellow->green (1.5-2),
// green->blue (2-3).
function drawHitHealthBar(x, barY, health, maxHealth, lastHitTime) {
  if (!(lastHitTime > 0)) return;
  let timeSinceHit = millis() - lastHitTime;
  let fadeTime = 1000; // 1 second
  if (timeSinceHit >= fadeTime) return;

  push();
  let fadeFactor = map(timeSinceHit, 0, fadeTime, 1, 0);

  // Health bar dimensions (match dash/shockwave style)
  let barWidth = 30;
  let barHeight = 5;
  let healthPercent = constrain(health / maxHealth, 0, 1);

  // Background (dark grey - match dash/shockwave)
  fill(50, 50, 50, 220 * fadeFactor);
  stroke(0, 255 * fadeFactor);
  strokeWeight(1);
  rect(x - barWidth / 2, barY, barWidth, barHeight, 2);

  let barColor;
  if (health <= 1) {
    barColor = color(255, 50, 50); // Red
  } else if (health < 1.5) {
    // Yellow
    barColor = color(255, 220, 50);
  } else if (health < 2) {
    // Yellow to green gradient (1.5 to 2)
    let greenAmount = map(health, 1.5, 2, 0, 1, true);
    barColor = lerpColor(color(255, 220, 50), color(50, 255, 50), greenAmount);
  } else {
    // Green to blue gradient (2 to 3)
    let blueAmount = map(health, 2, 3, 0, 1, true);
    barColor = lerpColor(color(50, 255, 50), color(50, 150, 255), blueAmount);
  }

  // Fill (match dash/shockwave style with rounded corners)
  fill(red(barColor), green(barColor), blue(barColor), 240 * fadeFactor);
  stroke(0, 255 * fadeFactor);
  strokeWeight(1);
  rect(x - barWidth / 2, barY, barWidth * healthPercent, barHeight, 2);
  pop();
}

// Soft oval under a sprite, matching the bullet shadow style. Sized to the bug's body
// (not its image frame), rotated with it, and nudged a few pixels down-right.
function drawGroundShadow(x, y, w, h, angle, alpha, offsetX = 2, offsetY = 3) {
  push();
  angleMode(DEGREES);
  ellipseMode(CENTER);
  noStroke();
  fill(0, 0, 0, alpha);
  translate(x + offsetX, y + offsetY);
  rotate(angle);
  ellipse(0, 0, w, h);
  pop();
}

let beetleShadowW = null;
let beetleShadowH = null;

// Half the visible size of each icon (the PNGs are mostly transparent padding)
const BULLET_ICON_HALF = 5;
const SHIELD_ICON_HALF = 9;

// How far to shift icons spanning [left, right] (relative to the beetle) so they stay on screen
function iconGridShiftX(left, right) {
  let margin = 2;
  if (playerX + left < margin) return margin - (playerX + left);
  if (playerX + right > getGameplayWidth() - margin) return getGameplayWidth() - margin - (playerX + right);
  return 0;
}

// One stretched ammo spanning two ammo slots, in the current shot mode's color (bombs get their
// type's color in the center). Matches the acid icon's look: black outline, lighter highlight.
function drawSpecialAmmo(cx, cy, slotSpacing, full) {
  let mode = SHOT_MODES[shotMode];
  let h = 9.4; // Height of the dot inside the 50px acid icon
  let w = h + slotSpacing;
  push();
  rectMode(CENTER);
  stroke(0);
  strokeWeight(1.5);
  if (full) {
    fill(mode.color[0], mode.color[1], mode.color[2]);
  } else {
    fill(lerp(77, mode.color[0], 0.3), lerp(77, mode.color[1], 0.3), lerp(77, mode.color[2], 0.3)); // Reloading
  }
  rect(cx, cy, w, h, h / 2);
  noStroke();
  if (mode.center) {
    fill(mode.center[0], mode.center[1], mode.center[2], full ? 255 : 110);
    ellipse(cx, cy, 4.5, 4.5);
  } else if (full) {
    fill(255, 255, 255, 110);
    rect(cx + 1.5, cy - 1.5, w - 7, 2, 1);
  }
  pop();
}

// Mode menu: the mode just switched away from, the selected mode, and the next one in the cycle,
// each with its color. Right-aligned at rightX (beetle-local coords) and centered on centerY.
function drawShotModeMenu(rightX, centerY) {
  shotModeMenuScroll *= 0.7;
  if (shotModeMenuScroll < 0.01) shotModeMenuScroll = 0;
  drawCycleMenu(rightX, centerY, SHOT_MODES, shotModePrev, shotMode, getNextShotMode(shotMode),
    min(1, shotModeMenuTimer / 10), shotModeMenuScroll);
}

// The same menu for shockwave variants
function drawShockwaveVariantMenu(rightX, centerY) {
  shockwaveVariantMenuScroll *= 0.7;
  if (shockwaveVariantMenuScroll < 0.01) shockwaveVariantMenuScroll = 0;
  drawCycleMenu(rightX, centerY, SHOCKWAVE_VARIANTS, shockwaveVariantPrev, shockwaveVariant,
    getNextShockwaveVariant(shockwaveVariant), min(1, shockwaveVariantMenuTimer / 10), shockwaveVariantMenuScroll);
}

// defs: entries with name, color and optional center color. alpha fades it out; scroll eases the rows into place.
function drawCycleMenu(rightX, centerY, defs, prev, current, next, alpha, scroll) {
  let rowH = 11;
  let swatch = 6;

  let rows = [
    { mode: prev, offset: -1 },
    { mode: current, offset: 0 },
    { mode: next, offset: 1 }
  ];

  push();
  textSize(9);
  textStyle(BOLD);
  let textW = 0;
  for (let r of rows) textW = max(textW, textWidth(defs[r.mode].name));
  let menuW = textW + swatch + 12;
  let menuH = rowH * 3 + 4;
  rightX += iconGridShiftX(rightX - menuW, rightX); // Stay inside the left/right edges
  let leftX = rightX - menuW;

  rectMode(CORNER);
  noStroke();
  fill(0, 0, 0, 140 * alpha);
  rect(leftX, centerY - menuH / 2, menuW, menuH, 4);

  // Clip so rows scrolling in and out don't spill past the panel
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(leftX, centerY - menuH / 2, menuW, menuH);
  drawingContext.clip();

  textAlign(RIGHT, CENTER);
  for (let r of rows) {
    let y = centerY + (r.offset + scroll) * rowH;
    let m = defs[r.mode];
    let selected = r.offset === 0;
    let rowAlpha = (selected ? 255 : 120) * alpha;
    let swatchX = rightX - 4 - swatch / 2;

    stroke(0, rowAlpha);
    strokeWeight(1);
    fill(m.color[0], m.color[1], m.color[2], rowAlpha);
    ellipse(swatchX, y, swatch, swatch);
    if (m.center) {
      noStroke();
      fill(m.center[0], m.center[1], m.center[2], rowAlpha);
      ellipse(swatchX, y, 2.5, 2.5);
    }

    noStroke();
    fill(255, rowAlpha);
    text(m.name, swatchX - swatch / 2 - 3, y);
  }
  drawingContext.restore();
  pop();
}

// Upright shadow centered under the beetle: wider when it faces sideways, taller when it
// faces up/down. Dimensions ease toward their target so sharp turns don't snap it.
// Drawn on its own so it stays on the ground under the bullets while the beetle flies over them.
function drawBeetleShadow() {
  if (playerBunker) return; // Down in the hole
  angleMode(DEGREES);
  let beetleShadowAngle = (isAiming && freeAimEnabled) ? aimAngle : playerRotationValue;
  let horizontalness = abs(cos(beetleShadowAngle));
  let targetW = 130 * lerp(0.34, 0.46, horizontalness);
  let targetH = 130 * lerp(0.46, 0.34, horizontalness);
  if (beetleShadowW === null) {
    beetleShadowW = targetW;
    beetleShadowH = targetH;
  }
  beetleShadowW = lerp(beetleShadowW, targetW, 0.15);
  beetleShadowH = lerp(beetleShadowH, targetH, 0.15);
  drawGroundShadow(playerX, playerY, beetleShadowW, beetleShadowH, 0, 90, 0, 9);
}

function drawBeetle(){
  push();
    angleMode(DEGREES)
    imageMode(CENTER);
    translate(playerX, playerY);
    push()
      // When aiming, use aimAngle; otherwise use playerRotationValue
      // Both are in degrees thanks to angleMode(DEGREES) affecting atan2
      let facing = (isAiming && freeAimEnabled) ? aimAngle : playerRotationValue;
      if (playerBunker) {
        // Hidden in the bunker: only a small arrow on the rim shows which way it's facing
        rotate(facing);
        let rimR = playerBunker.radius * 1.15 + 4;
        stroke(0, 200);
        strokeWeight(1.5);
        fill(120, 230, 60);
        triangle(rimR + 10, 0, rimR, -6, rimR, 6);
      } else {
        // Flying: lifted off its shadow and drawn a little bigger (shaking while it winds up the slam)
        let lift = getPlayerFlightHeight();
        let shake = getSlamWindupShake();
        translate(shake.x, shake.y - lift);
        rotate(facing);
        let beetleScale = 1 + lift / 100;
        image(beetle, 0, 0, 130 * beetleScale, 130 * beetleScale);
      }
    pop()

    // Shot icons on left side - dynamic 4x4 grid (up to 16 bullets)
    let maxBullets = bulletQuantity > 0 ? bulletQuantity : 0; // No bullets until upgrade
    let maxShields = shieldQuantity > 0 ? shieldQuantity : 0; // No shields until upgrade
    let bulletIconSize = 50;
    let bulletSpacing = 10;
    let shieldIconSize = 30;
    let shieldSpacing = 20;

    let bulletStartY = -50;
    let shieldStartY = -50;

    // Slide both grids together so they stay inside the left/right edges
    let bulletStartX = -55;
    let shieldStartX = 30;
    let iconsLeft = maxBullets > 0 ? bulletStartX - BULLET_ICON_HALF : shieldStartX - SHIELD_ICON_HALF;
    let iconsRight = maxShields > 0
      ? shieldStartX + (Math.min(maxShields, 3) - 1) * shieldSpacing + SHIELD_ICON_HALF
      : bulletStartX + (Math.min(maxBullets, 4) - 1) * bulletSpacing + BULLET_ICON_HALF;
    let iconsShiftX = iconGridShiftX(iconsLeft, iconsRight);
    bulletStartX += iconsShiftX;
    shieldStartX += iconsShiftX;

    // In a special shot mode the whole grid shows special ammo: every pair of slots becomes one
    // stretched ammo in the mode's color, since a special shot uses 2 at once. Pairs start on even
    // slots, so they never straddle two rows of the 4-column grid.
    let specialAmmoGrid = shotMode !== SHOT_MODE_DEFAULT;

    for (let i = 0; i < maxBullets; i++) {
      let col = i % 4;  // 4 columns
      let row = Math.floor(i / 4);  // 4 rows max
      let bx = bulletStartX + col * bulletSpacing;
      let by = bulletStartY + row * bulletSpacing;

      if (specialAmmoGrid && i - (i % 2) + 1 < maxBullets) {
        if (i % 2 === 0) {
          drawSpecialAmmo(bx + bulletSpacing / 2, by, bulletSpacing, shot >= i + SPECIAL_SHOT_AMMO_COST);
        }
        // Odd slots are covered by the pair's stretched ammo
      } else if (shot >= i + 1) {
        image(acidFull, bx, by, bulletIconSize, bulletIconSize);
      } else {
        image(acidEmpty, bx, by, bulletIconSize, bulletIconSize);
      }
    }

    // Shot mode menu to the left of the ammo grid
    if (shotModeMenuTimer > 0 && maxBullets > 0) {
      drawShotModeMenu(bulletStartX - BULLET_ICON_HALF - 6, bulletStartY);
    }

    // Shield icons on right side - dynamic 3x3 grid (up to 9 shields)
    for (let i = 0; i < maxShields; i++) {
      let col = i % 3;  // 3 columns
      let row = Math.floor(i / 3);  // 3 rows max
      let sx = shieldStartX + col * shieldSpacing;
      let sy = shieldStartY + row * shieldSpacing;
      
      if (shield > i) {
        image(shieldFull, sx, sy, shieldIconSize, shieldIconSize);
      } else {
        image(shieldEmpty, sx, sy, shieldIconSize, shieldIconSize);
      }
    }
    
    // Shockwave attack visual effect (drawn before cooldown bars, underneath beetle)
    if (windAttackAlpha > 0) {
      let maxRadius = 60 + (upgrade15Level * 18);
      let currentRadius = windAttackAnimRadius;
      
      // Draw expanding circle with "windy" effect (multiple circles with different opacities)
      noFill();
      strokeWeight(2);
      
      // Outer circle
      stroke(150, 150, 150, windAttackAlpha * 0.4);
      ellipse(0, 0, currentRadius * 2 + 10, currentRadius * 2 + 10);
      
      // Main circle
      stroke(120, 120, 120, windAttackAlpha * 0.7);
      ellipse(0, 0, currentRadius * 2, currentRadius * 2);
      
      // Inner circle  
      stroke(100, 100, 100, windAttackAlpha);
      strokeWeight(3);
      ellipse(0, 0, currentRadius * 2 - 10, currentRadius * 2 - 10);
      
      noStroke();
    }
    
    // Player health bar (centered under the beetle, appears briefly when health changes)
    // Under 10 health it stays up and flashes red, pulsing faster as health drops (like the scoreboard)
    let lowHealth = health < 10 && health > 0;
    if (healthBarTimer > 0 || lowHealth) {
      let healthBarWidth = 50;
      let healthAlpha = lowHealth ? 1 : min(1, healthBarTimer / HEALTH_BAR_FADE_FRAMES);
      drawPlayerHealthBar(-healthBarWidth / 2, 50, healthBarWidth, 7, healthAlpha);
    }

    // Player EXP bar right under the health bar (appears briefly when EXP changes)
    if (playerExpBarTimer > 0) {
      drawPlayerExpBar(-25, 60, 50, 4, min(1, playerExpBarTimer / HEALTH_BAR_FADE_FRAMES));
    }

    // Combo meter to the right of the health bar
    if (combo > 0 && comboTime > 0) {
      drawComboMeter();
    }

    // Dash cooldown bar below beetle
    if (dash && dashReady && tigerBeetleActive) {
      // Tiger Beetle: panning black and white stripes
      let barWidth = 30;
      let barHeight = 5;
      let barX = -50;
      let barY = 35;
      
      // Background and border
      stroke(0);
      strokeWeight(1);
      noFill();
      rect(barX, barY, barWidth, barHeight, 2);
      
      // Draw stripes using clipping
      push();
      // Create clipping mask for rounded rectangle
      drawingContext.save();
      drawingContext.beginPath();
      drawingContext.roundRect(barX, barY, barWidth, barHeight, 2);
      drawingContext.clip();
      
      // Draw alternating stripes with smooth wrapping
      let stripeWidth = 6;
      let totalStripeWidth = stripeWidth * 2; // One white + one black
      let numStripes = Math.ceil(barWidth / stripeWidth) + 2;
      noStroke();
      
      // Use modulo to wrap offset smoothly, floor for stable rendering
      let wrappedOffset = Math.floor(dashStripeOffset) % totalStripeWidth;
      
      for (let i = -1; i < numStripes; i++) {
        let x = Math.floor(barX + (i * totalStripeWidth) - wrappedOffset);
        // White stripe
        fill(255);
        rect(x, barY, stripeWidth, barHeight);
        // Black stripe
        fill(0);
        rect(x + stripeWidth, barY, stripeWidth, barHeight);
      }
      
      drawingContext.restore();
      pop();
      
      // Update stripe offset for animation (faster scroll speed)
      dashStripeOffset += 1.5;
    } else if (dash && dashReady && !tigerBeetleActive) {
      // Draining during dash (white to blue fade)
      let barWidth = 30;
      let barHeight = 5;
      let barX = -50;
      let barY = 35;
      
      let fillPercent = speedTime / 0.25; // Drain as speedTime decreases
      
      // Background (dark grey)
      fill(50, 50, 50, 220);
      stroke(0);
      strokeWeight(1);
      rect(barX, barY, barWidth, barHeight, 2);
      
      // Fill (white fading to deep blue as it drains)
      let blueAmount = map(fillPercent, 0, 1, 30, 255); // More white when full, more blue when empty
      fill(blueAmount, blueAmount + 50, 255, 240);
      stroke(0);
      strokeWeight(1);
      rect(barX, barY, barWidth * fillPercent, barHeight, 2);
    } else if (!dashReady) {
      // Filling during cooldown (deep blue)
      let barWidth = 30;
      let barHeight = 5;
      let barX = -50;
      let barY = 35;
      
      let fillPercent = 1 - (dashCoolDown / dashCooldownStat);
      
      // Background (dark grey)
      fill(50, 50, 50, 220);
      stroke(0);
      strokeWeight(1);
      rect(barX, barY, barWidth, barHeight, 2);
      
      // Fill (deep blue progress)
      fill(30, 100, 220, 240);
      stroke(0);
      strokeWeight(1);
      rect(barX, barY, barWidth * fillPercent, barHeight, 2);
    } else if (dashReadyFlash > 0) {
      // Flash white when dash becomes ready
      let barWidth = 30;
      let barHeight = 5;
      let barX = -50;
      let barY = 35;
      
      let flashAlpha = dashReadyFlash * 255;
      fill(255, 255, 255, flashAlpha);
      stroke(0);
      strokeWeight(1);
      rect(barX, barY, barWidth, barHeight, 2);
    }
    
    // Shockwave attack cooldown bar (if unlocked)
    if (upgrade14Level > 0) {
      if (!windAttackReady) {
        // Filling during cooldown (light grey)
        let barWidth = 30;
        let barHeight = 5;
        let barX = -50;
        let barY = 42; // Below dash bar
        
        let fillPercent = 1 - (windAttackCooldown / windAttackCooldownMax);
        
        // Background (dark grey)
        fill(50, 50, 50, 220);
        stroke(0);
        strokeWeight(1);
        rect(barX, barY, barWidth, barHeight, 2);
        
        // Fill (light grey progress)
        fill(180, 180, 180, 240);
        stroke(0);
        strokeWeight(1);
        rect(barX, barY, barWidth * fillPercent, barHeight, 2);
      } else if (windAttackReadyFlash > 0) {
        // Flash white when ready
        let barWidth = 30;
        let barHeight = 5;
        let barX = -50;
        let barY = 42;
        
        let flashAlpha = windAttackReadyFlash * 255;
        fill(255, 255, 255, flashAlpha);
        stroke(0);
        strokeWeight(1);
        rect(barX, barY, barWidth, barHeight, 2);
      }

      // Selected variant's color just left of the cooldown bar (none for the original shockwave)
      if (shockwaveVariant !== SHOCKWAVE_ORIGINAL) {
        let c = SHOCKWAVE_VARIANTS[shockwaveVariant].color;
        stroke(0);
        strokeWeight(1);
        fill(c[0], c[1], c[2]);
        ellipse(-55, 44.5, 5, 5);
      }

      // Time left in the air / in the bunker, draining under the cooldown bar
      let variantTimeLeft = 0;
      let variantColor = null;
      if (isPlayerFlying()) {
        variantTimeLeft = 1 - playerFlightFrame / playerFlightFrames;
        variantColor = SHOCKWAVE_VARIANTS[SHOCKWAVE_FLIGHT].color;
      } else if (playerBunker) {
        variantTimeLeft = 1 - playerBunker.life / playerBunker.maxLife;
        variantColor = [150, 110, 65];
      }
      if (variantColor) {
        fill(50, 50, 50, 220);
        stroke(0);
        strokeWeight(1);
        rect(-50, 49, 30, 4, 2);
        fill(variantColor[0], variantColor[1], variantColor[2], 240);
        rect(-50, 49, 30 * variantTimeLeft, 4, 2);
      }

      // Variant menu to the left of the cooldown bars
      if (shockwaveVariantMenuTimer > 0) {
        drawShockwaveVariantMenu(-60, 44);
      }
    }
  pop();

  // Reload shots based on bulletQuantity
  let maxShots = bulletQuantity > 0 ? bulletQuantity : 0;
  if (shot < maxShots){
    shot = shot + getPlayerRegenMultiplier() / bulletReloadRate;
  }

}

// Freeze the next gameplay frame and count down 3-2-1 before play starts
// Round outro: when a round is won (timer ran out or the queen died) the screen freezes and darkens like the
// countdown and says so, then the round-over screen and upgrades slide up over it
const ROUND_OUTRO_FRAMES = 150;     // Long enough for the ants to retreat
const QUEEN_OUTRO_FRAMES = 170;     // Longer, to fit her explosion before the words
const QUEEN_OUTRO_TEXT_DELAY = 35;
const INTERMISSION_SLIDE_FRAMES = 24;
let roundOutroTimer = 0;            // Frames left in the outro (0 = not running)
let roundOutroFrames = 0;
let roundOutroQueen = false;        // The queen's death ended the round
let roundOutroStartFrame = 0;
let roundOutroSnapshot = null;      // Frozen image of the frame after the round ended
let intermissionSlideFrame = INTERMISSION_SLIDE_FRAMES;
let menuSlideY = 0;                 // beginMenuScaling shifts menus down this far (reset every frame)

// "ROUND 4", or the final level's / tutorial's own names for their rounds
function getRoundTitle(sentenceCase = false) {
  const title = getFinalRoundTitle() || getTutorialRoundTitle() || `ROUND ${level}`;
  return sentenceCase ? title.charAt(0) + title.slice(1).toLowerCase() : title;
}

function startRoundOutro() {
  roundOutroQueen = queenDefeatedThisRound;
  roundOutroFrames = roundOutroQueen ? QUEEN_OUTRO_FRAMES : ROUND_OUTRO_FRAMES;
  roundOutroTimer = roundOutroFrames;
  roundOutroStartFrame = frameCount;
  roundOutroSnapshot = null;
  intermissionSlideFrame = 0;
}

function clearRoundOutro() {
  roundOutroTimer = 0;
  roundOutroSnapshot = null;
  queenDeathBurst = null;
  intermissionSlideFrame = INTERMISSION_SLIDE_FRAMES;
}

function drawRoundOutro() {
  const age = roundOutroFrames - roundOutroTimer;
  // No freeze: the game keeps running while the ants retreat
  drawRoundRetreatFrame(age);
  noStroke();
  fill(0, 0, 0, 50 * Math.min(1, age / 20));
  rectMode(CORNER);
  rect(0, 0, windowWidth, windowHeight);

  if (roundOutroQueen && queenDeathBurst) {
    beginGameplayScaling();
    drawQueenDeathBurst(queenDeathBurst, age);
    endGameplayScaling();
  }

  const textAge = age - (roundOutroQueen ? QUEEN_OUTRO_TEXT_DELAY : 4);
  if (textAge >= 0) {
    const titleSize = min(windowWidth, windowHeight) * 0.13;
    const popScale = map(textAge, 0, 12, 1.5, 1, true);
    const alpha = map(textAge, 0, 8, 0, 255, true);
    push();
    textAlign(CENTER, CENTER);
    stroke(0, alpha);
    strokeWeight(titleSize * 0.1);
    textSize(titleSize * popScale);
    if (roundOutroQueen) fill(220, 150, 255, alpha);
    else fill(120, 255, 120, alpha);
    text(roundOutroQueen ? 'QUEEN DEFEATED!' : 'ROUND CLEARED!', windowWidth / 2, windowHeight * 0.42);
    textSize(titleSize * 0.3);
    strokeWeight(titleSize * 0.04);
    fill(255, alpha);
    text(`${getRoundTitle(true)} complete`, windowWidth / 2, windowHeight * 0.42 + titleSize * 0.85);
    pop();
  }

  roundOutroTimer--;
  if (roundOutroTimer <= 0) {
    roundOutroSnapshot = null;
    queenDeathBurst = null;
  }
}

function startRoundIntro() {
  roundIntroSnapshot = null;
  roundGoTimer = 0;
  if (shouldPlayRoundScenes()) {
    // The scene is built once this round's ants exist; the countdown starts when it ends (see scenes.js)
    roundScene = null;
    roundScenePending = true;
    roundIntroTimer = 0;
  } else {
    roundIntroTimer = ROUND_INTRO_FRAMES;
  }
}

// Frozen round snapshot with the round number and countdown over it
function drawRoundIntro() {
  image(roundIntroSnapshot, 0, 0, windowWidth, windowHeight);
  noStroke();
  fill(0, 0, 0, 110);
  rectMode(CORNER);
  rect(0, 0, windowWidth, windowHeight);

  let count = Math.ceil(roundIntroTimer / ROUND_INTRO_COUNT_FRAMES);
  let countProgress = 1 - ((roundIntroTimer - 1) % ROUND_INTRO_COUNT_FRAMES) / ROUND_INTRO_COUNT_FRAMES;
  let titleSize = min(windowWidth, windowHeight) * 0.13;

  push();
  textAlign(CENTER, CENTER);
  stroke(0);
  strokeWeight(titleSize * 0.1);
  fill(255);
  textSize(titleSize);
  text(getRoundTitle(), windowWidth / 2, windowHeight * 0.38);
  const subtitle = getFinalRoundSubtitle();
  if (subtitle) {
    textSize(titleSize * 0.28);
    strokeWeight(titleSize * 0.04);
    fill(230, 200, 255);
    text(subtitle, windowWidth / 2, windowHeight * 0.38 + titleSize * 0.72);
  }

  // Each number pops in large and settles, fading near the end of its second
  let numSize = titleSize * 1.6 * map(countProgress, 0, 0.2, 1.5, 1, true);
  let numAlpha = map(countProgress, 0.75, 1, 255, 60, true);
  fill(255, 220, 40, numAlpha);
  stroke(0, numAlpha);
  strokeWeight(numSize * 0.08);
  textSize(numSize);
  text(count, windowWidth / 2, windowHeight * 0.6);
  pop();

  roundIntroTimer--;
  if (roundIntroTimer <= 0) {
    roundIntroSnapshot = null;
    roundGoTimer = ROUND_GO_FRAMES;
  }
}

// "GO!" fading out over live gameplay once the countdown ends
function drawRoundGo() {
  if (roundGoTimer <= 0) return;
  let t = roundGoTimer / ROUND_GO_FRAMES;
  let size = min(windowWidth, windowHeight) * 0.2 * lerp(1.3, 1, t);
  push();
  textAlign(CENTER, CENTER);
  fill(120, 255, 120, 255 * t);
  stroke(0, 255 * t);
  strokeWeight(size * 0.08);
  textSize(size);
  text('GO!', windowWidth / 2, windowHeight * 0.5);
  pop();
  roundGoTimer--;
}

// Beetle-relative layout of the vertical combo meter (right of the health and EXP bars)
const COMBO_METER_X = 30;
const COMBO_METER_W = 7;
const COMBO_METER_H = 26;
const COMBO_METER_BOTTOM = 64;

// Combo bonus step: the bonus grows by comboConstant each step (every 5 → 1 kills with Combo Surge)
function getComboTier(c = combo) {
  return c > 1 ? Math.ceil(c / (5 - upgrade24Level)) : 0;
}

// Fiery vertical meter that burns down and fades as the combo timer runs out, with the combo count beside it
function drawComboMeter() {
  let t = constrain(comboTime / COMBO_TIME_MAX, 0, 1);
  let alphaMult = lerp(0.3, 1, t);
  let x = COMBO_METER_X;
  let top = COMBO_METER_BOTTOM - COMBO_METER_H;
  let fillH = COMBO_METER_H * t;
  let fillTop = COMBO_METER_BOTTOM - fillH;

  // Background with an orange glow
  drawingContext.save();
  drawingContext.shadowColor = `rgba(255, 110, 0, ${0.8 * alphaMult})`;
  drawingContext.shadowBlur = 10 * t;
  stroke(0, 255 * alphaMult);
  strokeWeight(1);
  fill(40, 20, 10, 220 * alphaMult);
  rect(x, top, COMBO_METER_W, COMBO_METER_H, 2);
  drawingContext.restore();

  // Flickering fire gradient: deep red at the bottom up to yellow-white at the flame front
  noStroke();
  for (let y = 0; y < fillH; y++) {
    let f = fillH <= 1 ? 1 : y / (fillH - 1); // 0 at bottom, 1 at the top of the fill
    let flicker = noise(y * 0.35, frameCount * 0.18) * 0.5 + 0.75;
    let r = 255;
    let g = constrain(lerp(40, 235, f) * flicker, 0, 255);
    let b = constrain(lerp(0, 120, f * f) * flicker, 0, 255);
    fill(r * min(1, 0.7 + f), g, b, 255 * alphaMult);
    rect(x + 1, COMBO_METER_BOTTOM - 1 - y, COMBO_METER_W - 2, 1);
  }

  // Flame tongues licking above the fill
  if (t > 0) {
    for (let i = 0; i < 3; i++) {
      let cx = x + 1.5 + i * (COMBO_METER_W - 3) / 2;
      let lick = (2 + 6 * noise(i * 10, frameCount * 0.25)) * (0.4 + 0.6 * t);
      fill(255, 120, 0, 200 * alphaMult);
      triangle(cx - 2, fillTop + 1, cx + 2, fillTop + 1, cx, fillTop - lick);
      fill(255, 230, 90, 230 * alphaMult);
      triangle(cx - 1, fillTop + 1, cx + 1, fillTop + 1, cx, fillTop - lick * 0.55);
    }
  }

  // Combo count, popping bigger right after a kill
  let pop = map(comboTime, COMBO_TIME_MAX, COMBO_TIME_MAX - 8, 1.4, 1, true);
  fill(255, lerp(140, 225, t), 30, 255 * alphaMult);
  stroke(60, 10, 0, 255 * alphaMult);
  strokeWeight(2.5);
  textAlign(LEFT, CENTER);
  textSize(12 * pop);
  text(`x${combo}`, x + COMBO_METER_W + 4, top + COMBO_METER_H / 2);
}

// Embers rising off the combo meter, plus a spark burst each time the combo bonus steps up
// (not on the 2nd kill, where the combo first starts). Drawn in gameplay space.
function updateComboSparks() {
  let active = combo > 0 && comboTime > 0;
  let t = constrain(comboTime / COMBO_TIME_MAX, 0, 1);
  let tier = active ? getComboTier() : 0;
  let flameX = playerX + COMBO_METER_X + COMBO_METER_W / 2;
  let flameY = playerY + COMBO_METER_BOTTOM - COMBO_METER_H * t;

  if (tier > comboSparkTier && tier > getComboTier(2)) {
    let count = 12 + min(tier, 12);
    for (let i = 0; i < count; i++) {
      let a = random(360);
      let speed = random(1.5, 4.5);
      comboSparks.push({
        x: flameX, y: flameY,
        vx: cos(a) * speed, vy: sin(a) * speed - 1.5,
        gravity: 0.15,
        life: random(18, 32), maxLife: 32,
        hot: random() < 0.5
      });
    }
  }
  comboSparkTier = tier;

  if (active && random() < 0.4 * t) {
    comboSparks.push({
      x: flameX + random(-COMBO_METER_W / 2, COMBO_METER_W / 2), y: flameY,
      vx: random(-0.3, 0.3), vy: random(-1.4, -0.6),
      gravity: -0.02,
      life: random(15, 30), maxLife: 30,
      hot: random() < 0.3
    });
  }

  push();
  angleMode(DEGREES);
  strokeCap(ROUND);
  for (let i = comboSparks.length - 1; i >= 0; i--) {
    let s = comboSparks[i];
    s.x += s.vx;
    s.y += s.vy;
    s.vx *= 0.92;
    s.vy = s.vy * 0.92 + s.gravity;
    s.life--;
    if (s.life <= 0) {
      comboSparks.splice(i, 1);
      continue;
    }
    let a = 255 * s.life / s.maxLife;
    strokeWeight(2);
    stroke(255, s.hot ? 240 : lerp(60, 180, s.life / s.maxLife), s.hot ? 150 : 0, a);
    line(s.x, s.y, s.x - s.vx * 2, s.y - s.vy * 2);
  }
  pop();
}

// EXP progress as shown on the player bar: levels already earned but not yet spent on
// upgrades are counted, so the bar rolls over into the next level instead of sitting full
function getExpDisplayState() {
  let lvl = expLevel;
  let progress = expProgress;
  let required = expRequired;
  let cost = getExpRequired();
  while (cost > 0 && progress >= cost) {
    progress -= cost;
    lvl++;
    required += 500 * Math.ceil(lvl / 5);
    cost = Math.round(required * (1 - 0.1 * upgrade22Level));
  }
  return { level: lvl, progress: progress, required: cost };
}

// Small EXP bar under the health bar with the player's level beside it;
// a gold box flashes around the level while an upgrade is waiting
function drawPlayerExpBar(barX, barY, barWidth, barHeight, alphaMult) {
  let state = getExpDisplayState();
  let progress = constrain(state.progress / state.required, 0, 1);

  stroke(0, 255 * alphaMult);
  strokeWeight(1);
  fill(80, 80, 0, 230 * alphaMult);
  rect(barX, barY, barWidth, barHeight, 2);

  if (progress > 0) {
    fill(255, 255, 0, 255 * alphaMult);
    rect(barX, barY, barWidth * progress, barHeight, 2);
  }

  // Level label to the left of the bar
  let label = `Lv ${state.level}`;
  let labelRight = barX - 5;
  let labelY = barY + barHeight / 2;
  textSize(11);
  textAlign(RIGHT, CENTER);

  if (upgradeAvailable) {
    let flash = (sin(frameCount * 12) + 1) / 2;
    let w = textWidth(label) + 6;
    stroke(255, 200, 40, lerp(80, 255, flash) * alphaMult);
    strokeWeight(lerp(1.5, 2.5, flash));
    fill(255, 200, 40, lerp(20, 90, flash) * alphaMult);
    rect(labelRight - w + 3, labelY - 8, w, 15, 3);
  }

  stroke(0, 255 * alphaMult);
  strokeWeight(2.5);
  fill(255, 255 * alphaMult);
  text(label, labelRight, labelY);
}

// Colors for each 10-health tier of the player health bar (index 0 = 1-10 ... 8 = 81-90; 91-100 is rainbow)
const HEALTH_TIER_COLORS = [
  [220, 40, 40],   // 1-10 red
  [245, 140, 30],  // 11-20 orange
  [245, 220, 40],  // 21-30 yellow
  [60, 190, 70],   // 31-40 green
  [50, 110, 230],  // 41-50 blue
  [140, 60, 200],  // 51-60 purple
  [245, 120, 190], // 61-70 pink
  [255, 255, 255], // 71-80 white
  [230, 185, 40]   // 81-90 gold
];
const HEALTH_RAINBOW_COLORS = [
  [255, 170, 170], [255, 210, 160], [255, 245, 170],
  [180, 240, 180], [170, 210, 255], [215, 180, 255]
];

// Draws the player health bar. The full bar is 10 health; each new 10 health
// fills across in a new color over the previous tier's color.
function drawPlayerHealthBar(barX, barY, barWidth, barHeight, alphaMult) {
  let h = constrain(health, 0, MAX_HEALTH);
  let tier = constrain(Math.ceil(h / 10), 1, 10); // 1 = 1-10, 10 = 91-100
  let fillPercent = h <= 0 ? 0 : (h - (tier - 1) * 10) / 10;

  // Background: previous tier's color (dark grey for the first tier)
  stroke(0, 255 * alphaMult);
  strokeWeight(1);
  if (tier === 1) {
    fill(50, 50, 50, 220 * alphaMult);
  } else {
    let c = HEALTH_TIER_COLORS[tier - 2];
    fill(c[0], c[1], c[2], 240 * alphaMult);
  }
  rect(barX, barY, barWidth, barHeight, 2);

  if (fillPercent <= 0) return;

  if (tier < 10) {
    let c = HEALTH_TIER_COLORS[tier - 1];
    // Under 10 health the red fill flashes in and out, faster as health drops (like the scoreboard)
    let flash = h < 10 ? map(sin(frameCount * 20 / h), -1, 1, 0.15, 1) : 1;
    fill(c[0], c[1], c[2], 240 * alphaMult * flash);
    rect(barX, barY, barWidth * fillPercent, barHeight, 2);
  } else {
    // 91-100: light rainbow stripes panning like the Tiger Beetle bar
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.roundRect(barX, barY, barWidth * fillPercent, barHeight, 2);
    drawingContext.clip();

    let stripeWidth = 4;
    let cycleWidth = stripeWidth * HEALTH_RAINBOW_COLORS.length;
    let wrappedOffset = Math.floor(healthStripeOffset) % cycleWidth;
    let numStripes = Math.ceil(barWidth / stripeWidth) + HEALTH_RAINBOW_COLORS.length * 2;
    noStroke();
    for (let i = 0; i < numStripes; i++) {
      let c = HEALTH_RAINBOW_COLORS[i % HEALTH_RAINBOW_COLORS.length];
      fill(c[0], c[1], c[2], 255 * alphaMult);
      rect(Math.floor(barX + i * stripeWidth - wrappedOffset), barY, stripeWidth, barHeight);
    }

    drawingContext.restore();
    pop();

    // Outline over the stripes
    noFill();
    stroke(0, 255 * alphaMult);
    strokeWeight(1);
    rect(barX, barY, barWidth * fillPercent, barHeight, 2);

    healthStripeOffset += 1.5;
  }
}

function enemyInteraction1(){
  if (isPlayerFlying()) return; // Flying over the ants

  //enemy one interaction
  for (let i = 1; i < enemyCount + 1; i++) {
    // Skip if ant is airborne (in the air, not just knocked back) or hiding in a bunker (or dormant in a queen fight)
    if (isAntSheltered(i) || antDormant[i]) continue;
    
    let antHitboxSize = 20.25 + (6.75 * antSize[i]);
    if(playerX > (antX[i] - antHitboxSize) && playerY > (antY[i] - antHitboxSize) && playerX < (antX[i] + antHitboxSize) && playerY < (antY[i] + antHitboxSize)) {
      // Only run over ants with health <= 1 (and no nest shield), and only if round is active and player is alive
      if (end == false && health > 0 && antHealth[i] <= 1 && !hasAntShield(i)){
        comboTime = 60;
        combo = combo + 1;
        calculateBonus();
        streakPoints += Math.round(comboPoints * antSize[i]);
        let scoreGained = addKillScore(100 + comboPoints, antSize[i], dash ? 'dash' : null);
        health = health + antSize[i];
        
        // Oogpister Beetle: 20% chance to instantly reload 1 bullet when eating an ant
        if (upgrade11Level === 1 && random() < 0.2) {
          if (shot < bulletQuantity) {
            shot++;
            // Visual/audio feedback for instant reload
            if (!sSpit1.isPlaying() && !sSpit2.isPlaying()) {
              let spitSound = round(random(1, 2));
              if (spitSound === 1) {
                sSpit1.play();
              } else {
                sSpit2.play();
              }
            }
          }
        }
        
        onAntDied(i);
        addDeathEffect(antX[i], antY[i], scoreGained);
        respawnAnt(i);
        antLives[i]++;
        debugLog("Ant", i, "lives:", antLives[i]);

        if(!sGetHit1.isPlaying() || !sGetHit2.isPlaying()) {
          sHit = round(random(1,2));
          if(sHit == 1) {
            sGetHit1.play();
          } else {
            sGetHit2.play();
          }       
        }

      }
      // Push ants with health >= 1 (or a nest shield) out of the way when walking (not dashing)
      else if (end == false && (antHealth[i] >= 1 || hasAntShield(i)) && !dash) {
        // Calculate gentle push direction (away from player)
        let dx = antX[i] - playerX;
        let dy = antY[i] - playerY;
        let distance = dist(playerX, playerY, antX[i], antY[i]);
        
        if (distance > 0) {
          let pushSpeed = playerSpeed * 8 / antSize[i]; // Push inversely proportional to ant size
          
          // If already knocked back, add to existing velocity instead of replacing
          if (antKnockedBack[i]) {
            // Continue pushing in the new direction
            antKnockbackVelX[i] = (dx / distance) * pushSpeed;
            antKnockbackVelY[i] = (dy / distance) * pushSpeed;
            antKnockbackTimer[i] = max(antKnockbackTimer[i], 10); // Extend timer if needed
          } else {
            // Start new knockback and deal damage
            damageAnt(i, 0.2);
            antLastHitTime[i] = millis();
            
            // Stun if damaged but not killed
            if (antHealth[i] > 0) {
              antStunned[i] = true;
              antStunTimer[i] = 30;
              antLastShotFrame[i] = frameCount; // Reset shooting cooldown
              antRapidFireActive[i] = false; // Cancel rapid fire
            }
            
            antKnockbackVelX[i] = (dx / distance) * pushSpeed;
            antKnockbackVelY[i] = (dy / distance) * pushSpeed;
            antKnockedBack[i] = true;
            antKnockbackTimer[i] = 10; // Short push duration
            
            // If health depleted, kill the ant
            if (antHealth[i] <= 0) {
              antLives[i]++;
              onAntDied(i);
              comboTime = 60;
              if (combo < 1) {
                combo = 1;
              }
              let scoreGained = addKillScore(100 * combo, 1, null);
              addDeathEffect(antX[i], antY[i], scoreGained);
              combo++;
              antHealth[i] = antMaxHealth[i]; // Reset health for respawn
              antLastShotFrame[i] = frameCount; // Respawned ants wait out a full cooldown before firing
              if (antDormant[i]) parkAnt(i);
            }
          }
        }
      }
    }
  }
}

function dashCollision() {
  // Only check for dash collisions when dashing (and on the ground)
  if (!dash || isPlayerFlying()) return;
  
  // Use spatial grid to only check nearby ants
  let nearbyCells = getNearbyCells(playerX, playerY);
  
  for (let cell of nearbyCells) {
    for (let i of cell.ants) {
      // Skip if ant is already knocked back (can only be hit once per dash) or airborne
      if (antKnockedBack[i] || isAntSheltered(i)) continue;
      
      let antHitboxSize = 20.25 + (6.75 * antSize[i]);
      if(playerX > (antX[i] - antHitboxSize) && playerY > (antY[i] - antHitboxSize) && 
         playerX < (antX[i] + antHitboxSize) && playerY < (antY[i] + antHitboxSize)) {
        
        // Deal damage based on Horns upgrade (1 + 0.2 per level)
        let dashDamage = 1 + (upgrade12Level * 0.2);
        damageAnt(i, dashDamage);
        antLastHitTime[i] = millis();
        
        // Stun if damaged but not killed
        if (antHealth[i] > 0) {
          antStunned[i] = true;
          antStunTimer[i] = 30;
          antLastShotFrame[i] = frameCount; // Reset shooting cooldown
          antRapidFireActive[i] = false; // Cancel rapid fire
        }
        
        // Calculate knockback direction (away from player)
        let dx = antX[i] - playerX;
        let dy = antY[i] - playerY;
        let distance = dist(playerX, playerY, antX[i], antY[i]);
        
        // Normalize and apply knockback velocity
        if (distance > 0) {
          // Base knockback scales with Horns upgrade (1 + 0.25 per level)
          let knockbackMultiplier = 1 + (upgrade12Level * 0.25);
          let knockbackSpeed = (playerSpeed * 8 / antSize[i]) * knockbackMultiplier;
          antKnockbackVelX[i] = (dx / distance) * knockbackSpeed;
          antKnockbackVelY[i] = (dy / distance) * knockbackSpeed;
        }
        
        // Set knockback state
        antKnockedBack[i] = true;
        antKnockbackTimer[i] = 60; // Longer knockback duration for dash
        
        // If health depleted, kill the ant
        if (antHealth[i] <= 0) {
          antLives[i]++;
          onAntDied(i);
          comboTime = 60;
          combo++;
          calculateBonus();
          streakPoints += Math.round(comboPoints * antSize[i]);
          let scoreGained = addKillScore(100 + comboPoints, antSize[i], 'dash');
          health += antSize[i];
          addDeathEffect(antX[i], antY[i], scoreGained);
          respawnAnt(i);
          
          if(!sGetHit1.isPlaying() || !sGetHit2.isPlaying()) {
            sHit = round(random(1,2));
            if(sHit == 1) {
              sGetHit1.play();
            } else {
              sGetHit2.play();
            }
          }
        }
      }
    }
  }
}

function handleAntKnockback() {
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i]) continue;
    if (antKnockedBack[i]) {
      // Apply knockback velocity
      // During airborne phase: full velocity, during sliding: minimal velocity
      if (antKnockbackTimer[i] > 40) {
        // Airborne phase - full movement
        antX[i] += antKnockbackVelX[i];
        antY[i] += antKnockbackVelY[i];
        antKnockbackVelX[i] *= 0.95;
        antKnockbackVelY[i] *= 0.95;
      } else {
        // Sliding phase - rapid deceleration
        antX[i] += antKnockbackVelX[i];
        antY[i] += antKnockbackVelY[i];
        antKnockbackVelX[i] *= 0.85;
        antKnockbackVelY[i] *= 0.85;
      }
      
      // Animate airborne height - arc completes in first 20 frames, then slides for last 40
      if (antKnockbackTimer[i] > 40) {
        // Airborne phase (frames 60-40)
        let airProgress = 1 - ((antKnockbackTimer[i] - 40) / 20);
        antAirHeight[i] = Math.sin(airProgress * Math.PI) * 30;
      } else {
        // Sliding phase (frames 40-0)
        antAirHeight[i] = 0;
      }
      
      // Keep ant in bounds
      antX[i] = constrain(antX[i], sideBuffer, getGameplayWidth() - sideBuffer);
      antY[i] = constrain(antY[i], scoreBarHeight + 15, getGameplayHeight() - expBarHeight - expBarBuffer);
      
      // Decrease timer
      antKnockbackTimer[i]--;
      
      // End knockback when timer expires
      if (antKnockbackTimer[i] <= 0) {
        antKnockedBack[i] = false;
        antKnockbackVelX[i] = 0;
        antKnockbackVelY[i] = 0;
        antAirHeight[i] = 0;
      }
    } else {
      antAirHeight[i] = 0;
    }

    // Recoil from firing (special type 3 / -3) - slides on top of any knockback
    if (antRecoilVelX[i] !== 0 || antRecoilVelY[i] !== 0) {
      antX[i] += antRecoilVelX[i];
      antY[i] += antRecoilVelY[i];
      // Less friction while hopping, so a launch carries the ant further than a ground recoil
      const recoilFriction = antRecoilAirTimer[i] > 0 ? RECOIL_AIR_FRICTION : RECOIL_GROUND_FRICTION;
      antRecoilVelX[i] *= recoilFriction;
      antRecoilVelY[i] *= recoilFriction;
      if (Math.abs(antRecoilVelX[i]) < 0.02 && Math.abs(antRecoilVelY[i]) < 0.02) {
        antRecoilVelX[i] = 0;
        antRecoilVelY[i] = 0;
      }
      antX[i] = constrain(antX[i], sideBuffer, getGameplayWidth() - sideBuffer);
      antY[i] = constrain(antY[i], scoreBarHeight + 15, getGameplayHeight() - expBarHeight - expBarBuffer);
    }

    // Launch hop: airborne (immune to ground attacks) for antRecoilAirDuration frames after each shot
    if (antRecoilAirTimer[i] > 0) {
      antRecoilAirTimer[i]--;
      if (antRecoilAirTimer[i] > 0) {
        const hopProgress = 1 - antRecoilAirTimer[i] / antRecoilAirDuration[i];
        antAirHeight[i] = Math.max(antAirHeight[i], Math.sin(hopProgress * Math.PI) * antRecoilAirPeak[i]);
      }
    }

    // Launch stream ants stay airborne (and untouchable) for their whole stream
    const streamLift = getAntStreamLift(i);
    if (streamLift > 0) {
      antAirHeight[i] = Math.max(antAirHeight[i], streamLift);
    }

    // Handle stun timer
    if (antStunned[i] && antStunTimer[i] > 0) {
      antStunTimer[i]--;
      if (antStunTimer[i] <= 0) {
        antStunned[i] = false;
      }
    }
  }
}


// Ground shadow under an airborne ant bullet
function drawEnemyBulletShadow(bullet, bulletStealth) {
  // Draw shadow when bullet is airborne (normal shadow, not for acceleration effect)
  if (bullet.airHeight > 0) {
    push();
    ellipseMode(CENTER);
    noSmooth();
    noStroke();
    // Shadow darkness based on height (higher = lighter shadow)
    let maxHeight = bullet.pathType === 1 ? (bullet.arcDuration * 0.5) : 12;
    let shadowAlpha = map(bullet.airHeight, 0, maxHeight, 150, 30);
    
    fill(0, 0, 0, shadowAlpha * bulletStealth);
    let shadowSize = (20 * bullet.size) * 0.6; // Shadow slightly smaller than bullet
    ellipse(bullet.x, bullet.y, shadowSize, shadowSize);
    smooth();
    pop();
  }
}

// An ant bullet with its auras and markers (i = owner), drawn at its height in the air
function drawEnemyBulletBody(bullet, i, bulletStealth, bulletFadeAmount) {
  // Accelerating bullets (pathType === 2): special rendering
  const isAccelerating = bullet.pathType === 2;
  const hasAccelerated = isAccelerating && bullet.hasAccelerated;

  // Draw all auras under the bullet image
  if (bullet.knockbackBullet) {
    push();
    noStroke();
    let flashSpeed = (bullet.knockbackMultiplier || 1) * 6;
    let flashAlpha = 83 + 70 * sin(bullet.life * flashSpeed);
    fill(220, 220, 220, flashAlpha * bulletStealth);
    let auraSize = (25 * bullet.size) + 5 * sin(bullet.life * 0.2);
    ellipse(bullet.x, bullet.y - bullet.airHeight, auraSize, auraSize);
    pop();
  }

  // Vacuum bullets: purple aura with rings sweeping inward; brighter, thicker, faster and more
  // numerous rings the stronger the pull (knockback multiplier 2-5)
  if (bullet.vacuumBullet) {
    const vacuumPower = constrain(((bullet.knockbackMultiplier || 2) - 2) / 3, 0, 1);
    const vacuumAuraSize = 30 * bullet.size;
    const vacuumY = bullet.y - bullet.airHeight;
    push();
    noStroke();
    fill(190, 90, 255, (50 + 60 * vacuumPower) * bulletStealth);
    ellipse(bullet.x, vacuumY, vacuumAuraSize, vacuumAuraSize);
    noFill();
    strokeWeight(1 + 1.5 * vacuumPower);
    const ringCount = 2 + Math.round(2 * vacuumPower);
    for (let r = 0; r < ringCount; r++) {
      const ringT = ((bullet.life * (0.02 + 0.03 * vacuumPower)) + r / ringCount) % 1;
      const ringSize = vacuumAuraSize * (1 - ringT);
      stroke(215, 140, 255, (120 + 135 * vacuumPower) * ringT * bulletStealth);
      ellipse(bullet.x, vacuumY, ringSize, ringSize);
    }
    pop();
  }

  // Homing bullets: red pulsing aura
  if (bullet.pathType === -2) {
    push();
    noStroke();
    let homingFlashSpeed = map(abs(bullet.curveStrength), 0.015, 0.1, 3, 12);
    let homingFlashAlpha = 83 + 70 * sin(bullet.life * homingFlashSpeed);
    fill(255, 60, 60, homingFlashAlpha * bulletStealth);
    let homingAuraSize = (30 * bullet.size) + 5 * sin(bullet.life * 0.2);
    ellipse(bullet.x, bullet.y - bullet.airHeight, homingAuraSize, homingAuraSize);
    pop();
  }

  // Blink / portal bullets: a flickering cyan (blink) or pink (portal) aura that quickens until the jump
  if (bullet.blinkAt != null && !bullet.hasBlinked) {
    push();
    noStroke();
    const blinkCharge = constrain(bullet.life / bullet.blinkAt, 0, 1);
    const blinkFlicker = 0.5 + 0.5 * Math.sin(bullet.life * (0.3 + 0.9 * blinkCharge));
    if (bullet.portal) fill(255, 120, 255, (40 + 90 * blinkCharge) * blinkFlicker * bulletStealth);
    else fill(110, 235, 255, (40 + 90 * blinkCharge) * blinkFlicker * bulletStealth);
    const blinkAuraSize = (24 + 6 * blinkCharge) * bullet.size;
    ellipse(bullet.x, bullet.y - bullet.airHeight, blinkAuraSize, blinkAuraSize);
    pop();
  }

  // Splitting bullets (delayed burst / split arc): orange aura that swells and pulses faster as the split nears
  const splitFrame = getBulletSplitFrame(bullet);
  if (splitFrame !== null) {
    push();
    noStroke();
    let burstProgress = constrain(bullet.life / splitFrame, 0, 1);
    let burstFlashAlpha = 83 + 70 * sin(bullet.life * (4 + 16 * burstProgress));
    fill(255, 150, 40, burstFlashAlpha * bulletStealth);
    let burstAuraSize = (20 + 12 * burstProgress) * bullet.size;
    ellipse(bullet.x, bullet.y - bullet.airHeight, burstAuraSize, burstAuraSize);
    pop();
  }

  // Exploding bullets (timed or proximity): green pulsing aura
  if (explodeOnTermination[i] || triggerExplodeViaProximity[i]) {
    push();
    noStroke();
    let explodeFlashSpeed;
    if (triggerExplodeViaProximity[i]) {
      explodeFlashSpeed = map(explosionProximity[i], 100, 800, 10, 2);
    } else {
      explodeFlashSpeed = map(bullet.explodeAfter, 800, 100, 2, 10);
    }
    let explodeFlashAlpha = 83 + 70 * sin(bullet.life * explodeFlashSpeed);
    fill(80, 220, 80, explodeFlashAlpha * bulletStealth);
      let explodeAuraSize = (25 * bullet.size) + 5 * sin(bullet.life * 0.2);
    ellipse(bullet.x, bullet.y - bullet.airHeight, explodeAuraSize, explodeAuraSize);
    pop();
  }

  // Draw bullet image on top of auras
  push();
  // Apply fade (either from Tiger Beetle or bullet lifespan)
  // BUT: Accelerated bullets ignore life cycle fade and stay at full opacity
  if (!hasAccelerated && (tigerBeetleActive && tigerBeetleMoving || bullet.life >= bullet.maxLife)) {
    tint(255, bulletFadeAmount * bulletStealth);
  } else if (bulletStealth < 1) {
    tint(255, 255 * bulletStealth);
  }
  angleMode(DEGREES);
  imageMode(CENTER);
  // Offset bullet visual position upward when airborne
  translate(bullet.x, bullet.y - bullet.airHeight);
  // Rotate to face the direction of actual movement (accounts for arc trajectory)
  rotate(bullet.visualAngle || bullet.angle);
  image(bulletImage, 0, 0, (20 * bullet.size), (20 * bullet.size));
  pop();

  // Landmine bullets: draw pulsing yellow center marker on top of bullet
  if (getDeathType(i) === 1 && !bullet.noDeathEffect) {
    push();
    noStroke();
    let mineFlashSpeed = map(deathLandmine[i], 1.0, 2.0, 2, 8, true);
    fill(255, 255, 0, 220 * bulletStealth);
    let mineCoreSize = (6 * bullet.size) + 2.5 * sin(bullet.life * mineFlashSpeed * 0.2);
    ellipse(bullet.x, bullet.y - bullet.airHeight, mineCoreSize, mineCoreSize);
    pop();
  }

  // Beam bullets: rings in the beam's color close in on the bullet as it charges, faster and brighter near firing
  if (bullet.beamOnAccelerate) {
    const charge = constrain(bullet.life / (bullet.accelerateDelay || 60), 0, 1);
    const ringColor = getBeamColors(bullet.knockbackBullet, bullet.vacuumBullet,
      explodeOnTermination[i] || triggerExplodeViaProximity[i]).glow;
    const period = BEAM_CHARGE_RING_PERIOD * (1 - 0.6 * charge);
    push();
    noFill();
    strokeWeight(1.5 + charge);
    for (let r = 0; r < 2; r++) {
      const p = ((bullet.life / period) + r * 0.5) % 1;
      const ringSize = lerp(34, 12, p) * bullet.size;
      stroke(ringColor[0], ringColor[1], ringColor[2], (60 + 170 * charge) * p * bulletStealth);
      ellipse(bullet.x, bullet.y - bullet.airHeight, ringSize, ringSize);
    }
    pop();
  }

  // Nest bullets: pulsing blue center marker; bunker bullets (size 1+ only): dark brown center marker
  const groundDeathType = bullet.noDeathEffect ? 0 : getDeathType(i);
  if (groundDeathType === 5 || (groundDeathType === 7 && bullet.size >= 1)) {
    push();
    noStroke();
    const markerValue = groundDeathType === 5 ? deathTerritory[i] : deathMound[i];
    const markerFlashSpeed = map(markerValue, 1.0, 2.0, 2, 8, true);
    if (groundDeathType === 5) fill(90, 170, 255, 220 * bulletStealth);
    else fill(70, 45, 20, 230 * bulletStealth);
    const markerSize = (6 * bullet.size) + 2.5 * sin(bullet.life * markerFlashSpeed * 0.2);
    ellipse(bullet.x, bullet.y - bullet.airHeight, markerSize, markerSize);
    pop();
  }

  // Turret bullets: draw pulsing red center marker on top of bullet
  if (getDeathType(i) === 3 && !bullet.noDeathEffect) {
    push();
    noStroke();
    let turretFlashSpeed = map(deathRefire[i], 1.0, 2.0, 2, 8, true);
    fill(255, 40, 40, 220 * bulletStealth);
    let turretCoreSize = (6 * bullet.size) + 2.5 * sin(bullet.life * turretFlashSpeed * 0.2);
    ellipse(bullet.x, bullet.y - bullet.airHeight, turretCoreSize, turretCoreSize);
    pop();
  }
}

// Airborne high arc bullets held back this frame so they're drawn over the flying beetle
let deferredEnemyBulletDraws = [];

function drawDeferredEnemyBullets() {
  for (const d of deferredEnemyBulletDraws) drawEnemyBulletBody(d.bullet, d.owner, d.stealth, d.fade);
  deferredEnemyBulletDraws = [];
}

function enemyShoot1() {
  if (end == false) {
    for (let i = 1; i < enemyCount + 1; i++) {
      // Check if ant is in rapid fire sequence and ready to fire next bullet
      if (antRapidFireActive[i] && frameCount >= antRapidFireNextFrame[i]) {
        // Aim THIS bullet from current positions
        const bullet = createAntBullet(i, antX[i], antY[i], getBurstBulletSize(i));
        enemyBullets[i].push(bullet);
        applyFiringRecoil(i, bullet);
        
        // Decrement count and schedule next bullet
        antRapidFireCount[i]--;
        if (antRapidFireCount[i] > 0) {
          antRapidFireNextFrame[i] = frameCount + 15; // Next bullet in 15 frames
        } else {
          antRapidFireActive[i] = false; // Sequence complete
        }
      }
      
      // Only skip shooting new bullets if ant is stunned (or dormant in a queen fight), but still update existing bullets
      if (!antStunned[i] && !antDormant[i]) {
        // Determine cooldown based on fire type
        let currentCooldown = bulletCooldown[i];
        const fireType = getFireType(i);
        
        // Type -1: Alternating cooldown
        if (fireType === -1) {
          const multiplier = Math.round(bulletCooldownMultiplier[i]);
          if (antAlternatingCooldownState[i] === 0) {
            // Fast cooldown: cooldown / multiplier
            currentCooldown = bulletCooldown[i] / Math.max(1, multiplier);
          } else {
            // Slow cooldown: cooldown * multiplier
            currentCooldown = bulletCooldown[i] * Math.max(1, multiplier);
          }
        } else if (fireType === -2) {
          // Type -2: Hit reload - long cooldown, reset whenever a bullet hits the player (see handlePlayerHit)
          currentCooldown = bulletCooldown[i] * HIT_RELOAD_COOLDOWN_MULTIPLIER;
        }
        
        // Type 4: Stream - sprays a continuous stream instead of firing bullets (see updateEnemyStreams)
        if (fireType === 4) {
          tryFireAntStream(i);
        }
        // Use cooldown tracking instead of modulo for proper reset capability
        else if (frameCount - antLastShotFrame[i] >= currentCooldown) {
          antLastShotFrame[i] = frameCount;
          
          // Toggle alternating cooldown state for next shot
          if (fireType === -1) {
            antAlternatingCooldownState[i] = 1 - antAlternatingCooldownState[i];
          }

          // Type 2: Rapid fire - fire the first bullet now, the rest follow 15 frames apart
          if (fireType === 2) {
            const bullet = createAntBullet(i, antX[i], antY[i], getBurstBulletSize(i));
            enemyBullets[i].push(bullet);
            applyFiringRecoil(i, bullet);

            // Set up rapid fire sequence for remaining bullets
            const bulletsToFire = getBurstBulletCount(i);
            if (bulletsToFire > 1) {
              antRapidFireActive[i] = true;
              antRapidFireCount[i] = bulletsToFire - 1; // Remaining bullets
              antRapidFireNextFrame[i] = frameCount + 15; // Next bullet in 15 frames
            }

            debugLog(`Ant ${i} started Rapid fire sequence: ${bulletsToFire} bullets - Speed: ${bullet.trueSpeed.toFixed(3)} px/f`);
          }
          // Every other fire type: fire the whole volley at once
          else {
            const volley = fireAntVolley(i, antX[i], antY[i]);
            // One recoil kick per volley, even for bursts
            applyFiringRecoil(i, volley[volley.length - 1]);
            if (fireType === 6) onAvengeAntFired(i);

            // Log bullet firing
            const volleySpeed = volley[0].trueSpeed;
            let speedTier = getBulletSpeedTier(volleySpeed);
            let fireTypeName = { '-2': 'Hit Reload', '-1': 'Alt', 0: 'Single', 1: 'Burst', 2: 'Rapid', 3: 'Delayed Burst', 5: 'Alarm', 6: 'Avenge' }[fireType] || 'Unknown';
            if (fireType === 3) {
              debugLog(`Ant ${i} fired a ${fireTypeName} bullet (splits into ${Math.round(bulletBurstCount[i])} after ${Math.round(bulletBurstDelay[i])}f) - Speed: ${volleySpeed.toFixed(3)} px/f`);
            } else if (fireType === 1) {
              let spreadDegrees = (bulletBurstSpread[i] * 180 / Math.PI).toFixed(1);
              debugLog(`Ant ${i} fired ${volley.length} ${fireTypeName} bullets with ${spreadDegrees}° spread - Speed: ${volleySpeed.toFixed(3)} px/f`);
            } else {
              debugLog(`Ant ${i} fired ${volley.length} ${fireTypeName} ${speedTier.name} bullet(s) - Speed: ${volleySpeed.toFixed(3)} px/f`);
            }
          }

          // Play spit sound when bullet is created (not during update loop)
          playSpitSound();
        }
      }

      // Update and draw bullets
      for (let b = enemyBullets[i].length - 1; b >= 0; b--) {
        let bullet = enemyBullets[i][b];

        // Remove bullets that were deflected by shockwave
        if (bullet.deflected) {
          enemyBullets[i].splice(b, 1);
          continue;
        }

        // Handle delay for rapid fire bullets
        if (bullet.delayFrames > 0) {
          bullet.delayFrames--;
          continue; // Skip updating this bullet until delay is over
        }

        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;
        bullet.life++;
        
        // Apply path type effects
        const pathType = bullet.pathType || 0;
        
        // Clockwise/Counter-clockwise curve (-1): Add perpendicular velocity component
        if (pathType === -1) {
          const baseCurveStrength = bullet.curveStrength || 0.08;
          // Gradually increase curve: 100% at 50% life, 150% at 100% life
          const progress = Math.min(bullet.life / bullet.maxLife, 1);
          const curveMultiplier = progress <= 0.5 ? progress * 2 : 1.0 + (progress - 0.5);
          const curveStrength = baseCurveStrength * curveMultiplier;
          // Perpendicular to current velocity
          // Positive = clockwise (rotate 90° clockwise), Negative = counter-clockwise (rotate 90° counter-clockwise)
          const perpX = bullet.speedY * Math.sign(curveStrength);
          const perpY = -bullet.speedX * Math.sign(curveStrength);
          bullet.speedX += perpX * Math.abs(curveStrength);
          bullet.speedY += perpY * Math.abs(curveStrength);
        }
        
        // Accelerate (2): After delay, accelerate continuously and become immune to time death
        if (pathType === 2) {
          if (bullet.life >= (bullet.accelerateDelay || 60) && !bullet.hasAccelerated) {
            // Beam bullets fire a beam instead of accelerating, and have no death effect
            if (bullet.beamOnAccelerate) {
              spawnEnemyBeam(bullet);
              enemyBullets[i].splice(b, 1);
              continue;
            }
            bullet.hasAccelerated = true;
          }
          
          if (bullet.hasAccelerated) {
            // Accelerate by 2% per frame
            const accelRate = 1.02;
            bullet.speedX *= accelRate;
            bullet.speedY *= accelRate;
            bullet.trueSpeed *= accelRate;
            
            // Spawn speed rings every 9 frames
            if (bullet.life % 9 === 0) {
              speedRings.push({
                x: bullet.x,
                y: bullet.y - bullet.airHeight,
                size: 8 * bullet.size, // Start smaller
                maxSize: 25 * bullet.size, // Smaller max size
                alpha: 255,
                life: 0
              });
            }
          }
        }
        
        // Homing curve (-2): Gradually turn toward player
        if (pathType === -2) {
          const homingStrength = 0.04; // How much it homes per frame
          const toPlayerX = playerX - bullet.x;
          const toPlayerY = playerY - bullet.y;
          const distToPlayer = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY);
          if (distToPlayer > 0) {
            const targetVelX = (toPlayerX / distToPlayer) * bullet.trueSpeed;
            const targetVelY = (toPlayerY / distToPlayer) * bullet.trueSpeed;
            bullet.speedX += (targetVelX - bullet.speedX) * homingStrength;
            bullet.speedY += (targetVelY - bullet.speedY) * homingStrength;
          }
        }
        
        // Blink / portal (3): jump ahead once the blink delay has passed
        if (bullet.blinkAt != null && !bullet.hasBlinked && bullet.life >= bullet.blinkAt) {
          blinkBullet(bullet);
        }

        // Store previous air height for velocity calculation
        let previousAirHeight = bullet.airHeight || 0;
        
        // Update air height for arc trajectory
        if (bullet.pathType === 1) { // (read again: a portal bullet can turn high arc this frame)
          // High arc mode: Use arcDuration and scale height with duration
          bullet.airProgress = Math.min((bullet.life - (bullet.arcStartLife || 0)) / bullet.arcDuration, 1);
          // Arc height scales with arcDuration (130-600 frames -> 65-300px peak)
          let arcHeight = bullet.arcDuration * 0.5; // 0.5 pixels per frame of duration
          bullet.airHeight = Math.sin(bullet.airProgress * Math.PI) * arcHeight;
        } else {
          // Normal arc mode: Arc completes over the bullet's lifetime
          bullet.airProgress = Math.min(bullet.life / (bullet.maxLife + 30), 1);
          bullet.airHeight = Math.sin(bullet.airProgress * Math.PI) * 12; // Max height of 12px
        }
        
        // Calculate visual velocity (direction bullet appears to move on screen)
        // The bullet's visual position is (x, y - airHeight), so we need to account for airHeight change
        let deltaAirHeight = bullet.airHeight - previousAirHeight;
        let visualVelocityX = bullet.speedX;
        let visualVelocityY = bullet.speedY - deltaAirHeight; // Subtract because y decreases upward
        
        // Calculate angle based on actual movement direction
        bullet.visualAngle = Math.atan2(visualVelocityY, visualVelocityX) * 180 / Math.PI;

        // Delayed burst: split into the burst once the delay has elapsed
        if (bullet.delayedBurst && bullet.life >= bullet.delayedBurst.at) {
          spawnDelayedBurst(bullet, i);
          enemyBullets[i].splice(b, 1);
          continue;
        }

        // Split arc: split at the top of the arc
        if (bullet.splitAtApex && bullet.life >= bullet.arcDuration / 2) {
          spawnSplitArc(bullet);
          enemyBullets[i].splice(b, 1);
          continue;
        }

        // Vacuum bullets pull the beetle in at close range
        if (bullet.vacuumBullet) {
          applyVacuumPull(bullet);
        }

        // --- EXPLOSION TRIGGER ---
        let shouldExplode = false;
        let explosionRadiusScale = 1;
        let shouldSpawnArcLink = false;

        if (bullet.pathType === 1) {
          // High-arc timed explosions can trigger in-air when their fuse ends.
          if (explodeOnTermination[i] && bullet.life >= bullet.explodeAfter) {
            shouldExplode = true;
            let maxArcHeight = Math.max((bullet.arcDuration || 60) * 0.5, 1);
            let arcHeightRatio = constrain((bullet.airHeight || 0) / maxArcHeight, 0, 1);
            explosionRadiusScale = 1 + (0.3 * arcHeightRatio);
            shouldSpawnArcLink = (bullet.airHeight || 0) > 2;
          }
        } else if (!bullet.beamOnAccelerate) {
          // Beam bullets don't explode; their explosion makes the beam fire both ways (see spawnEnemyBeam)
          // 1) explode when bullet life ends, if this ant is set to do that
          if (explodeOnTermination[i] && bullet.life >= bullet.explodeAfter) {
            shouldExplode = true;
          }

          // 2) explode when close to player, if this ant is proximity-based
          if (triggerExplodeViaProximity[i]) {
            let distToPlayer = dist(bullet.x, bullet.y, playerX, playerY);
            if (distToPlayer <= explosionProximity[i]) {
              shouldExplode = true;
            }
          }
        }

        if (shouldExplode) {
          if (shouldSpawnArcLink) {
            spawnEnemyArcExplosionLink(bullet.x, bullet.y - bullet.airHeight, bullet.y, bullet.size, explosionRadiusScale);
          }
          spawnEnemyExplosion(bullet.x, bullet.y, bullet.size, i, explosionRadiusScale);
          enemyBullets[i].splice(b, 1);
          continue;
        }

        // Check if bullet has exceeded its lifespan and should fade/disappear
        // High arc bullets (pathType === 1) only die when landing, not from lifespan
        // Accelerating bullets (pathType === 2) become immune to time death once they start accelerating
        const FADE_DURATION = 30; // Frames to fade out
        const isImmuneToTimeDeath = bullet.pathType === 1 || (bullet.pathType === 2 && bullet.hasAccelerated);
        if (!isImmuneToTimeDeath && bullet.life > bullet.maxLife + FADE_DURATION) {
          // Check bullet death type (refired bullets have none)
          const deathType = bullet.noDeathEffect ? 0 : getDeathType(i);
          if (deathType === 1) {
            // Type 1: Convert to land mine
            landMines.push({
              x: bullet.x,
              y: bullet.y,
              size: bullet.size,
              owner: i, // Ant that fired it
              isPlayerMine: false,
              knockbackBullet: bullet.knockbackBullet || false,
              knockbackMultiplier: bullet.knockbackMultiplier || 1,
                trueSpeed: bullet.trueSpeed || 5,
                // Preserve explosion triggers from the originating ant/bullet
                life: 0,
                explodeOnTermination: explodeOnTermination[i] || false,
                triggerExplodeViaProximity: triggerExplodeViaProximity[i] || false,
                explosionProximity: explosionProximity[i] || 0,
                explodeAfter: bullet.explodeAfter || bulletExplodeAfter[i],
                meltAfter: getMineMeltFrames(i),
                stealthType: getMineStealthType(i),
                camoFlashRate: bulletCamoFlashRate[i],
                fusionCount: 1 // Track how many mines have been fused
            });
          } else if (deathType === -1) {
            // Type -1: Leave a damaging smear where the bullet faded
            spawnEnemySmear(bullet.x, bullet.y, bullet.size, i, bullet.speedX, bullet.speedY);
          } else if (deathType === 2 || deathType === 3) {
            // Type 2 / 3: Fire the bullet again from where it faded (refire / turret)
            spawnDeathRefire(bullet, i);
          } else if (deathType >= 4 && deathType <= 7) {
            // Type 4-7: Leave a territory / nest area or a mound / bunker where it faded
            spawnGroundDeathEffect(bullet, i, deathType);
          }
          // Type 0: Just fade and remove (default behavior)
          enemyBullets[i].splice(b, 1);
          continue;
        }

        // draw bullet (check if should be visible with Tiger Beetle flash)
        let shouldDrawBullet = true;
        let bulletFadeAmount = 255;
        
        // Check if this is an accelerated bullet (always visible, ignores life cycle fade)
        const isAcceleratedBullet = bullet.pathType === 2 && bullet.hasAccelerated;
        
        // Calculate fade based on bullet lifespan (not for high arc bullets or accelerated bullets)
        if (bullet.pathType !== 1 && !isAcceleratedBullet && bullet.life >= bullet.maxLife) {
          let fadeProgress = (bullet.life - bullet.maxLife) / FADE_DURATION;
          bulletFadeAmount = Math.floor(255 * (1 - fadeProgress));
        }
        
        // Accelerated bullets ignore Tiger Beetle flash system - always visible
        if (tigerBeetleActive && tigerBeetleMoving && !isAcceleratedBullet) {
          // Check if this bullet is in the flashing entities list
          shouldDrawBullet = false;
          for (let f = 0; f < flashingEntities.length; f++) {
            if (flashingEntities[f].type === 'bullet' && flashingEntities[f].owner === i && flashingEntities[f].index === b) {
              shouldDrawBullet = true;
              // Combine Tiger Beetle fade with lifespan fade (use minimum)
              bulletFadeAmount = Math.min(bulletFadeAmount, flashingEntities[f].fade);
              break;
            }
          }
        }
        
        // Camouflage / Ghost specials: scale everything drawn for this bullet by a stealth opacity
        const bulletStealth = getBulletStealthAlpha(bullet, i);
        if (bulletStealth <= 0.01) shouldDrawBullet = false;

        if (shouldDrawBullet) {
          drawEnemyBulletShadow(bullet, bulletStealth);
          // Over a flying beetle, airborne high arc bullets are drawn after it (they're up in the air with it)
          if (isPlayerFlying() && bullet.pathType === 1 && bullet.airHeight > 1) {
            deferredEnemyBulletDraws.push({ bullet: bullet, owner: i, stealth: bulletStealth, fade: bulletFadeAmount });
          } else {
            drawEnemyBulletBody(bullet, i, bulletStealth, bulletFadeAmount);
          }
        }

        if (
          bullet.x < 0 || bullet.x > getGameplayWidth() ||
          bullet.y < scoreBarHeight || bullet.y > getGameplayHeight() - expBarHeight
        ) {
          onEnemyBulletLeftScreen(bullet);
          enemyBullets[i].splice(b, 1);
        } else if (!(bullet.pathType === 1 && bullet.airHeight > 1) &&
          (getPlayerWallHitBy(bullet.x, bullet.y, bullet.speedX || 0, bullet.speedY || 0) || getEnemyMoundAt(bullet.x, bullet.y, 4))) {
          // Mounds stop every bullet on the ground (lofted ones fly over). The beetle's mounds and bunker take
          // the hit like the beetle would; the ants' own mounds just stop it.
          const ownWall = getPlayerWallHitBy(bullet.x, bullet.y, bullet.speedX || 0, bullet.speedY || 0);
          if (ownWall) {
            damagePlayerWall(ownWall, bullet.size * getBulletSpeedTier(getEnemyBulletHitSpeed(bullet)).damageMultiplier);
          }
          enemyBullets[i].splice(b, 1);
        } else if (
          bullet.x > playerX - 25 && bullet.x < playerX + 25 &&
          bullet.y > playerY - 25 && bullet.y < playerY + 25 &&
          // A high arc bullet coming down under a flying beetle just lands (below)
          !(isPlayerFlying() && bullet.pathType === 1 && bullet.airHeight <= 1)
        ) {
          // High arc bullets (pathType === 1) can only hit a grounded beetle once they've come down,
          // but a flying beetle is up in the air with them and they hit it mid-arc
          if (bullet.pathType === 1 && bullet.airHeight > 1 && !isPlayerFlying()) {
            // Bullet is still in the air, can't hit yet
            continue;
          }
          // A flying beetle is out of reach of everything but high arc bullets
          if (isPlayerFlying() && bullet.pathType !== 1) continue;
          // Dash Deflection: turned into one of the beetle's bullets instead
          if (tryDashDeflect(bullet.x, bullet.y)) {
            enemyBullets[i].splice(b, 1);
            continue;
          }

          let isKnockbackBullet = bullet.knockbackBullet || false;
          let knockbackMult = bullet.knockbackMultiplier || 1;
          // Damage speed: high arc bullets hit as high-speed bullets, curved bullets use their current speed
          // (they accelerate as they curve), everything else its initial speed
          let bulletSpeed = getEnemyBulletHitSpeed(bullet);
          enemyBullets[i].splice(b, 1);
          pendingHitSpot = bullet.fireSpot;
          handlePlayerHit(i, isKnockbackBullet, bullet.x, bullet.y, knockbackMult, bulletSpeed, false, bullet.size,
            { highArc: bullet.pathType === 1, vx: bullet.speedX || 0, vy: bullet.speedY || 0 });
        } else if (bullet.pathType === 1 && bullet.airProgress >= 1 && bullet.airHeight <= 1) {
          // High arc bullet has landed without hitting player - trigger death effect (refired bullets have none)
          const deathType = bullet.noDeathEffect ? 0 : getDeathType(bullet.owner);
          if (deathType === 1) {
            // Convert to land mine
            landMines.push({
              x: bullet.x,
              y: bullet.y,
              size: bullet.size,
              owner: bullet.owner,
              isPlayerMine: false,
              knockbackBullet: bullet.knockbackBullet || false,
              knockbackMultiplier: bullet.knockbackMultiplier || 1,
              trueSpeed: bullet.trueSpeed || 5,
              life: 0,
              explodeOnTermination: explodeOnTermination[bullet.owner] || false,
              triggerExplodeViaProximity: triggerExplodeViaProximity[bullet.owner] || false,
              explosionProximity: explosionProximity[bullet.owner] || 0,
              explodeAfter: bullet.explodeAfter || bulletExplodeAfter[bullet.owner],
              meltAfter: getMineMeltFrames(bullet.owner),
              stealthType: getMineStealthType(bullet.owner),
              camoFlashRate: bulletCamoFlashRate[bullet.owner],
              fusionCount: 1
            });
          } else {
            // Smear death: leave a streak where the lofted bullet lands (on top of its normal impact)
            if (deathType === -1) {
              spawnEnemySmear(bullet.x, bullet.y, bullet.size, bullet.owner, bullet.speedX, bullet.speedY);
            }
            // Refire / turret death: fire the bullet again from where it landed (on top of its normal impact)
            if (deathType === 2 || deathType === 3) {
              spawnDeathRefire(bullet, bullet.owner);
            }
            // Territory / nest area or mound / bunker where it landed (on top of its normal impact)
            if (deathType >= 4 && deathType <= 7) {
              spawnGroundDeathEffect(bullet, bullet.owner, deathType);
            }

            let hasExplosionSpecial = explodeOnTermination[bullet.owner] || triggerExplodeViaProximity[bullet.owner];

            // Explosion special: explode on ground impact like a normal triggered explosion.
            if (hasExplosionSpecial) {
              spawnEnemyExplosion(bullet.x, bullet.y, bullet.size, bullet.owner);
            } else if (bullet.knockbackBullet) {
              // Knockback special: white impact burst with AoE direct-hit-equivalent effect.
              let knockbackRadius = (18 * bullet.size) * (0.9 + 0.45 * (bullet.knockbackMultiplier || 1)) * (radiusMultiplier[bullet.owner] || 1);
              spawnEnemyGroundImpact(bullet.x, bullet.y, knockbackRadius, true, residueMultiplier[bullet.owner] || 1);
              let distToPlayer = dist(playerX, playerY, bullet.x, bullet.y);
              if (distToPlayer <= knockbackRadius) {
                pendingHitSpot = bullet.fireSpot;
                handlePlayerHit(
                  bullet.owner,
                  true,
                  bullet.x,
                  bullet.y,
                  bullet.knockbackMultiplier || 1,
                  10,
                  false,
                  bullet.size,
                  { vx: bullet.speedX || 0, vy: bullet.speedY || 0 }
                );
              }
            } else {
              // Non-special high-arc bullets create a small ground impact AoE that damages the player.
              let defaultImpactRadius = 22 * bullet.size * (radiusMultiplier[bullet.owner] || 1);
              spawnEnemyGroundImpact(bullet.x, bullet.y, defaultImpactRadius, false, residueMultiplier[bullet.owner] || 1);
              let distToPlayer = dist(playerX, playerY, bullet.x, bullet.y);
              if (distToPlayer <= defaultImpactRadius) {
                pendingHitSpot = bullet.fireSpot;
                handlePlayerHit(
                  bullet.owner,
                  false,
                  bullet.x,
                  bullet.y,
                  1,
                  10,
                  false,
                  bullet.size,
                  { vx: bullet.speedX || 0, vy: bullet.speedY || 0 }
                );
              }
            }
          }
          // Type 0 or other: Just disappear
          enemyBullets[i].splice(b, 1);
        }
      }
    }
  }

  // Fuse landmines if there are too many (performance optimization)
  fuseLandMines();
  
  // Draw and handle land mines
  for (let m = landMines.length - 1; m >= 0; m--) {
    let mine = landMines[m];
    
    // Remove mines that were deflected by shockwave
    if (mine.deflected) {
      landMines.splice(m, 1);
      continue;
    }
    
    // Track mine lifetime for time-based explosion fuses
    mine.life = (mine.life || 0) + 1;

    // Mines melt away after 5 seconds x owner's residue multiplier
    let meltAfter = mine.meltAfter || MINE_MELT_BASE_FRAMES;
    if (mine.life >= meltAfter) {
      landMines.splice(m, 1);
      continue;
    }
    let meltProgress = constrain((mine.life - (meltAfter - MINE_MELT_FADE_FRAMES)) / MINE_MELT_FADE_FRAMES, 0, 1);

    // Handle time-based explosion (fuse)
    if (mine.explodeOnTermination && mine.life >= (mine.explodeAfter || 0)) {
      // If enemy-owned mine, spawn enemy explosion (damages player)
      if (!mine.isPlayerMine) {
        // Pick a random owner for credit if this is a fused mine with multiple owners
        let ownerId = Array.isArray(mine.owner) ? random(mine.owner) : mine.owner;
        spawnEnemyExplosion(mine.x, mine.y, mine.size, ownerId);
      } else {
        // Player-owned mine: apply explosion damage to nearby ants
        const BASE_RADIUS = 20;
        const RADIUS_PER_SIZE = 40;
        let radius = (BASE_RADIUS + RADIUS_PER_SIZE * (mine.size - 1));
        for (let ai = 1; ai <= enemyCount; ai++) {
          if (isAntSheltered(ai)) continue; // Airborne ants are above ground-level blasts
          let d = dist(mine.x, mine.y, antX[ai], antY[ai]);
          if (d <= radius) {
            damageAnt(ai, mine.size);
            antLastHitTime[ai] = millis();
            // apply simple knockback
            let dx = antX[ai] - mine.x;
            let dy = antY[ai] - mine.y;
            let distance = dist(mine.x, mine.y, antX[ai], antY[ai]);
            if (distance > 0) {
              let knockbackSpeed = 8 * (mine.knockbackMultiplier || 1);
              antKnockbackVelX[ai] = (dx / distance) * knockbackSpeed;
              antKnockbackVelY[ai] = (dy / distance) * knockbackSpeed;
              antKnockedBack[ai] = true;
              antKnockbackTimer[ai] = 60;
            }

            if (antHealth[ai] <= 0) {
              antLives[ai]++;
              onAntDied(ai);
              comboTime = 60;
              combo++;
              calculateBonus();
              streakPoints += Math.round(comboPoints * antSize[ai]);
              let scoreGained = addKillScore(100 + comboPoints, antSize[ai], 'bullet');
              health += antSize[ai];
              addDeathEffect(antX[ai], antY[ai], scoreGained);
              respawnAnt(ai);
            }
          }
        }
      }
      // Remove mine after explosion
      landMines.splice(m, 1);
      continue;
    }

    // Handle proximity-triggered explosions
    if (mine.triggerExplodeViaProximity) {
      if (!mine.isPlayerMine) {
        let d = dist(playerX, playerY, mine.x, mine.y);
        if (d <= (mine.explosionProximity || 0)) {
          // Pick a random owner for credit if this is a fused mine with multiple owners
          let ownerId = Array.isArray(mine.owner) ? random(mine.owner) : mine.owner;
          spawnEnemyExplosion(mine.x, mine.y, mine.size, ownerId);
          landMines.splice(m, 1);
          continue;
        }
      } else {
        // Player-owned mine: check ants for proximity
        for (let ai = 1; ai <= enemyCount; ai++) {
          if (isAntSheltered(ai)) continue; // Airborne ants don't trip ground mines
          let d = dist(antX[ai], antY[ai], mine.x, mine.y);
          if (d <= (mine.explosionProximity || 0)) {
            // Apply explosion damage to nearby ants (same as time-based)
            const BASE_RADIUS = 20;
            const RADIUS_PER_SIZE = 40;
            let radius = (BASE_RADIUS + RADIUS_PER_SIZE * (mine.size - 1));
            for (let aj = 1; aj <= enemyCount; aj++) {
              if (isAntSheltered(aj)) continue; // Airborne ants are above ground-level blasts
              let dj = dist(mine.x, mine.y, antX[aj], antY[aj]);
              if (dj <= radius) {
                damageAnt(aj, mine.size);
                antLastHitTime[aj] = millis();
                // simple knockback
                let dx = antX[aj] - mine.x;
                let dy = antY[aj] - mine.y;
                let distance = dist(mine.x, mine.y, antX[aj], antY[aj]);
                if (distance > 0) {
                  let knockbackSpeed = 8 * (mine.knockbackMultiplier || 1);
                  antKnockbackVelX[aj] = (dx / distance) * knockbackSpeed;
                  antKnockbackVelY[aj] = (dy / distance) * knockbackSpeed;
                  antKnockedBack[aj] = true;
                  antKnockbackTimer[aj] = 60;
                }

                if (antHealth[aj] <= 0) {
                  antLives[aj]++;
                  onAntDied(aj);
                  comboTime = 60;
                  combo++;
                  calculateBonus();
                  streakPoints += Math.round(comboPoints * antSize[aj]);
                  let scoreGained = addKillScore(100 + comboPoints, antSize[aj], 'bullet');
                  health += antSize[aj];
                  addDeathEffect(antX[aj], antY[aj], scoreGained);
                  respawnAnt(aj);
                }
              }
            }
            landMines.splice(m, 1);
            break;
          }
        }
        // If we removed the mine above, continue to next mine
        if (m < landMines.length && landMines[m] && landMines[m].x !== mine.x) {
          continue;
        }
      }
    }
    
    // Draw land mine as a green circle
    // Check if should be visible during Tiger Beetle mode
    let shouldDrawMine = true;
    let mineFadeAmount = 255;
    
    if (tigerBeetleActive && tigerBeetleMoving) {
      shouldDrawMine = false;
      for (let f = 0; f < flashingEntities.length; f++) {
        if (flashingEntities[f].type === 'mine' && flashingEntities[f].index === m) {
          shouldDrawMine = true;
          mineFadeAmount = flashingEntities[f].fade;
          break;
        }
      }
    }
    
    if (!shouldDrawMine) {
      // Skip drawing but still check collisions for gameplay fairness
      // Check collision with player (for enemy mines)
      if (!mine.isPlayerMine) {
        let mineSize = 15 * mine.size;
        let hitboxSize = (mineSize / 2) + 15;
        if (!isPlayerFlying() && dist(playerX, playerY, mine.x, mine.y) < hitboxSize) { // Flying over it doesn't set it off
          let ownerId = Array.isArray(mine.owner) ? random(mine.owner) : mine.owner;
          handlePlayerHit(ownerId, mine.knockbackBullet, mine.x, mine.y, mine.knockbackMultiplier, mine.trueSpeed, true, mine.size);
          landMines.splice(m, 1);
        }
      }
      continue;
    }
    
    push();
    let mineSize = 15 * mine.size; // Size based on bullet size (includes fusion scaling)
    let fusionCount = mine.fusionCount || 1;
    
    // Fused mines pulse and have enhanced visuals
    let pulseFactor = 1;
    if (fusionCount > 1) {
      pulseFactor = 1 + 0.1 * sin(frameCount * 0.15);
    }
    
    let finalSize = mineSize * pulseFactor * (1 - 0.5 * meltProgress);
    mineFadeAmount *= (1 - meltProgress);
    // Camouflage / Ghost mines inherit their owner's stealth
    mineFadeAmount *= getStealthAlpha(mine, mine.stealthType || 0, mine.camoFlashRate);

    // Draw inherited special auras for mines created by special bullets.
    if (mine.explodeOnTermination || mine.triggerExplodeViaProximity) {
      push();
      noStroke();
      let mineExplodeFlashSpeed;
      if (mine.triggerExplodeViaProximity) {
        mineExplodeFlashSpeed = map(mine.explosionProximity || 0, 100, 800, 10, 2);
      } else {
        mineExplodeFlashSpeed = map(mine.explodeAfter || 800, 800, 100, 2, 10);
      }
      let mineExplodeFlashAlpha = Math.min(mineFadeAmount, 83 + 70 * sin(mine.life * mineExplodeFlashSpeed));
      fill(80, 220, 80, mineExplodeFlashAlpha);
      let mineExplodeAuraSize = finalSize * 1.35;
      ellipse(mine.x, mine.y, mineExplodeAuraSize, mineExplodeAuraSize);
      pop();
    }

    if (mine.knockbackBullet) {
      push();
      noStroke();
      let mineKnockbackFlashSpeed = (mine.knockbackMultiplier || 1) * 6;
      let mineKnockbackFlashAlpha = Math.min(mineFadeAmount, 83 + 70 * sin(mine.life * mineKnockbackFlashSpeed));
      fill(220, 220, 220, mineKnockbackFlashAlpha);
      let mineKnockbackAuraSize = finalSize * 1.2;
      ellipse(mine.x, mine.y, mineKnockbackAuraSize, mineKnockbackAuraSize);
      pop();
    }
    
    // Color intensity increases with fusion count
    let greenIntensity = min(200 + fusionCount * 10, 255);
    let outlineIntensity = 255;
    
    // Apply tiger beetle fade to mine transparency
    let mineAlpha = map(mineFadeAmount, 0, 255, 0, 180);
    let outlineAlpha = mineFadeAmount;
    
    fill(0, greenIntensity, 0, mineAlpha); // Green with transparency
    stroke(0, outlineIntensity, 0, outlineAlpha); // Bright green outline
    strokeWeight(fusionCount > 1 ? 3 : 2); // Thicker outline for fused mines
    ellipse(mine.x, mine.y, finalSize, finalSize);
    
    // Draw a small warning symbol in the center
    fill(255, 255, 0, mineFadeAmount);
    noStroke();
    ellipse(mine.x, mine.y, finalSize * 0.3, finalSize * 0.3);
    
    // Display fusion count for fused mines
    if (fusionCount > 1) {
      fill(255, 255, 255, mineFadeAmount);
      textAlign(CENTER, CENTER);
      textSize(finalSize * 0.25);
      text(fusionCount, mine.x, mine.y);
    }
    pop();
    
    // Check collision with player (for enemy mines)
    if (!mine.isPlayerMine) {
      let hitboxSize = (mineSize / 2) + 15; // Mine radius + player hitbox
      if (!isPlayerFlying() && dist(playerX, playerY, mine.x, mine.y) < hitboxSize) { // Flying over it doesn't set it off
        // Trigger mine - pick a random owner for credit if this is a fused mine
        let ownerId = Array.isArray(mine.owner) ? random(mine.owner) : mine.owner;
        handlePlayerHit(ownerId, mine.knockbackBullet, mine.x, mine.y, mine.knockbackMultiplier, mine.trueSpeed, true, mine.size);
        landMines.splice(m, 1);
        continue;
      }
    }
    
    // Check collision with ants (for player mines) - use spatial grid for optimization
    if (mine.isPlayerMine) {
      let nearbyCells = getNearbyCells(mine.x, mine.y);
      let mineHit = false;
      
      for (let cell of nearbyCells) {
        for (let i of cell.ants) {
          if (isAntSheltered(i)) continue; // Airborne ants pass over mines
          let antHitboxSize = 20.25 + (6.75 * antSize[i]);
          let mineHitboxSize = (mineSize / 2);
          if (dist(antX[i], antY[i], mine.x, mine.y) < antHitboxSize + mineHitboxSize) {
            // Mine hits ant
            let damage = mine.size;
            damageAnt(i, damage);
            
            // Apply knockback if it's a knockback mine
            if (mine.knockbackBullet) {
              let dx = antX[i] - mine.x;
              let dy = antY[i] - mine.y;
              let distance = dist(mine.x, mine.y, antX[i], antY[i]);
              if (distance > 0) {
                let knockbackSpeed = 8 * mine.knockbackMultiplier;
                antKnockbackVelX[i] = (dx / distance) * knockbackSpeed;
                antKnockbackVelY[i] = (dy / distance) * knockbackSpeed;
                antKnockedBack[i] = true;
                antKnockbackTimer[i] = 60;
              }
            }
            
            // Check if ant dies
            if (antHealth[i] <= 0) {
              antLives[i]++;
              onAntDied(i);
              comboTime = 60;
              combo++;
              calculateBonus();
              streakPoints += Math.round(comboPoints * antSize[i]);
              let scoreGained = addKillScore(100 + comboPoints, antSize[i], 'bullet');
              health += antSize[i];
              addDeathEffect(antX[i], antY[i], scoreGained);
              respawnAnt(i);
            }
            
            mineHit = true;
          }
        }
      }
      
      // Remove mine after hitting an ant
      if (mineHit) {
        landMines.splice(m, 1);
      }
    }
  }
}

const MINE_MELT_BASE_FRAMES = 300; // 5 seconds at 60fps
const MINE_MELT_FADE_FRAMES = 60;  // Final second spent visibly melting

function getMineMeltFrames(ownerId) {
  return MINE_MELT_BASE_FRAMES * (residueMultiplier[ownerId] || 1);
}

// Categorize bullet speed into tiers and return damage multiplier and knockback tier
function getBulletSpeedTier(speed) {
  if (speed <= 2) {
    return { name: "LOW SPEED", damageMultiplier: 0.5, knockbackTier: 1 };
  } else if (speed <= 7) {
    return { name: "REGULAR SPEED", damageMultiplier: 1.0, knockbackTier: 2 };
  } else if (speed <= 10) {
    return { name: "FAST SPEED", damageMultiplier: 1.5, knockbackTier: 3 };
  } else if (speed <= 14) {
    return { name: "SNIPER SPEED", damageMultiplier: 2.0, knockbackTier: 4 };
  } else {
    return { name: "GOD SPEED", damageMultiplier: 3.0, knockbackTier: 5 };
  }
}

// hitInfo (bullets only): { highArc, vx, vy } — high arc bullets still reach a flying beetle, and the velocity
// is what Shell Shrapnel flies off with
function handlePlayerHit(i, isKnockbackBullet = false, bulletX = 0, bulletY = 0, knockbackMult = 1, bulletSpeed = 5, isMine = false, customBulletSize = null, hitInfo = null){
  if (end == false){
    // Flying over it, or the bunker takes it instead (same damage, before the beetle's own damage reduction)
    const hitSize = customBulletSize !== null ? customBulletSize : bulletSize[i];
    const rawDamage = isMine ? hitSize : hitSize * getBulletSpeedTier(bulletSpeed).damageMultiplier;
    if (interceptPlayerDamage(rawDamage, !!(hitInfo && hitInfo.highArc))) return;

    // Hit reload fire type: a bullet hit starts a short white flash, and the ant fires again
    // the moment the flash ends. Hits during an active flash don't restart it.
    if (!isMine && getFireType(i) === -2) {
      const flashActive = antHitReloadFlashFrame[i] !== undefined &&
        frameCount - antHitReloadFlashFrame[i] < HIT_RELOAD_FLASH_FRAMES;
      if (!flashActive) {
        antHitReloadFlashFrame[i] = frameCount;
        // Back-date the last shot so the cooldown finishes exactly when the flash does
        antLastShotFrame[i] = frameCount + HIT_RELOAD_FLASH_FRAMES - bulletCooldown[i] * HIT_RELOAD_COOLDOWN_MULTIPLIER;
      }
    }

    // Calculate damage based on bullet speed tier and size (mines use size only)
    // Use passed customBulletSize or fall back to bulletSize[i] for backwards compatibility
    let actualBulletSize = customBulletSize !== null ? customBulletSize : bulletSize[i];
    let speedTier = getBulletSpeedTier(bulletSpeed); // Calculate speed tier for both damage and knockback
    let damage;
    if (isMine) {
      damage = actualBulletSize;
    } else {
      damage = actualBulletSize * speedTier.damageMultiplier;
    }
    damage *= getPlayerDamageTakenMultiplier();
    
    // Apply knockback if this is a knockback bullet
    if (isKnockbackBullet) {
      let dx = playerX - bulletX;
      let dy = playerY - bulletY;
      let distance = dist(bulletX, bulletY, playerX, playerY);
      if (distance > 0) {
        // Calculate effective knockback: speedTier * knockbackStat / 5
        let effectiveKnockbackMult = speedTier.knockbackTier * knockbackMult / 5;
        let knockbackSpeed = 6 * effectiveKnockbackMult;
        // Set target velocity instead of instant velocity
        playerKnockbackTargetX = (dx / distance) * knockbackSpeed;
        playerKnockbackTargetY = (dy / distance) * knockbackSpeed;
        // Start from zero velocity and accelerate
        playerKnockbackVelX = 0;
        playerKnockbackVelY = 0;
        playerKnockedBack = true;
        playerKnockbackAccelerating = true;
        // Scale timer with effective knockback multiplier for consistent feel at all levels
        playerKnockbackTimer = 40 + (effectiveKnockbackMult - 1) * 10; // Base 40, +10 per multiplier level
        playerKnockbackInitialTimer = playerKnockbackTimer; // Store for halfway calculation
      }
    }

    onAntHitPlayer(i);
    onPlayerDamaged(damage);
    if (shield > 0){
      const shieldBefore = shield;
      shield = shield - damage;
      // Shell Shrapnel: every shield a bullet knocks off throws shrapnel back
      if (!isMine && hitInfo) spawnShellShrapnel(getShieldsLost(shieldBefore, shield), hitInfo.vx, hitInfo.vy);
      antPoints[i] = antPoints[i] + damage;
      debugLog("Ant", i, "points:", antPoints[i]);
      if(!sShieldHit1.isPlaying() || !sShieldHit2.isPlaying()) {
        sHit = round(random(1,2));
        if(sHit == 1) {
          sShieldHit1.play();
        } else {
          sShieldHit2.play();
        }       
      }
    } else {
      playerLastDamageFrame = frameCount;  // Only track damage frame when health actually decreases
      health = health - damage;
      antPoints[i] = antPoints[i] + damage;
      debugLog("Ant", i, "points:", antPoints[i]);
      if(!sHit1.isPlaying() || !sHit2.isPlaying()) {
        sHit = round(random(1,2));
        if(sHit == 1) {
          sHit1.play();
        } else {
          sHit2.play();
        }       
      }
    }
  }
}





function detectKeyboardInput(){
  if (touches.length > 0) {
    handleMobileInput(mouseX, mouseY);
  } else {
    // Reset touch tracking when no touches
    dashButtonTouched = false;
  }
  
  // Update free aiming if enabled
  updateFreeAim();
  
  // Apply player knockback if active (ONCE per frame, not per ant)
  if (playerKnockedBack) {
    if (playerKnockbackAccelerating) {
      // Acceleration phase - gradually increase velocity toward target
      let accelRate = 0.25; // Accelerate at 25% per frame
      playerKnockbackVelX += (playerKnockbackTargetX - playerKnockbackVelX) * accelRate;
      playerKnockbackVelY += (playerKnockbackTargetY - playerKnockbackVelY) * accelRate;
      
      // Switch to deceleration when velocity is close to target or timer is halfway
      let velocityMagnitude = sqrt(playerKnockbackVelX * playerKnockbackVelX + playerKnockbackVelY * playerKnockbackVelY);
      let targetMagnitude = sqrt(playerKnockbackTargetX * playerKnockbackTargetX + playerKnockbackTargetY * playerKnockbackTargetY);
      if (velocityMagnitude >= targetMagnitude * 0.9 || playerKnockbackTimer <= playerKnockbackInitialTimer * 0.5) {
        playerKnockbackAccelerating = false;
      }
    } else {
      // Deceleration phase - gradually slow down
      playerKnockbackVelX *= 0.92;
      playerKnockbackVelY *= 0.92;
    }
    
    playerX += playerKnockbackVelX;
    playerY += playerKnockbackVelY;
    playerKnockbackTimer--;
    
    // Keep player in bounds
    playerX = constrain(playerX, sideBuffer, getGameplayWidth() - sideBuffer);
    playerY = constrain(playerY, scoreBarHeight + 25, getGameplayHeight() - expBarHeight - expBarBuffer);
    
    if (playerKnockbackTimer <= 0) {
      playerKnockedBack = false;
      playerKnockbackVelX = 0;
      playerKnockbackVelY = 0;
      playerKnockbackAccelerating = false;
    }
  }
  
  for (let i = 1; i < enemyCount + 1; i++) {
    if(end == false) {

      // Get gamepad analog values for proportional movement
      let gamepadXAxis = getGamepadLeftStickX();
      let gamepadYAxis = getGamepadLeftStickY();
      
      // Calculate movement speeds (keyboard = full speed, gamepad = proportional)
      let moveSpeedX = playerSpeed;
      let moveSpeedY = playerSpeed;
      let isGamepadMoving = false;
      
      // Check if using gamepad for movement
      if (gamepadConnected && (Math.abs(gamepadXAxis) > 0 || Math.abs(gamepadYAxis) > 0)) {
        isGamepadMoving = true;
        moveSpeedX = playerSpeed * Math.abs(gamepadXAxis);
        moveSpeedY = playerSpeed * Math.abs(gamepadYAxis);
      }

      //left
      if (isLeftPressed() || gamepadXAxis < 0) {
        let currentMoveSpeed = (isGamepadMoving && gamepadXAxis < 0) ? moveSpeedX : playerSpeed;
        if (playerX > sideBuffer + (currentMoveSpeed - 0.1)){
          playerX -= currentMoveSpeed;
        }
        if (followTarget[i] === true && !antDormant[i] && !antOrder[i]){
          if (followBeetle[i] === true){
            if (antX[i] > sideBuffer + ((antSpeed[i]) -.01)){
              antX[i] -= (antSpeed[i]);
            }
          }
        } 
        // Only update rotation if not aiming
        if (!isAiming && (!isGamepadMoving || Math.abs(gamepadYAxis) < Math.abs(gamepadXAxis))) {
          playerRotationValue = 180;
        }
      }

      //right
      if (isRightPressed() || gamepadXAxis > 0) {
        let currentMoveSpeed = (isGamepadMoving && gamepadXAxis > 0) ? moveSpeedX : playerSpeed;
        if (playerX < getGameplayWidth() - sideBuffer - (currentMoveSpeed - 0.1)){
          playerX += currentMoveSpeed;
        }
        if (followTarget[i] === true && !antDormant[i] && !antOrder[i]){
          if (followBeetle[i] === true){
            if (antX[i] < getGameplayWidth() - sideBuffer - ((antSpeed[i]) -.01)){
              antX[i] += (antSpeed[i]);
            }
          }
        } 
        // Only update rotation if not aiming
        if (!isAiming && (!isGamepadMoving || Math.abs(gamepadYAxis) < Math.abs(gamepadXAxis))) {
          playerRotationValue = 0;
        }
      }

      //up
      if (isUpPressed() || gamepadYAxis < 0) {
        let currentMoveSpeed = (isGamepadMoving && gamepadYAxis < 0) ? moveSpeedY : playerSpeed;
        if (playerY > (scoreBarHeight + 25) + (currentMoveSpeed - 0.01)){
          playerY -= currentMoveSpeed;
        }
        if (followTarget[i] === true && !antDormant[i] && !antOrder[i]){
          if (followBeetle[i] === true){
            if (antY[i] > (scoreBarHeight + 15) + ((antSpeed[i]) -.01)){
              antY[i] -= (antSpeed[i]);
            }
          }
        }
        // Only update rotation if not aiming
        if (!isAiming && (!isGamepadMoving || Math.abs(gamepadYAxis) >= Math.abs(gamepadXAxis))) {
          playerRotationValue = 270;
        }
      }

      //down
      if (isDownPressed() || gamepadYAxis > 0) {
        let currentMoveSpeed = (isGamepadMoving && gamepadYAxis > 0) ? moveSpeedY : playerSpeed;
        if (playerY < getGameplayHeight() - expBarHeight - expBarBuffer - (currentMoveSpeed - 0.1)){
          playerY += currentMoveSpeed;
        }
        if (followTarget[i] === true && !antDormant[i] && !antOrder[i]){
          if (followBeetle[i] === true){
            if (antY[i] < getGameplayHeight() - expBarHeight - expBarBuffer - ((antSpeed[i]) -.01)){
              antY[i] += (antSpeed[i]);
            }
          }
        }
        // Only update rotation if not aiming
        if (!isAiming && (!isGamepadMoving || Math.abs(gamepadYAxis) >= Math.abs(gamepadXAxis))) {
          playerRotationValue = 90;
        }
      }

      let dashPressed = isDashPressed();
      if (dashPressed && !dashPrevPressed && dashReady && !playerBunker){
        if (tigerBeetleActive) {
          // Toggle dash on/off with Tiger Beetle
          dash = !dash;
        } else {
          // Normal burst dash
          dash = true;
        }
      }
      dashPrevPressed = dashPressed;

      // Shockwave attack input (if unlocked)
      if (upgrade14Level > 0) {
        let windAttackPressed = isWindAttackPressed();
        if (windAttackPressed && !windAttackPrevPressed && windAttackReady && !isShockwaveBusy()) {
          triggerShockwave();
        }
        windAttackPrevPressed = windAttackPressed;
      }

      // No shooting in flight (the fire button lands instead)
      if (isShootPressed() && !isPlayerFlying() && !flightShootLock) {
        tryPlayerShoot();
      }
    }
  }

  if (end == false) {
    updateShotModeInput();
    updateShockwaveVariantInput();
  }
  
  // Calculate ant movement vectors for followAnt behavior
  for (let i = 1; i <= enemyCount; i++) {
    antMoveX[i] = antX[i] - antPrevX[i];
    antMoveY[i] = antY[i] - antPrevY[i];
  }
  
  // Handle followAnt + followTarget ants (follow nearest ant's movement vector)
  for (let i = 1; i <= enemyCount; i++) {
    if (followTarget[i] === true && followAnt[i] === true && !antDormant[i] && !antOrder[i]) {
      let nearest = getNearestAnt(i);
      if (nearest !== -1) {
        let dx = antMoveX[nearest];
        let dy = antMoveY[nearest];
        let length = sqrt(dx*dx + dy*dy);

        if (length > 0) {
          dx /= length;
          dy /= length;

          let oldX = antX[i];
          let oldY = antY[i];

          antX[i] += dx * antSpeed[i];
          antY[i] += dy * antSpeed[i];

          antX[i] = constrain(antX[i], sideBuffer, getGameplayWidth() - sideBuffer);
          antY[i] = constrain(antY[i], scoreBarHeight + 15, getGameplayHeight() - expBarHeight - expBarBuffer);
          
          // Update movement vector immediately so later ants in the loop can see this ant's movement
          antMoveX[i] = antX[i] - antPrevX[i];
          antMoveY[i] = antY[i] - antPrevY[i];
        }
      }
    }
  }
  
  // Update previous ant positions for next frame
  for (let i = 1; i <= enemyCount; i++) {
    antPrevX[i] = antX[i];
    antPrevY[i] = antY[i];
  }
}   

function drawMobileControls() {
  noStroke();
  fill(200, 200, 200, 150);

  for (let key in buttons) {
    let b = buttons[key];
    rect(b.x, b.y, b.w, b.h, 10);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(20);
    if (key === "up") text("↑", b.x + b.w/2, b.y + b.h/2);
    if (key === "down") text("↓", b.x + b.w/2, b.y + b.h/2);
    if (key === "left") text("←", b.x + b.w/2, b.y + b.h/2);
    if (key === "right") text("→", b.x + b.w/2, b.y + b.h/2);
    if (key === "dash") text("D", b.x + b.w/2, b.y + b.h/2);
    if (key === "shoot") text("S", b.x + b.w/2, b.y + b.h/2);
    fill(200, 200, 200, 150);
  }
}

function handleMobileInput(x, y) {
  let dashButtonCurrentlyTouched = false;
  for (let key in buttons) {
    let b = buttons[key];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      if (key === "up") playerY -= playerSpeed;
      if (key === "down") playerY += playerSpeed;
      if (key === "left") playerX -= playerSpeed;
      if (key === "right") playerX += playerSpeed;
      if (key === "dash") {
        dashButtonCurrentlyTouched = true;
        if (!dashButtonTouched && dashReady && !playerBunker) {
          if (tigerBeetleActive) {
            dash = !dash; // Toggle with Tiger Beetle
          } else {
            dash = true; // Normal burst
          }
        }
      }
      if (key === "shoot" && !isPlayerFlying()) {
        tryPlayerShoot();
      }
    }
  }
  dashButtonTouched = dashButtonCurrentlyTouched;
}

function beetleShoot() {
  // Cooldown system
  if (shotBreak > 0) {
    shotBreak -= 1 / 100;
  }

  // Fire bullet when ready
  if (playerBulletShot) {
    sSpit1.play(); // optional: keeps your sound feedback
    lastBeetleShotFrame = frameCount; // The queen guards herself when the beetle shoots
    if (playerShotMode === SHOT_MODE_SPRAY) {
      firePlayerSpray(playerX, playerY, playerRotationValue);
    } else {
      playerBullets.push({
        x: playerX,
        y: playerY,
        rotation: playerRotationValue,
        mode: playerShotMode,
        life: 0,
        hitAnts: [] // Ants a piercing bullet has already gone through
      });
    }
    playerBulletShot = false;
  }

  // Update bullets
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    let b = playerBullets[i];
    let mode = b.mode || SHOT_MODE_DEFAULT; // Deflected bullets are plain shots
    b.life = (b.life || 0) + 1;
    let prevX = b.x;
    let prevY = b.y;

    // Move bullet in its facing direction
    // Check if using free aim (arbitrary angle) or cardinal directions
    if (b.stopped) {
      // Timed bomb that reached the edge waits there for its fuse
    } else if (b.rotation === 90 || b.rotation === 0 || b.rotation === 270 || b.rotation === 180) {
      // Cardinal directions (original behavior)
      if (b.rotation == 90)  b.y += 4 * playerBulletSpeed;
      if (b.rotation == 0)   b.x += 4 * playerBulletSpeed;
      if (b.rotation == 270) b.y -= 4 * playerBulletSpeed;
      if (b.rotation == 180) b.x -= 4 * playerBulletSpeed;
    } else {
      // Free aim - use trigonometry for arbitrary angles
      // Since angleMode(DEGREES) is set, cos/sin expect degrees not radians
      b.x += cos(b.rotation) * 4 * playerBulletSpeed;
      b.y += sin(b.rotation) * 4 * playerBulletSpeed;
    }

    // draw bullet
    if (!(tigerBeetleActive && tigerBeetleMoving)) {
      drawPlayerBullet(b, mode);
    }

    // Timed bombs go off when their fuse runs out, proximity bombs when an ant gets within half the blast radius
    if ((mode === SHOT_MODE_TIMED && b.life >= TIMED_BOMB_FUSE_FRAMES) ||
        (mode === SHOT_MODE_PROXIMITY && (isAntWithin(b.x, b.y, getBombRadius() / 2) || isQueenHitAt(b.x, b.y, getBombRadius() / 2)))) {
      explodePlayerBomb(b.x, b.y, mode);
      playerBullets.splice(i, 1);
      continue;
    }

    // Mounds and bunkers stop the beetle's bullets (timed bombs wait against them for their fuse). That includes
    // the beetle's own mounds, which they don't damage; shots from inside its bunker go out through the top.
    if (!b.stopped) {
      let ownWall = getPlayerWallAt(b.x, b.y, 4, playerBunker) || getRingMoundCrossed(prevX, prevY, b.x, b.y);
      let wall = ownWall || getEnemyWallAt(b.x, b.y, 4);
      if (wall) {
        if (mode === SHOT_MODE_TIMED) {
          b.stopped = true;
        } else {
          if (mode === SHOT_MODE_IMPACT || mode === SHOT_MODE_PROXIMITY) {
            explodePlayerBomb(b.x, b.y, mode);
          } else if (!ownWall) {
            damageEnemyWall(wall, getPlayerBulletDamage());
          }
          playerBullets.splice(i, 1);
          continue;
        }
      }
    }

    // The queen: impact bombs go off on her, piercing acid hits her once and keeps going, timed and proximity
    // bombs fly over her like they do over ants
    if (mode !== SHOT_MODE_TIMED && mode !== SHOT_MODE_PROXIMITY && !b.hitQueen && isQueenHitAt(b.x, b.y, 4)) {
      if (mode === SHOT_MODE_IMPACT) {
        explodePlayerBomb(b.x, b.y, mode);
        playerBullets.splice(i, 1);
        continue;
      }
      damageQueen(getPlayerBulletDamage());
      if (mode !== SHOT_MODE_PIERCE) {
        playerBullets.splice(i, 1);
        continue;
      }
      b.hitQueen = true;
    }

    // bullet collisions - use spatial grid for optimization
    let nearbyCells = getNearbyCells(b.x, b.y);
    let bulletHit = false;

    for (let cell of nearbyCells) {
      if (bulletHit) break;

      for (let j of cell.ants) {
        // Skip if ant is airborne (in the air, not just knocked back) or hiding in a bunker
        if (isAntSheltered(j)) continue;

        if (
          b.x < antX[j] + 25 &&
          b.x > antX[j] - 25 &&
          b.y < antY[j] + 25 &&
          b.y > antY[j] - 25
        ) {
          // Timed and proximity bombs fly over ants; their fuse decides when they go off
          if (mode === SHOT_MODE_TIMED || mode === SHOT_MODE_PROXIMITY) continue;

          if (mode === SHOT_MODE_IMPACT) {
            explodePlayerBomb(b.x, b.y, mode);
            bulletHit = true;
            break;
          }

          if (b.hitAnts && b.hitAnts.includes(j)) continue; // Piercing bullet already went through this ant

          damageAntWithPlayerAcid(j);

          // Piercing bullets keep going until they've passed through their pierce count
          if (mode === SHOT_MODE_PIERCE && b.hitAnts.length < getPierceCount()) {
            b.hitAnts.push(j);
            continue;
          }

          // Otherwise remove bullet after hitting ant
          bulletHit = true;
          break;
        }
      }
    }

    if (bulletHit) {
      playerBullets.splice(i, 1);
      continue;
    }

    // remove bullet if off-screen or hitting EXP bar
    let minY = scoreBarHeight;
    let maxY = getGameplayHeight() - expBarHeight;
    if (b.x < 0 || b.x > getGameplayWidth() || b.y < minY || b.y > maxY) {
      let edgeX = constrain(b.x, 0, getGameplayWidth());
      let edgeY = constrain(b.y, minY, maxY);
      if (mode === SHOT_MODE_TIMED) {
        // Timed bombs stop at the edge and still wait out their fuse
        b.x = edgeX;
        b.y = edgeY;
        b.stopped = true;
      } else {
        // Impact and proximity bombs go off against the edge
        if (mode === SHOT_MODE_IMPACT || mode === SHOT_MODE_PROXIMITY) {
          explodePlayerBomb(edgeX, edgeY, mode);
        }
        playerBullets.splice(i, 1);
      }
    }
  }

  updatePlayerSprays();
  updatePlayerBombBlasts();
}

// ========== SPECIAL SHOTS ==========

function getSprayLength(level = upgrade29Level) {
  return 100 + level * 25; // 100 → 200
}

function getSprayWidth(level = upgrade30Level) {
  return 20 + level * 20; // 20 → 100
}

function getPierceCount(depthLevel = upgrade32Level) {
  return 1 + depthLevel; // Ants a piercing bullet passes through: 1 → 10
}

function getBombRadius(level = upgrade36Level) {
  return 60 + level * 40; // 60 → 180
}

// Bullet damage with the Potent Acid multiplier; every special shot deals the same
function getPlayerBulletDamage() {
  return 1 + (upgrade13Level * 0.2);
}

function isShotModeUnlocked(mode) {
  switch (mode) {
    case SHOT_MODE_DEFAULT: return true;
    case SHOT_MODE_SPRAY: return upgrade28Level > 0;
    case SHOT_MODE_PIERCE: return upgrade31Level > 0;
    case SHOT_MODE_IMPACT: return upgrade33Level > 0;
    case SHOT_MODE_TIMED: return upgrade34Level > 0;
    case SHOT_MODE_PROXIMITY: return upgrade35Level > 0;
  }
  return false;
}

function hasSpecialShotModes() {
  for (let m = 1; m < SHOT_MODES.length; m++) {
    if (isShotModeUnlocked(m)) return true;
  }
  return false;
}

// Next unlocked mode after `mode` in the cycle order (wraps back to default)
function getNextShotMode(mode) {
  for (let step = 1; step <= SHOT_MODES.length; step++) {
    let m = (mode + step) % SHOT_MODES.length;
    if (isShotModeUnlocked(m)) return m;
  }
  return SHOT_MODE_DEFAULT;
}

function setShotMode(mode) {
  if (mode === shotMode) return;
  shotModePrev = shotMode;
  shotMode = mode;
  shotModeMenuScroll = 1; // The new mode scrolls up into the middle row
}

function resetShotMode() {
  shotMode = SHOT_MODE_DEFAULT;
  shotModePrev = SHOT_MODE_DEFAULT;
  shotModeHeldFrames = 0;
  shotModeMenuTimer = 0;
  shotModeMenuScroll = 0;
  playerShotMode = SHOT_MODE_DEFAULT;
  playerSprays = [];
  playerBombBlasts = [];
}

// Each press cycles to the next unlocked mode; holding the button returns to the default shot
function updateShotModeInput() {
  if (!isShotModeUnlocked(shotMode)) setShotMode(SHOT_MODE_DEFAULT); // Its upgrade was taken away (dev tools)
  if (shotModeMenuTimer > 0) shotModeMenuTimer--;

  if (!isShotModePressed()) {
    shotModeHeldFrames = 0;
    return;
  }

  if (shotModeHeldFrames === 0) {
    setShotMode(getNextShotMode(shotMode));
  }
  shotModeHeldFrames++;
  if (shotModeHeldFrames === SHOT_MODE_HOLD_RESET_FRAMES) {
    setShotMode(SHOT_MODE_DEFAULT);
  }
  if (hasSpecialShotModes()) {
    shotModeMenuTimer = SHOT_MODE_MENU_LINGER_FRAMES;
  }
}

// Queue a shot in the current mode if there's enough ammo (special shots use 2 at once)
function tryPlayerShoot() {
  let cost = shotMode === SHOT_MODE_DEFAULT ? 1 : SPECIAL_SHOT_AMMO_COST;
  if (shot >= cost && shotBreak <= 0) {
    shot -= cost;
    shotBreak = 0.1;
    playerBulletShot = true;
    playerShotMode = shotMode;
  }
}

// Player acid hits ant j for one bullet's damage. Kills from every shot type count as bullet kills.
// A hit from one of the beetle's projectiles (acid by default; Shell Shrapnel passes its own damage and no score source)
function damageAntWithPlayerAcid(j, amount = getPlayerBulletDamage(), source = 'bullet') {
  damageAnt(j, amount);
  antLastHitTime[j] = millis();

  // Stun if damaged but not killed
  if (antHealth[j] > 0) {
    antStunned[j] = true;
    antStunTimer[j] = 30;
    antLastShotFrame[j] = frameCount; // Reset shooting cooldown
    antRapidFireActive[j] = false; // Cancel rapid fire
    return;
  }

  antLives[j]++;
  onAntDied(j);
  comboTime = 60;
  combo++;
  calculateBonus();
  streakPoints += Math.round(comboPoints * antSize[j]);
  let scoreGained = addKillScore(100 + comboPoints, antSize[j], source);
  // Only restore health if round is active and player is alive
  if (end == false && health > 0) {
    health += antSize[j];
  }
  addDeathEffect(antX[j], antY[j], scoreGained);
  respawnAnt(j);
}

function isAntWithin(x, y, range) {
  for (let j = 1; j <= enemyCount; j++) {
    if (isAntSheltered(j)) continue;
    if (dist(x, y, antX[j], antY[j]) < range) return true;
  }
  return false;
}

function drawPlayerBullet(b, mode) {
  push();
  angleMode(DEGREES);
  translate(b.x, b.y);
  rotate(b.rotation);
  if (mode === SHOT_MODE_DEFAULT) {
    imageMode(CENTER);
    image(bulletImage, 0, 0, 20, 20);
  } else if (mode === SHOT_MODE_PIERCE) {
    // Long blue acid dart
    let c = SHOT_MODES[mode].color;
    stroke(0);
    strokeWeight(1.5);
    fill(c[0], c[1], c[2]);
    ellipse(0, 0, 22, 9);
    noStroke();
    fill(170, 210, 255);
    ellipse(3, -1, 9, 3);
  } else {
    // Bomb: green ball with its type's center color (timed bombs blink faster as the fuse runs out)
    let c = SHOT_MODES[mode].color;
    let center = SHOT_MODES[mode].center;
    stroke(0);
    strokeWeight(1.5);
    fill(c[0], c[1], c[2]);
    ellipse(0, 0, 15, 15);
    noStroke();
    let centerAlpha = 255;
    if (mode === SHOT_MODE_TIMED) {
      let blinkRate = lerp(0.15, 0.8, b.life / TIMED_BOMB_FUSE_FRAMES);
      centerAlpha = 140 + 115 * sin(b.life * blinkRate * 57.3);
    }
    fill(center[0], center[1], center[2], centerAlpha);
    ellipse(0, 0, 7, 7);
  }
  pop();
}

// Bomb blast: damages every grounded ant within the blast radius at once
function explodePlayerBomb(x, y, mode) {
  let radius = getBombRadius();
  for (let j = 1; j <= enemyCount; j++) {
    if (isAntSheltered(j)) continue;
    if (dist(x, y, antX[j], antY[j]) <= radius) {
      damageAntWithPlayerAcid(j);
    }
  }
  for (let wall of enemyWalls) {
    if (dist(x, y, wall.x, wall.y) <= radius + wall.radius) damageEnemyWall(wall, getPlayerBulletDamage());
  }
  if (isQueenHitAt(x, y, radius)) damageQueen(getPlayerBulletDamage());
  playerBombBlasts.push({ x: x, y: y, radius: radius, mode: mode, life: 0 });
  if (!sSpit2.isPlaying()) sSpit2.play();
}

function updatePlayerBombBlasts() {
  for (let i = playerBombBlasts.length - 1; i >= 0; i--) {
    let blast = playerBombBlasts[i];
    blast.life++;
    if (blast.life >= PLAYER_BOMB_BLAST_FRAMES) {
      playerBombBlasts.splice(i, 1);
      continue;
    }
    if (tigerBeetleActive && tigerBeetleMoving) continue;

    // Green blast that snaps out to full size and fades, with the bomb type's color at its center
    let t = blast.life / PLAYER_BOMB_BLAST_FRAMES;
    let r = blast.radius * (0.6 + 0.4 * (1 - Math.pow(1 - t, 3)));
    let alpha = 220 * (1 - t);
    let c = SHOT_MODES[blast.mode].color;
    let center = SHOT_MODES[blast.mode].center;
    push();
    noStroke();
    fill(c[0], c[1], c[2], alpha * 0.45);
    ellipse(blast.x, blast.y, r * 2);
    fill(c[0], c[1], c[2], alpha * 0.7);
    ellipse(blast.x, blast.y, r * 1.4);
    fill(center[0], center[1], center[2], alpha);
    ellipse(blast.x, blast.y, r * 0.6);
    pop();
  }
}

const PLAYER_HITBOX_HALF = 25; // Beetle's square bullet hitbox reaches 25px from its center each way

// Spray: an instant cone of acid that hits every grounded ant inside it. The cone starts narrow at the
// edge of the beetle's hitbox in the direction it's facing (like an ant's stream) and widens to the
// full spray width at its tip.
function firePlayerSpray(beetleX, beetleY, angle) {
  let len = getSprayLength();
  let tipWidth = getSprayWidth();
  let baseWidth = tipWidth * 0.2;
  let antRadius = 12; // Ant body counts as hit when it overlaps the cone, not just its center
  let dirX = cos(angle);
  let dirY = sin(angle);
  // Where the facing direction leaves the square hitbox (further out on diagonals)
  let edgeDist = PLAYER_HITBOX_HALF / max(Math.abs(dirX), Math.abs(dirY));
  let x = beetleX + dirX * edgeDist;
  let y = beetleY + dirY * edgeDist;
  for (let j = 1; j <= enemyCount; j++) {
    if (isAntSheltered(j)) continue;
    let dx = antX[j] - x;
    let dy = antY[j] - y;
    let along = dx * dirX + dy * dirY;
    if (along < -antRadius || along > len + antRadius) continue;
    let across = Math.abs(-dx * dirY + dy * dirX);
    let halfWidth = lerp(baseWidth, tipWidth, constrain(along, 0, len) / len) / 2;
    if (across <= halfWidth + antRadius) {
      damageAntWithPlayerAcid(j);
    }
  }
  for (let wall of enemyWalls) {
    let dx = wall.x - x;
    let dy = wall.y - y;
    let along = dx * dirX + dy * dirY;
    if (along < -wall.radius || along > len + wall.radius) continue;
    let across = Math.abs(-dx * dirY + dy * dirX);
    let halfWidth = lerp(baseWidth, tipWidth, constrain(along, 0, len) / len) / 2;
    if (across <= halfWidth + wall.radius) damageEnemyWall(wall, getPlayerBulletDamage());
  }
  if (!isQueenImmune()) {
    let dx = queen.x - x;
    let dy = queen.y - y;
    let along = dx * dirX + dy * dirY;
    let across = Math.abs(-dx * dirY + dy * dirX);
    let halfWidth = lerp(baseWidth, tipWidth, constrain(along, 0, len) / len) / 2;
    if (along >= -QUEEN_BODY_RADIUS && along <= len + QUEEN_BODY_RADIUS && across <= halfWidth + QUEEN_BODY_RADIUS) {
      damageQueen(getPlayerBulletDamage());
    }
  }
  playerSprays.push({ x: x, y: y, angle: angle, len: len, baseWidth: baseWidth, tipWidth: tipWidth, life: 0 });
  // Smoke puffs along the cone, like an ant's bursting stream
  for (let k = 1; k <= 3; k++) {
    let d = len * k / 3;
    spawnSmokeImpact(x + dirX * d, y + dirY * d, lerp(baseWidth, tipWidth, k / 3) * 0.5, 2);
  }
}

function updatePlayerSprays() {
  for (let i = playerSprays.length - 1; i >= 0; i--) {
    let s = playerSprays[i];
    s.life++;
    if (s.life >= PLAYER_SPRAY_FRAMES) {
      playerSprays.splice(i, 1);
      continue;
    }
    if (tigerBeetleActive && tigerBeetleMoving) continue;

    let t = s.life / PLAYER_SPRAY_FRAMES;
    let alpha = 200 * (1 - t);
    let c = SHOT_MODES[SHOT_MODE_SPRAY].color;
    push();
    angleMode(DEGREES);
    translate(s.x, s.y);
    rotate(s.angle);
    noStroke();
    // Outer haze, then a denser core
    fill(c[0], c[1], c[2], alpha * 0.5);
    quad(0, -s.baseWidth / 2, s.len, -s.tipWidth / 2, s.len, s.tipWidth / 2, 0, s.baseWidth / 2);
    ellipse(s.len, 0, s.tipWidth * 0.35, s.tipWidth);
    fill(200, 200, 200, alpha * 0.6);
    quad(0, -s.baseWidth / 4, s.len * 0.9, -s.tipWidth / 4, s.len * 0.9, s.tipWidth / 4, 0, s.baseWidth / 4);
    pop();
  }
}

function beetleDash(){

  //handle dash
  if (dash == true && dashReady == true) {
    playerSpeed = movementSpeed / enemyCount * dashSpeedStat * getPlayerAphidSpeedMultiplier();
    
    // Tiger Beetle: dash is a toggle, no time limit
    if (tigerBeetleActive) {
      // No speedTime countdown, stays on until toggled off
    } else {
      // Normal dash: time-limited burst
      speedTime = speedTime - (1 / 100);
      if (speedTime <= 0){
        dash = false;
        dashCoolDown = dashCooldownStat;
        dashReady = false;

        if(!sFast.isPlaying()) {
          sFast.play();
        }
      }
    }
  } else {
    dashCoolDown = dashCoolDown - getPlayerRegenMultiplier() / 100;
    //debugLog(round(dashCoolDown));
    playerSpeed = movementSpeed / enemyCount * getPlayerAphidSpeedMultiplier();
    if (dashCoolDown <= 0){
      speedTime = 0.25;
      if (!dashReady) {
        dashReadyFlash = 1.0; // Start flash when dash becomes ready
      }
      dashReady = true;
    }
  }
  
  // Update flash timer
  if (dashReadyFlash > 0) {
    dashReadyFlash -= 0.05; // Fade out over time
    if (dashReadyFlash < 0) dashReadyFlash = 0;
  }
}

function handleWindAttack() {
  // Handle shockwave attack animation and cooldown
  if (windAttackActive) {
    // Radius from Shockwave Radius (60 to 150), doubled for a Flight and Slam landing
    let maxRadius = getShockwaveRadius() * windAttackRadiusScale;

    // Expand radius quickly (violently)
    windAttackAnimRadius += 10 * windAttackRadiusScale;

    if (windAttackAnimRadius >= maxRadius) {
      // Deflect enemy bullets within shockwave area (20% base, increases with Bullet Deflection upgrade)
      let deflectChance = getDeflectChance();

      // Use spatial grid to find bullets and mines in shockwave radius
      let nearbyCells = getNearbyCells(playerX, playerY, Math.ceil(maxRadius / GRID_CELL_SIZE));
      
      // Deflect enemy bullets
      for (let cell of nearbyCells) {
        for (let bulletData of cell.enemyBullets) {
          let bullet = bulletData.bullet;
          let bulletDistance = dist(playerX, playerY, bullet.x, bullet.y);
            
          if (bulletDistance <= maxRadius && !bullet.deflected) {
            // Check if this bullet gets deflected
            if (random() < deflectChance) {
              // Deflect bullet away from beetle (center of shockwave)
              let targetAngle = atan2(bullet.y - playerY, bullet.x - playerX) * (180 / PI);
              
              playerBullets.push({
                x: bullet.x,
                y: bullet.y,
                rotation: targetAngle
              });
              
              // Mark bullet for removal (will be removed in main bullet loop)
              bullet.deflected = true;
            }
          }
        }
      }
      
      // Deflect land mines within shockwave area
      for (let cell of nearbyCells) {
        for (let mineData of cell.mines) {
          let m = mineData.index;
          let mine = mineData.mine;
          let mineDistance = dist(playerX, playerY, mine.x, mine.y);

          if (mineDistance <= maxRadius && !mine.isPlayerMine) {
            // Check if this mine gets deflected
            if (random() < deflectChance) {
              // Convert mine into a player bullet aimed at nearest ant using spatial grid
              let nearestAntDist = Infinity;
              let targetAngle = 0;

              let mineCells = getNearbyCells(mine.x, mine.y);
              for (let antCell of mineCells) {
                for (let j of antCell.ants) {
                  let distToAnt = dist(mine.x, mine.y, antX[j], antY[j]);
                  if (distToAnt < nearestAntDist) {
                    nearestAntDist = distToAnt;
                    targetAngle = atan2(antY[j] - mine.y, antX[j] - mine.x) * (180 / PI);
                  }
                }
              }

              playerBullets.push({
                x: mine.x,
                y: mine.y,
                rotation: targetAngle
              });

              // Mark the mine for removal (will be removed in main landMines loop)
              mine.deflected = true;
            }
          }
        }
      }
      
      // Deal damage to ants within shockwave radius using spatial grid
      let windDamage = getShockwaveDamage() * windAttackDamageScale;
      let knockbackMultiplier = 4; // 4, 6, 8, 10 in 3 steps
      
      for (let cell of nearbyCells) {
        for (let i of cell.ants) {
          // Skip if ant is airborne (in the air, not just knocked back) or hiding in a bunker
          if (isAntSheltered(i)) continue;
          
          let distance = dist(playerX, playerY, antX[i], antY[i]);
          if (distance <= maxRadius) {
            // Deal damage
            damageAnt(i, windDamage);
            antLastHitTime[i] = millis();
            
            // Stun if damaged but not killed
            if (antHealth[i] > 0) {
              antStunned[i] = true;
              antStunTimer[i] = 30;
              antLastShotFrame[i] = frameCount; // Reset shooting cooldown
              antRapidFireActive[i] = false; // Cancel rapid fire
            }
            
            // Apply knockback
            let angle = atan2(antY[i] - playerY, antX[i] - playerX);
            let knockbackSpeed = movementSpeed * knockbackMultiplier / antSize[i];
            antKnockbackVelX[i] = cos(angle) * knockbackSpeed;
            antKnockbackVelY[i] = sin(angle) * knockbackSpeed;
            antKnockedBack[i] = true;
            antKnockbackTimer[i] = 60; // 1 second knockback
            
            // Check if ant dies
            if (antHealth[i] <= 0) {
              antLives[i]++;
              onAntDied(i);
              comboTime = 60;
              combo++;
              calculateBonus();
              streakPoints += Math.round(comboPoints * antSize[i]);
              let scoreGained = addKillScore(100 + comboPoints, antSize[i], 'shockwave');
              health += antSize[i];
              addDeathEffect(antX[i], antY[i], scoreGained);
              respawnAnt(i);
            }
          }
        }
      }
      
      if (isQueenHitAt(playerX, playerY, maxRadius)) damageQueen(windDamage);

      // Mounds and bunkers in the shockwave take its damage too
      for (let wall of enemyWalls) {
        if (dist(playerX, playerY, wall.x, wall.y) <= maxRadius + wall.radius) damageEnemyWall(wall, windDamage);
      }

      // Shockwave attack is done, start fade
      windAttackActive = false;
    }
  }
  
  // Fade out effect
  if (windAttackAlpha > 0 && !windAttackActive) {
    windAttackAlpha -= 15; // Fade out slowly
    if (windAttackAlpha < 0) windAttackAlpha = 0;
  }
  
  // Handle cooldown
  if (!windAttackReady) {
    if (windAttackCooldown === 0) {
      windAttackCooldown = windCooldownStat;
    }
    
    // Flight and Slam's cooldown only starts once the beetle is back on the ground
    if (!isPlayerFlying()) windAttackCooldown -= getPlayerRegenMultiplier() / 100;
    if (windAttackCooldown <= 0) {
      if (!windAttackReady) {
        windAttackReadyFlash = 1.0;
      }
      windAttackReady = true;
      windAttackCooldown = 0;
    }
  }
  
  // Update ready flash
  if (windAttackReadyFlash > 0) {
    windAttackReadyFlash -= 0.05;
    if (windAttackReadyFlash < 0) windAttackReadyFlash = 0;
  }
}

// ========== SHOCKWAVE VARIANTS ==========
// R / left bumper cycles through the unlocked variants (holding it goes back to the original shockwave), the same
// way Q / left trigger cycles shot modes. All variants share the shockwave cooldown, scaled by their multiplier.
const SHOCKWAVE_ORIGINAL = 0;
const SHOCKWAVE_MOUND_RING = 1;
const SHOCKWAVE_BUNKER = 2;
const SHOCKWAVE_VORTEX = 3;
const SHOCKWAVE_FLIGHT = 4;
const SHOCKWAVE_VARIANTS = [
  { name: 'Shockwave', color: [180, 180, 180], cooldown: 1, upgrade: -1 },
  { name: 'Mound Ring', color: [150, 110, 65], cooldown: 2, upgrade: 44 },
  { name: 'Bunker', color: [70, 45, 20], cooldown: 2, upgrade: 45 },
  { name: 'Vortex', color: [110, 170, 255], cooldown: 1.5, upgrade: 46 },
  { name: 'Flight and Slam', color: [255, 200, 70], cooldown: 3, upgrade: 47 }
];
const PLAYER_MOUND_FRAMES = 180;          // Mound Ring mounds last 3 seconds (or until destroyed)
const PLAYER_BUNKER_FRAMES = 180;         // The beetle hides for 3 seconds
const PLAYER_BUNKER_RADIUS = 28;          // Covers the beetle's body
const MOUND_RING_GAP = 4;                 // Space between ring mounds (too narrow for anything to get through)
const VORTEX_PULL_FRAMES = 20;
const VORTEX_RADIUS_MULTIPLIER = 1.5;
const VORTEX_TARGET_FRACTION = 0.7;       // Pulled ants end up this far out in the shockwave radius
const SLAM_MULTIPLIER = 2;                // Landing shockwave: twice the radius and twice the damage
const FLIGHT_HEIGHT = 28;
const FLIGHT_RISE_FRAMES = 10;
const SLAM_WINDUP_FRAMES = 26;            // After the flight: rises higher and trembles, then drops for the slam
const SLAM_DROP_FRAMES = 5;               // ...the last few frames of it are the drop
const SLAM_WINDUP_LIFT = 1.8;             // Peak of the wind-up, x the flight height
const BUNKER_EJECT_SPEED = 7;
const ANT_WALL_RADIUS_PER_SIZE = 10;      // An ant's body for bumping into mounds
const SHRAPNEL_DAMAGE = 1;
const SHELL_BLUE_DARK = [20, 60, 160];    // The beetle's shell / shield blue: shrapnel and dash deflection
const SHELL_BLUE_LIGHT = [70, 160, 255];
const SHRAPNEL_MIN_SPEED = 3;
const SHRAPNEL_MAX_LIFE = 240;

let shockwaveVariant = SHOCKWAVE_ORIGINAL;
let shockwaveVariantPrev = SHOCKWAVE_ORIGINAL;
let shockwaveVariantHeldFrames = 0;
let shockwaveVariantMenuTimer = 0;
let shockwaveVariantMenuScroll = 0;
let windAttackCooldownMax = 2.25;         // Full length of the current cooldown, for the cooldown bar
let windAttackRadiusScale = 1;
let windAttackDamageScale = 1;
let playerWalls = [];                     // Mounds and the bunker the beetle makes (ants and their bullets can hit them)
let playerMoundRings = [];                // Mound Ring arenas: { x, y, radius, count, mounds, inside, playerInside }
let playerBunker = null;                  // The bunker wall the beetle is hiding in
let vortexPull = null;                    // { frame, ants } while the vortex is pulling
let playerFlightFrame = 0;
let playerFlightFrames = 0;               // Length of the current flight (0 = not flying)
let slamWindupFrame = 0;                  // Frames into the slam wind-up (0 = not winding up)
let flightShootLock = false;              // The fire button that ended a flight doesn't also shoot
let shrapnelPieces = [];

function getShockwaveRadius(level = upgrade15Level) {
  return (60 + level * 18) * 1.5; // 90 → 225
}

function getShockwaveDamage(level = upgrade16Level) {
  return 0.5 + level * 0.14; // 0.5 → 1.2
}

// Bullet deflection chance for the shockwave and Dash Deflection: 20% base, +20% per level, capped at 90%
function getDeflectChance(level = upgrade19Level) {
  return Math.min(0.9, (level + 1) * 0.2);
}

function getMoundHealth(level = upgrade49Level) {
  return 1 + level; // 1 → 5
}

function getFlightSeconds(level = upgrade50Level) {
  return 0.5 + level * 0.5; // 0.5 → 3
}

function getStartingHealth(level = upgrade51Level) {
  return 10 + level * 5; // 10 → 30
}

function getShrapnelCount(level = upgrade54Level) {
  return 1 + level; // 1 → 3
}

function isShockwaveVariantUnlocked(v) {
  if (v === SHOCKWAVE_ORIGINAL) return true;
  return getCurrentUpgradeLevels()[SHOCKWAVE_VARIANTS[v].upgrade] > 0;
}

function hasShockwaveVariants() {
  for (let v = 1; v < SHOCKWAVE_VARIANTS.length; v++) {
    if (isShockwaveVariantUnlocked(v)) return true;
  }
  return false;
}

function getNextShockwaveVariant(v) {
  for (let step = 1; step <= SHOCKWAVE_VARIANTS.length; step++) {
    const n = (v + step) % SHOCKWAVE_VARIANTS.length;
    if (isShockwaveVariantUnlocked(n)) return n;
  }
  return SHOCKWAVE_ORIGINAL;
}

function setShockwaveVariant(v) {
  if (v === shockwaveVariant) return;
  shockwaveVariantPrev = shockwaveVariant;
  shockwaveVariant = v;
  shockwaveVariantMenuScroll = 1;
}

function resetShockwaveVariant() {
  shockwaveVariant = SHOCKWAVE_ORIGINAL;
  shockwaveVariantPrev = SHOCKWAVE_ORIGINAL;
  shockwaveVariantHeldFrames = 0;
  shockwaveVariantMenuTimer = 0;
  shockwaveVariantMenuScroll = 0;
}

// Each press cycles to the next unlocked variant; holding the button returns to the original shockwave
function updateShockwaveVariantInput() {
  if (!isShockwaveVariantUnlocked(shockwaveVariant)) setShockwaveVariant(SHOCKWAVE_ORIGINAL); // Taken away (dev tools)
  if (shockwaveVariantMenuTimer > 0) shockwaveVariantMenuTimer--;
  if (upgrade14Level === 0 || !isShockwaveVariantPressed()) {
    shockwaveVariantHeldFrames = 0;
    return;
  }
  if (shockwaveVariantHeldFrames === 0) setShockwaveVariant(getNextShockwaveVariant(shockwaveVariant));
  shockwaveVariantHeldFrames++;
  if (shockwaveVariantHeldFrames === SHOT_MODE_HOLD_RESET_FRAMES) setShockwaveVariant(SHOCKWAVE_ORIGINAL);
  if (hasShockwaveVariants()) shockwaveVariantMenuTimer = SHOT_MODE_MENU_LINGER_FRAMES;
}

function isPlayerFlying() {
  return playerFlightFrames > 0;
}

// A variant still playing out blocks the next shockwave
function isShockwaveBusy() {
  return windAttackActive || isPlayerFlying() || !!playerBunker || !!vortexPull;
}

// Fire the selected variant and start the shared cooldown
function triggerShockwave() {
  windAttackReady = false;
  windAttackCooldown = windCooldownStat * SHOCKWAVE_VARIANTS[shockwaveVariant].cooldown;
  windAttackCooldownMax = windAttackCooldown;
  switch (shockwaveVariant) {
    case SHOCKWAVE_MOUND_RING: spawnMoundRing(); startShockwaveBlast(1, 1); break;
    case SHOCKWAVE_BUNKER: enterPlayerBunker(); break;
    case SHOCKWAVE_VORTEX: startVortex(); break;
    case SHOCKWAVE_FLIGHT: startFlight(); break;
    default: startShockwaveBlast(1, 1);
  }
}

function startShockwaveBlast(radiusScale, damageScale) {
  windAttackActive = true;
  windAttackAnimRadius = 0;
  windAttackAlpha = 255;
  windAttackRadiusScale = radiusScale;
  windAttackDamageScale = damageScale;
}

// --- Player mounds and bunker ---

function makePlayerWall(x, y, radius, bunker, maxLife) {
  return {
    x: x,
    y: y,
    radius: radius,
    bunker: bunker,
    owner: 'player',
    health: getMoundHealth(),
    maxHealth: getMoundHealth(),
    life: 0,
    maxLife: maxLife,
    hitFlash: 0,
    dashHit: false,
    occupants: 0
  };
}

// Any damage an ant or the queen does to one of the beetle's mounds or its bunker
function damagePlayerWall(wall, amount) {
  if (wall.health <= 0 || !(amount > 0)) return;
  wall.health -= amount;
  wall.hitFlash = WALL_HIT_FLASH_FRAMES;
  wall.lastHitTime = millis();
}

// The live player mound or bunker a point is touching (within extra px of its edge), or null
function getPlayerWallAt(x, y, extra, skip = null) {
  for (const wall of playerWalls) {
    if (wall.health <= 0 || wall === skip) continue;
    const reach = wall.radius + extra;
    const dx = x - wall.x;
    const dy = y - wall.y;
    if (dx * dx + dy * dy < reach * reach) return wall;
  }
  return null;
}

// The beetle's mound or bunker an ant or queen shot at (x, y), moving (vx, vy) a frame, is hitting: touching one,
// or having gone through a mound ring since last frame
function getPlayerWallHitBy(x, y, vx, vy) {
  return getPlayerWallAt(x, y, 4) || getRingMoundCrossed(x - vx, y - vy, x, y);
}

// Ant-made mounds (not bunkers: ants hide in those) block ants and their own bullets too
function getEnemyMoundAt(x, y, extra) {
  for (const wall of enemyWalls) {
    if (wall.bunker || wall.health <= 0) continue;
    const reach = wall.radius + extra;
    const dx = x - wall.x;
    const dy = y - wall.y;
    if (dx * dx + dy * dy < reach * reach) return wall;
  }
  return null;
}

// Mound Ring: as many mounds as fit around the shockwave radius, nearly touching, so nothing gets through. It goes
// up with the normal blast, so ants inside get knocked into the wall and stay trapped in the arena with the beetle
// until the mounds fall or one is broken open.
function spawnMoundRing() {
  const ringRadius = getShockwaveRadius();
  const count = Math.max(6, Math.floor((Math.PI * 2 * ringRadius) / (MOUND_RADIUS * 2 + MOUND_RING_GAP)));
  const ring = { x: playerX, y: playerY, radius: ringRadius, count: count, mounds: [], inside: new Set(), playerInside: true };
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2;
    const wall = makePlayerWall(playerX + Math.cos(a) * ringRadius, playerY + Math.sin(a) * ringRadius,
      MOUND_RADIUS, false, PLAYER_MOUND_FRAMES);
    ring.mounds.push(wall);
    playerWalls.push(wall);
  }
  playerMoundRings.push(ring);
  spawnSmokeImpact(playerX, playerY, ringRadius * 0.5, 3);
  for (let i = 1; i <= enemyCount; i++) {
    if (isAntSheltered(i) || antDormant[i]) continue;
    const d = dist(playerX, playerY, antX[i], antY[i]);
    const antR = ANT_WALL_RADIUS_PER_SIZE * antSize[i];
    // Ants caught where a mound comes up get shoved to whichever side of the ring they were on
    if (Math.abs(d - ringRadius) < MOUND_RADIUS + antR) {
      const a = d > 0 ? Math.atan2(antY[i] - playerY, antX[i] - playerX) : Math.random() * Math.PI * 2;
      const r = d < ringRadius ? Math.max(0, ringRadius - MOUND_RADIUS - antR - 1) : ringRadius + MOUND_RADIUS + antR + 1;
      antX[i] = playerX + Math.cos(a) * r;
      antY[i] = playerY + Math.sin(a) * r;
    }
    if (d < ringRadius) ring.inside.add(i);
  }
}

// The ring mound covering the angle of (x, y) around the ring, if it's still standing (null = a gap)
function getRingMoundAtAngle(ring, x, y) {
  const a = Math.atan2(y - ring.y, x - ring.x);
  const k = ((Math.round(a / (Math.PI * 2) * ring.count) % ring.count) + ring.count) % ring.count;
  const mound = ring.mounds[k];
  return (mound.health > 0 && playerWalls.includes(mound)) ? mound : null;
}

// Something of radius bodyR trapped in a ring that has got past its inner edge: where to put it back, or null if
// it's still inside or is going out through a gap
function getRingContainment(ring, x, y, bodyR) {
  const dx = x - ring.x;
  const dy = y - ring.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const limit = Math.max(0, ring.radius - MOUND_RADIUS - bodyR);
  if (d <= limit || d === 0) return null;
  if (!getRingMoundAtAngle(ring, x, y)) return null;
  return { x: ring.x + dx / d * limit, y: ring.y + dy / d * limit, nx: dx / d, ny: dy / d };
}

// Fast things (knocked back ants, dashing, bullets) can move further than the gaps between mounds in one frame, so
// the ring checks for anything trapped inside directly instead of only relying on bumping into single mounds
function containAntsInRings() {
  for (const ring of playerMoundRings) {
    for (const i of ring.inside) {
      if (antDormant[i]) {
        ring.inside.delete(i);
        continue;
      }
      if (isAntSheltered(i)) continue; // Hopping over it
      const antR = ANT_WALL_RADIUS_PER_SIZE * antSize[i];
      const back = getRingContainment(ring, antX[i], antY[i], antR);
      if (!back) {
        // Out through a gap: free
        if (dist(antX[i], antY[i], ring.x, ring.y) > ring.radius - MOUND_RADIUS - antR) ring.inside.delete(i);
        continue;
      }
      antX[i] = back.x;
      antY[i] = back.y;
      const vn = antKnockbackVelX[i] * back.nx + antKnockbackVelY[i] * back.ny;
      if (vn > 0) {
        antKnockbackVelX[i] -= vn * back.nx;
        antKnockbackVelY[i] -= vn * back.ny;
      }
    }
  }
}

function containPlayerInRings() {
  for (const ring of playerMoundRings) {
    if (!ring.playerInside) continue;
    const back = getRingContainment(ring, playerX, playerY, PLAYER_WALL_RADIUS);
    if (!back) {
      if (dist(playerX, playerY, ring.x, ring.y) > ring.radius - MOUND_RADIUS - PLAYER_WALL_RADIUS) ring.playerInside = false;
      continue;
    }
    playerX = back.x;
    playerY = back.y;
    // Knockback stops against the wall
    const vn = playerKnockbackVelX * back.nx + playerKnockbackVelY * back.ny;
    if (vn > 0) {
      playerKnockbackVelX -= vn * back.nx;
      playerKnockbackVelY -= vn * back.ny;
    }
    const tn = playerKnockbackTargetX * back.nx + playerKnockbackTargetY * back.ny;
    if (tn > 0) {
      playerKnockbackTargetX -= tn * back.nx;
      playerKnockbackTargetY -= tn * back.ny;
    }
  }
}

// A standing ring mound that a shot moving from (x0, y0) to (x1, y1) went through, or null
function getRingMoundCrossed(x0, y0, x1, y1) {
  for (const ring of playerMoundRings) {
    const r0 = dist(x0, y0, ring.x, ring.y);
    const r1 = dist(x1, y1, ring.x, ring.y);
    if ((r0 < ring.radius) === (r1 < ring.radius)) continue;
    const t = (ring.radius - r0) / (r1 - r0);
    const mound = getRingMoundAtAngle(ring, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    if (mound) return mound;
  }
  return null;
}

// Rings are gone once all their mounds are
function updatePlayerMoundRings() {
  for (let r = playerMoundRings.length - 1; r >= 0; r--) {
    if (!playerMoundRings[r].mounds.some(m => playerWalls.includes(m))) playerMoundRings.splice(r, 1);
  }
}

function enterPlayerBunker() {
  playerBunker = makePlayerWall(playerX, playerY, PLAYER_BUNKER_RADIUS, true, PLAYER_BUNKER_FRAMES);
  playerWalls.push(playerBunker);
  dash = false;
  playerKnockedBack = false;
  playerKnockbackVelX = 0;
  playerKnockbackVelY = 0;
  spawnSmokeImpact(playerX, playerY, PLAYER_BUNKER_RADIUS * 1.5, 3);
}

// The bunker ran out (climb out) or broke (thrown out the way the beetle is facing)
function exitPlayerBunker(broken) {
  playerBunker = null;
  if (!broken) return;
  const a = (isAiming && freeAimEnabled ? aimAngle : playerRotationValue) * Math.PI / 180;
  knockPlayerFrom(playerX - Math.cos(a), playerY - Math.sin(a), BUNKER_EJECT_SPEED);
}

// Inside the bunker the beetle can turn and shoot but stays put
function holdPlayerInBunker() {
  if (!playerBunker) return;
  playerX = playerBunker.x;
  playerY = playerBunker.y;
  dash = false;
  playerKnockedBack = false;
}

// Update and draw the beetle's mounds and bunker
function updatePlayerWalls() {
  for (let w = playerWalls.length - 1; w >= 0; w--) {
    const wall = playerWalls[w];
    wall.life++;
    if (wall.hitFlash > 0) wall.hitFlash--;
    if (wall.health <= 0 || wall.life >= wall.maxLife) {
      if (wall === playerBunker) exitPlayerBunker(wall.health <= 0);
      if (wall.health <= 0) spawnSmokeImpact(wall.x, wall.y, wall.radius * 1.5, 4);
      playerWalls.splice(w, 1);
      continue;
    }
    drawEnemyWall(wall);
  }
  updatePlayerMoundRings();
}

// Ants can't walk (or be knocked) through mounds: their own, the beetle's, or the beetle's bunker
function resolveAntWallCollisions() {
  if (enemyWalls.length === 0 && playerWalls.length === 0) return;
  for (let i = 1; i <= enemyCount; i++) {
    if (isAntSheltered(i) || antDormant[i]) continue;
    const antR = ANT_WALL_RADIUS_PER_SIZE * antSize[i];
    for (const list of [enemyWalls, playerWalls]) {
      for (const wall of list) {
        if (wall.health <= 0 || (list === enemyWalls && wall.bunker)) continue;
        const dx = antX[i] - wall.x;
        const dy = antY[i] - wall.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const reach = wall.radius + antR;
        if (d >= reach) continue;
        const nx = d > 0 ? dx / d : 1;
        const ny = d > 0 ? dy / d : 0;
        antX[i] = wall.x + nx * reach;
        antY[i] = wall.y + ny * reach;
        // Knocked back ants stop dead against it instead of sliding through
        const vn = antKnockbackVelX[i] * nx + antKnockbackVelY[i] * ny;
        if (vn < 0) {
          antKnockbackVelX[i] -= vn * nx;
          antKnockbackVelY[i] -= vn * ny;
        }
      }
    }
  }
  containAntsInRings();
}

// --- Vortex ---

function startVortex() {
  const pullRadius = getShockwaveRadius() * VORTEX_RADIUS_MULTIPLIER;
  const ants = [];
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i] || antAirHeight[i] > 0) continue;
    if (dist(playerX, playerY, antX[i], antY[i]) > pullRadius) continue;
    // The suction drags ants up out of their bunkers too
    if (antInBunker[i]) releaseAntFromBunker(i, false);
    ants.push(i);
  }
  vortexPull = { frame: 0, ants: ants };
}

// A quick jerk inward: each ant covers the distance to VORTEX_TARGET_FRACTION of the shockwave radius on an
// ease-in curve, then the normal shockwave goes off and blasts them back out
function updateVortex() {
  if (!vortexPull) return;
  if (vortexPull.done) {
    if (!windAttackActive) vortexPull = null;
    return;
  }
  const target = getShockwaveRadius() * VORTEX_TARGET_FRACTION;
  const t0 = vortexPull.frame / VORTEX_PULL_FRAMES;
  const t1 = (vortexPull.frame + 1) / VORTEX_PULL_FRAMES;
  const p0 = t0 * t0;
  const p1 = t1 * t1;
  const step = (p1 - p0) / (1 - p0); // Fraction of the distance still to go that's covered this frame
  for (const i of vortexPull.ants) {
    if (isAntSheltered(i) || antDormant[i]) continue;
    const dx = antX[i] - playerX;
    const dy = antY[i] - playerY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= target) continue;
    const move = (d - target) * step;
    antX[i] -= dx / d * move;
    antY[i] -= dy / d * move;
  }
  vortexPull.frame++;
  if (vortexPull.frame >= VORTEX_PULL_FRAMES) {
    // Held until the blast goes off, so pulled ants can't duck back into a bunker before it hits them
    vortexPull.done = true;
    startShockwaveBlast(1, 1);
  }
}

function drawVortex() {
  if (!vortexPull || vortexPull.done) return;
  const t = vortexPull.frame / VORTEX_PULL_FRAMES;
  const outer = getShockwaveRadius() * VORTEX_RADIUS_MULTIPLIER;
  const c = SHOCKWAVE_VARIANTS[SHOCKWAVE_VORTEX].color;
  push();
  angleMode(DEGREES);
  noFill();
  // Rings closing in from the pull radius, and spiral arms turning faster as the pull speeds up
  for (let r = 0; r < 3; r++) {
    const p = (t + r / 3) % 1;
    const radius = lerp(outer, outer * 0.3, p);
    stroke(c[0], c[1], c[2], 200 * (1 - p));
    strokeWeight(2);
    ellipse(playerX, playerY, radius * 2);
  }
  const turn = t * t * 540;
  strokeWeight(3);
  stroke(c[0], c[1], c[2], 160);
  for (let arm = 0; arm < 4; arm++) {
    const a = turn + arm * 90;
    arc(playerX, playerY, outer * 1.4 * (1 - t * 0.5), outer * 1.4 * (1 - t * 0.5), a, a + 50);
  }
  pop();
}

// --- Flight and Slam ---

function startFlight() {
  playerFlightFrame = 0;
  playerFlightFrames = Math.round(getFlightSeconds() * 60);
  flightShootLock = isShootPressed(); // A shot held down from before take-off doesn't end the flight
}

// Flight's over (time up or the fire button): wind up the slam. The beetle is still in the air until it lands.
function startSlamWindup() {
  slamWindupFrame = 1;
  flightShootLock = true; // Release fire before shooting again
}

function landSlam() {
  playerFlightFrames = 0;
  playerFlightFrame = 0;
  slamWindupFrame = 0;
  // Landing inside a mound ring traps the beetle in it again; landing outside, it stays out
  for (const ring of playerMoundRings) ring.playerInside = dist(playerX, playerY, ring.x, ring.y) < ring.radius;
  startShockwaveBlast(SLAM_MULTIPLIER, SLAM_MULTIPLIER);
  spawnSmokeImpact(playerX, playerY, getShockwaveRadius() * 0.6, 6);
}

function updateFlight() {
  if (flightShootLock && !isShootPressed()) flightShootLock = false;
  if (!isPlayerFlying()) return;
  if (slamWindupFrame > 0) {
    slamWindupFrame++;
    if (slamWindupFrame >= SLAM_WINDUP_FRAMES) landSlam();
    return;
  }
  playerFlightFrame++;
  // The fire button lands early
  if ((!flightShootLock && isShootPressed()) || playerFlightFrame >= playerFlightFrames) startSlamWindup();
}

// How high the beetle is drawn: up quickly and holds; the wind-up pulls it higher, then it drops for the slam
function getPlayerFlightHeight() {
  if (!isPlayerFlying()) return 0;
  const cruise = FLIGHT_HEIGHT * Math.min(1, playerFlightFrame / FLIGHT_RISE_FRAMES);
  if (slamWindupFrame === 0) return cruise;
  const riseFrames = SLAM_WINDUP_FRAMES - SLAM_DROP_FRAMES;
  const peak = FLIGHT_HEIGHT * SLAM_WINDUP_LIFT;
  if (slamWindupFrame <= riseFrames) {
    const t = slamWindupFrame / riseFrames;
    return lerp(cruise, peak, 1 - (1 - t) * (1 - t)); // Eases up to the peak
  }
  const t = (slamWindupFrame - riseFrames) / SLAM_DROP_FRAMES;
  return peak * (1 - t * t); // Speeds up on the way down
}

// The beetle trembles harder as the wind-up builds (still for the drop)
function getSlamWindupShake() {
  const riseFrames = SLAM_WINDUP_FRAMES - SLAM_DROP_FRAMES;
  if (slamWindupFrame === 0 || slamWindupFrame > riseFrames) return { x: 0, y: 0 };
  const amount = 2.5 * slamWindupFrame / riseFrames;
  return { x: random(-amount, amount), y: random(-amount, amount) };
}

// While winding up: where the slam will hit (fading in) and air rushing in toward the beetle
function drawSlamWindup() {
  if (slamWindupFrame === 0) return;
  const t = slamWindupFrame / SLAM_WINDUP_FRAMES;
  const slamRadius = getShockwaveRadius() * SLAM_MULTIPLIER;
  const c = SHOCKWAVE_VARIANTS[SHOCKWAVE_FLIGHT].color;
  push();
  angleMode(DEGREES);
  noFill();
  // Slam area: a dashed circle that turns and gets brighter
  stroke(c[0], c[1], c[2], 70 + 120 * t);
  strokeWeight(2);
  const dashes = 24;
  const turn = slamWindupFrame * 4;
  for (let d = 0; d < dashes; d++) {
    const a = turn + d * 360 / dashes;
    arc(playerX, playerY, slamRadius * 2, slamRadius * 2, a, a + 360 / dashes * 0.55);
  }
  // Rings closing in on the beetle, faster as it builds
  strokeWeight(2.5);
  for (let r = 0; r < 3; r++) {
    const p = (t * 2.5 + r / 3) % 1;
    stroke(255, 240, 200, 180 * p);
    ellipse(playerX, playerY, lerp(slamRadius, 30, p) * 2);
  }
  // Streaks of air pulled in from all around
  strokeWeight(2);
  for (let s = 0; s < 10; s++) {
    const a = s * 36 + slamWindupFrame * 7;
    const p = (t * 3 + s * 0.13) % 1;
    const outer = lerp(slamRadius * 0.9, 35, p);
    stroke(255, 255, 255, 140 * p);
    line(playerX + cos(a) * outer, playerY + sin(a) * outer, playerX + cos(a) * (outer - 14), playerY + sin(a) * (outer - 14));
  }
  pop();
}

// --- Damage the bunker soaks up and flight dodges ---

// Returns true when the hit never reaches the beetle (flying over it, or the bunker took it).
// highArc: high arc bullets still hit a flying beetle. rawDamage is before the beetle's damage taken multiplier.
function interceptPlayerDamage(rawDamage, highArc) {
  if (isPlayerFlying() && !highArc) return true;
  if (playerBunker) {
    damagePlayerWall(playerBunker, rawDamage);
    return true;
  }
  return false;
}

// Same damage an ant bullet would do to the beetle (size x speed tier), for hitting the beetle's mounds
function getEnemyBulletHitSpeed(bullet) {
  if (bullet.pathType === 1) return 10; // High arc bullets always hit as high-speed bullets
  if (bullet.pathType === -1) return Math.sqrt(bullet.speedX * bullet.speedX + bullet.speedY * bullet.speedY);
  return bullet.trueSpeed || 5;
}

// --- Dash Deflection ---

// While dashing, a bullet about to hit the beetle can turn into one of its own (shockwave deflection chance)
function tryDashDeflect(x, y) {
  if (!dash || upgrade52Level === 0 || random() >= getDeflectChance()) return false;
  playerBullets.push({ x: x, y: y, rotation: Math.atan2(y - playerY, x - playerX) * 180 / Math.PI });
  speedRings.push({ x: x, y: y, size: 8, maxSize: 30, alpha: 255, life: 0, color: SHELL_BLUE_LIGHT }); // The shell's blue
  return true;
}

// --- Shell Shrapnel ---

// Shields fully lost going from before to after (a partly regrown shield counts as one)
function getShieldsLost(before, after) {
  return Math.max(0, Math.ceil(before) - Math.ceil(Math.max(0, after)));
}

// Shrapnel flies off like the bullet that hit, reflected: piece 1 on its steeper axis, piece 2 on the other, piece 3 on both
function spawnShellShrapnel(shieldsLost, vx, vy) {
  if (upgrade53Level === 0 || shieldsLost <= 0) return;
  let speed = Math.sqrt(vx * vx + vy * vy);
  if (!(speed > 0)) {
    const a = random(Math.PI * 2);
    vx = Math.cos(a);
    vy = Math.sin(a);
    speed = 1;
  }
  if (speed < SHRAPNEL_MIN_SPEED) {
    vx *= SHRAPNEL_MIN_SPEED / speed;
    vy *= SHRAPNEL_MIN_SPEED / speed;
  }
  const steepIsX = Math.abs(vx) >= Math.abs(vy);
  for (let s = 0; s < shieldsLost; s++) {
    for (let k = 0; k < getShrapnelCount(); k++) {
      let svx = vx;
      let svy = vy;
      if (k === 0) {
        if (steepIsX) svx = -vx; else svy = -vy;
      } else if (k === 1) {
        if (steepIsX) svy = -vy; else svx = -vx;
      } else {
        svx = -vx;
        svy = -vy;
      }
      shrapnelPieces.push({ x: playerX, y: playerY, vx: svx, vy: svy, life: 0, spin: random(360) });
    }
  }
}

// Shrapnel only hits ants and the queen; it flies over everything else
function updateShrapnel() {
  for (let k = shrapnelPieces.length - 1; k >= 0; k--) {
    const p = shrapnelPieces[k];
    p.life++;
    p.x += p.vx;
    p.y += p.vy;
    p.spin += 25;
    if (p.life > SHRAPNEL_MAX_LIFE || !isInPlayArea(p.x, p.y)) {
      shrapnelPieces.splice(k, 1);
      continue;
    }
    let hit = false;
    for (let cell of getNearbyCells(p.x, p.y)) {
      for (let j of cell.ants) {
        if (isAntSheltered(j) || antDormant[j]) continue;
        if (Math.abs(p.x - antX[j]) < 25 && Math.abs(p.y - antY[j]) < 25) {
          damageAntWithPlayerAcid(j, SHRAPNEL_DAMAGE, null);
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
    if (!hit && isQueenHitAt(p.x, p.y, 4)) {
      damageQueen(SHRAPNEL_DAMAGE);
      hit = true;
    }
    if (hit) {
      shrapnelPieces.splice(k, 1);
      continue;
    }
    push();
    angleMode(DEGREES);
    translate(p.x, p.y);
    rotate(p.spin);
    noStroke();
    // Pieces of the blue shell
    fill(SHELL_BLUE_DARK[0], SHELL_BLUE_DARK[1], SHELL_BLUE_DARK[2]);
    triangle(-5, -3, 6, 0, -3, 4);
    fill(SHELL_BLUE_LIGHT[0], SHELL_BLUE_LIGHT[1], SHELL_BLUE_LIGHT[2]);
    triangle(-3, -2, 4, 0, -2, 2);
    pop();
  }
}

// --- Per frame ---

function updateShockwaveVariants() {
  updateVortex();
  updateFlight();
  drawVortex();
  drawSlamWindup();
  updateShrapnel();
}

function clearShockwaveVariantEffects() {
  playerWalls = [];
  playerMoundRings = [];
  playerBunker = null;
  vortexPull = null;
  playerFlightFrames = 0;
  playerFlightFrame = 0;
  slamWindupFrame = 0;
  flightShootLock = false;
  shrapnelPieces = [];
  windAttackRadiusScale = 1;
  windAttackDamageScale = 1;
}

function enemyStrike() {
  // Flash effects moved to main draw loop
  // Shield regeneration moved to main draw loop
}

function calculateBonus(){
  if(comboTime <= 0){
    combo = 0;
    streakPoints = 0;
  } else if(comboTime > 0){
    comboTime = comboTime - 1;
    if (combo > 1) {
            let comboStep = 5 - upgrade24Level; // Combo Surge: bonus grows every 5 → 1 kills
            comboPoints = Math.ceil(combo / comboStep) * comboConstant; // Calculate bonus points
        } else {
            comboPoints = 0; // No points if combo is 1 or less
    }
  }
}

function getNearestAnt(index) {
  let nearestIndex = -1;
  let nearestDist = Infinity;
  for (let j = 1; j <= enemyCount; j++) {
    if (j !== index && !antDormant[j]) { // don’t compare to self (or dormant ants)
      let dx = antX[j] - antX[index];
      let dy = antY[j] - antY[index];
      let distSq = dx * dx + dy * dy; // squared distance (faster than dist())
      if (distSq < nearestDist) {
        nearestDist = distSq;
        nearestIndex = j;
      }
    }
  }
  return nearestIndex; // index of the nearest ant
}

// Helper functions to determine winning trait based on mutation stats
const GHOST_BULLET_REVEAL_DISTANCE = 150;      // Ghost bullets start fading in within this distance of the beetle
const GHOST_BULLET_FULL_REVEAL_DISTANCE = 100; // ...and are fully visible within this distance

// Opacity multiplier (0-1) for camouflage and ghost bullets; 1 for every other bullet.
function getBulletStealthAlpha(bullet, ownerId) {
  return getStealthAlpha(bullet, getSpecialType(ownerId), bulletCamoFlashRate[ownerId]);
}

// Shared by bullets and landmines. obj needs x, y and life.
// stealthType: 2 = Camouflage, -2 = Ghost, anything else = fully visible.
function getStealthAlpha(obj, stealthType, flashRate) {
  if (stealthType === 2) {
    // Camouflage: opacity pulses between nearly invisible and fully visible, lingering low
    const rate = flashRate || 2.5; // flashes per second
    const wave = 0.5 + 0.5 * Math.sin((obj.life || 0) * rate * Math.PI * 2 / 60);
    return 0.08 + 0.92 * wave * wave;
  }
  if (stealthType === -2) {
    // Ghost: invisible beyond the reveal distance, fading in to fully visible at the full-reveal
    // distance (and back out the same way when it gets away from the beetle)
    const d = dist(obj.x, obj.y, playerX, playerY);
    return constrain((GHOST_BULLET_REVEAL_DISTANCE - d) / (GHOST_BULLET_REVEAL_DISTANCE - GHOST_BULLET_FULL_REVEAL_DISTANCE), 0, 1);
  }
  return 1;
}

// Stealth type a new landmine inherits from its owner's special (2 = Camouflage, -2 = Ghost, 0 = none)
function getMineStealthType(ownerId) {
  const specialType = getSpecialType(ownerId);
  return (specialType === 2 || specialType === -2) ? specialType : 0;
}

function getSpecialType(antIndex) {
  const aphidAbility = getAphidAbilityOverride(antIndex, 'special'); // Reroll aphid
  if (aphidAbility !== null) return aphidAbility;
  // If potential <= 0.5, return default (none)
  if (specialPotential[antIndex] <= 0.5) {
    return 0; // None (default)
  }
  // Check if ant has invested a token in the special category
  const hasInvestment = (geneTokenInvestments[antIndex] || []).some(
    inv => inv.type === 'trait' && inv.category === 'special'
  );
  if (!hasInvestment) {
    return 0; // None (no token invested)
  }
  // Find the highest value among the non-default options
  let maxVal = Math.max(
    specialExplosion[antIndex],
    specialKnockback[antIndex],
    specialCamo[antIndex],
    specialRecoil[antIndex]
  );
  if (specialExplosion[antIndex] === maxVal) return 1; // Explosion
  if (specialKnockback[antIndex] === maxVal) return -1; // Knockback
  // specialCamo: <1 = Camouflage (tier 1), >=1 = Ghost (tier 2)
  if (specialCamo[antIndex] === maxVal) return specialCamo[antIndex] >= 1 ? -2 : 2;
  // specialRecoil: <1 = Recoil (tier 1), >=1 = Launch (tier 2)
  if (specialRecoil[antIndex] === maxVal) return specialRecoil[antIndex] >= 1 ? -3 : 3;
  return 0; // None (fallback)
}

// Recoil (special tier 1): each shot pushes the ant directly away from where it's aiming.
// Launch (special tier 2): same push, plus a short hop into the air where ground attacks can't reach it.
// Both scale with the bullet fired: bigger and faster bullets kick harder and launch higher/longer.
const RECOIL_SPEED = 3.4;            // Initial push (px/frame) for a size 1 ant firing a size 1 bullet at the reference speed
const RECOIL_REFERENCE_SPEED = 1.5;  // Bullet speed (px/frame) that counts as "normal" for recoil
const RECOIL_MIN_SPEED_FACTOR = 0.5; // Speed contribution is clamped so very slow/fast bullets stay sane
const RECOIL_MAX_SPEED_FACTOR = 3;
const RECOIL_GROUND_FRICTION = 0.92; // Velocity kept per frame on the ground (higher = longer, smoother slide)
const RECOIL_AIR_FRICTION = 0.95;    // Velocity kept per frame while hopping
const LAUNCH_AIR_FRAMES = 30;        // Hop duration for a normal shot (recoil strength 1)
const LAUNCH_AIR_HEIGHT = 25;        // Peak hop height (px) for a normal shot
const LAUNCH_MAX_HOP_SCALE = 2;      // Caps how much a strong shot can stretch the hop

// Recoil strength for a bullet: average of its size (1-3) and its speed relative to the reference,
// so size and speed each add to the kick independently (~0.75x for small slow shots, up to 3x).
function getRecoilStrength(bullet) {
  const sizeFactor = bullet.size || 1;
  const speedFactor = constrain((bullet.trueSpeed || RECOIL_REFERENCE_SPEED) / RECOIL_REFERENCE_SPEED,
    RECOIL_MIN_SPEED_FACTOR, RECOIL_MAX_SPEED_FACTOR);
  return (sizeFactor + speedFactor) / 2;
}

function applyFiringRecoil(antIndex, bullet) {
  const specialType = getSpecialType(antIndex);
  if (specialType !== 3 && specialType !== -3) return;
  const strength = getRecoilStrength(bullet);
  const dx = bullet.targetX - antX[antIndex];
  const dy = bullet.targetY - antY[antIndex];
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > 0) {
    const push = RECOIL_SPEED * strength / Math.max(0.3, antSize[antIndex]);
    antRecoilVelX[antIndex] -= (dx / d) * push;
    antRecoilVelY[antIndex] -= (dy / d) * push;
  }
  if (specialType === -3) {
    const hopScale = constrain(strength, 0.75, LAUNCH_MAX_HOP_SCALE);
    antRecoilAirDuration[antIndex] = Math.round(LAUNCH_AIR_FRAMES * hopScale);
    antRecoilAirPeak[antIndex] = LAUNCH_AIR_HEIGHT * hopScale;
    antRecoilAirTimer[antIndex] = antRecoilAirDuration[antIndex];
  }
}

// Vacuum (knockback tier 2): bullets pull the beetle in when close; strength and range scale with knockback multiplier (2-5)
const VACUUM_RANGE_BASE = 40;             // Pull range (px) = base + per-multiplier * knockbackMultiplier (120-240px)
const VACUUM_RANGE_PER_KNOCKBACK = 40;
const VACUUM_PULL_PER_KNOCKBACK = 0.3;    // Pull (px/frame) at point blank = this * knockbackMultiplier (0.6-1.5), fading to 0 at max range

// Vacuum bullets are still knockback bullets (specialType -1); bullets carry a vacuumBullet flag instead.
function isVacuumKnockback(antIndex) {
  return getSpecialType(antIndex) === -1 && specialKnockback[antIndex] >= 1;
}

function getVacuumRange(bullet) {
  return VACUUM_RANGE_BASE + VACUUM_RANGE_PER_KNOCKBACK * (bullet.knockbackMultiplier || 2);
}

// Pull the beetle toward a vacuum bullet, stronger the closer it is. Skipped while the beetle is
// being knocked back so a hit's knockback plays out the same as a normal knockback bullet.
function applyVacuumPull(bullet) {
  if (playerKnockedBack) return;
  const range = getVacuumRange(bullet);
  const dx = bullet.x - playerX;
  const dy = bullet.y - playerY;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d <= 0 || d >= range) return;
  const pull = VACUUM_PULL_PER_KNOCKBACK * (bullet.knockbackMultiplier || 2) * (1 - d / range);
  playerX = constrain(playerX + (dx / d) * Math.min(pull, d), sideBuffer, getGameplayWidth() - sideBuffer);
  playerY = constrain(playerY + (dy / d) * Math.min(pull, d), scoreBarHeight + 25, getGameplayHeight() - expBarHeight - expBarBuffer);
}

const HIT_RELOAD_COOLDOWN_MULTIPLIER = 3; // Hit reload fire type: cooldown length relative to base cooldown
const HIT_RELOAD_FLASH_FRAMES = 15;       // Hit reload fire type: flash length; the ant refires when it ends
const DELAYED_BURST_MIN_DELAY = 10;       // Delayed burst fire type: shortest bulletBurstDelay (frames)
const DELAYED_BURST_MAX_DELAY = 60;       // Delayed burst fire type: longest bulletBurstDelay (frames)
// High arc bullets peak at arcDuration / 2, so this minimum keeps split arcs from splitting in the same
// window as a delayed burst (130 / 2 = 65 frames > DELAYED_BURST_MAX_DELAY)
const HIGH_ARC_MIN_DURATION = 130;
const HIGH_ARC_MAX_DURATION = 600;        // High arc duration range; uncapped, mutates freely
const EXPLODE_AFTER_MIN = 40;             // Timed explosion fuse range (frames); uncapped, mutates freely
const EXPLODE_AFTER_MAX = 800;
const SPLIT_ARC_COUNT = 3;                // Split arc path type: bullets a lofted shot splits into at its peak
const SPLIT_ARC_SPACING = 60;             // Split arc path type: sideways gap (px) between the landing points
const BEAM_MIN_WIDTH = 12;                // Beam path type: width (px) at the lowest radius multiplier
const BEAM_MAX_WIDTH = 50;                // Beam path type: width at the highest radius multiplier (the beetle's hitbox width)
const BEAM_MIN_FRAMES = 15;               // Beam path type: duration at the lowest residue multiplier
const BEAM_MAX_FRAMES = 60;               // Beam path type: duration at the highest residue multiplier
const BEAM_HIT_SPEED = 10;                // Beam path type: beam hits deal damage as high-speed (FAST tier) bullets
const BEAM_HIT_FLASH_FRAMES = 8;          // Beam path type: how long the damage flash holds after a beam hit
const BEAM_CHARGE_RING_PERIOD = 24;       // Beam path type: frames for a charging ring to close in on its bullet

// Bullets in a burst / rapid volley (2-5)
function getBurstBulletCount(i) {
  return constrain(Math.round(bulletBurstCount[i]), 2, 5);
}

// Burst and rapid bullets shrink so a volley isn't too strong: 2-5 bullets -> size / 1.25-2
function getBurstBulletSize(i) {
  return bulletSize[i] / (1 + (getBurstBulletCount(i) - 1) / 4);
}

// Build one bullet the way ant i fires it, launched from (originX, originY) at the ant's aim point.
// Ants fire from where they stand; refire death types fire from where a bullet died.
// spreadDegrees > 0 picks a random angle within that cone (burst fire).
function createAntBullet(i, originX, originY, size, spreadDegrees = 0) {
  const targetX = playerX + shotOffsetX[i];
  const targetY = playerY + shotOffsetY[i];
  // Speed depends on bullet size and how far away the aim point is
  let speedX = (targetX - originX + 1) / (bulletSpeed[i] * (size ** size));
  let speedY = (targetY - originY + 1) / (bulletSpeed[i] * (size ** size));
  let speed = Math.sqrt(speedX * speedX + speedY * speedY);
  let angle = atan2(speedY, speedX);
  if (spreadDegrees > 0) {
    angle = atan2(targetY - originY, targetX - originX) + random(-spreadDegrees / 2, spreadDegrees / 2);
    speedX = cos(angle) * speed;
    speedY = sin(angle) * speed;
  }

  // High arc bullets fly straight at the aim point and land on it when the arc ends
  const pathType = getPathType(i);
  if (pathType === 1) {
    speedX = (targetX - originX) / bulletArcDuration[i];
    speedY = (targetY - originY) / bulletArcDuration[i];
    angle = atan2(speedY, speedX);
    speed = Math.sqrt(speedX * speedX + speedY * speedY);
  }

  return {
    x: originX,
    y: originY,
    speedX: speedX,
    speedY: speedY,
    angle: angle,
    life: 0,
    explodeAfter: bulletExplodeAfter[i],
    maxLife: speed * 100,
    size: size,
    trueSpeed: speed,
    knockbackBullet: (getSpecialType(i) === -1),
    vacuumBullet: isVacuumKnockback(i),
    knockbackMultiplier: bulletKnockbackMultiplier[i],
    delayFrames: 0,
    airHeight: 0,
    airProgress: 0,
    pathType: pathType,
    splitAtApex: isSplitArc(i),
    beamOnAccelerate: isBeamAccelerate(i),
    arcDuration: bulletArcDuration[i],
    curveStrength: bulletCurveStrength[i],
    accelerateDelay: bulletAccelerateDelay[i],
    hasAccelerated: false,
    blinkAt: pathType === 3 ? Math.round(constrain(blinkDelay[i] ?? BLINK_DEFAULT_DELAY, BLINK_MIN_DELAY, BLINK_MAX_DELAY)) : null,
    portal: pathType === 3 && pathBlink[i] >= 1,
    hasBlinked: false,
    targetX: targetX,
    targetY: targetY,
    noDeathEffect: false, // Refired bullets skip their ant's death type
    fireSpot: { x: antX[i] - playerX, y: antY[i] - playerY }, // Where the ant was, relative to the beetle, when it fired
    owner: i
  };
}

// Fire ant i's volley from (originX, originY): a single bullet, a burst, or a delayed burst bullet.
// Rapid fire sequences are scheduled by the caller. Returns the bullets fired.
function fireAntVolley(i, originX, originY) {
  const fireType = getFireType(i);
  const volley = [];
  if (fireType === 1) {
    // Type 1: Burst spread - each bullet shoots in a random direction within the cone
    const spreadDegrees = bulletBurstSpread[i] * 180 / PI;
    for (let b = 0; b < getBurstBulletCount(i); b++) {
      volley.push(createAntBullet(i, originX, originY, getBurstBulletSize(i), spreadDegrees));
    }
  } else {
    const bullet = createAntBullet(i, originX, originY, bulletSize[i]);
    // Type 3: Delayed burst - one full-size bullet that splits into a burst after bulletBurstDelay frames
    if (fireType === 3) {
      const burstSize = getBurstBulletSize(i);
      // Split bullets move at the speed a level 1 burst from this spot would have
      const burstVx = ((playerX + shotOffsetX[i]) - originX + 1) / (bulletSpeed[i] * (burstSize ** burstSize));
      const burstVy = ((playerY + shotOffsetY[i]) - originY + 1) / (bulletSpeed[i] * (burstSize ** burstSize));
      bullet.delayedBurst = {
        at: Math.round(Math.min(bulletBurstDelay[i], DELAYED_BURST_MAX_DELAY)),
        count: getBurstBulletCount(i),
        size: burstSize,
        speed: Math.sqrt(burstVx * burstVx + burstVy * burstVy),
        spread: bulletBurstSpread[i]
      };
    }
    volley.push(bullet);
  }
  for (const bullet of volley) {
    enemyBullets[i].push(bullet);
  }
  return volley;
}

function playSpitSound() {
  if (!sSpit1.isPlaying() && !sSpit2.isPlaying()) {
    sHit = round(random(1, 2));
    if (sHit == 1) {
      sSpit1.play();
    } else {
      sSpit2.play();
    }
  }
}

// Refire death types (deathRefire): where a bullet dies, it is fired again at the beetle the same way its
// ant fires (as one bullet that won't split, see fireDeathRefire), and with no death effect of their own. Level 1 (refire, deathType 2) plays
// a short wind-up and refires once; level 2 (turret, deathType 3) deploys a small turret that fires
// TURRET_SHOTS times and then disappears. Refired bullets hitting the beetle count toward hit reload.
const REFIRE_WINDUP_FRAMES = 30;          // Refire: wind-up animation before the bullet fires again
const TURRET_DEPLOY_FRAMES = 30;          // Turret: frames from landing to its first shot
const TURRET_SHOTS = 3;
const TURRET_SHOT_INTERVAL_MIN = 45;      // Turret: frames between shots = owner's cooldown, clamped to this range
const TURRET_SHOT_INTERVAL_MAX = 120;
const TURRET_FADE_FRAMES = 20;            // Turret: fade out after its last shot

function spawnDeathRefire(bullet, ownerId) {
  const isTurret = getDeathType(ownerId) === 3;
  deathRefires.push({
    x: bullet.x,
    y: bullet.y,
    size: bullet.size,
    owner: ownerId,
    isTurret: isTurret,
    life: 0,
    shotsLeft: isTurret ? TURRET_SHOTS : 1,
    nextShotAt: isTurret ? TURRET_DEPLOY_FRAMES : REFIRE_WINDUP_FRAMES,
    finishedAt: null   // life frame the last bullet went out
  });
}

// Fire one refired bullet from a refire spot. Refires are always a single bullet the size of the one that
// died: burst / rapid / delayed burst bullets don't split into a volley again, and split arcs don't split
// at their peak again.
function fireDeathRefire(refire) {
  const i = refire.owner;
  const bullet = createAntBullet(i, refire.x, refire.y, refire.size);
  bullet.splitAtApex = false;
  bullet.noDeathEffect = true;
  enemyBullets[i].push(bullet);
  refire.shotsLeft--;
  refire.nextShotAt = refire.life + constrain(bulletCooldown[i], TURRET_SHOT_INTERVAL_MIN, TURRET_SHOT_INTERVAL_MAX);

  // Pop ring where the shot leaves
  speedRings.push({
    x: refire.x,
    y: refire.y,
    size: 10 * refire.size,
    maxSize: 40 * refire.size,
    alpha: 255,
    life: 0
  });
  playSpitSound();
}

function updateDeathRefires() {
  for (let r = deathRefires.length - 1; r >= 0; r--) {
    const refire = deathRefires[r];
    refire.life++;

    if (refire.shotsLeft > 0 && refire.life >= refire.nextShotAt) {
      fireDeathRefire(refire);
    }

    if (refire.shotsLeft === 0 && refire.finishedAt === null) {
      refire.finishedAt = refire.life;
    }
    const fadeFrames = refire.isTurret ? TURRET_FADE_FRAMES : 0;
    if (refire.finishedAt !== null && refire.life - refire.finishedAt >= fadeFrames) {
      deathRefires.splice(r, 1);
      continue;
    }

    if (refire.isTurret) {
      drawDeathTurret(refire);
    } else if (refire.shotsLeft > 0) {
      drawDeathRefireWindup(refire);
    }
  }
}

// Refire: a red ring closes in on the dead bullet while it spins up, then it fires again
function drawDeathRefireWindup(refire) {
  const t = constrain(refire.life / REFIRE_WINDUP_FRAMES, 0, 1);
  const bulletDrawSize = 20 * refire.size;
  push();
  noFill();
  stroke(255, 70, 70, 80 + 175 * t);
  strokeWeight(1 + 2 * t);
  const ringSize = bulletDrawSize * (3 - 2 * t);
  ellipse(refire.x, refire.y, ringSize, ringSize);
  angleMode(DEGREES);
  imageMode(CENTER);
  translate(refire.x, refire.y);
  // Spins faster as the refire nears
  rotate(refire.life * (6 + 30 * t));
  tint(255, 255, 255 - 120 * t);
  image(bulletImage, 0, 0, bulletDrawSize, bulletDrawSize);
  pop();
}

// Turret: drawn like an enemy landmine with a red center that pulses faster before each shot
function drawDeathTurret(refire) {
  const deployScale = constrain(refire.life / 10, 0, 1);
  const fade = refire.finishedAt === null ? 1 : 1 - (refire.life - refire.finishedAt) / TURRET_FADE_FRAMES;
  const turretSize = 15 * refire.size * deployScale;
  const framesToShot = Math.max(0, refire.nextShotAt - refire.life);
  const charge = refire.shotsLeft > 0 ? 1 - constrain(framesToShot / TURRET_SHOT_INTERVAL_MIN, 0, 1) : 0;
  push();
  fill(0, 200, 0, 180 * fade);
  stroke(0, 255, 0, 255 * fade);
  strokeWeight(2);
  ellipse(refire.x, refire.y, turretSize, turretSize);
  noStroke();
  fill(255, 40, 40, 255 * fade);
  const coreSize = turretSize * (0.3 + 0.1 * charge * (1 + sin(refire.life * (10 + 30 * charge))));
  ellipse(refire.x, refire.y, coreSize, coreSize);
  pop();
}

// Delayed burst fire type: replace a bullet with a level 1 style burst fired from where it is now.
// Ground bullets spread in a cone aimed at the ant's target; lofted bullets keep their arc and land spread around theirs.
function spawnDelayedBurst(parent, i) {
  const burst = parent.delayedBurst;
  const spreadDegrees = burst.spread * 180 / PI;
  const isLofted = parent.pathType === 1;
  const aimX = isLofted ? parent.targetX : playerX + shotOffsetX[i];
  const aimY = isLofted ? parent.targetY : playerY + shotOffsetY[i];
  const baseAngle = atan2(aimY - parent.y, aimX - parent.x);
  const aimDist = dist(parent.x, parent.y, aimX, aimY);
  const arcFramesLeft = Math.max(1, (parent.arcDuration || 1) - parent.life);

  for (let b = 0; b < burst.count; b++) {
    // Each bullet picks a random angle within the full spread cone
    const angle = baseAngle + random(-spreadDegrees / 2, spreadDegrees / 2);
    let speedX, speedY, speed;
    if (isLofted) {
      // Land the same distance away as the original target, rotated into the cone, when the arc ends
      speedX = cos(angle) * aimDist / arcFramesLeft;
      speedY = sin(angle) * aimDist / arcFramesLeft;
      speed = Math.sqrt(speedX * speedX + speedY * speedY);
    } else {
      speed = burst.speed;
      speedX = cos(angle) * speed;
      speedY = sin(angle) * speed;
    }
    enemyBullets[i].push({
      ...parent,
      speedX: speedX,
      speedY: speedY,
      angle: angle,
      maxLife: isLofted ? parent.maxLife : speed * 100,
      size: burst.size,
      trueSpeed: speed,
      targetX: isLofted ? parent.x + cos(angle) * aimDist : aimX,
      targetY: isLofted ? parent.y + sin(angle) * aimDist : aimY,
      delayedBurst: null
    });
  }

  // Pop ring where the split happens
  speedRings.push({
    x: parent.x,
    y: parent.y - (parent.airHeight || 0),
    size: 10 * parent.size,
    maxSize: 40 * parent.size,
    alpha: 255,
    life: 0
  });
}

function getFireType(antIndex) {
  const aphidAbility = getAphidAbilityOverride(antIndex, 'fire'); // Reroll aphid
  if (aphidAbility !== null) return aphidAbility;
  // If potential <= 0.5, return default (normal)
  if (firePotential[antIndex] <= 0.5) {
    return 0; // Normal (default)
  }
  // Check if ant has invested a token in the fire category
  const hasInvestment = (geneTokenInvestments[antIndex] || []).some(
    inv => inv.type === 'trait' && inv.category === 'fire'
  );
  if (!hasInvestment) {
    return 0; // Normal (no token invested)
  }
  // Find the highest value among the non-default options
  let maxVal = Math.max(
    fireBurst[antIndex],
    fireRapid[antIndex],
    fireAlternating[antIndex],
    fireAlarm[antIndex] || 0
  );
  // fireBurst: <1 = Burst (tier 1), >=1 = Delayed Burst (tier 2)
  if (fireBurst[antIndex] === maxVal) return fireBurst[antIndex] >= 1 ? 3 : 1;
  // fireRapid: <1 = Rapid (tier 1), >=1 = Stream (tier 2)
  if (fireRapid[antIndex] === maxVal) return fireRapid[antIndex] >= 1 ? 4 : 2;
  // fireAlternating: <1 = Alternating (tier 1), >=1 = Hit Reload (tier 2)
  if (fireAlternating[antIndex] === maxVal) return fireAlternating[antIndex] >= 1 ? -2 : -1;
  // fireAlarm: <1 = Alarm (tier 1), >=1 = Avenge (tier 2)
  if (fireAlarm[antIndex] === maxVal) return fireAlarm[antIndex] >= 1 ? 6 : 5;
  return 0; // Normal (fallback)
}

function getDeathType(antIndex) {
  const aphidAbility = getAphidAbilityOverride(antIndex, 'death'); // Reroll aphid
  if (aphidAbility !== null) return aphidAbility;
  // If potential <= 0.5, return default (fading)
  if (deathPotential[antIndex] <= 0.5) {
    return 0; // Fading (default)
  }
  // Check if ant has invested a token in the death category
  const hasInvestment = (geneTokenInvestments[antIndex] || []).some(
    inv => inv.type === 'trait' && inv.category === 'death'
  );
  if (!hasInvestment) {
    return 0; // Fading (no token invested)
  }
  // Highest death trait wins; ties go to the earlier one (landmine, refire, territory, mound)
  const refire = deathRefire[antIndex] || 0;
  const territory = deathTerritory[antIndex] || 0;
  const mound = deathMound[antIndex] || 0;
  if (deathLandmine[antIndex] >= Math.max(refire, territory, mound)) {
    // deathLandmine: <1 = Smear (tier 1), >=1 = Landmine (tier 2)
    if (deathLandmine[antIndex] >= 1) return 1; // Landmine (tier 2)
    if (deathLandmine[antIndex] > 0) return -1; // Smear (tier 1, base)
    return 0; // Fading (fallback)
  }
  // deathRefire: <1 = Refire (tier 1), >=1 = Turret (tier 2)
  if (refire >= Math.max(territory, mound)) return refire >= 1 ? 3 : 2;
  // deathTerritory: <1 = Territory (tier 1), >=1 = Nest (tier 2)
  if (territory >= mound) return territory >= 1 ? 5 : 4;
  // deathMound: <1 = Mound (tier 1), >=1 = Bunker (tier 2)
  return mound >= 1 ? 7 : 6;
}

// Split arc (high arc tier 2): lofted bullets split into SPLIT_ARC_COUNT at the top of their arc.
// Split arc bullets are still pathType 1; bullets carry a splitAtApex flag instead.
function isSplitArc(antIndex) {
  return getPathType(antIndex) === 1 && pathHighArc[antIndex] >= 1;
}

// Split arc: replace a lofted bullet at its peak with SPLIT_ARC_COUNT smaller ones that finish the same arc,
// landing in a row across the original target
function spawnSplitArc(parent) {
  const count = SPLIT_ARC_COUNT;
  const size = parent.size / (1 + (count - 1) / 4); // Same size scaling as a burst
  const framesLeft = Math.max(1, parent.arcDuration - parent.life);
  // Unit vector perpendicular to the flight direction
  const flightDist = dist(parent.x, parent.y, parent.targetX, parent.targetY);
  const perpX = flightDist > 0 ? -(parent.targetY - parent.y) / flightDist : 1;
  const perpY = flightDist > 0 ? (parent.targetX - parent.x) / flightDist : 0;

  for (let b = 0; b < count; b++) {
    const offset = (b - (count - 1) / 2) * SPLIT_ARC_SPACING;
    const landX = parent.targetX + perpX * offset;
    const landY = parent.targetY + perpY * offset;
    const speedX = (landX - parent.x) / framesLeft;
    const speedY = (landY - parent.y) / framesLeft;
    enemyBullets[parent.owner].push({
      ...parent,
      speedX: speedX,
      speedY: speedY,
      angle: atan2(speedY, speedX),
      size: size,
      trueSpeed: Math.sqrt(speedX * speedX + speedY * speedY),
      targetX: landX,
      targetY: landY,
      splitAtApex: false,
      delayedBurst: null
    });
  }

  // Pop ring where the split happens
  speedRings.push({
    x: parent.x,
    y: parent.y - (parent.airHeight || 0),
    size: 10 * parent.size,
    maxSize: 40 * parent.size,
    alpha: 255,
    life: 0
  });
}

// Beam (accelerate tier 2): instead of speeding up, the bullet fires a beam to the edge of the screen.
// Beam bullets are still pathType 2; bullets carry a beamOnAccelerate flag instead.
function isBeamAccelerate(antIndex) {
  return getPathType(antIndex) === 2 && pathAccelerate[antIndex] >= 1;
}

// Beam colors by special, matching the bullet auras: white = knockback, purple = vacuum,
// green = explosive (like enemy explosions), cyan = no special effect.
// Knockback, vacuum and explosion are all special types, so a beam has at most one of them.
function getBeamColors(knockbackBullet, vacuumBullet, explosive) {
  if (vacuumBullet) return { glow: [190, 90, 255], core: [235, 200, 255] };
  if (knockbackBullet) return { glow: [220, 220, 220], core: [255, 255, 255] };
  if (explosive) return { glow: [0, 255, 0], core: [210, 255, 170] };
  return { glow: [60, 220, 255], core: [225, 250, 255] };
}

// Distance along (dirX, dirY) from (x, y) to the edge of the play area
function getDistanceToPlayAreaEdge(x, y, dirX, dirY) {
  const left = 0;
  const right = getGameplayWidth();
  const top = scoreBarHeight;
  const bottom = getGameplayHeight() - expBarHeight;
  let t = Infinity;
  if (dirX > 0) t = Math.min(t, (right - x) / dirX);
  if (dirX < 0) t = Math.min(t, (left - x) / dirX);
  if (dirY > 0) t = Math.min(t, (bottom - y) / dirY);
  if (dirY < 0) t = Math.min(t, (top - y) / dirY);
  return Math.max(0, t === Infinity ? 0 : t);
}

// Replace a beam bullet with a beam along its direction of travel. Width scales with radiusMultiplier
// and duration with residueMultiplier; explosive bullets fire the beam both ways instead of exploding.
function spawnEnemyBeam(bullet) {
  const owner = bullet.owner;
  const speed = Math.sqrt(bullet.speedX * bullet.speedX + bullet.speedY * bullet.speedY);
  const dirX = speed > 0 ? bullet.speedX / speed : 1;
  const dirY = speed > 0 ? bullet.speedY / speed : 0;
  const twoWay = explodeOnTermination[owner] || triggerExplodeViaProximity[owner];
  const forward = getDistanceToPlayAreaEdge(bullet.x, bullet.y, dirX, dirY);
  const backward = twoWay ? getDistanceToPlayAreaEdge(bullet.x, bullet.y, -dirX, -dirY) : 0;

  enemyBeams.push({
    x: bullet.x,
    y: bullet.y,
    dirX: dirX,
    dirY: dirY,
    x1: bullet.x - dirX * backward,
    y1: bullet.y - dirY * backward,
    x2: bullet.x + dirX * forward,
    y2: bullet.y + dirY * forward,
    width: map(radiusMultiplier[owner] || 1, 0.5, 3, BEAM_MIN_WIDTH, BEAM_MAX_WIDTH, true),
    maxLife: Math.round(map(residueMultiplier[owner] || 1, 0.5, 3, BEAM_MIN_FRAMES, BEAM_MAX_FRAMES, true)),
    life: 0,
    size: bullet.size,
    owner: owner,
    knockbackBullet: bullet.knockbackBullet || false,
    vacuumBullet: bullet.vacuumBullet || false,
    knockbackMultiplier: bullet.knockbackMultiplier || 1,
    explosive: twoWay, // Explosive beams also burn like an explosion while the beetle stands in them
    colors: getBeamColors(bullet.knockbackBullet, bullet.vacuumBullet, twoWay),
    hasHit: false // A beam hits the beetle at most once
  });

  // Flash where the beam fires from
  speedRings.push({
    x: bullet.x,
    y: bullet.y - (bullet.airHeight || 0),
    size: 10 * bullet.size,
    maxSize: 40 * bullet.size,
    alpha: 255,
    life: 0
  });
}

// Update, hit-test and draw beams. Knockback beams push the beetle along the beam (away from where it
// fired); vacuum beams also pull the beetle toward the beam line at close range, like vacuum bullets.
function updateEnemyBeams() {
  for (let i = enemyBeams.length - 1; i >= 0; i--) {
    const beam = enemyBeams[i];
    beam.life++;

    // Closest point on the beam to the beetle
    const segX = beam.x2 - beam.x1;
    const segY = beam.y2 - beam.y1;
    const segLenSq = segX * segX + segY * segY;
    const t = segLenSq > 0 ? constrain(((playerX - beam.x1) * segX + (playerY - beam.y1) * segY) / segLenSq, 0, 1) : 0;
    const closestX = beam.x1 + segX * t;
    const closestY = beam.y1 + segY * t;

    if (beam.vacuumBullet && !beam.hasHit) {
      applyVacuumPull({ x: closestX, y: closestY, knockbackMultiplier: beam.knockbackMultiplier });
    }

    const touching = dist(playerX, playerY, closestX, closestY) <= beam.width / 2 + 25;

    // Explosive beams: every frame the beetle is inside, do a tick of explosion damage
    if (beam.explosive && touching) {
      handleExplosionDamage(beam.size, beam.owner);
    }

    if (!beam.hasHit && touching) {
      beam.hasHit = true;
      // The hit lands the frame the beam appears, so hold the damage flash long enough to see
      if (shield > 0) {
        beamShieldFlashFrames = BEAM_HIT_FLASH_FRAMES;
      } else {
        beamHealthFlashFrames = BEAM_HIT_FLASH_FRAMES;
      }
      // Knock back along the beam, on whichever side of the firing point the beetle is
      const side = (playerX - beam.x) * beam.dirX + (playerY - beam.y) * beam.dirY >= 0 ? 1 : -1;
      handlePlayerHit(
        beam.owner,
        beam.knockbackBullet,
        playerX - beam.dirX * side,
        playerY - beam.dirY * side,
        beam.knockbackMultiplier,
        BEAM_HIT_SPEED,
        false,
        beam.size
      );
    }

    // Snap open, hold, then narrow and fade over the last third
    const openT = Math.min(1, beam.life / 4);
    const fadeT = constrain((beam.maxLife - beam.life) / (beam.maxLife / 3), 0, 1);
    const w = beam.width * openT * (0.4 + 0.6 * fadeT);
    const alpha = 255 * fadeT;
    const flicker = 1 + 0.08 * Math.sin(beam.life * 1.3);
    push();
    strokeCap(ROUND);
    const glow = beam.colors.glow;
    const core = beam.colors.core;
    stroke(glow[0], glow[1], glow[2], alpha * 0.35);
    strokeWeight(w * 1.6 * flicker);
    line(beam.x1, beam.y1, beam.x2, beam.y2);
    stroke(glow[0], glow[1], glow[2], alpha * 0.8);
    strokeWeight(w);
    line(beam.x1, beam.y1, beam.x2, beam.y2);
    stroke(core[0], core[1], core[2], alpha);
    strokeWeight(w * 0.35);
    line(beam.x1, beam.y1, beam.x2, beam.y2);
    pop();

    if (beam.life >= beam.maxLife) {
      enemyBeams.splice(i, 1);
    }
  }
}

// ========== STREAM FIRE (rapid fire tier 2) ==========
// Stream ants spray one continuous stream of acid instead of firing bullets. A stream is never a bullet:
// it's an enemyStreams entity that works like a hose. Every frame the ant sprays a new bit of stream from
// its base toward the beetle, and each bit keeps flowing out the way it was sprayed at STREAM_GROWTH_SPEED
// until it reaches the end of the stream's range. So when the beetle moves, the stream has to grow a new
// end toward it from the base, and once the ant stops spraying the rest of the stream flows away. Streams
// start narrow at the base and widen to their full width at the end. Width comes from radiusMultiplier
// (and sets the range), spray duration from residueMultiplier. Death effects and the other fire types
// never apply to streams. Proximity explosion stream ants also blow themselves up when the beetle stays in
// range (see updateStreamSelfDestructs).
const STREAM_MIN_WIDTH = 12;              // Full width (px) at the lowest radius multiplier (same as a beam)
const STREAM_MAX_WIDTH = 50;              // Full width at the highest radius multiplier
const STREAM_BASE_WIDTH_FRACTION = 0.2;   // Width at the base, as a fraction of the full width at the end
const STREAM_MIN_BASE_WIDTH = 3;          // ...but never thinner than this
const STREAM_MIN_FRAMES = 30;             // Spray duration at the lowest residue multiplier
const STREAM_MAX_FRAMES = 120;            // Spray duration at the highest residue multiplier
const STREAM_GROWTH_SPEED = 3;            // px/frame each bit of stream flows out at
const STREAM_MAX_RANGE = 125;             // Longest a stream can reach (px), at width 20 or less
const STREAM_PLAYER_RADIUS = 25;          // Beetle hitbox radius for touching a stream (same as beams)
const STREAM_DAMAGE_MULTIPLIER = 2;       // handleExplosionDamage(size * 2) = bulletSize / 30 per frame, double residue
const STREAM_BREAK_GAP = 30;              // Neighbouring bits further apart than this (or the width) don't join up
const STREAM_POINT_SPACING = 6;           // Bits closer together than this are skipped when drawing / hit-testing
const STREAM_BURST_PUFFS = 8;             // Exploding streams: most smoke puffs spawned along each part of the path
const STREAM_PREFILL_ARC_STEPS = 60;      // High arc streams: bits used for a full-length stream (explosion bursts)
const STREAM_GROUND_HEIGHT = 8;           // High arc streams only touch the beetle below this height
const STREAM_CURVE_BEND = 12;             // Curved streams: radians of bend at full range per unit of curve strength
const STREAM_HOMING_TURN = 0.03;          // Homing streams: max turn (radians per px flowed) toward the beetle at the end
const STREAM_PARTICLES_PER_SIZE = 3;      // Accelerating streams: particles per stream = this * bulletSize
const STREAM_PARTICLE_SIZE_DIVISOR = 6;   // Accelerating streams: a particle hits like a bullet this many times smaller
const STREAM_PARTICLE_ACCEL = 1.03;       // Accelerating streams: particle speed-up per frame once past the range
const STREAM_PARTICLE_HIT_SPEED = 5;      // Accelerating streams: particles hit at the REGULAR speed tier (1x damage)
const STREAM_PUSH_PER_KNOCKBACK = 0.5;    // Knockback streams: push (px/frame) along the flow per knockback multiplier
const STREAM_RECOIL_PUSH = 0.15;          // Recoil streams: push (px/frame each frame) on the ant while it sprays
const STREAM_FUSE_FRAMES = 60;            // Proximity explosion stream ants: self-destruct fuse length
const STREAM_FUSE_LOCK_FRAMES = 20;       // ...the last part of the fuse can't be cancelled
const STREAM_SELF_DESTRUCT_MULTIPLIER = 2; // ...the blast hits for this many times bulletSize
const STREAM_SELF_DESTRUCT_RADIUS_SCALE = 1.5; // ...and is this many times the ant's normal explosion size
const STREAM_GHOST_FADE_START = 40;       // Ghost stream ants start fading out this many frames before spraying
const STREAM_GHOST_HIDDEN_AT = 10;        // ...are invisible from this many frames before
const STREAM_GHOST_FADE_IN = 20;          // ...and fade back in over this many frames once the stream stops
const STREAM_LAUNCH_HEIGHT = 40;          // Launch stream ants: how high they hover (higher than a launch hop, to show they're untouchable)
const STREAM_LAUNCH_RISE_FRAMES = 8;      // Launch stream ants: frames to rise to STREAM_LAUNCH_HEIGHT
const STREAM_LAUNCH_DROP_FRAMES = 12;     // Launch stream ants: frames to land once the stream stops

function isStreamFire(antIndex) {
  return getFireType(antIndex) === 4;
}

function getStreamWidth(antIndex) {
  return map(radiusMultiplier[antIndex] || 1, 0.5, 3, STREAM_MIN_WIDTH, STREAM_MAX_WIDTH, true);
}

// Range falls linearly as the stream gets wider: 125px at width 20 down to 50px at width 80
function getStreamRange(width) {
  return Math.min(STREAM_MAX_RANGE, map(width, 20, 80, STREAM_MAX_RANGE, 50));
}

function getStreamDuration(antIndex) {
  return Math.round(map(residueMultiplier[antIndex] || 1, 0.5, 3, STREAM_MIN_FRAMES, STREAM_MAX_FRAMES, true));
}

// Launch stream ants: size of the damaging spot on the ground beneath them
function getStreamLaunchSpotSize(stream) {
  return 45 + 15 * stream.size;
}

// Stream colors by special, matching the bullet auras: white = knockback, purple = vacuum, acid green otherwise
function getStreamColors(knockback, vacuum) {
  if (vacuum) return { glow: [190, 90, 255], core: [235, 200, 255] };
  if (knockback) return { glow: [220, 220, 220], core: [255, 255, 255] };
  return { glow: [110, 220, 40], core: [215, 255, 150] };
}

function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// Called by enemyShoot1 each frame for stream ants that aren't stunned
function tryFireAntStream(i) {
  if (antStream[i]) return; // Still firing; the cooldown starts once the stream finishes
  if (frameCount - antLastShotFrame[i] < bulletCooldown[i]) return;

  const stream = createAntStream(i);
  enemyStreams.push(stream);
  antStream[i] = stream;
  debugLog(`Ant ${i} started a stream - width ${stream.width.toFixed(1)}px, range ${stream.range.toFixed(0)}px, ${stream.duration}f`);
  beginStreamSpray(stream);
}

function createAntStream(i) {
  const width = getStreamWidth(i);
  const range = getStreamRange(width);
  const specialType = getSpecialType(i);
  const beam = isBeamAccelerate(i);
  const pathType = getPathType(i);
  const knockback = specialType === -1;
  const vacuum = isVacuumKnockback(i);
  // Both explosion tiers burst their streams the same way; proximity ants also self-destruct
  const explosion = explodeOnTermination[i] || triggerExplodeViaProximity[i];
  const stream = {
    owner: i,
    originX: antX[i], // The base of the stream (follows the ant while it sprays)
    originY: antY[i],
    aimAngle: 0,      // Direction the base is spraying
    aimX: 0,          // Point the base is aimed at (high arc streams land there)
    aimY: 0,
    width: width,
    range: range,
    size: bulletSize[i],
    duration: getStreamDuration(i),
    pathType: pathType,
    curveStrength: bulletCurveStrength[i] || 0,
    arcDuration: Math.max(1, bulletArcDuration[i] || HIGH_ARC_MIN_DURATION),
    splitAtApex: isSplitArc(i),
    beam: beam,
    blink: pathType === 3,                       // Blink / portal streams jump ahead partway along (see blinkStreamNode)
    portal: pathType === 3 && pathBlink[i] >= 1,
    blinkDistance: getStreamBlinkDistance(i, range),
    lastBlinkFlash: -BLINK_STREAM_FLASH_EVERY,
    emitEvery: 1,   // Frames between sprayed bits (high arcs spray less often, see below)
    particlesTotal: (pathType === 2 && !beam) ? Math.max(1, Math.round(STREAM_PARTICLES_PER_SIZE * bulletSize[i])) : 0,
    particleSpread: bulletBurstSpread[i] || PI / 3, // Full cone (radians) particles fan out in, from the burst spread gene
    particlesFired: 0,
    particles: [],
    explosion: explosion,
    knockback: knockback,
    vacuum: vacuum,
    knockbackMultiplier: bulletKnockbackMultiplier[i] || 1,
    camo: specialType === 2,
    camoFlashRate: bulletCamoFlashRate[i],
    recoil: specialType === 3 || specialType === -3,
    launch: specialType === -3,
    colors: getStreamColors(knockback, vacuum),
    phase: 'spray', // 'spray', or 'burst' once an explosion stream has burst (only its particles remain)
    phaseLife: 0,
    life: 0,
    spraying: false,
    nodes: [],      // Bits of stream in flight, oldest (furthest out) first
    livesAtStart: antLives[i]
  };
  aimStream(stream);
  stream.baseWidth = getStreamBaseWidth(stream);
  // High arc bits only move ~1.5-2px a frame, so spray one every few frames to start them about
  // STREAM_POINT_SPACING apart instead of piling up bits that would just be skipped when drawing
  if (pathType === 1) {
    const groundSpeed = dist(stream.originX, stream.originY, stream.aimX, stream.aimY) / stream.arcDuration;
    const maxSpeed = Math.sqrt(groundSpeed * groundSpeed + (Math.PI / 2) * (Math.PI / 2)); // Climb peaks at pi/2 px/frame
    stream.emitEvery = constrain(Math.floor(STREAM_POINT_SPACING / maxSpeed), 1, 4);
  }
  return stream;
}

function beginStreamSpray(stream) {
  if (stream.explosion) {
    burstStream(stream);
    return;
  }
  stream.spraying = true;
  playSpitSound();
}

// The ant stops spraying: the stream stops following it and flows away, and the cooldown starts
function stopStreamSpray(stream, died) {
  const o = stream.owner;
  stream.spraying = false;
  if (antStream[o] !== stream) return;
  antStream[o] = null;
  antStreamEndFrame[o] = frameCount;
  if (died) return;
  antLastShotFrame[o] = frameCount;
  if (stream.launch) {
    // Drop back down from the top of a hop
    antRecoilAirDuration[o] = STREAM_LAUNCH_DROP_FRAMES * 2;
    antRecoilAirPeak[o] = STREAM_LAUNCH_HEIGHT;
    antRecoilAirTimer[o] = STREAM_LAUNCH_DROP_FRAMES;
  }
}

// The base aims straight at the beetle; the rest of the stream only catches up as new spray flows out
function aimStream(stream) {
  stream.aimX = playerX + shotOffsetX[stream.owner];
  stream.aimY = playerY + shotOffsetY[stream.owner];
  stream.aimAngle = Math.atan2(stream.aimY - stream.originY, stream.aimX - stream.originX);
}

// A new bit of stream sprayed from the base toward where it's aiming
function createStreamNode(stream) {
  return {
    ox: stream.originX,      // Where it was sprayed from
    oy: stream.originY,
    x: stream.originX,
    y: stream.originY,
    h: 0,                    // Height above the ground (high arc streams)
    startHeading: stream.aimAngle,
    heading: stream.aimAngle,
    landX: stream.aimX,      // High arc streams: where it lands
    landY: stream.aimY,
    apexX: 0,                // Split arc streams: where it split, and which branch it's on (-1 = before the apex)
    apexY: 0,
    branch: -1,
    s: 0,                    // Distance flowed
    age: 0,
    blinked: false           // Blink streams: has jumped ahead already
  };
}

// Plain math rather than lerp() here and in getStreamNodeWidth: these run for every bit of every stream
// each frame, and long high arcs have a lot of bits in flight
function placeArcNode(stream, node) {
  const u = node.age / stream.arcDuration;
  if (node.branch < 0) {
    node.x = node.ox + (node.landX - node.ox) * u;
    node.y = node.oy + (node.landY - node.oy) * u;
  } else {
    const v = (u - 0.5) * 2;
    node.x = node.apexX + (node.landX - node.apexX) * v;
    node.y = node.apexY + (node.landY - node.apexY) * v;
  }
  node.h = Math.sin(u * Math.PI) * stream.arcDuration * 0.5; // Same peak as a high arc bullet
}

// Move a bit of stream one frame along its path. Returns false once it has reached the end of the stream
// (its range, or its landing point for high arcs). Split arc bits split into SPLIT_ARC_COUNT at the apex:
// the new bits go in spawned and the original is dropped.
function advanceStreamNode(stream, node, spawned) {
  node.age++;

  if (stream.pathType === 1) {
    // High arc: lobbed so it lands on its aim point when a high arc bullet would
    const u = node.age / stream.arcDuration;
    if (u >= 1) return false;
    if (stream.splitAtApex && node.branch < 0 && u >= 0.5) {
      // Split arc: split into bits that land in a row across the target
      const dx = node.landX - node.ox;
      const dy = node.landY - node.oy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const perpX = d > 0 ? -dy / d : 1;
      const perpY = d > 0 ? dx / d : 0;
      for (let b = 0; b < SPLIT_ARC_COUNT; b++) {
        const offset = (b - (SPLIT_ARC_COUNT - 1) / 2) * SPLIT_ARC_SPACING;
        const split = {
          ...node,
          branch: b,
          apexX: (node.ox + node.landX) / 2,
          apexY: (node.oy + node.landY) / 2,
          landX: node.landX + perpX * offset,
          landY: node.landY + perpY * offset
        };
        placeArcNode(stream, split);
        spawned.push(split);
      }
      return false;
    }
    placeArcNode(stream, node);
    return true;
  }

  node.s += STREAM_GROWTH_SPEED;
  if (node.s > stream.range) return false;
  const along = node.s / stream.range;
  if (stream.pathType === -1) {
    // Curved: bends harder further out, the same way round as a curved bullet
    node.heading = node.startHeading - stream.curveStrength * STREAM_CURVE_BEND * along * along;
  } else if (stream.pathType === -2) {
    // Homing: the end of the stream bends toward the beetle, whichever way it was sprayed
    if (dist(node.x, node.y, playerX, playerY) > stream.width / 2 + STREAM_PLAYER_RADIUS) {
      const maxTurn = STREAM_HOMING_TURN * STREAM_GROWTH_SPEED * along;
      node.heading += constrain(wrapAngle(Math.atan2(playerY - node.y, playerX - node.x) - node.heading), -maxTurn, maxTurn);
    }
  }
  node.x += Math.cos(node.heading) * STREAM_GROWTH_SPEED;
  node.y += Math.sin(node.heading) * STREAM_GROWTH_SPEED;
  if (stream.blink && !node.blinked && node.s >= stream.blinkDistance) blinkStreamNode(stream, node);
  return true;
}

// Advance every bit of stream a frame, and spray a new one from the base while the ant is spraying
function advanceStreamNodes(stream, nodes) {
  const next = [];
  for (const node of nodes) {
    const spawned = [];
    if (advanceStreamNode(stream, node, spawned)) next.push(node);
    for (const split of spawned) next.push(split);
  }
  return next;
}

// Bits for a stream that has sprayed steadily at its current aim long enough to reach full length (used
// when an explosion stream bursts). Oldest first, like nodes.
function prefillStreamNodes(stream) {
  const nodes = [];
  if (stream.pathType === 1) {
    const step = Math.max(1, Math.ceil(stream.arcDuration / STREAM_PREFILL_ARC_STEPS));
    for (let age = stream.arcDuration - 1; age >= 0; age -= step) {
      const node = createStreamNode(stream);
      node.age = age - 1; // Arc positions don't depend on the path so far, so one step places it
      nodes.push(...advanceStreamNodes(stream, [node]));
    }
    return nodes;
  }
  for (let age = Math.floor(stream.range / STREAM_GROWTH_SPEED); age >= 0; age--) {
    let group = [createStreamNode(stream)];
    for (let f = 0; f < age; f++) group = advanceStreamNodes(stream, group);
    nodes.push(...group);
  }
  return nodes;
}

function getStreamBaseWidth(stream) {
  return Math.max(STREAM_MIN_BASE_WIDTH, stream.width * STREAM_BASE_WIDTH_FRACTION);
}

// Narrow at the base, widening to full width at the end of the stream
function getStreamNodeWidth(stream, node) {
  let along = stream.pathType === 1 ? node.age / stream.arcDuration : node.s / stream.range;
  if (along > 1) along = 1;
  else if (along < 0) along = 0;
  return stream.baseWidth + (stream.width - stream.baseWidth) * along;
}

// The stream as polylines of points {x, y, h, w} running from the base out to the end, one per split arc
// branch (the points are the nodes themselves, with w set to their width). A polyline breaks where
// neighbouring bits have flowed too far apart (the stream was swung hard). Bits closer together than
// STREAM_POINT_SPACING are skipped, so slow high arcs (a bit or two of a pixel apart) stay cheap to draw
// and hit-test.
function getStreamSlices(stream, nodes) {
  const trunk = [];
  const branches = stream.splitAtApex ? [[], [], []] : [];
  // nodes are oldest first, so walk them backwards to run from the base outward
  for (let k = nodes.length - 1; k >= 0; k--) {
    const node = nodes[k];
    node.w = getStreamNodeWidth(stream, node);
    if (node.branch < 0) trunk.push(node);
    else branches[node.branch].push(node);
  }
  // Split arc branches carry on from the top of the climb (the first branch draws the climb itself)
  const lines = stream.splitAtApex
    ? branches.map((branch, b) => (b === 0 ? trunk : trunk.slice(-1)).concat(branch))
    : [trunk];

  const slices = [];
  const breakGapSq = Math.max(STREAM_BREAK_GAP, stream.width) ** 2;
  const spacingSq = STREAM_POINT_SPACING * STREAM_POINT_SPACING;
  for (const line of lines) {
    let current = [];
    let prev = null;
    let prevKept = true;
    for (const pt of line) {
      if (prev && streamPointDistSq(prev, pt) > breakGapSq) {
        if (!prevKept) current.push(prev);
        slices.push(current);
        current = [];
      }
      const last = current[current.length - 1];
      prevKept = !last || streamPointDistSq(last, pt) >= spacingSq;
      if (prevKept) current.push(pt);
      prev = pt;
    }
    if (prev && !prevKept) current.push(prev); // Always keep the very end
    if (current.length) slices.push(current);
  }
  return slices;
}

// Squared distance between two stream points as drawn (lifted by their height)
function streamPointDistSq(a, b) {
  const dx = b.x - a.x;
  const dy = (b.y - b.h) - (a.y - a.h);
  return dx * dx + dy * dy;
}

// Beam streams: the end of the stream carries on as a beam to the edge of the screen, once the stream
// reaches the end of its range (so a re-aimed beam has to wait for the new end to flow out)
function getStreamBeamSlice(stream, nodes) {
  const front = nodes[0];
  if (!front || front.s < stream.range - STREAM_GROWTH_SPEED) return null;
  const dirX = Math.cos(front.heading);
  const dirY = Math.sin(front.heading);
  const reach = getDistanceToPlayAreaEdge(front.x, front.y, dirX, dirY);
  return [
    { x: front.x, y: front.y, h: 0, w: stream.width },
    { x: front.x + dirX * reach, y: front.y + dirY * reach, h: 0, w: stream.width }
  ];
}

// Closest point to the beetle on the ground-level parts of these slices, with the flow direction there.
// touching accounts for the stream's width at that point. Returns null if no part of them is on the ground.
function getStreamContact(slices) {
  let best = null;
  for (const slice of slices) {
    const segments = Math.max(1, slice.length - 1);
    for (let k = 0; k < segments; k++) {
      const a = slice[k];
      const b = slice[Math.min(k + 1, slice.length - 1)];
      if (Math.max(a.h, b.h) > STREAM_GROUND_HEIGHT) continue; // Lofted parts pass over the beetle
      const segX = b.x - a.x;
      const segY = b.y - a.y;
      const lenSq = segX * segX + segY * segY;
      const t = lenSq > 0 ? constrain(((playerX - a.x) * segX + (playerY - a.y) * segY) / lenSq, 0, 1) : 0;
      const cx = a.x + segX * t;
      const cy = a.y + segY * t;
      const d = dist(playerX, playerY, cx, cy);
      const margin = d - (lerp(a.w, b.w, t) / 2 + STREAM_PLAYER_RADIUS);
      if (!best || margin < best.margin) {
        const len = Math.sqrt(lenSq) || 1;
        best = { x: cx, y: cy, margin: margin, dirX: segX / len, dirY: segY / len };
      }
    }
  }
  if (best) best.touching = best.margin <= 0;
  return best;
}

function updateEnemyStreams() {
  updateStreamSelfDestructs();
  for (let s = enemyStreams.length - 1; s >= 0; s--) {
    if (!updateEnemyStream(enemyStreams[s])) {
      enemyStreams.splice(s, 1);
    }
  }
}

// Update, hit-test and draw one stream. Returns false once it's finished.
function updateEnemyStream(stream) {
  const o = stream.owner;
  stream.life++;
  stream.phaseLife++;

  // While the ant is still firing it, the base of the stream follows the ant and aims at the beetle
  if (antStream[o] === stream) {
    const died = antLives[o] !== stream.livesAtStart;
    if (died || antStunned[o]) {
      // A stream that's already flowing just flows away
      stopStreamSpray(stream, died);
    } else {
      stream.originX = antX[o];
      stream.originY = antY[o];
      aimStream(stream);
    }
  }

  if (stream.phase === 'spray') return updateStreamSpray(stream);
  // Burst: the stream itself is gone, leaving its smoke to fade while any particles are still flying
  updateStreamParticles(stream);
  if (stream.phaseLife < SMOKE_IMPACT_FRAMES) drawStreamBurstSmoke(stream);
  return stream.particles.length > 0 || stream.phaseLife < SMOKE_IMPACT_FRAMES;
}

// Exploding streams: grey smoke where the stream burst, spreading a little as it slowly fades
function drawStreamBurstSmoke(stream) {
  if (tigerBeetleActive && tigerBeetleMoving) return;
  const t = stream.phaseLife / SMOKE_IMPACT_FRAMES;
  const alpha = 200 * (1 - t);
  const spread = 1 + 0.6 * (1 - Math.pow(1 - t, 3));
  for (const slice of stream.burstSlices) {
    fillStreamRibbon(slice, 1.6 * spread, true, [120, 120, 120], alpha * 0.45);
    fillStreamRibbon(slice, spread, true, [185, 185, 185], alpha * 0.6);
  }
}

function updateStreamSpray(stream) {
  const o = stream.owner;
  stream.nodes = advanceStreamNodes(stream, stream.nodes);
  if (stream.spraying) {
    if ((stream.phaseLife - 1) % stream.emitEvery === 0) stream.nodes.push(createStreamNode(stream));
    // Accelerating streams: particles spaced out over the spray, sprayed along with the stream
    if (stream.particlesFired < stream.particlesTotal &&
        stream.phaseLife - 1 >= stream.particlesFired * stream.duration / stream.particlesTotal) {
      stream.particles.push({
        x: stream.originX, y: stream.originY, s: 0, free: false, speed: STREAM_GROWTH_SPEED,
        dirX: Math.cos(stream.aimAngle), dirY: Math.sin(stream.aimAngle)
      });
      stream.particlesFired++;
    }
    if (stream.phaseLife >= stream.duration) stopStreamSpray(stream, false);
  }
  if (!stream.spraying && stream.nodes.length === 0 && stream.particles.length === 0) return false; // Flowed away

  const slices = getStreamSlices(stream, stream.nodes);
  // Beam streams: the beam fires from the end for as long as the stream keeps arriving there, even as it flows away
  const beamSlice = stream.beam ? getStreamBeamSlice(stream, stream.nodes) : null;
  const contact = getStreamContact(beamSlice ? slices.concat([beamSlice]) : slices);
  const touching = contact && contact.touching;

  // Damage every frame the beetle is in the stream (or on a launch ant's ground spot)
  const onLaunchSpot = stream.launch && stream.spraying &&
    dist(playerX, playerY, stream.originX, stream.originY) <= getStreamLaunchSpotSize(stream) / 2 + STREAM_PLAYER_RADIUS;
  if (touching || onLaunchSpot) {
    handleExplosionDamage(stream.size * STREAM_DAMAGE_MULTIPLIER, o);
  }

  // Knockback streams carry the beetle along with the flow; vacuum streams also pull it in when near
  if (touching && stream.knockback && !playerKnockedBack) {
    const push = STREAM_PUSH_PER_KNOCKBACK * stream.knockbackMultiplier;
    playerX = constrain(playerX + contact.dirX * push, sideBuffer, getGameplayWidth() - sideBuffer);
    playerY = constrain(playerY + contact.dirY * push, scoreBarHeight + 25, getGameplayHeight() - expBarHeight - expBarBuffer);
  }
  if (contact && stream.vacuum) {
    applyVacuumPull({ x: contact.x, y: contact.y, knockbackMultiplier: stream.knockbackMultiplier });
  }

  // Recoil streams keep pushing the ant back for as long as it sprays
  if (stream.recoil && stream.spraying) {
    const push = STREAM_RECOIL_PUSH * (1 + stream.size) / 2 / Math.max(0.3, antSize[o]);
    antRecoilVelX[o] -= Math.cos(stream.aimAngle) * push;
    antRecoilVelY[o] -= Math.sin(stream.aimAngle) * push;
  }

  updateStreamParticles(stream);

  if (!(tigerBeetleActive && tigerBeetleMoving)) {
    if (stream.launch && stream.spraying) drawStreamLaunch(stream);
    drawStreamSlices(stream, slices, beamSlice);
  }
  return true;
}

// Call fn(x, y, h, w) at points every `spacing` px along a slice (measured as drawn, so up and over arcs)
function forEachAlongStreamSlice(slice, spacing, fn) {
  if (slice.length === 1) {
    fn(slice[0].x, slice[0].y, slice[0].h, slice[0].w);
    return;
  }
  let carried = 0;
  for (let k = 0; k < slice.length - 1; k++) {
    const a = slice[k];
    const b = slice[k + 1];
    const len = dist(a.x, a.y - a.h, b.x, b.y - b.h);
    while (carried <= len) {
      const t = len > 0 ? carried / len : 0;
      fn(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.h, b.h, t), lerp(a.w, b.w, t));
      carried += spacing;
    }
    carried -= len;
  }
}

// Explosion streams (timed and proximity alike): the moment the ant fires, the whole stream bursts at once
// along its path in grey smoke for one instant hit of bulletSize, instead of burning over time.
function burstStream(stream) {
  const o = stream.owner;
  const nodes = prefillStreamNodes(stream);
  const slices = getStreamSlices(stream, nodes);
  if (stream.beam) {
    const beamSlice = getStreamBeamSlice(stream, nodes);
    if (beamSlice) slices.push(beamSlice);
  }

  const contact = getStreamContact(slices);
  if (contact && contact.touching) {
    handlePlayerHit(o, false, contact.x, contact.y, 1, 5, true, stream.size);
  }

  // Grey smoke along the path: a fading smoke ribbon (drawn in the burst phase) plus a few puffs
  // billowing off it (at most STREAM_BURST_PUFFS per slice, to keep long beams cheap)
  stream.burstSlices = slices;
  for (const slice of slices) {
    let length = 0;
    for (let k = 0; k < slice.length - 1; k++) {
      length += dist(slice[k].x, slice[k].y - slice[k].h, slice[k + 1].x, slice[k + 1].y - slice[k + 1].h);
    }
    const spacing = Math.max(20, stream.width * 1.2, length / STREAM_BURST_PUFFS);
    forEachAlongStreamSlice(slice, spacing, (x, y, h, w) => spawnSmokeImpact(x, y, w * 0.8, 2, h));
  }

  // Accelerating streams: every particle breaks away from the end at once
  const front = nodes[0];
  for (let k = 0; k < stream.particlesTotal && front; k++) {
    const a = front.heading + random(-stream.particleSpread / 2, stream.particleSpread / 2);
    stream.particles.push({ x: front.x, y: front.y, s: stream.range, free: true, speed: STREAM_GROWTH_SPEED, dirX: Math.cos(a), dirY: Math.sin(a) });
  }
  stream.particlesFired = stream.particlesTotal;
  stream.phase = 'burst';
  stream.phaseLife = 0;

  if (antStream[o] === stream) {
    antStream[o] = null;
    antStreamEndFrame[o] = frameCount;
    // Explosion streams wait as long between shots as a stream that sprayed its whole duration
    antLastShotFrame[o] = frameCount + stream.duration;
  }
  playSpitSound();
}

// Accelerating streams: particles flow out with the stream, then break away past its range in a spread and
// speed up until they leave the screen. They only hit the beetle once they've broken away (the stream itself
// already burns while it's in it).
function updateStreamParticles(stream) {
  const particleSize = stream.size / STREAM_PARTICLE_SIZE_DIVISOR;
  const drawSize = Math.max(5, 20 * particleSize);
  for (let k = stream.particles.length - 1; k >= 0; k--) {
    const part = stream.particles[k];
    if (part.free) part.speed *= STREAM_PARTICLE_ACCEL;
    part.x += part.dirX * part.speed;
    part.y += part.dirY * part.speed;
    part.s += part.speed;
    if (!part.free) {
      if (part.s >= stream.range) {
        // Break away from the end of the stream, fanning out in a spread
        const a = Math.atan2(part.dirY, part.dirX) + random(-stream.particleSpread / 2, stream.particleSpread / 2);
        part.dirX = Math.cos(a);
        part.dirY = Math.sin(a);
        part.free = true;
      }
    } else {
      if (part.x < 0 || part.x > getGameplayWidth() || part.y < scoreBarHeight || part.y > getGameplayHeight() - expBarHeight) {
        stream.particles.splice(k, 1);
        continue;
      }
      if (dist(part.x, part.y, playerX, playerY) < STREAM_PLAYER_RADIUS + drawSize / 2) {
        stream.particles.splice(k, 1);
        handlePlayerHit(stream.owner, stream.knockback, part.x, part.y, stream.knockbackMultiplier,
          STREAM_PARTICLE_HIT_SPEED, false, particleSize);
        continue;
      }
    }

    if (!(tigerBeetleActive && tigerBeetleMoving)) {
      const glow = stream.colors.glow;
      const core = stream.colors.core;
      push();
      noStroke();
      fill(glow[0], glow[1], glow[2], 150);
      ellipse(part.x, part.y, drawSize * 1.6);
      fill(core[0], core[1], core[2], 255);
      ellipse(part.x, part.y, drawSize * 0.8);
      pop();
    }
  }
}

// Fill a slice as one tapered ribbon (widthScale x each point's width, rounded at the end) in a single canvas
// path. Streams are drawn this way rather than with a line() per segment: every line() is its own canvas
// stroke, and a stream has dozens of segments per pass.
function fillStreamRibbon(slice, widthScale, lifted, color, alpha) {
  const n = slice.length;
  if (n === 0 || alpha <= 1) return;
  const ctx = drawingContext;
  ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${constrain(alpha, 0, 255) / 255})`;
  ctx.beginPath();
  if (n === 1) {
    const pt = slice[0];
    ctx.arc(pt.x, lifted ? pt.y - pt.h : pt.y, Math.max(0.5, pt.w * widthScale / 2), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Unit normal at every point (perpendicular to the path through its neighbours)
  const nx = new Array(n);
  const ny = new Array(n);
  let lastNx = 0;
  let lastNy = 1;
  for (let k = 0; k < n; k++) {
    const a = slice[Math.max(0, k - 1)];
    const b = slice[Math.min(n - 1, k + 1)];
    const dx = b.x - a.x;
    const dy = lifted ? (b.y - b.h) - (a.y - a.h) : b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      lastNx = -dy / len;
      lastNy = dx / len;
    }
    nx[k] = lastNx;
    ny[k] = lastNy;
  }

  // Out along one side...
  for (let k = 0; k < n; k++) {
    const pt = slice[k];
    const half = pt.w * widthScale / 2;
    const py = lifted ? pt.y - pt.h : pt.y;
    if (k === 0) ctx.moveTo(pt.x + nx[k] * half, py + ny[k] * half);
    else ctx.lineTo(pt.x + nx[k] * half, py + ny[k] * half);
  }
  // ...round the end...
  const end = slice[n - 1];
  const endHalf = end.w * widthScale / 2;
  const endY = lifted ? end.y - end.h : end.y;
  const endAngle = Math.atan2(ny[n - 1], nx[n - 1]);
  ctx.arc(end.x, endY, endHalf, endAngle, endAngle + Math.PI, true);
  // ...and back along the other side
  for (let k = n - 1; k >= 0; k--) {
    const pt = slice[k];
    const half = pt.w * widthScale / 2;
    const py = lifted ? pt.y - pt.h : pt.y;
    ctx.lineTo(pt.x - nx[k] * half, py - ny[k] * half);
  }
  ctx.closePath();
  ctx.fill();
}

function drawStreamSlices(stream, slices, beamSlice) {
  const alpha = 255 * (stream.camo ? getStealthAlpha(stream, 2, stream.camoFlashRate) : 1);
  if (alpha <= 2) return;
  const flicker = 1 + 0.08 * Math.sin(stream.life * 1.3);
  const glow = stream.colors.glow;
  const core = stream.colors.core;

  if (stream.pathType === 1) {
    // Shadow along the ground under a lofted stream
    for (const slice of slices) fillStreamRibbon(slice, 0.6, false, [0, 0, 0], alpha * 0.2);
  }
  for (const slice of slices) fillStreamRibbon(slice, 1.5 * flicker, true, glow, alpha * 0.35);
  for (const slice of slices) fillStreamRibbon(slice, flicker, true, glow, alpha * 0.85);
  for (const slice of slices) fillStreamRibbon(slice, 0.35 * flicker, true, core, alpha);

  if (beamSlice) {
    const beamColors = getBeamColors(stream.knockback, stream.vacuum, false);
    fillStreamRibbon(beamSlice, 1.6 * flicker, false, beamColors.glow, alpha * 0.35);
    fillStreamRibbon(beamSlice, flicker, false, beamColors.glow, alpha * 0.8);
    fillStreamRibbon(beamSlice, 0.35 * flicker, false, beamColors.core, alpha);
  }

  // Droplets spraying off the end of each slice, and a splash where it hits the ground at full width
  push();
  noStroke();
  for (const slice of slices) {
    const end = slice[slice.length - 1];
    if (end.h <= STREAM_GROUND_HEIGHT && end.w >= stream.width * 0.95) {
      fill(glow[0], glow[1], glow[2], alpha * 0.45);
      ellipse(end.x, end.y, end.w * 1.8 * (1 + 0.15 * Math.sin(stream.life * 0.7)), end.w * 1.1);
    }
    fill(core[0], core[1], core[2], alpha * 0.9);
    const r = end.w * 0.6;
    for (let d = 0; d < 3; d++) {
      ellipse(end.x + random(-r, r), end.y - end.h + random(-r, r), random(2, 2 + end.w * 0.15));
    }
  }
  pop();
}

// Launch stream ants: the stream pours down from the airborne ant onto the spot beneath it, where it
// splashes (and burns) before bouncing off toward the beetle
function drawStreamLaunch(stream) {
  const o = stream.owner;
  const alpha = 255 * (stream.camo ? getStealthAlpha(stream, 2, stream.camoFlashRate) : 1);
  const glow = stream.colors.glow;
  const core = stream.colors.core;
  const spot = getStreamLaunchSpotSize(stream) * (1 + 0.06 * Math.sin(stream.life * 0.5));
  const baseWidth = getStreamBaseWidth(stream);
  push();
  noStroke();
  fill(glow[0], glow[1], glow[2], alpha * 0.3);
  ellipse(stream.originX, stream.originY, spot, spot);
  fill(glow[0], glow[1], glow[2], alpha * 0.5);
  ellipse(stream.originX, stream.originY, spot * 0.6, spot * 0.6);
  strokeCap(ROUND);
  stroke(glow[0], glow[1], glow[2], alpha * 0.85);
  strokeWeight(baseWidth);
  line(stream.originX, stream.originY - antAirHeight[o], stream.originX, stream.originY);
  stroke(core[0], core[1], core[2], alpha);
  strokeWeight(baseWidth * 0.35);
  line(stream.originX, stream.originY - antAirHeight[o], stream.originX, stream.originY);
  pop();
}

// Proximity explosion stream ants fire bursting streams like timed explosion ones, but when the beetle comes
// within their explosion proximity they also light a fuse and blow themselves up: a normal explosion
// STREAM_SELF_DESTRUCT_RADIUS_SCALE times the usual size, whose smoke impact hits for
// STREAM_SELF_DESTRUCT_MULTIPLIER x bulletSize before its green acid residue. The beetle leaving the
// proximity cancels the fuse until its last STREAM_FUSE_LOCK_FRAMES. The ant dies in the blast.
function updateStreamSelfDestructs() {
  for (let i = 1; i <= enemyCount; i++) {
    if (!isStreamFire(i) || !triggerExplodeViaProximity[i] || antDormant[i]) {
      antSelfDestructFuse[i] = null;
      continue;
    }
    const inRange = dist(antX[i], antY[i], playerX, playerY) <= explosionProximity[i];
    let fuse = antSelfDestructFuse[i];
    if (fuse && fuse.lives !== antLives[i]) fuse = null; // Killed before it could go off
    if (!fuse) {
      if (!inRange) {
        antSelfDestructFuse[i] = null;
        continue;
      }
      fuse = { life: 0, lives: antLives[i] };
    }
    fuse.life++;
    if (!inRange && fuse.life < STREAM_FUSE_FRAMES - STREAM_FUSE_LOCK_FRAMES) {
      antSelfDestructFuse[i] = null;
      continue;
    }
    if (fuse.life >= STREAM_FUSE_FRAMES) {
      antSelfDestructFuse[i] = null;
      selfDestructAnt(i);
      continue;
    }
    antSelfDestructFuse[i] = fuse;
    drawSelfDestructFuse(i, fuse);
  }
}

// Blast radius of a self-destruct: the ant's normal explosion radius (see spawnEnemyExplosion), scaled up
function getSelfDestructRadius(i) {
  return (20 + 40 * (bulletSize[i] - 1)) * radiusMultiplier[i] * STREAM_SELF_DESTRUCT_RADIUS_SCALE;
}

function selfDestructAnt(i) {
  debugLog(`Ant ${i} self-destructed`);
  spawnEnemyExplosion(antX[i], antY[i], bulletSize[i], i, STREAM_SELF_DESTRUCT_RADIUS_SCALE, STREAM_SELF_DESTRUCT_MULTIPLIER);

  // The ant dies in its own blast, counting as a death in its score (antPoints / antLives) but giving the
  // beetle no points, and respawns somewhere else. Its stream, if it was spraying, sees the death and flows away.
  antLives[i]++;
  onAntDied(i);
  respawnAnt(i);
}

// Self-destruct fuse: a faint ring marks the blast radius while a ring closes in on the ant, pulsing faster
// as the fuse burns down; both turn red once it's locked in
function drawSelfDestructFuse(i, fuse) {
  if (tigerBeetleActive && tigerBeetleMoving) return;
  const radius = getSelfDestructRadius(i);
  const t = fuse.life / STREAM_FUSE_FRAMES;
  const locked = fuse.life >= STREAM_FUSE_FRAMES - STREAM_FUSE_LOCK_FRAMES;
  const c = locked ? [255, 70, 50] : [190, 190, 190];
  const pulse = 0.5 + 0.5 * Math.sin(fuse.life * (0.3 + 0.9 * t));
  const y = antY[i] - antAirHeight[i];
  push();
  noFill();
  stroke(c[0], c[1], c[2], 40 + 50 * pulse);
  strokeWeight(1.5);
  ellipse(antX[i], antY[i], radius * 2, radius * 2);
  stroke(c[0], c[1], c[2], 90 + 165 * pulse);
  strokeWeight(2 + 2 * t);
  const ring = lerp(radius * 2 + 40, 30, t);
  ellipse(antX[i], y, ring, ring);
  noStroke();
  fill(c[0], c[1], c[2], (locked ? 120 : 60) * pulse);
  ellipse(antX[i], y, 50 + 15 * antSize[i]);
  pop();
}

// Launch stream ants: how high their stream holds them (0 when not spraying)
function getAntStreamLift(i) {
  const stream = antStream[i];
  if (!stream || !stream.launch) return 0;
  return STREAM_LAUNCH_HEIGHT * Math.min(1, (stream.life + 1) / STREAM_LAUNCH_RISE_FRAMES);
}

// Ghost stream ants (opacity 0-1): fade out before spraying, stay invisible while spraying, then fade back in
function getAntStreamGhostAlpha(i) {
  if (getSpecialType(i) !== -2 || getFireType(i) !== 4) return 1;
  if (antStream[i]) return 0;
  const framesToSpray = bulletCooldown[i] - (frameCount - antLastShotFrame[i]);
  const fadeOut = constrain((framesToSpray - STREAM_GHOST_HIDDEN_AT) / (STREAM_GHOST_FADE_START - STREAM_GHOST_HIDDEN_AT), 0, 1);
  const fadeIn = antStreamEndFrame[i] === undefined ? 1 : constrain((frameCount - antStreamEndFrame[i]) / STREAM_GHOST_FADE_IN, 0, 1);
  return Math.min(fadeOut, fadeIn);
}

// Frame a bullet will split at (delayed burst or split arc), or null if it never splits
function getBulletSplitFrame(bullet) {
  if (bullet.delayedBurst) return bullet.delayedBurst.at;
  if (bullet.splitAtApex) return bullet.arcDuration / 2;
  return null;
}

function getPathType(antIndex) {
  const aphidAbility = getAphidAbilityOverride(antIndex, 'path'); // Reroll aphid
  if (aphidAbility !== null) return aphidAbility;
  // If potential <= 0.5, return default (straight)
  if (pathPotential[antIndex] <= 0.5) {
    return 0; // Straight (default)
  }
  // Check if ant has invested a token in the path category
  const hasInvestment = (geneTokenInvestments[antIndex] || []).some(
    inv => inv.type === 'trait' && inv.category === 'path'
  );
  if (!hasInvestment) {
    return 0; // Straight (no token invested)
  }
  // Find the highest value among the non-default options
  let maxVal = Math.max(pathHighArc[antIndex], pathCurve[antIndex], pathAccelerate[antIndex], pathBlink[antIndex] || 0);
  
  if (pathHighArc[antIndex] === maxVal) return 1; // High Arc
  
  // For accelerate type
  if (pathAccelerate[antIndex] === maxVal) {
    return 2; // Accelerate path
  }
  
  // For curve types, use pathCurve value to determine tier
  // pathBlink: <1 = Blink, >=1 = Portal. Both are pathType 3; bullets carry a portal flag instead.
  // Ties go to curve.
  if (pathBlink[antIndex] === maxVal && pathCurve[antIndex] !== maxVal) return 3;

  if (pathCurve[antIndex] === maxVal) {
    // pathCurve: <1 = Curved, >=1 = Homing (heat-seeking)
    if (pathCurve[antIndex] >= 1) {
      return -2; // Homing (tier 2)
    } else {
      return -1; // Curved (tier 1, base)
    }
  }
  
  return 0; // Straight (fallback)
}

// ========== ALARM / AVENGE, BLINK / PORTAL, TERRITORY / NEST, MOUND / BUNKER ==========
// Alarm (fire tier 1, fireType 5): the ant's cooldown runs faster while the beetle is close, 1.5x inside the
// outer radius and 2x inside the inner one. Avenge (fire tier 2, fireType 6): whenever another ant within
// AVENGE_RADIUS dies, the ant reloads like a hit reload ant (same flash) and fires again; every witnessed
// death is one more reload + shot, queued up with no cap.
// Blink (path tier 1) / Portal (path tier 2), both pathType 3: blinkDelay frames after firing, a bullet jumps to
// where it would have been BLINK_SKIP_FRAMES later (Portal also re-aims it at the target at the same speed).
// The skipped frames don't count toward its lifetime or fuse, and it can't hit anything on the way.
// Territory (death tier 1, deathType 4) / Nest (death tier 2, deathType 5): where a bullet hits the ground it
// leaves an area that runs the cooldown of any ant standing in it 1.5x faster; Nest areas also grow the ants'
// shields. Mound (death tier 1, deathType 6): a short-lived round wall that blocks the beetle and its bullets.
// Bunker (death tier 2, deathType 7): a raised, covered hole ants can hide in, unseen; it blocks the beetle like a
// mound, and the beetle can only hit the bunker. None of the four ever overlap: one that would is not spawned.
const ALARM_MIN_INNER_RADIUS = 25;
const ALARM_MAX_INNER_RADIUS = 100;
const ALARM_DEFAULT_INNER_RADIUS = 75;
const ALARM_OUTER_RADIUS_AT_MIN = 300;     // Outer radius when the inner radius is 25...
const ALARM_OUTER_RADIUS_AT_MAX = 100;     // ...falling in a straight line to this when it's 100
const ALARM_OUTER_BOOST = 1.5;
const ALARM_INNER_BOOST = 2;
const MAX_COOLDOWN_BOOST = 3;              // Alarm and territory boosts multiply, up to this
const AVENGE_RADIUS = 180;               // Avenge: deaths within this distance make the ant fire again
const BLINK_MIN_DELAY = 10;                // Blink / portal: frames after firing before the jump (genetic stat)
const BLINK_MAX_DELAY = 120;
const BLINK_DEFAULT_DELAY = 60;
const BLINK_SKIP_FRAMES = 30;              // A blinking bullet reappears where it would be this many frames later
const BLINK_STREAM_JUMP = 90;              // Blink streams jump this far (px) along the way they were sprayed
const BLINK_STREAM_FLASH_EVERY = 6;        // Blink streams: frames between reappearance flashes
const BLINK_FLASH_FRAMES = 14;
const TERRITORY_BOOST = 1.5;               // Cooldown speed-up for ants standing in a territory / nest (doesn't stack)
const TERRITORY_MIN_RADIUS = 10;           // Explosion-sized radius, kept above 0 for small burst bullets...
const TERRITORY_MAX_RADIUS = 150;          // ...and capped here
const TERRITORY_BASE_FRAMES = 150;         // x residueMultiplier
const NEST_SHIELD_RATE_DIVISOR = 3000;     // Nest: shield grows by (area life left %) / this per frame, up to 1
const MOUND_RADIUS = 20;                   // Mounds and bunkers
const MOUND_BASE_FRAMES = 100;             // x residueMultiplier
const MOUND_RISE_FRAMES = 8;
const MOUND_FADE_FRAMES = 20;
const WALL_HIT_FLASH_FRAMES = 8;
const BUNKER_MIN_RANGE = 1;                // How close to a bunker's edge an ant has to get to hide in it (genetic stat)
const BUNKER_MAX_RANGE = 70;
const BUNKER_DEFAULT_RANGE = 35;
const BUNKER_SPILL_SPEED = 3;              // Ants spilling out of a destroyed / faded bunker slide out this fast
const PLAYER_WALL_RADIUS = 20;             // The beetle's body for bumping into mounds

// --- Alarm / Avenge ---

function getAlarmOuterRadius(innerRadius) {
  return map(innerRadius, ALARM_MIN_INNER_RADIUS, ALARM_MAX_INNER_RADIUS, ALARM_OUTER_RADIUS_AT_MIN, ALARM_OUTER_RADIUS_AT_MAX, true);
}

// Alarm ants: how much faster their cooldown runs right now (1 = not alarmed)
function getAlarmBoost(i) {
  if (getFireType(i) !== 5) return 1;
  const inner = alarmInnerRadius[i] ?? ALARM_DEFAULT_INNER_RADIUS;
  const d = dist(antX[i], antY[i], playerX, playerY);
  if (d <= inner) return ALARM_INNER_BOOST;
  if (d <= getAlarmOuterRadius(inner)) return ALARM_OUTER_BOOST;
  return 1;
}

function isReloadFlashActive(i) {
  return antHitReloadFlashFrame[i] !== undefined && frameCount - antHitReloadFlashFrame[i] < HIT_RELOAD_FLASH_FRAMES;
}

// Speed up ant cooldowns (Alarm, and standing in a territory / nest) and grow nest shields. A faster cooldown
// moves antLastShotFrame back, so every cooldown check and reset elsewhere keeps working unchanged.
function updateAntCooldownBoosts() {
  for (let i = 1; i <= enemyCount; i++) {
    let territoryBoost = 1;
    let shieldGain = 0;
    for (const area of enemyTerritories) {
      const dx = antX[i] - area.x;
      const dy = antY[i] - area.y;
      if (dx * dx + dy * dy > area.radius * area.radius) continue;
      territoryBoost = TERRITORY_BOOST; // Overlapping areas give the same flat boost
      if (area.nest) shieldGain = Math.max(shieldGain, getAreaLifeTimePercentage(area) / NEST_SHIELD_RATE_DIVISOR);
    }
    // Queen of Queens tunnel sections can be territory (a bigger boost) or nest (a bigger shield)
    const stageArea = getStageAreaBoost(i);
    let shieldCap = 1;
    if (stageArea) {
      territoryBoost = Math.max(territoryBoost, stageArea.boost);
      shieldGain = Math.max(shieldGain, stageArea.shieldGain);
      shieldCap = stageArea.shieldCap;
    }
    const aphidRegen = isAntAphidActive(i, 'regen') ? 2 : 1; // Regeneration aphid: shields and cooldowns twice as fast
    if (shieldGain > 0) antShield[i] = Math.min(shieldCap, (antShield[i] || 0) + shieldGain * aphidRegen);

    const boost = Math.min(MAX_COOLDOWN_BOOST, getAlarmBoost(i) * territoryBoost) * aphidRegen;
    antCooldownBoost[i] = boost;
    // Hold off during a hit reload / avenge flash so the shot still goes as the flash ends
    if (boost > 1 && !isReloadFlashActive(i)) {
      antLastShotFrame[i] -= boost - 1;
    }
  }
}

// Avenge: one more reload + shot for a death this ant saw
function queueAvengeShot(i) {
  antAvengeQueue[i] = (antAvengeQueue[i] || 0) + 1;
  if (!antAvengeArmed[i]) startAvengeReload(i);
}

// Reload exactly like a hit reload ant: white flash, then fire the moment it ends
function startAvengeReload(i) {
  if (!(antAvengeQueue[i] > 0)) return;
  antAvengeQueue[i]--;
  antAvengeArmed[i] = true;
  antHitReloadFlashFrame[i] = frameCount;
  antLastShotFrame[i] = frameCount + HIT_RELOAD_FLASH_FRAMES - bulletCooldown[i];
}

// Called whenever an avenge ant fires: start the next queued reload, if any
function onAvengeAntFired(i) {
  antAvengeArmed[i] = false;
  startAvengeReload(i);
}

// Every ant death goes through here (before the ant respawns somewhere else, or goes dormant in a queen fight)
function onAntDied(i) {
  const x = antX[i];
  const y = antY[i];
  if (isQueenFight()) onQueenAntDied(i);
  for (const ring of playerMoundRings) ring.inside.delete(i); // Respawns elsewhere, not trapped any more
  clearAntAphidEffectsFor(i);
  antShield[i] = 0;
  antAvengeQueue[i] = 0;
  antAvengeArmed[i] = false;
  antHitReloadFlashFrame[i] = undefined;
  releaseAntFromBunker(i, false);
  for (let k = 1; k <= enemyCount; k++) {
    if (k === i || antDormant[k] || getFireType(k) !== 6) continue;
    if (dist(antX[k], antY[k], x, y) <= AVENGE_RADIUS) queueAvengeShot(k);
  }
}

// --- Nest shields ---

function hasAntShield(i) {
  return (antShield[i] || 0) > 0.001;
}

// Damage an ant from the beetle; its nest shield soaks up what it can first
function damageAnt(i, amount) {
  if (isAntAphidActive(i, 'armor')) amount *= 0.5; // Damage reduction aphid
  const shieldLeft = antShield[i] || 0;
  if (shieldLeft > 0) {
    const absorbed = Math.min(shieldLeft, amount);
    antShield[i] = shieldLeft - absorbed;
    amount -= absorbed;
  }
  antHealth[i] -= amount;
}

// --- Blink / Portal ---

function spawnBlinkFlash(x, y, size, portal) {
  blinkFlashes.push({ x: x, y: y, size: Math.max(14, size), portal: portal, life: 0 });
}

// Jump a bullet to where it would be BLINK_SKIP_FRAMES from now (life and fuse don't move on); portal bullets
// then turn toward the target at the same speed
function blinkBullet(bullet) {
  bullet.x += bullet.speedX * BLINK_SKIP_FRAMES;
  bullet.y += bullet.speedY * BLINK_SKIP_FRAMES;
  bullet.hasBlinked = true;
  if (bullet.portal) {
    const o = bullet.owner;
    const aimX = playerX + (shotOffsetX[o] || 0);
    const aimY = playerY + (shotOffsetY[o] || 0);
    const speed = Math.sqrt(bullet.speedX * bullet.speedX + bullet.speedY * bullet.speedY);
    const a = Math.atan2(aimY - bullet.y, aimX - bullet.x);
    bullet.speedX = Math.cos(a) * speed;
    bullet.speedY = Math.sin(a) * speed;
    bullet.angle = a * 180 / Math.PI;
    bullet.targetX = aimX;
    bullet.targetY = aimY;
    // The beetle's flying: come out as a high arc lob at it (the only kind of bullet that can reach it up there)
    if (isPlayerFlying()) {
      const arcFrames = Math.max(HIGH_ARC_MIN_DURATION, bulletArcDuration[o] || HIGH_ARC_MIN_DURATION);
      bullet.pathType = 1;
      bullet.arcDuration = arcFrames;
      bullet.arcStartLife = bullet.life; // Its arc starts here, not when it was fired
      bullet.speedX = (aimX - bullet.x) / arcFrames;
      bullet.speedY = (aimY - bullet.y) / arcFrames;
      bullet.airHeight = 0;
      bullet.airProgress = 0;
    }
  }
  // Always flashes, even for ghost / camouflaged bullets
  spawnBlinkFlash(bullet.x, bullet.y - (bullet.airHeight || 0), 20 * bullet.size, bullet.portal);
}

// Blink streams: a bit of stream jumps BLINK_STREAM_JUMP ahead the way it was sprayed (portal streams turn
// toward the target as they come out). Its distance flowed doesn't move on, so the stream reaches further.
function blinkStreamNode(stream, node) {
  node.x += Math.cos(node.heading) * BLINK_STREAM_JUMP;
  node.y += Math.sin(node.heading) * BLINK_STREAM_JUMP;
  node.blinked = true;
  if (stream.portal) {
    const aimX = playerX + (shotOffsetX[stream.owner] || 0);
    const aimY = playerY + (shotOffsetY[stream.owner] || 0);
    node.heading = Math.atan2(aimY - node.y, aimX - node.x);
    node.startHeading = node.heading;
  }
  if (stream.life - stream.lastBlinkFlash >= BLINK_STREAM_FLASH_EVERY) {
    stream.lastBlinkFlash = stream.life;
    spawnBlinkFlash(node.x, node.y, stream.width, stream.portal);
  }
}

// Blink streams: how far along the stream (px flowed) bits jump. The blink delay picks the point the same way
// it picks the moment for bullets, spread over the stream's length.
function getStreamBlinkDistance(antIndex, range) {
  return range * map(blinkDelay[antIndex] ?? BLINK_DEFAULT_DELAY, BLINK_MIN_DELAY, BLINK_MAX_DELAY, 0.1, 0.9, true);
}

// Bright ring where a blink bullet reappears: cyan for blink, pink for portal
function drawBlinkFlashes() {
  for (let i = blinkFlashes.length - 1; i >= 0; i--) {
    const f = blinkFlashes[i];
    f.life++;
    if (f.life >= BLINK_FLASH_FRAMES) {
      blinkFlashes.splice(i, 1);
      continue;
    }
    const t = f.life / BLINK_FLASH_FRAMES;
    const c = f.portal ? [255, 120, 255] : [110, 235, 255];
    push();
    noFill();
    stroke(c[0], c[1], c[2], 255 * (1 - t));
    strokeWeight(3 * (1 - t) + 1);
    ellipse(f.x, f.y, f.size * (1 + 2 * t));
    noStroke();
    fill(c[0], c[1], c[2], 120 * (1 - t));
    ellipse(f.x, f.y, f.size * (1.6 - 0.6 * t));
    fill(255, 255, 255, 230 * (1 - t) * (1 - t));
    ellipse(f.x, f.y, f.size * (1 - 0.5 * t));
    pop();
  }
}

// --- Territory / Nest ---

// Area life left, out of 100 (counts down from 100 as the area fades)
function getAreaLifeTimePercentage(area) {
  return 100 * Math.max(0, 1 - area.life / area.maxLife);
}

// Same radius as an explosion from this bullet (see spawnEnemyExplosion), capped
function spawnEnemyTerritory(bullet, ownerId, nest) {
  const radius = constrain((20 + 40 * (bullet.size - 1)) * (radiusMultiplier[ownerId] || 1), TERRITORY_MIN_RADIUS, TERRITORY_MAX_RADIUS);
  if (!isGroundEffectSpotFree(bullet.x, bullet.y, radius)) return;
  enemyTerritories.push({
    x: bullet.x,
    y: bullet.y,
    radius: radius,
    nest: nest,
    life: 0,
    maxLife: TERRITORY_BASE_FRAMES * (residueMultiplier[ownerId] || 1)
  });
}

// Territory: amber area with a slowly turning ring of dashes. Nest: the same, plus a blue shield ring.
function updateEnemyTerritories() {
  for (let i = enemyTerritories.length - 1; i >= 0; i--) {
    const area = enemyTerritories[i];
    area.life++;
    if (area.life >= area.maxLife) {
      enemyTerritories.splice(i, 1);
      continue;
    }
    if (tigerBeetleActive && tigerBeetleMoving) continue;

    const left = getAreaLifeTimePercentage(area) / 100;
    const grow = Math.min(1, area.life / 10);
    const r = area.radius * grow;
    const alpha = 40 + 200 * left;
    push();
    noStroke();
    fill(255, 185, 60, alpha * 0.18);
    ellipse(area.x, area.y, r * 2);
    noFill();
    stroke(255, 200, 80, alpha * 0.8);
    strokeWeight(2);
    // arc() takes degrees: angleMode is DEGREES during gameplay
    angleMode(DEGREES);
    const dashes = Math.max(6, Math.round(r / 6));
    const turn = area.life * 0.6;
    for (let d = 0; d < dashes; d++) {
      const a = turn + (d / dashes) * 360;
      arc(area.x, area.y, r * 2, r * 2, a, a + 180 / dashes, OPEN);
    }
    if (area.nest) {
      stroke(110, 190, 255, alpha * (0.5 + 0.3 * Math.sin(area.life * 0.12)));
      strokeWeight(2.5);
      ellipse(area.x, area.y, r * 1.4);
    }
    pop();
  }
}

// Territories, nests, mounds and bunkers never overlap: true if a circle here wouldn't touch any of them
function isGroundEffectSpotFree(x, y, radius) {
  for (const area of enemyTerritories) {
    if (dist(x, y, area.x, area.y) < radius + area.radius) return false;
  }
  for (const wall of enemyWalls.concat(playerWalls)) {
    if (wall.health > 0 && dist(x, y, wall.x, wall.y) < radius + wall.radius) return false;
  }
  return true;
}

// --- Mound / Bunker ---

function spawnEnemyWall(bullet, ownerId, bunker) {
  if (bunker && bullet.size < 1) return; // Only bullets of size 1 and above can dig a bunker
  if (!isGroundEffectSpotFree(bullet.x, bullet.y, MOUND_RADIUS)) return;
  enemyWalls.push({
    x: bullet.x,
    y: bullet.y,
    radius: MOUND_RADIUS,
    bunker: bunker,
    health: bullet.size,
    maxHealth: bullet.size,
    life: 0,
    maxLife: MOUND_BASE_FRAMES * (residueMultiplier[ownerId] || 1),
    hitFlash: 0,
    dashHit: false, // Hit by the current dash already
    occupants: 0    // Bunkers: ants that have gone in (for spacing them out)
  });
}

// What a bullet leaves where it hits the ground, for the territory / nest and mound / bunker death types
function spawnGroundDeathEffect(bullet, ownerId, deathType) {
  if (deathType === 4 || deathType === 5) {
    spawnEnemyTerritory(bullet, ownerId, deathType === 5);
  } else if (deathType === 6 || deathType === 7) {
    spawnEnemyWall(bullet, ownerId, deathType === 7);
  }
}

// Any damage the beetle does to a mound or bunker
function damageEnemyWall(wall, amount) {
  if (wall.health <= 0) return;
  wall.health -= amount;
  wall.hitFlash = WALL_HIT_FLASH_FRAMES;
  wall.lastHitTime = millis();
}

// The live mound or bunker a point is touching (within extra px of its edge), or null
function getEnemyWallAt(x, y, extra) {
  for (const wall of enemyWalls) {
    if (wall.health <= 0) continue;
    const reach = wall.radius + extra;
    const dx = x - wall.x;
    const dy = y - wall.y;
    if (dx * dx + dy * dy < reach * reach) return wall;
  }
  return null;
}

function isAntSheltered(i) {
  return antAirHeight[i] > 0 || !!antInBunker[i];
}

function enterBunker(i, wall) {
  // Spread the ants out around the middle of the hole
  const a = wall.occupants * 2.4;
  const r = wall.occupants === 0 ? 0 : wall.radius * 0.4;
  wall.occupants++;
  antInBunker[i] = { wall: wall, dx: Math.cos(a) * r, dy: Math.sin(a) * r };
  antKnockedBack[i] = false;
  antKnockbackTimer[i] = 0;
  antRecoilVelX[i] = 0;
  antRecoilVelY[i] = 0;
  antX[i] = wall.x + antInBunker[i].dx;
  antY[i] = wall.y + antInBunker[i].dy;
}

function releaseAntFromBunker(i, spill) {
  const spot = antInBunker[i];
  if (!spot) return;
  antInBunker[i] = null;
  if (!spill) return;
  // Slide out away from the middle of the hole
  const a = (spot.dx === 0 && spot.dy === 0) ? Math.random() * Math.PI * 2 : Math.atan2(spot.dy, spot.dx);
  antRecoilVelX[i] = Math.cos(a) * BUNKER_SPILL_SPEED;
  antRecoilVelY[i] = Math.sin(a) * BUNKER_SPILL_SPEED;
}

// Update and draw mounds and bunkers, and let ants close enough to a bunker get in
function updateEnemyWalls() {
  for (let w = enemyWalls.length - 1; w >= 0; w--) {
    const wall = enemyWalls[w];
    wall.life++;
    if (wall.hitFlash > 0) wall.hitFlash--;
    if (!dash) wall.dashHit = false;
    if (wall.health <= 0 || wall.life >= wall.maxLife) {
      if (wall.bunker) {
        // Everyone inside spills out
        for (let i = 1; i <= enemyCount; i++) {
          if (antInBunker[i] && antInBunker[i].wall === wall) releaseAntFromBunker(i, true);
        }
      }
      if (wall.health <= 0) spawnSmokeImpact(wall.x, wall.y, wall.radius * 1.5, 4);
      enemyWalls.splice(w, 1);
      continue;
    }
    drawEnemyWall(wall);
  }

  for (let i = 1; i <= enemyCount; i++) {
    if (antInBunker[i] || antAirHeight[i] > 0 || antKnockedBack[i] || antDormant[i]) continue;
    if (vortexPull && vortexPull.ants.includes(i)) continue; // Being sucked toward the beetle, can't duck back in
    const range = bunkerRange[i] ?? BUNKER_DEFAULT_RANGE;
    for (const wall of enemyWalls) {
      if (!wall.bunker || wall.health <= 0) continue;
      if (dist(antX[i], antY[i], wall.x, wall.y) - wall.radius <= range) {
        enterBunker(i, wall);
        break;
      }
    }
  }
}

// Ants in a bunker stay put in it (movement elsewhere this frame is undone here)
function holdBunkeredAnts() {
  for (let i = 1; i <= enemyCount; i++) {
    const spot = antInBunker[i];
    if (!spot) continue;
    antX[i] = spot.wall.x + spot.dx;
    antY[i] = spot.wall.y + spot.dy;
    antKnockedBack[i] = false;
    antRecoilVelX[i] = 0;
    antRecoilVelY[i] = 0;
  }
}

// Mounds: a raised round wall of dirt. Bunkers: a dark hole in a dirt rim, with a shadow to show it sticks out of
// the ground (the ants inside can't be seen). Both flash white and show a health bar when hit, and sink away over their last frames.
function drawEnemyWall(wall) {
  const rise = Math.min(1, wall.life / MOUND_RISE_FRAMES);
  const fade = constrain((wall.maxLife - wall.life) / MOUND_FADE_FRAMES, 0, 1);
  const r = wall.radius * rise * (0.6 + 0.4 * fade);
  const alpha = 255 * fade;
  push();
  noStroke();
  if (wall.bunker) {
    // Shadow shows the rim sticking up out of the ground
    fill(0, 0, 0, alpha * 0.3);
    ellipse(wall.x + 3, wall.y + 4, r * 2.4, r * 2.2);
    fill(115, 85, 50, alpha);
    ellipse(wall.x, wall.y, r * 2.3, r * 2.1);
    fill(25, 18, 10, alpha);
    ellipse(wall.x, wall.y, r * 1.8, r * 1.6);
  } else {
    fill(0, 0, 0, alpha * 0.3);
    ellipse(wall.x + 3, wall.y + 4, r * 2.1, r * 1.9);
    fill(135, 100, 60, alpha);
    stroke(80, 55, 30, alpha);
    strokeWeight(2);
    ellipse(wall.x, wall.y, r * 2, r * 2);
    noStroke();
    fill(175, 140, 95, alpha * 0.8);
    ellipse(wall.x - r * 0.25, wall.y - r * 0.3, r * 1.1, r * 0.9);
  }
  if (wall.owner === 'player') {
    // The beetle's mounds and bunker have a rim in its acid green
    noFill();
    stroke(58, 166, 18, alpha * 0.8);
    strokeWeight(2);
    ellipse(wall.x, wall.y, r * (wall.bunker ? 2.3 : 2), r * (wall.bunker ? 2.1 : 2));
    noStroke();
  }
  if (wall.hitFlash > 0) {
    noStroke();
    fill(255, 255, 255, 200 * wall.hitFlash / WALL_HIT_FLASH_FRAMES * fade);
    ellipse(wall.x, wall.y, r * 2.1);
  }
  pop();
  // Health bar under it for a second after each hit, like an ant's
  drawHitHealthBar(wall.x, wall.y + wall.radius + 4, Math.max(0, wall.health), wall.maxHealth, wall.lastHitTime);
}

// The beetle can't walk (or be knocked) into a mound or bunker, its own mounds included; dashing into an ant one
// damages it once. Flying, it goes over all of them.
function resolvePlayerWallCollisions() {
  if (isPlayerFlying()) return;
  for (const wall of enemyWalls.concat(playerWalls)) {
    if (wall.health <= 0 || wall === playerBunker) continue;
    const dx = playerX - wall.x;
    const dy = playerY - wall.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const reach = wall.radius + PLAYER_WALL_RADIUS;
    if (d >= reach) continue;
    if (dash && !wall.dashHit && wall.owner !== 'player') {
      wall.dashHit = true;
      damageEnemyWall(wall, 1 + (upgrade12Level * 0.2)); // Same damage as a dash hit on an ant (Horns)
    }
    const nx = d > 0 ? dx / d : 1;
    const ny = d > 0 ? dy / d : 0;
    playerX = constrain(wall.x + nx * reach, sideBuffer, getGameplayWidth() - sideBuffer);
    playerY = constrain(wall.y + ny * reach, scoreBarHeight + 25, getGameplayHeight() - expBarHeight - expBarBuffer);
  }
  containPlayerInRings();
}

// ========== QUEEN ANT ==========
// Every ant hit on the beetle counts toward the next Queen Ant (single player only). Once enough have piled up she
// arrives mid-round and the round's normal rules stop: the timer stops, dead ants stay dead (antDormant) until she
// spawns another copy of them, and the round only ends when she dies (or the beetle does).
// She is steered by a small neural network (see QUEEN BRAIN) that picks where she goes, which of the round's ants
// she spawns and which ability she uses. It starts out as the default strategy and re-learns every time she's hit,
// or every QUEEN_ADAPT_FRAMES she goes without one. Her last strategy is handed to the next queen of the run.
// Every QUEEN_ABILITY_FRAMES she can use an extra powerful version of one ability of a living ant under her
// control (or a plain acid shot if none of them have one). Each queen defeated is a currency for permanent upgrades.
const QUEEN_BASE_HITS = 100;              // Ant hits for the first queen of a run on difficulty 1...
const QUEEN_HITS_PER_DIFFICULTY = 10;     // ...plus this per difficulty above 1...
const QUEEN_HITS_PER_QUEEN = 10;          // ...plus this for every queen already beaten this run
const QUEEN_ANT_SIZE = 4;                 // Every queen is the size of a size 4 ant
const QUEEN_IMAGE_SIZE = 45 + 15 * QUEEN_ANT_SIZE;
const QUEEN_BODY_RADIUS = 42;             // Her body for bullets, bumping and dashing
const QUEEN_BASE_HEALTH = 4;              // +1 for every queen already beaten this run
const QUEEN_SPEED = 3;
const QUEEN_BULLET_SIZE = 1.5;           // Her acid (she only shoots through abilities)
const QUEEN_BULLET_SPEED = 7;
const QUEEN_SPAWN_FRAMES = 120;           // She earns QUEEN_ANTS_PER_SPAWN ants to spawn this often (stockpiles with no limit)
const QUEEN_ANTS_PER_SPAWN = 2;
const QUEEN_AREA_RADIUS = Math.round(300 / Math.SQRT2); // Her area abilities: half the area of a 300px circle
const QUEEN_ABILITY_FRAMES = 600;         // She can use one ability this often (doesn't stockpile)
const QUEEN_ADAPT_FRAMES = 600;           // Re-strategize after this long without being hit
const QUEEN_DECISION_FRAMES = 6;          // How often the brain re-reads the field
const QUEEN_EFFECT_FRAMES = 300;          // Alarm, avenge, refire, camouflage and ghost last 5 seconds
const QUEEN_INTRO_FRAMES = 150;
const QUEEN_MAX_ANTS = 300;               // Safety cap on ant slots while she's cloning ants
// Brain score. Rewards:
const QUEEN_SCORE_PER_DAMAGE = 1;         // damage done to the beetle, from any source
const QUEEN_SCORE_PER_OWN_DAMAGE = 1;     // extra per point of damage from her own attacks (2 in all)
const QUEEN_SCORE_CALM_RESET = 5;         // her brain resetting on the timer, i.e. without her taking damage
// Penalties:
const QUEEN_SCORE_PER_ANT_LOST = -0.3;    // ants lost
const QUEEN_SCORE_PER_QUEEN_DAMAGE = -5;  // damage taken
const QUEEN_SCORE_WRONG_WAY = -2;         // a shot that stays further from the beetle than she is for its whole flight
const QUEEN_SCORE_OUT_OF_RANGE = -2;      // Smear, Landmine Conversion or Stream Fire with the beetle out of stream range
const QUEEN_SCORE_PER_MISS = -1;          // an attack where no part ever got within QUEEN_MISS_RANGE of the beetle
const QUEEN_MISS_RANGE = 70;
const QUEEN_STREAM_RANGE = 250;           // Her Stream Fire's reach (from the edge of her body)
const QUEEN_HIT_SPAWNS = 2;               // Extra stockpiled spawns she gets every time she's hit
// Beam: radius multiplier 4 and residue multiplier 3 on the ants' beam scale
const QUEEN_BEAM_WIDTH = 12 + (4 - 0.5) / (3 - 0.5) * (50 - 12);   // BEAM_MIN/MAX_WIDTH scale: about 65px
const QUEEN_BEAM_FRAMES = 15 + (3 - 0.5) / (3 - 0.5) * (60 - 15);  // BEAM_MIN/MAX_FRAMES scale: 60 frames
const QUEEN_BEAM_COLORS = { glow: [190, 90, 255], core: [245, 225, 255] }; // Her signature purple
// Her attacking abilities (not the ones that spawn ants or leave things on the field), which can miss
const QUEEN_ATTACK_ABILITIES = new Set(['hitReload', 'burst', 'delayedBurst', 'rapid', 'stream', 'accelerate', 'beam',
  'timeExplosion', 'proximityExplosion', 'generic']);
// Everything she shoots out, which can go the wrong way (not planted things, structures or territories)
const QUEEN_SHOT_ABILITIES = new Set(['hitReload', 'burst', 'delayedBurst', 'rapid', 'stream', 'accelerate', 'beam',
  'proximityExplosion', 'generic', 'curve', 'homing', 'highArc', 'splitArc']);
// Abilities that only make sense with the beetle inside her stream range
const QUEEN_CLOSE_RANGE_ABILITIES = new Set(['smear', 'landmine', 'stream']);
const QUEEN_MAX_HIT_SPOTS = 30;           // Hit spots remembered per ant
const PARKED_ANT_POS = -10000;            // Where dormant ants wait, far outside the play area
const QUEEN_ORDER_ARRIVE = 70;            // Ordered ants go back to normal once they're this close to their spot
const QUEEN_ORDER_FRAMES = 480;           // An order is dropped after this long even if they haven't arrived
const QUEEN_ORDER_COOLDOWN = 180;         // Frames between orders (fixed, not learned)

// The 32 ant abilities plus the generic shot, in the order the brain's ability outputs use
const QUEEN_ABILITIES = [
  { key: 'alternating', name: 'Alternating Fire' }, { key: 'hitReload', name: 'Hit Reload' },
  { key: 'burst', name: 'Burst Fire' }, { key: 'delayedBurst', name: 'Delayed Burst' },
  { key: 'rapid', name: 'Rapid Fire' }, { key: 'stream', name: 'Stream Fire' },
  { key: 'alarm', name: 'Alarm' }, { key: 'avenge', name: 'Avenge' },
  { key: 'curve', name: 'Clockwise Curve' }, { key: 'homing', name: 'Homing Curve' },
  { key: 'highArc', name: 'High Arc' }, { key: 'splitArc', name: 'Split Arc' },
  { key: 'accelerate', name: 'Accelerate' }, { key: 'beam', name: 'Beam' },
  { key: 'blink', name: 'Blink' }, { key: 'portal', name: 'Portal' },
  { key: 'timeExplosion', name: 'Time Explosion' }, { key: 'proximityExplosion', name: 'Proximity Explosion' },
  { key: 'camo', name: 'Camouflage' }, { key: 'ghost', name: 'Ghost' },
  { key: 'knockback', name: 'Knockback' }, { key: 'vacuum', name: 'Vacuum' },
  { key: 'recoil', name: 'Recoil' }, { key: 'launch', name: 'Launch' },
  { key: 'smear', name: 'Smear' }, { key: 'landmine', name: 'Landmine Conversion' },
  { key: 'refire', name: 'Refire' }, { key: 'turret', name: 'Turret' },
  { key: 'territory', name: 'Territory' }, { key: 'nest', name: 'Nest' },
  { key: 'mound', name: 'Mound' }, { key: 'bunker', name: 'Bunker' },
  { key: 'generic', name: 'Acid Shot' }
];
const QA = {};
QUEEN_ABILITIES.forEach((a, k) => { QA[a.key] = k; });

let queen = null;                // The live queen, or null
let queenHitCount = 0;           // Ant hits on the beetle toward the next queen (not counted during a fight)
let queensDefeatedThisRun = 0;
let queenInheritedBrain = null;  // Last strategy of the previous queen this run
let queenDefeatedThisRound = false;
let queenProjectiles = [];       // Her acid and the ants she fires like bullets
let queenEffects = [];           // Beams, streams, planted explosions, volleys, rings
let antDormant = [];             // Ants that died during a queen fight and wait for her to spawn them again
let antOrder = [];               // Ants the queen has ordered to walk to a spot: { x, y, expires }, or null
let antQueenType = [];           // Which of the round's ants (by its index when she arrived) each ant is a copy of
let antHitSpots = [];            // Where each ant was, relative to the beetle, when it fired shots that hit
let pendingHitSpot = null;       // Set just before handlePlayerHit when the hitting bullet's firing spot is known
let queenDamageIsOwn = false;    // True while damage is coming from one of the queen's own attacks
let queenDeathBurst = null;      // Where the last queen died, for her explosion in the round outro
let lastBeetleShotFrame = -9999;

function isQueenFight() {
  return queen !== null;
}

function getQueenHitsRequired() {
  return QUEEN_BASE_HITS + QUEEN_HITS_PER_DIFFICULTY * (difficulty - 1) + QUEEN_HITS_PER_QUEEN * queensDefeatedThisRun;
}

function getPlayAreaBounds(margin = 0) {
  return {
    minX: sideBuffer + margin,
    maxX: getGameplayWidth() - sideBuffer - margin,
    minY: scoreBarHeight + 15 + margin,
    maxY: getGameplayHeight() - expBarHeight - expBarBuffer - margin
  };
}

function clampToPlayArea(x, y, margin = 0) {
  const b = getPlayAreaBounds(margin);
  return { x: constrain(x, b.minX, b.maxX), y: constrain(y, b.minY, b.maxY) };
}

function isInPlayArea(x, y, margin = 0) {
  const b = getPlayAreaBounds(margin);
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

function angleToBeetle(x, y) {
  return Math.atan2(playerY - y, playerX - x);
}

// --- Hit tracking (feeds both the queen's arrival and her brain) ---

function recordAntHitSpot(i, spot) {
  if (!(i >= 1)) return;
  if (!antHitSpots[i]) antHitSpots[i] = [];
  antHitSpots[i].push(spot || { x: antX[i] - playerX, y: antY[i] - playerY });
  if (antHitSpots[i].length > QUEEN_MAX_HIT_SPOTS) antHitSpots[i].shift();
}

// Called by handlePlayerHit for every ant hit on the beetle
function onAntHitPlayer(i) {
  recordAntHitSpot(i, pendingHitSpot);
  pendingHitSpot = null;
  if (!isQueenFight() && !multiplayerMode) queenHitCount++;
}

// Any damage to the beetle while a queen is out scores for her brain
function onPlayerDamaged(amount, own = queenDamageIsOwn) {
  if (!queen || !(amount > 0)) return;
  queen.segmentScore += amount * (QUEEN_SCORE_PER_DAMAGE + (own ? QUEEN_SCORE_PER_OWN_DAMAGE : 0));
}

// spawnEnemyExplosion for one of her own blasts: its hit and its residue count as her own damage
function spawnQueenExplosion(x, y, size, owner, radiusScale) {
  queenDamageIsOwn = true;
  spawnEnemyExplosion(x, y, size, owner, radiusScale);
  queenDamageIsOwn = false;
  enemyExplosions[enemyExplosions.length - 1].queenOwned = true;
}

// --- Dormant ants ---

// Take a dead ant out of play: it waits off the map until the queen spawns it again
function parkAnt(i) {
  antX[i] = PARKED_ANT_POS;
  antY[i] = PARKED_ANT_POS;
  antPrevX[i] = PARKED_ANT_POS;
  antPrevY[i] = PARKED_ANT_POS;
  antHealth[i] = antMaxHealth[i];
  antKnockedBack[i] = false;
  antKnockbackTimer[i] = 0;
  antKnockbackVelX[i] = 0;
  antKnockbackVelY[i] = 0;
  antStunned[i] = false;
  antStunTimer[i] = 0;
  antRapidFireActive[i] = false;
  antAirHeight[i] = 0;
  antRecoilVelX[i] = 0;
  antRecoilVelY[i] = 0;
  antRecoilAirTimer[i] = 0;
  antInBunker[i] = null;
  antSelfDestructFuse[i] = null;
  antOrder[i] = null;
}

// Undo anything that moved a dormant ant this frame
function holdDormantAnts() {
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i] && antX[i] !== PARKED_ANT_POS) parkAnt(i);
  }
}

// Put a dead ant back in play somewhere random, or, during a queen fight, keep it out of play
function respawnAnt(i) {
  if (antDormant[i]) {
    parkAnt(i);
    return;
  }
  antX[i] = random(0, getGameplayWidth());
  antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
  spawnX[i] = antX[i] + cos(angleFromSpawn[i]);
  spawnY[i] = antY[i] + sin(angleFromSpawn[i]);
  antHealth[i] = antMaxHealth[i];  // Reset health on respawn
  antKnockedBack[i] = false;
  antKnockbackTimer[i] = 0;
  antStunned[i] = false;
  antStunTimer[i] = 0;
  antLastShotFrame[i] = frameCount; // Respawned ants wait out a full cooldown before firing
  antAlternatingCooldownState[i] = 0;
  antRapidFireActive[i] = false;
  antAirHeight[i] = 0;
  antRecoilVelX[i] = 0;
  antRecoilVelY[i] = 0;
  antRecoilAirTimer[i] = 0;
}

// Genes and derived flags copied when the queen spawns a new copy of an ant
function getCloneableAntArrays() {
  return [bulletSpeed, bulletCooldown, antSpeed, shotOffsetX, shotOffsetY, followBeetle, followAnt, standStill,
    findLocation, followValue, keepDistance, followTarget, autonomy, specialExplosion, specialKnockback, specialCamo,
    specialRecoil, specialPotential, bulletKnockbackMultiplier, bulletCamoFlashRate, fireBurst, fireRapid,
    fireAlternating, fireAlarm, firePotential, bulletBurstCount, bulletBurstSpread, bulletBurstDelay,
    bulletCooldownMultiplier, alarmInnerRadius, deathLandmine, deathRefire, deathTerritory, deathMound, bunkerRange,
    deathPotential, pathHighArc, pathCurve, pathAccelerate, pathBlink, blinkDelay, bulletAccelerateDelay, pathPotential,
    bulletArcDuration, bulletCurveStrength, explodeOnTermination, triggerExplodeViaProximity, explosionProximity,
    standingPointX, standingPointY, distanceFromAnchor, anchorOffsetX, anchorOffsetY, angleFromSpawn, bulletSize,
    antSize, antMaxHealth, bulletSplitCount, bulletSpread, radiusMultiplier, residueMultiplier, bulletExplodeAfter,
    geneTokens, geneTokenLastRoundGained];
}

function cloneAntGenes(src, dst) {
  for (const arr of getCloneableAntArrays()) arr[dst] = arr[src];
  restoreAphidBaseStatsOnCopy(src, dst);
  geneTokenInvestments[dst] = (geneTokenInvestments[src] || []).map(inv => ({ ...inv }));
}

// Fresh runtime state for an ant the queen just spawned at (x, y)
function placeSpawnedAnt(i, x, y) {
  const p = clampToPlayArea(x, y);
  antX[i] = p.x;
  antY[i] = p.y;
  antPrevX[i] = p.x;
  antPrevY[i] = p.y;
  spawnX[i] = p.x;
  spawnY[i] = p.y;
  anchorPointX[i] = undefined; // Keep-distance ants re-anchor on their new spawn
  anchorPointY[i] = undefined;
  strikeX[i] = 0;
  strikeY[i] = 0;
  strikeTime1[i] = 0;
  drawStrike1[i] = 1;
  bulletShot[i] = 0;
  if (!enemyBullets[i]) enemyBullets[i] = [];
  antHealth[i] = antMaxHealth[i];
  antLastHitTime[i] = 0;
  antKnockedBack[i] = false;
  antKnockbackTimer[i] = 0;
  antKnockbackVelX[i] = 0;
  antKnockbackVelY[i] = 0;
  antStunned[i] = false;
  antStunTimer[i] = 0;
  antLastShotFrame[i] = frameCount;
  antAlternatingCooldownState[i] = 0;
  antHitReloadFlashFrame[i] = undefined;
  antRapidFireActive[i] = false;
  antRapidFireCount[i] = 0;
  antRapidFireNextFrame[i] = 0;
  antAvengeQueue[i] = 0;
  antAvengeArmed[i] = false;
  antCooldownBoost[i] = 1;
  antShield[i] = 0;
  antInBunker[i] = null;
  antAirHeight[i] = 0;
  antRecoilVelX[i] = 0;
  antRecoilVelY[i] = 0;
  antRecoilAirTimer[i] = 0;
  antMoveX[i] = 0;
  antMoveY[i] = 0;
  antSelfDestructFuse[i] = null;
  antDormant[i] = false;
  antOrder[i] = null;
}

// Spawn one of the round's ants (type = its index when the queen arrived). A dormant copy of it comes back first;
// otherwise a new copy is made in a new ant slot. Returns the ant's index, or -1 if there's no room.
function queenSpawnAnt(type, x, y) {
  if (queen && queen.maxAlive && countAliveAnts() >= queen.maxAlive) return -1;
  let i = -1;
  for (let k = 1; k <= enemyCount; k++) {
    if (antDormant[k] && antQueenType[k] === type) {
      i = k;
      break;
    }
  }
  if (i === -1) {
    if (enemyCount >= QUEEN_MAX_ANTS) return -1;
    i = enemyCount + 1;
    cloneAntGenes(type, i);
    antQueenType[i] = type;
    antPoints[i] = 0;
    antLives[i] = 1;
    antHitSpots[i] = [];
    enemyBullets[i] = [];
    enemyCount = i;
  }
  placeSpawnedAnt(i, x, y);
  if (queen && queen.bunker) enterBunker(i, queen.bunker);
  queenEffects.push({ kind: 'ring', x: antX[i], y: antY[i], life: 0, frames: 18, maxR: 30 + 10 * antSize[i], color: [200, 120, 255] });
  return i;
}

function countAliveAnts() {
  let n = 0;
  for (let i = 1; i <= enemyCount; i++) if (!antDormant[i]) n++;
  return n;
}

// Every ant death comes through here (from onAntDied) while a queen is out
function onQueenAntDied(i) {
  antDormant[i] = true;
  onFinalAntDied(i);
  queen.segmentScore += QUEEN_SCORE_PER_ANT_LOST;
  if (queen.avengeFrames > 0) queen.avengeDeaths.push({ i: i, x: antX[i], y: antY[i] });
}

// --- Ant abilities as queen abilities ---

function getAntQueenAbilities(i) {
  const list = [];
  const fireKeys = { '-1': 'alternating', '-2': 'hitReload', 1: 'burst', 3: 'delayedBurst', 2: 'rapid', 4: 'stream', 5: 'alarm', 6: 'avenge' };
  const fireKey = fireKeys[getFireType(i)];
  if (fireKey) list.push(QA[fireKey]);

  const path = getPathType(i);
  if (path === -1) list.push(QA.curve);
  else if (path === -2) list.push(QA.homing);
  else if (path === 1) list.push(isSplitArc(i) ? QA.splitArc : QA.highArc);
  else if (path === 2) list.push(isBeamAccelerate(i) ? QA.beam : QA.accelerate);
  else if (path === 3) list.push(pathBlink[i] >= 1 ? QA.portal : QA.blink);

  const special = getSpecialType(i);
  if (special === 1) list.push(specialExplosion[i] >= 1 ? QA.proximityExplosion : QA.timeExplosion);
  else if (special === -1) list.push(isVacuumKnockback(i) ? QA.vacuum : QA.knockback);
  else if (special === 2) list.push(QA.camo);
  else if (special === -2) list.push(QA.ghost);
  else if (special === 3) list.push(QA.recoil);
  else if (special === -3) list.push(QA.launch);

  const deathKeys = { '-1': 'smear', 1: 'landmine', 2: 'refire', 3: 'turret', 4: 'territory', 5: 'nest', 6: 'mound', 7: 'bunker' };
  const deathKey = deathKeys[getDeathType(i)];
  if (deathKey) list.push(QA[deathKey]);
  return list;
}

function getAntRatio(i) {
  const ratio = antPoints[i] / antLives[i];
  return isNaN(ratio) ? 0 : ratio;
}

// Everything the queen knows about each of the round's ants: score, where it did best, abilities, who's alive
function computeQueenTypeInfo() {
  const byType = new Map();
  for (const t of queen.types) {
    byType.set(t, { type: t, points: 0, lives: 0, alive: [], dormant: 0, spots: [], abilities: getAntQueenAbilities(t), size: antSize[t] });
  }
  for (let i = 1; i <= enemyCount; i++) {
    const rec = byType.get(antQueenType[i]);
    if (!rec) continue;
    rec.points += antPoints[i] || 0;
    rec.lives += antLives[i] || 1;
    if (antDormant[i]) rec.dormant++;
    else rec.alive.push(i);
    if (antHitSpots[i]) for (const s of antHitSpots[i]) rec.spots.push(s);
  }
  const toQueen = angleToBeetle(queen.x, queen.y) + Math.PI; // From the beetle toward the queen
  for (const rec of byType.values()) {
    rec.score = rec.lives > 0 ? rec.points / rec.lives : 0;
    if (rec.spots.length > 0) {
      let sx = 0;
      let sy = 0;
      for (const s of rec.spots) {
        sx += s.x;
        sy += s.y;
      }
      rec.ideal = { x: sx / rec.spots.length, y: sy / rec.spots.length };
    } else {
      // Never hit anything yet: its own preferred distance, on the queen's side of the beetle
      const d = keepDistance[rec.type] ? constrain(distanceFromAnchor[rec.type], 120, 320) : 150;
      rec.ideal = { x: Math.cos(toQueen) * d, y: Math.sin(toQueen) * d };
    }
    // Best spot first, then every spot it actually hit from, nearest to the best first
    const ideal = rec.ideal;
    rec.spotOptions = [ideal].concat(rec.spots.slice().sort((a, b) =>
      ((a.x - ideal.x) ** 2 + (a.y - ideal.y) ** 2) - ((b.x - ideal.x) ** 2 + (b.y - ideal.y) ** 2)));
  }
  return Array.from(byType.values());
}

// ========== QUEEN BRAIN ==========
// A small feed-forward network plus a handful of plain strategy values (guard radius etc.). The network's output
// layer starts at zero, so a new brain plays exactly the default strategy: head for where the best ants did best
// relative to the beetle (but stay at least 200px from it) and spawn them there, order ants that are out of place
// to walk to their ideal spots, sidestep out of line with the beetle for a couple of seconds after it shoots, spawn
// everything as guards when the beetle comes close or shoots, and use one of the best ant's abilities whenever she can.
// Every decision runs through the networks, so all of them depend on everything she sees: each strategy value below is
// only a base that a network output (fed all her raw inputs) can move anywhere in its range, ant choice and order spots
// come from per-ant networks that also get all her inputs, and so do her movement offset, spot blend and ability picks.
// Learning is a (1+1) evolution strategy: each strategy is scored over the stretch it was used for, the better of it
// and the best so far is kept, and that one is mutated.
const QB_INPUTS = 40;
const QB_HIDDEN = 12;
const QUEEN_TOP_TYPES = 3;                     // She tracks the ideal spots of her best 3 ants
const QB_OUT_BLEND = 2;                        // Outputs: move x, move y, then a weight for each top ant's spot,
const QB_OUT_AIM = QB_OUT_BLEND + QUEEN_TOP_TYPES;   // ability aim x, aim y and formation turn,
const QB_OUT_ALL_ORDER = QB_OUT_AIM + 3;             // order-everyone spot x, y,
const QB_OUT_PARAMS = QB_OUT_ALL_ORDER + 2;          // then one per strategy value, then one per ability
const QT_INPUTS = 7;                           // Per-ant-type networks: the ant's own values...
const QT_HIDDEN = 8;
const QT_ALL_INPUTS = QT_INPUTS + QB_INPUTS + QB_HIDDEN; // ...plus everything the queen sees and the main network's read of it
const QO_HIDDEN = 8;
const QUEEN_STRATEGY_DEFAULTS = {
  guardRadius: 100,     // Spawn everything as guards when the beetle is this close
  guardShotWindow: 45,  // ...or has fired within this many frames
  arriveRadius: 70,     // How close to her target she has to be before spawning there
  holdCharges: 1,       // Spawns she saves up before releasing them at her target
  scoreWeight: 3,       // How much an ant's score counts when picking what to spawn
  bestAntBias: 2,       // How much she prefers her best ant's abilities
  spotFocus: 4,         // Where she goes: how much a top ant's score pulls her toward its ideal spot
  antCohesion: 0,       // Where she goes: pull toward (+) or away from (-) her own ants
  minBeetleDistance: 200, // Where she goes: never closer to the beetle than this (her ants are ordered in instead)
  dodgeFrames: 120,     // After the beetle shoots, sidestep out of line with its x and y for this long...
  dodgeBand: 70,        // ...getting at least this far off each line
  orderDistance: 120,   // Order a kind of ant to its spot when they're this far from it on average
  orderIdealWeight: 1,  // Order spot: how much of the ant's ideal spot it uses (the order network adds the rest)
  orderAll: -1          // Above 0: her order goes to every ant (to one spot) instead of one kind of ant
};
const QUEEN_STRATEGY_RANGES = {
  guardRadius: [30, 600],
  guardShotWindow: [0, 150],
  arriveRadius: [30, 220],
  holdCharges: [1, 6],
  scoreWeight: [0, 6],
  bestAntBias: [0, 4],
  spotFocus: [0, 8],
  antCohesion: [-1, 1],
  minBeetleDistance: [0, 400],
  dodgeFrames: [0, 300],
  dodgeBand: [20, 150],
  orderDistance: [QUEEN_ORDER_ARRIVE, 400],
  orderIdealWeight: [0, 2],
  orderAll: [-1, 1]
};
const QUEEN_STRATEGY_KEYS = Object.keys(QUEEN_STRATEGY_RANGES);
const QB_OUT_ABILITIES = QB_OUT_PARAMS + QUEEN_STRATEGY_KEYS.length;
const QB_OUTPUTS = QB_OUT_ABILITIES + QUEEN_ABILITIES.length;

function randomWeights(count, scale) {
  const w = [];
  for (let k = 0; k < count; k++) w.push((Math.random() * 2 - 1) * scale);
  return w;
}

function createQueenBrain() {
  return {
    strategy: { ...QUEEN_STRATEGY_DEFAULTS },
    w1: randomWeights(QB_HIDDEN * (QB_INPUTS + 1), 0.5),
    w2: new Array(QB_OUTPUTS * (QB_HIDDEN + 1)).fill(0),
    t1: randomWeights(QT_HIDDEN * (QT_ALL_INPUTS + 1), 0.5),
    t2: new Array(QT_HIDDEN + 1).fill(0),
    o1: randomWeights(QO_HIDDEN * (QT_ALL_INPUTS + 1), 0.5),
    o2: new Array(2 * (QO_HIDDEN + 1)).fill(0)
  };
}

function cloneQueenBrain(brain) {
  return {
    strategy: { ...brain.strategy },
    w1: brain.w1.slice(),
    w2: brain.w2.slice(),
    t1: brain.t1.slice(),
    t2: brain.t2.slice(),
    o1: brain.o1.slice(),
    o2: brain.o2.slice()
  };
}

function mutateQueenBrain(brain, strength) {
  for (const w of [brain.w1, brain.w2, brain.t1, brain.t2, brain.o1, brain.o2]) {
    for (let k = 0; k < w.length; k++) {
      if (Math.random() < 0.25) w[k] = constrain(w[k] + randomGaussian() * 0.3 * strength, -4, 4);
    }
  }
  for (const key in QUEEN_STRATEGY_RANGES) {
    const [lo, hi] = QUEEN_STRATEGY_RANGES[key];
    brain.strategy[key] = constrain(brain.strategy[key] + randomGaussian() * 0.1 * strength * (hi - lo), lo, hi);
  }
}

// Fully connected layer: rows of (inputs..., bias)
function denseLayer(weights, inputs, outputs, activate) {
  const result = [];
  const stride = inputs.length + 1;
  for (let o = 0; o < outputs; o++) {
    let sum = weights[o * stride + inputs.length];
    for (let k = 0; k < inputs.length; k++) sum += weights[o * stride + k] * inputs[k];
    result.push(activate ? Math.tanh(sum) : sum);
  }
  return result;
}

function getQueenInputs(topTypes, maxScore) {
  const W = getGameplayWidth();
  const H = getGameplayHeight();
  const diag = Math.sqrt(W * W + H * H);
  const qx = queen.x;
  const qy = queen.y;

  let alive = 0;
  let cx = 0;
  let cy = 0;
  let nearestAnt = diag;
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i]) continue;
    alive++;
    cx += antX[i];
    cy += antY[i];
    nearestAnt = Math.min(nearestAnt, dist(qx, qy, antX[i], antY[i]));
  }
  cx = alive > 0 ? (cx / alive - qx) / W : 0;
  cy = alive > 0 ? (cy / alive - qy) / H : 0;

  let wallX = 0;
  let wallY = 0;
  let wallBest = Infinity;
  for (const wall of enemyWalls) {
    const d = dist(qx, qy, wall.x, wall.y);
    if (d < wallBest) {
      wallBest = d;
      wallX = (wall.x - qx) / W;
      wallY = (wall.y - qy) / H;
    }
  }

  let mineX = 0;
  let mineY = 0;
  let mineBest = Infinity;
  let mines = 0;
  for (const mine of landMines) {
    if (mine.isPlayerMine) continue;
    mines++;
    const d = dist(playerX, playerY, mine.x, mine.y);
    if (d < mineBest) {
      mineBest = d;
      mineX = (mine.x - playerX) / W;
      mineY = (mine.y - playerY) / H;
    }
  }

  // Aphids: the one nearest her, the one nearest the beetle (and whether it's a special one), and how many are out
  let aphidQX = 0;
  let aphidQY = 0;
  let aphidQBest = Infinity;
  let aphidBX = 0;
  let aphidBY = 0;
  let aphidBBest = Infinity;
  let aphidBSpecial = 0;
  for (const aphid of aphids) {
    const dq = dist(qx, qy, aphid.x, aphid.y);
    if (dq < aphidQBest) {
      aphidQBest = dq;
      aphidQX = (aphid.x - qx) / W;
      aphidQY = (aphid.y - qy) / H;
    }
    const db = dist(playerX, playerY, aphid.x, aphid.y);
    if (db < aphidBBest) {
      aphidBBest = db;
      aphidBX = (aphid.x - playerX) / W;
      aphidBY = (aphid.y - playerY) / H;
      aphidBSpecial = aphid.type === 'basic' ? 0 : 1;
    }
  }

  let ordered = 0;
  for (let i = 1; i <= enemyCount; i++) if (antOrder[i]) ordered++;

  const sinceShot = frameCount - lastBeetleShotFrame;
  const topSpots = [];
  for (const rec of topTypes) topSpots.push(rec.ideal.x / W, rec.ideal.y / H, rec.score / maxScore);
  return [
    qx / W, qy / H, playerX / W, playerY / H,
    (playerX - qx) / W, (playerY - qy) / H, dist(qx, qy, playerX, playerY) / diag,
    queen.health / queen.maxHealth, Math.min(queen.spawnCharges, 12) / 12,
    queen.abilityReady ? 1 : 0, queen.abilityTimer / QUEEN_ABILITY_FRAMES, queen.spawnTimer / queen.spawnFrames,
    sinceShot < 60 ? 1 - sinceShot / 60 : 0,
    Math.min(alive, 20) / 10, cx, cy, nearestAnt / diag,
    wallX, wallY, Math.min(enemyWalls.length, 10) / 5,
    mineX, mineY, Math.min(mines, 20) / 10,
    ...topSpots, getQueenPace() / 3,
    aphidQX, aphidQY, aphidBX, aphidBY, aphidBSpecial, Math.min(aphids.length, 10) / 5,
    Math.min(ordered, 20) / 10
  ];
}

// Her best ants by score, always QUEEN_TOP_TYPES long (repeats the best when there are fewer)
function getQueenTopTypes(types) {
  const top = types.slice().sort((a, b) => b.score - a.score).slice(0, QUEEN_TOP_TYPES);
  while (top.length < QUEEN_TOP_TYPES) top.push(top[0]);
  return top;
}

// One kind of ant's own values, followed by everything the queen sees and the main network's read of it
function getQueenTypeFeatures(rec, maxScore, globalInputs, globalHidden) {
  const W = getGameplayWidth();
  const H = getGameplayHeight();
  const diag = Math.sqrt(W * W + H * H);
  return [
    rec.score / maxScore, rec.size / 4, rec.abilities.length / 4, Math.min(rec.alive.length, 10) / 5,
    Math.min(rec.spots.length, 10) / 10, Math.sqrt(rec.ideal.x ** 2 + rec.ideal.y ** 2) / diag,
    Math.min(rec.dormant, 10) / 5
  ].concat(globalInputs, globalHidden);
}

function scoreQueenType(brain, features) {
  const hidden = denseLayer(brain.t1, features, QT_HIDDEN, true);
  return denseLayer(brain.t2, hidden, 1, false)[0];
}

// Where she'd order a kind of ant to, relative to the beetle: orderIdealWeight x its ideal spot, plus a shift from a
// small network that sees the ant's own values, everything the queen sees, and the main network's read of it. The
// shift can reach a full screen in any direction, so an order can go anywhere on the map, but it starts at zero:
// at first the order spot is exactly the ant's ideal spot and nothing else counts.
function getQueenOrderSpot(brain, params, rec, features) {
  const hidden = denseLayer(brain.o1, features, QO_HIDDEN, true);
  const shift = denseLayer(brain.o2, hidden, 2, false);
  const w = params.orderIdealWeight;
  return {
    x: rec.ideal.x * w + Math.tanh(shift[0]) * getGameplayWidth(),
    y: rec.ideal.y * w + Math.tanh(shift[1]) * getGameplayHeight()
  };
}

// Re-read the field: where to go, what to spawn, and how much she wants each ability
function updateQueenDecision() {
  const brain = queen.brain;
  const s = brain.strategy;
  const types = computeQueenTypeInfo();
  let maxScore = 0.0001;
  for (const rec of types) {
    if (rec.score > maxScore) maxScore = rec.score;
  }
  const topTypes = getQueenTopTypes(types);
  const inputs = getQueenInputs(topTypes, maxScore);
  const hidden = denseLayer(brain.w1, inputs, QB_HIDDEN, true);
  const out = denseLayer(brain.w2, hidden, QB_OUTPUTS, false);

  // Each strategy value: her learned base, moved by its own network output, which can reach anywhere in its range
  // (the output starts at zero, so at first each value is just its base)
  const params = {};
  QUEEN_STRATEGY_KEYS.forEach((key, k) => {
    const [lo, hi] = QUEEN_STRATEGY_RANGES[key];
    params[key] = constrain(s[key] + Math.tanh(out[QB_OUT_PARAMS + k]) * (hi - lo), lo, hi);
  });

  for (const rec of types) {
    const features = getQueenTypeFeatures(rec, maxScore, inputs, hidden);
    rec.utility = params.scoreWeight * rec.score / maxScore + scoreQueenType(brain, features) + Math.random() * 0.01;
    rec.orderSpot = getQueenOrderSpot(brain, params, rec, features);
  }
  let best = types[0];
  for (const rec of types) if (rec.utility > best.utility) best = rec;

  // Where to go, relative to the beetle: a blend of her top 3 ants' ideal spots. Each spot's weight is its score
  // (scaled by spotFocus) plus what the network makes of everything else she knows; a softmax turns them into shares.
  const weights = topTypes.map((rec, k) => params.spotFocus * rec.score / maxScore + out[QB_OUT_BLEND + k]);
  const top = Math.max(...weights);
  const shares = weights.map(w => Math.exp(w - top));
  const shareSum = shares.reduce((a, b) => a + b, 0);
  let anchorX = 0;
  let anchorY = 0;
  topTypes.forEach((rec, k) => {
    anchorX += rec.ideal.x * shares[k] / shareSum;
    anchorY += rec.ideal.y * shares[k] / shareSum;
  });

  queen.typeInfo = types;
  queen.bestType = best;
  queen.decision = {
    anchorX: anchorX,
    anchorY: anchorY,
    moveX: Math.tanh(out[0]) * getGameplayWidth(),
    moveY: Math.tanh(out[1]) * getGameplayHeight(),
    // Abilities aim at a point relative to the beetle (at first the beetle itself), and formations of planted things
    // (explosions, mines, turrets, mounds) turn by formationTurn from the aim direction
    aimX: Math.tanh(out[QB_OUT_AIM]) * getGameplayWidth(),
    aimY: Math.tanh(out[QB_OUT_AIM + 1]) * getGameplayHeight(),
    formationTurn: Math.tanh(out[QB_OUT_AIM + 2]) * Math.PI,
    // Where an order to every ant goes, relative to the beetle: the spot she's heading for, shifted
    allOrderX: anchorX + Math.tanh(out[QB_OUT_ALL_ORDER]) * getGameplayWidth(),
    allOrderY: anchorY + Math.tanh(out[QB_OUT_ALL_ORDER + 1]) * getGameplayHeight(),
    params: params,
    abilityLogits: out.slice(QB_OUT_ABILITIES)
  };
}

// Score the strategy used since the last adaptation, keep the better of it and the best so far, and mutate that
function adaptQueenBrain(reason) {
  if (reason === 'timer') queen.segmentScore += QUEEN_SCORE_CALM_RESET; // Went the whole stretch without taking damage
  const seconds = Math.max(1, (frameCount - queen.segmentStartFrame) / 60);
  const fitness = queen.segmentScore / seconds;
  if (!queen.bestBrain || fitness >= queen.bestFitness) {
    queen.bestBrain = cloneQueenBrain(queen.brain);
    queen.bestFitness = fitness;
  } else {
    queen.brain = cloneQueenBrain(queen.bestBrain);
    // The fight keeps changing, so an old best slowly loses its edge
    queen.bestFitness = queen.bestFitness * 0.75 + fitness * 0.25;
  }
  mutateQueenBrain(queen.brain, reason === 'hit' ? 1 : 0.6);
  queen.segmentScore = 0;
  queen.segmentStartFrame = frameCount;
  queen.adaptFlash = 30;
  updateQueenDecision();
}

// ========== QUEEN FIGHT ==========

function startQueenFight() {
  queenHitCount = 0; // Hits during the fight don't count toward the next queen
  const types = [];
  for (let i = 1; i <= enemyCount; i++) {
    antQueenType[i] = i;
    antDormant[i] = false;
    types.push(i);
  }

  // She arrives at the edge spot farthest from the beetle
  const b = getPlayAreaBounds(60);
  const spots = [
    [b.minX, b.minY], [(b.minX + b.maxX) / 2, b.minY], [b.maxX, b.minY], [b.maxX, (b.minY + b.maxY) / 2],
    [b.maxX, b.maxY], [(b.minX + b.maxX) / 2, b.maxY], [b.minX, b.maxY], [b.minX, (b.minY + b.maxY) / 2]
  ];
  let start = spots[0];
  for (const s of spots) {
    if (dist(s[0], s[1], playerX, playerY) > dist(start[0], start[1], playerX, playerY)) start = s;
  }

  const maxHealth = QUEEN_BASE_HEALTH + queensDefeatedThisRun;
  queen = {
    number: queensDefeatedThisRun + 1,
    x: start[0],
    y: start[1],
    health: maxHealth,
    maxHealth: maxHealth,
    types: types,
    brain: queenInheritedBrain ? cloneQueenBrain(queenInheritedBrain) : createQueenBrain(),
    bestBrain: null,
    bestFitness: -Infinity,
    segmentScore: 0,
    segmentStartFrame: frameCount,
    decision: null,
    typeInfo: [],
    bestType: null,
    life: 0,
    introFrames: QUEEN_INTRO_FRAMES,
    moveDirX: 0,
    moveDirY: 1,
    vx: 0,
    vy: 0,
    airTimer: 0,
    airDuration: 0,
    airPeak: 0,
    airHeight: 0,
    spawnTimer: 0,
    spawnFrames: QUEEN_SPAWN_FRAMES,
    spawnCharges: QUEEN_ANTS_PER_SPAWN,
    abilityTimer: 0,
    abilityReady: false,
    alarmFrames: 0,
    avengeFrames: 0,
    avengeDeaths: [],
    camoFrames: 0,
    ghostFrames: 0,
    refireFrames: 0,
    vacuumFrames: 0,
    orderCooldown: 0,
    bunker: null,
    dashHit: false,
    hitFlash: 0,
    lastHitTime: 0,
    adaptFlash: 0,
    label: '',
    labelFrames: 0
  };
  queenProjectiles = [];
  queenEffects = [];
  queenEffects.push({ kind: 'ring', x: queen.x, y: queen.y, life: 0, frames: 40, maxR: 160, color: [200, 120, 255] });
  updateQueenDecision();
  if (!sLoseShield.isPlaying()) sLoseShield.play();
}

function isQueenImmune() {
  return !queen || !!queen.bunker || queen.airHeight > 0;
}

// Any damage from the beetle. Returns true if it landed.
function damageQueen(amount) {
  if (isQueenImmune() || end) return false;
  queen.health -= amount;
  queen.hitFlash = 10;
  queen.lastHitTime = millis();
  queen.segmentScore += amount * QUEEN_SCORE_PER_QUEEN_DAMAGE;
  queen.spawnCharges += queen.hitSpawns || QUEEN_HIT_SPAWNS;
  if (!sHit1.isPlaying()) sHit1.play();
  if (queen.health <= 0) {
    killQueen();
  } else {
    adaptQueenBrain('hit');
  }
  return true;
}

// True if a point is within pad px of the queen's body (and she can be hit)
function isQueenHitAt(x, y, pad = 0) {
  if (isQueenImmune()) return false;
  return dist(x, y, queen.x, queen.y) < QUEEN_BODY_RADIUS + pad;
}

function killQueen() {
  spawnSmokeImpact(queen.x, queen.y, 70, 8);
  queenDeathBurst = createQueenDeathBurst(queen.x, queen.y);
  if (!sHit2.isPlaying()) sHit2.play();
  // Her last strategy goes to the next queen of this run
  queenInheritedBrain = cloneQueenBrain(queen.brain);
  queensDefeatedThisRun++;
  if (queen.final) onQueenOfQueensDefeated(); // The last queen pays out her own reward (finalboss.js)
  else awardQueen();
  queenDefeatedThisRound = true;
  abilitySceneAfterQueen = true; // The next round opens with an ability scene
  queen = null;
  queenProjectiles = [];
  queenEffects = [];
  queenHitCount = 0;
  timeCount = -1; // Killing the queen is the only way to end the round
}

function endQueenFight() {
  queen = null;
  queenProjectiles = [];
  queenEffects = [];
  antDormant = [];
  antQueenType = [];
  antOrder = [];
}

// How fast she does everything (Alarm: 2x with the beetle within QUEEN_AREA_RADIUS, 3x within 150px)
function getQueenPace() {
  if (!queen || queen.alarmFrames <= 0) return 1;
  const d = dist(queen.x, queen.y, playerX, playerY);
  if (d <= 150) return 3;
  if (d <= QUEEN_AREA_RADIUS) return 2;
  return 1;
}

function getQueenAreaBoosts() {
  let territory = false;
  let nest = false;
  for (const area of enemyTerritories) {
    if (dist(queen.x, queen.y, area.x, area.y) > area.radius) continue;
    territory = true;
    if (area.nest) nest = true;
  }
  return { territory: territory, nest: nest };
}

// Called every frame from draw()
function updateQueen() {
  if (!queen) {
    if (!end && start && !multiplayerMode && !isFinalLevel() && !isTutorialRun() && roundIntroTimer === 0 && queenHitCount >= getQueenHitsRequired()) {
      startQueenFight();
    }
    if (!queen) return;
  }
  if (end) {
    drawQueen();
    return;
  }

  queen.life++;
  if (queen.introFrames > 0) queen.introFrames--;
  if (queen.hitFlash > 0) queen.hitFlash--;
  if (queen.adaptFlash > 0) queen.adaptFlash--;
  if (queen.labelFrames > 0) queen.labelFrames--;
  if (queen.bunker && !enemyWalls.includes(queen.bunker)) queen.bunker = null;
  if (!dash) queen.dashHit = false;

  if (queen.life % QUEEN_DECISION_FRAMES === 0 || !queen.decision) updateQueenDecision();

  const pace = getQueenPace();
  const areas = getQueenAreaBoosts();
  const cooldownRate = pace * (areas.territory ? TERRITORY_BOOST : 1);
  const spawnRate = pace * (areas.nest ? 2 : 1);

  updateQueenMovement(pace);
  updateQueenSpawning(spawnRate);
  updateQueenOrders();

  if (!queen.abilityReady) {
    queen.abilityTimer = Math.min(QUEEN_ABILITY_FRAMES, queen.abilityTimer + cooldownRate * (queen.attackSpeed || 1));
    if (queen.abilityTimer >= QUEEN_ABILITY_FRAMES) queen.abilityReady = true;
  }
  if (queen.abilityReady) {
    queen.abilityReady = false;
    queen.abilityTimer = 0;
    useQueenAbility();
  }
  if (!queen) return;

  updateQueenStatus();
  updateQueenEffects();
  updateQueenProjectiles();
  if (!queen) return;
  updateQueenContact();
  if (!queen) return; // A dash can kill her
  drawQueen();

  // Every hit re-strategizes (and restarts this clock); otherwise she does it every QUEEN_ADAPT_FRAMES
  if (frameCount - queen.segmentStartFrame >= QUEEN_ADAPT_FRAMES) adaptQueenBrain('timer');
}

// Where she heads: the blend of her top ants' ideal spots around the beetle, shifted by the network's offset (which
// sees everything she tracks), pulled toward or away from her own ants by antCohesion, kept minBeetleDistance from the
// beetle, and, for dodgeFrames after it shoots, kept out of line with its x and y
function getQueenTarget() {
  const d = queen.decision;
  let x = playerX + d.anchorX + d.moveX;
  let y = playerY + d.anchorY + d.moveY;
  const cohesion = d.params.antCohesion;
  if (cohesion !== 0) {
    let alive = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 1; i <= enemyCount; i++) {
      if (antDormant[i]) continue;
      alive++;
      cx += antX[i];
      cy += antY[i];
    }
    if (alive > 0) {
      x += (cx / alive - x) * cohesion;
      y += (cy / alive - y) * cohesion;
    }
  }

  const s = d.params;
  // Too close to the beetle: back off along the same direction (her ants get ordered in instead)
  let ax = x - playerX;
  let ay = y - playerY;
  let ad = Math.sqrt(ax * ax + ay * ay);
  if (ad < s.minBeetleDistance) {
    if (ad < 1) {
      ax = queen.x - playerX;
      ay = queen.y - playerY;
      ad = Math.sqrt(ax * ax + ay * ay);
      if (ad < 1) {
        ax = 0;
        ay = -1;
        ad = 1;
      }
    }
    x = playerX + ax / ad * s.minBeetleDistance;
    y = playerY + ay / ad * s.minBeetleDistance;
  }

  // Dodge: the beetle's shots fly along its x and y, so stay on her side of each line and at least dodgeBand off it
  if (frameCount - lastBeetleShotFrame < s.dodgeFrames) {
    const sideX = queen.x >= playerX ? 1 : -1;
    const sideY = queen.y >= playerY ? 1 : -1;
    if (sideX * (x - playerX) < s.dodgeBand) x = playerX + sideX * s.dodgeBand;
    if (sideY * (y - playerY) < s.dodgeBand) y = playerY + sideY * s.dodgeBand;
  }
  return clampToPlayArea(x, y, 50);
}

// --- Orders ---
// The queen marks a spot for one kind of ant (see getQueenOrderSpot; at first its ideal spot around the beetle) and its ants
// walk straight there at their own speed, like a keep distance ant closing in. Within QUEEN_ORDER_ARRIVE of the spot
// they go back to moving like normal.
function updateQueenOrders() {
  for (let i = 1; i <= enemyCount; i++) {
    const order = antOrder[i];
    if (!order) continue;
    if (antDormant[i] || antInBunker[i] || frameCount >= order.expires) {
      antOrder[i] = null;
      continue;
    }
    const dx = order.x - antX[i];
    const dy = order.y - antY[i];
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= QUEEN_ORDER_ARRIVE) {
      antOrder[i] = null;
      continue;
    }
    if (antKnockedBack[i]) continue;
    antX[i] = constrain(antX[i] + dx / d * antSpeed[i], sideBuffer, getGameplayWidth() - sideBuffer);
    antY[i] = constrain(antY[i] + dy / d * antSpeed[i], scoreBarHeight + 15, getGameplayHeight() - expBarHeight - expBarBuffer);
  }

  if (queen.orderCooldown > 0) {
    queen.orderCooldown--;
    return;
  }
  const d = queen.decision;
  if (d.params.orderAll > 0) {
    // Everyone (that isn't hiding in a bunker) to one spot
    const spot = clampToPlayArea(playerX + d.allOrderX, playerY + d.allOrderY);
    const members = [];
    let away = 0;
    for (let i = 1; i <= enemyCount; i++) {
      if (antDormant[i] || antInBunker[i]) continue;
      members.push(i);
      away += dist(antX[i], antY[i], spot.x, spot.y);
    }
    if (members.length === 0 || away / members.length < d.params.orderDistance) return;
    issueQueenOrder(members, spot);
    return;
  }

  // Order the kind of ant that matters most and is furthest out of place
  let best = null;
  let bestValue = -Infinity;
  for (const rec of queen.typeInfo) {
    const members = rec.alive.filter(i => !antDormant[i] && !antInBunker[i] && !antOrder[i]);
    if (members.length === 0) continue;
    const spot = clampToPlayArea(playerX + rec.orderSpot.x, playerY + rec.orderSpot.y);
    let away = 0;
    for (const i of members) away += dist(antX[i], antY[i], spot.x, spot.y);
    away /= members.length;
    if (away < d.params.orderDistance) continue;
    const value = rec.utility + away / 300;
    if (value > bestValue) {
      bestValue = value;
      best = { members: members, spot: spot };
    }
  }
  if (!best) return;
  issueQueenOrder(best.members, best.spot);
}

function issueQueenOrder(members, spot) {
  let cx = 0;
  let cy = 0;
  for (const i of members) {
    antOrder[i] = { x: spot.x, y: spot.y, expires: frameCount + QUEEN_ORDER_FRAMES };
    cx += antX[i];
    cy += antY[i];
    queenEffects.push({ kind: 'antMark', ant: i, life: 0, frames: 40 });
  }
  // She shouts toward the ants she's ordering (the spot itself is never shown)
  queenEffects.push({ kind: 'shout', life: 0, frames: 26,
    angle: Math.atan2(cy / members.length - queen.y, cx / members.length - queen.x) });
  queen.orderCooldown = QUEEN_ORDER_COOLDOWN;
}

function updateQueenMovement(pace) {
  // Dashes (recoil), jumps (launch) and knockback carry her regardless of where she wants to go
  if (queen.vx !== 0 || queen.vy !== 0) {
    queen.x += queen.vx;
    queen.y += queen.vy;
    const friction = queen.airTimer > 0 ? 0.97 : 0.9;
    queen.vx *= friction;
    queen.vy *= friction;
    if (Math.abs(queen.vx) < 0.05 && Math.abs(queen.vy) < 0.05) {
      queen.vx = 0;
      queen.vy = 0;
    }
  }
  if (queen.airTimer > 0) {
    queen.airTimer--;
    const t = 1 - queen.airTimer / queen.airDuration;
    queen.airHeight = Math.sin(t * Math.PI) * queen.airPeak;
    if (queen.airTimer <= 0) queen.airHeight = 0;
  }

  if (queen.bunker) {
    // Hiding: she stays in her bunker until it caves in
    queen.x = queen.bunker.x;
    queen.y = queen.bunker.y;
  } else if (queen.vacuumFrames <= 0) {
    const target = getQueenTarget();
    const dx = target.x - queen.x;
    const dy = target.y - queen.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const step = QUEEN_SPEED * pace;
    if (d > step) {
      queen.moveDirX = dx / d;
      queen.moveDirY = dy / d;
      queen.x += queen.moveDirX * step;
      queen.y += queen.moveDirY * step;
    } else if (d > 0) {
      queen.x = target.x;
      queen.y = target.y;
    }
  }
  const p = clampToPlayArea(queen.x, queen.y, 20);
  queen.x = p.x;
  queen.y = p.y;
}

function isQueenGuarding() {
  const p = queen.decision.params;
  return dist(queen.x, queen.y, playerX, playerY) < p.guardRadius ||
    frameCount - lastBeetleShotFrame < p.guardShotWindow;
}

// Pick a type to spawn; penalties spread a batch over several types
function pickQueenSpawnType(penalties) {
  let best = null;
  let bestValue = -Infinity;
  for (const rec of queen.typeInfo) {
    const value = rec.utility - 0.75 * (penalties.get(rec.type) || 0);
    if (value > bestValue) {
      bestValue = value;
      best = rec;
    }
  }
  if (best) penalties.set(best.type, (penalties.get(best.type) || 0) + 1);
  return best;
}

// Spawn `count` ants in a ring around her
function releaseQueenSpawns(count) {
  const penalties = new Map();
  const ringStart = Math.random() * Math.PI * 2;
  for (let k = 0; k < count; k++) {
    const rec = pickQueenSpawnType(penalties);
    if (!rec) break;
    const a = ringStart + (k / count) * Math.PI * 2;
    const r = QUEEN_BODY_RADIUS + 18 + 6 * Math.floor(k / 8);
    queenSpawnAnt(rec.type, queen.x + Math.cos(a) * r, queen.y + Math.sin(a) * r);
  }
}

function updateQueenSpawning(spawnRate) {
  queen.spawnTimer += spawnRate;
  while (queen.spawnTimer >= queen.spawnFrames) {
    queen.spawnTimer -= queen.spawnFrames;
    queen.spawnFrames = queen.baseSpawnFrames || QUEEN_SPAWN_FRAMES; // Alternating fire's longer wait only lasts one spawn
    queen.spawnCharges += queen.antsPerSpawn || QUEEN_ANTS_PER_SPAWN;
  }
  if (queen.spawnCharges <= 0) return;

  if (isQueenGuarding()) {
    // The beetle is close or shooting: everything she has comes out to guard her
    releaseQueenSpawns(queen.spawnCharges);
    queen.spawnCharges = 0;
    return;
  }
  const target = getQueenTarget();
  const p = queen.decision.params;
  if (queen.spawnCharges >= Math.max(1, Math.round(p.holdCharges)) &&
      dist(queen.x, queen.y, target.x, target.y) <= p.arriveRadius) {
    releaseQueenSpawns(queen.spawnCharges);
    queen.spawnCharges = 0;
  }
}

// Alarm, avenge, refire, camouflage, ghost and vacuum timers
function updateQueenStatus() {
  if (queen.alarmFrames > 0) queen.alarmFrames--;
  if (queen.refireFrames > 0) queen.refireFrames--;
  if (queen.camoFrames > 0) queen.camoFrames--;
  if (queen.ghostFrames > 0) queen.ghostFrames--;

  if (queen.avengeFrames > 0) {
    queen.avengeFrames--;
    if (queen.avengeFrames === 0) {
      // Everyone who died while it was up comes back where they fell
      for (const death of queen.avengeDeaths) {
        if (!antDormant[death.i]) continue;
        placeSpawnedAnt(death.i, death.x, death.y);
        queenEffects.push({ kind: 'ring', x: antX[death.i], y: antY[death.i], life: 0, frames: 20, maxR: 45, color: [255, 80, 60] });
      }
      queen.avengeDeaths = [];
    }
  }

  if (queen.vacuumFrames > 0) {
    queen.vacuumFrames--;
    // Pull the beetle in at speed 6; touching her hurts (about 3 health a second)
    const dx = queen.x - playerX;
    const dy = queen.y - playerY;
    const d = Math.sqrt(dx * dx + dy * dy);
    const contact = QUEEN_BODY_RADIUS + PLAYER_WALL_RADIUS;
    if (d > contact) {
      const step = Math.min(6, d - contact);
      playerX += dx / d * step;
      playerY += dy / d * step;
      const p = clampToPlayArea(playerX, playerY, 10);
      playerX = p.x;
      playerY = p.y;
    }
    if (d <= contact + 6) queenHitPlayer(3 / 60, true);
    if (queen.vacuumFrames === 0) {
      // ...then blast everything back out
      knockPlayerFrom(queen.x, queen.y, 16);
      queenEffects.push({ kind: 'ring', x: queen.x, y: queen.y, life: 0, frames: 24, maxR: 260, color: [255, 255, 255] });
    }
  }
}

// The beetle can't walk through her (except while she's vacuuming it in); dashing into her hurts her once per dash
function updateQueenContact() {
  if (isQueenImmune()) return;
  const dx = playerX - queen.x;
  const dy = playerY - queen.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const reach = QUEEN_BODY_RADIUS + PLAYER_WALL_RADIUS;
  if (dash && !queen.dashHit && d < reach + 6) {
    queen.dashHit = true;
    if (!damageQueen(1 + (upgrade12Level * 0.2))) return; // Same damage as a dash hit on an ant (Horns)
    if (!queen) return;
  }
  if (queen.vacuumFrames > 0 || d >= reach) return;
  const nx = d > 0 ? dx / d : 1;
  const ny = d > 0 ? dy / d : 0;
  const p = clampToPlayArea(queen.x + nx * reach, queen.y + ny * reach, 10);
  playerX = p.x;
  playerY = p.y;
}

// --- Damage to the beetle ---

// vel: the queen acid's { vx, vy } when it was a bullet (for Shell Shrapnel)
function queenHitPlayer(damage, silent = false, vel = null) {
  if (end) return;
  if (interceptPlayerDamage(damage, false)) return; // Flying over it, or the bunker takes it
  damage *= getPlayerDamageTakenMultiplier() * (queen && queen.strength ? queen.strength : 1);
  if (shield > 0) {
    const shieldBefore = shield;
    shield -= damage;
    if (vel) spawnShellShrapnel(getShieldsLost(shieldBefore, shield), vel.vx, vel.vy);
    if (!silent && !sShieldHit1.isPlaying() && !sShieldHit2.isPlaying()) (random() < 0.5 ? sShieldHit1 : sShieldHit2).play();
  } else {
    playerLastDamageFrame = frameCount;
    health -= damage;
    if (!silent && !sHit1.isPlaying() && !sHit2.isPlaying()) (random() < 0.5 ? sHit1 : sHit2).play();
  }
  onPlayerDamaged(damage, true);
}

// Knock the beetle away from (x, y), using the same knockback the ants' knockback bullets use
function knockPlayerFrom(x, y, speed) {
  let dx = playerX - x;
  let dy = playerY - y;
  let d = Math.sqrt(dx * dx + dy * dy);
  if (d === 0) {
    dx = 1;
    d = 1;
  }
  playerKnockbackTargetX = dx / d * speed;
  playerKnockbackTargetY = dy / d * speed;
  playerKnockbackVelX = 0;
  playerKnockbackVelY = 0;
  playerKnockedBack = true;
  playerKnockbackAccelerating = true;
  playerKnockbackTimer = 40 + speed * 2;
  playerKnockbackInitialTimer = playerKnockbackTimer;
}

// ========== QUEEN ABILITIES ==========

// The alive ant with the best score that has this ability (its genes shape the effect), or -1
function getQueenAbilitySource(ability) {
  let best = -1;
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i] || !getAntQueenAbilities(i).includes(ability)) continue;
    if (best === -1 || getAntRatio(i) > getAntRatio(best)) best = i;
  }
  return best;
}

// Abilities she can use right now (an ant with it has to be out), and which of them her best ant has
function getQueenAvailableAbilities() {
  const available = new Set();
  let bestAnt = -1;
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i]) continue;
    const abilities = getAntQueenAbilities(i);
    for (const a of abilities) available.add(a);
    if (abilities.length > 0 && (bestAnt === -1 || getAntRatio(i) > getAntRatio(bestAnt))) bestAnt = i;
  }
  return { available: available, bestAntAbilities: bestAnt === -1 ? [] : getAntQueenAbilities(bestAnt) };
}

// Abilities that don't hurt the beetle by themselves (they spawn, move, hide, shove or buff)
const QUEEN_HARMLESS_ABILITIES = new Set(['alternating', 'alarm', 'avenge', 'blink', 'portal', 'camo', 'ghost', 'knockback',
  'vacuum', 'recoil', 'launch', 'refire', 'territory', 'nest', 'mound', 'bunker']);

function useQueenAbility() {
  const { available, bestAntAbilities } = getQueenAvailableAbilities();
  // The Queen of Queens always has her own acid to fall back on, whatever her ants can do
  if (queen.final) available.add(QA.generic);
  let ability = QA.generic;
  if (available.size > 0) {
    const logits = queen.decision.abilityLogits;
    const bias = queen.decision.params.bestAntBias;
    let bestValue = -Infinity;
    for (const a of available) {
      const value = (logits[a] || 0) + (bestAntAbilities.includes(a) ? bias : 0) + Math.random() * 0.01;
      if (value > bestValue) {
        bestValue = value;
        ability = a;
      }
    }
  }
  const src = ability === QA.generic ? -1 : getQueenAbilitySource(ability);
  queen.label = QUEEN_ABILITIES[ability].name;
  queen.labelFrames = 90;
  const key = QUEEN_ABILITIES[ability].key;
  castQueenAbility(key, src);
  // ...and never spends a whole attack doing nothing that can hurt the beetle
  if (queen && queen.final && QUEEN_HARMLESS_ABILITIES.has(key)) castQueenAbility('generic', -1);
}

// Where her abilities aim: a point the network picks relative to the beetle (starts on the beetle)
function getQueenAimPoint() {
  const d = queen.decision;
  return clampToPlayArea(playerX + d.aimX, playerY + d.aimY);
}

// Points of a fixed formation around (cx, cy), as [distance, angle from facing] pairs. If facing would push any of
// them off the map it turns (half way round, then a quarter either way); if none of those fit (in a corner), the
// whole formation slides back onto the map. Either way the spacing always holds.
function placeQueenFormation(cx, cy, facing, offsets) {
  const place = (turn) => offsets.map(([r, a]) => ({ x: cx + Math.cos(facing + turn + a) * r, y: cy + Math.sin(facing + turn + a) * r }));
  for (const turn of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) {
    const points = place(turn);
    if (points.every(p => isInPlayArea(p.x, p.y))) return points;
  }
  const points = place(0);
  const b = getPlayAreaBounds();
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const shiftX = minX < b.minX ? b.minX - minX : (maxX > b.maxX ? b.maxX - maxX : 0);
  const shiftY = minY < b.minY ? b.minY - minY : (maxY > b.maxY ? b.maxY - maxY : 0);
  return points.map(p => clampToPlayArea(p.x + shiftX, p.y + shiftY));
}

function getQueenAimAngle(fromX, fromY) {
  const p = getQueenAimPoint();
  return Math.atan2(p.y - fromY, p.x - fromX);
}

// --- Misses and wrong-way shots ---
// Each attack gets a tracker that its bullets, ants, streams, beams and blasts all report to: how close any part of it
// got to the beetle, whether any part was ever closer to the beetle than she was, and how many parts are still out.
// When the last part is gone, an attack that never got within QUEEN_MISS_RANGE costs QUEEN_SCORE_PER_MISS, and a shot
// that stayed further from the beetle than her the whole way (fired, in flight and on arrival) costs QUEEN_SCORE_WRONG_WAY.
function createQueenAttackTracker(key) {
  const checkMiss = QUEEN_ATTACK_ABILITIES.has(key);
  const checkWay = QUEEN_SHOT_ABILITIES.has(key);
  if (!checkMiss && !checkWay) return null;
  return { closest: Infinity, everCloser: false, parts: 0, checkMiss: checkMiss, checkWay: checkWay };
}

function addQueenAttackPart(tracker) {
  if (tracker) tracker.parts++;
}

function seeQueenAttackPart(tracker, distance) {
  if (!tracker) return;
  if (distance < tracker.closest) tracker.closest = distance;
  if (queen && distance < dist(queen.x, queen.y, playerX, playerY)) tracker.everCloser = true;
}

function endQueenAttackPart(tracker) {
  if (!tracker || --tracker.parts > 0 || !queen) return;
  if (tracker.checkMiss && tracker.closest > QUEEN_MISS_RANGE) queen.segmentScore += QUEEN_SCORE_PER_MISS;
  if (tracker.checkWay && !tracker.everCloser) queen.segmentScore += QUEEN_SCORE_WRONG_WAY;
}

// The abilities themselves are fixed; the network only picks the aim point and which way formations face
// At 150% strength (the Queen of Queens under 15 health) her attacks are 150% the size too
function getQueenAttackScale() {
  return queen && queen.strength > 1 ? queen.strength : 1;
}

// Grow whatever an ability just fired: bullets, blasts, beams, streams and planted bombs
function scaleNewQueenAttacks(projectilesBefore, effectsBefore) {
  const scale = getQueenAttackScale();
  if (scale === 1) return;
  for (let k = projectilesBefore; k < queenProjectiles.length; k++) {
    const p = queenProjectiles[k];
    if (p.kind !== 'acid' || p.sizeScale) continue;
    p.size *= scale;
    p.splitSize *= scale;
    p.sizeScale = scale;
    if (p.prox) p.prox = Object.assign({}, p.prox, { radius: p.prox.radius * scale, trigger: p.prox.trigger * scale });
  }
  for (let k = effectsBefore; k < queenEffects.length; k++) {
    const e = queenEffects[k];
    if (e.scaled) continue;
    e.scaled = true;
    if (e.width) e.width *= scale;
    if (e.range) e.range *= scale;
    if (e.radius) e.radius *= scale;
    if (e.kind === 'volley' && e.size) e.size *= scale;
  }
}

function castQueenAbility(key, src) {
  const projectilesBefore = queenProjectiles.length;
  const effectsBefore = queenEffects.length;
  castQueenAbilityUnscaled(key, src);
  if (queen) scaleNewQueenAttacks(projectilesBefore, effectsBefore);
}

function castQueenAbilityUnscaled(key, src) {
  const qx = queen.x;
  const qy = queen.y;
  const aimPoint = getQueenAimPoint();
  const aim = Math.atan2(aimPoint.y - qy, aimPoint.x - qx);
  const facing = aim + queen.decision.formationTurn; // Which way formations of planted things point
  const tracker = createQueenAttackTracker(key);
  // Close-range abilities used with the beetle out of her stream's reach
  if (QUEEN_CLOSE_RANGE_ABILITIES.has(key) &&
      dist(qx, qy, playerX, playerY) > QUEEN_STREAM_RANGE + QUEEN_BODY_RADIUS * 0.8) {
    queen.segmentScore += QUEEN_SCORE_OUT_OF_RANGE;
  }
  switch (key) {
    case 'alternating': {
      // Two ants right now, but the next spawn takes twice as long
      releaseQueenSpawns(2);
      queen.spawnTimer = 0;
      queen.spawnFrames = QUEEN_SPAWN_FRAMES * 2;
      break;
    }
    case 'hitReload':
      fireQueenAcid(qx, qy, aim, QUEEN_BULLET_SIZE, QUEEN_BULLET_SPEED, { hitReload: true, tracker: tracker });
      break;
    case 'burst':
      for (let k = 0; k < 5; k++) fireQueenAcid(qx, qy, aim + (k - 2) * 0.17, 1, QUEEN_BULLET_SPEED, { tracker: tracker });
      break;
    case 'delayedBurst':
      fireQueenAcid(qx, qy, aim, 3, 5, { splitAt: 40, splitCount: 6, splitSize: 0.5, dmgSpeed: 5, tracker: tracker });
      break;
    case 'rapid':
      addQueenAttackPart(tracker);
      queenEffects.push({ kind: 'volley', life: 0, left: 15, every: 4, size: 0.5, speed: QUEEN_BULLET_SPEED, spread: 0.05, tracker: tracker });
      break;
    case 'stream':
      addQueenAttackPart(tracker);
      queenEffects.push({ kind: 'stream', life: 0, frames: 120, angle: aim, range: QUEEN_STREAM_RANGE, width: 100, tracker: tracker });
      break;
    case 'alarm':
      queen.alarmFrames = QUEEN_EFFECT_FRAMES;
      break;
    case 'avenge':
      queen.avengeFrames = QUEEN_EFFECT_FRAMES;
      queen.avengeDeaths = [];
      break;
    case 'curve': {
      // Two ants, one on either side of her
      const penalties = new Map();
      for (const side of [0, Math.PI]) {
        const rec = pickQueenSpawnType(penalties);
        if (!rec) break;
        addQueenAttackPart(tracker);
        queenProjectiles.push({ kind: 'ant', mode: 'spiral', type: rec.type, angle: aim + side, radius: QUEEN_BODY_RADIUS,
          life: 0, x: qx + Math.cos(aim + side) * QUEEN_BODY_RADIUS, y: qy + Math.sin(aim + side) * QUEEN_BODY_RADIUS, tracker: tracker });
      }
      break;
    }
    case 'homing': {
      // Two ants, a little apart
      const penalties = new Map();
      for (const side of [-1, 1]) {
        const rec = pickQueenSpawnType(penalties);
        if (!rec) break;
        addQueenAttackPart(tracker);
        queenProjectiles.push({ kind: 'ant', mode: 'homing', type: rec.type, angle: aim + side * 0.2, speed: 8, life: 0,
          x: qx - Math.sin(aim) * side * 20, y: qy + Math.cos(aim) * side * 20, tracker: tracker });
      }
      break;
    }
    case 'highArc':
    case 'splitArc': {
      // Lob ants to wherever they do best around the beetle (High Arc: 1 arc, Split Arc: 3)
      const penalties = new Map();
      for (let k = 0; k < (key === 'splitArc' ? 3 : 1); k++) {
        const rec = pickQueenSpawnType(penalties);
        if (!rec) break;
        const target = clampToPlayArea(playerX + rec.ideal.x, playerY + rec.ideal.y, 10);
        addQueenAttackPart(tracker);
        // Each arc lands 2 ants
        queenProjectiles.push({ kind: 'ant', mode: 'arc', type: rec.type, sx: qx, sy: qy, tx: target.x, ty: target.y,
          duration: 70, height: 140, life: 0, x: qx, y: qy, airHeight: 0, count: 2, tracker: tracker });
      }
      break;
    }
    case 'accelerate':
      addQueenAttackPart(tracker);
      queenEffects.push({ kind: 'volley', life: 0, left: 3, every: 12, size: QUEEN_BULLET_SIZE, speed: 2, accel: true, spread: 0, tracker: tracker });
      break;
    case 'beam':
      // Three beams a second apart, each aimed 30 frames before it fires
      for (let k = 0; k < 3; k++) {
        addQueenAttackPart(tracker);
        queenEffects.push({ kind: 'beam', life: 0, aimAt: k * 60, fireAt: k * 60 + 30, frames: k * 60 + 30 + QUEEN_BEAM_FRAMES,
          width: QUEEN_BEAM_WIDTH, hit: false, tracker: tracker });
      }
      break;
    case 'blink': {
      // Three ants
      const moved = new Set();
      for (let k = 0; k < 3; k++) queenBlinkAnt(moved);
      break;
    }
    case 'portal':
      queenPortal();
      break;
    case 'timeExplosion': {
      // Three huge blasts going off one after another: one on her aim point and two 150px out from it, 60 degrees
      // either side of the way the formation faces (fixed spacing, so they never stack up on one spot)
      const points = placeQueenFormation(aimPoint.x, aimPoint.y, facing, [[0, 0], [150, -Math.PI / 3], [150, Math.PI / 3]]);
      points.forEach((p, k) => {
        addQueenAttackPart(tracker);
        queenEffects.push({ kind: 'timeBomb', life: 0, x: p.x, y: p.y, at: 180 + k * 10, radius: 140, owner: src, tracker: tracker });
      });
      break;
    }
    case 'proximityExplosion':
      for (let k = -1; k <= 1; k++) {
        fireQueenAcid(qx, qy, aim + k * 0.26, 2.5, 4, { prox: { trigger: 80, radius: 110, owner: src }, maxLife: 240, tracker: tracker });
      }
      break;
    case 'camo':
      queen.camoFrames = QUEEN_EFFECT_FRAMES;
      break;
    case 'ghost':
      queen.ghostFrames = QUEEN_EFFECT_FRAMES;
      break;
    case 'knockback':
      queenKnockbackPulse();
      break;
    case 'vacuum':
      queen.vacuumFrames = 180;
      break;
    case 'recoil':
      queen.vx = queen.moveDirX * 16;
      queen.vy = queen.moveDirY * 16;
      break;
    case 'launch':
      queen.vx = queen.moveDirX * 7;
      queen.vy = queen.moveDirY * 7;
      queen.airDuration = 45;
      queen.airTimer = 45;
      queen.airPeak = 60;
      break;
    case 'smear':
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        spawnEnemySmear(qx + Math.cos(a) * 40, qy + Math.sin(a) * 40, 2, src, Math.cos(a) * 3, Math.sin(a) * 3);
      }
      break;
    case 'landmine':
      for (const p of placeQueenFormation(qx, qy, facing, getQueenSemicircle(75))) {
        landMines.push(makeQueenMine(p.x, p.y, 1.5, src));
      }
      break;
    case 'refire':
      queen.refireFrames = QUEEN_EFFECT_FRAMES;
      break;
    case 'turret':
      for (const p of placeQueenFormation(qx, qy, facing, getQueenSemicircle(70))) {
        deathRefires.push({ x: p.x, y: p.y, size: 1.5, owner: src, isTurret: true, life: 0, shotsLeft: TURRET_SHOTS,
          nextShotAt: TURRET_DEPLOY_FRAMES, finishedAt: null });
      }
      break;
    case 'territory':
    case 'nest':
      enemyTerritories.push({ x: qx, y: qy, radius: QUEEN_AREA_RADIUS, nest: key === 'nest', life: 0, maxLife: 600 });
      break;
    case 'mound': {
      // Five mounds in a semicircle in front of her, the way the formation faces
      for (const p of placeQueenFormation(qx, qy, facing, getQueenSemicircle(80))) {
        enemyWalls.push(makeQueenWall(p.x, p.y, MOUND_RADIUS, false, 1.5, 480));
      }
      break;
    }
    case 'bunker': {
      const wall = makeQueenWall(qx, qy, QUEEN_BODY_RADIUS, true, 2, 540);
      enemyWalls.push(wall);
      queen.bunker = wall;
      break;
    }
    default:
      // Generic (and her basic attack): three acid shots a second apart
      addQueenAttackPart(tracker);
      queenEffects.push({ kind: 'volley', life: 0, left: 3, every: 60, size: QUEEN_BULLET_SIZE, speed: QUEEN_BULLET_SPEED, spread: 0, tracker: tracker });
  }
}

// Five spots in a semicircle r px out, centred on the way the formation faces
function getQueenSemicircle(r) {
  return [-2, -1, 0, 1, 2].map(k => [r, k * Math.PI / 4]);
}

function makeQueenWall(x, y, radius, bunker, wallHealth, maxLife) {
  return { x: x, y: y, radius: radius, bunker: bunker, health: wallHealth, maxHealth: wallHealth, life: 0,
    maxLife: maxLife, hitFlash: 0, dashHit: false, occupants: 0 };
}

// A landmine owned by ant `owner` (same shape as the mines dead bullets turn into)
function makeQueenMine(x, y, size, owner) {
  return {
    x: x,
    y: y,
    size: size,
    owner: owner,
    isPlayerMine: false,
    knockbackBullet: getSpecialType(owner) === -1,
    knockbackMultiplier: bulletKnockbackMultiplier[owner] || 1,
    trueSpeed: QUEEN_BULLET_SPEED,
    life: 0,
    explodeOnTermination: explodeOnTermination[owner] || false,
    triggerExplodeViaProximity: triggerExplodeViaProximity[owner] || false,
    explosionProximity: explosionProximity[owner] || 0,
    explodeAfter: bulletExplodeAfter[owner],
    meltAfter: getMineMeltFrames(owner) * 2,
    stealthType: getMineStealthType(owner),
    camoFlashRate: bulletCamoFlashRate[owner],
    fusionCount: 1
  };
}

// Blink: teleport the ant that's furthest from where it does best to that spot (or its next best spot on the map)
function queenBlinkAnt(moved) {
  let pick = -1;
  let pickValue = -Infinity;
  let pickSpot = null;
  for (const rec of queen.typeInfo) {
    for (const i of rec.alive) {
      if (antDormant[i] || antInBunker[i] || moved.has(i)) continue;
      const spot = rec.spotOptions.find(s => isInPlayArea(playerX + s.x, playerY + s.y)) || rec.ideal;
      const value = rec.utility + dist(antX[i], antY[i], playerX + spot.x, playerY + spot.y) / 300;
      if (value > pickValue) {
        pickValue = value;
        pick = i;
        pickSpot = spot;
      }
    }
  }
  if (pick === -1) return;
  moved.add(pick);
  const p = clampToPlayArea(playerX + pickSpot.x, playerY + pickSpot.y);
  spawnBlinkFlash(antX[pick], antY[pick], 30, false);
  antX[pick] = p.x;
  antY[pick] = p.y;
  antPrevX[pick] = p.x;
  antPrevY[pick] = p.y;
  spawnBlinkFlash(p.x, p.y, 30, false);
}

// Portal: she teleports herself, to her target, or as far from the beetle as she can when it's on top of her
function queenPortal() {
  let dest = getQueenTarget();
  if (isQueenGuarding()) {
    const b = getPlayAreaBounds(60);
    for (const s of [[b.minX, b.minY], [b.maxX, b.minY], [b.maxX, b.maxY], [b.minX, b.maxY]]) {
      if (dist(s[0], s[1], playerX, playerY) > dist(dest.x, dest.y, playerX, playerY)) dest = { x: s[0], y: s[1] };
    }
  }
  spawnBlinkFlash(queen.x, queen.y, 60, true);
  queen.x = dest.x;
  queen.y = dest.y;
  spawnBlinkFlash(queen.x, queen.y, 60, true);
}

// Knockback: push everything on the map away from her (no damage); the beetle gets the strongest shove
function queenKnockbackPulse() {
  const reach = 800;
  const falloff = (x, y) => Math.max(0.35, 1 - dist(queen.x, queen.y, x, y) / reach);
  knockPlayerFrom(queen.x, queen.y, 14 * falloff(playerX, playerY));
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i] || isAntSheltered(i)) continue;
    const a = Math.atan2(antY[i] - queen.y, antX[i] - queen.x);
    const f = 5 * falloff(antX[i], antY[i]) / Math.max(0.5, antSize[i]);
    antKnockbackVelX[i] = Math.cos(a) * f;
    antKnockbackVelY[i] = Math.sin(a) * f;
    antKnockedBack[i] = true;
    antKnockbackTimer[i] = 30;
  }
  for (let i = 1; i <= enemyCount; i++) {
    for (const bullet of enemyBullets[i] || []) {
      if (bullet.pathType === 1) continue; // Lofted bullets are out of reach
      const a = Math.atan2(bullet.y - queen.y, bullet.x - queen.x);
      const f = 3 * falloff(bullet.x, bullet.y);
      bullet.speedX += Math.cos(a) * f;
      bullet.speedY += Math.sin(a) * f;
    }
  }
  for (const b of playerBullets) {
    if (b.stopped) continue;
    b.rotation = Math.atan2(b.y - queen.y, b.x - queen.x) * 180 / Math.PI; // Player bullets aim in degrees
  }
  for (const p of queenProjectiles) {
    if (p.kind !== 'acid') continue;
    const a = Math.atan2(p.y - queen.y, p.x - queen.x);
    const f = 3 * falloff(p.x, p.y);
    p.vx += Math.cos(a) * f;
    p.vy += Math.sin(a) * f;
  }
  queenEffects.push({ kind: 'ring', x: queen.x, y: queen.y, life: 0, frames: 28, maxR: 420, color: [255, 255, 255] });
}

// --- Queen projectiles ---

function fireQueenAcid(x, y, angle, size, speed, opts = {}) {
  queenProjectiles.push({
    kind: 'acid',
    x: x,
    y: y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: size,
    life: 0,
    maxLife: opts.maxLife || 0,
    accel: !!opts.accel,
    dmgSpeed: opts.dmgSpeed || QUEEN_BULLET_SPEED,
    hitReload: !!opts.hitReload,
    splitAt: opts.splitAt || 0,
    splitCount: opts.splitCount || 0,
    splitSize: opts.splitSize || 0,
    prox: opts.prox || null,
    refired: !!opts.refired,
    sizeScale: opts.sizeScale || 0,
    tracker: opts.tracker || null
  });
  addQueenAttackPart(opts.tracker);
  playSpitSound();
}

// Refire: a bullet leaving the screen is fired again at the beetle from the edge where it left
function queenRefireFrom(x, y, size) {
  const p = clampToPlayArea(x, y);
  fireQueenAcid(p.x, p.y, angleToBeetle(p.x, p.y), size, QUEEN_BULLET_SPEED, { refired: true });
  speedRings.push({ x: p.x, y: p.y, size: 10 * size, maxSize: 40 * size, alpha: 255, life: 0 });
}

// Called when an ant's bullet goes off screen
function onEnemyBulletLeftScreen(bullet) {
  if (queen && queen.refireFrames > 0) queenRefireFrom(bullet.x, bullet.y, bullet.size || 1);
}

function explodeQueenBomb(p) {
  seeQueenAttackPart(p.tracker, Math.max(0, dist(p.x, p.y, playerX, playerY) - p.prox.radius));
  const owner = p.prox.owner;
  if (owner >= 1) {
    // Radius is fixed for the queen's version, whatever the ant's radius gene is
    const size = p.size / (p.sizeScale || 1);
    const base = (20 + 40 * (size - 1)) * (radiusMultiplier[owner] || 1);
    spawnQueenExplosion(p.x, p.y, size, owner, p.prox.radius / base);
  } else {
    spawnSmokeImpact(p.x, p.y, p.prox.radius);
    if (dist(playerX, playerY, p.x, p.y) < p.prox.radius) queenHitPlayer(p.size / (p.sizeScale || 1));
  }
}

function removeQueenProjectile(k) {
  endQueenAttackPart(queenProjectiles[k].tracker);
  queenProjectiles.splice(k, 1);
}

// Spawn the ant(s) a fired ant carries, side by side across the way it was flying
function spawnQueenProjectileAnt(p, x, y) {
  const count = p.count || 1;
  const heading = p.heading || 0;
  for (let k = 0; k < count; k++) {
    const offset = (k - (count - 1) / 2) * 36;
    queenSpawnAnt(p.type, x - Math.sin(heading) * offset, y + Math.cos(heading) * offset);
  }
}

function updateQueenProjectiles() {
  const hidden = tigerBeetleActive && tigerBeetleMoving;
  for (let k = queenProjectiles.length - 1; k >= 0; k--) {
    const p = queenProjectiles[k];
    p.life++;

    if (p.kind === 'ant') {
      const flying = updateQueenAntProjectile(p);
      seeQueenAttackPart(p.tracker, dist(p.x, p.y, playerX, playerY));
      if (!flying) {
        removeQueenProjectile(k);
        continue;
      }
      if (!hidden) drawQueenAntProjectile(p);
      continue;
    }

    // Acid
    if (p.accel) {
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed < 16) {
        p.vx *= 1.06;
        p.vy *= 1.06;
      }
      // Sonic boom trail, like the ants' accelerating bullets
      if (p.life % 9 === 0) {
        speedRings.push({ x: p.x, y: p.y, size: 8 * p.size, maxSize: 25 * p.size, alpha: 255, life: 0 });
      }
    }
    if (p.splitAt && p.life >= p.splitAt) {
      // Delayed burst: a firework of small bullets in every direction
      for (let s = 0; s < p.splitCount; s++) {
        const a = (s / p.splitCount) * Math.PI * 2 + Math.random() * 0.2;
        fireQueenAcid(p.x, p.y, a, p.splitSize, 5, { dmgSpeed: 5, tracker: p.tracker, sizeScale: p.sizeScale });
      }
      spawnSmokeImpact(p.x, p.y, 30, 3);
      removeQueenProjectile(k);
      continue;
    }
    p.x += p.vx;
    p.y += p.vy;
    seeQueenAttackPart(p.tracker, dist(p.x, p.y, playerX, playerY));

    if (p.prox) {
      if (dist(p.x, p.y, playerX, playerY) <= p.prox.trigger || (p.maxLife && p.life >= p.maxLife) || !isInPlayArea(p.x, p.y)) {
        const edge = clampToPlayArea(p.x, p.y);
        p.x = edge.x;
        p.y = edge.y;
        explodeQueenBomb(p);
        removeQueenProjectile(k);
        continue;
      }
    } else if (getPlayerWallHitBy(p.x, p.y, p.vx, p.vy) || getEnemyMoundAt(p.x, p.y, 4)) {
      // Mounds stop her acid; the beetle's mounds and bunker take the hit
      const ownWall = getPlayerWallHitBy(p.x, p.y, p.vx, p.vy);
      if (ownWall) damagePlayerWall(ownWall, p.size * getBulletSpeedTier(p.dmgSpeed).damageMultiplier);
      removeQueenProjectile(k);
      continue;
    } else if (!isPlayerFlying() && dist(p.x, p.y, playerX, playerY) < 22 + 6 * p.size) {
      if (tryDashDeflect(p.x, p.y)) {
        removeQueenProjectile(k);
        continue;
      }
      queenHitPlayer(p.size / (p.sizeScale || 1) * getBulletSpeedTier(p.dmgSpeed).damageMultiplier, false, { vx: p.vx, vy: p.vy });
      if (p.hitReload && queen) {
        // Hit reload: every hit earns another ant to spawn and another shot
        queen.spawnCharges++;
        fireQueenAcid(queen.x, queen.y, getQueenAimAngle(queen.x, queen.y), p.size, QUEEN_BULLET_SPEED, { hitReload: true, tracker: p.tracker, sizeScale: p.sizeScale });
      }
      removeQueenProjectile(k);
      continue;
    }

    if (!isInPlayArea(p.x, p.y, -20)) {
      if (queen && queen.refireFrames > 0 && !p.refired) queenRefireFrom(p.x, p.y, p.size);
      removeQueenProjectile(k);
      continue;
    }
    if (!hidden) drawQueenAcid(p);
  }
}

// Ants fired like bullets. Returns false once the ant has been spawned.
function updateQueenAntProjectile(p) {
  if (p.mode === 'arc') {
    const t = Math.min(1, p.life / p.duration);
    p.x = lerp(p.sx, p.tx, t);
    p.y = lerp(p.sy, p.ty, t);
    p.airHeight = Math.sin(t * Math.PI) * p.height;
    p.heading = Math.atan2(p.ty - p.sy, p.tx - p.sx);
    if (t >= 1) {
      spawnQueenProjectileAnt(p, p.tx, p.ty);
      return false;
    }
    return true;
  }

  const prevX = p.x;
  const prevY = p.y;
  if (p.mode === 'spiral') {
    // Clockwise Curve: spirals out around her, then lands
    if (!queen) return false;
    p.angle += 0.11;
    p.radius += 2.4;
    p.x = queen.x + Math.cos(p.angle) * p.radius;
    p.y = queen.y + Math.sin(p.angle) * p.radius;
    if (p.life >= 85 || !isInPlayArea(p.x, p.y)) {
      const s = clampToPlayArea(p.x, p.y);
      spawnQueenProjectileAnt(p, s.x, s.y);
      return false;
    }
  } else {
    // Homing Curve: steers at the beetle and lands when it hits or runs out of momentum
    const want = angleToBeetle(p.x, p.y);
    let diff = want - p.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    p.angle += constrain(diff, -0.07, 0.07);
    p.speed *= 0.985;
    p.x += Math.cos(p.angle) * p.speed;
    p.y += Math.sin(p.angle) * p.speed;
    if (p.speed < 1.6 || !isInPlayArea(p.x, p.y)) {
      const s = clampToPlayArea(p.x, p.y);
      spawnQueenProjectileAnt(p, s.x, s.y);
      return false;
    }
  }
  p.heading = Math.atan2(p.y - prevY, p.x - prevX);
  if (dist(p.x, p.y, playerX, playerY) < 30) {
    queenHitPlayer(1);
    spawnQueenProjectileAnt(p, p.x, p.y);
    return false;
  }
  return true;
}

function drawQueenAcid(p) {
  push();
  imageMode(CENTER);
  const s = 20 * p.size;
  noStroke();
  fill(190, 90, 255, 90);
  ellipse(p.x, p.y, s * 1.35);
  // Face the way it's moving, like the ants' bullets
  angleMode(DEGREES);
  translate(p.x, p.y);
  rotate(Math.atan2(p.vy, p.vx) * 180 / Math.PI);
  image(bulletImage, 0, 0, s, s);
  if (p.prox) {
    fill(230, 30, 30, 200 + 55 * Math.sin(p.life * 0.4));
    ellipse(0, 0, s * 0.35);
  }
  pop();
}

function drawQueenAntProjectile(p) {
  const air = p.airHeight || 0;
  if (air > 0) drawGroundShadow(p.x, p.y, 26 * map(air, 0, 140, 1, 0.6), 11, 0, 60);
  push();
  angleMode(DEGREES);
  imageMode(CENTER);
  translate(p.x, p.y - air);
  noStroke();
  fill(190, 90, 255, 80);
  ellipse(0, 0, 50);
  rotate((p.heading || 0) * 180 / Math.PI);
  image(ant, 0, 0, 40, 40);
  pop();
}

// --- Queen effects: volleys, streams, beams, planted explosions, rings ---

function updateQueenEffects() {
  const hidden = tigerBeetleActive && tigerBeetleMoving;
  for (let k = queenEffects.length - 1; k >= 0; k--) {
    const e = queenEffects[k];
    e.life++;
    let done = false;
    if (e.kind === 'volley') {
      if (e.life >= (e.next || 0)) {
        const a = getQueenAimAngle(queen.x, queen.y) + random(-e.spread, e.spread);
        fireQueenAcid(queen.x, queen.y, a, e.size, e.speed, { accel: e.accel, dmgSpeed: QUEEN_BULLET_SPEED, tracker: e.tracker, sizeScale: e.scaled ? getQueenAttackScale() : 0 });
        e.left--;
        e.next = e.life + e.every;
      }
      done = e.left <= 0;
    } else if (e.kind === 'stream') {
      done = updateQueenStream(e, hidden);
    } else if (e.kind === 'beam') {
      done = updateQueenBeam(e, hidden);
    } else if (e.kind === 'timeBomb') {
      done = updateQueenTimeBomb(e, hidden);
    } else if (e.kind === 'shout') {
      if (!hidden && queen) drawQueenShout(e);
      done = e.life >= e.frames;
    } else if (e.kind === 'antMark') {
      if (!hidden && !antDormant[e.ant]) drawQueenAntMark(e);
      done = e.life >= e.frames || antDormant[e.ant];
    } else if (e.kind === 'ring') {
      if (!hidden) {
        const t = e.life / e.frames;
        push();
        noFill();
        stroke(e.color[0], e.color[1], e.color[2], 220 * (1 - t));
        strokeWeight(3);
        ellipse(e.x, e.y, e.maxR * 2 * t);
        pop();
      }
      done = e.life >= e.frames;
    }
    if (done) {
      endQueenAttackPart(e.tracker);
      queenEffects.splice(k, 1);
    }
  }
}

// Stream Fire: twice an ant stream's reach and width, swinging slowly after her aim point
function updateQueenStream(e, hidden) {
  const want = getQueenAimAngle(queen.x, queen.y);
  let diff = want - e.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  e.angle += constrain(diff, -0.035, 0.035);
  const dirX = Math.cos(e.angle);
  const dirY = Math.sin(e.angle);
  const ox = queen.x + dirX * QUEEN_BODY_RADIUS * 0.8;
  const oy = queen.y + dirY * QUEEN_BODY_RADIUS * 0.8;
  const grow = Math.min(1, e.life / 20);
  const range = e.range * grow;
  const baseW = e.width * 0.2;

  const dx = playerX - ox;
  const dy = playerY - oy;
  const along = dx * dirX + dy * dirY;
  const across = Math.abs(-dx * dirY + dy * dirX);
  if (along > -15 && along < range + 15) {
    const halfWidth = lerp(baseW, e.width, constrain(along, 0, range) / Math.max(1, range)) / 2;
    if (across < halfWidth + 15) queenHitPlayer(2 / 60, true);
  }
  // How close the stream's edge came to the beetle
  const nearAlong = constrain(along, 0, range);
  const nearHalfWidth = lerp(baseW, e.width, nearAlong / Math.max(1, range)) / 2;
  seeQueenAttackPart(e.tracker, Math.sqrt((along - nearAlong) ** 2 + Math.max(0, across - nearHalfWidth) ** 2));

  if (!hidden) {
    const nx = -dirY;
    const ny = dirX;
    const ex = ox + dirX * range;
    const ey = oy + dirY * range;
    const flicker = 0.85 + 0.15 * Math.sin(e.life * 0.7);
    push();
    noStroke();
    fill(0, 220, 0, 110 * flicker);
    quad(ox + nx * baseW / 2, oy + ny * baseW / 2, ex + nx * e.width / 2, ey + ny * e.width / 2,
      ex - nx * e.width / 2, ey - ny * e.width / 2, ox - nx * baseW / 2, oy - ny * baseW / 2);
    fill(120, 255, 120, 150 * flicker);
    quad(ox + nx * baseW / 4, oy + ny * baseW / 4, ex + nx * e.width / 4, ey + ny * e.width / 4,
      ex - nx * e.width / 4, ey - ny * e.width / 4, ox - nx * baseW / 4, oy - ny * baseW / 4);
    pop();
  }
  return e.life >= e.frames;
}

// Beam: aimed at her aim point 30 frames before it fires, then fired straight from her
function updateQueenBeam(e, hidden) {
  if (e.life === e.aimAt) {
    const aimPoint = getQueenAimPoint();
    e.aimX = aimPoint.x;
    e.aimY = aimPoint.y;
  }
  if (e.life < e.aimAt) return false;
  if (e.life < e.fireAt) {
    if (!hidden) {
      const t = (e.life - e.aimAt) / (e.fireAt - e.aimAt);
      push();
      stroke(255, 60, 60, 60 + 160 * t);
      strokeWeight(1 + 2 * t);
      line(queen.x, queen.y, e.aimX, e.aimY);
      pop();
    }
    return false;
  }
  if (e.life === e.fireAt) {
    let dx = e.aimX - queen.x;
    let dy = e.aimY - queen.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= d;
    dy /= d;
    const len = getDistanceToPlayAreaEdge(queen.x, queen.y, dx, dy);
    e.sx = queen.x;
    e.sy = queen.y;
    e.ex = queen.x + dx * len;
    e.ey = queen.y + dy * len;
    playSpitSound();
  }
  const beamDist = distToSegment(playerX, playerY, e.sx, e.sy, e.ex, e.ey);
  seeQueenAttackPart(e.tracker, Math.max(0, beamDist - e.width / 2));
  // Hits once, like an ant's beam (same reach and FAST-tier damage, with her bullet size)
  if (!e.hit && beamDist <= e.width / 2 + 25) {
    e.hit = true;
    if (shield > 0) beamShieldFlashFrames = BEAM_HIT_FLASH_FRAMES;
    else beamHealthFlashFrames = BEAM_HIT_FLASH_FRAMES;
    queenHitPlayer(QUEEN_BULLET_SIZE * getBulletSpeedTier(BEAM_HIT_SPEED).damageMultiplier);
  }
  if (!hidden) {
    // Snap open, hold, then narrow and fade over the last third (like the ants' beams)
    const life = e.life - e.fireAt;
    const maxLife = e.frames - e.fireAt;
    const openT = Math.min(1, life / 4);
    const fadeT = constrain((maxLife - life) / (maxLife / 3), 0, 1);
    const w = e.width * openT * (0.4 + 0.6 * fadeT);
    const alpha = 255 * fadeT;
    const flicker = 1 + 0.08 * Math.sin(life * 1.3);
    const colors = QUEEN_BEAM_COLORS;
    push();
    strokeCap(ROUND);
    stroke(colors.glow[0], colors.glow[1], colors.glow[2], alpha * 0.35);
    strokeWeight(w * 1.6 * flicker);
    line(e.sx, e.sy, e.ex, e.ey);
    stroke(colors.glow[0], colors.glow[1], colors.glow[2], alpha * 0.8);
    strokeWeight(w);
    line(e.sx, e.sy, e.ex, e.ey);
    stroke(colors.core[0], colors.core[1], colors.core[2], alpha);
    strokeWeight(w * 0.35);
    line(e.sx, e.sy, e.ex, e.ey);
    pop();
  }
  return e.life >= e.frames;
}

// Order shout: three arcs bursting out of her in a fan toward the ants she's ordering
function drawQueenShout(e) {
  const t = e.life / e.frames;
  const mouth = QUEEN_IMAGE_SIZE * 0.35;
  const ox = queen.x + Math.cos(e.angle) * mouth;
  const oy = queen.y - queen.airHeight + Math.sin(e.angle) * mouth;
  const deg = e.angle * 180 / Math.PI;
  push();
  angleMode(DEGREES);
  noFill();
  for (let k = 0; k < 3; k++) {
    const a = t - k * 0.18;
    if (a <= 0 || a >= 1) continue;
    stroke(230, 170, 255, 230 * (1 - a));
    strokeWeight(3.5 * (1 - a) + 1);
    const r = 14 + a * 70;
    arc(ox, oy, r * 2, r * 2, deg - 35, deg + 35, OPEN);
  }
  pop();
}

// A little "!" popping over each ant she just ordered
function drawQueenAntMark(e) {
  const t = e.life / e.frames;
  const i = e.ant;
  const size = (45 + 15 * antSize[i]);
  const y = antY[i] - antAirHeight[i] - size * 0.55 - 6 * Math.min(1, t * 4);
  const scale = t < 0.15 ? map(t, 0, 0.15, 0.4, 1.2) : (t < 0.3 ? map(t, 0.15, 0.3, 1.2, 1) : 1);
  push();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(16 * scale);
  stroke(40, 0, 60, 255 * (1 - t));
  strokeWeight(3);
  fill(230, 170, 255, 255 * (1 - t));
  text('!', antX[i], y);
  pop();
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq > 0 ? constrain(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1) : 0;
  return dist(px, py, ax + dx * t, ay + dy * t);
}

// Time Explosion: a warning ring fills in until the blast
function updateQueenTimeBomb(e, hidden) {
  if (e.life >= e.at) {
    seeQueenAttackPart(e.tracker, Math.max(0, dist(playerX, playerY, e.x, e.y) - e.radius));
    if (e.owner >= 1) {
      const base = (20 + 40 * 2) * (radiusMultiplier[e.owner] || 1);
      spawnQueenExplosion(e.x, e.y, 3, e.owner, e.radius / base);
    } else {
      spawnSmokeImpact(e.x, e.y, e.radius);
      if (dist(playerX, playerY, e.x, e.y) < e.radius) queenHitPlayer(3);
    }
    return true;
  }
  if (!hidden) {
    const t = e.life / e.at;
    push();
    noFill();
    stroke(255, 60, 40, 80 + 120 * t);
    strokeWeight(2);
    ellipse(e.x, e.y, e.radius * 2);
    noStroke();
    fill(255, 60, 40, 30 + 50 * t);
    ellipse(e.x, e.y, e.radius * 2 * t);
    fill(255, 60, 40, 150 + 100 * Math.sin(e.life * (0.1 + 0.4 * t)));
    ellipse(e.x, e.y, 14);
    pop();
  }
  return false;
}

// --- Drawing ---

function drawQueen() {
  if (!queen) return;
  const faded = tigerBeetleActive && tigerBeetleMoving;
  const alpha = faded ? 70 : 255;
  const crownY = queen.y - queen.airHeight - QUEEN_IMAGE_SIZE * 0.45;

  if (queen.bunker) {
    // Hidden in her bunker: only her crown peeks out
    drawQueenCrown(queen.x, queen.bunker.y - queen.bunker.radius - 6, 0.7, alpha);
    drawQueenLabel(alpha);
    return;
  }

  const shadowScale = QUEEN_IMAGE_SIZE * map(constrain(queen.airHeight, 0, 60), 0, 60, 1, 0.7);
  drawGroundShadow(queen.x, queen.y, shadowScale * 0.6, shadowScale * 0.26, 0, 80 * alpha / 255);

  push();
  angleMode(DEGREES);
  imageMode(CENTER);
  translate(queen.x, queen.y - queen.airHeight);
  // Re-strategizing: a purple pulse
  if (queen.adaptFlash > 0) {
    noStroke();
    fill(190, 90, 255, 6 * queen.adaptFlash);
    ellipse(0, 0, QUEEN_IMAGE_SIZE * (1.4 - queen.adaptFlash / 100));
  }
  if (queen.alarmFrames > 0 && getQueenPace() > 1) {
    noFill();
    stroke(255, getQueenPace() >= 3 ? 60 : 170, 40, 200);
    strokeWeight(3);
    ellipse(0, 0, QUEEN_IMAGE_SIZE * (0.95 + 0.08 * Math.sin(frameCount * 0.5)));
  }
  if (queen.vacuumFrames > 0) {
    noFill();
    stroke(255, 255, 255, 120);
    strokeWeight(2);
    for (let r = 0; r < 3; r++) {
      const phase = ((frameCount * 4 + r * 40) % 120) / 120;
      ellipse(0, 0, QUEEN_IMAGE_SIZE * (2.6 - 1.6 * phase));
    }
  }
  rotate(angleToBeetle(queen.x, queen.y) * 180 / Math.PI);
  tint(220, 160, 255, alpha);
  image(ant, 0, 0, QUEEN_IMAGE_SIZE, QUEEN_IMAGE_SIZE);
  if (queen.hitFlash > 0) {
    noTint();
    noStroke();
    fill(255, 255, 255, 25 * queen.hitFlash);
    ellipse(0, 0, QUEEN_IMAGE_SIZE * 0.8);
  }
  pop();

  drawQueenCrown(queen.x, crownY, 1, alpha);
  drawHitHealthBar(queen.x, queen.y - queen.airHeight + QUEEN_IMAGE_SIZE * 0.4, queen.health, queen.maxHealth, queen.lastHitTime);
  drawQueenLabel(alpha);
}

function drawQueenCrown(x, y, s, alpha) {
  push();
  noStroke();
  fill(255, 200, 40, alpha);
  stroke(120, 80, 0, alpha);
  strokeWeight(1.5);
  beginShape();
  vertex(x - 16 * s, y + 6 * s);
  vertex(x - 16 * s, y - 6 * s);
  vertex(x - 8 * s, y);
  vertex(x, y - 10 * s);
  vertex(x + 8 * s, y);
  vertex(x + 16 * s, y - 6 * s);
  vertex(x + 16 * s, y + 6 * s);
  endShape(CLOSE);
  pop();
}

// Name of the ability she just used, floating over her
function drawQueenLabel(alpha) {
  if (queen.labelFrames <= 0) return;
  push();
  textAlign(CENTER, CENTER);
  textSize(14);
  stroke(0, alpha);
  strokeWeight(3);
  fill(230, 180, 255, alpha * Math.min(1, queen.labelFrames / 20));
  text(queen.label, queen.x, queen.y - queen.airHeight - QUEEN_IMAGE_SIZE * 0.68);
  pop();
}

// Camouflage (everything near her flashes in and out) and Ghost (everything near her is invisible unless the
// beetle is within 150px of it): an area of ground-colored cover over everything, with a hole around the beetle
function drawQueenOverlays() {
  if (!queen || end) return;
  if (queen.camoFrames <= 0 && queen.ghostFrames <= 0) return;
  if (tigerBeetleActive && tigerBeetleMoving) return;
  const ghost = queen.ghostFrames > 0;
  const frames = ghost ? queen.ghostFrames : queen.camoFrames;
  const fade = Math.min(1, frames / 20, (QUEEN_EFFECT_FRAMES - frames) / 20);
  const coverAlpha = ghost ? fade : fade * (0.5 + 0.5 * Math.sin(frameCount * 0.12));
  const radius = QUEEN_AREA_RADIUS;
  const hole = ghost ? 150 : 45;
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(queen.x, queen.y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(queen.x, queen.y, radius, 0, Math.PI * 2);
  ctx.moveTo(playerX + hole, playerY);
  ctx.arc(playerX, playerY, hole, 0, Math.PI * 2);
  const ground = getGroundColor();
  ctx.fillStyle = `rgba(${ground[0]}, ${ground[1]}, ${ground[2]}, ${coverAlpha})`;
  ctx.fill('evenodd');
  ctx.restore();
  push();
  noFill();
  stroke(190, 90, 255, 70 * fade);
  strokeWeight(2);
  ellipse(queen.x, queen.y, radius * 2);
  pop();
}

// Her explosion, played over the frozen screen in the round outro (gameplay coordinates)
function createQueenDeathBurst(x, y) {
  const particles = [];
  const colors = [[200, 120, 255], [150, 60, 220], [0, 220, 0], [255, 200, 40]];
  for (let k = 0; k < 46; k++) {
    particles.push({
      angle: Math.random() * Math.PI * 2,
      speed: 2 + Math.random() * 7,
      size: 4 + Math.random() * 10,
      color: colors[k % colors.length],
      life: 50 + Math.random() * 60
    });
  }
  return { x: x, y: y, particles: particles };
}

function drawQueenDeathBurst(burst, age) {
  push();
  noStroke();
  // Flash
  if (age < 16) {
    const t = age / 16;
    fill(255, 230, 255, 255 * (1 - t));
    ellipse(burst.x, burst.y, 40 + 220 * t);
  }
  // Shockwave rings
  noFill();
  for (const [delay, speed] of [[0, 7], [8, 5]]) {
    const a = age - delay;
    if (a <= 0 || a > 60) continue;
    stroke(220, 150, 255, 220 * (1 - a / 60));
    strokeWeight(4 * (1 - a / 60) + 1);
    ellipse(burst.x, burst.y, a * speed * 2);
  }
  // Acid and chitin flying out and slowing down
  noStroke();
  for (const p of burst.particles) {
    if (age > p.life) continue;
    const d = p.speed * 18 * (1 - Math.pow(0.93, age));
    const alpha = 255 * (1 - age / p.life);
    fill(p.color[0], p.color[1], p.color[2], alpha);
    ellipse(burst.x + Math.cos(p.angle) * d, burst.y + Math.sin(p.angle) * d, p.size * (1 - 0.4 * age / p.life));
  }
  pop();
  // Her crown pops up and tumbles back down
  if (age < 90) {
    const cy = burst.y - QUEEN_IMAGE_SIZE * 0.45 - age * 3.2 + 0.045 * age * age;
    push();
    translate(burst.x + age * 0.6, cy);
    angleMode(DEGREES);
    rotate(age * 9);
    drawQueenCrown(0, 0, 1, 255 * Math.min(1, (90 - age) / 25));
    pop();
  }
}

// Queen health and status at the top of the screen. Progress toward the next queen is never shown, so taking hits on
// purpose to bring one out early isn't something the player can aim for.
function drawQueenHud() {
  push();
  rectMode(CORNER);
  if (queen) {
    const barW = Math.min(420, windowWidth * 0.4);
    const barH = 14;
    const x = windowWidth / 2 - barW / 2;
    const y = 40;
    textAlign(CENTER, BOTTOM);
    textSize(20);
    stroke(0);
    strokeWeight(4);
    fill(230, 180, 255);
    text(queen.title || `QUEEN ${queen.number}`, windowWidth / 2, y - 4);
    noStroke();
    fill(0, 0, 0, 160);
    rect(x - 3, y - 3, barW + 6, barH + 6, 5);
    const segW = barW / queen.maxHealth;
    for (let s = 0; s < queen.maxHealth; s++) {
      const filled = constrain(queen.health - s, 0, 1);
      fill(70, 30, 90);
      rect(x + s * segW + 1, y, segW - 2, barH, 3);
      if (filled > 0) {
        fill(190, 90, 255);
        rect(x + s * segW + 1, y, (segW - 2) * filled, barH, 3);
      }
    }
    if (queen.introFrames > 0) {
      const t = queen.introFrames / QUEEN_INTRO_FRAMES;
      const a = 255 * Math.min(1, t * 3);
      textAlign(CENTER, CENTER);
      textSize(Math.min(windowWidth, windowHeight) * 0.08);
      stroke(0, a);
      strokeWeight(6);
      fill(220, 150, 255, a);
      text(queen.final ? 'THE QUEEN OF QUEENS' : 'THE QUEEN HAS ARRIVED', windowWidth / 2, windowHeight * 0.4);
      textSize(Math.min(windowWidth, windowHeight) * 0.03);
      strokeWeight(4);
      fill(255, a);
      text(queen.final ? 'End this, once and for all' : 'Kill her to end the round', windowWidth / 2, windowHeight * 0.4 + Math.min(windowWidth, windowHeight) * 0.07);
    }
  }
  pop();
}

// ========== QUEEN CURRENCY, PROGRESSION & PERMANENT UPGRADES ==========
// Two separate counts: total queens collected (lifetime, never goes down; unlocks difficulties) and queens
// available to spend on permanent upgrades. Bought upgrades are applied at the start of every single player run.
const QUEENS_REQUIRED_TO_ADVANCE = [5, 10, 20, 30, 40, 60, 80, 100, 120, 150]; // Total queens to move on from difficulty 1-10 (10: the nest)
const UPGRADE_NAMES = ['Walking Speed', 'Dash Speed', 'Dash Cooldown', 'Add Shield', 'Add Bullets', 'Shield Regeneration',
  'Bullet Reload', 'Bullet Speed', 'Free-Angle Aiming', 'Tiger Beetle', 'Oogpister Beetle', 'Horns', 'Potent Acid',
  'Shockwave', 'Shockwave Radius', 'Shockwave Damage', 'Shockwave Cooldown', 'Shockwave Knockback', 'Bullet Deflection',
  'Health Regeneration', 'Runt Hunter', 'Increased Metabolism', 'EXP Boost', 'Combo Surge', 'Dash Harvest',
  'Shockwave Harvest', 'Bullet Harvest', 'Spray Acid', 'Spray Length', 'Spray Width', 'Piercing Acid', 'Piercing Depth',
  'Impact Bomb', 'Timed Bomb', 'Proximity Bomb', 'Blast Radius', 'Lady Beetle', 'Aphid Health', 'Aphid Spawn Rate',
  'Speedy Aphids', 'Armored Aphids', 'Wise Aphids', 'Healthy Aphids', 'Lucky Aphids', 'Mound Ring', 'Bunker', 'Vortex', 'Flight and Slam', 'Mound Health', 'Flight Duration', 'Starting Health', 'Dash Deflection', 'Shell Shrapnel', 'Shrapnel Count'];
const UPGRADE_PREREQUISITE_TEXT = {
  5: 'Add Shield', 6: 'Add Bullets', 7: 'Add Bullets', 8: 'Add Bullets, Bullet Reload, Bullet Speed',
  9: 'Dash Cooldown maxed', 10: 'Bullet Reload 3+', 12: 'Add Bullets', 14: 'Shockwave', 15: 'Shockwave',
  16: 'Shockwave', 18: 'Shockwave', 25: 'Shockwave', 26: 'Add Bullets', 27: 'Add Bullets', 28: 'Spray Acid',
  29: 'Spray Acid', 30: 'Add Bullets', 31: 'Piercing Acid', 32: 'Add Bullets', 33: 'Impact Bomb',
  34: 'Timed Bomb', 35: 'Impact Bomb', 37: 'Lady Beetle', 38: 'Lady Beetle', 39: 'Lady Beetle', 40: 'Lady Beetle',
  41: 'Lady Beetle', 42: 'Lady Beetle', 43: 'Lady Beetle', 44: 'Shockwave', 45: 'Shockwave', 46: 'Shockwave',
  47: 'Shockwave', 48: 'Mound Ring or Bunker', 49: 'Flight and Slam', 52: 'Add Shield', 53: 'Shell Shrapnel'
};

function getTotalQueensCollected() {
  return getItem('queensTotalCollected') || 0;
}

function getQueensAvailable() {
  return getItem('queensAvailable') || 0;
}

function getQueensCollectedOnDifficulty(value) {
  return getItem('queensCollected_difficulty' + value) || 0;
}

function awardQueen() {
  storeItem('queensTotalCollected', getTotalQueensCollected() + 1);
  storeItem('queensAvailable', getQueensAvailable() + 1);
  storeItem('queensCollected_difficulty' + difficulty, getQueensCollectedOnDifficulty(difficulty) + 1);
}

function getQueensRequiredToAdvance(fromDifficulty) {
  return QUEENS_REQUIRED_TO_ADVANCE[fromDifficulty - 1];
}

// Of those, how many have to come from the difficulty being moved on from: 5 easy, 10 medium, 20 hard and insane
function getQueensRequiredOnDifficulty(fromDifficulty) {
  return { easy: 5, medium: 10, hard: 20, insane: 20 }[getDifficultyTierInfo(fromDifficulty).name.toLowerCase()];
}

function getPermanentUpgradeLevels() {
  const saved = getItem('permanentUpgradeLevels');
  const levels = [];
  for (let id = 0; id < UPGRADE_COUNT; id++) levels.push(Array.isArray(saved) ? (saved[id] || 0) : 0);
  return levels;
}

// Shop tiers line up with getUpgradeRarity's weights
function getUpgradeRarityTier(id) {
  if (id === 20) return 'Ultra Rare';
  if (id >= 24 && id <= 26) return 'Very Rare';
  if (id === 19 || (id >= 21 && id <= 23) || (id >= 27 && id <= 49) || (id >= 51 && id <= 53)) return 'Medium';
  if (!isCoreUpgrade(id)) return 'Uncommon';
  return 'Common';
}

function getPermanentUpgradeCost(id, level) {
  const tier = getUpgradeRarityTier(id);
  let cost;
  if (tier === 'Ultra Rare') cost = 40;
  else if (tier === 'Very Rare') cost = 30;
  else if (tier === 'Medium') cost = UPGRADE_MAX_LEVELS[id] === 1 ? 20 : 5 + 10 * (level - 1);
  else if (tier === 'Uncommon') cost = level === 1 ? 2 : (level === 2 ? 6 : 10 + 5 * (level - 3));
  else cost = level === 1 ? 1 : 5 * (level - 1);
  if (hasPrerequisiteSurcharge(id)) cost += 5;
  if (UPGRADE_NAMES[id].includes('Beetle')) cost += 5; // Tiger Beetle, Oogpister Beetle
  return cost;
}

// Upgrades with prerequisites cost 5 more, except the core base stats, Potent Acid and the shockwave upgrades
function hasPrerequisiteSurcharge(id) {
  if (!UPGRADE_PREREQUISITE_TEXT[id]) return false;
  if (isCoreUpgrade(id) || id === 12) return false;
  if (UPGRADE_NAMES[id].includes('Shockwave') || id === 18) return false; // Bullet Deflection is a shockwave upgrade
  return true;
}

// 'max', 'locked', 'poor' or 'ok'
function getPermanentUpgradeStatus(id, levels) {
  if (levels[id] >= UPGRADE_MAX_LEVELS[id]) return 'max';
  if (!upgradePrereqsMet(id, levels)) return 'locked';
  if (getQueensAvailable() < getPermanentUpgradeCost(id, levels[id] + 1)) return 'poor';
  return 'ok';
}

function buyPermanentUpgrade(id) {
  const levels = getPermanentUpgradeLevels();
  if (getPermanentUpgradeStatus(id, levels) !== 'ok') return false;
  storeItem('queensAvailable', getQueensAvailable() - getPermanentUpgradeCost(id, levels[id] + 1));
  levels[id]++;
  storeItem('permanentUpgradeLevels', levels);
  return true;
}

// Start the run with every bought upgrade (never lowers a level already picked up)
function applyPermanentUpgrades() {
  const permanent = getPermanentUpgradeLevels();
  const current = getCurrentUpgradeLevels();
  for (let id = 0; id < UPGRADE_COUNT; id++) {
    if (permanent[id] > current[id]) setUpgradeLevel(id, permanent[id]);
  }
  health = getStartingHealth();
  shield = shieldQuantity > 0 ? shieldQuantity : 0;
  shot = bulletQuantity > 0 ? bulletQuantity : 0;
}

// --- Queen Upgrades shop (main menu) ---

let queenShopMenu = false;
let queenShopSelection = 0;
let queenShopMessage = '';
let queenShopMessageTimer = 0;
const QUEEN_SHOP_ROWS = 12;

function getQueenShopItems() {
  const items = [];
  for (let id = 0; id < UPGRADE_COUNT; id++) {
    if (id !== 17) items.push(id); // Shockwave Knockback was removed
  }
  return items;
}

function getQueenShopCellRect(index) {
  const col = Math.floor(index / QUEEN_SHOP_ROWS);
  const row = index % QUEEN_SHOP_ROWS;
  const colWidth = (getMenuWidth() - 40) / Math.ceil(getQueenShopItems().length / QUEEN_SHOP_ROWS);
  return { x: 20 + col * colWidth, y: 112 + row * 38, w: colWidth - 12, h: 32 };
}

function openQueenShop() {
  queenShopMenu = true;
  startMenu = false;
  queenShopSelection = 0;
  queenShopMessage = '';
  menuNavigationCooldown = 20;
}

function tryBuyQueenShopItem(id) {
  const levels = getPermanentUpgradeLevels();
  const status = getPermanentUpgradeStatus(id, levels);
  if (status === 'ok') {
    buyPermanentUpgrade(id);
    queenShopMessage = `${UPGRADE_NAMES[id]} is now level ${levels[id] + 1} at the start of every run`;
  } else if (status === 'max') {
    queenShopMessage = `${UPGRADE_NAMES[id]} is already maxed`;
  } else if (status === 'locked') {
    queenShopMessage = `Requires ${UPGRADE_PREREQUISITE_TEXT[id]}`;
  } else {
    queenShopMessage = 'Not enough queens';
  }
  queenShopMessageTimer = 150;
}

// Drawn inside menu scaling from drawStartScreen
function drawQueenShop() {
  const items = getQueenShopItems();
  const levels = getPermanentUpgradeLevels();
  fill(20);
  noStroke();
  rect(0, 0, getMenuWidth(), getMenuHeight());

  // Navigation: up/down within a column, left/right across columns
  if (menuNavigationCooldown === 0) {
    let next = queenShopSelection;
    if (isUpPressed()) next--;
    else if (isDownPressed()) next++;
    else if (isLeftPressed()) next -= QUEEN_SHOP_ROWS;
    else if (isRightPressed()) next += QUEEN_SHOP_ROWS;
    if (next !== queenShopSelection) {
      queenShopSelection = constrain(next, 0, items.length - 1);
      menuNavigationCooldown = 8;
    }
  }
  if (movedX !== 0 || movedY !== 0) {
    for (let k = 0; k < items.length; k++) {
      if (pointInRect(getMenuMouseX(), getMenuMouseY(), getQueenShopCellRect(k))) queenShopSelection = k;
    }
  }

  push();
  textAlign(CENTER, CENTER);
  fill(230, 180, 255);
  textSize(42);
  text('Queen Upgrades', getMenuWidth() / 2, 44);
  textSize(18);
  fill(255, 210, 120);
  text(`Queens to spend: ${getQueensAvailable()}`, getMenuWidth() / 2 - 160, 84);
  fill(200);
  text(`Total collected: ${getTotalQueensCollected()}`, getMenuWidth() / 2 + 160, 84);

  for (let k = 0; k < items.length; k++) {
    const id = items[k];
    const r = getQueenShopCellRect(k);
    const status = getPermanentUpgradeStatus(id, levels);
    const selected = k === queenShopSelection;
    const rarity = getUpgradeRarity(id);
    rectMode(CORNER);
    if (selected) {
      fill(255);
      stroke(230, 180, 255);
      strokeWeight(3);
    } else {
      if (status === 'max') fill(30, 60, 30);
      else if (status === 'locked') fill(32);
      else fill(50);
      stroke(80);
      strokeWeight(1);
    }
    rect(r.x, r.y, r.w, r.h, 8);
    if (rarity.color) {
      noStroke();
      fill(rarity.color[0], rarity.color[1], rarity.color[2]);
      rect(r.x + 4, r.y + 6, 4, r.h - 12, 2);
    }
    noStroke();
    const textColor = selected ? 15 : (status === 'locked' ? 120 : 235);
    fill(textColor);
    textSize(16);
    textAlign(LEFT, CENTER);
    text(UPGRADE_NAMES[id], r.x + 14, r.y + r.h / 2);
    textAlign(RIGHT, CENTER);
    textSize(14);
    let right;
    if (status === 'max') right = `Lv ${levels[id]}/${UPGRADE_MAX_LEVELS[id]}  MAX`;
    else right = `Lv ${levels[id]}/${UPGRADE_MAX_LEVELS[id]}  ♛${getPermanentUpgradeCost(id, levels[id] + 1)}`;
    if (!selected) fill(status === 'poor' ? color(255, 120, 120) : (status === 'max' ? color(140, 230, 140) : color(textColor)));
    text(right, r.x + r.w - 12, r.y + r.h / 2);
  }

  // Details for the selected upgrade
  const selId = items[queenShopSelection];
  const selStatus = getPermanentUpgradeStatus(selId, levels);
  let detail = `${UPGRADE_NAMES[selId]}  ·  ${getUpgradeRarityTier(selId)}`;
  if (UPGRADE_PREREQUISITE_TEXT[selId]) detail += `  ·  Requires ${UPGRADE_PREREQUISITE_TEXT[selId]}${hasPrerequisiteSurcharge(selId) ? ' (+5)' : ''}`;
  if (selStatus === 'locked') detail += '  ·  LOCKED';
  textAlign(CENTER, CENTER);
  textSize(17);
  fill(220);
  text(detail, getMenuWidth() / 2, 582);
  if (queenShopMessageTimer > 0) {
    queenShopMessageTimer--;
    fill(255, 210, 120, Math.min(255, queenShopMessageTimer * 6));
    textSize(16);
    text(queenShopMessage, getMenuWidth() / 2, 604);
  }
  const fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
  fill(200, fadeAlpha);
  textSize(16);
  text('Arrows or Left Stick  Navigate  |  Enter or A  Buy  |  Esc or B  Back', getMenuWidth() / 2, 630);
  pop();

  // Buy with Enter / A or a click (isConfirmPressed only fires once per press, so read it a single time)
  const confirmPressed = isConfirmPressed() && menuNavigationCooldown === 0;
  if (confirmPressed) {
    tryBuyQueenShopItem(selId);
    menuNavigationCooldown = 15;
  } else if (mouseIsPressed && mouseButton === LEFT && menuNavigationCooldown === 0) {
    for (let k = 0; k < items.length; k++) {
      if (pointInRect(getMenuMouseX(), getMenuMouseY(), getQueenShopCellRect(k))) {
        queenShopSelection = k;
        tryBuyQueenShopItem(items[k]);
        menuNavigationCooldown = 20;
      }
    }
  }
  if (isBackPressed() && menuNavigationCooldown === 0) {
    queenShopMenu = false;
    startMenu = true;
    menuNavigationCooldown = 20;
  }
}

// ========== GENE TOKEN SYSTEM ==========

function grantTokensForRound(roundNumber) {
  // Grant tokens every 5 rounds using the current difficulty.
  if (roundNumber > 0 && roundNumber % 5 === 0) {
    const tokensToGrant = getTokensPerFiveRounds();
    
    for (let i = 1; i < enemyCount + 1; i++) {
      if (geneTokenLastRoundGained[i] < roundNumber) {
        geneTokens[i] += tokensToGrant;
        geneTokenLastRoundGained[i] = roundNumber;
        debugLog(`Ant ${i} gained ${tokensToGrant} gene tokens (now has ${geneTokens[i]})`);
        
        // Immediately invest all tokens
        let investmentAttempts = 0;
        const maxAttempts = 10; // Prevent infinite loops
        while (geneTokens[i] > 0 && investmentAttempts < maxAttempts) {
          let tokensBefore = geneTokens[i];
          evaluateAndAllocateTokens(i, roundNumber, false); // Not initial setup
          if (geneTokens[i] === tokensBefore) {
            // No investment made, break to avoid infinite loop
            break;
          }
          investmentAttempts++;
        }
      }
    }
  }
}

// Module-level stat cap tier definitions
// Format: { caps: [tier1, tier2, tier3...], inverse: boolean }
// inverse: true means stat improves as it DECREASES (approach from top to bottom)
const moduleStatCapTiers = {
  // Inverse stats (lower is better, unlock downward from starting max)
  bulletSpeed: { caps: [250, 200, 150, 120, 90], inverse: true, start: 300 },
  bulletCooldown: { caps: [150, 120, 100, 90, 79], inverse: true, start: 200 },
  
  // Normal stats (higher is better, unlock upward from starting min)
  antSpeed: { caps: [2, 2.5, 3, 3.5], inverse: false },
  
  // Special category mutation stats (can be capped)
  specialExplosion: { caps: [1.0, 2.0], inverse: false },  // <1 = timed, >=1 = proximity
  specialCamo: { caps: [1.0, 2.0], inverse: false },  // <1 = camouflage, >=1 = ghost
  specialRecoil: { caps: [1.0, 2.0], inverse: false },  // <1 = recoil, >=1 = launch
  bulletCamoFlashRate: { caps: [1.5, 1.0, 0.75, 0.5, 0.25], inverse: true, start: 3 },  // Flashes/sec (lower = better)
bulletKnockbackMultiplier: { caps: [2, 3, 4, 5], inverse: false },
  
  // Fire category supporting stats
  bulletBurstCount: { caps: [3, 4, 5, 5.5], inverse: false },
  bulletBurstSpread: { caps: [2.0, 2.5, 3.0, 3.14], inverse: false },
  bulletCooldownMultiplier: { caps: [3, 4, 5, 5.5], inverse: false },
  
  // Path category mutation stats (can be capped)
  bulletCurveStrength: { caps: [0.05, 0.075, 0.1], inverse: false },
  pathCurve: { caps: [1.0, 2.0], inverse: false },  // <1 = curved, >=1 = homing
  deathLandmine: { caps: [1.0, 2.0], inverse: false },  // <1 = smear, >=1 = landmine
  deathRefire: { caps: [1.0, 2.0], inverse: false },  // <1 = refire, >=1 = turret
  fireAlternating: { caps: [1.0, 2.0], inverse: false },  // <1 = alternating, >=1 = hit reload
  fireBurst: { caps: [1.0, 2.0], inverse: false },  // <1 = burst, >=1 = delayed burst
  fireRapid: { caps: [1.0, 2.0], inverse: false },  // <1 = rapid, >=1 = stream
  pathHighArc: { caps: [1.0, 2.0], inverse: false },  // <1 = high arc, >=1 = split arc
  specialKnockback: { caps: [1.0, 2.0], inverse: false },  // <1 = knockback, >=1 = vacuum
  pathAccelerate: { caps: [1.0, 2.0], inverse: false },  // <1 = accelerate, >=1 = beam
  fireAlarm: { caps: [1.0, 2.0], inverse: false },  // <1 = alarm, >=1 = avenge
  pathBlink: { caps: [1.0, 2.0], inverse: false },  // <1 = blink, >=1 = portal
  deathTerritory: { caps: [1.0, 2.0], inverse: false },  // <1 = territory, >=1 = nest
  deathMound: { caps: [1.0, 2.0], inverse: false },  // <1 = mound, >=1 = bunker
  bulletAccelerateDelay: { caps: [150, 100, 60, 30], inverse: true, start: 200 },  // Frames before acceleration (inverse: lower=better)
  
  // Explosion stats
  bulletSize: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
  radiusMultiplier: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
  residueMultiplier: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
  
  // Ant size
  antSize: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false }
};

// Stats whose caps mark level 1 / level 2 ability thresholds rather than plain range limits
const THRESHOLD_GATED_STATS = ['specialExplosion', 'pathCurve', 'deathLandmine', 'deathRefire', 'deathTerritory', 'deathMound', 'fireAlternating', 'fireBurst', 'fireRapid', 'fireAlarm', 'pathHighArc', 'pathAccelerate', 'pathBlink', 'specialKnockback', 'specialCamo', 'specialRecoil'];

// Dev tools custom ants: give a custom ant the cap tokens its threshold-gated stats need to stay at the
// tier the user set (e.g. specialKnockback 1.5 needs a tier 0 cap token, or mutation clamps it below 1).
// These are granted free, like the dev tools trait token.
function ensureCustomAntTierCaps(customAnt) {
  if (!customAnt.geneTokenInvestments) customAnt.geneTokenInvestments = [];
  for (let statName of THRESHOLD_GATED_STATS) {
    const caps = moduleStatCapTiers[statName].caps;
    const value = customAnt[statName] || 0;
    let neededTier = -1;
    for (let t = 0; t < caps.length; t++) {
      if (value >= caps[t]) neededTier = t;
    }
    if (neededTier < 0) continue;
    const hasTier = customAnt.geneTokenInvestments.some(
      inv => inv.target === statName && inv.type === 'cap' && (inv.tier || 0) >= neededTier
    );
    if (hasTier) continue;
    customAnt.geneTokenInvestments.push({
      target: statName,
      type: 'cap',
      tier: neededTier,
      cap: caps[neededTier],
      inverse: false,
      lockedUntilRound: 0,
      percentage: 1
    });
  }
}

// Get max mutatable value for a stat based on an ant's unlocked cap tiers.
// For threshold-gated stats (specialExplosion, pathCurve, deathLandmine, deathRefire, fireAlternating, specialCamo, specialRecoil): caps mark functional tier thresholds.
//   - No tokens: must stay strictly below caps[0]
//   - Tier 0 token: can reach caps[0] but must stay strictly below caps[1]
// For scaling stats (knockback, burst, etc.): caps[0] is natural uncapped max, tokens extend range.
//   - No tokens: can reach caps[0]
//   - Tier 0 token: can reach caps[1], etc.
// investmentsOverride: optional direct investment array (use when antId's investments aren't populated yet)
function getMaxAllowedValue(statName, antId, investmentsOverride) {
  const tierInfo = moduleStatCapTiers[statName];
  if (!tierInfo) {
    return Infinity; // No cap system for this stat
  }
  
  // Find highest unlocked tier for this stat
  let unlockedTier = -1;
  const investments = investmentsOverride !== undefined ? investmentsOverride : (geneTokenInvestments[antId] || []);
  for (let inv of investments) {
    if (inv.target === statName && inv.type === 'cap') {
      unlockedTier = Math.max(unlockedTier, inv.tier || 0);
    }
  }
  
  // Stats that use threshold gates (caps mark functional tier thresholds, not just range limits)
  const thresholdGatedStats = THRESHOLD_GATED_STATS;
  
  if (thresholdGatedStats.includes(statName)) {
    if (unlockedTier < 0) {
      // No tokens: must stay below first threshold
      return tierInfo.caps[0] - 0.1;
    }
    // With tier N unlocked: can hit caps[N] but must stay below caps[N+1]
    const nextIdx = unlockedTier + 1;
    if (nextIdx >= tierInfo.caps.length) {
      return tierInfo.caps[tierInfo.caps.length - 1]; // All tiers fully unlocked
    }
    return tierInfo.caps[nextIdx] - 0.1;
  }
  
  // Scaling range stats: caps[0] is the natural uncapped max, tokens extend it
  if (unlockedTier < 0) {
    return tierInfo.caps[0]; // Natural max, no token needed
  }
  // Each token spent moves max up to the next cap index
  const nextIdx = unlockedTier + 1;
  if (nextIdx >= tierInfo.caps.length) {
    return tierInfo.caps[tierInfo.caps.length - 1]; // All caps unlocked
  }
  return tierInfo.caps[nextIdx];
}

// Get minimum mutatable value for an inverse stat based on unlocked cap tiers.
// Inverse stats improve as they decrease. caps[0] is the natural floor (no tokens needed).
// Each invested cap tier lowers the floor further.
//   - No tokens: floor = caps[0]   (e.g. bulletSpeed can't go below 250)
//   - Tier 0 invested: floor = caps[1]  (can now go below 250 but not below 200)
//   - Tier 1 invested: floor = caps[2], etc.
// investmentsOverride: optional direct investment array (use when antId's investments aren't populated yet)
function getMinAllowedValue(statName, antId, investmentsOverride) {
  const tierInfo = moduleStatCapTiers[statName];
  if (!tierInfo || !tierInfo.inverse) {
    return -Infinity; // Only applies to inverse stats
  }

  let unlockedTier = -1;
  const investments = investmentsOverride !== undefined ? investmentsOverride : (geneTokenInvestments[antId] || []);
  for (let inv of investments) {
    if (inv.target === statName && inv.type === 'cap') {
      unlockedTier = Math.max(unlockedTier, inv.tier || 0);
    }
  }

  // No tokens: can't improve past the first cap threshold
  if (unlockedTier < 0) {
    return tierInfo.caps[0]; // e.g. 250 for bulletSpeed
  }
  // Each invested tier lowers the floor to the next cap
  const nextIdx = unlockedTier + 1;
  if (nextIdx >= tierInfo.caps.length) {
    return tierInfo.caps[tierInfo.caps.length - 1]; // All caps unlocked, absolute minimum
  }
  return tierInfo.caps[nextIdx];
}

function getRequiredCapTierForValue(statName, value) {
  const tierInfo = moduleStatCapTiers[statName];
  if (!tierInfo) return -1;

  const thresholdGatedStats = THRESHOLD_GATED_STATS;
  let requiredTier = -1;

  if (thresholdGatedStats.includes(statName)) {
    // Threshold-gated: crossing each threshold requires the matching tier token.
    for (let t = 0; t < tierInfo.caps.length; t++) {
      if (value >= tierInfo.caps[t]) {
        requiredTier = t;
      }
    }
    return requiredTier;
  }

  if (tierInfo.inverse) {
    // Inverse stats improve when lowered below each cap threshold.
    for (let t = 0; t < tierInfo.caps.length; t++) {
      if (value < tierInfo.caps[t]) {
        requiredTier = t;
      }
    }
    return requiredTier;
  }

  // Normal scaling stats improve when raised above each cap threshold.
  for (let t = 0; t < tierInfo.caps.length; t++) {
    if (value > tierInfo.caps[t]) {
      requiredTier = t;
    }
  }
  return requiredTier;
}

function syncCustomAntCapInvestmentsForStat(customAnt, statName) {
  if (!customAnt || !moduleStatCapTiers[statName]) return;

  if (!customAnt.geneTokenInvestments) customAnt.geneTokenInvestments = [];
  if (customAnt.geneTokens === undefined) customAnt.geneTokens = 0;

  const statValue = customAnt[statName];
  if (statValue === undefined) return;

  const requiredTier = getRequiredCapTierForValue(statName, statValue);
  if (requiredTier < 0) return;

  let highestUnlockedTier = -1;
  for (let inv of customAnt.geneTokenInvestments) {
    if (inv.type === 'cap' && inv.target === statName) {
      highestUnlockedTier = Math.max(highestUnlockedTier, inv.tier || 0);
    }
  }

  const tierInfo = moduleStatCapTiers[statName];
  for (let tier = highestUnlockedTier + 1; tier <= requiredTier && tier < tierInfo.caps.length; tier++) {
    customAnt.geneTokenInvestments.push({
      target: statName,
      type: 'cap',
      tier: tier,
      cap: tierInfo.caps[tier],
      inverse: !!tierInfo.inverse,
      lockedUntilRound: 0,
      percentage: 1
    });

    // Spend available tokens first; if none are available, keep at 0 and still
    // reflect the newly required cap investment for editor consistency.
    if (customAnt.geneTokens > 0) {
      customAnt.geneTokens--;
    }
  }

  customAnt.geneTokens = Math.max(0, Math.floor(customAnt.geneTokens));
}

function getTraitCategoryFromStatKey(statKey) {
  if (!statKey) return null;
  if (['specialExplosion', 'specialKnockback', 'specialCamo', 'specialRecoil', 'specialPotential', 'bulletKnockbackMultiplier', 'bulletCamoFlashRate'].includes(statKey)) return 'special';
  if (['fireBurst', 'fireRapid', 'fireAlternating', 'fireAlarm', 'firePotential', 'bulletBurstCount', 'bulletBurstSpread', 'bulletBurstDelay', 'bulletCooldownMultiplier', 'alarmInnerRadius'].includes(statKey)) return 'fire';
  if (['deathLandmine', 'deathRefire', 'deathTerritory', 'deathMound', 'deathPotential', 'bunkerRange'].includes(statKey)) return 'death';
  if (['pathHighArc', 'pathCurve', 'pathAccelerate', 'pathBlink', 'pathPotential', 'bulletArcDuration', 'bulletCurveStrength', 'blinkDelay'].includes(statKey)) return 'path';
  return null;
}

function getDominantTraitKeyForCategory(customAnt, category) {
  const traitKeysByCategory = {
    special: ['specialExplosion', 'specialKnockback', 'specialCamo', 'specialRecoil'],
    fire: ['fireBurst', 'fireRapid', 'fireAlternating', 'fireAlarm'],
    death: ['deathLandmine', 'deathRefire', 'deathTerritory', 'deathMound'],
    path: ['pathHighArc', 'pathCurve', 'pathAccelerate', 'pathBlink']
  };

  const traitKeys = traitKeysByCategory[category] || [];
  if (traitKeys.length === 0) return null;

  let bestKey = traitKeys[0];
  let bestValue = customAnt[bestKey] || 0;
  for (let k = 1; k < traitKeys.length; k++) {
    const key = traitKeys[k];
    const value = customAnt[key] || 0;
    if (value > bestValue) {
      bestValue = value;
      bestKey = key;
    }
  }
  return bestKey;
}

function investCustomAntTraitToken(customAnt, category) {
  if (!customAnt || !category) return false;
  if (!customAnt.geneTokenInvestments) customAnt.geneTokenInvestments = [];
  if (customAnt.geneTokens === undefined) customAnt.geneTokens = 0;

  const hasTraitInvestment = customAnt.geneTokenInvestments.some(
    inv => inv.type === 'trait' && inv.category === category
  );
  if (hasTraitInvestment) return false;

  const targetTrait = getDominantTraitKeyForCategory(customAnt, category);
  if (!targetTrait) return false;

  const potentialKey = category + 'Potential';
  if (customAnt[potentialKey] === undefined) customAnt[potentialKey] = 0;
  customAnt[potentialKey] = Math.max(customAnt[potentialKey], 0.6);

  if (customAnt[targetTrait] === undefined) customAnt[targetTrait] = 0;
  customAnt[targetTrait] = Math.max(customAnt[targetTrait], 0.6);

  if (customAnt.geneTokens > 0) {
    customAnt.geneTokens--;
  }
  customAnt.geneTokens = Math.max(0, Math.floor(customAnt.geneTokens));
  customAnt.geneTokenInvestments.push({
    target: targetTrait,
    type: 'trait',
    category: category,
    lockedUntilRound: 0,
    percentage: 1
  });

  return true;
}

function evaluateAndAllocateTokens(antIndex, currentRound, isInitialSetup = false) {
  // Only allocate if there are free tokens
  if (geneTokens[antIndex] <= 0) return;
  
  let bestCandidate = null;
  let bestPercentage = 0;
  
  // Define stat cap tiers (multiple caps that unlock progressively)
  // Format: { caps: [tier1, tier2, tier3...], inverse: boolean }
  // inverse: true means stat improves as it DECREASES (approach from top to bottom)
  const statCapTiers = {
    // Inverse stats (lower is better, unlock downward from starting max)
    bulletSpeed: { caps: [250, 200, 150, 120, 90], inverse: true, start: 300 },
    bulletCooldown: { caps: [150, 120, 100, 90, 79], inverse: true, start: 200 },
    
    // Normal stats (higher is better, unlock upward from starting min)
    antSpeed: { caps: [2, 2.5, 3, 3.5], inverse: false },
    
    // Special category mutation stats (can be capped)
    specialExplosion: { caps: [1.0, 2.0], inverse: false },  // <1 = timed, >=1 = proximity
    specialCamo: { caps: [1.0, 2.0], inverse: false },  // <1 = camouflage, >=1 = ghost
  specialRecoil: { caps: [1.0, 2.0], inverse: false },  // <1 = recoil, >=1 = launch
    bulletCamoFlashRate: { caps: [1.5, 1.0, 0.75, 0.5, 0.25], inverse: true, start: 3 },  // Flashes/sec (lower = better)
bulletKnockbackMultiplier: { caps: [2, 3, 4, 5], inverse: false },
    
    // Fire category supporting stats
    bulletBurstCount: { caps: [3, 4, 5, 5.5], inverse: false },
    bulletBurstSpread: { caps: [2.0, 2.5, 3.0, 3.14], inverse: false },
    bulletCooldownMultiplier: { caps: [3, 4, 5, 5.5], inverse: false },
    
    // Path category mutation stats (can be capped)
    bulletCurveStrength: { caps: [0.05, 0.075, 0.1], inverse: false },
    pathCurve: { caps: [1.0, 2.0], inverse: false },  // <1 = curved, >=1 = homing

    // Death category mutation stats (can be capped)
    deathLandmine: { caps: [1.0, 2.0], inverse: false },  // <1 = smear, >=1 = landmine
    deathRefire: { caps: [1.0, 2.0], inverse: false },  // <1 = refire, >=1 = turret

    // Fire category mutation stats (can be capped)
    fireAlternating: { caps: [1.0, 2.0], inverse: false },  // <1 = alternating, >=1 = hit reload
    fireBurst: { caps: [1.0, 2.0], inverse: false },  // <1 = burst, >=1 = delayed burst
    fireRapid: { caps: [1.0, 2.0], inverse: false },  // <1 = rapid, >=1 = stream
    pathHighArc: { caps: [1.0, 2.0], inverse: false },  // <1 = high arc, >=1 = split arc
    pathAccelerate: { caps: [1.0, 2.0], inverse: false },  // <1 = accelerate, >=1 = beam
    specialKnockback: { caps: [1.0, 2.0], inverse: false },  // <1 = knockback, >=1 = vacuum
    fireAlarm: { caps: [1.0, 2.0], inverse: false },  // <1 = alarm, >=1 = avenge
    pathBlink: { caps: [1.0, 2.0], inverse: false },  // <1 = blink, >=1 = portal
    deathTerritory: { caps: [1.0, 2.0], inverse: false },  // <1 = territory, >=1 = nest
    deathMound: { caps: [1.0, 2.0], inverse: false },  // <1 = mound, >=1 = bunker
    
    // Explosion stats
    bulletSize: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
    radiusMultiplier: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
    residueMultiplier: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
    
    // Ant size
    antSize: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false }
  };
  
  // Helper function to check if a stat is currently expressed (useful/active)
  function isStatExpressed(statName) {
    // Get current trait types
    const specialType = getSpecialType(antIndex);
    const fireType = getFireType(antIndex);
    const pathType = getPathType(antIndex);
    const deathType = getDeathType(antIndex);
    
    // Always expressed stats
    if (['bulletSpeed', 'bulletCooldown', 'antSpeed', 'bulletSize'].includes(statName)) {
      return true;
    }
    
    // Special category stats
    if (statName === 'specialExplosion' && specialType === 1) return true; // Explosion (mutation stat)
    if (statName === 'bulletKnockbackMultiplier' && specialType === -1) return true; // Knockback
    if (statName === 'specialKnockback' && specialType === -1) return true; // Knockback or Vacuum (mutation stat)
    if (statName === 'specialCamo' && (specialType === 2 || specialType === -2)) return true; // Camouflage or Ghost (mutation stat)
    if (statName === 'specialRecoil' && (specialType === 3 || specialType === -3)) return true; // Recoil or Launch (mutation stat)
    if (statName === 'bulletCamoFlashRate' && specialType === 2) return true; // Camouflage
    if (statName === 'explosionProximity' && specialType === 1) return true; // Explosion
    if (statName === 'radiusMultiplier' && (specialType === 1 || pathType === 1 || deathType === -1 || isBeamAccelerate(antIndex) || fireType === 4 || deathType === 4 || deathType === 5)) return true; // Explosion, High Arc, Smear, Beam, Stream (width / range), or Territory / Nest (area size)
    if (statName === 'residueMultiplier' && (specialType === 1 || pathType === 1 || deathType === 1 || deathType === -1 || isBeamAccelerate(antIndex) || fireType === 4 || (deathType >= 4 && deathType <= 7))) return true; // Explosion, High Arc, Landmine, Smear, Beam, Stream, Territory / Nest, or Mound / Bunker (duration)
    if (statName === 'bulletExplodeAfter' && specialType === 1) return true; // Explosion
    
    // Fire category stats
    if (statName === 'bulletBurstCount' && (fireType === 1 || fireType === 3)) return true; // Burst or Delayed Burst
    if (statName === 'bulletBurstSpread' && (fireType === 1 || fireType === 3)) return true; // Burst or Delayed Burst
    if (statName === 'bulletBurstSpread' && fireType === 4 && pathType === 2 && !isBeamAccelerate(antIndex)) return true; // Accelerating stream particle spread
    if (statName === 'fireBurst' && (fireType === 1 || fireType === 3)) return true; // Burst or Delayed Burst (mutation stat)
    if (statName === 'bulletCooldownMultiplier' && fireType === -1) return true; // Alternating
    if (statName === 'fireAlternating' && (fireType === -1 || fireType === -2)) return true; // Alternating or Hit Reload (mutation stat)
    if (statName === 'fireRapid' && (fireType === 2 || fireType === 4)) return true; // Rapid or Stream (mutation stat)
    if (statName === 'fireAlarm' && (fireType === 5 || fireType === 6)) return true; // Alarm or Avenge (mutation stat)
    
    // Path category stats
    if (statName === 'bulletArcDuration' && pathType === 1) return true; // High Arc
    if (statName === 'pathHighArc' && pathType === 1) return true; // High Arc or Split Arc (mutation stat)
    if (statName === 'bulletCurveStrength' && (pathType === -1 || pathType === -2)) return true; // Clockwise or Homing
    if (statName === 'pathCurve' && (pathType === -1 || pathType === -2)) return true; // Curve (mutation stat)
    if (statName === 'pathAccelerate' && pathType === 2) return true; // Accelerate or Beam (mutation stat)
    if (statName === 'pathBlink' && pathType === 3) return true; // Blink or Portal (mutation stat)

    // Death category stats
    if (statName === 'deathLandmine' && (deathType === -1 || deathType === 1)) return true; // Smear or Landmine (mutation stat)
    if (statName === 'deathRefire' && (deathType === 2 || deathType === 3)) return true; // Refire or Turret (mutation stat)
    if (statName === 'deathTerritory' && (deathType === 4 || deathType === 5)) return true; // Territory or Nest (mutation stat)
    if (statName === 'deathMound' && (deathType === 6 || deathType === 7)) return true; // Mound or Bunker (mutation stat)
    
    // Ant size unlock varies by difficulty (matches size mutation start rounds)
    if (statName === 'antSize') {
      const sizeUnlockRound = { easy: 20, medium: 15, hard: 10, insane: 5 }[getDifficultyTier()];
      if (currentRound >= sizeUnlockRound) return true;
    }
    
    return false;
  }
  
  // Helper function to get current cap tier for a stat
  function getCurrentCapTier(statName, currentValue) {
    const tierInfo = statCapTiers[statName];
    if (!tierInfo) return null;
    
    // Find how many tiers are already unlocked for this stat
    let unlockedTier = -1;
    const investments = geneTokenInvestments[antIndex] || [];
    for (let inv of investments) {
      if (inv.target === statName && inv.type === 'cap') {
        unlockedTier = Math.max(unlockedTier, inv.tier || 0);
      }
    }
    
    // Next tier to unlock
    const nextTier = unlockedTier + 1;
    if (nextTier >= tierInfo.caps.length) return null; // All tiers unlocked
    
    const nextCapValue = tierInfo.caps[nextTier];
    
    if (tierInfo.inverse) {
      // For inverse stats, calculate progress toward lower value
      const startValue = tierInfo.start || tierInfo.caps[0];
      const range = startValue - nextCapValue;
      const progress = startValue - currentValue;
      return { tier: nextTier, cap: nextCapValue, percentage: progress / range, inverse: true };
    } else {
      // For normal stats, calculate progress toward higher value
      const baseValue = unlockedTier >= 0 ? tierInfo.caps[unlockedTier] : 0;
      const range = nextCapValue - baseValue;
      const progress = currentValue - baseValue;
      return { tier: nextTier, cap: nextCapValue, percentage: progress / range, inverse: false };
    }
  }
  
  // Define which stats are always useful (not conditional on traits)
  const alwaysUsefulStats = [
    'bulletSpeed',      // Always affects bullet speed
    'bulletCooldown',   // Always affects shooting rate
    'antSpeed'          // Always affects movement
  ];
  
  // Check each stat that has cap tiers
  for (let statName in statCapTiers) {
    const currentValue = eval(statName + '[' + antIndex + ']');
    const capInfo = getCurrentCapTier(statName, currentValue);
    
    if (capInfo) {
      if (isInitialSetup) {
        // During initial setup, only consider always-useful stats
        if (alwaysUsefulStats.includes(statName) && capInfo.percentage > bestPercentage) {
          bestPercentage = capInfo.percentage;
          bestCandidate = { 
            type: 'cap', 
            name: statName, 
            tier: capInfo.tier,
            cap: capInfo.cap,
            inverse: capInfo.inverse
          };
        }
      } else {
        // After initial setup, only consider expressed stats
        if (isStatExpressed(statName) && capInfo.percentage > bestPercentage) {
          bestPercentage = capInfo.percentage;
          bestCandidate = { 
            type: 'cap', 
            name: statName, 
            tier: capInfo.tier,
            cap: capInfo.cap,
            inverse: capInfo.inverse
          };
        }
      }
    }
  }
  
  // Check potential stats - these don't get caps, but unlock traits
  const potentials = {
    specialPotential: { category: 'special', value: specialPotential[antIndex] },
    firePotential: { category: 'fire', value: firePotential[antIndex] },
    deathPotential: { category: 'death', value: deathPotential[antIndex] },
    pathPotential: { category: 'path', value: pathPotential[antIndex] }
  };
  
  for (let potName in potentials) {
    const pot = potentials[potName];
    // Only consider if potential is above 0.5 (category is active)
    // Note: Initial ants start with 0.3 potential, so traits won't be available
    // during initial setup - only stat caps will be invested in
    if (pot.value > 0.5) {
      const category = pot.category;
      
      // Check if this category already has an investment
      const investments = geneTokenInvestments[antIndex] || [];
      const categoryAlreadyInvested = investments.some(inv => inv.type === 'trait' && inv.category === category);
      
      // Skip this category if already invested
      if (categoryAlreadyInvested) {
        continue;
      }
      
      let bestMutation = null;
      let bestMutationValue = 0;
      
      if (category === 'special') {
        if (specialExplosion[antIndex] > bestMutationValue) {
          bestMutationValue = specialExplosion[antIndex];
          bestMutation = 'specialExplosion';
        }
        if (specialKnockback[antIndex] > bestMutationValue) {
          bestMutationValue = specialKnockback[antIndex];
          bestMutation = 'specialKnockback';
        }
        if (specialCamo[antIndex] > bestMutationValue) {
          bestMutationValue = specialCamo[antIndex];
          bestMutation = 'specialCamo';
        }
        if (specialRecoil[antIndex] > bestMutationValue) {
          bestMutationValue = specialRecoil[antIndex];
          bestMutation = 'specialRecoil';
        }
      } else if (category === 'fire') {
        if (fireBurst[antIndex] > bestMutationValue) {
          bestMutationValue = fireBurst[antIndex];
          bestMutation = 'fireBurst';
        }
        if (fireRapid[antIndex] > bestMutationValue) {
          bestMutationValue = fireRapid[antIndex];
          bestMutation = 'fireRapid';
        }
        if (fireAlternating[antIndex] > bestMutationValue) {
          bestMutationValue = fireAlternating[antIndex];
          bestMutation = 'fireAlternating';
        }
        if (fireAlarm[antIndex] > bestMutationValue) {
          bestMutationValue = fireAlarm[antIndex];
          bestMutation = 'fireAlarm';
        }
      } else if (category === 'death') {
        // Ties go to the earlier trait (landmine first), matching getDeathType
        const deathValues = {
          deathLandmine: deathLandmine[antIndex],
          deathRefire: deathRefire[antIndex] || 0,
          deathTerritory: deathTerritory[antIndex] || 0,
          deathMound: deathMound[antIndex] || 0
        };
        bestMutation = 'deathLandmine';
        for (const key in deathValues) {
          if (deathValues[key] > deathValues[bestMutation]) bestMutation = key;
        }
      } else if (category === 'path') {
        if (pathHighArc[antIndex] > bestMutationValue) {
          bestMutationValue = pathHighArc[antIndex];
          bestMutation = 'pathHighArc';
        }
        if (pathCurve[antIndex] > bestMutationValue) {
          bestMutationValue = pathCurve[antIndex];
          bestMutation = 'pathCurve';
        }
        if (pathAccelerate[antIndex] > bestMutationValue) {
          bestMutationValue = pathAccelerate[antIndex];
          bestMutation = 'pathAccelerate';
        }
        if (pathBlink[antIndex] > bestMutationValue) {
          bestMutationValue = pathBlink[antIndex];
          bestMutation = 'pathBlink';
        }
      }
      
      if (bestMutation) {
        if (pot.value > bestPercentage) {
          // Pick trait with highest percentage
          bestPercentage = pot.value;
          bestCandidate = { type: 'trait', name: bestMutation, category: category };
        }
      }
    }
  }
  
  // Allocate token
  if (bestCandidate && geneTokens[antIndex] > 0) {
    geneTokens[antIndex]--;
    const investment = {
      target: bestCandidate.name,
      type: bestCandidate.type,
      lockedUntilRound: currentRound + 3,  // Lock for 2 full rounds (can free at round+3)
      percentage: bestPercentage
    };
    
    if (bestCandidate.type === 'cap') {
      investment.tier = bestCandidate.tier;
      investment.cap = bestCandidate.cap;
      investment.inverse = bestCandidate.inverse;
      debugLog(`Ant ${antIndex} invested token in ${bestCandidate.name} tier ${bestCandidate.tier + 1} (cap: ${bestCandidate.cap.toFixed(2)})`);
      
      // If initial setup, bump stat to the cap value
      if (isInitialSetup) {
        eval(bestCandidate.name + '[' + antIndex + '] = ' + bestCandidate.cap);
        debugLog(`  -> Bumped ${bestCandidate.name} to ${bestCandidate.cap.toFixed(2)}`);
      }
    } else {
      investment.category = bestCandidate.category;
      debugLog(`Ant ${antIndex} invested token in ${bestCandidate.name} trait (${bestCandidate.category})`);
    }
    
    geneTokenInvestments[antIndex].push(investment);
  }
}

function updateTokenInvestments(antIndex, currentRound) {
  // Check each investment and free tokens if conditions aren't met
  for (let i = geneTokenInvestments[antIndex].length - 1; i >= 0; i--) {
    const investment = geneTokenInvestments[antIndex][i];
    
    // Skip if still locked
    if (currentRound < investment.lockedUntilRound) continue;
    
    let shouldFree = false;
    
    if (investment.type === 'trait') {
      // Check if potential dropped below 0.5
      const potentialName = investment.category + 'Potential';
      const potentialValue = eval(potentialName + '[' + antIndex + ']');
      
      if (potentialValue <= 0.5) {
        shouldFree = true;
        debugLog(`Freeing token from ${investment.target} - potential too low`);
      } else {
        // Check if another mutation in same category overtook this one
        const currentValue = eval(investment.target + '[' + antIndex + ']');
        let maxOtherValue = 0;
        
        if (investment.category === 'special') {
          maxOtherValue = Math.max(
            investment.target !== 'specialExplosion' ? specialExplosion[antIndex] : 0,
            investment.target !== 'specialKnockback' ? specialKnockback[antIndex] : 0,
            investment.target !== 'specialCamo' ? specialCamo[antIndex] : 0,
            investment.target !== 'specialRecoil' ? specialRecoil[antIndex] : 0
          );
        } else if (investment.category === 'fire') {
          maxOtherValue = Math.max(
            investment.target !== 'fireBurst' ? fireBurst[antIndex] : 0,
            investment.target !== 'fireRapid' ? fireRapid[antIndex] : 0,
            investment.target !== 'fireAlternating' ? fireAlternating[antIndex] : 0,
            investment.target !== 'fireAlarm' ? fireAlarm[antIndex] : 0
          );
        } else if (investment.category === 'death') {
          maxOtherValue = Math.max(
            investment.target !== 'deathLandmine' ? deathLandmine[antIndex] : 0,
            investment.target !== 'deathRefire' ? deathRefire[antIndex] : 0,
            investment.target !== 'deathTerritory' ? deathTerritory[antIndex] : 0,
            investment.target !== 'deathMound' ? deathMound[antIndex] : 0
          );
        } else if (investment.category === 'path') {
          maxOtherValue = Math.max(
            investment.target !== 'pathHighArc' ? pathHighArc[antIndex] : 0,
            investment.target !== 'pathCurve' ? pathCurve[antIndex] : 0,
            investment.target !== 'pathAccelerate' ? pathAccelerate[antIndex] : 0,
            investment.target !== 'pathBlink' ? pathBlink[antIndex] : 0
          );
        }
        
        if (maxOtherValue > currentValue) {
          shouldFree = true;
          debugLog(`Freeing token from ${investment.target} - overtaken by another mutation`);
        }
      }
    } else if (investment.type === 'cap') {
      // For cap investments, check if the stat has fallen below the unlocked cap
      const currentValue = eval(investment.target + '[' + antIndex + ']');
      
      if (investment.inverse) {
        // For inverse stats (lower is better), free if value goes back above the cap
        if (currentValue > investment.cap) {
          shouldFree = true;
          debugLog(`Freeing token from ${investment.target} tier ${investment.tier + 1} - value increased above cap`);
        }
      } else {
        // For normal stats (higher is better), free if value falls below the previous tier
        const previousCap = investment.tier > 0 ? investment.cap : 0;
        if (currentValue < previousCap) {
          shouldFree = true;
          debugLog(`Freeing token from ${investment.target} tier ${investment.tier + 1} - value fell below previous tier`);
        }
      }
    }
    
    // Free the token
    if (shouldFree) {
      geneTokens[antIndex]++;
      geneTokenInvestments[antIndex].splice(i, 1);
    }
  }
}

function getStatCapForAnt(antIndex, statName) {
  // Returns the current cap for a stat based on unlocked tiers
  // Returns null if stat has no caps
  
  const statCapTiers = {
    // Inverse stats (lower is better, unlock downward from starting max)
    bulletSpeed: { caps: [250, 200, 150, 120, 90], inverse: true, start: 300 },
    bulletCooldown: { caps: [150, 120, 100, 90, 79], inverse: true, start: 200 },
    
    // Normal stats (higher is better, unlock upward from starting min)
    antSpeed: { caps: [2, 2.5, 3, 3.5], inverse: false },
    
    // Special category mutation stats (can be capped)
    specialExplosion: { caps: [1.0, 2.0], inverse: false },  // <1 = timed, >=1 = proximity
    specialCamo: { caps: [1.0, 2.0], inverse: false },  // <1 = camouflage, >=1 = ghost
  specialRecoil: { caps: [1.0, 2.0], inverse: false },  // <1 = recoil, >=1 = launch
    bulletCamoFlashRate: { caps: [1.5, 1.0, 0.75, 0.5, 0.25], inverse: true, start: 3 },  // Flashes/sec (lower = better)
bulletKnockbackMultiplier: { caps: [2, 3, 4, 5], inverse: false },
    
    // Fire category supporting stats
    bulletBurstCount: { caps: [3, 4, 5, 5.5], inverse: false },
    bulletBurstSpread: { caps: [2.0, 2.5, 3.0, 3.14], inverse: false },
    bulletCooldownMultiplier: { caps: [3, 4, 5, 5.5], inverse: false },
    
    // Path category mutation stats (can be capped)
    bulletCurveStrength: { caps: [0.05, 0.075, 0.1], inverse: false },
    pathCurve: { caps: [1.0, 2.0], inverse: false },  // <1 = curved, >=1 = homing

    // Death category mutation stats (can be capped)
    deathLandmine: { caps: [1.0, 2.0], inverse: false },  // <1 = smear, >=1 = landmine
    deathRefire: { caps: [1.0, 2.0], inverse: false },  // <1 = refire, >=1 = turret

    // Fire category mutation stats (can be capped)
    fireAlternating: { caps: [1.0, 2.0], inverse: false },  // <1 = alternating, >=1 = hit reload
    fireBurst: { caps: [1.0, 2.0], inverse: false },  // <1 = burst, >=1 = delayed burst
    fireRapid: { caps: [1.0, 2.0], inverse: false },  // <1 = rapid, >=1 = stream
    pathHighArc: { caps: [1.0, 2.0], inverse: false },  // <1 = high arc, >=1 = split arc
    pathAccelerate: { caps: [1.0, 2.0], inverse: false },  // <1 = accelerate, >=1 = beam
    specialKnockback: { caps: [1.0, 2.0], inverse: false },  // <1 = knockback, >=1 = vacuum
    fireAlarm: { caps: [1.0, 2.0], inverse: false },  // <1 = alarm, >=1 = avenge
    pathBlink: { caps: [1.0, 2.0], inverse: false },  // <1 = blink, >=1 = portal
    deathTerritory: { caps: [1.0, 2.0], inverse: false },  // <1 = territory, >=1 = nest
    deathMound: { caps: [1.0, 2.0], inverse: false },  // <1 = mound, >=1 = bunker
    
    // Explosion stats
    bulletSize: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
    radiusMultiplier: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
    residueMultiplier: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
    
    // Ant size
    antSize: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false }
  };
  
  const tierInfo = statCapTiers[statName];
  if (!tierInfo) return null; // No caps for this stat
  
  // Find highest unlocked tier
  let highestTier = -1;
  const investments = geneTokenInvestments[antIndex] || [];
  for (let inv of investments) {
    if (inv.target === statName && inv.type === 'cap') {
      highestTier = Math.max(highestTier, inv.tier || 0);
    }
  }
  
  if (highestTier >= 0) {
    return tierInfo.caps[highestTier];
  } else {
    // No tiers unlocked
    if (tierInfo.inverse) {
      return tierInfo.start; // Start at the high value for inverse stats
    } else {
      return 0; // Start at 0 for normal stats (or use base starting value)
    }
  }
}

function addDeathEffect(x, y, points = 100) {
  // death burst
  deathAnimations.push({
    x: x,
    y: y,
    size: 10,
    opacity: 255,
  });

  // floating points text (score and EXP gained)
  floatingTexts.push({
    x: x,
    y: y - 10,
    text: `+${Math.round(points)}`,
    opacity: 255,
    riseSpeed: 1.5,
  });
}

function fuseLandMines() {
  // Performance optimization: fuse closest landmines when there are too many
  if (landMines.length <= 50) return;
  
  // Keep fusing until we're back below the threshold
  while (landMines.length > 50) {
    // Find the two closest mines to each other
    let minDistance = Infinity;
    let mine1Index = -1;
    let mine2Index = -1;
    
    for (let i = 0; i < landMines.length; i++) {
      for (let j = i + 1; j < landMines.length; j++) {
        let d = dist(landMines[i].x, landMines[i].y, landMines[j].x, landMines[j].y);
        if (d < minDistance) {
          minDistance = d;
          mine1Index = i;
          mine2Index = j;
        }
      }
    }
    
    if (mine1Index === -1 || mine2Index === -1) break;
    
    let mine1 = landMines[mine1Index];
    let mine2 = landMines[mine2Index];
  
  // Create owners array from both mines
  let fusedOwners = [];
  if (Array.isArray(mine1.owner)) {
    fusedOwners = fusedOwners.concat(mine1.owner);
  } else {
    fusedOwners.push(mine1.owner);
  }
  if (Array.isArray(mine2.owner)) {
    fusedOwners = fusedOwners.concat(mine2.owner);
  } else {
    fusedOwners.push(mine2.owner);
  }
  
  // Calculate combined fusion count
  let newFusionCount = (mine1.fusionCount || 1) + (mine2.fusionCount || 1);
  
  // Size growth slows down as fusion count increases (diminishing returns)
  let newSize = (mine1.size + mine2.size) / 2 * (1 + 0.5 / Math.sqrt(newFusionCount));
  
  // Position at the weighted average based on size
  let totalSize = mine1.size + mine2.size;
  let newX = (mine1.x * mine1.size + mine2.x * mine2.size) / totalSize;
  let newY = (mine1.y * mine1.size + mine2.y * mine2.size) / totalSize;
  
  // Create fused mine with combined properties
  let fusedMine = {
    x: newX,
    y: newY,
    size: newSize,
    owner: fusedOwners, // Now an array of all contributing ants
    isPlayerMine: mine1.isPlayerMine || mine2.isPlayerMine, // Player mine if either is
    knockbackBullet: mine1.knockbackBullet || mine2.knockbackBullet,
    knockbackMultiplier: Math.max(mine1.knockbackMultiplier || 1, mine2.knockbackMultiplier || 1),
    trueSpeed: (mine1.trueSpeed + mine2.trueSpeed) / 2,
    life: Math.min(mine1.life || 0, mine2.life || 0), // Use minimum life (newer mine)
    explodeOnTermination: mine1.explodeOnTermination || mine2.explodeOnTermination,
    triggerExplodeViaProximity: mine1.triggerExplodeViaProximity || mine2.triggerExplodeViaProximity,
    explosionProximity: Math.max(mine1.explosionProximity || 0, mine2.explosionProximity || 0),
    explodeAfter: Math.min(mine1.explodeAfter || Infinity, mine2.explodeAfter || Infinity),
    meltAfter: Math.max(mine1.meltAfter || MINE_MELT_BASE_FRAMES, mine2.meltAfter || MINE_MELT_BASE_FRAMES),
    // Fused mines only stay hidden if both halves were hidden the same way; use the more visible flash rate
    stealthType: (mine1.stealthType || 0) === (mine2.stealthType || 0) ? (mine1.stealthType || 0) : 0,
    camoFlashRate: Math.max(mine1.camoFlashRate || 2.5, mine2.camoFlashRate || 2.5),
    fusionCount: newFusionCount
  };
  
  // Remove the two original mines (remove higher index first to avoid index shifting)
  if (mine2Index > mine1Index) {
    landMines.splice(mine2Index, 1);
    landMines.splice(mine1Index, 1);
  } else {
    landMines.splice(mine1Index, 1);
    landMines.splice(mine2Index, 1);
  }
  
  // Add the fused mine
  landMines.push(fusedMine);
  } // End of while loop
}

// hitMultiplier scales the smoke impact's instant hit (self-destructing stream ants hit for double)
function spawnEnemyExplosion(x, y, size, ownerId, radiusScale = 1, hitMultiplier = 1) {
  const BASE_RADIUS     = 20;  // radius for size 1
  const RADIUS_PER_SIZE = 40;

  const BASE_LIFE       = 10;  // frames for size 1 (~0.3 sec)
  const LIFE_PER_SIZE   = 20;

  let radius  = (BASE_RADIUS + RADIUS_PER_SIZE * (size - 1)) * radiusMultiplier[ownerId] * radiusScale;
  let maxLife = (BASE_LIFE   + LIFE_PER_SIZE   * (size - 1)) * residueMultiplier[ownerId];

  // Smoke impact first: a grey puff that slowly fades and one instant hit of bulletSize damage...
  spawnSmokeImpact(x, y, radius);
  if (dist(playerX, playerY, x, y) < radius) {
    handlePlayerHit(ownerId, false, x, y, 1, 5, true, size * hitMultiplier);
  }
  // The beetle's mounds in the blast take the same hit
  for (const wall of playerWalls) {
    if (wall !== playerBunker && dist(x, y, wall.x, wall.y) < radius + wall.radius) damagePlayerWall(wall, size * hitMultiplier);
  }

  // ...followed by the green acidic residue
  enemyExplosions.push({
    x: x,
    y: y,
    radius: radius,
    maxLife: maxLife,
    life: 0,
    delay: SMOKE_IMPACT_LEAD_FRAMES, // Frames before the residue appears under the smoke
    size: size,       // bulletSize that created it
    ownerId: ownerId  // which ant owns this explosion
  });
}

const SMOKE_IMPACT_FRAMES = 50;      // Smoke impacts fade out slowly over this many frames
const SMOKE_IMPACT_LEAD_FRAMES = 6;  // Explosions: the green residue appears this many frames after the smoke

// Grey smoke puff (visual only). lift raises it off the ground, for streams bursting in mid-air.
function spawnSmokeImpact(x, y, radius, puffCount = 5, lift = 0) {
  const puffs = [];
  for (let k = 0; k < puffCount; k++) {
    const a = Math.random() * Math.PI * 2;
    const d = random(0, 0.45) * radius;
    puffs.push({
      dx: Math.cos(a) * d,
      dy: Math.sin(a) * d,
      r: random(0.5, 0.8) * radius,
      rise: random(0.1, 0.35) // px/frame the puff drifts upward
    });
  }
  enemySmokeImpacts.push({ x: x, y: y - lift, radius: radius, life: 0, maxLife: SMOKE_IMPACT_FRAMES, puffs: puffs });
}

function drawEnemySmokeImpacts() {
  for (let i = enemySmokeImpacts.length - 1; i >= 0; i--) {
    const smoke = enemySmokeImpacts[i];
    smoke.life++;
    if (smoke.life >= smoke.maxLife) {
      enemySmokeImpacts.splice(i, 1);
      continue;
    }
    if (tigerBeetleActive && tigerBeetleMoving) continue;

    const t = smoke.life / smoke.maxLife;
    // Puffs billow out fast, then hang and thin out
    const grow = 0.6 + 0.6 * (1 - Math.pow(1 - t, 3));
    const alpha = 200 * (1 - t);
    push();
    noStroke();
    for (const puff of smoke.puffs) {
      const px = smoke.x + puff.dx * grow;
      const py = smoke.y + puff.dy * grow - puff.rise * smoke.life;
      fill(120, 120, 120, alpha * 0.55);
      ellipse(px, py, puff.r * 2 * grow);
      fill(185, 185, 185, alpha * 0.6);
      ellipse(px, py, puff.r * 1.2 * grow);
    }
    pop();
  }
}

function spawnEnemyArcExplosionLink(x, airY, groundY, bulletSize, radiusScale = 1) {
  enemyArcExplosionLinks.push({
    x: x,
    airY: airY,
    groundY: groundY,
    bulletSize: bulletSize,
    radiusScale: radiusScale,
    life: 0,
    maxLife: 16
  });
}

function drawEnemyArcExplosionLinks() {
  for (let i = enemyArcExplosionLinks.length - 1; i >= 0; i--) {
    let link = enemyArcExplosionLinks[i];
    link.life++;

    let t = link.life / link.maxLife;
    let alpha = lerp(220, 0, t);
    let pulse = 1 + 0.2 * sin(link.life * 0.9);
    let lineWidth = (2 + link.bulletSize * 1.2) * pulse;

    push();
    stroke(120, 255, 120, alpha);
    strokeWeight(lineWidth);
    line(link.x, link.airY, link.x, link.groundY);

    noStroke();
    // Top cap: larger green "mushroom cloud" style marker
    fill(110, 255, 110, alpha * 0.7);
    let cloudScale = max(1, link.radiusScale || 1);
    let airMarkerOuter = (18 + link.bulletSize * 8) * cloudScale * pulse;
    ellipse(link.x, link.airY, airMarkerOuter * 1.35, airMarkerOuter);
    fill(70, 220, 70, alpha);
    let airMarkerInner = (12 + link.bulletSize * 5) * cloudScale * pulse;
    ellipse(link.x, link.airY, airMarkerInner * 1.25, airMarkerInner);

    fill(60, 210, 60, alpha);
    let groundMarkerSize = (10 + link.bulletSize * 6 * link.radiusScale) * pulse;
    ellipse(link.x, link.groundY, groundMarkerSize, groundMarkerSize);
    pop();

    if (link.life >= link.maxLife) {
      enemyArcExplosionLinks.splice(i, 1);
    }
  }
}

function spawnEnemyGroundImpact(x, y, radius, isKnockbackImpact = false, residueScale = 1) {
  const baseLife = isKnockbackImpact ? 12 : 9;
  const lifeScale = isKnockbackImpact ? 0.08 : 0.06;

  enemyGroundImpacts.push({
    x: x,
    y: y,
    radius: radius,
    maxLife: (baseLife + radius * lifeScale) * residueScale,
    life: 0,
    isKnockbackImpact: isKnockbackImpact
  });
}

function drawEnemyGroundImpacts() {
  for (let i = enemyGroundImpacts.length - 1; i >= 0; i--) {
    let impact = enemyGroundImpacts[i];
    impact.life++;

    let t = impact.life / impact.maxLife;
    let alpha = lerp(160, 0, t);
    let currentRadius = impact.radius * (0.8 + 0.35 * sin(impact.life * 0.45));

    push();
    noStroke();
    if (impact.isKnockbackImpact) {
      fill(240, 240, 240, alpha * 0.6);
      ellipse(impact.x, impact.y, currentRadius * 1.25);
      fill(255, 255, 255, alpha);
      ellipse(impact.x, impact.y, currentRadius);
    } else {
      fill(255, 230, 170, alpha * 0.55);
      ellipse(impact.x, impact.y, currentRadius * 1.2);
      fill(255, 210, 120, alpha * 0.85);
      ellipse(impact.x, impact.y, currentRadius);
    }
    pop();

    if (impact.life >= impact.maxLife) {
      enemyGroundImpacts.splice(i, 1);
    }
  }
}

// Smear: tier-1 death effect. A small explosion-like patch left where a bullet fades out.
// Area scales with radiusMultiplier, lifetime scales with residueMultiplier.
// The smear streaks forward along the bullet's direction of travel (velX, velY).
function spawnEnemySmear(x, y, size, ownerId, velX = 0, velY = 0) {
  const BASE_RADIUS     = 14;  // radius for size 1 (smaller than an explosion)
  const RADIUS_PER_SIZE = 16;
  const BASE_LIFE       = 90;  // frames for size 1 (~1.5 sec, lingers longer than an explosion)
  const LIFE_PER_SIZE   = 30;

  let radius  = (BASE_RADIUS + RADIUS_PER_SIZE * (size - 1)) * (radiusMultiplier[ownerId] || 1);
  let maxLife = (BASE_LIFE   + LIFE_PER_SIZE   * (size - 1)) * (residueMultiplier[ownerId] || 1);

  // Direction of travel in radians. Uses Math.* directly because the global
  // angleMode is DEGREES during gameplay, which would break p5's cos/sin here.
  let dirAngle = (velX === 0 && velY === 0) ? Math.random() * Math.PI * 2 : Math.atan2(velY, velX);
  let dirX = Math.cos(dirAngle);
  let dirY = Math.sin(dirAngle);

  // Streak shape: lobes spread along the travel direction, tapering toward the front
  let lobes = [];
  let lobeCount = floor(random(4, 7));
  for (let k = 0; k < lobeCount; k++) {
    let along = lerp(-0.3, 1.4, k / (lobeCount - 1)) * radius;
    let side = random(-0.2, 0.2) * radius;
    lobes.push({
      dx: dirX * along - dirY * side,
      dy: dirY * along + dirX * side,
      scale: lerp(0.8, 0.35, k / (lobeCount - 1)) * random(0.85, 1.1)
    });
  }

  enemySmears.push({
    x: x,
    y: y,
    radius: radius,
    maxLife: maxLife,
    life: 0,
    size: size,
    ownerId: ownerId,
    lobes: lobes
  });
}

function drawEnemySmears() {
  for (let i = enemySmears.length - 1; i >= 0; i--) {
    let s = enemySmears[i];
    s.life++;

    let t = s.life / s.maxLife;
    // Quick spread-in, then slow fade
    let grow = min(1, s.life / 8);
    let alpha = lerp(150, 0, t * t);
    let currentRadius = s.radius * grow * (0.95 + 0.05 * Math.sin(s.life * 0.15));

    // Damage ticks while the player stands anywhere on the streak (weaker than an explosion since it lingers)
    let touching = dist(playerX, playerY, s.x, s.y) < currentRadius * 0.65;
    for (let lobe of s.lobes) {
      if (touching) break;
      touching = dist(playerX, playerY, s.x + lobe.dx * grow, s.y + lobe.dy * grow) < currentRadius * lobe.scale;
    }
    if (touching) {
      handleExplosionDamage(s.size * 0.25, s.ownerId);
    }

    if (!(tigerBeetleActive && tigerBeetleMoving)) {
      push();
      noStroke();
      fill(0, 255, 0, alpha * 0.45);
      for (let lobe of s.lobes) {
        ellipse(s.x + lobe.dx * grow, s.y + lobe.dy * grow, currentRadius * 2 * lobe.scale);
      }
      fill(0, 170, 0, alpha * 0.8);
      ellipse(s.x, s.y, currentRadius * 1.3);
      for (let lobe of s.lobes) {
        ellipse(s.x + lobe.dx * grow, s.y + lobe.dy * grow, currentRadius * 1.1 * lobe.scale);
      }
      pop();
    }

    if (s.life >= s.maxLife) {
      enemySmears.splice(i, 1);
    }
  }
}

function drawEnemyExplosions() {
  for (let i = enemyExplosions.length - 1; i >= 0; i--) {
    let e = enemyExplosions[i];

    // Residue waits for its smoke impact to play first
    if (e.delay > 0) {
      e.delay--;
      continue;
    }

    e.life++;

    let t = e.life / e.maxLife;
    let alpha = lerp(180, 0, t);
    let currentRadius = e.radius * (0.9 + 0.2 * sin(e.life * 0.4));

    // damage player ONCE if inside

    let d = dist(playerX, playerY, e.x, e.y);
    if (d < currentRadius) {
      // every frame the beetle is inside, do a “tick” of damage
      queenDamageIsOwn = !!e.queenOwned;
      handleExplosionDamage(e.size, e.ownerId);
      queenDamageIsOwn = false;
    }
  

    // draw explosion (skip if Tiger Beetle is moving)
    if (!(tigerBeetleActive && tigerBeetleMoving)) {
      push();
      noStroke();
      fill(0, 255, 0, alpha * 0.6);
      ellipse(e.x, e.y, currentRadius * 1.2);

      fill(0, 200, 0, alpha);
      ellipse(e.x, e.y, currentRadius * 1);
      pop();
    }

    if (e.life >= e.maxLife) {
      enemyExplosions.splice(i, 1);
    }
  }
}

function handleExplosionDamage(size, ownerId) {
  if (interceptPlayerDamage(size / 60, false)) return; // Flying over it, or the bunker takes it
  let damage = size/60 * getPlayerDamageTakenMultiplier(); // same “units” as bulletSize
  onPlayerDamaged(damage);

  if (shield > 0) {
    shield -= damage;
    antPoints[ownerId] = antPoints[ownerId] + damage;
    if(!sShieldHit1.isPlaying() || !sShieldHit2.isPlaying()) {
      sHit = round(random(1,2));
      if(sHit == 1) {
        sShieldHit1.play();
      } else {
        sShieldHit2.play();
      }
    }
  } else {
    playerLastDamageFrame = frameCount; // Counts as taking damage, like a bullet hit (stops health regen outhealing it)
    health -= damage;
    antPoints[ownerId] = antPoints[ownerId] + damage;
    if(!sHit1.isPlaying() || !sHit2.isPlaying()) {
      sHit = round(random(1,2));
      if(sHit == 1) {
        sHit1.play();
      } else {
        sHit2.play();
      }
    }
  }
}

// ========== LADY BEETLE & APHIDS ==========
// Lady Beetle (upgrade id 36) puts aphids on the field: neutral bugs that spawn at a random spot on a timer and
// despawn after APHID_LIFE_FRAMES (no cap on how many are out). Eating one heals the beetle and gives it the
// aphid's effect. An ant that stays within APHID_ANT_RANGE of one for APHID_ANT_FRAMES frames in a row gets a
// smaller heal and the ant version of the effect, once per aphid (ants never eat them). Effects last
// APHID_EFFECT_FRAMES; getting one again while it's active restarts its timer.
// Ant effects that change stats (speed, EXP's maxed stat) save the real value in antAphidBaseStats and put it back
// when they end, when the ant dies, and when the round ends, so they never count toward the ant's genes.
const APHID_LIFE_FRAMES = 1500;
const APHID_BLINK_FRAMES = 120;           // Blinks for this long before despawning
const APHID_ANT_RANGE = 50;
const APHID_ANT_FRAMES = 100;
const APHID_EFFECT_FRAMES = 300;          // 5 seconds
const APHID_RADIUS = 9;
const APHID_PLAYER_REACH = 22 + APHID_RADIUS;
const APHID_PLAYER_HEAL = [2, 3, 4, 5];       // By Aphid Health level
const APHID_ANT_HEAL = [0.5, 0.75, 1, 1.25];
const APHID_SPAWN_SECONDS = [20, 15, 10];     // By Aphid Spawn Rate level
// Special aphids: the upgrade id that unlocks each, its spawn chance (taken out of the basic aphid's share) and colour
const APHID_TYPES = {
  speed:  { upgrade: 39, chance: 0.1,  color: [255, 220, 60] },
  armor:  { upgrade: 40, chance: 0.1,  color: [80, 150, 255] },
  exp:    { upgrade: 41, chance: 0.1,  color: [190, 90, 255] },
  regen:  { upgrade: 42, chance: 0.1,  color: [255, 110, 160] },
  reroll: { upgrade: 43, chance: 0.05, color: [255, 150, 40] }
};
// Reroll aphids give ants a level 1 ability for a while (level 2 ones lean on their real trait stats)
const APHID_ANT_ABILITIES = {
  fire: [1, 2, -1, 5],      // Burst, Rapid, Alternating, Alarm
  path: [1, -1, 2, 3],      // High Arc, Curved, Accelerate, Blink
  special: [1, -1, 2, 3],   // Explosion, Knockback, Camouflage, Recoil
  death: [-1, 2, 4, 6]      // Smear, Refire, Territory, Mound
};

let aphids = [];
let aphidSpawnTimer = 0;
let playerAphidEffects = {};  // speed / armor / exp / regen -> frames left
let antAphidEffects = [];     // Per ant: { speed, armor, regen: frames left, exp: {stat, frames}, reroll: {category, type, frames} }
let antAphidBaseStats = [];   // Per ant: { statName: real value } for stats an aphid effect has changed

function isLadyBeetleActive() {
  return upgrade37Level > 0;
}

function resetAphids() {
  clearAntAphidEffects();
  aphids = [];
  aphidSpawnTimer = 0;
  playerAphidEffects = {};
}

function pickAphidType() {
  const levels = getCurrentUpgradeLevels();
  let roll = random();
  for (const type in APHID_TYPES) {
    if (!(levels[APHID_TYPES[type].upgrade] > 0)) continue;
    if (roll < APHID_TYPES[type].chance) return type;
    roll -= APHID_TYPES[type].chance;
  }
  return 'basic';
}

function spawnAphid() {
  const b = getPlayAreaBounds(APHID_RADIUS * 2);
  aphids.push({ x: random(b.minX, b.maxX), y: random(b.minY, b.maxY), type: pickAphidType(), age: 0,
    angle: random(360), antFrames: [], boostedAnts: [] });
}

function updateAphids() {
  if (end) {
    clearAntAphidEffects(); // Boosted stats never count toward genes
  } else {
    for (const key in playerAphidEffects) {
      if (--playerAphidEffects[key] <= 0) delete playerAphidEffects[key];
    }
    if (isLadyBeetleActive() && ++aphidSpawnTimer >= APHID_SPAWN_SECONDS[upgrade39Level] * 60) {
      aphidSpawnTimer = 0;
      spawnAphid();
    }
    for (let a = aphids.length - 1; a >= 0; a--) {
      const aphid = aphids[a];
      if (++aphid.age >= APHID_LIFE_FRAMES) {
        aphids.splice(a, 1);
      } else if (health > 0 && dist(playerX, playerY, aphid.x, aphid.y) < APHID_PLAYER_REACH) {
        eatAphid(aphid);
        aphids.splice(a, 1);
      } else {
        updateAphidAntBoosts(aphid);
      }
    }
    updateAntAphidEffects();
  }
  for (const aphid of aphids) drawAphid(aphid);
  drawAphidEffectRings();
}

function addAphidHealText(x, y, amount) {
  floatingTexts.push({ x: x, y: y - 10, text: `+${amount}`, opacity: 255, riseSpeed: 1.5, color: [120, 255, 120] });
}

// --- Player ---

function eatAphid(aphid) {
  const heal = APHID_PLAYER_HEAL[upgrade38Level];
  health += heal;
  addAphidHealText(aphid.x, aphid.y, heal);
  if (aphid.type === 'reroll') upgradeRerolls++;
  else if (aphid.type !== 'basic') playerAphidEffects[aphid.type] = APHID_EFFECT_FRAMES;
  if (!sGainShield.isPlaying()) sGainShield.play();
}

function isPlayerAphidActive(key) {
  return playerAphidEffects[key] > 0;
}

// Movement aphid: double walking (and dash) speed
function getPlayerAphidSpeedMultiplier() {
  return isPlayerAphidActive('speed') ? 2 : 1;
}

// Damage reduction aphid: take half damage
function getPlayerDamageTakenMultiplier() {
  return isPlayerAphidActive('armor') ? 0.5 : 1;
}

// Regeneration aphid: bullets, shields, health and cooldowns all come back twice as fast
function getPlayerRegenMultiplier() {
  return isPlayerAphidActive('regen') ? 2 : 1;
}

// --- Ants ---

function updateAphidAntBoosts(aphid) {
  for (let i = 1; i <= enemyCount; i++) {
    if (aphid.boostedAnts[i] || antDormant[i]) continue;
    const dx = antX[i] - aphid.x;
    const dy = antY[i] - aphid.y;
    if (dx * dx + dy * dy > APHID_ANT_RANGE * APHID_ANT_RANGE) {
      aphid.antFrames[i] = 0; // Leaving the range starts the count over
      continue;
    }
    aphid.antFrames[i] = (aphid.antFrames[i] || 0) + 1;
    if (aphid.antFrames[i] >= APHID_ANT_FRAMES) {
      aphid.boostedAnts[i] = true;
      aphid.antFrames[i] = 0;
      boostAntFromAphid(i, aphid.type);
    }
  }
}

function boostAntFromAphid(i, type) {
  const heal = APHID_ANT_HEAL[upgrade38Level];
  antHealth[i] += heal;
  addAphidHealText(antX[i], antY[i], heal);
  if (type === 'basic') return;
  const fx = antAphidEffects[i] || (antAphidEffects[i] = {});
  if (type === 'exp') {
    if (!fx.exp) fx.exp = { stat: random(getAntAphidStatOptions(i)), frames: 0 };
    fx.exp.frames = APHID_EFFECT_FRAMES;
  } else if (type === 'reroll') {
    if (!fx.reroll) fx.reroll = pickAntAphidAbility(i);
    fx.reroll.frames = APHID_EFFECT_FRAMES;
  } else {
    fx[type] = APHID_EFFECT_FRAMES;
  }
  applyAntAphidStats(i);
}

function isAntAphidActive(i, key) {
  return !!(antAphidEffects[i] && antAphidEffects[i][key]);
}

function hasAntAphidEffects(i) {
  return !!antAphidEffects[i];
}

// Reroll aphid: the ability type an ant has been given for a category, or null
function getAphidAbilityOverride(i, category) {
  const reroll = antAphidEffects[i] && antAphidEffects[i].reroll;
  return reroll && reroll.category === category ? reroll.type : null;
}

// A category the ant has no ability in, or (if it has all four) one to swap to a different ability
function pickAntAphidAbility(i) {
  const current = { fire: getFireType(i), path: getPathType(i), special: getSpecialType(i), death: getDeathType(i) };
  let categories = Object.keys(current).filter(c => current[c] === 0);
  if (categories.length === 0) {
    categories = Object.keys(current).filter(c => !(c === 'fire' && isStreamFire(i))); // Streams can't stop mid-spray
  }
  const category = random(categories);
  return { category, type: random(APHID_ANT_ABILITIES[category].filter(t => t !== current[category])), frames: 0 };
}

// Stat arrays the ant aphid effects can change, looked up fresh since some get reassigned
function getAphidStatArrays() {
  return { bulletSpeed, bulletCooldown, antSpeed, bulletSize, bulletKnockbackMultiplier, explosionProximity,
    bulletBurstCount, bulletBurstSpread, bulletCooldownMultiplier, bulletArcDuration, bulletCurveStrength };
}

// EXP aphid: stats the ant is actually using that can be maxed out
function getAntAphidStatOptions(i) {
  const stats = ['bulletSpeed', 'bulletCooldown', 'antSpeed', 'bulletSize'];
  const fire = getFireType(i);
  const path = getPathType(i);
  const special = getSpecialType(i);
  if (special === -1) stats.push('bulletKnockbackMultiplier');
  if (special === 1) stats.push('explosionProximity');
  if (fire === 1 || fire === 3) stats.push('bulletBurstCount', 'bulletBurstSpread');
  if (fire === -1) stats.push('bulletCooldownMultiplier');
  if (path === 1) stats.push('bulletArcDuration');
  if (path === -1 || path === -2) stats.push('bulletCurveStrength');
  return stats;
}

// The best value a stat can reach (inverse stats get better as they go down)
const APHID_UNCAPPED_STAT_BEST = { explosionProximity: 1000, bulletArcDuration: HIGH_ARC_MAX_DURATION }; // Stats with no gene caps
function getAphidMaxedStat(stat, value) {
  const tier = moduleStatCapTiers[stat];
  if (!tier) return Math.max(value, APHID_UNCAPPED_STAT_BEST[stat]);
  const best = tier.caps[tier.caps.length - 1];
  return tier.inverse ? Math.min(value, best) : Math.max(value, best);
}

// Put an ant's real stats back, then reapply whatever aphid effects it still has
function applyAntAphidStats(i) {
  const arrays = getAphidStatArrays();
  const base = antAphidBaseStats[i];
  if (base) {
    for (const stat in base) arrays[stat][i] = base[stat];
    antAphidBaseStats[i] = undefined;
  }
  const fx = antAphidEffects[i];
  if (!fx) return;
  const saved = {};
  const set = (stat, value) => {
    if (!(stat in saved)) saved[stat] = arrays[stat][i];
    arrays[stat][i] = value;
  };
  if (fx.exp) set(fx.exp.stat, getAphidMaxedStat(fx.exp.stat, arrays[fx.exp.stat][i]));
  if (fx.speed) set('antSpeed', arrays.antSpeed[i] * 2);
  if (Object.keys(saved).length > 0) antAphidBaseStats[i] = saved;
}

function updateAntAphidEffects() {
  for (let i = 1; i <= enemyCount; i++) {
    const fx = antAphidEffects[i];
    if (!fx) continue;
    let statsChanged = false;
    for (const key of ['speed', 'armor', 'regen']) {
      if (fx[key] && --fx[key] <= 0) {
        delete fx[key];
        if (key === 'speed') statsChanged = true;
      }
    }
    if (fx.exp && --fx.exp.frames <= 0) {
      delete fx.exp;
      statsChanged = true;
    }
    if (fx.reroll && --fx.reroll.frames <= 0) delete fx.reroll;
    if (Object.keys(fx).length === 0) antAphidEffects[i] = undefined;
    if (statsChanged) applyAntAphidStats(i);
  }
}

function clearAntAphidEffectsFor(i) {
  if (!antAphidEffects[i] && !antAphidBaseStats[i]) return;
  antAphidEffects[i] = undefined;
  applyAntAphidStats(i);
}

function clearAntAphidEffects() {
  for (let i = 0; i < antAphidBaseStats.length; i++) clearAntAphidEffectsFor(i);
  antAphidEffects = [];
  antAphidBaseStats = [];
}

// A copied ant gets the source's real stats, not its aphid-boosted ones
function restoreAphidBaseStatsOnCopy(src, dst) {
  const base = antAphidBaseStats[src];
  if (!base) return;
  const arrays = getAphidStatArrays();
  for (const stat in base) arrays[stat][dst] = base[stat];
}

// --- Drawing ---

function drawAphid(aphid) {
  const blinking = aphid.age > APHID_LIFE_FRAMES - APHID_BLINK_FRAMES && Math.floor(aphid.age / 8) % 2 === 0;
  const alpha = blinking ? 90 : 255;
  const mark = APHID_TYPES[aphid.type] ? APHID_TYPES[aphid.type].color : null;
  push();
  angleMode(DEGREES);
  translate(aphid.x, aphid.y);

  // How close the nearest ant is to getting a boost
  let progress = 0;
  for (let i = 1; i <= enemyCount; i++) progress = Math.max(progress, aphid.antFrames[i] || 0);
  if (progress > 0) {
    noFill();
    stroke(255, 255, 255, 160);
    strokeWeight(2);
    arc(0, 0, 30, 30, -90, -90 + 360 * progress / APHID_ANT_FRAMES);
  }

  rotate(aphid.angle);
  noStroke();
  fill(0, 0, 0, alpha * 0.25);
  ellipse(2, 3, 18, 13);
  stroke(60, 110, 40, alpha);
  strokeWeight(1.2);
  for (let k = -1; k <= 1; k++) {
    line(k * 4, -4, k * 4 - 2, -8);
    line(k * 4, 4, k * 4 - 2, 8);
  }
  line(-7, -2, -10, -3); // Cornicles
  line(-7, 2, -10, 3);
  noStroke();
  fill(150, 225, 100, alpha);
  ellipse(0, 0, 16, 11);
  fill(105, 180, 70, alpha);
  ellipse(7, 0, 6, 6);
  if (mark) {
    fill(mark[0], mark[1], mark[2], alpha);
    ellipse(-1, 0, 7, 7);
  }
  pop();
}

// Coloured rings around the beetle and ants for each aphid effect they have; they blink as they run out
function drawAphidEffectRing(x, y, radius, color, framesLeft) {
  if (framesLeft < 60 && Math.floor(framesLeft / 6) % 2 === 0) return;
  noFill();
  stroke(color[0], color[1], color[2], 170 + 60 * sin(frameCount * 8));
  strokeWeight(2);
  ellipse(x, y, radius * 2, radius * 2);
}

function drawAphidEffectRings() {
  push();
  angleMode(DEGREES);
  let ring = 0;
  for (const key of ['speed', 'armor', 'exp', 'regen']) {
    if (isPlayerAphidActive(key)) drawAphidEffectRing(playerX, playerY, 40 + 5 * ring++, APHID_TYPES[key].color, playerAphidEffects[key]);
  }
  for (let i = 1; i <= enemyCount; i++) {
    const fx = antAphidEffects[i];
    if (!fx || antDormant[i] || antInBunker[i]) continue;
    const y = antY[i] - antAirHeight[i];
    let r = 0;
    for (const key of ['speed', 'armor', 'exp', 'regen', 'reroll']) {
      if (!fx[key]) continue;
      const framesLeft = typeof fx[key] === 'object' ? fx[key].frames : fx[key];
      drawAphidEffectRing(antX[i], y, 14 + 6 * antSize[i] + 4 * r++, APHID_TYPES[key].color, framesLeft);
    }
  }
  pop();
}

function autonomousAntMovement(){
  for (let i = 1; i <= enemyCount; i++) {
    // Skip knocked back ants - they use knockback movement instead (and ants hiding in a bunker)
    if (antKnockedBack[i] || antInBunker[i] || antDormant[i] || antOrder[i]) continue;
    
    if (findLocation[i] === true){
      if (followTarget[i] === true){
        if (standingPointX[i] > antX[i] + antSpeed[i]) {
          antX[i] += antSpeed[i];
        } else if (standingPointX[i] < antX[i] - antSpeed[i]) {
          antX[i] -= antSpeed[i];
        }

        if (standingPointY[i] > antY[i] + antSpeed[i]) {
          antY[i] += antSpeed[i];
        } else if (standingPointY[i] < antY[i] - antSpeed[i]) {
          antY[i] -= antSpeed[i];
        }
        antX[i] = constrain(antX[i], sideBuffer, getGameplayWidth() - sideBuffer);
        antY[i] = constrain(antY[i], scoreBarHeight + 15, getGameplayHeight() - expBarHeight - expBarBuffer);
      }
    }
  }
  for (let i = 1; i <= enemyCount; i++) {
    // Skip knocked back ants and ants hiding in a bunker
    if (antKnockedBack[i] || antInBunker[i] || antDormant[i] || antOrder[i]) continue;
    
    if (!keepDistance[i]) continue; // only handle autonomous keep-distance ants

    // --- Ensure valid anchors ---
    if (isNaN(anchorPointX[i]) || isNaN(anchorPointY[i]) || anchorPointX[i] === undefined) {
      anchorPointX[i] = spawnX[i];
      anchorPointY[i] = spawnY[i];
    }

    // --- Assign anchor based on behavior ---
    if (standStill[i]) {
      anchorPointX[i] = spawnX[i];
      anchorPointY[i] = spawnY[i];
    } else if (followBeetle[i]) {
      anchorPointX[i] = playerX;
      anchorPointY[i] = playerY;
    } else if (followAnt[i]) {
      const nearest = getNearestAnt(i);
      if (nearest !== -1) {
        anchorPointX[i] = antX[nearest];
        anchorPointY[i] = antY[nearest];
      }
    } else if (findLocation[i]) {
      anchorPointX[i] = standingPointX[i];
      anchorPointY[i] = standingPointY[i];
    }

    // --- Calculate movement (anchor shifted by genetic offset, like shotOffset for bullets) ---
    let dx = (anchorPointX[i] + anchorOffsetX[i]) - antX[i];
    let dy = (anchorPointY[i] + anchorOffsetY[i]) - antY[i];
    let dist = sqrt(dx * dx + dy * dy);
    const ideal = distanceFromAnchor[i];


    // Approach or back away at uniform speed
    const tooFar = dist > ideal + 5;
    const tooClose = dist < ideal - 5;

    if (tooFar || tooClose) {
      // If too far → move toward anchor
      // If too close → move away from anchor
      const dirX = dx / dist;
      const dirY = dy / dist;

      if (tooFar) {
        antX[i] += dirX * antSpeed[i];
        antY[i] += dirY * antSpeed[i];
      } else if (tooClose) {
        antX[i] -= dirX * antSpeed[i];
        antY[i] -= dirY * antSpeed[i];
      }
    }
    // --- Keep on screen ---
    antX[i] = constrain(antX[i], sideBuffer, getGameplayWidth() - sideBuffer);
    antY[i] = constrain(antY[i], scoreBarHeight + 15, getGameplayHeight() - expBarHeight - expBarBuffer);
  }
}


function drawDeathEffects() {
  // Skip rendering if Tiger Beetle is active and moving
  if (tigerBeetleActive && tigerBeetleMoving) {
    return;
  }
  
  // Draw particle-like bursts
  for (let i = deathAnimations.length - 1; i >= 0; i--) {
    let d = deathAnimations[i];
    push();
      noStroke();
      fill(255, 200, 0, d.opacity); // yellowish glow
      ellipse(d.x, d.y, d.size);
      fill(255, 100, 0, d.opacity * 0.7);
      ellipse(d.x, d.y, d.size * 0.6);
    pop();

    // Animate it
    d.size += 2;
    d.opacity -= 15;
    if (d.opacity <= 0) deathAnimations.splice(i, 1);
  }

  // Draw floating texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    let t = floatingTexts[i];
    push();
      noStroke();
      // Points: yellow like the EXP bar, rising from where the ant died
      textAlign(CENTER);
      textSize(24);
      stroke(0, t.opacity);
      strokeWeight(3);
      const textColor = t.color || [255, 255, 0]; // Aphid heals are green
      fill(textColor[0], textColor[1], textColor[2], t.opacity);
      text(t.text, t.x, t.y);
    pop();

    // Animate floating upward and fading out
    t.y -= t.riseSpeed;
    t.opacity -= 5;
    if (t.opacity <= 0) floatingTexts.splice(i, 1);
  }
}

function drawSpeedRings() {
  // Update and draw speed rings (sonic boom trail from accelerated bullets)
  for (let i = speedRings.length - 1; i >= 0; i--) {
    let ring = speedRings[i];
    
    push();
    noFill();
    strokeWeight(2);
    ellipseMode(CENTER);
    
    // Fade out as ring expands
    let fadeProgress = ring.life / 30; // Fade over 30 frames
    let alpha = 255 * (1 - fadeProgress);
    const c = ring.color || [80, 255, 120]; // Bright green unless the ring has its own color
    stroke(c[0], c[1], c[2], alpha);
    
    ellipse(ring.x, ring.y, ring.size, ring.size);
    pop();
    
    // Expand ring
    ring.size += (ring.maxSize - ring.size) * 0.15; // Expand gradually
    ring.life++;
    
    // Remove when fully faded
    if (ring.life >= 30) {
      speedRings.splice(i, 1);
    }
  }
}



function endGame(){
  if (health < 0 && tutorialHandlesDeath()) return; // The tutorial's hard round is meant to be lost
  if (health < 0){
    // Multiplayer mode: mark player as dead and advance
    if (multiplayerMode && players.length > 0) {
      if (!players[currentPlayerIndex].scoredDeath) {
        players[currentPlayerIndex].alive = false;
        // Only add score if they haven't already scored this round
        if (!players[currentPlayerIndex].hasPlayedRound) {
          players[currentPlayerIndex].totalScore += score;
        }
        players[currentPlayerIndex].hasPlayedRound = true;
        players[currentPlayerIndex].scoredDeath = true;
        savePlayerState(currentPlayerIndex);
        
        // Check if only 1 or 0 players left
        if (checkMultiplayerWinCondition()) {
          multiplayerScoreboard = true;
          
          // Play end music when showing scoreboard
          gamemusic.stop();
          if (!endmusic.isPlaying()) {
            endmusic.play();
          }
          return;
        }
        
        // Check if all alive players have played this round
        let alivePlayers = players.filter(p => p.alive);
        let playersWhoPlayed = alivePlayers.filter(p => p.hasPlayedRound);
        
        if (playersWhoPlayed.length < alivePlayers.length) {
          // More players need to play, advance to next
          advanceToNextAlivePlayer();
          return;
        } else {
          // All alive players have played, show scoreboard
          multiplayerScoreboard = true;
          
          // Play end music when showing scoreboard
          gamemusic.stop();
          if (!endmusic.isPlaying()) {
            endmusic.play();
          }
          return;
        }
      }
    }
    
    // Single player mode
    if(levelEnd == 0){
      // Save the round score before it gets reset (for display purposes)
      intermissionScore = score;
      
      intermissionMenu = false;
      intermissionMenuCooldown = 0;
      gameOverMenu = false;
      gameOverMenuCooldown = 0;
      totalScore = totalScore + score;
      score = 0;  // Reset score to prevent double-counting in updateScoreAndTimer
      levelEnd = 1;
      recordBestAnts(); // The ants that took the beetle down count toward the final level's ten
    }
    highScore = getItem('newHighScore');
    if (highScore == null) {
      highScore = 0;
    }
    if(totalScore > highScore){
      storeItem('newHighScore', totalScore);
      highScore = totalScore;
    }
    updateDifficultyRecord(totalScore, level);
    end = true;

    beginMenuScaling();
      // Background
      fill(40, 0, 0);
      rectMode(CORNER);
      rect(0, 0, getMenuWidth(), getMenuHeight());
      rectMode(CENTER);
      fill(0, 0, 0, 180);
      rect(getMenuWidth() / 2, getMenuHeight() / 2, getMenuWidth() * 0.65, getMenuHeight() * 0.6, 40);

      textAlign(CENTER, CENTER);
      fill(255, 170, 170);
      textSize(64);
      text('You Lost', getMenuWidth() / 2, getMenuHeight() * 0.32);

      textSize(26);
      fill(255);
      text(`Round Reached`, getMenuWidth() / 2 - getMenuWidth() * 0.18, getMenuHeight() * 0.40);
      text(`High Score`, getMenuWidth() / 2 + getMenuWidth() * 0.18, getMenuHeight() * 0.40);

      textSize(48);
      fill(255, 220, 120);
      text(level, getMenuWidth() / 2 - getMenuWidth() * 0.18, getMenuHeight() * 0.46);
      text(Math.round(highScore), getMenuWidth() / 2 + getMenuWidth() * 0.18, getMenuHeight() * 0.46);

      textSize(24);
      fill(180, 220, 255);
      text(`Round Score`, getMenuWidth() / 2 - getMenuWidth() * 0.20, getMenuHeight() * 0.56);
      text(`Total Score`, getMenuWidth() / 2 + getMenuWidth() * 0.20, getMenuHeight() * 0.56);

      textSize(42);
      fill(240, 164, 0);
      text(Math.round(intermissionScore), getMenuWidth() / 2 - getMenuWidth() * 0.20, getMenuHeight() * 0.61);

      fill(240, 164, 0);
      text(Math.round(totalScore), getMenuWidth() / 2 + getMenuWidth() * 0.20, getMenuHeight() * 0.61);

      if (!gameOverMenu) {
        push();
          rectMode(CORNER);
          fill(0, 0, 0, 160);
          rect(getMenuWidth() / 2 - getMenuWidth() * 0.275, getMenuHeight() * 0.68, getMenuWidth() * 0.55, getMenuHeight() * 0.12, 18);

          let fadeAlpha = map(sin(frameCount * 1), -1, 1, 30, 70);
          textAlign(CENTER, CENTER);
          fill(255, fadeAlpha);
          textSize(26);
          text('Press Enter to Restart', getMenuWidth() / 2, getMenuHeight() * 0.70);
          textSize(20);
          text('Press Esc for Options', getMenuWidth() / 2, getMenuHeight() * 0.74);
        pop();

        if (gameOverMenuCooldown === 0 && isBackPressed()) {
          gameOverMenu = true;
          gameOverMenuCooldown = 20;
        }
        if (isConfirmPressed()) {
          restartGame();
        } else if (touches.length > 0) {
          restartGame();
        }
      } else {
        push();
          // Dark background like AntDex
          rectMode(CORNER);
          fill(20);
          rect(0, 0, getMenuWidth(), getMenuHeight());
        pop();

        // Menu navigation with arrow keys, WASD, and gamepad
        if (menuNavigationCooldown === 0) {
          if (isUpPressed()) { // Up or W
            gameOverMenuSelection = (gameOverMenuSelection - 1 + 2) % 2;
            menuNavigationCooldown = 10;
          } else if (isDownPressed()) { // Down or S
            gameOverMenuSelection = (gameOverMenuSelection + 1) % 2;
            menuNavigationCooldown = 10;
          }
        }

        // Title
        textAlign(CENTER);
        fill(255);
        textSize(60);
        text('Game Over Menu', getMenuWidth() / 2, getMenuHeight() * 0.40);
        
        // Menu option 0: Start Screen - Card style
        let option0Y = getMenuHeight() * 0.53;
        let option0X = getMenuWidth() / 2;
        let option0W = 320;
        let option0H = 70;
        push();
          rectMode(CENTER);
          if (gameOverMenuSelection === 0) {
            fill(255);  // White background for selected
            stroke(255, 255, 100);
            strokeWeight(3);
          } else {
            fill(50, 50, 50);  // Dark grey for unselected
            stroke(100, 100, 100);
            strokeWeight(2);
          }
          rect(option0X, option0Y, option0W, option0H, 12);
          
          // Text
          if (gameOverMenuSelection === 0) {
            fill(10);  // Dark text on white
          } else {
            fill(255);  // White text on dark
          }
          textSize(28);
          textAlign(CENTER, CENTER);
          text('Start Screen', option0X, option0Y);
        pop();
        
        // Menu option 1: Antdex - Card style
        let option1Y = getMenuHeight() * 0.65;
        let option1X = getMenuWidth() / 2;
        let option1W = 320;
        let option1H = 70;
        push();
          rectMode(CENTER);
          if (gameOverMenuSelection === 1) {
            fill(255);  // White background for selected
            stroke(160, 120, 255);  // Purple stroke like exotic tab
            strokeWeight(3);
          } else {
            fill(50, 50, 50);  // Dark grey for unselected
            stroke(100, 100, 100);
            strokeWeight(2);
          }
          rect(option1X, option1Y, option1W, option1H, 12);
          
          // Text
          if (gameOverMenuSelection === 1) {
            fill(10);  // Dark text on white
          } else {
            fill(255);  // White text on dark
          }
          textSize(28);
          textAlign(CENTER, CENTER);
          text('Antdex', option1X, option1Y);
        pop();
        
        // Instructions with fade
        let fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
        fill(200, fadeAlpha);
        textSize(18);
        textAlign(CENTER);
        text('W/S or ↑/↓ or Left Stick  Navigate  |  Enter or A  Confirm  |  Esc or B  Back', getMenuWidth() / 2, getMenuHeight() * 0.78);

        // Mouse click detection
        if (mouseIsPressed) {
          let mx = getMenuMouseX();
          let my = getMenuMouseY();
          
          // Check option 0 (Start Screen)
          if (mx > option0X - option0W/2 && mx < option0X + option0W/2 &&
              my > option0Y - option0H/2 && my < option0Y + option0H/2) {
            if (menuNavigationCooldown === 0) {
              gameOverMenu = false;
              gameOverMenuCooldown = 20;
              returnToMainMenu();
              menuNavigationCooldown = 20;
            }
          } 
          // Check option 1 (Antdex)
          else if (mx > option1X - option1W/2 && mx < option1X + option1W/2 &&
                   my > option1Y - option1H/2 && my < option1Y + option1H/2) {
            if (menuNavigationCooldown === 0) {
              gameOverMenu = false;
              gameOverMenuCooldown = 20;
              antdexReturnState = 'gameover';
              antdex = true;
              antdexOpenCooldown = 20;
              menuNavigationCooldown = 20;
            }
          }
        }

        // Enter key to select
        if (isConfirmPressed() && menuNavigationCooldown === 0) {
          if (gameOverMenuSelection === 0) {
            gameOverMenu = false;
            gameOverMenuCooldown = 20;
            returnToMainMenu();
          } else if (gameOverMenuSelection === 1) {
            gameOverMenu = false;
            gameOverMenuCooldown = 20;
            antdexReturnState = 'gameover';
            antdex = true;
            antdexOpenCooldown = 20;
          }
          menuNavigationCooldown = 20;
        } else if (gameOverMenuCooldown === 0 && isBackPressed()) {
          gameOverMenu = false;
          gameOverMenuCooldown = 20;
        }
      }
    endMenuScaling();

    if(!endmusic.isPlaying()) {
      gamemusic.stop();
      endmusic.play();
    }
    if (isConfirmPressed() && !gameOverMenu) {
      restartGame();
    }else if (touches.length > 0 && !gameOverMenu) {
      restartGame();
    }
  }

if (timeCount < 0) {
    if(levelEnd == 0){
      // Save the round score before it gets reset (for display purposes)
      intermissionScore = score;
      
      // Only update global totalScore in single player mode
      if (!multiplayerMode) {
        totalScore = totalScore + score;
        score = 0;  // Reset score to prevent double-counting in updateScoreAndTimer
      }
      levelEnd = 1;
      startRoundOutro();
    }
    if (liveRankingsPrinted === false){
      printLiveAntRankings();
      printWinningAntStats();
      recordBestAnts(); // The all-time best ants the final level is built from (finalboss.js)
      onFinalRoundEnded();
      liveRankingsPrinted = true;
    }

    end = true;

    // Outro first: let one more frame draw (so a killed queen is gone from it), then the ants retreat while it plays
    if (roundOutroTimer > 0) {
      if (frameCount > roundOutroStartFrame && !roundOutroSnapshot) {
        roundOutroSnapshot = true;
        startRoundRetreat();
      }
      return;
    }
    if (isFinalEndingDue()) {
      startFinalEnding(); // Beating the Queen of Queens ends the game
      return;
    }
    // Then the round-over screen (and upgrades) slide up into place
    if (intermissionSlideFrame < INTERMISSION_SLIDE_FRAMES) intermissionSlideFrame++;
    menuSlideY = MENU_REFERENCE_HEIGHT * Math.pow(1 - intermissionSlideFrame / INTERMISSION_SLIDE_FRAMES, 3);

    // Multiplayer mode: Don't auto-advance, wait for button press
    // Button handler will check and advance to next player or show scoreboard

    highScore = getItem('newHighScore');
    if (highScore == null) {
      highScore = 0;
    }
    // Only update high score in single player mode during intermission
    if (!multiplayerMode && totalScore > highScore) {
      storeItem('newHighScore', totalScore);
      highScore = totalScore;
    }
    updateDifficultyRecord(totalScore, level);
    updateDifficultyCompletedRound(level); // Surviving the timer completes this round

    const intermissionRound = level;
    const intermissionHealth = health;
    
    // Calculate scores to display based on mode
    let displayScore = intermissionScore;  // Use saved score value
    let displayTotal;
    if (multiplayerMode && players.length > 0) {
      // In multiplayer, show current player's total + this round's score
      displayTotal = players[currentPlayerIndex].totalScore + intermissionScore;
    } else {
      // In single player, use global totalScore
      displayTotal = totalScore;
    }

    beginMenuScaling();
      // Background
      fill(10, 20, 10);
      rectMode(CORNER);
      rect(0, 0, getMenuWidth(), getMenuHeight());
      rectMode(CENTER);
      fill(0, 0, 0, 170);
      rect(getMenuWidth() / 2, getMenuHeight() / 2, getMenuWidth() * 0.65, getMenuHeight() * 0.6, 40);

      textAlign(CENTER, CENTER);
      fill(204, 255, 204);
      textSize(56);
      if (queenDefeatedThisRound) {
        // Killing a queen is what ended this round
        fill(220, 160, 255);
        text(`Queen ${queensDefeatedThisRun} Defeated!`, getMenuWidth() / 2, getMenuHeight() * 0.27);
        textSize(22);
        fill(255, 210, 120);
        text(`Round ${intermissionRound} cleared  ·  +1 queen (${getQueensAvailable()} to spend)`, getMenuWidth() / 2, getMenuHeight() * 0.335);
      } else {
        text(`${getRoundTitle(true)} Cleared`, getMenuWidth() / 2, getMenuHeight() * 0.30);
      }

      textSize(28);
      fill(255);
      text(`Score`, getMenuWidth() / 2 - getMenuWidth() * 0.15, getMenuHeight() * 0.40);
      text(`Total`, getMenuWidth() / 2 + getMenuWidth() * 0.15, getMenuHeight() * 0.40);

      textSize(46);
      fill(240, 164, 0);
      text(Math.round(displayScore), getMenuWidth() / 2 - getMenuWidth() * 0.15, getMenuHeight() * 0.46);
      text(Math.round(displayTotal), getMenuWidth() / 2 + getMenuWidth() * 0.15, getMenuHeight() * 0.46);

      textSize(24);
      fill(160, 220, 255);
      text(`Final Health`, getMenuWidth() / 2 - getMenuWidth() * 0.20, getMenuHeight() * 0.56);
      text(`High Score`, getMenuWidth() / 2 + getMenuWidth() * 0.20, getMenuHeight() * 0.56);

      textSize(40);
      if (health >= 10) {
        fill(120, 255, 120);
      } else {
        fill(255, 90, 90);
      }
      text(intermissionHealth.toFixed(2), getMenuWidth() / 2 - getMenuWidth() * 0.20, getMenuHeight() * 0.61);

      fill(255, 210, 120);
      text(Math.round(highScore), getMenuWidth() / 2 + getMenuWidth() * 0.20, getMenuHeight() * 0.61);

      if (intermissionHealth < 10) {
        const pulsePhase = sin(frameCount * 10);
        const pulseAlpha = map(pulsePhase, -1, 1, 140, 255);
        const pulseScale = map(pulsePhase, -1, 1, 0.92, 1.22);
        push();
          translate(getMenuWidth() / 2 + getMenuWidth() * 0.25, getMenuHeight() / 2 - getMenuHeight() * 0.2);
          angleMode(DEGREES);
          rotate(45);
          scale(pulseScale);
          textAlign(CENTER, CENTER);
          textSize(36);
          fill(255, 120, 120, pulseAlpha);
          text('Close Call!', 0, 0);
        pop();
        angleMode(DEGREES);
      }

    if(!endmusic.isPlaying()) {
      gamemusic.stop();
      endmusic.play();
    }

    // Check if upgrade menu should be shown first
    if (upgradeAvailable && !upgradeMenuActive && !intermissionMenu) {
      upgradeMenuActive = true;
      selectedUpgrade = 0;  // Default to first option
      upgradeKeyDebounce = 0;
      
      // Get upgrade levels and max levels
      pickUpgradeOptions();
      // Constrain selectedUpgrade to valid range
      if (displayedUpgrades.length > 0) {
        selectedUpgrade = constrain(selectedUpgrade, 0, displayedUpgrades.length - 1);
      }
    }

    // Show upgrade screen if active (as its own separate screen)
    if (upgradeMenuActive) {
      endMenuScaling();  // End intermission scaling before upgrade screen
      drawUpgradeScreen();
      
      // Handle case where all upgrades are maxed
      if (displayedUpgrades.length === 0) {
        // Just allow Enter to continue
        if (isConfirmPressed()) {
          if (!upgradeEnterPressed && upgradeKeyDebounce === 0) {
            upgradeAvailable = false;
            upgradeMenuActive = false;
            upgradeKeyDebounce = 20;
          }
          upgradeEnterPressed = true;
        } else {
          upgradeEnterPressed = false;
        }
      } else {
        // Normal upgrade selection logic
        let numOptions = displayedUpgrades.length;
        
        // Handle left/right arrow navigation
        if (upgradeKeyDebounce === 0) {
          if (isLeftPressed()) {  // Left or A
            selectedUpgrade = (selectedUpgrade - 1 + numOptions) % numOptions;
            upgradeKeyDebounce = 10;
          } else if (isRightPressed()) {  // Right or D
            selectedUpgrade = (selectedUpgrade + 1) % numOptions;
            upgradeKeyDebounce = 10;
          }
        }
        
        // Handle number key selection
        if (numOptions >= 1 && keyIsDown(49)) {  // 1
          selectedUpgrade = 0;
        } else if (numOptions >= 2 && keyIsDown(50)) {  // 2
          selectedUpgrade = 1;
        } else if (numOptions >= 3 && keyIsDown(51)) {  // 3
          selectedUpgrade = 2;
        }
        
        // Reroll the offered upgrades (wait for key release between rerolls)
        if (isRerollPressed()) {
          if (!upgradeRerollPressed && upgradeKeyDebounce === 0 && canRerollUpgrades()) {
            upgradeRerolls--;
            pickUpgradeOptions(displayedUpgrades);
            selectedUpgrade = constrain(selectedUpgrade, 0, displayedUpgrades.length - 1);
            upgradeKeyDebounce = 10;
          }
          upgradeRerollPressed = true;
        } else {
          upgradeRerollPressed = false;
        }

        // Confirm selection with Enter (wait for key release between selections)
        if (isConfirmPressed()) {
          if (!upgradeEnterPressed && upgradeKeyDebounce === 0) {
            applyUpgrade(selectedUpgrade);
            upgradeKeyDebounce = 20;
          }
          upgradeEnterPressed = true;
        } else {
          upgradeEnterPressed = false;  // Enter was released, ready for next press
        }
      }
      
      return;  // Don't show normal intermission while upgrade menu is active
    }

    if (!intermissionMenu) {
      push();
        rectMode(CORNER);
        fill(0, 0, 0, 160);
        rect(getMenuWidth() / 2 - getMenuWidth() * 0.275, getMenuHeight() * 0.64, getMenuWidth() * 0.55, getMenuHeight() * 0.12, 18);

        let fadeAlpha = map(sin(frameCount * 1), -1, 1, 30, 70);
        textAlign(CENTER);
        fill(255, fadeAlpha);
        textSize(28);
        text('Press Esc for Menu', getMenuWidth() / 2, getMenuHeight() * 0.675);
        textSize(20);
        text('Press Enter to continue', getMenuWidth() / 2, getMenuHeight() * 0.72);
      pop();

      if (intermissionMenuCooldown === 0 && isBackPressed()) {
        intermissionMenu = true;
        intermissionMenuCooldown = 20;
      }
      if (upgradeKeyDebounce === 0 && isConfirmPressed()) {
        // Multiplayer: check if more players need to play this round
        if (multiplayerMode) {
          // Add score only if not already added this round
          if (!players[currentPlayerIndex].hasPlayedRound) {
            players[currentPlayerIndex].totalScore += score;
            players[currentPlayerIndex].hasPlayedRound = true;
            savePlayerState(currentPlayerIndex);
          }
          
          let alivePlayers = players.filter(p => p.alive);
          let playersWhoPlayed = alivePlayers.filter(p => p.hasPlayedRound);
          
          if (playersWhoPlayed.length < alivePlayers.length) {
            // More players need to play
            advanceToNextAlivePlayer();
            return;
          } else {
            // All players done, show scoreboard
            multiplayerScoreboard = true;
            return;
          }
        }
        landMines.length = 0;
        nextRound();
      } else if (touches.length > 0) {
        landMines.length = 0;
        nextRound();
      }
    } else {
      // Dark background like AntDex
      rectMode(CORNER);
      fill(20);
      rect(0, 0, getMenuWidth(), getMenuHeight());

      // Menu navigation with arrow keys, WASD, and gamepad
      if (menuNavigationCooldown === 0) {
        if (isUpPressed()) { // Up or W
          intermissionMenuSelection = (intermissionMenuSelection - 1 + 2) % 2;
          menuNavigationCooldown = 10;
        } else if (isDownPressed()) { // Down or S
          intermissionMenuSelection = (intermissionMenuSelection + 1) % 2;
          menuNavigationCooldown = 10;
        }
      }

      // Title
      textAlign(CENTER);
      fill(255);
      textSize(60);
      text('Intermission Menu', getMenuWidth() / 2, getMenuHeight() * 0.30);
      
      // Menu option 0: Next Round - Card style
      let option0Y = getMenuHeight() * 0.45;
      let option0X = getMenuWidth() / 2;
      let option0W = 320;
      let option0H = 70;
      push();
        rectMode(CENTER);
        if (intermissionMenuSelection === 0) {
          fill(255);  // White background for selected
          stroke(255, 255, 100);
          strokeWeight(3);
        } else {
          fill(50, 50, 50);  // Dark grey for unselected
          stroke(100, 100, 100);
          strokeWeight(2);
        }
        rect(option0X, option0Y, option0W, option0H, 12);
        
        // Text
        if (intermissionMenuSelection === 0) {
          fill(10);  // Dark text on white
        } else {
          fill(255);  // White text on dark
        }
        textSize(28);
        textAlign(CENTER, CENTER);
        text('Next Round', option0X, option0Y);
      pop();
      
      // Menu option 1: Antdex - Card style
      let option1Y = getMenuHeight() * 0.57;
      let option1X = getMenuWidth() / 2;
      let option1W = 320;
      let option1H = 70;
      push();
        rectMode(CENTER);
        if (intermissionMenuSelection === 1) {
          fill(255);  // White background for selected
          stroke(160, 120, 255);  // Purple stroke like exotic tab
          strokeWeight(3);
        } else {
          fill(50, 50, 50);  // Dark grey for unselected
          stroke(100, 100, 100);
          strokeWeight(2);
        }
        rect(option1X, option1Y, option1W, option1H, 12);
        
        // Text
        if (intermissionMenuSelection === 1) {
          fill(10);  // Dark text on white
        } else {
          fill(255);  // White text on dark
        }
        textSize(28);
        textAlign(CENTER, CENTER);
        text('Antdex', option1X, option1Y);
      pop();
      
      // Instructions with fade
      let fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
      fill(200, fadeAlpha);
      textSize(18);
      textAlign(CENTER);
        text('W/S or ↑/↓ or Left Stick  Navigate  |  Enter or A  Confirm  |  Esc or B  Back', getMenuWidth() / 2, getMenuHeight() * 0.75);

        // Mouse click detection
        if (mouseIsPressed) {
          let mx = getMenuMouseX();
          let my = getMenuMouseY();
          
          // Check option 0 (Next Round)
          if (mx > option0X - option0W/2 && mx < option0X + option0W/2 &&
              my > option0Y - option0H/2 && my < option0Y + option0H/2) {
            if (menuNavigationCooldown === 0) {
              intermissionMenu = false;
              intermissionMenuCooldown = 20;
              landMines.length = 0;
              nextRound();
              menuNavigationCooldown = 20;
            }
          } 
          // Check option 1 (Antdex)
          else if (mx > option1X - option1W/2 && mx < option1X + option1W/2 &&
                   my > option1Y - option1H/2 && my < option1Y + option1H/2) {
            if (menuNavigationCooldown === 0) {
              intermissionMenu = false;
              intermissionMenuCooldown = 20;
              antdexReturnState = 'intermission';
              antdex = true;
              antdexOpenCooldown = 20;
              menuNavigationCooldown = 20;
            }
          }
        }

      // Enter key to select
          if (isConfirmPressed() && menuNavigationCooldown === 0) {
        if (intermissionMenuSelection === 0) {
          intermissionMenu = false;
          intermissionMenuCooldown = 20;
              landMines.length = 0;
              nextRound();
        } else if (intermissionMenuSelection === 1) {
          intermissionMenu = false;
          intermissionMenuCooldown = 20;
          antdexReturnState = 'intermission';
          antdex = true;
          antdexOpenCooldown = 20;
        }
        menuNavigationCooldown = 20;
      } else if (intermissionMenuCooldown === 0 && isBackPressed()) {
        intermissionMenu = false;
        intermissionMenuCooldown = 20;
      }
    }
    
    endMenuScaling();
  }
}

function drawUpgradeScreen() {
  // Define all 20 upgrade options with their max levels
  let upgradeMaxLevels = UPGRADE_MAX_LEVELS;
  let allUpgrades = [
    {
      title: 'Walking Speed',
      description: 'Increase your movement speed.',
      level: upgrade1Level,
      maxLevel: 4
    },
    {
      title: 'Dash Speed',
      description: 'Increase dash velocity.',
      level: upgrade2Level,
      maxLevel: 5
    },
    {
      title: 'Dash Cooldown',
      description: 'Reduce time between dashes.',
      level: upgrade3Level,
      maxLevel: 5
    },
    {
      title: 'Add Shield',
      description: 'Increase shield capacity.',
      level: upgrade4Level,
      maxLevel: 9
    },
    {
      title: 'Add Bullets',
      description: 'Increase bullet capacity.',
      level: upgrade5Level,
      maxLevel: 8
    },
    {
      title: 'Shield Regeneration',
      description: 'Regenerate shields over time.',
      level: upgrade6Level,
      maxLevel: 5
    },
    {
      title: 'Bullet Reload',
      description: 'Faster bullet reload speed.',
      level: upgrade7Level,
      maxLevel: 5
    },
    {
      title: 'Bullet Speed',
      description: 'Increase bullet velocity.',
      level: upgrade8Level,
      maxLevel: 5
    },
    {
      title: 'Free-Angle Aiming',
      description: 'Aim with mouse or right stick. Requires all bullet upgrades.',
      level: upgrade9Level,
      maxLevel: 1
    },
    {
      title: 'Tiger Beetle',
      description: 'Transform into a tiger beetle! Dash becomes a toggle instead of a burst. While dashing, threats become invisible but flash briefly.',
      level: upgrade10Level,
      maxLevel: 1
    },
    {
      title: 'Oogpister Beetle',
      description: '20% chance to instantly reload 1 bullet when killing an ant by eating it. Requires Bullet Reload level 3+.',
      level: upgrade11Level,
      maxLevel: 1
    },
    {
      title: 'Horns',
      description: 'Increase dash damage. Each level adds 0.2 damage. Unlocks after round 5.',
      level: upgrade12Level,
      maxLevel: 4
    },
    {
      title: 'Potent Acid',
      description: 'Increase bullet damage. Each level adds 20% damage (doubles at max level). Requires Add Bullets. Unlocks after round 5.',
      level: upgrade13Level,
      maxLevel: 4
    },
    {
      title: 'Shockwave',
      description: 'Unlock a circular AOE shockwave attack (E key / RB). Deals knockback and 0.5 damage. Unlocks after round 5.',
      level: upgrade14Level,
      maxLevel: 1
    },
    {
      title: 'Shockwave Radius',
      description: 'Increase shockwave radius. Each level adds 27 pixels (90→225). Requires Shockwave.',
      level: upgrade15Level,
      maxLevel: 5
    },
    {
      title: 'Shockwave Damage',
      description: 'Increase shockwave damage. Each level adds 0.14 (0.5→1.2). Requires Shockwave.',
      level: upgrade16Level,
      maxLevel: 5
    },
    {
      title: 'Shockwave Cooldown',
      description: 'Reduce shockwave cooldown. 2.25s→1.875s→1.5s→1.125s→0.75s→0.375s. Requires Shockwave.',
      level: upgrade17Level,
      maxLevel: 5
    },
    {
      title: 'Shockwave Knockback',
      description: 'Increase shockwave knockback. Each level adds 2 base knockback (4→10). Requires Shockwave.',
      level: upgrade18Level,
      maxLevel: 3
    },
    {
      title: 'Bullet Deflection',
      description: 'Shockwave deflects enemy bullets into player bullets. Starts at 20%, +20% per level (20%→90%). Requires Shockwave.',
      level: upgrade19Level,
      maxLevel: 4
    },
    {
      title: 'Health Regeneration',
      description: 'Regenerate health after 200 frames without taking damage. Can exceed 10 health but slows down, stopping at 30. Rates: 0.001→0.1/frame. Unlocks after round 5.',
      level: upgrade20Level,
      maxLevel: 5
    },
    {
      title: 'Runt Hunter',
      description: 'Ants smaller than normal give score and EXP inversely proportional to their size.',
      level: upgrade21Level,
      maxLevel: 1
    },
    {
      title: 'Increased Metabolism',
      description: 'Each level makes EXP levels 10% cheaper (up to 70%).',
      level: upgrade22Level,
      maxLevel: 7
    },
    {
      title: 'EXP Boost',
      description: 'Each level makes ants give 10% more score and EXP (up to +100%).',
      level: upgrade23Level,
      maxLevel: 10
    },
    {
      title: 'Combo Surge',
      description: 'The combo bonus grows every 4, 3, 2, then every 1 kill instead of every 5.',
      level: upgrade24Level,
      maxLevel: 4
    },
    {
      title: 'Dash Harvest',
      description: 'Double score and EXP for ants killed by dashing.',
      level: upgrade25Level,
      maxLevel: 1
    },
    {
      title: 'Shockwave Harvest',
      description: 'Double score and EXP for ants killed by your shockwave. Requires Shockwave.',
      level: upgrade26Level,
      maxLevel: 1
    },
    {
      title: 'Bullet Harvest',
      description: 'Double score and EXP for ants killed by your bullets. Requires Add Bullets.',
      level: upgrade27Level,
      maxLevel: 1
    },
    {
      title: 'Spray Acid',
      description: 'Unlock the spray shot mode: an instant grey cone of acid. Costs 2 ammo. Requires Add Bullets.',
      level: upgrade28Level,
      maxLevel: 1
    },
    {
      title: 'Spray Length',
      description: 'Lengthen the spray cone. Each level adds 25 pixels (100→200). Requires Spray Acid.',
      level: upgrade29Level,
      maxLevel: 4
    },
    {
      title: 'Spray Width',
      description: 'Widen the spray cone. Each level adds 20 pixels (20→100). Requires Spray Acid.',
      level: upgrade30Level,
      maxLevel: 4
    },
    {
      title: 'Piercing Acid',
      description: 'Unlock the piercing shot mode: blue bullets that pass through 1 ant. Costs 2 ammo. Requires Add Bullets.',
      level: upgrade31Level,
      maxLevel: 1
    },
    {
      title: 'Piercing Depth',
      description: 'Piercing bullets pass through 1 more ant per level (1→10). Requires Piercing Acid.',
      level: upgrade32Level,
      maxLevel: 9
    },
    {
      title: 'Impact Bomb',
      description: 'Unlock the impact bomb shot mode: explodes on impact. Costs 2 ammo. Requires Add Bullets.',
      level: upgrade33Level,
      maxLevel: 1
    },
    {
      title: 'Timed Bomb',
      description: 'Unlock the timed bomb shot mode: explodes after 1 second. Requires Impact Bomb.',
      level: upgrade34Level,
      maxLevel: 1
    },
    {
      title: 'Proximity Bomb',
      description: 'Unlock the proximity bomb shot mode: explodes when an ant comes within half the blast radius. Requires Timed Bomb.',
      level: upgrade35Level,
      maxLevel: 1
    },
    {
      title: 'Blast Radius',
      description: 'Increase bomb blast radius. Each level adds 40 pixels (60→180). Requires Impact Bomb.',
      level: upgrade36Level,
      maxLevel: 3
    },
    {
      title: 'Lady Beetle',
      description: 'Aphids appear on the field. Eat one for 2 health. Ants that stay near one for a while get 0.5 health.',
      level: upgrade37Level,
      maxLevel: 1
    },
    {
      title: 'Aphid Health',
      description: 'Aphids heal more: +1 for you and +0.25 for ants per level (2→5, 0.5→1.25). Requires Lady Beetle.',
      level: upgrade38Level,
      maxLevel: 3
    },
    {
      title: 'Aphid Spawn Rate',
      description: 'Aphids appear more often (every 20s→15s→10s). Requires Lady Beetle.',
      level: upgrade39Level,
      maxLevel: 2
    },
    {
      title: 'Speedy Aphids',
      description: 'Yellow aphids (10%) double movement speed for 5 seconds. Ants near them get the same. Requires Lady Beetle.',
      level: upgrade40Level,
      maxLevel: 1
    },
    {
      title: 'Armored Aphids',
      description: 'Blue aphids (10%) halve damage taken for 5 seconds. Ants near them get the same. Requires Lady Beetle.',
      level: upgrade41Level,
      maxLevel: 1
    },
    {
      title: 'Wise Aphids',
      description: 'Purple aphids (10%) double EXP for 5 seconds. Ants near them max out one stat for 5 seconds. Requires Lady Beetle.',
      level: upgrade42Level,
      maxLevel: 1
    },
    {
      title: 'Healthy Aphids',
      description: 'Pink aphids (10%) double bullet, shield, health and cooldown regeneration for 5 seconds. Ants near them get the same. Requires Lady Beetle.',
      level: upgrade43Level,
      maxLevel: 1
    },
    {
      title: 'Lucky Aphids',
      description: 'Orange aphids (5%) give an extra reroll. Ants near them get a random ability for 5 seconds. Requires Lady Beetle.',
      level: upgrade44Level,
      maxLevel: 1
    },
    {
      title: 'Mound Ring',
      description: 'Shockwave variant (R / LB to switch): blast, and raise a ring of mounds that traps you and the ants inside for 3 seconds. 2x cooldown. Requires Shockwave.',
      level: upgrade45Level,
      maxLevel: 1
    },
    {
      title: 'Bunker',
      description: 'Shockwave variant (R / LB to switch): dig in for 3 seconds. The bunker takes hits for you; you can still aim and shoot. 2x cooldown. Requires Shockwave.',
      level: upgrade46Level,
      maxLevel: 1
    },
    {
      title: 'Vortex',
      description: 'Shockwave variant (R / LB to switch): pull ants in from 1.5x the radius, then blast them out. 1.5x cooldown. Requires Shockwave.',
      level: upgrade47Level,
      maxLevel: 1
    },
    {
      title: 'Flight and Slam',
      description: 'Shockwave variant (R / LB to switch): fly over bullets, then slam down with a double radius, double damage shockwave. 3x cooldown. Requires Shockwave.',
      level: upgrade48Level,
      maxLevel: 1
    },
    {
      title: 'Mound Health',
      description: 'Your mounds and bunker take more hits. +1 health per level (1→5). Requires Mound Ring or Bunker.',
      level: upgrade49Level,
      maxLevel: 4
    },
    {
      title: 'Flight Duration',
      description: 'Fly longer before the slam. +0.5 seconds per level (0.5s→3s). Requires Flight and Slam.',
      level: upgrade50Level,
      maxLevel: 5
    },
    {
      title: 'Starting Health',
      description: 'Start every round with 5 more health per level (10→30).',
      level: upgrade51Level,
      maxLevel: 4
    },
    {
      title: 'Dash Deflection',
      description: 'Bullets that hit you while dashing can be deflected, with the same chance as the shockwave.',
      level: upgrade52Level,
      maxLevel: 1
    },
    {
      title: 'Shell Shrapnel',
      description: 'Losing a shield to a bullet throws shrapnel back that deals 1 damage to ants. Requires Add Shield.',
      level: upgrade53Level,
      maxLevel: 1
    },
    {
      title: 'Shrapnel Count',
      description: 'More shrapnel per shield lost. +1 per level (1→3). Requires Shell Shrapnel.',
      level: upgrade54Level,
      maxLevel: 2
    }
  ];
  
  // Get the randomly selected upgrades
  let upgrades = displayedUpgrades.map(index => allUpgrades[index]);
  let numOptions = displayedUpgrades.length;

  // Helper: concise upgrade summary (what it does, current stat, next stat)
  function getUpgradeSummary(upgradeIndex, level) {
    // helper to clamp next level
    const nextLevel = Math.min(level + 1, allUpgrades[upgradeIndex].maxLevel);
    switch (upgradeIndex) {
      case 0: { // Walking Speed
        const vals = [3, 3.5, 4, 4.5, 5];
        const cur = vals[level];
        const nxt = vals[nextLevel];
        return `Increase movement speed. Current: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : nxt}`;
      }
      case 1: { // Dash Speed
        const vals = [2,3,4,5,6,7];
        const cur = vals[level];
        const nxt = vals[nextLevel];
        return `Increase dash speed. Current: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : nxt}`;
      }
      case 2: { // Dash Cooldown
        const vals = [3,2.5,2,1.5,1,0.5];
        const cur = vals[level];
        const nxt = vals[nextLevel];
        return `Reduce dash cooldown. Current: ${cur}s → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur}s (min)` : `${nxt}s`}`;
      }
      case 3: { // Add Shield
        const cur = level;
        const nxt = nextLevel;
        return `Increase shield capacity. Current: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : nxt}`;
      }
      case 4: { // Add Bullets
        const vals = [0,2,4,6,8,10,12,14,16];
        const cur = vals[level];
        const nxt = vals[nextLevel];
        return `Increase bullet capacity. Current: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : nxt}`;
      }
      case 5: { // Shield Regeneration
        const vals = [600,500,400,300,200,100];
        const cur = vals[level];
        const nxt = vals[nextLevel];
        return `Regenerate shields faster. Current rate divisor: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (best)` : nxt}`;
      }
      case 6: { // Bullet Reload
        const vals = [180,150,120,90,60,30];
        const cur = vals[level];
        const nxt = vals[nextLevel];
        return `Faster bullet reload (frames). Current: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (fastest)` : nxt}`;
      }
      case 7: { // Bullet Speed
        const vals = [1,2,4,6,8,10];
        const cur = vals[level];
        const nxt = vals[nextLevel];
        return `Increase bullet velocity. Current: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : nxt}`;
      }
      case 8: { // Free-Angle Aiming
        return level > 0 ? 'Aim with mouse/right stick. Current: ON' : 'Aim with mouse/right stick. Current: OFF → Next: ON';
      }
      case 9: { // Tiger Beetle
        return level > 0 ? 'Tiger Beetle form unlocked. Current: ON' : 'Tiger Beetle form (dash toggles). Current: OFF → Next: ON';
      }
      case 10: { // Oogpister Beetle
        return level > 0 ? '20% chance to reload 1 bullet on kill. Current: ON' : '20% chance to reload 1 bullet on kill. Current: OFF → Next: ON';
      }
      case 11: { // Horns
        const cur = (level * 0.2).toFixed(2);
        const nxt = (nextLevel * 0.2).toFixed(2);
        return `Increase dash damage. Current extra: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : nxt}`;
      }
      case 12: { // Potent Acid
        const cur = (1 + level * 0.2).toFixed(2);
        const nxt = (1 + nextLevel * 0.2).toFixed(2);
        return `Increase bullet damage multiplier. Current: ×${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `×${cur} (max)` : `×${nxt}`}`;
      }
      case 13: { // Shockwave
        return level > 0 ? 'Unlock shockwave attack. Current: ON' : 'Unlock shockwave attack. Current: OFF → Next: ON';
      }
      case 14: { // Shockwave Radius
        const cur = 60 + (level * 18);
        const nxt = 60 + (nextLevel * 18);
        return `Increase shockwave radius. Current: ${cur}px → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur}px (max)` : `${nxt}px`}`;
      }
      case 15: { // Shockwave Damage
        const cur = (0.5 + level * 0.14).toFixed(2);
        const nxt = (0.5 + nextLevel * 0.14).toFixed(2);
        return `Increase shockwave damage. Current: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : nxt}`;
      }
      case 16: { // Shockwave Cooldown
        const vals = [2.25,1.875,1.5,1.125,0.75,0.375];
        const cur = vals[level];
        const nxt = vals[nextLevel];
        return `Reduce shockwave cooldown. Current: ${cur}s → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur}s (min)` : `${nxt}s`}`;
      }
      case 17: { // Shockwave Knockback
        const cur = 4 + (level * 2);
        const nxt = 4 + (nextLevel * 2);
        return `Increase shockwave knockback. Current: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : nxt}`;
      }
      case 18: { // Bullet Deflection
        const cur = Math.round(getDeflectChance(level) * 100) + '%';
        const nxt = Math.round(getDeflectChance(nextLevel) * 100) + '%';
        return `Shockwave bullet deflection. Current: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : nxt}`;
      }
      case 19: { // Health Regeneration
        const rates = [0,0.001,0.005,0.01,0.05,0.1];
        const cur = rates[level] ? rates[level] : 0;
        const nxt = rates[nextLevel] ? rates[nextLevel] : 0;
        return `Regenerate health when safe. Current: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : nxt}`;
      }
      case 20: { // Runt Hunter
        return 'Small ants give score and EXP inversely proportional to size (1/3 size = 3×).';
      }
      case 21: { // Increased Metabolism
        return `EXP levels cost less. Current: -${level * 10}% → ${level === allUpgrades[upgradeIndex].maxLevel ? `-${level * 10}% (max)` : `-${nextLevel * 10}%`}`;
      }
      case 22: { // EXP Boost
        return `Ants give more score and EXP. Current: +${level * 10}% → ${level === allUpgrades[upgradeIndex].maxLevel ? `+${level * 10}% (max)` : `+${nextLevel * 10}%`}`;
      }
      case 23: { // Combo Surge
        return `Combo bonus (+50%) grows every ${5 - level} kills → ${level === allUpgrades[upgradeIndex].maxLevel ? `${5 - level} (max)` : `every ${5 - nextLevel}`}`;
      }
      case 24: { // Dash Harvest
        return 'Ants killed by dashing give double score and EXP.';
      }
      case 25: { // Shockwave Harvest
        return 'Ants killed by your shockwave give double score and EXP.';
      }
      case 26: { // Bullet Harvest
        return 'Ants killed by your bullets give double score and EXP.';
      }
      case 27: { // Spray Acid
        return 'Unlock spray shots (Q / right click / LT to switch). An instant grey cone of acid for 2 ammo.';
      }
      case 28: { // Spray Length
        const cur = getSprayLength(level);
        const nxt = getSprayLength(nextLevel);
        return `Lengthen the spray cone. Current: ${cur}px → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur}px (max)` : `${nxt}px`}`;
      }
      case 29: { // Spray Width
        const cur = getSprayWidth(level);
        const nxt = getSprayWidth(nextLevel);
        return `Widen the spray cone. Current: ${cur}px → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur}px (max)` : `${nxt}px`}`;
      }
      case 30: { // Piercing Acid
        return 'Unlock piercing shots (Q / right click / LT to switch). Blue bullets pass through 1 ant, for 2 ammo.';
      }
      case 31: { // Piercing Depth
        const cur = getPierceCount(level);
        const nxt = getPierceCount(nextLevel);
        return `Pierce more ants. Current: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : nxt}`;
      }
      case 32: { // Impact Bomb
        return 'Unlock impact bombs (Q / right click / LT to switch). Explodes on impact, for 2 ammo.';
      }
      case 33: { // Timed Bomb
        return 'Unlock timed bombs. Explodes 1 second after firing, for 2 ammo.';
      }
      case 34: { // Proximity Bomb
        return `Unlock proximity bombs. Explodes when an ant comes within ${getBombRadius() / 2}px (half the blast radius), for 2 ammo.`;
      }
      case 35: { // Blast Radius
        const cur = getBombRadius(level);
        const nxt = getBombRadius(nextLevel);
        return `Increase bomb blast radius. Current: ${cur}px → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur}px (max)` : `${nxt}px`}`;
      }
      case 36: { // Lady Beetle
        return `Aphids appear every ${APHID_SPAWN_SECONDS[upgrade39Level]}s. Eat one for ${APHID_PLAYER_HEAL[upgrade38Level]} health; ants that stay near one get ${APHID_ANT_HEAL[upgrade38Level]}.`;
      }
      case 37: { // Aphid Health
        const isMax = level === allUpgrades[upgradeIndex].maxLevel;
        return `Aphids heal more. You: ${APHID_PLAYER_HEAL[level]} → ${isMax ? `${APHID_PLAYER_HEAL[level]} (max)` : APHID_PLAYER_HEAL[nextLevel]}, ants: ${APHID_ANT_HEAL[level]} → ${isMax ? `${APHID_ANT_HEAL[level]} (max)` : APHID_ANT_HEAL[nextLevel]}`;
      }
      case 38: { // Aphid Spawn Rate
        const cur = APHID_SPAWN_SECONDS[level];
        const nxt = APHID_SPAWN_SECONDS[nextLevel];
        return `Aphids appear more often. Every: ${cur}s → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur}s (max)` : `${nxt}s`}`;
      }
      case 39: { // Speedy Aphids
        return 'Unlock yellow aphids (10%): double movement speed for 5 seconds. Ants near one get the same.';
      }
      case 40: { // Armored Aphids
        return 'Unlock blue aphids (10%): take half damage for 5 seconds. Ants near one get the same.';
      }
      case 41: { // Wise Aphids
        return 'Unlock purple aphids (10%): double EXP for 5 seconds. Ants near one max out a stat for 5 seconds.';
      }
      case 42: { // Healthy Aphids
        return 'Unlock pink aphids (10%): bullets, shields, health and cooldowns regenerate twice as fast for 5 seconds. Ants near one get the same.';
      }
      case 43: { // Lucky Aphids
        return 'Unlock orange aphids (5%): +1 reroll. Ants near one get a random ability for 5 seconds.';
      }
      case 48: { // Mound Health
        const cur = getMoundHealth(level);
        return `Your mounds and bunker take more hits. Health: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : getMoundHealth(nextLevel)}`;
      }
      case 49: { // Flight Duration
        const cur = getFlightSeconds(level);
        return `Fly longer before the slam. Flight: ${cur}s → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur}s (max)` : `${getFlightSeconds(nextLevel)}s`}`;
      }
      case 50: { // Starting Health
        const cur = getStartingHealth(level);
        return `Start every round with more health. Current: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : getStartingHealth(nextLevel)}`;
      }
      case 51: { // Dash Deflection
        return `Bullets that hit you while dashing are deflected ${Math.round(getDeflectChance() * 100)}% of the time (the shockwave's deflection chance).`;
      }
      case 53: { // Shrapnel Count
        const cur = getShrapnelCount(level);
        return `More shrapnel per shield lost. Pieces: ${cur} → ${level === allUpgrades[upgradeIndex].maxLevel ? `${cur} (max)` : getShrapnelCount(nextLevel)}`;
      }
      default:
        return allUpgrades[upgradeIndex].description;
    }
  }

  // Helper: compute current and next display values for bottom of card
  function getUpgradeValues(upgradeIndex, level) {
    const nextLevel = Math.min(level + 1, allUpgrades[upgradeIndex].maxLevel);
    let cur = '';
    let nxt = '';
    let isMax = (level >= allUpgrades[upgradeIndex].maxLevel);
    switch (upgradeIndex) {
      case 0: { const vals=[3,3.5,4,4.5,5]; cur = `${vals[level]}`; nxt = `${vals[nextLevel]}`; break; }
      case 1: { const vals=[2,3,4,5,6,7]; cur = `${vals[level]}`; nxt = `${vals[nextLevel]}`; break; }
      case 2: { const vals=[3,2.5,2,1.5,1,0.5]; cur = `${vals[level]}s`; nxt = `${vals[nextLevel]}s`; break; }
      case 3: { cur = `${level}`; nxt = `${nextLevel}`; break; }
      case 4: { const vals=[0,2,4,6,8,10,12,14,16]; cur = `${vals[level]}`; nxt = `${vals[nextLevel]}`; break; }
      case 5: { const vals=[600,500,400,300,200,100]; cur = `${vals[level]}`; nxt = `${vals[nextLevel]}`; break; }
      case 6: { const vals=[180,150,120,90,60,30]; cur = `${vals[level]}`; nxt = `${vals[nextLevel]}`; break; }
      case 7: { const vals=[1,2,4,6,8,10]; cur = `${vals[level]}`; nxt = `${vals[nextLevel]}`; break; }
      case 8: { cur = level > 0 ? 'ON' : 'OFF'; nxt = 'ON'; break; }
      case 9: { cur = level > 0 ? 'ON' : 'OFF'; nxt = 'ON'; break; }
      case 10:{ cur = level > 0 ? 'ON' : 'OFF'; nxt = 'ON'; break; }
      case 11:{ cur = (level * 0.2).toFixed(2); nxt = (nextLevel * 0.2).toFixed(2); break; }
      case 12:{ cur = (1 + level * 0.2).toFixed(2); nxt = (1 + nextLevel * 0.2).toFixed(2); break; }
      case 13:{ cur = level > 0 ? 'ON' : 'OFF'; nxt = 'ON'; break; }
      case 14:{ cur = `${60 + (level * 18)}px`; nxt = `${60 + (nextLevel * 18)}px`; break; }
      case 15:{ cur = (0.5 + level * 0.14).toFixed(2); nxt = (0.5 + nextLevel * 0.14).toFixed(2); break; }
      case 16:{ const vals=[2.25,1.875,1.5,1.125,0.75,0.375]; cur = `${vals[level]}s`; nxt = `${vals[nextLevel]}s`; break; }
      case 17:{ cur = `${4 + (level * 2)}`; nxt = `${4 + (nextLevel * 2)}`; break; }
      case 18:{ cur = `${Math.round(getDeflectChance(level) * 100)}%`; nxt = `${Math.round(getDeflectChance(nextLevel) * 100)}%`; break; }
      case 19:{ const rates=[0,0.001,0.005,0.01,0.05,0.1]; cur = `${rates[level]}`; nxt = `${rates[nextLevel]}`; break; }
      case 20:{ cur = level > 0 ? 'ON' : 'OFF'; nxt = 'ON'; break; }
      case 21:{ cur = `-${level * 10}%`; nxt = `-${nextLevel * 10}%`; break; }
      case 22:{ cur = `+${level * 10}%`; nxt = `+${nextLevel * 10}%`; break; }
      case 23:{ cur = `every ${5 - level}`; nxt = `every ${5 - nextLevel}`; break; }
      case 24:
      case 25:
      case 26:{ cur = level > 0 ? 'ON' : 'OFF'; nxt = 'ON'; break; }
      case 28:{ cur = `${getSprayLength(level)}px`; nxt = `${getSprayLength(nextLevel)}px`; break; }
      case 29:{ cur = `${getSprayWidth(level)}px`; nxt = `${getSprayWidth(nextLevel)}px`; break; }
      case 31:{ cur = `${getPierceCount(level)}`; nxt = `${getPierceCount(nextLevel)}`; break; }
      case 35:{ cur = `${getBombRadius(level)}px`; nxt = `${getBombRadius(nextLevel)}px`; break; }
      case 37:{ cur = `${APHID_PLAYER_HEAL[level]}`; nxt = `${APHID_PLAYER_HEAL[nextLevel]}`; break; }
      case 38:{ cur = `${APHID_SPAWN_SECONDS[level]}s`; nxt = `${APHID_SPAWN_SECONDS[nextLevel]}s`; break; }
      case 36:
      case 39:
      case 40:
      case 41:
      case 42:
      case 43:{ cur = level > 0 ? 'ON' : 'OFF'; nxt = 'ON'; break; }
      case 48:{ cur = `${getMoundHealth(level)}`; nxt = `${getMoundHealth(nextLevel)}`; break; }
      case 49:{ cur = `${getFlightSeconds(level)}s`; nxt = `${getFlightSeconds(nextLevel)}s`; break; }
      case 50:{ cur = `${getStartingHealth(level)}`; nxt = `${getStartingHealth(nextLevel)}`; break; }
      case 53:{ cur = `${getShrapnelCount(level)}`; nxt = `${getShrapnelCount(nextLevel)}`; break; }
      case 44:
      case 45:
      case 46:
      case 47:
      case 51:
      case 52:{ cur = level > 0 ? 'ON' : 'OFF'; nxt = 'ON'; break; }
      case 27:
      case 30:
      case 32:
      case 33:
      case 34:{ cur = level > 0 ? 'ON' : 'OFF'; nxt = 'ON'; break; }
      default: { cur = ''; nxt = ''; }
    }
    return { cur, nxt, isMax };
  }

  beginMenuScaling();
    // Background - matching AntDex background
    fill(20);
    rectMode(CORNER);
    rect(0, 0, getMenuWidth(), getMenuHeight());
    
    // Pulsing title at top
    let pulseSize = map(sin(frameCount * 0.08), -1, 1, 48, 56);
    fill(255);
    stroke(0);
    strokeWeight(4);
    textSize(pulseSize);
    textAlign(CENTER, CENTER);
    
    // Check if all upgrades are maxed
    if (numOptions === 0) {
      text('ALL STATS MAXED OUT!', getMenuWidth() / 2, getMenuHeight() * 0.08);
      
      // Show message
      fill(255);
      noStroke();
      textSize(32);
      text('You have reached maximum level on all upgrades!', getMenuWidth() / 2, getMenuHeight() * 0.35);
      
      let fadeAlpha = map(sin(frameCount * 1), -1, 1, 30, 70);
      fill(180, fadeAlpha);
      textSize(24);
      text('Press Enter to continue', getMenuWidth() / 2, getMenuHeight() * 0.65);
    } else {
      text('LEVEL UP! Choose an Upgrade', getMenuWidth() / 2, getMenuHeight() * 0.08);

      // Draw side-by-side cards
      let cardWidth = getMenuWidth() * 0.25;
      let cardHeight = getMenuHeight() * 0.48;
      let cardY = getMenuHeight() * 0.50;
      let spacing = getMenuWidth() * 0.05;
      let totalWidth = (cardWidth * numOptions) + (spacing * (numOptions - 1));
      let startX = (getMenuWidth() - totalWidth) / 2 + cardWidth / 2;

      for (let i = 0; i < numOptions; i++) {
      let cardX = startX + i * (cardWidth + spacing);
      
      // Card background - using AntDex color scheme
      rectMode(CENTER);
      if (selectedUpgrade === i) {
        // Selected card - white like normal AntDex cards
        stroke(255);
        strokeWeight(6);
        fill(235);
      } else {
        // Unselected card - dark grey
        stroke(90, 90, 90);
        strokeWeight(2);
        fill(40);
      }
      rect(cardX, cardY, cardWidth, cardHeight, 15);

      // Number indicator at top
      if (selectedUpgrade === i) {
        fill(10);  // Dark text on white background
      } else {
        fill(180);  // Light grey text on dark background
      }
      noStroke();
      textSize(18);
      textAlign(CENTER, CENTER);
      text(`[${i + 1}]`, cardX, cardY - cardHeight * 0.40);

      // Rarity tag
      let rarity = getUpgradeRarity(displayedUpgrades[i]);
      if (rarity.label) {
        fill(rarity.color[0], rarity.color[1], rarity.color[2]);
        textSize(16);
        text(rarity.label, cardX, cardY - cardHeight * 0.35);
      }

      // Title
      if (selectedUpgrade === i) {
        fill(10);  // Dark text on white background
      } else {
        fill(255);  // White text on dark background
      }
      textSize(28);
      textAlign(CENTER, CENTER);
      text(upgrades[i].title, cardX, cardY - cardHeight * 0.28);

      // Description (concise)
      let desc = getUpgradeSummary(displayedUpgrades[i], upgrades[i].level);
      if (selectedUpgrade === i) {
        fill(40);  // Dark grey text on white background
      } else {
        fill(180);  // Light grey text on dark background
      }
      textSize(16);
      textAlign(CENTER, TOP);
      text(desc, cardX, cardY + cardHeight * 0.02, cardWidth * 0.8, cardHeight * 0.4);

      // Values at bottom: show current → next (next in green)
      textSize(20);
      textAlign(CENTER, CENTER);
      let vals = getUpgradeValues(displayedUpgrades[i], upgrades[i].level);
      let bottomY = cardY + cardHeight * 0.38;
      if (vals.isMax) {
        if (selectedUpgrade === i) fill(10); else fill(255);
        text('MAX LEVEL', cardX, bottomY);
      } else {
        // Draw current (white or dark on selected) and next (green)
        let curText = vals.cur;
        let nxtText = vals.nxt;
        textSize(20);
        let arrow = ' → ';
        // measure widths to position pieces
        let curW = textWidth(curText);
        let arrowW = textWidth(arrow);
        let nxtW = textWidth(nxtText);
        let totalW = curW + arrowW + nxtW;
        // current
        let curX = cardX - totalW / 2 + curW / 2;
        if (selectedUpgrade === i) fill(10); else fill(255);
        text(curText, curX, bottomY);
        // arrow
        let arrowX = cardX - totalW / 2 + curW + arrowW / 2;
        fill(180);
        text(arrow, arrowX, bottomY);
        // next (green)
        let nxtX = cardX - totalW / 2 + curW + arrowW + nxtW / 2;
        if (selectedUpgrade === i) fill(0,160,0); else fill(0,220,0);
        text(nxtText, nxtX, bottomY);
      }
    }

      // Fade effect for navigation elements
      let fadeAlpha = map(sin(frameCount * 1), -1, 1, 30, 70);

      // Navigation arrows with fade
      fill(180, fadeAlpha);  // Light grey with fading alpha
      noStroke();
      textSize(48);
      textAlign(CENTER, CENTER);
      if (selectedUpgrade > 0) {
        text('◄', getMenuWidth() * 0.1, cardY);
      }
      if (selectedUpgrade < numOptions - 1) {
        text('►', getMenuWidth() * 0.9, cardY);
      }

      // Instructions with fade effect
      fill(180, fadeAlpha);  // Light grey with fading alpha
      noStroke();
      textSize(20);
      textAlign(CENTER, CENTER);
      let navText = '← →  Navigate  |  ';
      for (let i = 0; i < numOptions; i++) {
        navText += (i + 1);
        if (i < numOptions - 1) navText += ' ';
      }
      navText += '  Quick Select  |  Enter  Confirm';
      text(navText, getMenuWidth() / 2, getMenuHeight() * 0.85);

      // Rerolls left this run
      let rerollText = `R / Y  Reroll  (${upgradeRerolls} left this run)`;
      if (canRerollUpgrades()) {
        fill(255);
      } else {
        fill(120);
      }
      textSize(22);
      text(rerollText, getMenuWidth() / 2, getMenuHeight() * 0.9);
    }
  endMenuScaling();
}

// Core base stats (Walking Speed through Bullet Speed): the only upgrades offered in rounds 1-5
function isCoreUpgrade(upgradeId) {
  return upgradeId <= 7;
}

// Rarity of each upgrade: weight is its relative chance to be offered.
// Medium rare and uncommon are hidden from the player (no label).
function getUpgradeRarity(upgradeId) {
  if (upgradeId === 20) return { label: 'ULTRA RARE', weight: 0.1, color: [255, 180, 0] };
  if (upgradeId >= 24 && upgradeId <= 26) return { label: 'VERY RARE', weight: 0.2, color: [200, 90, 255] };
  // Medium rare: Health Regeneration, economy (Metabolism, EXP Boost, Combo Surge), all special shot upgrades,
  // Lady Beetle with all its aphid upgrades, the shockwave variants with their upgrades, Dash Deflection and Shell Shrapnel
  if (upgradeId === 19 || (upgradeId >= 21 && upgradeId <= 23) || (upgradeId >= 27 && upgradeId <= 49) || (upgradeId >= 51 && upgradeId <= 53)) {
    return { label: '', weight: 0.5, color: null };
  }
  if (!isCoreUpgrade(upgradeId)) return { label: '', weight: 0.9, color: null };  // Uncommon
  return { label: '', weight: 1, color: null };
}

// Upgrade levels by id (0-53)
function getCurrentUpgradeLevels() {
  return [upgrade1Level, upgrade2Level, upgrade3Level, upgrade4Level, upgrade5Level, upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level, upgrade21Level, upgrade22Level, upgrade23Level, upgrade24Level, upgrade25Level, upgrade26Level, upgrade27Level, upgrade28Level, upgrade29Level, upgrade30Level, upgrade31Level, upgrade32Level, upgrade33Level, upgrade34Level, upgrade35Level, upgrade36Level, upgrade37Level, upgrade38Level, upgrade39Level, upgrade40Level, upgrade41Level, upgrade42Level, upgrade43Level, upgrade44Level, upgrade45Level, upgrade46Level, upgrade47Level, upgrade48Level, upgrade49Level, upgrade50Level, upgrade51Level, upgrade52Level, upgrade53Level, upgrade54Level];
}

// Whether an upgrade's prerequisites are met (lv = upgrade levels by id). Also used by the Queen Upgrades shop.
function upgradePrereqsMet(i, lv) {
  if (i === 5 && lv[3] === 0) return false;  // Shield Regeneration requires Add Shield
  if (i === 6 && lv[4] === 0) return false;  // Bullet Reload requires Add Bullets
  if (i === 7 && lv[4] === 0) return false;  // Bullet Speed requires Add Bullets
  if (i === 8 && (lv[4] === 0 || lv[6] === 0 || lv[7] === 0)) return false;  // Free-Angle Aiming requires Add Bullets, Bullet Reload, and Bullet Speed
  if (i === 9 && lv[2] < 5) return false;  // Tiger Beetle requires Dash Cooldown maxed
  if (i === 10 && lv[6] < 3) return false;  // Oogpister Beetle requires Bullet Reload level 3+
  if (i === 12 && lv[4] === 0) return false;  // Potent Acid requires Add Bullets
  if (i === 14 && lv[13] === 0) return false;  // Shockwave Radius requires Shockwave Unlock
  if (i === 15 && lv[13] === 0) return false;  // Shockwave Damage requires Shockwave Unlock
  if (i === 16 && lv[13] === 0) return false;  // Shockwave Cooldown requires Shockwave Unlock
  if (i === 17) return false;  // Shockwave Knockback removed (now constant)
  if (i === 18 && lv[13] === 0) return false;  // Bullet Deflection requires Shockwave Unlock
  if (i === 25 && lv[13] === 0) return false;  // Shockwave Harvest requires Shockwave Unlock
  if (i === 26 && lv[4] === 0) return false;  // Bullet Harvest requires Add Bullets
  if (i === 27 && lv[4] === 0) return false;  // Spray Acid requires Add Bullets
  if ((i === 28 || i === 29) && lv[27] === 0) return false;  // Spray Length/Width require Spray Acid
  if (i === 30 && lv[4] === 0) return false;  // Piercing Acid requires Add Bullets
  if (i === 31 && lv[30] === 0) return false;  // Piercing Depth requires Piercing Acid
  if (i === 32 && lv[4] === 0) return false;  // Impact Bomb requires Add Bullets
  if (i === 33 && lv[32] === 0) return false;  // Timed Bomb requires Impact Bomb
  if (i === 34 && lv[33] === 0) return false;  // Proximity Bomb requires Timed Bomb
  if (i === 35 && lv[32] === 0) return false;  // Blast Radius requires Impact Bomb
  if (i >= 37 && i <= 43 && lv[36] === 0) return false;  // Aphid upgrades require Lady Beetle
  if (i >= 44 && i <= 47 && lv[13] === 0) return false;  // Shockwave variants require Shockwave Unlock
  if (i === 48 && lv[44] === 0 && lv[45] === 0) return false;  // Mound Health requires Mound Ring or Bunker
  if (i === 49 && lv[47] === 0) return false;  // Flight Duration requires Flight and Slam
  if (i === 52 && lv[3] === 0) return false;  // Shell Shrapnel requires Add Shield
  if (i === 53 && lv[52] === 0) return false;  // Shrapnel Count requires Shell Shrapnel
  return true;
}

// Whether an upgrade can be offered this round
function isUpgradeUnlocked(i) {
  if (!isCoreUpgrade(i) && level <= 5) return false;  // Only core base stats in rounds 1-5
  return upgradePrereqsMet(i, getCurrentUpgradeLevels());
}

// Fill displayedUpgrades with up to 3 unmaxed, unlocked upgrades, weighted by rarity.
// Upgrades in `exclude` are only offered once nothing else is left.
function pickUpgradeOptions(exclude = []) {
  // The tutorial hands out specific upgrades (tutorial.js)
  const forced = getTutorialForcedUpgrades(exclude);
  if (forced) {
    displayedUpgrades = forced;
    return;
  }
  let upgradeLevels = [upgrade1Level, upgrade2Level, upgrade3Level, upgrade4Level, upgrade5Level, upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level, upgrade21Level, upgrade22Level, upgrade23Level, upgrade24Level, upgrade25Level, upgrade26Level, upgrade27Level, upgrade28Level, upgrade29Level, upgrade30Level, upgrade31Level, upgrade32Level, upgrade33Level, upgrade34Level, upgrade35Level, upgrade36Level, upgrade37Level, upgrade38Level, upgrade39Level, upgrade40Level, upgrade41Level, upgrade42Level, upgrade43Level, upgrade44Level, upgrade45Level, upgrade46Level, upgrade47Level, upgrade48Level, upgrade49Level, upgrade50Level, upgrade51Level, upgrade52Level, upgrade53Level, upgrade54Level];
  let availableUpgrades = [];
  for (let i = 0; i < UPGRADE_COUNT; i++) {
    if (upgradeLevels[i] < UPGRADE_MAX_LEVELS[i] && isUpgradeUnlocked(i)) {
      availableUpgrades.push(i);
    }
  }

  displayedUpgrades = [];
  let freshUpgrades = availableUpgrades.filter(id => !exclude.includes(id));
  let repeatUpgrades = availableUpgrades.filter(id => exclude.includes(id));
  for (let pool of [freshUpgrades, repeatUpgrades]) {
    while (displayedUpgrades.length < 3 && pool.length > 0) {
      let totalWeight = 0;
      for (let id of pool) totalWeight += getUpgradeRarity(id).weight;
      let roll = random(totalWeight);
      let pick = 0;
      while (pick < pool.length - 1 && roll >= getUpgradeRarity(pool[pick]).weight) {
        roll -= getUpgradeRarity(pool[pick]).weight;
        pick++;
      }
      displayedUpgrades.push(pool[pick]);
      pool.splice(pick, 1);
    }
  }
}

// Whether rerolling could show at least one upgrade that isn't on screen now
function canRerollUpgrades() {
  if (upgradeRerolls <= 0) return false;
  if (isTutorialRun() && !tutorialAllowsReroll()) return false;
  let upgradeLevels = [upgrade1Level, upgrade2Level, upgrade3Level, upgrade4Level, upgrade5Level, upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level, upgrade21Level, upgrade22Level, upgrade23Level, upgrade24Level, upgrade25Level, upgrade26Level, upgrade27Level, upgrade28Level, upgrade29Level, upgrade30Level, upgrade31Level, upgrade32Level, upgrade33Level, upgrade34Level, upgrade35Level, upgrade36Level, upgrade37Level, upgrade38Level, upgrade39Level, upgrade40Level, upgrade41Level, upgrade42Level, upgrade43Level, upgrade44Level, upgrade45Level, upgrade46Level, upgrade47Level, upgrade48Level, upgrade49Level, upgrade50Level, upgrade51Level, upgrade52Level, upgrade53Level, upgrade54Level];
  for (let i = 0; i < UPGRADE_COUNT; i++) {
    if (upgradeLevels[i] < UPGRADE_MAX_LEVELS[i] && isUpgradeUnlocked(i) && !displayedUpgrades.includes(i)) return true;
  }
  return false;
}

// Reroll key: R or gamepad Y / Triangle
function isRerollPressed() {
  if (keyIsDown(82)) return true;
  if (gamepad && gamepad.buttons[3] && gamepad.buttons[3].pressed) return true;
  return false;
}

function applyUpgrade(upgradeIndex) {
  if (!tutorialAllowsUpgradePick()) return; // The tutorial's reroll lesson: reroll first
  // Get the actual upgrade ID from the displayed upgrades
  let actualUpgradeId = displayedUpgrades[upgradeIndex];
  let upgradeMaxLevels = UPGRADE_MAX_LEVELS;
  let levelCost = getExpRequired();
  
  // Increment the selected upgrade's level (capped at respective max)
  if (actualUpgradeId === 0 && upgrade1Level < upgradeMaxLevels[0]) {
    upgrade1Level++;
  } else if (actualUpgradeId === 1 && upgrade2Level < upgradeMaxLevels[1]) {
    upgrade2Level++;
  } else if (actualUpgradeId === 2 && upgrade3Level < upgradeMaxLevels[2]) {
    upgrade3Level++;
  } else if (actualUpgradeId === 3 && upgrade4Level < upgradeMaxLevels[3]) {
    upgrade4Level++;
  } else if (actualUpgradeId === 4 && upgrade5Level < upgradeMaxLevels[4]) {
    upgrade5Level++;
  } else if (actualUpgradeId === 5 && upgrade6Level < upgradeMaxLevels[5]) {
    upgrade6Level++;
  } else if (actualUpgradeId === 6 && upgrade7Level < upgradeMaxLevels[6]) {
    upgrade7Level++;
  } else if (actualUpgradeId === 7 && upgrade8Level < upgradeMaxLevels[7]) {
    upgrade8Level++;
  } else if (actualUpgradeId === 8 && upgrade9Level < upgradeMaxLevels[8]) {
    upgrade9Level++;
  } else if (actualUpgradeId === 9 && upgrade10Level < upgradeMaxLevels[9]) {
    upgrade10Level++;
  } else if (actualUpgradeId === 10 && upgrade11Level < upgradeMaxLevels[10]) {
    upgrade11Level++;
  } else if (actualUpgradeId === 11 && upgrade12Level < upgradeMaxLevels[11]) {
    upgrade12Level++;
  } else if (actualUpgradeId === 12 && upgrade13Level < upgradeMaxLevels[12]) {
    upgrade13Level++;
  } else if (actualUpgradeId === 13 && upgrade14Level < upgradeMaxLevels[13]) {
    upgrade14Level++;
  } else if (actualUpgradeId === 14 && upgrade15Level < upgradeMaxLevels[14]) {
    upgrade15Level++;
  } else if (actualUpgradeId === 15 && upgrade16Level < upgradeMaxLevels[15]) {
    upgrade16Level++;
  } else if (actualUpgradeId === 16 && upgrade17Level < upgradeMaxLevels[16]) {
    upgrade17Level++;
  } else if (actualUpgradeId === 17 && upgrade18Level < upgradeMaxLevels[17]) {
    upgrade18Level++;
  } else if (actualUpgradeId === 18 && upgrade19Level < upgradeMaxLevels[18]) {
    upgrade19Level++;
  } else if (actualUpgradeId === 19 && upgrade20Level < upgradeMaxLevels[19]) {
    upgrade20Level++;
  } else if (actualUpgradeId === 20 && upgrade21Level < upgradeMaxLevels[20]) {
    upgrade21Level++;
  } else if (actualUpgradeId === 21 && upgrade22Level < upgradeMaxLevels[21]) {
    upgrade22Level++;
  } else if (actualUpgradeId === 22 && upgrade23Level < upgradeMaxLevels[22]) {
    upgrade23Level++;
  } else if (actualUpgradeId === 23 && upgrade24Level < upgradeMaxLevels[23]) {
    upgrade24Level++;
  } else if (actualUpgradeId === 24 && upgrade25Level < upgradeMaxLevels[24]) {
    upgrade25Level++;
  } else if (actualUpgradeId === 25 && upgrade26Level < upgradeMaxLevels[25]) {
    upgrade26Level++;
  } else if (actualUpgradeId === 26 && upgrade27Level < upgradeMaxLevels[26]) {
    upgrade27Level++;
  } else if (actualUpgradeId === 27 && upgrade28Level < upgradeMaxLevels[27]) {
    upgrade28Level++;
  } else if (actualUpgradeId === 28 && upgrade29Level < upgradeMaxLevels[28]) {
    upgrade29Level++;
  } else if (actualUpgradeId === 29 && upgrade30Level < upgradeMaxLevels[29]) {
    upgrade30Level++;
  } else if (actualUpgradeId === 30 && upgrade31Level < upgradeMaxLevels[30]) {
    upgrade31Level++;
  } else if (actualUpgradeId === 31 && upgrade32Level < upgradeMaxLevels[31]) {
    upgrade32Level++;
  } else if (actualUpgradeId === 32 && upgrade33Level < upgradeMaxLevels[32]) {
    upgrade33Level++;
  } else if (actualUpgradeId === 33 && upgrade34Level < upgradeMaxLevels[33]) {
    upgrade34Level++;
  } else if (actualUpgradeId === 34 && upgrade35Level < upgradeMaxLevels[34]) {
    upgrade35Level++;
  } else if (actualUpgradeId === 35 && upgrade36Level < upgradeMaxLevels[35]) {
    upgrade36Level++;
  } else if (actualUpgradeId === 36 && upgrade37Level < upgradeMaxLevels[36]) {
    upgrade37Level++;
  } else if (actualUpgradeId === 37 && upgrade38Level < upgradeMaxLevels[37]) {
    upgrade38Level++;
  } else if (actualUpgradeId === 38 && upgrade39Level < upgradeMaxLevels[38]) {
    upgrade39Level++;
  } else if (actualUpgradeId === 39 && upgrade40Level < upgradeMaxLevels[39]) {
    upgrade40Level++;
  } else if (actualUpgradeId === 40 && upgrade41Level < upgradeMaxLevels[40]) {
    upgrade41Level++;
  } else if (actualUpgradeId === 41 && upgrade42Level < upgradeMaxLevels[41]) {
    upgrade42Level++;
  } else if (actualUpgradeId === 42 && upgrade43Level < upgradeMaxLevels[42]) {
    upgrade43Level++;
  } else if (actualUpgradeId === 43 && upgrade44Level < upgradeMaxLevels[43]) {
    upgrade44Level++;
  } else if (actualUpgradeId === 44 && upgrade45Level < upgradeMaxLevels[44]) {
    upgrade45Level++;
  } else if (actualUpgradeId === 45 && upgrade46Level < upgradeMaxLevels[45]) {
    upgrade46Level++;
  } else if (actualUpgradeId === 46 && upgrade47Level < upgradeMaxLevels[46]) {
    upgrade47Level++;
  } else if (actualUpgradeId === 47 && upgrade48Level < upgradeMaxLevels[47]) {
    upgrade48Level++;
  } else if (actualUpgradeId === 48 && upgrade49Level < upgradeMaxLevels[48]) {
    upgrade49Level++;
  } else if (actualUpgradeId === 49 && upgrade50Level < upgradeMaxLevels[49]) {
    upgrade50Level++;
  } else if (actualUpgradeId === 50 && upgrade51Level < upgradeMaxLevels[50]) {
    upgrade51Level++;
  } else if (actualUpgradeId === 51 && upgrade52Level < upgradeMaxLevels[51]) {
    upgrade52Level++;
  } else if (actualUpgradeId === 52 && upgrade53Level < upgradeMaxLevels[52]) {
    upgrade53Level++;
  } else if (actualUpgradeId === 53 && upgrade54Level < upgradeMaxLevels[53]) {
    upgrade54Level++;
  }
  
  // Level up the EXP system
  expProgress -= levelCost;
  expLevel++;
  let roundedEXPLevel = Math.ceil(expLevel / 5);
  expRequired += 500 * roundedEXPLevel;
  
  // Check if another upgrade is available immediately
  if (expProgress >= getExpRequired()) {
    upgradeAvailable = true;
    // Keep upgrade menu active and regenerate upgrade options
    pickUpgradeOptions();
    selectedUpgrade = 0;  // Reset to first option
    // Constrain selectedUpgrade to valid range
    if (displayedUpgrades.length > 0) {
      selectedUpgrade = constrain(selectedUpgrade, 0, displayedUpgrades.length - 1);
    }
    upgradeEnterPressed = true;  // Wait for Enter release before next selection
  } else {
    upgradeAvailable = false;
    upgradeMenuActive = false;
  }
  
  //TODO: Add actual upgrade effects based on actualUpgradeId (0-19)
  let levels = [upgrade1Level, upgrade2Level, upgrade3Level, upgrade4Level, upgrade5Level, upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level, upgrade21Level, upgrade22Level, upgrade23Level, upgrade24Level, upgrade25Level, upgrade26Level, upgrade27Level, upgrade28Level, upgrade29Level, upgrade30Level, upgrade31Level, upgrade32Level, upgrade33Level, upgrade34Level, upgrade35Level, upgrade36Level, upgrade37Level, upgrade38Level, upgrade39Level, upgrade40Level, upgrade41Level, upgrade42Level, upgrade43Level, upgrade44Level, upgrade45Level, upgrade46Level, upgrade47Level, upgrade48Level, upgrade49Level, upgrade50Level, upgrade51Level, upgrade52Level, upgrade53Level, upgrade54Level];
  let upgradeNames = ['Walking Speed', 'Dash Speed', 'Dash Cooldown', 'Add Shield', 'Add Bullets', 'Shield Regeneration', 'Bullet Reload', 'Bullet Speed', 'Free-Angle Aiming', 'Tiger Beetle', 'Oogpister Beetle', 'Horns', 'Potent Acid', 'Shockwave', 'Shockwave Radius', 'Shockwave Damage', 'Shockwave Cooldown', 'Shockwave Knockback', 'Bullet Deflection', 'Health Regeneration', 'Runt Hunter', 'Increased Metabolism', 'EXP Boost', 'Combo Surge', 'Dash Harvest', 'Shockwave Harvest', 'Bullet Harvest', 'Spray Acid', 'Spray Length', 'Spray Width', 'Piercing Acid', 'Piercing Depth', 'Impact Bomb', 'Timed Bomb', 'Proximity Bomb', 'Blast Radius', 'Lady Beetle', 'Aphid Health', 'Aphid Spawn Rate', 'Speedy Aphids', 'Armored Aphids', 'Wise Aphids', 'Healthy Aphids', 'Lucky Aphids', 'Mound Ring', 'Bunker', 'Vortex', 'Flight and Slam', 'Mound Health', 'Flight Duration', 'Starting Health', 'Dash Deflection', 'Shell Shrapnel', 'Shrapnel Count'];
  debugLog(`${upgradeNames[actualUpgradeId]} selected! Level: ${levels[actualUpgradeId]}`);
  
  // Update upgrade booleans
  updateUpgradeBooleans();
}

function updateUpgradeBooleans() {
  // Walking Speed (4 levels)
  if (upgrade1Level === 1) {
    movementSpeed = 3.5;
  } else if (upgrade1Level === 2) {
    movementSpeed = 4;
  } else if (upgrade1Level === 3) {
    movementSpeed = 4.5;
  } else if (upgrade1Level === 4) {
    movementSpeed = 5;
  } else {
    movementSpeed = 3;
  }
  
  // Tiger Beetle (toggle dash ability)
  tigerBeetleActive = (upgrade10Level === 1);
  
  // Oogpister Beetle (20% chance for instant bullet reload on eating ant)
  // No boolean needed - checked inline in enemyInteraction1
  
  // Dash Speed (5 levels)
  if (upgrade2Level === 1) {
    dashSpeedStat = 3; // Set value for level 1
  } else if (upgrade2Level === 2) {
    dashSpeedStat = 4; // Set value for level 2
  } else if (upgrade2Level === 3) {
    dashSpeedStat = 5; // Set value for level 3
  } else if (upgrade2Level === 4) {
    dashSpeedStat = 6; // Set value for level 4
  } else if (upgrade2Level === 5) {
    dashSpeedStat = 7; // Set value for level 5
  } else {
    dashSpeedStat = 2;
  }
  
  // Dash Cooldown (5 levels)
  if (upgrade3Level === 1) {
    dashCooldownStat = 2.5; // Set value for level 1
  } else if (upgrade3Level === 2) {
    dashCooldownStat = 2; // Set value for level 2
  } else if (upgrade3Level === 3) {
    dashCooldownStat = 1.5; // Set value for level 3
  } else if (upgrade3Level === 4) {
    dashCooldownStat = 1; // Set value for level 4
  } else if (upgrade3Level === 5) {
    dashCooldownStat = 0.5; // Set value for level 5
  } else {
    dashCooldownStat = 3;
  }
  
  // Add Shield (9 levels)
  if (upgrade4Level === 1) {
    shieldQuantity = 1; // Set value for level 1
  } else if (upgrade4Level === 2) {
    shieldQuantity = 2; // Set value for level 2
  } else if (upgrade4Level === 3) {
    shieldQuantity = 3; // Set value for level 3
  } else if (upgrade4Level === 4) {
    shieldQuantity = 4; // Set value for level 4
  } else if (upgrade4Level === 5) {
    shieldQuantity = 5; // Set value for level 5
  } else if (upgrade4Level === 6) {
    shieldQuantity = 6; // Set value for level 6
  } else if (upgrade4Level === 7) {
    shieldQuantity = 7; // Set value for level 7
  } else if (upgrade4Level === 8) {
    shieldQuantity = 8; // Set value for level 8
  } else if (upgrade4Level === 9) {
    shieldQuantity = 9; // Set value for level 9
  } else {
    shieldQuantity = 0;
  }
  
  // Add Bullets (8 levels, 2 bullets per level)
  if (upgrade5Level === 1) {
    bulletQuantity = 2;
  } else if (upgrade5Level === 2) {
    bulletQuantity = 4;
  } else if (upgrade5Level === 3) {
    bulletQuantity = 6;
  } else if (upgrade5Level === 4) {
    bulletQuantity = 8;
  } else if (upgrade5Level === 5) {
    bulletQuantity = 10;
  } else if (upgrade5Level === 6) {
    bulletQuantity = 12;
  } else if (upgrade5Level === 7) {
    bulletQuantity = 14;
  } else if (upgrade5Level === 8) {
    bulletQuantity = 16;
  } else {
    bulletQuantity = 0;
  }
  
  // Shield Regeneration (5 levels)
  if (upgrade6Level === 1) {
    shieldRegenerationRate = 500; // Set value for level 1
  } else if (upgrade6Level === 2) {
    shieldRegenerationRate = 400; // Set value for level 2
  } else if (upgrade6Level === 3) {
    shieldRegenerationRate = 300; // Set value for level 3
  } else if (upgrade6Level === 4) {
    shieldRegenerationRate = 200; // Set value for level 4
  } else if (upgrade6Level === 5) {
    shieldRegenerationRate = 100; // Set value for level 5
  } else {
    shieldRegenerationRate = 600;
  }
  
  // Bullet Reload (5 levels)
  if (upgrade7Level === 1) {
    bulletReloadRate = 150; // Set value for level 1
  } else if (upgrade7Level === 2) {
    bulletReloadRate = 120; // Set value for level 2
  } else if (upgrade7Level === 3) {
    bulletReloadRate = 90; // Set value for level 3
  } else if (upgrade7Level === 4) {
    bulletReloadRate = 60; // Set value for level 4
  } else if (upgrade7Level === 5) {
    bulletReloadRate = 30; // Set value for level 5
  } else {
    bulletReloadRate = 180;
  }
  
  // Bullet Speed (5 levels)
  if (upgrade8Level === 1) {
    playerBulletSpeed = 2; // Set value for level 1
  } else if (upgrade8Level === 2) {
    playerBulletSpeed = 4; // Set value for level 2
  } else if (upgrade8Level === 3) {
    playerBulletSpeed = 6; // Set value for level 3
  } else if (upgrade8Level === 4) {
    playerBulletSpeed = 8; // Set value for level 4
  } else if (upgrade8Level === 5) {
    playerBulletSpeed = 10; // Set value for level 5
  } else {
    playerBulletSpeed = 1;
  }
  
  // Free-Angle Aiming (1 level - toggle)
  if (upgrade9Level === 1) {
    freeAimEnabled = true;
  } else {
    freeAimEnabled = false;
  }
  
  // Shockwave Cooldown (5 levels - 3/4 of dash cooldown values)
  if (upgrade17Level === 1) {
    windCooldownStat = 1.875; // 3/4 of 2.5
  } else if (upgrade17Level === 2) {
    windCooldownStat = 1.5; // 3/4 of 2.0
  } else if (upgrade17Level === 3) {
    windCooldownStat = 1.125; // 3/4 of 1.5
  } else if (upgrade17Level === 4) {
    windCooldownStat = 0.75; // 3/4 of 1.0
  } else if (upgrade17Level === 5) {
    windCooldownStat = 0.375; // 3/4 of 0.5
  } else {
    windCooldownStat = 2.25; // 3/4 of 3.0
  }
}

function getWinningAnt() {
  let antStats = [];
  for (let i = 1; i <= enemyCount; i++) {
    let ratio = antPoints[i] / antLives[i];
    antStats.push({
      id: i,
      points: antPoints[i],
      lives: antLives[i],
      ratio: isNaN(ratio) ? 0 : ratio
    });
  }

  antStats.sort((a, b) => b.ratio - a.ratio);
  return antStats[0]; // top performer
}

function getTopAnts() {
  let antStats = [];
  for (let i = 1; i <= enemyCount; i++) {
    let ratio = antPoints[i] / antLives[i];
    antStats.push({
      id: i,
      points: antPoints[i],
      lives: antLives[i],
      ratio: isNaN(ratio) ? 0 : ratio
    });
  }

  antStats.sort((a, b) => b.ratio - a.ratio);
  return antStats.slice(0, 3); // top 3
  
}

function printLiveAntRankings() {
  let antStats = [];
  for (let i = 1; i <= enemyCount; i++) {
    let ratio = antPoints[i] / antLives[i];
    antStats.push({
      id: i,
      points: antPoints[i],
      lives: antLives[i],
      ratio: isNaN(ratio) ? 0 : ratio
    });
  }

  antStats.sort((a, b) => b.ratio - a.ratio);
  debugLog("-------------------------------");
  debugLog("=== Live Ant Rankings ===");
  for (let i = 0; i < antStats.length; i++) {
    debugLog(
      `#${i + 1}: Ant ${antStats[i].id}  | Points: ${antStats[i].points}  | Lives: ${antStats[i].lives}  | Ratio: ${antStats[i].ratio.toFixed(2)}`
    );
  }

  debugLog(`Currently winning ant: ${antStats[0].id} with ratio ${antStats[0].ratio.toFixed(2)}`);

}

function printWinningAntStats() {
  const safeFixed = (value, digits = 2) => {
    return (typeof value === 'number' && Number.isFinite(value)) ? value.toFixed(digits) : 'N/A';
  };

  const topAnts = getTopAnts();
  const count1 = Math.round((enemyCount + 1) * 0.5);
  const count2 = Math.round((enemyCount + 1) * 0.3);
  const count3 = (enemyCount + 1) - count1 - count2;
  debugLog("===============================");
  debugLog("=== Round Over: Top 3 Ants ===");
  for (let i = 0; i < topAnts.length; i++) {
    const ant = topAnts[i];
    debugLog(
      `#${i + 1}: Ant ${ant.id} | Points: ${ant.points} | Lives: ${ant.lives} | Ratio: ${safeFixed(ant.ratio)}`
    );
    debugLog(
      `   bulletSpeed: ${safeFixed(bulletSpeed[ant.id])}, bulletCooldown: ${bulletCooldown[ant.id]}, antSpeed: ${safeFixed(antSpeed[ant.id])}`
    );
    debugLog(
      `   shotOffsetX: ${safeFixed(shotOffsetX[ant.id])}, shotOffsetY: ${safeFixed(shotOffsetY[ant.id])}`
    );
    debugLog(
      `   followValue: ${safeFixed(followValue[ant.id])}, autonomy: ${safeFixed(autonomy[ant.id])}, bulletSize: ${safeFixed(bulletSize[ant.id])}`
    );
    debugLog(
      `   standingPointX: ${safeFixed(standingPointX[ant.id])}, standingPointY: ${standingPointY[ant.id]}, distanceFromAnchor: ${safeFixed(distanceFromAnchor[ant.id])}`
    );
    debugLog(
      `   anchorOffsetX: ${safeFixed(anchorOffsetX[ant.id])}, anchorOffsetY: ${safeFixed(anchorOffsetY[ant.id])}`
    );
  }

  debugLog(`
Next generation distribution:`);
  debugLog(`   ${count1} ants inherit from #1`);
  debugLog(`   ${count2} ants inherit from #2`);
  debugLog(`   ${count3} ants inherit from #3`);
  debugLog("===============================");
}



// Drop lingering effects so nothing carries over between rounds and the arrays start fresh
function clearRoundEffects() {
  playerBullets = [];
  resetShotMode(); // Every round starts on the default shot (also clears sprays and bomb blasts)
  resetShockwaveVariant(); // ...and the original shockwave
  clearShockwaveVariantEffects();
  landMines = [];
  speedRings = [];
  enemyExplosions = [];
  enemyArcExplosionLinks = [];
  enemyGroundImpacts = [];
  enemySmears = [];
  deathRefires = [];
  enemyBeams = [];
  enemyStreams = [];
  antStream = [];
  antStreamEndFrame = [];
  antSelfDestructFuse = [];
  enemySmokeImpacts = [];
  enemyTerritories = [];
  enemyWalls = [];
  blinkFlashes = [];
  antShield = [];
  antInBunker = [];
  antAvengeQueue = [];
  antAvengeArmed = [];
  antCooldownBoost = [];
  deathAnimations = [];
  floatingTexts = [];
  flashingEntities = [];
  resetAphids();
  endQueenFight();
  clearRoundOutro();
  antHitSpots = [];
  pendingHitSpot = null;
  queenDefeatedThisRound = false;
}

function nextRound(){
  if (isFinalLevel()) {
    finalLevelNextRound(); // Warm-up groups and the Queen of Queens instead of evolving (finalboss.js)
    return;
  }
  if (isTutorialRun() && tutorialNextRound()) return; // The tutorial sets up its own rounds (tutorial.js)
  clearRoundEffects();
  beamHealthFlashFrames = 0;
  beamShieldFlashFrames = 0;
  // Multiplayer mode handling
  if (multiplayerMode && !multiplayerScoreboard) {
    // This shouldn't happen now, as all players have played before showing scoreboard
    // Show scoreboard between rounds
    multiplayerScoreboard = true;
    return;
  }
  
  // Store if we're in multiplayer transitioning from scoreboard
  let multiplayerTransition = multiplayerMode && multiplayerScoreboard;
  if (multiplayerTransition) {
    multiplayerScoreboard = false;
  }
  
  end = false;
  liveRankingsPrinted = false;
  intermissionMenu = false;
  intermissionMenuCooldown = 0;
  let winner = getWinningAnt();
  let topAnts;
  
  // Use custom ant stats if dev tools has them enabled
  if (devToolsUseCustomAnts) {
    debugLog("Using custom ant stats from dev tools");
    customAntStats.forEach(ensureCustomAntTierCaps);
    topAnts = [
      { id: -1, custom: true, stats: customAntStats[0] },
      { id: -2, custom: true, stats: customAntStats[1] },
      { id: -3, custom: true, stats: customAntStats[2] }
    ];
  } else {
    topAnts = getTopAnts();  // Get top 3 from actual performance
    debugLog("Top ants this round:", topAnts);
    
    // Fill in missing top ants with the best ant if we don't have 3
    // This ensures all slot groups have a valid parent
    while (topAnts.length < 3 && topAnts.length > 0) {
      topAnts.push(topAnts[0]);  // Duplicate the best ant for missing slots
    }
    
    // Update customAntStats to reflect actual winners (for viewing in dev tools)
    syncActualWinnersToCustomStats(topAnts);
  }
  
  level++;
  startRoundIntro();
  if (level <= 16){
    totalAntSlots++;  // Increase available slots instead of fixed enemy count
  }
  levelEnd = 0;
  score = 0;
  health = getStartingHealth();
  if (level <= 3) {
      movementMutationRate = 0.1;
      timeCount = 10; 
  } else if (level <= 7) {
      movementMutationRate = 0.2;
      timeCount = 30; 
  } else {
      movementMutationRate = 0.4;
      timeCount = 60; 
  }
  
  // antSize mutation rate: starts at a difficulty-based round (easy 20, medium 15, hard 10, insane 5)
  const sizeMutationStartRound = { easy: 20, medium: 15, hard: 10, insane: 5 }[getDifficultyTier()];
  let antSizeMutationRate = level >= sizeMutationStartRound ? 0.2 : 0;

  // Gene Token System - Grant tokens every 5 rounds, then evaluate/allocate
  grantTokensForRound(level);

  playerRotationValue = 0;
  bulletShot[enemyIndex] = 0;
  centerPlayer();
  debugLog("enemy count:", enemyCount);

  shield = shieldQuantity > 0 ? shieldQuantity : 0;
  shot = bulletQuantity > 0 ? bulletQuantity : 0;
  dashCoolDown = 0;

  // playerSpeed will be set after ant creation (based on actual enemyCount)
  
  endmusic.stop();
  
  // In multiplayer, title music will play when turn screen shows
  // In single player, start game music immediately
  if (!multiplayerMode) {
    gamemusic.play();
  }
  

  // Allocate slots per winner (50%, 30%, remainder)
  let slots1 = Math.round(totalAntSlots * 0.5);
  let slots2 = Math.round(totalAntSlots * 0.3);
  let slots3 = totalAntSlots - slots1 - slots2;  // Gets the remainder
  
  debugLog(`Slot allocation: #1=${slots1}, #2=${slots2}, #3=${slots3} (total ${totalAntSlots})`);

  // Create ants from each winner to fill their slot allocation
  let antIndex = 1;
  const MAX_ANTS = 500;  // Safety limit
  
  // Process each winner's slot allocation
  let winnerGroups = [
    { parent: topAnts[0], slots: slots1, name: '#1' },
    { parent: topAnts[1], slots: slots2, name: '#2' },
    { parent: topAnts[2], slots: slots3, name: '#3' }
  ];
  
  for (let group of winnerGroups) {
    let usedSlots = 0;
    let antsFromThisWinner = 0;
    
    // Skip this group if no valid parent (safety check)
    if (!group.parent) {
      debugLog(`Skipping ${group.name}: no valid parent ant`);
      continue;
    }
    
    while (usedSlots < group.slots && antIndex <= MAX_ANTS) {
      let i = antIndex;
      let parent = group.parent;
    
    strikeX[i] = 0;
    strikeY[i] = 0;
    strikeTime1[i] = 0;
    drawStrike1[i] = 1;
    bulletShot[i] = 0;
    enemyBullets[i] = [];

    if (parent) {
      // Check if this is a custom ant from dev tools
      if (parent.custom && parent.stats) {
        debugLog(`Ant ${i} inherits from custom ant template #${Math.abs(parent.id)}`);
        let s = parent.stats;
        bulletSpeed[i]   = constrain(s.bulletSpeed   + random(-50, 50), getMinAllowedValue('bulletSpeed', i, s.geneTokenInvestments || []), 300);
        bulletCooldown[i]= constrain(floor(s.bulletCooldown + random(-5, 5)), getMinAllowedValue('bulletCooldown', i, s.geneTokenInvestments || []), 200);
        antSpeed[i]      = constrain(s.antSpeed      + random(-0.3, 0.3), 0.9, 3.5);
        shotOffsetX[i]   = constrain(s.shotOffsetX   + random(-50, 50), -500, 500);
        shotOffsetY[i]   = constrain(s.shotOffsetY   + random(-50, 50), -500, 500);
        // Only mutate standing point if parent uses Location mode (followValue near 2)
        if (Math.round(s.followValue) === 2) {
          standingPointX[i] = constrain(s.standingPointX + random(-100, 100), 0, getGameplayWidth());
          standingPointY[i] = constrain(s.standingPointY + random(-100, 100), scoreBarHeight, getGameplayHeight());
        } else {
          standingPointX[i] = s.standingPointX;
          standingPointY[i] = s.standingPointY;
        }
        followValue[i]    = constrain(s.followValue    + random(-movementMutationRate, movementMutationRate), -0.5, 3.49);
        autonomy[i]    = constrain(s.autonomy    + random(-movementMutationRate, movementMutationRate), -0.5, 1.5);
        // Only mutate distance if parent uses KeepDistance (autonomy near 1)
        if (Math.round(s.autonomy) === 1) {
          distanceFromAnchor[i] = constrain(s.distanceFromAnchor + random(-100, 100), 0.1, 1000);
          anchorOffsetX[i] = constrain((s.anchorOffsetX || 0) + random(-50, 50), -500, 500);
          anchorOffsetY[i] = constrain((s.anchorOffsetY || 0) + random(-50, 50), -500, 500);
        } else {
          distanceFromAnchor[i] = s.distanceFromAnchor;
          anchorOffsetX[i] = s.anchorOffsetX || 0;
          anchorOffsetY[i] = s.anchorOffsetY || 0;
        }
        // Special category (mutation-based)
        specialExplosion[i]    = constrain(s.specialExplosion    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('specialExplosion', i, s.geneTokenInvestments || []));
        specialKnockback[i]    = constrain(s.specialKnockback    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('specialKnockback', i, s.geneTokenInvestments || []));
        specialCamo[i]    = constrain((s.specialCamo || 0)    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('specialCamo', i, s.geneTokenInvestments || []));
        specialRecoil[i]    = constrain((s.specialRecoil || 0)    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('specialRecoil', i, s.geneTokenInvestments || []));
        specialPotential[i]    = constrain(s.specialPotential    + random(-movementMutationRate, movementMutationRate), 0, 1);
        // Only mutate explosion stats if parent has specialPotential > 0.5 AND uses explosion
        if (s.specialPotential > 0.5 && s.specialExplosion >= Math.max(s.specialKnockback, s.specialCamo || 0, s.specialRecoil || 0)) {
          explosionProximity[i] = constrain(s.explosionProximity + random(-100, 100), 0.1, 1000);
          bulletExplodeAfter[i] = constrain(s.bulletExplodeAfter + random(-50, 50), EXPLODE_AFTER_MIN, EXPLODE_AFTER_MAX);
        } else {
          explosionProximity[i] = s.explosionProximity;
          bulletExplodeAfter[i] = s.bulletExplodeAfter;
        }
        // Only mutate radius if parent uses explosion or high arc; residue also if parent uses landmines
        const sUsesExplosion = s.specialPotential > 0.5 && s.specialExplosion >= Math.max(s.specialKnockback, s.specialCamo || 0, s.specialRecoil || 0);
        const sUsesHighArc = s.pathPotential > 0.5 && s.pathHighArc >= s.pathCurve && s.pathHighArc >= s.pathAccelerate && s.pathHighArc >= (s.pathBlink || 0);
        const sUsesLandmine = s.deathPotential > 0.5 && s.deathLandmine > 0 && s.deathLandmine >= Math.max(s.deathRefire || 0, s.deathTerritory || 0, s.deathMound || 0);
        const sUsesSmear = sUsesLandmine && s.deathLandmine < 1;
        const sUsesBeam = s.pathPotential > 0.5 && s.pathAccelerate >= 1 && s.pathAccelerate >= s.pathHighArc && s.pathAccelerate >= s.pathCurve && s.pathAccelerate >= (s.pathBlink || 0);
        const sUsesStream = s.firePotential > 0.5 && s.fireRapid >= 1 && s.fireRapid > s.fireBurst && s.fireRapid >= s.fireAlternating && s.fireRapid >= (s.fireAlarm || 0);
        const sDeathTrait = s.deathPotential > 0.5 ? getDominantTraitKeyForCategory(s, 'death') : null;
        const sUsesTerritory = sDeathTrait === 'deathTerritory';
        const sUsesMound = sDeathTrait === 'deathMound';
        if (sUsesExplosion || sUsesHighArc || sUsesSmear || sUsesBeam || sUsesStream || sUsesTerritory) {
          radiusMultiplier[i] = constrain(s.radiusMultiplier + random(-0.2, 0.2), 0.5, 3);
        } else {
          radiusMultiplier[i] = s.radiusMultiplier;
        }
        if (sUsesExplosion || sUsesHighArc || sUsesLandmine || sUsesBeam || sUsesStream || sUsesTerritory || sUsesMound) {
          residueMultiplier[i] = constrain(s.residueMultiplier + random(-0.2, 0.2), 0.5, 3);
        } else {
          residueMultiplier[i] = s.residueMultiplier;
        }
        // Only mutate knockback multiplier if parent uses knockback
        if (s.specialPotential > 0.5 && s.specialKnockback > Math.max(s.specialExplosion, s.specialCamo || 0, s.specialRecoil || 0)) {
          bulletKnockbackMultiplier[i] = constrain(s.bulletKnockbackMultiplier + random(-0.5, 0.5), 2, getMaxAllowedValue('bulletKnockbackMultiplier', i, s.geneTokenInvestments || []));
        } else {
          bulletKnockbackMultiplier[i] = s.bulletKnockbackMultiplier;
        }
        // Only mutate camouflage flash rate if parent uses camouflage
        if (s.specialPotential > 0.5 && (s.specialCamo || 0) > Math.max(s.specialExplosion, s.specialKnockback, s.specialRecoil || 0) && s.specialCamo < 1) {
          bulletCamoFlashRate[i] = constrain((s.bulletCamoFlashRate || 2.5) + random(-0.2, 0.2), getMinAllowedValue('bulletCamoFlashRate', i, s.geneTokenInvestments || []), 3);
        } else {
          bulletCamoFlashRate[i] = s.bulletCamoFlashRate || 2.5;
        }
        // Fire category (mutation-based)
        fireBurst[i]    = constrain(s.fireBurst    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireBurst', i, s.geneTokenInvestments || []));
        fireRapid[i]    = constrain(s.fireRapid    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireRapid', i, s.geneTokenInvestments || []));
        fireAlternating[i]    = constrain(s.fireAlternating    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireAlternating', i, s.geneTokenInvestments || []));
        fireAlarm[i]    = constrain((s.fireAlarm || 0)    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireAlarm', i, s.geneTokenInvestments || []));
        // Only mutate the alarm radius if parent uses alarm fire
        if (s.firePotential > 0.5 && getDominantTraitKeyForCategory(s, 'fire') === 'fireAlarm' && s.fireAlarm < 1) {
          alarmInnerRadius[i] = constrain((s.alarmInnerRadius ?? ALARM_DEFAULT_INNER_RADIUS) + random(-10, 10), ALARM_MIN_INNER_RADIUS, ALARM_MAX_INNER_RADIUS);
        } else {
          alarmInnerRadius[i] = s.alarmInnerRadius ?? ALARM_DEFAULT_INNER_RADIUS;
        }
        firePotential[i]    = constrain(s.firePotential    + random(-movementMutationRate, movementMutationRate), 0, 1);
        // Only mutate burst/rapid stats if parent uses burst or rapid fire
        if (s.firePotential > 0.5 && (s.fireBurst >= Math.max(s.fireRapid, s.fireAlternating, s.fireAlarm || 0) || s.fireRapid >= Math.max(s.fireBurst, s.fireAlternating, s.fireAlarm || 0))) {
          bulletBurstCount[i] = constrain(s.bulletBurstCount + random(-movementMutationRate, movementMutationRate), 1.5, getMaxAllowedValue('bulletBurstCount', i, s.geneTokenInvestments || []));
          bulletBurstSpread[i] = constrain(s.bulletBurstSpread + random(-movementMutationRate, movementMutationRate), PI/3, getMaxAllowedValue('bulletBurstSpread', i, s.geneTokenInvestments || []));
        } else {
          bulletBurstCount[i] = s.bulletBurstCount;
          bulletBurstSpread[i] = s.bulletBurstSpread;
        }
        // Only mutate burst delay if parent uses delayed burst fire
        if (s.firePotential > 0.5 && s.fireBurst >= 1 && s.fireBurst >= Math.max(s.fireRapid, s.fireAlternating, s.fireAlarm || 0)) {
          bulletBurstDelay[i] = constrain((s.bulletBurstDelay ?? 40) + random(-5, 5), DELAYED_BURST_MIN_DELAY, DELAYED_BURST_MAX_DELAY);
        } else {
          bulletBurstDelay[i] = s.bulletBurstDelay ?? 40;
        }
        // Only mutate cooldown multiplier if parent uses alternating fire
        if (s.firePotential > 0.5 && s.fireAlternating >= Math.max(s.fireBurst, s.fireRapid, s.fireAlarm || 0)) {
          bulletCooldownMultiplier[i] = constrain(s.bulletCooldownMultiplier + random(-movementMutationRate, movementMutationRate), 0.5, getMaxAllowedValue('bulletCooldownMultiplier', i, s.geneTokenInvestments || []));
        } else {
          bulletCooldownMultiplier[i] = s.bulletCooldownMultiplier;
        }
        // Death category (mutation-based)
        deathLandmine[i]    = constrain(s.deathLandmine    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathLandmine', i, s.geneTokenInvestments || []));
        deathRefire[i]    = constrain((s.deathRefire || 0)    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathRefire', i, s.geneTokenInvestments || []));
        deathTerritory[i]    = constrain((s.deathTerritory || 0)    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathTerritory', i, s.geneTokenInvestments || []));
        deathMound[i]    = constrain((s.deathMound || 0)    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathMound', i, s.geneTokenInvestments || []));
        // Every ant can hide in any bunker, so bunker range always mutates
        bunkerRange[i] = constrain((s.bunkerRange ?? BUNKER_DEFAULT_RANGE) + random(-5, 5), BUNKER_MIN_RANGE, BUNKER_MAX_RANGE);
        deathPotential[i]    = constrain(s.deathPotential    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, 1);
        // Path category (mutation-based)
        pathHighArc[i]    = constrain(s.pathHighArc    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathHighArc', i, s.geneTokenInvestments || []));
        pathCurve[i]    = constrain(s.pathCurve    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathCurve', i, s.geneTokenInvestments || []));
        pathAccelerate[i]    = constrain(s.pathAccelerate    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathAccelerate', i, s.geneTokenInvestments || []));
        pathBlink[i]    = constrain((s.pathBlink || 0)    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathBlink', i, s.geneTokenInvestments || []));
        // Only mutate the blink delay if parent uses blink / portal
        if (s.pathPotential > 0.5 && getDominantTraitKeyForCategory(s, 'path') === 'pathBlink') {
          blinkDelay[i] = constrain((s.blinkDelay ?? BLINK_DEFAULT_DELAY) + random(-10, 10), BLINK_MIN_DELAY, BLINK_MAX_DELAY);
        } else {
          blinkDelay[i] = s.blinkDelay ?? BLINK_DEFAULT_DELAY;
        }
        pathPotential[i]    = constrain(s.pathPotential    + random(-movementMutationRate, movementMutationRate), 0, 1);
        // Determine dominant path trait
        let pathHighArcVal = s.pathHighArc;
        let pathCurveVal = s.pathCurve;
        let pathAccelerateVal = s.pathAccelerate;
        let pathBlinkVal = s.pathBlink || 0;
        // Only mutate arc duration if parent uses high arc
        if (s.pathPotential > 0.5 && pathHighArcVal >= pathCurveVal && pathHighArcVal >= pathAccelerateVal && pathHighArcVal >= pathBlinkVal) {
          bulletArcDuration[i] = constrain(s.bulletArcDuration + random(-50, 50), HIGH_ARC_MIN_DURATION, HIGH_ARC_MAX_DURATION);
        } else {
          bulletArcDuration[i] = s.bulletArcDuration;
        }
        // Only mutate curve strength if parent uses curve/homing path
        if (s.pathPotential > 0.5 && pathCurveVal >= pathHighArcVal && pathCurveVal >= pathAccelerateVal && pathCurveVal >= pathBlinkVal) {
          const maxCurve = getMaxAllowedValue('bulletCurveStrength', i, s.geneTokenInvestments || []);
          bulletCurveStrength[i] = constrain(s.bulletCurveStrength + random(-0.005, 0.005), -maxCurve, maxCurve);
        } else {
          bulletCurveStrength[i] = s.bulletCurveStrength;
        }
        // Only mutate accelerate delay if parent uses accelerating bullets
        if (s.pathPotential > 0.5 && pathAccelerateVal >= pathHighArcVal && pathAccelerateVal >= pathCurveVal && pathAccelerateVal >= pathBlinkVal) {
          bulletAccelerateDelay[i] = constrain(s.bulletAccelerateDelay + random(-20, 20), getMinAllowedValue('bulletAccelerateDelay', i, s.geneTokenInvestments || []), 200);
        } else {
          bulletAccelerateDelay[i] = s.bulletAccelerateDelay;
        }
        angleFromSpawn[i]    = constrain(s.angleFromSpawn + random((-PI / 3), (PI / 3)), 0, TWO_PI);
        bulletSize[i]    = constrain(s.bulletSize    + random(-(movementMutationRate / 2), (movementMutationRate / 2)), 1, 3);
        radiusMultiplier[i] = constrain(s.radiusMultiplier + random(-0.2, 0.2), 0.5, 3);
        residueMultiplier[i] = constrain(s.residueMultiplier + random(-0.2, 0.2), 0.5, 3);
        antSize[i] = constrain(s.antSize + random(-antSizeMutationRate, antSizeMutationRate), 0.3, 3);
        // Cap ant speed based on ant size (small ants can be faster, large ants slower)
        let maxAntSpeed1 = 4.5 - antSize[i];
        antSpeed[i] = min(antSpeed[i], maxAntSpeed1);
        // Cap bullet size based on ant size (small ants can't have huge bullets)
        let maxBulletSize = min(3, antSize[i] + 1.0);
        bulletSize[i] = min(bulletSize[i], maxBulletSize);
        antMaxHealth[i] = antSize[i];
        antHealth[i] = antMaxHealth[i];
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
        // Gene Token System - inherit parent's tokens and investments
        geneTokens[i] = s.geneTokens || 2;
        geneTokenInvestments[i] = JSON.parse(JSON.stringify(s.geneTokenInvestments || [])); // Deep copy
        geneTokenLastRoundGained[i] = s.geneTokenLastRoundGained || 0;
      } else {
        // Regular ant from game performance
        debugLog(`Ant ${i} inherits from parent Ant ${parent.id}`);
        bulletSpeed[i]   = constrain(bulletSpeed[parent.id]   + random(-50, 50), getMinAllowedValue('bulletSpeed', parent.id), 300);
        bulletCooldown[i]= constrain(floor(bulletCooldown[parent.id] + random(-5, 5)), getMinAllowedValue('bulletCooldown', parent.id), 200);
        antSpeed[i]      = constrain(antSpeed[parent.id]      + random(-0.3, 0.3), 0.9, 3.5);
        shotOffsetX[i]   = constrain(shotOffsetX[parent.id]   + random(-50, 50), -500, 500);
        shotOffsetY[i]   = constrain(shotOffsetY[parent.id]   + random(-50, 50), -500, 500);
        // Only mutate standing point if parent uses Location mode (followValue near 2)
        if (Math.round(followValue[parent.id]) === 2) {
          standingPointX[i] = constrain(standingPointX[parent.id] + random(-100, 100), 0, getGameplayWidth());
          standingPointY[i] = constrain(standingPointY[parent.id] + random(-100, 100), scoreBarHeight, getGameplayHeight());
        } else {
          standingPointX[i] = standingPointX[parent.id];
          standingPointY[i] = standingPointY[parent.id];
        }
        followValue[i]    = constrain(followValue[parent.id]    + random(-movementMutationRate, movementMutationRate), -0.5, 3.49);
        autonomy[i]    = constrain(autonomy[parent.id]    + random(-movementMutationRate, movementMutationRate), -0.5, 1.5);
        // Only mutate distance if parent uses KeepDistance (autonomy near 1)
        if (Math.round(autonomy[parent.id]) === 1) {
          distanceFromAnchor[i] = constrain(distanceFromAnchor[parent.id] + random(-100, 100), 0.1, 1000);
          anchorOffsetX[i] = constrain(anchorOffsetX[parent.id] + random(-50, 50), -500, 500);
          anchorOffsetY[i] = constrain(anchorOffsetY[parent.id] + random(-50, 50), -500, 500);
        } else {
          distanceFromAnchor[i] = distanceFromAnchor[parent.id];
          anchorOffsetX[i] = anchorOffsetX[parent.id];
          anchorOffsetY[i] = anchorOffsetY[parent.id];
        }
        // Special category (mutation-based)
        specialExplosion[i]    = constrain(specialExplosion[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('specialExplosion', parent.id));
        specialKnockback[i]    = constrain(specialKnockback[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('specialKnockback', parent.id));
        specialCamo[i]    = constrain(specialCamo[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('specialCamo', parent.id));
        specialRecoil[i]    = constrain(specialRecoil[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('specialRecoil', parent.id));
        specialPotential[i]    = constrain(specialPotential[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, 1);
        // Only mutate explosion stats if parent has specialPotential > 0.5 AND uses explosion
        if (specialPotential[parent.id] > 0.5 && specialExplosion[parent.id] >= Math.max(specialKnockback[parent.id], specialCamo[parent.id], specialRecoil[parent.id])) {
          explosionProximity[i] = constrain(explosionProximity[parent.id] + random(-100, 100), 0.1, 1000);
          bulletExplodeAfter[i] = constrain(bulletExplodeAfter[parent.id] + random(-50, 50), EXPLODE_AFTER_MIN, EXPLODE_AFTER_MAX);
        } else {
          explosionProximity[i] = explosionProximity[parent.id];
          bulletExplodeAfter[i] = bulletExplodeAfter[parent.id];
        }
        // Only mutate radius if parent uses explosion or high arc; residue also if parent uses landmines
        const parentUsesExplosion = specialPotential[parent.id] > 0.5 && specialExplosion[parent.id] >= Math.max(specialKnockback[parent.id], specialCamo[parent.id], specialRecoil[parent.id]);
        const parentUsesHighArc = pathPotential[parent.id] > 0.5 && pathHighArc[parent.id] >= pathCurve[parent.id] && pathHighArc[parent.id] >= pathAccelerate[parent.id] && pathHighArc[parent.id] >= pathBlink[parent.id];
        const parentUsesLandmine = deathPotential[parent.id] > 0.5 && deathLandmine[parent.id] > 0 && deathLandmine[parent.id] >= Math.max(deathRefire[parent.id], deathTerritory[parent.id], deathMound[parent.id]);
        const parentUsesSmear = parentUsesLandmine && deathLandmine[parent.id] < 1;
        const parentUsesBeam = isBeamAccelerate(parent.id);
        const parentUsesStream = isStreamFire(parent.id);
        const parentDeathType = getDeathType(parent.id);
        const parentUsesTerritory = parentDeathType === 4 || parentDeathType === 5;
        const parentUsesMound = parentDeathType === 6 || parentDeathType === 7;
        if (parentUsesExplosion || parentUsesHighArc || parentUsesSmear || parentUsesBeam || parentUsesStream || parentUsesTerritory) {
          radiusMultiplier[i] = constrain(radiusMultiplier[parent.id] + random(-0.2, 0.2), 0.5, 3);
        } else {
          radiusMultiplier[i] = radiusMultiplier[parent.id];
        }
        if (parentUsesExplosion || parentUsesHighArc || parentUsesLandmine || parentUsesBeam || parentUsesStream || parentUsesTerritory || parentUsesMound) {
          residueMultiplier[i] = constrain(residueMultiplier[parent.id] + random(-0.2, 0.2), 0.5, 3);
        } else {
          residueMultiplier[i] = residueMultiplier[parent.id];
        }
        // Only mutate knockback multiplier if parent uses knockback
        if (specialPotential[parent.id] > 0.5 && specialKnockback[parent.id] > Math.max(specialExplosion[parent.id], specialCamo[parent.id], specialRecoil[parent.id])) {
          bulletKnockbackMultiplier[i] = constrain(bulletKnockbackMultiplier[parent.id] + random(-0.5, 0.5), 2, getMaxAllowedValue('bulletKnockbackMultiplier', parent.id));
        } else {
          bulletKnockbackMultiplier[i] = bulletKnockbackMultiplier[parent.id];
        }
        // Only mutate camouflage flash rate if parent uses camouflage
        if (specialPotential[parent.id] > 0.5 && specialCamo[parent.id] > Math.max(specialExplosion[parent.id], specialKnockback[parent.id], specialRecoil[parent.id]) && specialCamo[parent.id] < 1) {
          bulletCamoFlashRate[i] = constrain(bulletCamoFlashRate[parent.id] + random(-0.2, 0.2), getMinAllowedValue('bulletCamoFlashRate', parent.id), 3);
        } else {
          bulletCamoFlashRate[i] = bulletCamoFlashRate[parent.id];
        }
        // Fire category (mutation-based)
        fireBurst[i]    = constrain(fireBurst[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireBurst', parent.id));
        fireRapid[i]    = constrain(fireRapid[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireRapid', parent.id));
        fireAlternating[i]    = constrain(fireAlternating[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireAlternating', parent.id));
        fireAlarm[i]    = constrain(fireAlarm[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireAlarm', parent.id));
        // Only mutate the alarm radius if parent uses alarm fire
        if (getFireType(parent.id) === 5) {
          alarmInnerRadius[i] = constrain(alarmInnerRadius[parent.id] + random(-10, 10), ALARM_MIN_INNER_RADIUS, ALARM_MAX_INNER_RADIUS);
        } else {
          alarmInnerRadius[i] = alarmInnerRadius[parent.id];
        }
        firePotential[i]    = constrain(firePotential[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, 1);
        // Only mutate burst/rapid stats if parent uses burst or rapid fire
        if (firePotential[parent.id] > 0.5 && (fireBurst[parent.id] >= Math.max(fireRapid[parent.id], fireAlternating[parent.id], fireAlarm[parent.id]) || fireRapid[parent.id] >= Math.max(fireBurst[parent.id], fireAlternating[parent.id], fireAlarm[parent.id]))) {
          bulletBurstCount[i] = constrain(bulletBurstCount[parent.id] + random(-movementMutationRate, movementMutationRate), 1.5, getMaxAllowedValue('bulletBurstCount', parent.id));
          bulletBurstSpread[i] = constrain(bulletBurstSpread[parent.id] + random(-movementMutationRate, movementMutationRate), PI/3, getMaxAllowedValue('bulletBurstSpread', parent.id));
        } else {
          bulletBurstCount[i] = bulletBurstCount[parent.id];
          bulletBurstSpread[i] = bulletBurstSpread[parent.id];
        }
        // Only mutate burst delay if parent uses delayed burst fire
        if (firePotential[parent.id] > 0.5 && fireBurst[parent.id] >= 1 && fireBurst[parent.id] >= Math.max(fireRapid[parent.id], fireAlternating[parent.id], fireAlarm[parent.id])) {
          bulletBurstDelay[i] = constrain(bulletBurstDelay[parent.id] + random(-5, 5), DELAYED_BURST_MIN_DELAY, DELAYED_BURST_MAX_DELAY);
        } else {
          bulletBurstDelay[i] = bulletBurstDelay[parent.id];
        }
        // Only mutate cooldown multiplier if parent uses alternating fire
        if (firePotential[parent.id] > 0.5 && fireAlternating[parent.id] >= Math.max(fireBurst[parent.id], fireRapid[parent.id], fireAlarm[parent.id])) {
          bulletCooldownMultiplier[i] = constrain(bulletCooldownMultiplier[parent.id] + random(-movementMutationRate, movementMutationRate), 0.5, getMaxAllowedValue('bulletCooldownMultiplier', parent.id));
        } else {
          bulletCooldownMultiplier[i] = bulletCooldownMultiplier[parent.id];
        }
        // Death category (mutation-based)
        deathLandmine[i]    = constrain(deathLandmine[parent.id]    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathLandmine', parent.id));
        deathRefire[i]    = constrain(deathRefire[parent.id]    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathRefire', parent.id));
        deathTerritory[i]    = constrain(deathTerritory[parent.id]    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathTerritory', parent.id));
        deathMound[i]    = constrain(deathMound[parent.id]    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathMound', parent.id));
        // Every ant can hide in any bunker, so bunker range always mutates
        bunkerRange[i] = constrain(bunkerRange[parent.id] + random(-5, 5), BUNKER_MIN_RANGE, BUNKER_MAX_RANGE);
        deathPotential[i]    = constrain(deathPotential[parent.id]    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, 1);
        // Path category (mutation-based)
        pathHighArc[i]    = constrain(pathHighArc[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathHighArc', parent.id));
        pathCurve[i]    = constrain(pathCurve[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathCurve', parent.id));
        pathAccelerate[i]    = constrain(pathAccelerate[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathAccelerate', parent.id));
        pathBlink[i]    = constrain(pathBlink[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathBlink', parent.id));
        // Only mutate the blink delay if parent uses blink / portal
        if (getPathType(parent.id) === 3) {
          blinkDelay[i] = constrain(blinkDelay[parent.id] + random(-10, 10), BLINK_MIN_DELAY, BLINK_MAX_DELAY);
        } else {
          blinkDelay[i] = blinkDelay[parent.id];
        }
        pathPotential[i]    = constrain(pathPotential[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, 1);
        // Determine dominant path trait
        let pathHighArcVal = pathHighArc[parent.id];
        let pathCurveVal = pathCurve[parent.id];
        let pathAccelerateVal = pathAccelerate[parent.id];
        let pathBlinkVal = pathBlink[parent.id];
        // Only mutate arc duration if parent uses high arc
        if (pathPotential[parent.id] > 0.5 && pathHighArcVal >= pathCurveVal && pathHighArcVal >= pathAccelerateVal && pathHighArcVal >= pathBlinkVal) {
          bulletArcDuration[i] = constrain(bulletArcDuration[parent.id] + random(-50, 50), HIGH_ARC_MIN_DURATION, HIGH_ARC_MAX_DURATION);
        } else {
          bulletArcDuration[i] = bulletArcDuration[parent.id];
        }
        // Only mutate curve strength if parent uses curve/homing path
        if (pathPotential[parent.id] > 0.5 && pathCurveVal >= pathHighArcVal && pathCurveVal >= pathAccelerateVal && pathCurveVal >= pathBlinkVal) {
          const maxCurve = getMaxAllowedValue('bulletCurveStrength', parent.id);
          bulletCurveStrength[i] = constrain(bulletCurveStrength[parent.id] + random(-0.005, 0.005), -maxCurve, maxCurve);
        } else {
          bulletCurveStrength[i] = bulletCurveStrength[parent.id];
        }
        // Only mutate accelerate delay if parent uses accelerating bullets
        if (pathPotential[parent.id] > 0.5 && pathAccelerateVal >= pathHighArcVal && pathAccelerateVal >= pathCurveVal && pathAccelerateVal >= pathBlinkVal) {
          bulletAccelerateDelay[i] = constrain(bulletAccelerateDelay[parent.id] + random(-20, 20), getMinAllowedValue('bulletAccelerateDelay', parent.id), 200);
        } else {
          bulletAccelerateDelay[i] = bulletAccelerateDelay[parent.id];
        }
        // Remove duplicate mutations (these were already handled above)
        angleFromSpawn[i]    = constrain(angleFromSpawn[parent.id] + random((-PI / 3), (PI / 3)), 0, TWO_PI);
        bulletSize[i]    = constrain(bulletSize[parent.id]    + random(-(movementMutationRate / 2), (movementMutationRate / 2)), 1, 3);
        antSize[i] = constrain(antSize[parent.id] + random(-antSizeMutationRate, antSizeMutationRate), 0.3, 3);
        // Cap ant speed based on ant size (small ants can be faster, large ants slower)
        let maxAntSpeed2 = 4.5 - antSize[i];
        antSpeed[i] = min(antSpeed[i], maxAntSpeed2);
        // Cap bullet size based on ant size (small ants can't have huge bullets)
        let maxBulletSize = min(3, antSize[i] + 1.0);
        bulletSize[i] = min(bulletSize[i], maxBulletSize);
        antMaxHealth[i] = antSize[i];
        antHealth[i] = antMaxHealth[i];
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
        // Gene Token System - inherit parent's tokens and investments
        geneTokens[i] = geneTokens[parent.id] || 0;
        geneTokenInvestments[i] = JSON.parse(JSON.stringify(geneTokenInvestments[parent.id] || [])); // Deep copy
        geneTokenLastRoundGained[i] = geneTokenLastRoundGained[parent.id] || 0;
      }

      if (Math.round(autonomy[i]) === 0){
        followTarget[i] = true;
        keepDistance[i] = false;
      } else if (Math.round(autonomy[i]) === 1){
        followTarget[i] = false;
        keepDistance[i] = true;
      }
      // Set explosion flags based on genetics
      const specialType = getSpecialType(i);
      if (specialType === 0){
        // No special bullet behavior
        explodeOnTermination[i] = false;
        triggerExplodeViaProximity[i] = false;
      } else if (specialType === 1){
        // Type 1 = Explosions - check trigger type via specialExplosion value
        if (specialExplosion[i] < 1){
          // Time-based explosion (specialExplosion < 1)
          explodeOnTermination[i] = true;
          triggerExplodeViaProximity[i] = false;
        } else {
          // Proximity-based explosion (specialExplosion >= 1)
          explodeOnTermination[i] = false;
          triggerExplodeViaProximity[i] = true;
        }
      } else {
        // Knockback (-1), Camouflage (2), Ghost (-2), Recoil (3), or Launch (-3): no explosions
        explodeOnTermination[i] = false;
        triggerExplodeViaProximity[i] = false;
      }
      if (Math.round(followValue[i]) === 0){
        followAnt[i] = false;
        followBeetle[i] = true;
        findLocation[i] = false;
        standStill[i] = false;
      } else if (Math.round(followValue[i]) === 1) {
        followAnt[i] = true;
        followBeetle[i] = false;
        findLocation[i] = false;
        standStill[i] = false;
      } else if (Math.round(followValue[i]) === 2) {
        followAnt[i] = false;
        followBeetle[i] = false;
        findLocation[i] = true;
        standStill[i] = false;
      } else if (Math.round(followValue[i]) === 3) {
        followAnt[i] = false;
        followBeetle[i] = false;
        findLocation[i] = false;
        standStill[i] = true;
      }
    } else {

      bulletSpeed[i] = winner 
        ? constrain(bulletSpeed[winner.id] + random(-50, 50), getMinAllowedValue('bulletSpeed', winner.id), 300)   
        : random(60, 300);

      bulletCooldown[i] = winner 
        ? constrain(floor(bulletCooldown[winner.id] + random(-5, 5)), getMinAllowedValue('bulletCooldown', winner.id), 200)
        : floor(random(79, 200));

      antSpeed[i] = winner 
        ? constrain(antSpeed[winner.id] + random(-0.5, 0.5), 0.9, 3.5)   
        : random(0.9, 3);

      shotOffsetX[i] = winner 
        ? constrain(shotOffsetX[winner.id] + random(-50, 50), -500, 500)
        : random(-500, 500);

      shotOffsetY[i] = winner 
        ? constrain(shotOffsetY[winner.id] + random(-50, 50), -500, 500)
        : random(-500, 500);
      
      // Only mutate standing point if winner uses Location mode (followValue near 2)
      if (winner && Math.round(followValue[winner.id]) === 2) {
        standingPointX[i] = constrain(standingPointX[winner.id] + random(-100, 100), 0, getGameplayWidth());
        standingPointY[i] = constrain(standingPointY[winner.id] + random(-100, 100), scoreBarHeight, getGameplayHeight() - expBarHeight - expBarBuffer);
      } else if (winner) {
        standingPointX[i] = standingPointX[winner.id];
        standingPointY[i] = standingPointY[winner.id];
      } else {
        standingPointX[i] = random(0, getGameplayWidth());
        standingPointY[i] = random(scoreBarHeight, getGameplayHeight() - expBarHeight - expBarBuffer);
      }
      
      followValue[i] = winner 
        ? constrain(followValue[winner.id] + random(-movementMutationRate, movementMutationRate), -0.5, 3.49)
        : random(-0.5, 3.49);
      
      autonomy[i] = winner 
        ? constrain(autonomy[winner.id] + random(-movementMutationRate, movementMutationRate), -0.5, 1.5)
        : random(-0.5, 1.5);
      
      // Only mutate distance if winner uses KeepDistance (autonomy near 1)
      if (winner && Math.round(autonomy[winner.id]) === 1) {
        distanceFromAnchor[i] = constrain(distanceFromAnchor[winner.id] + random(-100, 100), 0.1, 1000);
        anchorOffsetX[i] = constrain(anchorOffsetX[winner.id] + random(-50, 50), -500, 500);
        anchorOffsetY[i] = constrain(anchorOffsetY[winner.id] + random(-50, 50), -500, 500);
      } else if (winner) {
        distanceFromAnchor[i] = distanceFromAnchor[winner.id];
        anchorOffsetX[i] = anchorOffsetX[winner.id];
        anchorOffsetY[i] = anchorOffsetY[winner.id];
      } else {
        distanceFromAnchor[i] = random(0.1, 1000);
        anchorOffsetX[i] = random(-500, 500);
        anchorOffsetY[i] = random(-500, 500);
      }
      
      // Special category (mutation-based)
      specialExplosion[i] = winner
        ? constrain(specialExplosion[winner.id] + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('specialExplosion', winner.id))
        : random(0, 0.9);
      
      specialKnockback[i] = winner
        ? constrain(specialKnockback[winner.id] + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('specialKnockback', winner.id))
        : random(0, 1);

      specialCamo[i] = winner
        ? constrain(specialCamo[winner.id] + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('specialCamo', winner.id))
        : random(0, 0.9);

      specialRecoil[i] = winner
        ? constrain(specialRecoil[winner.id] + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('specialRecoil', winner.id))
        : random(0, 0.9);
      
      specialPotential[i] = winner
        ? constrain(specialPotential[winner.id] + random(-movementMutationRate, movementMutationRate), 0, 1)
        : random(0, 1);
      
      // Only mutate explosion stats if winner has specialPotential > 0.5 AND uses explosion
      if (winner && specialPotential[winner.id] > 0.5 && specialExplosion[winner.id] >= Math.max(specialKnockback[winner.id], specialCamo[winner.id], specialRecoil[winner.id])) {
        explosionProximity[i] = constrain(explosionProximity[winner.id] + random(-100, 100), 0.1, 1000);
      } else if (winner) {
        explosionProximity[i] = explosionProximity[winner.id];
      } else {
        explosionProximity[i] = random(0.1, 1000);
      }
      
      // Only mutate knockback multiplier if winner uses knockback
      if (winner && specialPotential[winner.id] > 0.5 && specialKnockback[winner.id] > Math.max(specialExplosion[winner.id], specialCamo[winner.id], specialRecoil[winner.id])) {
        bulletKnockbackMultiplier[i] = constrain(bulletKnockbackMultiplier[winner.id] + random(-0.5, 0.5), 2, getMaxAllowedValue('bulletKnockbackMultiplier', winner.id));
      } else if (winner) {
        bulletKnockbackMultiplier[i] = bulletKnockbackMultiplier[winner.id];
      } else {
        bulletKnockbackMultiplier[i] = 2; // Start at minimum
      }

      // Only mutate camouflage flash rate if winner uses camouflage
      if (winner && specialPotential[winner.id] > 0.5 && specialCamo[winner.id] > Math.max(specialExplosion[winner.id], specialKnockback[winner.id], specialRecoil[winner.id]) && specialCamo[winner.id] < 1) {
        bulletCamoFlashRate[i] = constrain(bulletCamoFlashRate[winner.id] + random(-0.2, 0.2), getMinAllowedValue('bulletCamoFlashRate', winner.id), 3);
      } else if (winner) {
        bulletCamoFlashRate[i] = bulletCamoFlashRate[winner.id];
      } else {
        bulletCamoFlashRate[i] = random(1.5, 3);
      }
      
      // Fire category (mutation-based)
      fireBurst[i] = winner
        ? constrain(fireBurst[winner.id] + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireBurst', winner.id))
        : random(0, 1);
      
      fireRapid[i] = winner
        ? constrain(fireRapid[winner.id] + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireRapid', winner.id))
        : random(0, 1);
      
      fireAlternating[i] = winner
        ? constrain(fireAlternating[winner.id] + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireAlternating', winner.id))
        : random(0, 1);
      
      fireAlarm[i] = winner
        ? constrain(fireAlarm[winner.id] + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireAlarm', winner.id))
        : random(0, 0.9);

      // Only mutate the alarm radius if winner uses alarm fire
      if (winner && getFireType(winner.id) === 5) {
        alarmInnerRadius[i] = constrain(alarmInnerRadius[winner.id] + random(-10, 10), ALARM_MIN_INNER_RADIUS, ALARM_MAX_INNER_RADIUS);
      } else if (winner) {
        alarmInnerRadius[i] = alarmInnerRadius[winner.id];
      } else {
        alarmInnerRadius[i] = random(ALARM_MIN_INNER_RADIUS, ALARM_MAX_INNER_RADIUS);
      }

      firePotential[i] = winner
        ? constrain(firePotential[winner.id] + random(-movementMutationRate, movementMutationRate), 0, 1)
        : random(0, 1);
      
      // Only mutate burst/rapid stats if winner uses burst or rapid fire
      if (winner && firePotential[winner.id] > 0.5 && (fireBurst[winner.id] >= Math.max(fireRapid[winner.id], fireAlternating[winner.id], fireAlarm[winner.id]) || fireRapid[winner.id] >= Math.max(fireBurst[winner.id], fireAlternating[winner.id], fireAlarm[winner.id]))) {
        bulletBurstCount[i] = constrain(bulletBurstCount[winner.id] + random(-1, 1), 1.5, getMaxAllowedValue('bulletBurstCount', winner.id));
        bulletBurstSpread[i] = constrain(bulletBurstSpread[winner.id] + random(-0.2, 0.2), PI/3, getMaxAllowedValue('bulletBurstSpread', winner.id));
      } else if (winner) {
        bulletBurstCount[i] = bulletBurstCount[winner.id];
        bulletBurstSpread[i] = bulletBurstSpread[winner.id];
      } else {
        bulletBurstCount[i] = random(1.5, 5.5);
        bulletBurstSpread[i] = random(PI/3, PI);
      }

      // Only mutate burst delay if winner uses delayed burst fire
      if (winner && firePotential[winner.id] > 0.5 && fireBurst[winner.id] >= 1 && fireBurst[winner.id] >= Math.max(fireRapid[winner.id], fireAlternating[winner.id], fireAlarm[winner.id])) {
        bulletBurstDelay[i] = constrain(bulletBurstDelay[winner.id] + random(-10, 10), DELAYED_BURST_MIN_DELAY, DELAYED_BURST_MAX_DELAY);
      } else if (winner) {
        bulletBurstDelay[i] = bulletBurstDelay[winner.id];
      } else {
        bulletBurstDelay[i] = random(DELAYED_BURST_MIN_DELAY, DELAYED_BURST_MAX_DELAY);
      }
      
      // Only mutate cooldown multiplier if winner uses alternating fire
      if (winner && firePotential[winner.id] > 0.5 && fireAlternating[winner.id] >= Math.max(fireBurst[winner.id], fireRapid[winner.id], fireAlarm[winner.id])) {
        bulletCooldownMultiplier[i] = constrain(bulletCooldownMultiplier[winner.id] + random(-1, 1), 0.5, getMaxAllowedValue('bulletCooldownMultiplier', winner.id));
      } else if (winner) {
        bulletCooldownMultiplier[i] = bulletCooldownMultiplier[winner.id];
      } else {
        bulletCooldownMultiplier[i] = random(0.5, 5.5);
      }
      
      // Death category (mutation-based)
      deathLandmine[i] = winner
        ? constrain(deathLandmine[winner.id] + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathLandmine', winner.id))
        : random(0, 1);
      deathRefire[i] = winner
        ? constrain(deathRefire[winner.id] + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathRefire', winner.id))
        : random(0, 1);
      
      deathTerritory[i] = winner
        ? constrain(deathTerritory[winner.id] + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathTerritory', winner.id))
        : random(0, 0.9);
      deathMound[i] = winner
        ? constrain(deathMound[winner.id] + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathMound', winner.id))
        : random(0, 0.9);
      // Every ant can hide in any bunker, so bunker range always mutates
      bunkerRange[i] = winner
        ? constrain(bunkerRange[winner.id] + random(-5, 5), BUNKER_MIN_RANGE, BUNKER_MAX_RANGE)
        : random(BUNKER_MIN_RANGE, BUNKER_MAX_RANGE);

      deathPotential[i] = winner
        ? constrain(deathPotential[winner.id] + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, 1)
        : random(0, 1);
      
      // Path category (mutation-based)
      pathHighArc[i] = winner
        ? constrain(pathHighArc[winner.id] + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathHighArc', winner.id))
        : random(0, 1);
      
      pathCurve[i] = winner
        ? constrain(pathCurve[winner.id] + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathCurve', winner.id))
        : random(0, 0.9);
      
      pathAccelerate[i] = winner
        ? constrain(pathAccelerate[winner.id] + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathAccelerate', winner.id))
        : random(0, 0.9);
      
      pathBlink[i] = winner
        ? constrain(pathBlink[winner.id] + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathBlink', winner.id))
        : random(0, 0.9);

      // Only mutate the blink delay if winner uses blink / portal
      if (winner && getPathType(winner.id) === 3) {
        blinkDelay[i] = constrain(blinkDelay[winner.id] + random(-10, 10), BLINK_MIN_DELAY, BLINK_MAX_DELAY);
      } else if (winner) {
        blinkDelay[i] = blinkDelay[winner.id];
      } else {
        blinkDelay[i] = random(BLINK_MIN_DELAY, BLINK_MAX_DELAY);
      }

      pathPotential[i] = winner
        ? constrain(pathPotential[winner.id] + random(-movementMutationRate, movementMutationRate), 0, 1)
        : random(0, 1);
      
      // Determine dominant path trait
      let pathHighArcVal = winner ? pathHighArc[winner.id] : 0.5;
      let pathCurveVal = winner ? pathCurve[winner.id] : 0.5;
      let pathAccelerateVal = winner ? pathAccelerate[winner.id] : 0.5;
      let pathBlinkVal = winner ? pathBlink[winner.id] : 0.5;
      
      // Only mutate arc duration if winner uses high arc
      if (winner && pathPotential[winner.id] > 0.5 && pathHighArcVal >= pathCurveVal && pathHighArcVal >= pathAccelerateVal && pathHighArcVal >= pathBlinkVal) {
        bulletArcDuration[i] = constrain(bulletArcDuration[winner.id] + random(-50, 50), HIGH_ARC_MIN_DURATION, HIGH_ARC_MAX_DURATION);
      } else if (winner) {
        bulletArcDuration[i] = bulletArcDuration[winner.id];
      } else {
        bulletArcDuration[i] = random(HIGH_ARC_MIN_DURATION, HIGH_ARC_MAX_DURATION);
      }
      
      // Only mutate curve strength if winner uses curve/homing path
      if (winner && pathPotential[winner.id] > 0.5 && pathCurveVal >= pathHighArcVal && pathCurveVal >= pathAccelerateVal && pathCurveVal >= pathBlinkVal) {
        const maxCurve = getMaxAllowedValue('bulletCurveStrength', winner.id);
        bulletCurveStrength[i] = constrain(bulletCurveStrength[winner.id] + random(-0.005, 0.005), -maxCurve, maxCurve);
      } else if (winner) {
        bulletCurveStrength[i] = bulletCurveStrength[winner.id];
      } else {
        bulletCurveStrength[i] = random(-0.1, 0.1);
      }
      
      // Only mutate accelerate delay if winner uses accelerating bullets
      if (winner && pathPotential[winner.id] > 0.5 && pathAccelerateVal >= pathHighArcVal && pathAccelerateVal >= pathCurveVal && pathAccelerateVal >= pathBlinkVal) {
        bulletAccelerateDelay[i] = constrain(bulletAccelerateDelay[winner.id] + random(-20, 20), getMinAllowedValue('bulletAccelerateDelay', winner.id), 200);
      } else if (winner) {
        bulletAccelerateDelay[i] = bulletAccelerateDelay[winner.id];
      } else {
        bulletAccelerateDelay[i] = random(30, 200);
      }
      
      angleFromSpawn[i] = winner 
        ? constrain(angleFromSpawn[winner.id] + random((-PI / 3), (PI / 3)), 0, TWO_PI)
        : random(0, TWO_PI);
      
      bulletSize[i] = winner 
        ? constrain(bulletSize[winner.id] + random(-(movementMutationRate / 2), (movementMutationRate / 2)), 1, 3)
        : random(1, 3);

      // Explosion stats - only mutate if winner uses explosions
      const winnerUsesExplosion = winner && specialPotential[winner.id] > 0.5 && specialExplosion[winner.id] >= Math.max(specialKnockback[winner.id], specialCamo[winner.id], specialRecoil[winner.id]);
      const winnerUsesHighArc = winner && pathPotential[winner.id] > 0.5 && pathHighArc[winner.id] >= pathCurve[winner.id] && pathHighArc[winner.id] >= pathAccelerate[winner.id] && pathHighArc[winner.id] >= pathBlink[winner.id];
      if (winnerUsesExplosion) {
        bulletExplodeAfter[i] = constrain(bulletExplodeAfter[winner.id] + random(-50, 50), EXPLODE_AFTER_MIN, EXPLODE_AFTER_MAX);
      } else if (winner) {
        bulletExplodeAfter[i] = bulletExplodeAfter[winner.id];
      } else {
        bulletExplodeAfter[i] = random(EXPLODE_AFTER_MIN, EXPLODE_AFTER_MAX);
      }

      // Radius stat - only mutate if winner uses explosions or high arc
      const winnerUsesLandmine = winner && deathPotential[winner.id] > 0.5 && deathLandmine[winner.id] > 0 && deathLandmine[winner.id] >= Math.max(deathRefire[winner.id], deathTerritory[winner.id], deathMound[winner.id]);
      const winnerUsesSmear = winnerUsesLandmine && deathLandmine[winner.id] < 1;
      const winnerUsesBeam = winner && isBeamAccelerate(winner.id);
      const winnerUsesStream = winner && isStreamFire(winner.id);
      const winnerDeathType = winner ? getDeathType(winner.id) : 0;
      const winnerUsesTerritory = winnerDeathType === 4 || winnerDeathType === 5;
      const winnerUsesMound = winnerDeathType === 6 || winnerDeathType === 7;
      if (winnerUsesExplosion || winnerUsesHighArc || winnerUsesSmear || winnerUsesBeam || winnerUsesStream || winnerUsesTerritory) {
        radiusMultiplier[i] = constrain(radiusMultiplier[winner.id] + random(-0.2, 0.2), 0.5, 3);
      } else if (winner) {
        radiusMultiplier[i] = radiusMultiplier[winner.id];
      } else {
        radiusMultiplier[i] = random(0.5, 3);
      }

      // Residue stat - only mutate if winner uses explosions, high arc, landmines, or beams
      if (winnerUsesExplosion || winnerUsesHighArc || winnerUsesLandmine || winnerUsesBeam || winnerUsesStream || winnerUsesTerritory || winnerUsesMound) {
        residueMultiplier[i] = constrain(residueMultiplier[winner.id] + random(-0.2, 0.2), 0.5, 3);
      } else if (winner) {
        residueMultiplier[i] = residueMultiplier[winner.id];
      } else {
        residueMultiplier[i] = random(0.5, 3);
      }
      
      antSize[i] = winner 
        ? constrain(antSize[winner.id] + random(-antSizeMutationRate, antSizeMutationRate), 0.3, 3)
        : 1;  // Start at 1 if no winner
      
      // Cap ant speed based on ant size (small ants can be faster, large ants slower)
      let maxAntSpeed = 4.5 - antSize[i];
      antSpeed[i] = min(antSpeed[i], maxAntSpeed);
      
      // Cap bullet size based on ant size (small ants can't have huge bullets)
      let maxBulletSize = min(3, antSize[i] + 1.0);
      bulletSize[i] = min(bulletSize[i], maxBulletSize);
      
      antMaxHealth[i] = antSize[i];
      antHealth[i] = antMaxHealth[i];
      antKnockedBack[i] = false;
      antKnockbackTimer[i] = 0;
      antKnockbackVelX[i] = 0;
      antKnockbackVelY[i] = 0;
      antStunned[i] = false;
      antStunTimer[i] = 0;
      antLastShotFrame[i] = 0;
      antAlternatingCooldownState[i] = 0;
      antRapidFireActive[i] = false;
      antAirHeight[i] = 0;
      antRecoilVelX[i] = 0;
      antRecoilVelY[i] = 0;
      antRecoilAirTimer[i] = 0;
      
      // Gene Token System - inherit or initialize
      if (winner) {
        geneTokens[i] = geneTokens[winner.id] || 0;
        geneTokenInvestments[i] = JSON.parse(JSON.stringify(geneTokenInvestments[winner.id] || [])); // Deep copy
        geneTokenLastRoundGained[i] = geneTokenLastRoundGained[winner.id] || 0;
      } else {
        geneTokens[i] = 2;
        geneTokenInvestments[i] = [];
        geneTokenLastRoundGained[i] = 0;
      }

      if (Math.round(autonomy[i]) === 0){
        followTarget[i] = false;
        keepDistance[i] = true;
      }
      // Set explosion flags based on genetics
      const specialType2 = getSpecialType(i);
      if (specialType2 === 0){
        // No special bullet behavior
        explodeOnTermination[i] = false;
        triggerExplodeViaProximity[i] = false;
      } else if (specialType2 === 1){
        // Type 1 = Explosions - check trigger type via specialExplosion value
        if (specialExplosion[i] < 1){
          // Time-based explosion (specialExplosion < 1)
          explodeOnTermination[i] = true;
          triggerExplodeViaProximity[i] = false;
        } else {
          // Proximity-based explosion (specialExplosion >= 1)
          explodeOnTermination[i] = false;
          triggerExplodeViaProximity[i] = true;
        }
      } else {
        // Knockback (-1), Camouflage (2), Ghost (-2), Recoil (3), or Launch (-3): no explosions
        explodeOnTermination[i] = false;
        triggerExplodeViaProximity[i] = false;
      }
      if (Math.round(followValue[i]) === 0){
        followAnt[i] = false;
        followBeetle[i] = true;
        findLocation[i] = false;
        standStill[i] = false;
      } else if (Math.round(followValue[i]) === 1) {
        followAnt[i] = true;
        followBeetle[i] = false;
        findLocation[i] = false;
        standStill[i] = false;
      } else if (Math.round(followValue[i]) === 2) {
        followAnt[i] = false;
        followBeetle[i] = false;
        findLocation[i] = true;
        standStill[i] = false;
      } else if (Math.round(followValue[i]) === 3) {
        followAnt[i] = false;
        followBeetle[i] = false;
        findLocation[i] = false;
        standStill[i] = true;
      }
    }
    
    // Check if this ant will fit in remaining slots (allow small floating point tolerance)
    const SLOT_EPSILON = 0.001;
    if (usedSlots + antSize[i] > group.slots + SLOT_EPSILON) {
      debugLog(`  Ant ${i} (size ${antSize[i].toFixed(2)}) won't fit in remaining slots (${(group.slots - usedSlots).toFixed(2)}), skipping`);
      // Don't increment antIndex - next group can try to use this slot
      break;  // Exit this winner's loop
    }
    
    // Now set spawn position (only for ants that will fit)
    antX[i] = random(0, getGameplayWidth());
    antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
    
    antPoints[i] = 0;
    antLives[i] = 1;

    
    debugLog(`Ant ${i} bulletSpeed = ${bulletSpeed[i]}, cooldown = ${bulletCooldown[i]}`);
    
    // Track slot usage and increment counters
    usedSlots += antSize[i];
    antIndex++;
    antsFromThisWinner++;
    
    debugLog(`  Ant ${i} from ${group.name}: size=${antSize[i].toFixed(2)}, used slots=${usedSlots.toFixed(2)}/${group.slots}`);
    }
    
    debugLog(`Winner ${group.name}: created ${antsFromThisWinner} ants using ${usedSlots.toFixed(2)}/${group.slots} slots`);
  }
  
  // Set enemyCount to actual number of ants created
  enemyCount = antIndex - 1;
  playerSpeed = movementSpeed / enemyCount;
  debugLog(`Total: Created ${enemyCount} ants across all winners`);

  // Gene Token System - Update existing investments and allocate new tokens
  for (let i = 1; i <= enemyCount; i++) {
    updateTokenInvestments(i, level);
    
    // Immediately invest all available tokens
    let investmentAttempts = 0;
    const maxAttempts = 10; // Prevent infinite loops
    while (geneTokens[i] > 0 && investmentAttempts < maxAttempts) {
      let tokensBefore = geneTokens[i];
      evaluateAndAllocateTokens(i, level, false); // Not initial setup
      if (geneTokens[i] === tokensBefore) {
        // No investment made, break to avoid infinite loop
        break;
      }
      investmentAttempts++;
    }
  }

  // Multiplayer: After setting up the new round, prepare for first player
  if (multiplayerTransition) {
    // Reset round flags for all players
    for (let p of players) {
      p.hasPlayedRound = false;
      p.scoredDeath = false;
      p.roundScore = 0;
    }
    
    // Find first alive player for the new round
    currentPlayerIndex = -1;
    for (let i = 0; i < numPlayers; i++) {
      if (players[i].alive) {
        currentPlayerIndex = i;
        break;
      }
    }
    
    if (currentPlayerIndex === -1) {
      // No players alive - return to menu
      returnToMainMenu();
      return;
    }
    
    // Load first player's state and show turn screen
    loadPlayerState(currentPlayerIndex);
    showPlayerTurnScreen = true;
    
    // Play title music for turn screen
    gamemusic.stop();
    if (!titlemusic.isPlaying()) {
      titlemusic.play();
    }
  }

}




// Seven stills with captions, then a cut to the splash screen (which carries the title).
// `hold` overrides CINEMATIC_HOLD_FRAMES for a still. `art` is null until the real stills exist; drop a loadImage() result in to replace the `blockout` sketch.
const OPENING_CINEMATIC = [
  {
    title: "Balance",
    blockout: drawBlockoutBalance,
    description: "Forest floor. Spider web in one corner, snake eating a mouse in the opposite corner.",
    caption: "In the forest, nature is a delicate balance. Generations of adaptations to eat what you're meant to eat, and not get eaten by what eats you.",
    art: null
  },
  {
    title: "Arrival",
    blockout: drawBlockoutArrival,
    description: "Wide shot of a boat docking on the shore.",
    caption: "But that all changed the second a foreign ship showed up...",
    art: null
  },
  {
    title: "Spill",
    blockout: drawBlockoutSpill,
    description: "Ants pouring out of a crate.",
    caption: "...and little stowaways crawled out.",
    art: null
  },
  {
    title: "Wave",
    blockout: drawBlockoutWave,
    description: "The ant tide carrying off the spider, snake, and mouse, all dead.",
    caption: "With no predators in this new land, everything became their prey. Nothing had seen anything like them.",
    art: null
  },
  {
    title: "Scale",
    blockout: drawBlockoutScale,
    description: "Countless ants, the occasional queen, and a huge shadowy silhouette looming in the back.",
    caption: "Unchecked, their numbers grew and grew, and it seemed like no one could stop them.",
    art: null
  },
  {
    title: "Watcher",
    blockout: drawBlockoutWatcher,
    description: "The red and blue beetle on a ledge, looking at a lone scout.",
    caption: "But maybe it takes someone more adaptable...",
    hold: 270, // the last two linger so the build-up lands
    art: null
  },
  {
    title: "Eyes",
    blockout: drawBlockoutEyes,
    description: "Extreme close-up of the beetle's eyes.",
    caption: "Someone willing to be a problem. Someone to be an-",
    hold: 180,
    art: null
  }
];
const CINEMATIC_FADE_FRAMES = 30;
const CINEMATIC_CHARS_PER_FRAME = 0.8; // caption typewriter speed
const CINEMATIC_HOLD_FRAMES = 150; // how long a fully typed caption stays up before moving on

function cinematicCaptionDoneFrame(frame) {
  return CINEMATIC_FADE_FRAMES + ceil(frame.caption.length / CINEMATIC_CHARS_PER_FRAME);
}

// Enter / A / click: finish typing the caption, or move to the next still
function advanceOpeningCinematic() {
  if (cinematicFrame >= OPENING_CINEMATIC.length) {
    endOpeningCinematic(); // title card
    return;
  }
  let frame = OPENING_CINEMATIC[cinematicFrame];
  if (cinematicTimer < cinematicCaptionDoneFrame(frame)) {
    cinematicTimer = cinematicCaptionDoneFrame(frame);
  } else {
    nextOpeningCinematicFrame();
  }
}

// Replay from the main menu; ends back on the splash screen like the first viewing
function startOpeningCinematic() {
  startMenu = false;
  openingCinematic = true;
  cinematicFrame = 0;
  cinematicTimer = 0;
  cinematicFlash = 0;
}

function nextOpeningCinematicFrame() {
  cinematicFrame++;
  cinematicTimer = 0;
  // One step past the last still is the title card
  if (cinematicFrame > OPENING_CINEMATIC.length) {
    endOpeningCinematic();
  }
}

// Esc / B skips the rest; either way it won't play again on later launches
function endOpeningCinematic() {
  openingCinematic = false;
  cinematicFrame = 0;
  cinematicTimer = 0;
  cinematicFlash = 20;
  storeItem('openingCinematicSeen', true);
}

function drawOpeningCinematic() {
  if (isBackPressed()) {
    cinematicFlash = 0;
    endOpeningCinematic();
    menuNavigationCooldown = 20;
    return;
  }
  if (isConfirmPressed()) {
    advanceOpeningCinematic();
    if (!openingCinematic) return;
  }
  if (cinematicFrame >= OPENING_CINEMATIC.length) {
    drawCinematicTitle();
    return;
  }

  let frame = OPENING_CINEMATIC[cinematicFrame];
  let captionDone = cinematicCaptionDoneFrame(frame);
  let lastFrame = cinematicFrame === OPENING_CINEMATIC.length - 1;
  // The last still cuts straight to the title mid-word instead of fading out
  let endFrame = captionDone + (frame.hold || CINEMATIC_HOLD_FRAMES);

  beginMenuScaling();
  let w = getMenuWidth();
  let h = getMenuHeight();
  background(0);

  // Still (or its placeholder), letterboxed above the caption
  let artW = w * 0.72;
  let artH = h * 0.62;
  let artX = (w - artW) / 2;
  let artY = h * 0.08;
  if (frame.art) {
    imageMode(CORNER);
    image(frame.art, artX, artY, artW, artH);
  } else {
    // Placeholder: a rough blockout of the still, clipped to the frame
    push();
    translate(artX, artY);
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(0, 0, artW, artH);
    drawingContext.clip();
    frame.blockout(artW, artH, cinematicTimer);
    drawingContext.restore();
    noFill();
    stroke(90);
    strokeWeight(2);
    drawingContext.setLineDash([12, 10]);
    rect(0, 0, artW, artH, 6);
    drawingContext.setLineDash([]);
    noStroke();
    fill(0, 160);
    rect(10, 10, 330, 30, 4);
    fill(220);
    textAlign(LEFT, CENTER);
    textSize(16);
    text("PLACEHOLDER  \u2022  " + (cinematicFrame + 1) + "/" + OPENING_CINEMATIC.length + "  " + frame.title, 20, 25);
    pop();
  }

  // Caption, typed out
  let shown = floor(max(0, cinematicTimer - CINEMATIC_FADE_FRAMES) * CINEMATIC_CHARS_PER_FRAME);
  push();
  noStroke();
  fill(235);
  textAlign(CENTER, TOP);
  textSize(30);
  text(frame.caption.substring(0, shown), w * 0.14, h * 0.75, w * 0.72, h * 0.17);
  pop();

  // Fade in from black, fade out to black (except the last still's hard cut)
  let fade = 0;
  if (cinematicTimer < CINEMATIC_FADE_FRAMES) {
    fade = 1 - cinematicTimer / CINEMATIC_FADE_FRAMES;
  } else if (!lastFrame && cinematicTimer > endFrame - CINEMATIC_FADE_FRAMES) {
    fade = (cinematicTimer - (endFrame - CINEMATIC_FADE_FRAMES)) / CINEMATIC_FADE_FRAMES;
  }
  if (fade > 0) {
    noStroke();
    fill(0, constrain(fade, 0, 1) * 255);
    rect(0, 0, w, h);
  }

  push();
  noStroke();
  fill(120);
  textAlign(RIGHT, BOTTOM);
  textSize(16);
  text("Enter / Click: next     Esc: skip", w - 24, h - 16);
  pop();
  endMenuScaling();

  cinematicTimer++;
  if (cinematicTimer >= endFrame) {
    nextOpeningCinematicFrame();
  }
}

// Title card: the word alone on black, slammed in exactly where it sits on the splash art,
// then the flash reveals the rest of the splash around it
const CINEMATIC_TITLE_FRAMES = 150;
// Letter colors and title placement copied from img/antagonist-splashscreen.png (1400 x 1000)
const CINEMATIC_TITLE_LETTERS = [
  ["ANT", [80, 200, 50]],
  ["ag", [140, 45, 45]],
  ["on", [215, 35, 35]],
  ["ist", [40, 100, 230]]
];
const SPLASH_TITLE_LEFT = 145;
const SPLASH_TITLE_RIGHT = 1260;
const SPLASH_TITLE_BASELINE = 300;

function drawCinematicTitle() {
  beginMenuScaling();
  let w = getMenuWidth();
  let h = getMenuHeight();
  background(0);

  // Map splash image pixels to menu space (the splash is drawn centered, h * 1.4 wide by h tall)
  let left = w / 2 + (SPLASH_TITLE_LEFT - 700) / 1000 * h;
  let right = w / 2 + (SPLASH_TITLE_RIGHT - 700) / 1000 * h;
  let baseline = h / 2 + (SPLASH_TITLE_BASELINE - 500) / 1000 * h;

  let word = CINEMATIC_TITLE_LETTERS.map(part => part[0]).join("");
  textFont("Creepster,Impact,sans-serif");
  textSize(100);
  let size = min(100 * (right - left) / textWidth(word), h * 0.22);
  textSize(size);
  // Spread the letters so the word spans the same width as the hand-drawn title
  let tracking = max(0, (right - left) - textWidth(word)) / (word.length - 1);
  let wordW = textWidth(word) + tracking * (word.length - 1);

  // Slam in over 10 frames, then a shake that settles
  let t = cinematicTimer;
  let slam = constrain(t / 10, 0, 1);
  let zoom = lerp(1.6, 1, slam * slam);
  let shake = t >= 10 ? max(0, 1 - (t - 10) / 20) * 10 : 0;
  push();
  translate((left + right) / 2 + random(-shake, shake), baseline - size * 0.35 + random(-shake, shake));
  scale(zoom);
  textAlign(LEFT, BASELINE);
  noStroke();
  let x = -wordW / 2;
  for (let [letters, col] of CINEMATIC_TITLE_LETTERS) {
    drawingContext.shadowBlur = 30;
    drawingContext.shadowColor = "rgb(" + col.join(",") + ")";
    fill(col[0], col[1], col[2], 255 * slam);
    for (let ch of letters) {
      text(ch, x, size * 0.35);
      x += textWidth(ch) + tracking;
    }
  }
  drawingContext.shadowBlur = 0;
  pop();
  textFont("sans-serif");
  endMenuScaling();

  cinematicTimer++;
  if (cinematicTimer >= CINEMATIC_TITLE_FRAMES) {
    endOpeningCinematic();
  }
}

// Brief white flash as the cinematic cuts to the title
function drawCinematicFlash() {
  if (cinematicFlash <= 0) return;
  push();
  noStroke();
  fill(255, (cinematicFlash / 20) * 255);
  rect(0, 0, width, height);
  pop();
  cinematicFlash--;
}

// ---- Opening cinematic placeholder blockouts ----
// Rough shape sketches of each still, drawn in the art frame's local space (w x h), t = frames on this still

// Stable pseudo-random in [0, 1) so the blockouts don't flicker or touch the game's random() seed
function cineRand(i) {
  let x = sin(i * 12.9898) * 43758.5453;
  return x - floor(x);
}

// Matches the in-game ant sprite: dark maroon body with acid green bands on the abdomen and head
function drawCineAnt(x, y, s, angle, col) {
  push();
  translate(x, y);
  rotate(angle);
  stroke(col);
  strokeWeight(max(1, s * 0.12));
  for (let i = -1; i <= 1; i++) {
    line(i * s * 0.35, 0, i * s * 0.5, -s * 0.55);
    line(i * s * 0.35, 0, i * s * 0.5, s * 0.55);
  }
  noStroke();
  fill(col);
  ellipse(-s * 0.6, 0, s * 0.75, s * 0.6); // abdomen
  ellipse(0, 0, s * 0.5, s * 0.38); // thorax
  ellipse(s * 0.45, 0, s * 0.45, s * 0.45); // head
  fill(130, 220, 40);
  if (s >= 8) {
    rect(-s * 0.72, -s * 0.24, s * 0.12, s * 0.48);
    rect(s * 0.5, -s * 0.17, s * 0.08, s * 0.34);
    ellipse(0, 0, s * 0.12, s * 0.12);
  } else {
    ellipse(-s * 0.6, 0, s * 0.25, s * 0.25);
  }
  pop();
}

function drawCineSpider(x, y, s, dead) {
  push();
  translate(x, y);
  if (dead) rotate(PI);
  stroke(30);
  strokeWeight(s * 0.08);
  noFill();
  for (let side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      let a = -0.9 + i * 0.6;
      let kx = side * s * 0.6 * cos(a * 0.6);
      let ky = s * 0.5 * sin(a);
      line(0, 0, kx, ky - s * 0.3);
      line(kx, ky - s * 0.3, side * s * 0.9 * cos(a * 0.6), ky + s * 0.2);
    }
  }
  noStroke();
  fill(30);
  ellipse(0, s * 0.15, s * 0.55, s * 0.65);
  ellipse(0, -s * 0.25, s * 0.35, s * 0.3);
  if (dead) {
    // X eyes
    stroke(220);
    strokeWeight(s * 0.04);
    line(-s * 0.1, -s * 0.3, -s * 0.02, -s * 0.22);
    line(-s * 0.02, -s * 0.3, -s * 0.1, -s * 0.22);
    line(s * 0.02, -s * 0.3, s * 0.1, -s * 0.22);
    line(s * 0.1, -s * 0.3, s * 0.02, -s * 0.22);
  }
  pop();
}

function drawCineMouse(x, y, s, angle) {
  push();
  translate(x, y);
  rotate(angle);
  stroke(150, 120, 120);
  strokeWeight(s * 0.06);
  noFill();
  bezier(-s * 0.5, 0, -s * 0.9, -s * 0.1, -s * 1.0, s * 0.3, -s * 1.3, s * 0.2);
  noStroke();
  fill(140, 135, 130);
  ellipse(0, 0, s, s * 0.6);
  ellipse(s * 0.45, -s * 0.05, s * 0.45, s * 0.35);
  ellipse(s * 0.35, -s * 0.25, s * 0.22, s * 0.22);
  pop();
}

// Matches the in-game beetle sprite: navy blue shell, red head, black legs with red tips
function drawCineBeetle(x, y, s, angle) {
  push();
  translate(x, y);
  rotate(angle);
  for (let i = -1; i <= 1; i++) {
    for (let side of [-1, 1]) {
      let tipX = i * s * 0.32;
      let tipY = side * s * 0.62;
      stroke(10);
      strokeWeight(s * 0.07);
      line(i * s * 0.25, 0, tipX, tipY);
      noStroke();
      fill(160, 20, 20);
      ellipse(tipX, tipY, s * 0.1, s * 0.1);
    }
  }
  stroke(0);
  strokeWeight(s * 0.05);
  fill(150, 20, 20);
  ellipse(s * 0.66, 0, s * 0.42, s * 0.48); // head
  fill(12, 18, 70);
  ellipse(0, 0, s * 1.1, s * 0.9); // shell
  line(-s * 0.55, 0, s * 0.55, 0);
  noStroke();
  fill(35, 70, 150);
  ellipse(-s * 0.05, -s * 0.2, s * 0.12, s * 0.08);
  fill(10);
  ellipse(s * 0.76, -s * 0.14, s * 0.1, s * 0.1);
  ellipse(s * 0.76, s * 0.14, s * 0.1, s * 0.1);
  pop();
}

function drawCineForestFloor(w, h) {
  noStroke();
  fill(196, 108, 46); // same orange as the in-game ground
  rect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    fill(175 + cineRand(i) * 40, 95 + cineRand(i + 99) * 25, 40);
    ellipse(cineRand(i + 7) * w, cineRand(i + 13) * h, 30 + cineRand(i + 3) * 60, 18 + cineRand(i + 5) * 30);
  }
  // Dry leaves, kept muted so the green on the ants and snake still pops
  for (let i = 0; i < 18; i++) {
    push();
    translate(cineRand(i + 200) * w, cineRand(i + 300) * h);
    rotate(cineRand(i + 400) * TWO_PI);
    fill(150 + cineRand(i) * 40, 80 + cineRand(i + 1) * 30, 35);
    ellipse(0, 0, 40, 16);
    pop();
  }
}

function drawBlockoutBalance(w, h, t) {
  drawCineForestFloor(w, h);
  // Web in the top-left corner
  push();
  stroke(225, 225, 225, 170);
  strokeWeight(1.5);
  noFill();
  let cx = w * 0.04;
  let cy = h * 0.05;
  for (let i = 0; i < 7; i++) {
    let a = i * (HALF_PI / 6);
    line(cx, cy, cx + cos(a) * w * 0.32, cy + sin(a) * w * 0.32);
  }
  for (let r = 1; r <= 6; r++) {
    beginShape();
    for (let i = 0; i < 7; i++) {
      let a = i * (HALF_PI / 6);
      vertex(cx + cos(a) * r * w * 0.05, cy + sin(a) * r * w * 0.05);
    }
    endShape();
  }
  pop();
  drawCineSpider(w * 0.17, h * 0.23 + sin(t * 0.05) * 3, 50, false);

  // Snake eating a mouse in the bottom-right corner; mouse goes in head first, tail out
  drawCineMouse(w * 0.7, h * 0.79, 60, 0.1);
  push();
  noFill();
  strokeCap(ROUND);
  stroke(70, 120, 50);
  strokeWeight(34);
  bezier(w * 1.05, h * 0.55, w * 0.85, h * 0.6, w * 0.95, h * 0.95, w * 0.78, h * 0.82);
  stroke(95, 150, 65);
  strokeWeight(10);
  bezier(w * 1.05, h * 0.55, w * 0.85, h * 0.6, w * 0.95, h * 0.95, w * 0.78, h * 0.82);
  noStroke();
  fill(70, 120, 50);
  ellipse(w * 0.75, h * 0.8, 80, 62);
  fill(240, 210, 60);
  ellipse(w * 0.76, h * 0.765, 10, 8);
  pop();
}

function drawBlockoutArrival(w, h, t) {
  noStroke();
  // Sky
  for (let i = 0; i < 6; i++) {
    fill(70 + i * 22, 110 + i * 18, 160 + i * 12);
    rect(0, i * h * 0.075, w, h * 0.08);
  }
  // Sea
  fill(40, 80, 130);
  rect(0, h * 0.45, w, h * 0.55);
  stroke(120, 170, 210, 150);
  strokeWeight(2);
  for (let i = 0; i < 14; i++) {
    let wx = cineRand(i + 50) * w * 0.7;
    let wy = h * 0.5 + cineRand(i + 60) * h * 0.45;
    let drift = sin(t * 0.03 + i) * 6;
    line(wx + drift, wy, wx + 30 + drift, wy);
  }
  noStroke();
  // Shore and dock
  fill(205, 185, 135);
  beginShape();
  vertex(w * 0.62, h);
  vertex(w * 0.78, h * 0.5);
  vertex(w, h * 0.42);
  vertex(w, h);
  endShape(CLOSE);
  fill(60, 110, 50);
  ellipse(w * 0.95, h * 0.43, w * 0.2, h * 0.12);
  fill(110, 80, 50);
  rect(w * 0.55, h * 0.66, w * 0.24, h * 0.03);
  for (let i = 0; i < 4; i++) rect(w * 0.56 + i * w * 0.07, h * 0.66, 8, h * 0.12);

  // Ship, bobbing as it docks
  push();
  translate(w * 0.32, h * 0.62 + sin(t * 0.04) * 4);
  fill(90, 50, 35);
  beginShape();
  vertex(-w * 0.24, -h * 0.06);
  vertex(w * 0.24, -h * 0.06);
  vertex(w * 0.18, h * 0.08);
  vertex(-w * 0.2, h * 0.08);
  endShape(CLOSE);
  fill(170, 50, 40);
  rect(-w * 0.24, -h * 0.06, w * 0.48, h * 0.02);
  fill(70, 45, 30);
  rect(-6, -h * 0.5, 12, h * 0.44);
  rect(-w * 0.13, -h * 0.4, 9, h * 0.34);
  fill(235, 230, 215);
  triangle(10, -h * 0.47, 10, -h * 0.12, w * 0.15, -h * 0.14);
  triangle(-w * 0.12, -h * 0.37, -w * 0.12, -h * 0.12, -w * 0.02, -h * 0.13);
  fill(150, 110, 60);
  rect(w * 0.08, -h * 0.12, w * 0.07, h * 0.06); // the crate
  stroke(100, 70, 40);
  strokeWeight(2);
  line(w * 0.08, -h * 0.12, w * 0.15, -h * 0.06);
  pop();
}

function drawBlockoutSpill(w, h, t) {
  drawCineForestFloor(w, h);
  // Crate with its lid knocked open
  push();
  translate(w * 0.3, h * 0.45);
  noStroke();
  fill(150, 110, 60);
  rect(-w * 0.15, -h * 0.25, w * 0.3, h * 0.5);
  stroke(100, 70, 40);
  strokeWeight(4);
  for (let i = 1; i < 4; i++) line(-w * 0.15, -h * 0.25 + i * h * 0.125, w * 0.15, -h * 0.25 + i * h * 0.125);
  line(-w * 0.15, -h * 0.25, w * 0.15, h * 0.25);
  noStroke();
  fill(20);
  rect(w * 0.11, -h * 0.2, w * 0.04, h * 0.4); // open side
  fill(170, 125, 70);
  push();
  translate(w * 0.15, -h * 0.25);
  rotate(0.9);
  rect(0, -6, h * 0.45, 12);
  pop();
  pop();
  // Ants pouring out the open side and fanning across the floor
  for (let i = 0; i < 90; i++) {
    let progress = (cineRand(i) + t * 0.004) % 1;
    let spread = (cineRand(i + 500) - 0.5) * progress * h * 1.1;
    let ax = w * 0.45 + progress * w * 0.6;
    let ay = h * 0.45 + spread + sin(progress * 20 + i) * 6;
    drawCineAnt(ax, ay, 14, atan2(spread, progress * w * 0.6 + 1) + sin(t * 0.2 + i) * 0.2, color(60, 18, 18));
  }
}

function drawBlockoutWave(w, h, t) {
  drawCineForestFloor(w, h);
  let march = (t * 1.2) % 40;
  // The ant tide, a dense band sweeping right
  for (let i = 0; i < 260; i++) {
    let ax = (cineRand(i) * w * 1.2 - w * 0.1 + march) % (w * 1.1);
    let ay = h * 0.35 + cineRand(i + 900) * h * 0.55;
    drawCineAnt(ax, ay, 13, sin(i) * 0.25, color(50 + cineRand(i + 1) * 30, 15, 15));
  }
  // Carried off on top of the tide, all dead
  drawCineSpider(w * 0.25 + march, h * 0.5, 55, true);
  push();
  translate(march, 0);
  noFill();
  strokeCap(ROUND);
  stroke(70, 120, 50);
  strokeWeight(24);
  bezier(w * 0.38, h * 0.62, w * 0.5, h * 0.48, w * 0.6, h * 0.78, w * 0.72, h * 0.6);
  stroke(240);
  strokeWeight(3);
  line(w * 0.72 - 6, h * 0.6 - 6, w * 0.72 + 6, h * 0.6 + 6);
  line(w * 0.72 + 6, h * 0.6 - 6, w * 0.72 - 6, h * 0.6 + 6);
  pop();
  drawCineMouse(w * 0.82 + march, h * 0.72, 45, PI * 0.9); // belly up
  // A few ants in front so the bodies look carried, not floating
  for (let i = 0; i < 40; i++) {
    let ax = (cineRand(i + 40) * w + march) % w;
    drawCineAnt(ax, h * 0.6 + cineRand(i + 70) * h * 0.2, 13, 0, color(65, 20, 18));
  }
}

function drawBlockoutScale(w, h, t) {
  noStroke();
  fill(30, 25, 30);
  rect(0, 0, w, h);
  // Huge shadowy silhouette looming in the back
  push();
  translate(w * 0.5, h * 0.42 + sin(t * 0.02) * 4);
  fill(12, 10, 14);
  ellipse(-w * 0.22, h * 0.05, w * 0.45, h * 0.5);
  ellipse(0, 0, w * 0.22, h * 0.28);
  ellipse(w * 0.18, -h * 0.08, w * 0.22, h * 0.3);
  stroke(12, 10, 14);
  strokeWeight(16);
  for (let i = -1; i <= 1; i++) {
    line(i * w * 0.06, 0, i * w * 0.2, h * 0.5);
  }
  line(w * 0.24, -h * 0.18, w * 0.36, -h * 0.42);
  line(w * 0.2, -h * 0.2, w * 0.26, -h * 0.48);
  noStroke();
  fill(200, 40, 30, 150 + sin(t * 0.06) * 80);
  ellipse(w * 0.22, -h * 0.11, 16, 10);
  pop();
  // Ground and the swarm, bigger toward the front
  fill(160, 85, 35); // in-game orange, dimmed under the looming shadow
  rect(0, h * 0.6, w, h * 0.4);
  for (let i = 0; i < 420; i++) {
    let depth = cineRand(i + 1000);
    let ay = h * 0.58 + depth * h * 0.42;
    let ax = cineRand(i) * w + sin(t * 0.03 + i) * 3;
    drawCineAnt(ax, ay, 5 + depth * 12, cineRand(i + 7) * TWO_PI, color(35 + depth * 30, 12, 12));
  }
  // The occasional queen, bigger and winged
  for (let q = 0; q < 3; q++) {
    let qx = w * (0.2 + q * 0.3);
    let qy = h * (0.75 + cineRand(q + 77) * 0.15);
    noStroke();
    fill(200, 200, 220, 120);
    ellipse(qx - 6, qy - 14, 34, 16);
    ellipse(qx - 6, qy + 14, 34, 16);
    drawCineAnt(qx, qy, 30, 0, color(95, 25, 25));
  }
}

function drawBlockoutWatcher(w, h, t) {
  drawCineForestFloor(w, h);
  noStroke();
  fill(0, 35);
  rect(0, 0, w, h);
  // Rock ledge up on the left
  fill(105, 100, 95);
  beginShape();
  vertex(0, h * 0.25);
  vertex(w * 0.38, h * 0.3);
  vertex(w * 0.42, h * 0.38);
  vertex(w * 0.3, h * 0.55);
  vertex(w * 0.15, h * 0.8);
  vertex(0, h * 0.85);
  endShape(CLOSE);
  fill(130, 125, 118);
  quad(0, h * 0.25, w * 0.38, h * 0.3, w * 0.36, h * 0.33, 0, h * 0.3);
  // Beetle on the edge, looking down at the scout
  drawCineBeetle(w * 0.3, h * 0.22, 130, 0.55);
  stroke(255, 255, 255, 60);
  strokeWeight(2);
  drawingContext.setLineDash([6, 10]);
  line(w * 0.36, h * 0.28, w * 0.68, h * 0.72);
  drawingContext.setLineDash([]);
  // Lone scout wandering below in a pool of light
  noStroke();
  fill(255, 240, 200, 25);
  ellipse(w * 0.7, h * 0.74, 160, 90);
  drawCineAnt(w * 0.7 + sin(t * 0.03) * 20, h * 0.74, 22, sin(t * 0.03 + 1) * 0.6, color(60, 18, 18));
}

function drawBlockoutEyes(w, h, t) {
  noStroke();
  fill(10);
  rect(0, 0, w, h);
  // Slow push in on the face
  let zoom = 1 + min(t, 300) * 0.0003;
  push();
  translate(w / 2, h / 2);
  scale(zoom);
  translate(-w / 2, -h / 2);
  // Navy shell rising behind the red head
  stroke(0);
  strokeWeight(6);
  fill(12, 18, 70);
  ellipse(w / 2, -h * 0.15, w * 1.5, h * 0.9);
  line(w / 2, -h * 0.6, w / 2, h * 0.3);
  fill(150, 20, 20);
  ellipse(w / 2, h * 0.78, w * 0.85, h * 1.2);
  noStroke();
  fill(185, 40, 35);
  ellipse(w * 0.44, h * 0.42, w * 0.2, h * 0.12);
  // Mandibles
  fill(15);
  triangle(w * 0.43, h * 0.95, w * 0.49, h * 0.93, w * 0.47, h * 1.05);
  triangle(w * 0.57, h * 0.95, w * 0.51, h * 0.93, w * 0.53, h * 1.05);

  // Compound eyes: glossy domes of facets, no pupils
  for (let side of [-1, 1]) {
    let ex = w / 2 + side * w * 0.28;
    let ey = h * 0.55;
    let ew = w * 0.25;
    let eh = h * 0.55;
    stroke(0);
    strokeWeight(6);
    fill(20, 8, 14);
    ellipse(ex, ey, ew, eh);
    noStroke();
    let d = ew / 11;
    // Light comes from the upper outer edge
    let lightX = ex + side * ew * 0.18;
    let lightY = ey - eh * 0.25;
    for (let row = 0; row * d * 0.87 < eh; row++) {
      let fy = ey - eh / 2 + row * d * 0.87;
      for (let fx = ex - ew / 2 + (row % 2) * d / 2; fx < ex + ew / 2; fx += d) {
        let nx = (fx - ex) / (ew / 2);
        let ny = (fy - ey) / (eh / 2);
        if (nx * nx + ny * ny > 0.85) continue;
        let glow = constrain(1 - dist(fx, fy, lightX, lightY) / (ew * 0.75), 0, 1);
        fill(40 + glow * 90, 15 + glow * 30, 30 + glow * 45);
        ellipse(fx, fy, d * 0.85, d * 0.85);
      }
    }
    // Wet highlight sliding across the dome
    let shimmer = sin(t * 0.03) * ew * 0.04;
    fill(255, 255, 255, 150);
    ellipse(lightX + shimmer, lightY, ew * 0.18, eh * 0.08);
    fill(255, 255, 255, 60);
    ellipse(lightX + shimmer - side * ew * 0.05, lightY + eh * 0.1, ew * 0.08, eh * 0.04);
  }
  pop();
}

// Main menu entries, top to bottom
function getMainMenuOptions() {
  return [
    { label: 'Single Player', color: [255, 255, 100], action: () => {
      // The first time, Single Player starts (or picks the tutorial back up where it was left)
      if (shouldAutoStartTutorial()) {
        startTutorial(false);
        return;
      }
      pendingGameMode = 'single';
      openDifficultyMenu();
      startMenu = false;
    } },
    { label: 'Multiplayer', color: [100, 255, 100], action: () => {
      pendingGameMode = 'multiplayer';
      openDifficultyMenu();
      startMenu = false;
    } },
    { label: 'Tutorial', note: getTutorialMenuNote(), color: [120, 200, 255], action: () => openTutorialMenu() },
    { label: 'Antdex', color: [160, 120, 255], action: () => {
      antdex = true;
      startMenu = false;
      antdexReturnState = 'menu';
    } },
    { label: 'Queen Upgrades', color: [230, 180, 255], action: () => openQueenShop() },
    { label: 'Watch Intro', color: [200, 60, 60], action: () => startOpeningCinematic() }
  ];
}

function drawStartScreen(){

  beginMenuScaling();
    // Player selection screen for multiplayer
    if (playerSelectScreen) {
      // Dark background
      fill(20);
      rect(0, 0, getMenuWidth(), getMenuHeight());
      
      // Title
      fill(255);
      textAlign(CENTER);
      textSize(60);
      text("Select Number of Players", getMenuWidth() / 2, getMenuHeight() * 0.25);
      
      // Navigation
      if (menuNavigationCooldown === 0) {
        if (isLeftPressed()) {
          playerSelectSelection = (playerSelectSelection - 1 + 5) % 5;
          menuNavigationCooldown = 10;
        } else if (isRightPressed()) {
          playerSelectSelection = (playerSelectSelection + 1) % 5;
          menuNavigationCooldown = 10;
        }
      }
      
      // Player count options (2-6 players)
      let optionSpacing = 100;
      let startX = getMenuWidth() / 2 - (4 * optionSpacing) / 2;
      
      for (let i = 0; i < 5; i++) {
        let optionX = startX + i * optionSpacing;
        let optionY = getMenuHeight() * 0.45;
        let optionSize = 80;
        
        push();
          rectMode(CENTER);
          if (playerSelectSelection === i) {
            fill(255);
            stroke(255, 255, 100);
            strokeWeight(3);
          } else {
            fill(50, 50, 50);
            stroke(100, 100, 100);
            strokeWeight(2);
          }
          rect(optionX, optionY, optionSize, optionSize, 12);
          
          if (playerSelectSelection === i) {
            fill(10);
          } else {
            fill(255);
          }
          textSize(36);
          textAlign(CENTER, CENTER);
          text(i + 2, optionX, optionY);
        pop();
      }
      
      // Instructions
      let fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
      fill(200, fadeAlpha);
      textSize(18);
      textAlign(CENTER);
      text('A/D or ←/→ or Left Stick  Navigate  |  Enter or A  Start  |  Esc or B  Back', getMenuWidth() / 2, getMenuHeight() * 0.65);
      
      // Confirm selection
      if (isConfirmPressed() && menuNavigationCooldown === 0) {
        numPlayers = playerSelectSelection + 2;
        multiplayerMode = true;
        playerSelectScreen = false;
        initializeMultiplayer();
        // Apply custom ant stats if enabled
        if (devToolsUseCustomAnts) {
          applyCustomAntsToInitialPopulation();
        } else {
          applyDifficultyToInitialPopulation();
        }
        start = true;
        startRoundIntro();
        // Don't change music here - title music already playing and will continue for turn screen
        menuNavigationCooldown = 20;
      }
      
      // Back to menu
      if (isBackPressed() && menuNavigationCooldown === 0) {
        playerSelectScreen = false;
        startMenu = true;
        menuNavigationCooldown = 20;
      }
      
      pop();
      return;
    }
    
    if (queenShopMenu) {
      drawQueenShop();
    }
    if (startMenu === false && !difficultyMenu && !queenShopMenu){
      imageMode(CENTER);
      image(splashScreen, getMenuWidth() / 2, getMenuHeight() / 2, getMenuHeight() * 1.4, getMenuHeight());
      if(!titlemusic.isPlaying()) {
        titlemusic.play();
      }
      if (isConfirmPressed()) {
        menuNavigationCooldown = 20; // Prevent immediate menu selection
        // The very first time, the tutorial starts right away instead of the main menu
        if (isFirstTutorialLaunch()) startTutorial(true);
        else startMenu = true;
      }
    }
    if (startMenu === true && !difficultyMenu){
      imageMode(CENTER);
      image(splashScreen, getMenuWidth() / 2, getMenuHeight() / 2, getMenuHeight() * 1.4, getMenuHeight());
      if(!titlemusic.isPlaying()) {
        titlemusic.play();
      }
      // Dark background like AntDex
      imageMode(CORNER);
      fill(20);
      rect(0, 0, getMenuWidth(), getMenuHeight());
      
      const menuOptions = getMainMenuOptions();
      startMenuSelection = constrain(startMenuSelection, 0, menuOptions.length - 1);

      // Menu navigation with arrow keys, WASD, and gamepad (the tutorial's own menu takes over while it's open)
      if (menuNavigationCooldown === 0 && !tutorialMenuOpen) {
        if (isUpPressed()) { // Up or W
          startMenuSelection = (startMenuSelection - 1 + menuOptions.length) % menuOptions.length;
          menuNavigationCooldown = 10;
        } else if (isDownPressed()) { // Down or S
          startMenuSelection = (startMenuSelection + 1) % menuOptions.length;
          menuNavigationCooldown = 10;
        }
      }

      // Title
      fill(255);
      textAlign(CENTER);
      textSize(70);
      text("Main Menu", getMenuWidth() / 2, getMenuHeight() * 0.16);

      // Options as cards: white with a colored outline when selected
      const optionW = 340;
      const optionH = 58;
      const optionX = getMenuWidth() / 2;
      const optionY = k => getMenuHeight() * (0.28 + 0.108 * k);
      menuOptions.forEach((option, k) => {
        const selected = startMenuSelection === k;
        push();
          rectMode(CENTER);
          if (selected) {
            fill(255);
            stroke(option.color[0], option.color[1], option.color[2]);
            strokeWeight(3);
          } else {
            fill(50, 50, 50);
            stroke(100, 100, 100);
            strokeWeight(2);
          }
          rect(optionX, optionY(k), optionW, optionH, 12);
          noStroke();
          fill(selected ? 10 : 255);
          textSize(30);
          textAlign(CENTER, CENTER);
          text(option.label, optionX, optionY(k) - (option.note ? 6 : 0));
          if (option.note) {
            textSize(13);
            fill(selected ? 90 : 170);
            text(option.note, optionX, optionY(k) + 17);
          }
        pop();
      });

      // Instructions with fade
      let fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
      fill(200, fadeAlpha);
      textSize(18);
      textAlign(CENTER);
      text('W/S or ↑/↓ or Left Stick  Navigate  |  Enter or A  Confirm', getMenuWidth() / 2, getMenuHeight() * 0.95);

      if (tutorialMenuOpen) {
        drawTutorialMenu();
      } else {
        // Mouse click detection
        if (mouseIsPressed && menuNavigationCooldown === 0) {
          const mx = getMenuMouseX();
          const my = getMenuMouseY();
          menuOptions.forEach((option, k) => {
            if (abs(mx - optionX) < optionW / 2 && abs(my - optionY(k)) < optionH / 2 && menuNavigationCooldown === 0) {
              startMenuSelection = k;
              menuNavigationCooldown = 20;
              option.action();
            }
          });
        }

        // Enter key to select
        if (isConfirmPressed() && menuNavigationCooldown === 0) {
          menuNavigationCooldown = 20;
          menuOptions[startMenuSelection].action();
        }
      }

    }
    
    // Difficulty Selection Menu
    if (difficultyMenu === true) {
      // Dark background
      imageMode(CORNER);
      fill(20);
      rect(0, 0, getMenuWidth(), getMenuHeight());
      
      // Menu navigation - left/right to adjust slider
      if (menuNavigationCooldown === 0) {
        if (isLeftPressed() || isUpPressed()) {
          difficultySelection = constrain(difficultySelection - 1, 1, getMapStopCount());
          menuNavigationCooldown = 8;
        } else if (isRightPressed() || isDownPressed()) {
          difficultySelection = constrain(difficultySelection + 1, 1, getMapStopCount());
          menuNavigationCooldown = 8;
        }
      }
      
      // Hovering a stop on the map with the mouse selects it
      if (movedX !== 0 || movedY !== 0) {
        for (let i = 1; i <= getMapStopCount(); i++) {
          if (pointInRect(getMenuMouseX(), getMenuMouseY(), getDifficultyButtonRect(i))) {
            difficultySelection = i;
            break;
          }
        }
      }

      // The map: a dirt path into ant territory, one stop per difficulty (see map.js)
      drawDifficultyMap();

      // Details panel for the selected difficulty: its attributes and your records on it
      let sel = difficultySelection;
      let selInfo = getDifficultyTierInfo(sel);
      let selRecord = getDifficultyRecord(sel);

      let attributes = [
        `Start with ${sel} gene token${sel === 1 ? '' : 's'}`,
        `Gain ${sel} gene token${sel === 1 ? '' : 's'} every 5 rounds`
      ];
      if (sel <= 3) {
        attributes.push('Basic ant movement');
        attributes.push('Normal ant size (can change from round 20)');
      } else if (sel <= 5) {
        attributes.push('Keep Distance movement');
        attributes.push('Normal ant size (can change from round 15)');
      } else if (sel <= 7) {
        attributes.push('Keep Distance movement');
        attributes.push('Small ants (can change from round 10)');
        attributes.push('Random starting ability');
      } else {
        attributes.push('Keep Distance movement');
        attributes.push('Tiny ants (can change from round 5)');
        attributes.push('Random starting ability');
        attributes.push('Free pre-game upgrade');
      }

      let panelX = getMenuWidth() * 0.12;
      let panelY = getMenuHeight() * 0.62;
      let panelW = getMenuWidth() * 0.76;
      let panelH = getMenuHeight() * 0.3;
      let lineH = 24;

      if (sel === 11) {
        // The nest gets its own panel (see finalboss.js)
        drawFinalLevelPanel(panelX, panelY, panelW, panelH);
      } else {
      push();
        rectMode(CORNER);
        fill(35);
        stroke(selInfo.color);
        strokeWeight(2);
        rect(panelX, panelY, panelW, panelH, 12);
        noStroke();

        // Left column: attributes
        let colLeftX = panelX + 30;
        let headerY = panelY + 34;
        textAlign(LEFT, BASELINE);
        fill(selInfo.color);
        textSize(22);
        text(`Difficulty ${sel} - ${selInfo.name}`, colLeftX, headerY);
        fill(200);
        textSize(17);
        for (let a = 0; a < attributes.length; a++) {
          text('• ' + attributes[a], colLeftX, headerY + 32 + a * lineH);
        }

        // Divider
        let dividerX = panelX + panelW * 0.62;
        stroke(80);
        strokeWeight(1);
        line(dividerX, panelY + 18, dividerX, panelY + panelH - 18);
        noStroke();

        let colRightX = dividerX + 30;
        if (isDifficultyUnlocked(sel)) {
          // Right column: records for this difficulty
          fill(selInfo.color);
          textSize(22);
          text('Your Records', colRightX, headerY);
          fill(150);
          textSize(16);
          text('High Score', colRightX, headerY + 40);
          text('Highest Round', colRightX, headerY + 110);
          fill(255);
          textSize(32);
          text(selRecord.score > 0 ? Math.round(selRecord.score) : '—', colRightX, headerY + 76);
          text(selRecord.round > 0 ? selRecord.round : '—', colRightX, headerY + 146);
        } else {
          // Right column: what it takes to unlock this difficulty
          let queensNeeded = getQueensRequiredToAdvance(sel - 1);
          let queensNeededHere = getQueensRequiredOnDifficulty(sel - 1);
          drawLockIcon(colRightX + 11, headerY - 8, 22, 255);
          fill(255, 80, 80);
          textSize(22);
          text('Locked', colRightX + 32, headerY);
          fill(200);
          textSize(17);
          text(`Defeat ${queensNeeded} queens in total,`, colRightX, headerY + 40);
          text(`${queensNeededHere} of them on Difficulty ${sel - 1}`, colRightX, headerY + 64);
          fill(150);
          textSize(16);
          text('Total', colRightX, headerY + 110);
          text(`On Difficulty ${sel - 1}`, colRightX + 150, headerY + 110);
          fill(255);
          textSize(28);
          text(`${Math.min(getTotalQueensCollected(), queensNeeded)} / ${queensNeeded}`, colRightX, headerY + 146);
          text(`${Math.min(getQueensCollectedOnDifficulty(sel - 1), queensNeededHere)} / ${queensNeededHere}`, colRightX + 150, headerY + 146);
        }
      pop();
      }

      // Instructions
      let fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
      fill(200, fadeAlpha);
      textSize(18);
      textAlign(CENTER);
      text('←/→ or ↑/↓ or Click  Select  |  Enter or A  Confirm  |  Esc  Back', getMenuWidth() / 2, getMenuHeight() * 0.975);
      
      // Back to main menu
      if (keyIsDown(ESCAPE) && menuNavigationCooldown === 0) {
        difficultyMenu = false;
        startMenu = true;
        menuNavigationCooldown = 20;
      }
      
      // Confirm selection (locked difficulties can be previewed but not started)
      // isConfirmPressed() only fires once per press, so read it a single time
      let confirmPressed = isConfirmPressed() && menuNavigationCooldown === 0;
      if (confirmPressed && !isDifficultyUnlocked(difficultySelection)) {
        menuNavigationCooldown = 20;
      } else if (confirmPressed && difficultySelection === 11) {
        // The nest: single player only
        if (pendingGameMode === 'single') startFinalLevel();
        menuNavigationCooldown = 20;
      } else if (confirmPressed) {
        // Set difficulty
        difficulty = difficultySelection;
        // Single player runs start with every permanent upgrade bought with queens
        if (pendingGameMode === 'single') applyPermanentUpgrades();
        
        debugLog(`Difficulty set to: ${difficulty} (${getDifficultyTier()})`);
        
        // For insane difficulty (8-10), show pre-game upgrade menu
        if (getDifficultyTier() === 'insane') {
          preGameUpgradeMenu = true;
          difficultyMenu = false;
          menuNavigationCooldown = 20;
        } else {
          // Start appropriate game mode
          if (pendingGameMode === 'single') {
            multiplayerMode = false;
            numPlayers = 1;
            if (devToolsUseCustomAnts) {
              applyCustomAntsToInitialPopulation();
            } else {
              applyDifficultyToInitialPopulation();
            }
            start = true;
            startRoundIntro();
            difficultyMenu = false;
            pendingGameMode = null;
            titlemusic.stop();
            gamemusic.play();
          } else if (pendingGameMode === 'multiplayer') {
            playerSelectScreen = true;
            difficultyMenu = false;
          }
        }
        
        menuNavigationCooldown = 20;
      }
    }
  
  endMenuScaling();
}

function drawPreGameUpgradeScreen() {
  // Initialize upgrade options if not already done
  if (preGameUpgradeOptions.length === 0) {
    // Only include basic upgrades (no round 5+ locked upgrades)
    let basicUpgrades = [
      0,  // Walking Speed
      1,  // Dash Speed
      2,  // Dash Cooldown
      3,  // Add Shield
      4,  // Add Bullets
      5,  // Shield Regen (requires shield)
      6,  // Bullet Reload (requires bullets)
      7,  // Bullet Speed (requires bullets)
      8   // Free-Angle Aiming (requires bullets + speed + reload)
    ];
    
    // Filter out upgrades with unmet prerequisites
    let availableUpgrades = [];
    for (let i of basicUpgrades) {
      if (i === 5 && upgrade4Level === 0) continue;  // Shield Regen requires Add Shield
      if (i === 6 && upgrade5Level === 0) continue;  // Bullet Reload requires Add Bullets
      if (i === 7 && upgrade5Level === 0) continue;  // Bullet Speed requires Add Bullets
      if (i === 8) continue;  // Skip Free-Angle Aiming (too complex for first upgrade)
      availableUpgrades.push(i);
    }
    
    // Select 3 random upgrades
    preGameUpgradeOptions = [];
    let numToSelect = min(3, availableUpgrades.length);
    for (let i = 0; i < numToSelect; i++) {
      let randomIndex = floor(random(availableUpgrades.length));
      preGameUpgradeOptions.push(availableUpgrades[randomIndex]);
      availableUpgrades.splice(randomIndex, 1);
    }
    preGameSelectedUpgrade = 0;
  }
  
  beginMenuScaling();
  
  // Dark background
  imageMode(CORNER);
  fill(20);
  rect(0, 0, getMenuWidth(), getMenuHeight());
  
  // Title
  fill(255, 80, 80);
  textAlign(CENTER);
  textSize(60);
  text("INSANE MODE BONUS", getMenuWidth() / 2, getMenuHeight() * 0.12);
  
  fill(255);
  textSize(32);
  text("Choose One Free Upgrade", getMenuWidth() / 2, getMenuHeight() * 0.20);
  
  // Define upgrade names and descriptions
  let upgradeNames = [
    'Walking Speed', 'Dash Speed', 'Dash Cooldown', 'Add Shield', 
    'Add Bullets', 'Shield Regeneration', 'Bullet Reload', 'Bullet Speed', 
    'Free-Angle Aiming'
  ];
  let upgradeDescriptions = [
    'Increase your movement speed.',
    'Increase dash velocity.',
    'Reduce time between dashes.',
    'Gain 1 shield capacity.',
    'Gain 2 bullet capacity.',
    'Regenerate shields over time.',
    'Faster bullet reload speed.',
    'Increase bullet velocity.',
    'Aim with mouse or right stick.'
  ];
  
  // Draw upgrade options as cards
  let cardWidth = 300;
  let cardHeight = 350;
  let spacing = 40;
  let totalWidth = (cardWidth * preGameUpgradeOptions.length) + (spacing * (preGameUpgradeOptions.length - 1));
  let startX = (getMenuWidth() - totalWidth) / 2 + cardWidth / 2;
  
  for (let i = 0; i < preGameUpgradeOptions.length; i++) {
    let upgradeId = preGameUpgradeOptions[i];
    let x = startX + i * (cardWidth + spacing);
    let y = getMenuHeight() * 0.5;
    
    push();
      // Card background
      rectMode(CENTER);
      if (preGameSelectedUpgrade === i) {
        // Selected card - bright border
        fill(80);
        stroke(255, 255, 100);
        strokeWeight(6);
        // Pulsing effect
        let pulseOffset = sin(frameCount * 0.1) * 5;
        rect(x, y + pulseOffset, cardWidth, cardHeight, 15);
      } else {
        // Unselected card
        fill(50);
        stroke(120);
        strokeWeight(2);
        rect(x, y, cardWidth, cardHeight, 15);
      }
      
      // Upgrade name
      fill(255);
      noStroke();
      textSize(28);
      textAlign(CENTER, TOP);
      text(upgradeNames[upgradeId], x, y - cardHeight / 2 + 20, cardWidth - 30);
      
      // Description
      fill(200);
      textSize(18);
      text(upgradeDescriptions[upgradeId], x, y - cardHeight / 2 + 90, cardWidth - 30);
      
      // Level indicator
      fill(255, 255, 100);
      textSize(22);
      text('Level: 0 → 1', x, y + cardHeight / 2 - 50);
      
      // Selection hint
      if (preGameSelectedUpgrade === i) {
        fill(255, 255, 100, map(sin(frameCount * 0.1), -1, 1, 100, 255));
        textSize(20);
        text('[ SELECTED ]', x, y + cardHeight / 2 - 20);
      }
    pop();
  }
  
  // Instructions
  let fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
  fill(200, fadeAlpha);
  textSize(18);
  textAlign(CENTER);
  text('←/→  Select  |  1/2/3  Quick Select  |  Enter or A  Confirm  |  Esc or B  Skip', getMenuWidth() / 2, getMenuHeight() * 0.88);
  
  // Skip hint
  fill(150);
  textSize(16);
  text('(You can skip this bonus upgrade if you prefer)', getMenuWidth() / 2, getMenuHeight() * 0.93);
  
  endMenuScaling();
}

function applyPreGameUpgrade(selectionIndex) {
  // Get the actual upgrade ID from the displayed upgrades
  let upgradeId = preGameUpgradeOptions[selectionIndex];
  
  // Increment upgrade level
  if (upgradeId === 0) upgrade1Level++;
  else if (upgradeId === 1) upgrade2Level++;
  else if (upgradeId === 2) upgrade3Level++;
  else if (upgradeId === 3) upgrade4Level++;
  else if (upgradeId === 4) upgrade5Level++;
  else if (upgradeId === 5) upgrade6Level++;
  else if (upgradeId === 6) upgrade7Level++;
  else if (upgradeId === 7) upgrade8Level++;
  else if (upgradeId === 8) upgrade9Level++;
  
  // Update upgrade booleans to apply effects
  updateUpgradeBooleans();
  
  let upgradeNames = ['Walking Speed', 'Dash Speed', 'Dash Cooldown', 'Add Shield', 'Add Bullets', 'Shield Regeneration', 'Bullet Reload', 'Bullet Speed', 'Free-Angle Aiming'];
  debugLog(`Pre-game bonus upgrade applied: ${upgradeNames[upgradeId]}`);
  
  // Reset menu state
  preGameUpgradeMenu = false;
  preGameUpgradeOptions = [];
  
  // Start appropriate game mode
  if (pendingGameMode === 'single') {
    multiplayerMode = false;
    numPlayers = 1;
    if (devToolsUseCustomAnts) {
      applyCustomAntsToInitialPopulation();
    } else {
      applyDifficultyToInitialPopulation();
    }
    start = true;
    startRoundIntro();
    pendingGameMode = null;
    titlemusic.stop();
    gamemusic.play();
  } else if (pendingGameMode === 'multiplayer') {
    playerSelectScreen = true;
  }
}

function skipPreGameUpgrade() {
  debugLog('Pre-game upgrade skipped');
  
  // Reset menu state
  preGameUpgradeMenu = false;
  preGameUpgradeOptions = [];
  
  // Start game without bonus upgrade
  if (pendingGameMode === 'single') {
    multiplayerMode = false;
    numPlayers = 1;
    if (devToolsUseCustomAnts) {
      applyCustomAntsToInitialPopulation();
    } else {
      applyDifficultyToInitialPopulation();
    }
    start = true;
    startRoundIntro();
    pendingGameMode = null;
    titlemusic.stop();
    gamemusic.play();
  } else if (pendingGameMode === 'multiplayer') {
    playerSelectScreen = true;
  }
}

// Tab names, colors and progress bar gradients for each Antdex section
const DEX_SECTION_STYLES = {
  stats: {
    tab: 'Stats', stroke: [255, 255, 255], fill: [90, 90, 90], dim: [45, 45, 45], card: [235, 235, 235], bar: [60, 60, 60],
    gradient: [[255, 0, 0], [0, 255, 0], [160, 32, 240], [255, 255, 255], [255, 215, 0]], glow: [255, 215, 0]
  },
  abilities: {
    tab: 'Abilities', stroke: [110, 190, 255], fill: [40, 80, 130], dim: [25, 40, 60], card: [205, 228, 255], bar: [30, 45, 70],
    gradient: [[60, 110, 255], [35, 200, 255], [120, 255, 200], [255, 255, 255], [255, 215, 0]], glow: [120, 220, 255]
  },
  exotic: {
    tab: 'Exotic', stroke: [160, 120, 255], fill: [70, 40, 110], dim: [35, 25, 55], card: [255, 204, 0], bar: [45, 35, 70],
    gradient: [[160, 32, 240], [60, 110, 255], [35, 200, 255], [255, 140, 0], [255, 80, 200]], glow: [255, 80, 200]
  }
};
const DEX_CARD_HEIGHT = 175;
const DEX_ROW_HEIGHT = 190;
const DEX_LIST_TOP = 250;
const DEX_LIST_BOTTOM = MENU_REFERENCE_HEIGHT - 48;

function getDexProgressColor(style, progress) {
  const stops = style.gradient;
  const seg = Math.min(3, Math.floor(progress / 0.25));
  // The last segment only turns to the final color right at 100%
  const t = seg === 3 ? map(progress, 0.99, 1, 0, 1, true) : (progress - seg * 0.25) / 0.25;
  return lerpColor(color(...stops[seg]), color(...stops[seg + 1]), constrain(t, 0, 1));
}

function drawDexCard(entry, x, top, w) {
  const style = DEX_SECTION_STYLES[entry.section];
  const locked = !entry.discovered;
  noStroke();
  fill(locked ? color(40) : color(...style.card));
  rect(x, top, w, DEX_CARD_HEIGHT, 20);

  const pic = DEX_CARD_HEIGHT - 28;
  drawDexPicture(entry, x + 14, top + 14, pic, pic, 255, locked);

  const tx = x + pic + 30;
  const tw = w - pic - 46;
  textAlign(LEFT, BASELINE);
  if (locked) {
    fill(180);
    textSize(26);
    text('???', tx, top + 40);
    textSize(16);
    text('?????????????????', tx, top + 70);
    textSize(14);
    text('????????????', tx, top + DEX_CARD_HEIGHT - 22);
    return;
  }
  fill(10);
  textSize(entry.name.length > 26 ? 21 : 24);
  text(entry.name, tx, top + 38);
  textAlign(LEFT, TOP);
  textSize(15);
  fill(20);
  text(entry.desc, tx, top + 50, tw, 84);
  textSize(13);
  fill(0, 0, 0, 170);
  text(entry.stats, tx, top + DEX_CARD_HEIGHT - 40, tw, 34);
}

function antdexScreen() {
  if (!antdex) return;

  beginMenuScaling();

  const sectionIndex = DEX_SECTIONS.indexOf(dexCategory);
  if (dexTabSwitchCooldown === 0) {
    if (isLeftPressed() && sectionIndex > 0) {
      setDexCategory(DEX_SECTIONS[sectionIndex - 1]);
      dexTabSwitchCooldown = 10;
    } else if (isRightPressed() && sectionIndex < DEX_SECTIONS.length - 1) {
      setDexCategory(DEX_SECTIONS[sectionIndex + 1]);
      dexTabSwitchCooldown = 10;
    }
  }

  const style = DEX_SECTION_STYLES[dexCategory];
  const visibleEntries = antDexEntries.filter(entry => entry.section === dexCategory);
  const discoveredCount = visibleEntries.filter(entry => entry.discovered).length;
  const progressTarget = visibleEntries.length === 0 ? 0 : discoveredCount / visibleEntries.length;
  const diff = abs(progressTarget - dexProgressDisplay[dexCategory]);
  dexProgressDisplay[dexCategory] += (progressTarget - dexProgressDisplay[dexCategory]) * map(diff, 0, 1, 0.01, 0.05, true);
  const progress = dexProgressDisplay[dexCategory];

  imageMode(CORNER);
  rectMode(CORNER);
  noStroke();
  fill(20);
  rect(0, 0, getMenuWidth(), getMenuHeight());

  // ----- Entry list (drawn first, clipped to the area under the header) -----
  if (isUpPressed()) dexTargetScroll += dexScrollSpeed;
  if (isDownPressed()) dexTargetScroll -= dexScrollSpeed;

  const viewHeight = DEX_LIST_BOTTOM - DEX_LIST_TOP;
  const totalRows = Math.ceil(visibleEntries.length / 2);
  const contentHeight = totalRows * DEX_ROW_HEIGHT;
  const maxOffset = max(0, contentHeight - viewHeight);
  dexTargetScroll = constrain(dexTargetScroll, -maxOffset, 0);
  dexScrollY = lerp(dexScrollY, dexTargetScroll, 0.2);

  const colWidth = getMenuWidth() / 2.3;
  const leftColX = getMenuWidth() / 2 - colWidth - 30;
  const rightColX = getMenuWidth() / 2 + 30;

  push();
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(0, DEX_LIST_TOP - 10, getMenuWidth(), viewHeight + 10);
  drawingContext.clip();
  for (let i = 0; i < visibleEntries.length; i++) {
    const top = DEX_LIST_TOP + dexScrollY + Math.floor(i / 2) * DEX_ROW_HEIGHT;
    if (top > DEX_LIST_BOTTOM || top + DEX_CARD_HEIGHT < DEX_LIST_TOP - 10) continue;
    drawDexCard(visibleEntries[i], i % 2 === 0 ? leftColX : rightColX, top, colWidth);
  }
  drawingContext.restore();
  pop();

  if (maxOffset > 0) {
    const barH = max(60, viewHeight * (viewHeight / contentHeight));
    const scrollProgress = (-dexTargetScroll) / maxOffset;
    noStroke();
    fill(100, 100, 100, 150);
    rect(getMenuWidth() - 30, DEX_LIST_TOP + scrollProgress * (viewHeight - barH), 10, barH, 5);
  }

  // ----- Header -----
  fill(255);
  textAlign(CENTER, BASELINE);
  textSize(56);
  text("Antdex", getMenuWidth() / 2, 62);

  const tabWidth = 200;
  const tabHeight = 40;
  const tabSpacing = 20;
  const tabY = 105;
  const tabsLeft = getMenuWidth() / 2 - (tabWidth * 3 + tabSpacing * 2) / 2;
  strokeWeight(2);
  for (let k = 0; k < DEX_SECTIONS.length; k++) {
    const section = DEX_SECTIONS[k];
    const tabStyle = DEX_SECTION_STYLES[section];
    const selected = section === dexCategory;
    dexTabRegions[section] = { x: tabsLeft + k * (tabWidth + tabSpacing), y: tabY - tabHeight / 2, w: tabWidth, h: tabHeight };
    stroke(...tabStyle.stroke, selected ? 200 : 80);
    fill(...(selected ? tabStyle.fill : tabStyle.dim));
    rect(dexTabRegions[section].x, dexTabRegions[section].y, tabWidth, tabHeight, 12);
    noStroke();
    fill(255, selected ? 255 : 170);
    textAlign(CENTER, CENTER);
    textSize(24);
    text(tabStyle.tab, dexTabRegions[section].x + tabWidth / 2, tabY);
  }

  let fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
  textSize(16);
  fill(200, fadeAlpha);
  text("← / → or A / D or click to switch tabs", getMenuWidth() / 2, tabY + 36);

  const barWidth = 360;
  const barHeight = 16;
  const barY = 205;
  textAlign(CENTER, BASELINE);
  textSize(22);
  fill(255);
  text(`${style.tab} Discoveries: ${discoveredCount} / ${visibleEntries.length}`, getMenuWidth() / 2, barY - 16);
  rectMode(CENTER);
  fill(...style.bar);
  rect(getMenuWidth() / 2, barY, barWidth, barHeight, 8);

  let shakeX = 0;
  let shakeY = 0;
  if (progress > 0.85 && progress < 0.999) {
    shakeX = random(-3 * progress, 3 * progress);
    shakeY = random(-3 * progress, 3 * progress);
  }
  push();
  translate(shakeX, shakeY);
  fill(getDexProgressColor(style, progress));
  const fillWidth = barWidth * constrain(progress, 0, 1);
  rect(getMenuWidth() / 2 - barWidth / 2 + fillWidth / 2, barY, fillWidth, barHeight, 8);
  pop();
  if (progress > 0.999) {
    noFill();
    stroke(...style.glow, map(sin(frameCount * 0.05), -1, 1, 50, 180));
    strokeWeight(10);
    rect(getMenuWidth() / 2, barY, barWidth + 9, barHeight + 6, 10);
    noStroke();
  }
  rectMode(CORNER);

  if (visibleEntries.length === 0) {
    fill(200);
    textAlign(CENTER);
    textSize(24);
    text("No entries in this tab yet.", getMenuWidth() / 2, DEX_LIST_TOP + 40);
  }

  fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
  fill(255, fadeAlpha);
  textAlign(CENTER, BASELINE);
  textSize(22);
  text("Esc or B  Back", getMenuWidth() / 2, getMenuHeight() - 16);

  if (isBackPressed() && !antdexInputBlocked) {
    antdex = false;
    if (antdexReturnState === 'menu') {
      startMenu = true;
    } else if (antdexReturnState === 'intermission') {
      intermissionMenu = false;
      intermissionMenuCooldown = 20;
    } else if (antdexReturnState === 'gameover') {
      end = true;
      gameOverMenu = false;
      gameOverMenuCooldown = 20;
    }
    antdexOpenCooldown = 20;
    antdexReturnState = 'menu';
  }

  endMenuScaling();
}


function mouseWheel(event) {
  if (antdex) dexTargetScroll -= event.delta / 2;
}

function touchMoved() {
  if (antdex) dexTargetScroll += (movedY);
}

function setDexCategory(nextCategory) {
  if (dexCategory !== nextCategory) {
    dexCategory = nextCategory;
    dexTargetScroll = 0;
    dexScrollY = 0;
  }
}

function pointInRect(px, py, rect) {
  return (
    px >= rect.x && px <= rect.x + rect.w &&
    py >= rect.y && py <= rect.y + rect.h
  );
}

function mousePressed() {
  if (openingCinematic) {
    advanceOpeningCinematic();
    return;
  }

  // Difficulty menu: clicking a button selects it
  if (difficultyMenu) {
    for (let i = 1; i <= getMapStopCount(); i++) {
      if (pointInRect(getMenuMouseX(), getMenuMouseY(), getDifficultyButtonRect(i))) {
        difficultySelection = i;
        return;
      }
    }
  }

  // Handle upgrade menu clicks (left button only; right click switches shot mode)
  if (upgradeMenuActive && mouseButton === LEFT) {
    let cardWidth = getMenuWidth() * 0.25;
    let cardHeight = getMenuHeight() * 0.48;
    let cardY = getMenuHeight() * 0.50;
    let spacing = getMenuWidth() * 0.05;
    let totalWidth = (cardWidth * 3) + (spacing * 2);
    let startX = (getMenuWidth() - totalWidth) / 2 + cardWidth / 2;
    
    for (let i = 0; i < 3; i++) {
      let cardX = startX + i * (cardWidth + spacing);
      // Check if click is within card bounds
      if (getMenuMouseX() > cardX - cardWidth/2 && getMenuMouseX() < cardX + cardWidth/2 &&
          getMenuMouseY() > cardY - cardHeight/2 && getMenuMouseY() < cardY + cardHeight/2) {
        applyUpgrade(i);
        return;
      }
    }
  }
  
  if (!antdex) return;

  for (const section of DEX_SECTIONS) {
    if (pointInRect(getMenuMouseX(), getMenuMouseY(), dexTabRegions[section])) {
      setDexCategory(section);
      dexTabSwitchCooldown = 10;
    }
  }
}

// ========== ANTDEX ==========
// The Antdex has three sections:
//   Stats     - one entry per gene cap (unlocked when an ant on the field has that cap), plus the stats and
//               movement styles that have no gene caps, which unlock by their values
//   Abilities - the 32 level 1 / level 2 abilities (unlocked when an ant on the field has the ability)
//   Exotic    - ability combinations the code had to special-case (unlocked when an ant has both)
// Each entry has a check(i) run against every ant on the field and a scene that drawDexPicture() draws on
// its card and on the discovery pop-up. Discoveries are saved under ANTDEX_STORAGE_KEY as {id: true}.
const ANTDEX_STORAGE_KEY = 'antDexDiscoveries';
const DEX_ROMAN = ['I', 'II', 'III', 'IV', 'V'];

// Highest gene cap tier ant i has unlocked for a stat (-1 = none)
function getUnlockedCapTier(i, statName) {
  let tier = -1;
  for (const inv of geneTokenInvestments[i] || []) {
    if (inv.type === 'cap' && inv.target === statName) tier = Math.max(tier, inv.tier || 0);
  }
  return tier;
}

// Stats with gene caps. Each cap tier that raises the stat's limit gets an entry; the last tier of each
// stat doesn't raise the limit any further (see getMaxAllowedValue / getMinAllowedValue), so it has none.
const DEX_CAP_STATS = [
  { stat: 'bulletSpeed', name: 'Fast Bullet', label: 'Bullet travel time', unit: ' frames', scene: 'bulletSpeed',
    desc: 'Its bullets cross the arena faster, leaving less time to dodge.' },
  { stat: 'bulletCooldown', name: 'Quick Reload', label: 'Cooldown', unit: ' frames', scene: 'cooldown',
    desc: 'Waits less time between shots.' },
  { stat: 'antSpeed', name: 'Fast', label: 'Ant speed', unit: '', scene: 'antSpeed',
    desc: 'Runs faster than a normal ant.' },
  { stat: 'antSize', name: 'Giant', label: 'Ant size', unit: 'x', scene: 'antSize',
    desc: 'Grows bigger than a normal ant, with more health and an easier hitbox to hit.' },
  { stat: 'bulletSize', name: 'Big Bullet', label: 'Bullet size', unit: 'x', scene: 'bulletSize',
    desc: 'Fires bigger, heavier bullets that deal more damage.' },
  { stat: 'bulletKnockbackMultiplier', name: 'Heavy Knockback', label: 'Knockback', unit: 'x', scene: 'knockbackPower',
    desc: 'Knockback and vacuum bullets push (and pull) the beetle harder.' },
  { stat: 'bulletCamoFlashRate', name: 'Deep Camouflage', label: 'Flashes per second', unit: '', scene: 'camoFlash',
    desc: 'Camouflage bullets flash into sight less often, staying hidden longer.' },
  { stat: 'bulletBurstCount', name: 'Big Burst', label: 'Bullets per burst', unit: '', scene: 'burstCount',
    desc: 'Burst, delayed burst and rapid fire ants fire more bullets in each volley.' },
  { stat: 'bulletBurstSpread', name: 'Wide Burst', label: 'Burst spread', unit: '°', scene: 'burstSpread', degrees: true,
    desc: 'Burst volleys fan out wider.' },
  { stat: 'bulletCooldownMultiplier', name: 'Long Alternate', label: 'Cooldown multiplier', unit: 'x', scene: 'cooldownMult',
    desc: 'Alternating fire ants wait longer on their slow shot.' },
  { stat: 'bulletCurveStrength', name: 'Sharp Curve', label: 'Curve strength', unit: '', scene: 'curveStrength',
    desc: 'Curving and homing bullets turn harder.' },
  { stat: 'bulletAccelerateDelay', name: 'Quick Accelerate', label: 'Frames before speeding up', unit: '', scene: 'accelDelay',
    desc: 'Accelerating bullets speed up (and beam bullets fire) sooner.' },
  { stat: 'radiusMultiplier', name: 'Wide Blast', label: 'Radius multiplier', unit: 'x', scene: 'radius',
    desc: 'Explosions, smears, beams, streams and territories are bigger.' },
  { stat: 'residueMultiplier', name: 'Lingering Residue', label: 'Residue multiplier', unit: 'x', scene: 'residue',
    desc: 'Residue, smears, beams, streams and ground effects last longer.' }
];

function formatDexCapValue(info, value) {
  if (info.degrees) return Math.round(value * 180 / Math.PI) + info.unit;
  return (Math.round(value * 1000) / 1000) + info.unit;
}

function buildDexCapStatEntries() {
  const entries = [];
  for (const info of DEX_CAP_STATS) {
    const tierInfo = moduleStatCapTiers[info.stat];
    if (!tierInfo) continue;
    const tiers = tierInfo.caps.length - 1;
    for (let t = 0; t < tiers; t++) {
      const limit = tierInfo.caps[t + 1];
      entries.push({
        id: `cap_${info.stat}_${t}`,
        section: 'stats',
        name: `${info.name} Ants ${DEX_ROMAN[t]}`,
        desc: info.desc,
        stats: `Gene cap ${t + 1}: ${info.label} ${tierInfo.inverse ? 'down to' : 'up to'} ${formatDexCapValue(info, limit)}`,
        scene: info.scene,
        level: (t + 1) / tiers,
        value: limit,
                check: i => getUnlockedCapTier(i, info.stat) >= t
      });
    }
  }
  return entries;
}

// Value-range entries for stats with no gene caps (unchanged from before gene caps existed).
// legacy is the old per-entry storage key, so earlier discoveries carry over.
function buildDexValueStatEntries() {
  const entries = [];
  const range = (id, name, desc, stats, scene, level, check, value) =>
    entries.push({ id, legacy: id, section: 'stats', name, desc, stats, scene, level, check, value });

  // Movement styles
  const moves = [
    ['movementType1', 'Follow Beetle Ants', "Tracks and follows the beetle's position directly.", 'Autonomy: Beetle • Follow Style: Follow', 'beetle', false, i => followBeetle[i] && followTarget[i]],
    ['movementType2', 'Follow Other Ants', 'Mirrors the movement patterns of nearby ants.', 'Autonomy: Ants • Follow Style: Follow', 'ants', false, i => followAnt[i] && followTarget[i]],
    ['movementType3', 'Find Location Ants', 'Moves toward a predetermined spot on the screen.', 'Autonomy: Location • Follow Style: Follow', 'location', false, i => findLocation[i] && followTarget[i]],
    ['movementType4', 'Stand Still Ants', 'Remains stationary at spawn point for better aim.', 'Autonomy: Spawn • Follow Style: Follow', 'spawn', false, i => standStill[i] && followTarget[i]],
    ['movementType5', 'Keep Distance From Beetle Ants', 'Maintains a specific range from the beetle.', 'Autonomy: Beetle • Follow Style: Keep Distance', 'beetle', true, i => followBeetle[i] && keepDistance[i]],
    ['movementType6', 'Keep Distance From Ants', 'Maintains spacing relative to other ants.', 'Autonomy: Ants • Follow Style: Keep Distance', 'ants', true, i => followAnt[i] && keepDistance[i]],
    ['movementType7', 'Keep Distance From Location Ants', 'Orbits around a fixed point at set distance.', 'Autonomy: Location • Follow Style: Keep Distance', 'location', true, i => findLocation[i] && keepDistance[i]],
    ['movementType8', 'Keep Distance From Spawn Ants', 'Moves set distance from respawn location.', 'Autonomy: Spawn • Follow Style: Keep Distance', 'spawn', true, i => standStill[i] && keepDistance[i]]
  ];
  for (const [legacy, name, desc, stats, target, keep, check] of moves) {
    entries.push({ id: legacy, legacy, section: 'stats', name, desc, stats, scene: 'movement', opts: { target, keep }, check });
  }

  // Ant size below normal has no gene cap
  range('smallAnts', 'Small Ants', 'Ants smaller than standard size, with smaller hitboxes. Very small ants glow blue.', 'Ant Size: < 1.0', 'antSize', 0, i => antSize[i] < 1.0, 0.5);
  range('largeAnts', 'Large Ants', 'Ants larger than standard size.', 'Ant Size: > 1.0', 'antSize', 0, i => antSize[i] > 1.0, 1.4);

  // Five value bands per stat; ids match the old storage keys (offsetMin, offsetLow, ...)
  const bands = (prefix, idPrefix, label, unitName, scene, bounds, descs, valueOf, gate) => {
    const tierNames = ['Minimum', 'Low', 'Medium', 'High', 'Maximum'];
    for (let b = 0; b < 5; b++) {
      const lo = bounds[b], hi = bounds[b + 1];
      range(idPrefix + ['Min', 'Low', 'Med', 'High', 'Max'][b], `${tierNames[b]} ${prefix} Ants`, descs[b],
        `${label}: ${b === 0 ? lo : lo + 1}-${hi}${unitName}`, scene, b / 4,
        i => {
          if (!gate(i)) return false;
          const v = valueOf(i);
          return b === 0 ? v >= lo && v <= hi : v > lo && v <= hi;
        });
    }
  };
  bands('Offset', 'offset', 'Shot Offset', '', 'offset', [0, 50, 150, 300, 450, 500],
    ["Perfect aim directly at the beetle's position.", 'Slight lead shots that predict movement.', 'Moderate angles for area denial.', 'Wide-angle shots that flank the beetle.', 'Shooting completely away from the beetle.'],
    i => Math.max(Math.abs(shotOffsetX[i]), Math.abs(shotOffsetY[i])), () => true);
  bands('Distance', 'distance', 'Distance From Anchor', '', 'distance', [0.1, 100, 250, 500, 750, 1000],
    ['Stays extremely close to target, aggressive.', 'Moderately close positioning.', 'Maintains mid-range combat distance.', 'Prefers long-range positioning.', 'Extreme range, almost arena-edge positioning.'],
    i => distanceFromAnchor[i], i => keepDistance[i]);
  bands('Fuse', 'fuse', 'Explode After', ' frames', 'fuse', [EXPLODE_AFTER_MIN, 250, 400, 550, 700, EXPLODE_AFTER_MAX],
    ['Very short fuse, quick detonations.', 'Short fuse for moderate timing.', 'Standard detonation timing.', 'Long fuse bullets that linger.', 'Extremely delayed explosions.'],
    i => bulletExplodeAfter[i], i => getSpecialType(i) === 1 && specialExplosion[i] < 1);
  bands('Proximity', 'prox', 'Explosion Proximity', '', 'proximity', [0.1, 150, 300, 550, 800, 1000],
    ['Must be very close to beetle to detonate.', 'Modest trigger range for explosions.', 'Standard proximity detection range.', 'Wide trigger radius, hard to avoid.', 'Extreme range proximity detonation.'],
    i => explosionProximity[i], i => getSpecialType(i) === 1 && specialExplosion[i] >= 1);
  return entries;
}

// The 32 abilities: level 1 then level 2 of each threshold-gated trait stat
function buildDexAbilityEntries() {
  const list = [
    // Special
    ['timeExplosion', 'timeExplosion', 'Time Explosion Ants', 'Bullets detonate after a set duration.', 'Special: Explosion • Trigger: Time', 'timedExplosion', i => getSpecialType(i) === 1 && specialExplosion[i] < 1],
    ['proximityExplosion', 'proximityExplosion', 'Proximity Explosion Ants', 'Bullets explode when near the beetle.', 'Special: Explosion • Trigger: Proximity', 'proximityExplosion', i => getSpecialType(i) === 1 && specialExplosion[i] >= 1],
    ['knockback', 'knockback', 'Knockback Bullet Ants', 'Bullets push the beetle when hit.', 'Special: Knockback', 'knockback', i => getSpecialType(i) === -1 && !isVacuumKnockback(i)],
    ['vacuum', 'vacuum', 'Vacuum Bullet Ants', 'Bullets pull the beetle toward them at close range, then knock it back on hit. Pull strength and range grow with knockback multiplier.', 'Special: Vacuum', 'vacuum', i => isVacuumKnockback(i)],
    ['camouflage', 'camouflage', 'Camouflage Bullet Ants', 'Bullets (and landmines they become) flicker in and out of sight. Slower flickering keeps them hidden longer and is genetic.', 'Special: Camouflage • Flash Rate: 0.25-3 per second', 'camo', i => getSpecialType(i) === 2],
    ['ghostBullet', 'ghostBullet', 'Ghost Bullet Ants', 'Bullets (and landmines they become) stay invisible and only appear within 150 pixels of the beetle. Misses vanish again.', 'Special: Ghost', 'ghost', i => getSpecialType(i) === -2],
    ['recoil', 'recoil', 'Recoil Ants', 'Every shot kicks the ant backward, away from where it fired. Bigger, faster bullets kick harder; bigger ants are pushed less.', 'Special: Recoil', 'recoil', i => getSpecialType(i) === 3],
    ['launch', 'launch', 'Launch Ants', "Every shot kicks the ant backward and briefly up into the air, where walking, dashing, bullets, shockwaves and mines can't touch it.", 'Special: Launch', 'launch', i => getSpecialType(i) === -3],
    // Fire
    ['alternatingFire', 'alternatingFire', 'Alternating Fire Ants', 'Alternate between fast and slow shots. Each shot toggles cooldown speed. Affected by cooldown multiplier.', 'Fire Type: Alternating', 'alternating', i => getFireType(i) === -1],
    ['hitReloadFire', 'hitReloadFire', 'Hit Reload Ants', 'Fire on a cooldown 3x longer than normal, but every bullet that hits the beetle instantly reloads them for another shot.', 'Fire Type: Hit Reload', 'hitReload', i => getFireType(i) === -2],
    ['burstFire', 'burstFire', 'Burst Fire Ants', 'Fire several bullets at once in a fan with each shot. Affected by burst count and spread.', 'Fire Type: Burst', 'burst', i => getFireType(i) === 1],
    ['delayedBurstFire', 'delayedBurstFire', 'Delayed Burst Ants', 'Fire a single full-size bullet that glows orange, then splits into a burst mid-flight (up to 1 second later). Affected by burst count, spread, and delay.', 'Fire Type: Delayed Burst', 'delayedBurst', i => getFireType(i) === 3],
    ['rapidFire', 'rapidFire', 'Rapid Fire Ants', 'Split each shot into 2-5 smaller bullets that fire one after another, 15 frames apart. Affected by burst count.', 'Fire Type: Rapid', 'rapid', i => getFireType(i) === 2],
    ['streamFire', 'streamFire', 'Stream Fire Ants', 'Spray a continuous stream of acid instead of bullets, burning the beetle every frame it stands in it. The stream starts thin at the ant and widens as it flows out to its range. Wider streams reach less far.', 'Fire Type: Stream • Width / Range: Radius Multiplier • Duration: Residue Multiplier', 'stream', i => getFireType(i) === 4],
    ['alarmFire', 'alarmFire', 'Alarm Ants', 'Fire faster while the beetle is close: 1.5x inside their outer radius and 2x inside their inner radius, shown by an orange or red ring.', 'Fire Type: Alarm • Inner Radius: 25-100px', 'alarm', i => getFireType(i) === 5],
    ['avengeFire', 'avengeFire', 'Avenge Ants', 'Whenever another ant dies nearby, they flash white to reload like a hit reload ant and fire again. Every death they see is another shot.', 'Fire Type: Avenge', 'avenge', i => getFireType(i) === 6],
    // Path
    ['highArc', 'highArc', 'High Arc Ants', 'Bullets launch in a high arc and land like artillery. Cannot be touched until they hit the ground. Deal high-speed damage on impact.', 'Path Type: High Arc', 'highArc', i => getPathType(i) === 1 && !isSplitArc(i)],
    ['splitArc', 'splitArc', 'Split Arc Ants', 'Lob high arc bullets that glow orange on the way up, then split into 3 smaller bullets at the top of the arc that land in a row across the target.', 'Path Type: Split Arc', 'splitArc', i => isSplitArc(i)],
    ['clockwiseCurve', 'clockwiseCurve', 'Curve Ants', 'Bullets curve as they travel, creating unpredictable arcing shots. Curve intensifies over bullet lifetime.', 'Path Type: Curve • Curve Strength: -0.1 to 0.1', 'curve', i => getPathType(i) === -1],
    ['homingCurve', 'homingCurve', 'Homing Ants', 'Bullets gradually turn toward the beetle mid-flight. Difficult to dodge.', 'Path Type: Homing', 'homing', i => getPathType(i) === -2],
    ['accelerate', null, 'Accelerate Ants', 'Bullets start slow, then speed up suddenly with a sonic boom.', 'Path Type: Accelerate', 'accelerate', i => getPathType(i) === 2 && !isBeamAccelerate(i)],
    ['beam', 'beam', 'Beam Ants', 'Bullets charge up with closing rings, then fire a beam to the edge of the screen when they would start accelerating. Beam color shows the effect: white knockback, purple vacuum, green explosive, cyan plain.', 'Path Type: Beam', 'beam', i => isBeamAccelerate(i)],
    ['blink', 'blink', 'Blink Ants', "Bullets flicker cyan, then vanish and reappear in a flash where they'd be half a second later, skipping everything in between.", 'Path Type: Blink', 'blink', i => getPathType(i) === 3 && pathBlink[i] < 1],
    ['portal', 'portal', 'Portal Ants', 'Bullets flicker pink and blink ahead like blink bullets, then come out of the flash aimed straight at the beetle at the same speed.', 'Path Type: Portal', 'portal', i => getPathType(i) === 3 && pathBlink[i] >= 1],
    // Death
    ['smearDeath', 'smearDeath', 'Smear Ants', 'Bullets leave a small damaging smear where they fade out. Radius and residue stats control its size and how long it lingers.', 'Death Type: Smear', 'smear', i => getDeathType(i) === -1],
    ['landmineConversion', 'landmineConversion', 'Landmine Ants', 'Bullets transform into landmines when they expire instead of fading.', 'Death Type: Landmine', 'landmine', i => getDeathType(i) === 1],
    ['refireDeath', 'refireDeath', 'Refire Ants', 'Where a bullet dies, it winds up and is fired at the beetle again, just as the ant would fire it. Refired bullets have no death effect.', 'Death Type: Refire', 'refire', i => getDeathType(i) === 2],
    ['turretDeath', 'turretDeath', 'Turret Ants', 'Where a bullet dies, a small turret sets up and fires at the beetle 3 times, then disappears. Turret bullets have no death effect.', 'Death Type: Turret', 'turret', i => getDeathType(i) === 3],
    ['territoryDeath', 'territoryDeath', 'Territory Ants', 'Where a bullet hits the ground it marks out an amber area. Any ant standing in it reloads 1.5x faster.', 'Death Type: Territory • Size: Radius Multiplier • Duration: Residue Multiplier', 'territory', i => getDeathType(i) === 4],
    ['nestDeath', 'nestDeath', 'Nest Ants', 'Bullets leave a territory with a blue ring. Ants in it reload 1.5x faster and also grow a shield that soaks up 1 damage and stops the ant being run over.', 'Death Type: Nest • Size: Radius Multiplier • Duration: Residue Multiplier', 'nest', i => getDeathType(i) === 5],
    ['moundDeath', 'moundDeath', 'Mound Ants', "Where a bullet hits the ground a round wall of dirt rises for a short time, blocking the beetle and its shots. Residue controls how long it stands.", 'Death Type: Mound • Duration: Residue Multiplier', 'mound', i => getDeathType(i) === 6],
    ['bunkerDeath', 'bunkerDeath', 'Bunker Ants', "Full-size bullets raise a covered dirt bunker where they land. Any ant close enough can climb in unseen and keep shooting while the beetle can only hit the bunker.", 'Death Type: Bunker • Duration: Residue Multiplier', 'bunker', i => getDeathType(i) === 7]
  ];
  return list.map(([id, legacy, name, desc, stats, scene, check]) => ({ id, legacy, section: 'abilities', name, desc, stats, scene, check }));
}

// Ability combinations with code written just for them
function buildDexExoticEntries() {
  const timed = i => getSpecialType(i) === 1 && specialExplosion[i] < 1;
  const explosive = i => getSpecialType(i) === 1;
  const stream = i => isStreamFire(i);
  // Bullets that turn into landmines (streams and beams have no death effect)
  const mines = i => getDeathType(i) === 1 && !stream(i) && !isBeamAccelerate(i);
  const list = [
    ['airStrike', 'Air Strike Ants', 'High arc bullets with a timed fuse can go off in mid-air, raining a bigger blast down on the beetle from above.', 'Time Explosion + High Arc', 'airStrike', i => timed(i) && getPathType(i) === 1 && !stream(i)],
    ['explodingAnts', 'Exploding Ants', 'Proximity explosion stream ants burst their streams, and if the beetle stays close they light a fuse and blow themselves up in a huge explosion.', 'Proximity Explosion + Stream', 'explodingAnts', i => getSpecialType(i) === 1 && specialExplosion[i] >= 1 && stream(i)],
    ['ghostAnts', 'Ghost Ants', 'Ghost stream ants fade out of sight just before they spray, and only fade back in once the stream stops.', 'Ghost Bullets + Stream', 'ghostAnts', i => getSpecialType(i) === -2 && stream(i)],
    ['hoverAnts', 'Hover Ants', 'Launch stream ants rise high into the air while they spray, untouchable above the spot they burn.', 'Launch + Stream', 'hoverAnts', i => getSpecialType(i) === -3 && stream(i)],
    ['explodingLandmine', 'Exploding Landmines', 'Explosive bullets become landmines that blow up instead of just burning the beetle.', 'Explosion + Landmine', 'explodingLandmine', i => explosive(i) && mines(i)],
    ['hiddenLandmine', 'Hidden Landmines', 'Ghost bullets become landmines that stay invisible until the beetle is right on top of them.', 'Ghost Bullets + Landmine', 'hiddenLandmine', i => getSpecialType(i) === -2 && mines(i)],
    // Found in the code: combinations with their own handling
    ['flickerLandmine', 'Flickering Landmines', 'Camouflage bullets become landmines that keep flickering in and out of sight.', 'Camouflage + Landmine', 'flickerLandmine', i => getSpecialType(i) === 2 && mines(i)],
    ['twinBeam', 'Twin Beam Ants', "Explosive beam bullets don't explode: their beam fires both ways at once and burns like an explosion.", 'Explosion + Beam', 'twinBeam', i => explosive(i) && isBeamAccelerate(i) && !stream(i)],
    ['beamStream', 'Laser Hose Ants', 'Beam stream ants fire a beam straight on from wherever their stream ends, for as long as the stream keeps arriving there.', 'Beam + Stream', 'beamStream', i => isBeamAccelerate(i) && stream(i)],
    ['sprinkler', 'Sprinkler Ants', 'Accelerating stream ants throw particles off the end of their stream that fan out to the edge of the screen.', 'Accelerate + Stream', 'sprinkler', i => getPathType(i) === 2 && !isBeamAccelerate(i) && stream(i)],
    ['clusterBomb', 'Cluster Bomb Ants', 'One lofted bullet splits into a burst, then every bullet of the burst splits into 3 more at the top of its arc. Arcs are timed so the two splits never happen at once.', 'Delayed Burst + Split Arc', 'clusterBomb', i => getFireType(i) === 3 && isSplitArc(i)]
  ];
  return list.map(([id, name, desc, stats, scene, check]) => ({ id, section: 'exotic', name, desc, stats, scene, check }));
}

function loadAntDexDiscoveries() {
  antDexDiscovered = {};
  try {
    const saved = getItem(ANTDEX_STORAGE_KEY);
    if (saved && typeof saved === 'object') antDexDiscovered = saved;
  } catch (e) {}
  // Carry over discoveries saved by the old one-key-per-entry system
  let migrated = false;
  for (const entry of antDexEntries) {
    if (entry.legacy && !antDexDiscovered[entry.id] && getItem(entry.legacy + 'PreviouslyDiscovered') === true) {
      antDexDiscovered[entry.id] = true;
      migrated = true;
    }
  }
  if (migrated) storeItem(ANTDEX_STORAGE_KEY, antDexDiscovered);
}

function buildAntDexEntries() {
  antDexEntries = [
    ...buildDexCapStatEntries(),
    ...buildDexValueStatEntries(),
    ...buildDexAbilityEntries(),
    ...buildDexExoticEntries()
  ];
  for (const entry of antDexEntries) {
    if (entry.level === undefined) entry.level = 0.5;
  }
  loadAntDexDiscoveries();
  for (const entry of antDexEntries) entry.discovered = !!antDexDiscovered[entry.id];
}

function discoverAntDexEntry(entry) {
  entry.discovered = true;
  antDexDiscovered[entry.id] = true;
  storeItem(ANTDEX_STORAGE_KEY, antDexDiscovered);
  triggerDiscoveryPopup(entry);
}

// Checks every ant on the field for new discoveries
function updateAntDexEntries() {
  if (antDexEntries.length === 0) buildAntDexEntries();
  if (start !== true || frameCount % 10 !== 0) return; // A few checks a second is plenty
  for (let i = 1; i <= enemyCount; i++) {
    if (hasAntAphidEffects(i)) continue; // Aphid boosts aren't the ant's own genes
    for (const entry of antDexEntries) {
      if (!entry.discovered && entry.check(i)) discoverAntDexEntry(entry);
    }
  }
}

// ----- Antdex pictures -----
// Every entry's picture is a little looping scene drawn with the game's own sprites (ant, bullet, beetle) on
// the arena floor color, with the same aura colors the game uses, so it shows what the ant does. Scenes work in a
// 150 x 150 box (DEX_PIC) that drawDexPicture scales to fit. Things too big for the box are shrunk to fit,
// and ideas that are hard to show with sprites alone get a small symbol (a clock for time, etc).
const DEX_PIC = 150;
const DEX_ANT_X = 26;       // Where the ant stands
const DEX_BEETLE_X = 124;   // Where the beetle (the target) sits
const DEX_MID_Y = 75;
const DEX_LOOP = 150;       // Frames per loop of most scenes
const DEX_SPRITE_SCALE = 0.85;
const DEX_BEETLE_SIZE = 62; // Shrunk well below its real size to fit the box

function dexPhase(g, period = DEX_LOOP) {
  return (g.t % period) / period;
}

function dexEase(x) {
  x = constrain(x, 0, 1);
  return x * x * (3 - 2 * x);
}

function dexRotate(rad) {
  rotate(rad * 180 / Math.PI); // The game runs in angleMode(DEGREES)
}

function dexAnt(x, y, size = 1, angle = 0, alpha = 255, lift = 0) {
  const sz = (45 + 15 * size) * DEX_SPRITE_SCALE;
  push();
  noStroke();
  fill(0, 0, 0, 70 * alpha / 255);
  ellipse(x + 1, y + 2, sz * 0.62 * (lift > 0 ? 0.8 : 1), sz * 0.3 * (lift > 0 ? 0.8 : 1));
  imageMode(CENTER);
  translate(x, y - lift);
  dexRotate(angle);
  if (alpha < 255) tint(255, alpha);
  image(ant, 0, 0, sz, sz);
  pop();
  if (size < 0.8) {
    // Small ants glow blue in the game
    push();
    noStroke();
    fill(80, 150, 255, (60 + 40 * Math.sin(frameCount * 0.15)) * alpha / 255);
    ellipse(x, y - lift, sz * 0.75, sz * 0.75);
    pop();
  }
  return sz;
}

function dexBeetle(x, y, alpha = 255, angle = Math.PI) {
  push();
  imageMode(CENTER);
  translate(x, y);
  dexRotate(angle);
  if (alpha < 255) tint(255, alpha);
  image(beetle, 0, 0, DEX_BEETLE_SIZE, DEX_BEETLE_SIZE);
  pop();
}

// A bullet with the game's auras. o: { aura, core, alpha, h (height in the air), angle, size }
function dexBullet(x, y, o = {}) {
  const size = o.size || 1;
  const a = (o.alpha === undefined ? 255 : o.alpha) / 255;
  const h = o.h || 0;
  const by = y - h;
  const pulse = 83 + 70 * Math.sin(frameCount * 0.3);
  push();
  noStroke();
  if (h > 0) {
    fill(0, 0, 0, map(h, 0, 40, 130, 40, true) * a);
    ellipse(x, y, 12 * size * DEX_SPRITE_SCALE, 12 * size * DEX_SPRITE_SCALE);
  }
  const auraSize = 25 * size * DEX_SPRITE_SCALE;
  if (o.aura === 'knockback') fill(220, 220, 220, pulse * a);
  else if (o.aura === 'vacuum') fill(190, 90, 255, 100 * a);
  else if (o.aura === 'homing') fill(255, 60, 60, pulse * a);
  else if (o.aura === 'blink') fill(110, 235, 255, pulse * a);
  else if (o.aura === 'portal') fill(255, 120, 255, pulse * a);
  else if (o.aura === 'split') fill(255, 150, 40, pulse * a);
  else if (o.aura === 'explode') fill(80, 220, 80, pulse * a);
  else noFill();
  if (o.aura) ellipse(x, by, auraSize * (o.aura === 'homing' ? 1.2 : 1), auraSize * (o.aura === 'homing' ? 1.2 : 1));
  if (o.aura === 'vacuum') {
    noFill();
    strokeWeight(1.2);
    for (let r = 0; r < 3; r++) {
      const ringT = ((frameCount * 0.04) + r / 3) % 1;
      stroke(215, 140, 255, 220 * ringT * a);
      ellipse(x, by, auraSize * 1.2 * (1 - ringT), auraSize * 1.2 * (1 - ringT));
    }
    noStroke();
  }
  imageMode(CENTER);
  push();
  translate(x, by);
  dexRotate(o.angle || 0);
  tint(255, 255 * a);
  image(bulletImage, 0, 0, 20 * size * DEX_SPRITE_SCALE, 20 * size * DEX_SPRITE_SCALE);
  pop();
  const coreSize = (6 * size + 2 * Math.sin(frameCount * 0.25)) * DEX_SPRITE_SCALE;
  if (o.core === 'mine') fill(255, 255, 0, 220 * a);
  else if (o.core === 'turret') fill(255, 40, 40, 220 * a);
  else if (o.core === 'nest') fill(90, 170, 255, 220 * a);
  else if (o.core === 'bunker') fill(70, 45, 20, 230 * a);
  if (o.core) ellipse(x, by, coreSize, coreSize);
  pop();
}

// Bullet from (x1, y1) to (x2, y2) at fraction f, facing the way it travels
function dexBulletAlong(x1, y1, x2, y2, f, o = {}) {
  dexBullet(lerp(x1, x2, f), lerp(y1, y2, f), Object.assign({ angle: Math.atan2(y2 - y1, x2 - x1) }, o));
}

// Explosion, as drawEnemyExplosions draws it (r = outer radius)
function dexExplosion(x, y, r, alpha = 255) {
  const a = alpha / 255 * 180;
  const wobble = 0.9 + 0.2 * Math.sin(frameCount * 0.4);
  push();
  noStroke();
  fill(0, 255, 0, a * 0.6);
  ellipse(x, y, r * 2 * wobble, r * 2 * wobble);
  fill(0, 200, 0, a);
  ellipse(x, y, r * 2 / 1.2 * wobble, r * 2 / 1.2 * wobble);
  pop();
}

function dexResidue(x, y, r, alpha = 255) {
  push();
  noStroke();
  fill(0, 255, 0, alpha * 0.25);
  ellipse(x, y, r * 2, r * 1.6);
  fill(0, 200, 0, alpha * 0.35);
  ellipse(x, y, r * 1.1, r * 0.9);
  pop();
}

// Landmine, as updateLandMines draws it: green disc, bright green outline and yellow center, plus the
// auras it inherits (o.aura 'explode' / 'knockback'). o.alpha fades it (camouflage / ghost stealth).
function dexMine(x, y, o = {}) {
  const a = o.alpha === undefined ? 255 : o.alpha;
  const size = 15 * (o.size || 1.2) * DEX_SPRITE_SCALE * 1.4;
  push();
  noStroke();
  if (o.aura === 'explode') {
    fill(80, 220, 80, Math.min(a, 83 + 70 * Math.sin(frameCount * 0.3)));
    ellipse(x, y, size * 1.35, size * 1.35);
  } else if (o.aura === 'knockback') {
    fill(220, 220, 220, Math.min(a, 83 + 70 * Math.sin(frameCount * 0.3)));
    ellipse(x, y, size * 1.2, size * 1.2);
  }
  fill(0, 200, 0, map(a, 0, 255, 0, 180));
  stroke(0, 255, 0, a);
  strokeWeight(2);
  ellipse(x, y, size, size);
  noStroke();
  fill(255, 255, 0, a);
  ellipse(x, y, size * 0.3, size * 0.3);
  pop();
}

// Turret, as drawDeathTurret draws it: a landmine body with a red center that pulses faster as a shot nears.
// charge 0-1 is how close the next shot is, deploy 0-1 grows it in, alpha fades it out.
function dexTurret(x, y, charge = 0, deploy = 1, alpha = 255) {
  const size = 15 * 1.2 * DEX_SPRITE_SCALE * 1.4 * deploy;
  push();
  fill(0, 200, 0, 180 * alpha / 255);
  stroke(0, 255, 0, alpha);
  strokeWeight(2);
  ellipse(x, y, size, size);
  noStroke();
  fill(255, 40, 40, alpha);
  const core = size * (0.3 + 0.1 * charge * (1 + Math.sin(frameCount * (0.17 + 0.5 * charge))));
  ellipse(x, y, core, core);
  pop();
}

// Refire wind-up, as drawDeathRefireWindup draws it: a red ring closing in on a spinning, reddening bullet
function dexRefireWindup(x, y, t) {
  const bulletDrawSize = 20 * DEX_SPRITE_SCALE;
  push();
  noFill();
  stroke(255, 70, 70, 80 + 175 * t);
  strokeWeight(1 + 2 * t);
  const ringSize = bulletDrawSize * (3 - 2 * t);
  ellipse(x, y, ringSize, ringSize);
  imageMode(CENTER);
  translate(x, y);
  rotate(frameCount * (6 + 30 * t)); // Degrees, like the game
  tint(255, 255, 255 - 120 * t);
  image(bulletImage, 0, 0, bulletDrawSize, bulletDrawSize);
  pop();
}

// Smear, as drawEnemySmears draws it: a lobed streak of acid
const DEX_SMEAR_LOBES = [{ dx: -7, dy: 1, scale: 0.7 }, { dx: 6, dy: -2, scale: 0.8 }, { dx: 12, dy: 2, scale: 0.55 }];
function dexSmear(x, y, r, grow, alpha) {
  push();
  noStroke();
  fill(0, 255, 0, alpha * 0.45);
  for (const lobe of DEX_SMEAR_LOBES) ellipse(x + lobe.dx * grow, y + lobe.dy * grow, r * 2 * lobe.scale * grow);
  fill(0, 170, 0, alpha * 0.8);
  ellipse(x, y, r * 1.3 * grow);
  for (const lobe of DEX_SMEAR_LOBES) ellipse(x + lobe.dx * grow, y + lobe.dy * grow, r * 1.1 * lobe.scale * grow);
  pop();
}

// Territory / nest area, as updateEnemyTerritories draws it: amber fill with a turning dashed rim, plus a
// pulsing blue inner ring for a nest
function dexTerritory(x, y, r, nest, alpha = 255) {
  push();
  noStroke();
  fill(255, 185, 60, alpha * 0.18);
  ellipse(x, y, r * 2);
  noFill();
  stroke(255, 200, 80, alpha * 0.8);
  strokeWeight(2);
  const dashes = Math.max(6, Math.round(r / 6));
  const turn = frameCount * 0.6;
  for (let d = 0; d < dashes; d++) {
    const a = turn + (d / dashes) * 360;
    arc(x, y, r * 2, r * 2, a, a + 180 / dashes, OPEN); // Degrees: drawDexPicture sets angleMode(DEGREES)
  }
  if (nest) {
    stroke(110, 190, 255, alpha * (0.5 + 0.3 * Math.sin(frameCount * 0.12)));
    strokeWeight(2.5);
    ellipse(x, y, r * 1.4);
  }
  pop();
}

// Proximity explosion stream ant's self-destruct fuse, as drawSelfDestructFuse draws it: a grey ring closing
// in (red once it can't be stopped) around a glow on the ant. t 0-1 is how far the fuse has burned.
function dexSelfDestructFuse(x, y, radius, t) {
  const locked = t >= 0.67;
  const c = locked ? [255, 70, 50] : [190, 190, 190];
  const pulse = 0.5 + 0.5 * Math.sin(frameCount * (0.3 + 0.9 * t));
  push();
  noFill();
  stroke(c[0], c[1], c[2], 40 + 50 * pulse);
  strokeWeight(1.5);
  ellipse(x, y, radius * 2, radius * 2);
  stroke(c[0], c[1], c[2], 90 + 165 * pulse);
  strokeWeight(2 + 2 * t);
  const ring = lerp(radius * 2 + 20, 24, t);
  ellipse(x, y, ring, ring);
  noStroke();
  fill(c[0], c[1], c[2], (locked ? 120 : 60) * pulse);
  ellipse(x, y, 40, 40);
  pop();
}

function dexSpeedLines(x, y, count, len, speed, alpha = 200) {
  push();
  strokeWeight(1.5);
  for (let k = 0; k < count; k++) {
    const yy = y + (k - (count - 1) / 2) * 7;
    const offset = (frameCount * speed + k * 9) % 14;
    stroke(255, 255, 255, alpha * (0.5 + 0.5 * ((k % 2) ? 0.7 : 1)));
    line(x - offset - len, yy, x - offset - len * 0.25, yy);
  }
  pop();
}

function dexRing(x, y, r, col, alpha, dashed) {
  push();
  noFill();
  stroke(col[0], col[1], col[2], alpha);
  strokeWeight(1.5);
  if (dashed) {
    const steps = 24;
    for (let k = 0; k < steps; k += 2) {
      const a1 = (k / steps) * Math.PI * 2 + frameCount * 0.01;
      const a2 = ((k + 1) / steps) * Math.PI * 2 + frameCount * 0.01;
      line(x + Math.cos(a1) * r, y + Math.sin(a1) * r, x + Math.cos(a2) * r, y + Math.sin(a2) * r);
    }
  } else {
    ellipse(x, y, r * 2, r * 2);
  }
  pop();
}

// Symbols for ideas that are hard to show with sprites
function dexClock(x, y, r = 9, fast = false) {
  push();
  fill(255, 255, 255, 230);
  stroke(30);
  strokeWeight(1.5);
  ellipse(x, y, r * 2, r * 2);
  const hand = (frameCount * (fast ? 0.2 : 0.06)) % (Math.PI * 2);
  line(x, y, x + Math.cos(hand - Math.PI / 2) * r * 0.75, y + Math.sin(hand - Math.PI / 2) * r * 0.75);
  line(x, y, x, y - r * 0.5);
  if (fast) {
    noFill();
    stroke(255, 255, 255, 220);
    line(x - r - 6, y - 3, x - r - 2, y - 3);
    line(x - r - 7, y + 2, x - r - 2, y + 2);
  }
  pop();
}

function dexArrow(x1, y1, x2, y2, col = [255, 255, 255], alpha = 220) {
  push();
  stroke(col[0], col[1], col[2], alpha);
  strokeWeight(2);
  line(x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  line(x2, y2, x2 - Math.cos(a - 0.5) * 6, y2 - Math.sin(a - 0.5) * 6);
  line(x2, y2, x2 - Math.cos(a + 0.5) * 6, y2 - Math.sin(a + 0.5) * 6);
  pop();
}

function dexCross(x, y, r, col = [255, 60, 60], alpha = 230) {
  push();
  stroke(col[0], col[1], col[2], alpha);
  strokeWeight(2.5);
  line(x - r, y - r, x + r, y + r);
  line(x - r, y + r, x + r, y - r);
  pop();
}

function dexFlash(x, y, r, col = [255, 255, 255], alpha = 200) {
  push();
  noStroke();
  fill(col[0], col[1], col[2], alpha);
  ellipse(x, y, r * 2, r * 2);
  pop();
}

// A tapered acid stream from (x1, y1) to (x2, y2), drawn from fraction f0 to f1 of the way along
function dexStream(x1, y1, x2, y2, f0, f1, o = {}) {
  const glow = o.glow || [110, 220, 40];
  const core = o.core || [215, 255, 150];
  const width = o.width || 12;
  const steps = 14;
  push();
  noStroke();
  for (let k = 0; k <= steps; k++) {
    const f = k / steps;
    if (f < f0 || f > f1) continue;
    const w = width * (0.2 + 0.8 * f);
    const wobble = Math.sin(frameCount * 0.3 + k) * 1.2;
    const x = lerp(x1, x2, f);
    const y = lerp(y1, y2, f) + wobble * f;
    fill(glow[0], glow[1], glow[2], 140);
    ellipse(x, y, w * 1.4, w);
    fill(core[0], core[1], core[2], 200);
    ellipse(x, y, w * 0.7, w * 0.45);
  }
  pop();
}

function dexBeam(x1, y1, x2, y2, width, alpha, glow = [60, 220, 255], core = [225, 250, 255]) {
  push();
  strokeCap(ROUND);
  stroke(glow[0], glow[1], glow[2], alpha * 0.7);
  strokeWeight(width);
  line(x1, y1, x2, y2);
  stroke(core[0], core[1], core[2], alpha);
  strokeWeight(width * 0.4);
  line(x1, y1, x2, y2);
  pop();
}

function dexSpeedRing(x, y, age) {
  push();
  noFill();
  stroke(255, 255, 255, 220 * (1 - age));
  strokeWeight(1.5);
  ellipse(x, y, 6 + 26 * age, 6 + 26 * age);
  pop();
}

// Fires bullets every `interval` frames that take `travel` frames to arrive; draw(f) draws one in flight
function dexVolley(g, interval, travel, draw) {
  const age0 = g.t % interval;
  for (let age = age0; age < travel; age += interval) draw(age / travel);
}

// Point on a bullet path that bends sideways by `bend` px at its middle
function dexCurvePoint(x1, y1, x2, y2, f, bend) {
  const nx = -(y2 - y1), ny = x2 - x1;
  const len = Math.hypot(nx, ny) || 1;
  const off = Math.sin(f * Math.PI) * bend;
  return { x: lerp(x1, x2, f) + nx / len * off, y: lerp(y1, y2, f) + ny / len * off };
}

// High arc: height at fraction f of the flight
function dexArcHeight(f, peak = 38) {
  return Math.sin(f * Math.PI) * peak;
}

function dexStandardShot(g, o = {}, travel = 90) {
  dexAnt(DEX_ANT_X, DEX_MID_Y);
  dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
  dexVolley(g, DEX_LOOP, travel, f => dexBulletAlong(DEX_ANT_X + 14, DEX_MID_Y, DEX_BEETLE_X - 14, DEX_MID_Y, f, o));
}

// Bullet that flies toward the beetle and explodes at fraction `at`
function dexExplodingShot(g, at, o = {}) {
  const p = dexPhase(g);
  const x1 = DEX_ANT_X + 14, x2 = DEX_BEETLE_X - 4;
  dexAnt(DEX_ANT_X, DEX_MID_Y);
  dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
  const travel = 0.6;
  const f = p / travel;
  if (f < at) {
    dexBulletAlong(x1, DEX_MID_Y, x2, DEX_MID_Y, f, Object.assign({ aura: 'explode' }, o));
  } else {
    const age = (p - at * travel) / (1 - at * travel);
    const x = lerp(x1, x2, at);
    if (age < 0.35) dexExplosion(x, DEX_MID_Y, (o.radius || 16) * dexEase(age / 0.12), 255 * (1 - age / 0.35));
    dexResidue(x, DEX_MID_Y, (o.radius || 16) * 0.7, 255 * Math.max(0, 1 - age / (o.residue || 0.8)));
  }
}

const DEX_SCENES = {
  // ----- Body stats (no bullet) -----
  antSpeed: g => {
    const n = 2 + Math.round(3 * g.level);
    dexSpeedLines(70, DEX_MID_Y, n, 14 + 26 * g.level, 1.5 + 3 * g.level);
    dexAnt(85, DEX_MID_Y + Math.sin(frameCount * 0.4) * 1.5);
  },
  antSize: g => {
    dexAnt(32, DEX_MID_Y + 24, 1, 0, 90); // A normal ant to compare against
    dexAnt(92, DEX_MID_Y - 4, g.value || 1);
  },
  movement: g => {
    const { target, keep } = g.opts;
    const p = dexPhase(g, 180);
    const tx = keep ? 82 : 118, ty = DEX_MID_Y;
    const drawTarget = () => {
      if (target === 'beetle') dexBeetle(tx, ty, 255, Math.PI);
      else if (target === 'ants') dexAnt(tx, ty, 1, Math.PI, 200);
      else if (target === 'location') dexCross(tx, ty, 7, [255, 220, 60]);
      else dexRing(tx, ty, 11, [175, 140, 95], 230, false); // Spawn point
    };
    if (keep || target !== 'spawn') drawTarget();
    if (keep) {
      const r = 42;
      dexRing(tx, ty, r, [255, 255, 255], 120, true);
      const a = p * Math.PI * 2;
      const ax = tx + Math.cos(a) * r, ay = ty + Math.sin(a) * r;
      dexAnt(ax, ay, 1, a + Math.PI);
    } else if (target === 'spawn') {
      // Stand still: stays on its spawn point, turning to aim at the beetle
      const by = DEX_MID_Y + Math.sin(p * Math.PI * 2) * 40;
      dexBeetle(DEX_BEETLE_X, by, 255, Math.PI);
      dexRing(DEX_ANT_X + 10, DEX_MID_Y, 11, [175, 140, 95], 230, false);
      dexAnt(DEX_ANT_X + 10, DEX_MID_Y, 1, Math.atan2(by - DEX_MID_Y, DEX_BEETLE_X - DEX_ANT_X - 10));
    } else {
      const f = dexEase(p / 0.8);
      const ax = lerp(18, tx - 30, f);
      dexAnt(ax, ty + Math.sin(p * 20) * 1.5, 1, 0, 255 * Math.min(1, (1 - p) * 8));
      if (f > 0 && f < 1) dexSpeedLines(ax - 10, ty, 2, 10, 2, 120);
    }
  },
  // ----- Shooting stats -----
  offset: g => {
    const off = 6 + 50 * g.level;
    dexAnt(DEX_ANT_X, DEX_MID_Y, 1, Math.atan2(off, DEX_BEETLE_X - DEX_ANT_X));
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    push();
    stroke(255, 255, 255, 70);
    strokeWeight(1);
    line(DEX_ANT_X, DEX_MID_Y, DEX_BEETLE_X, DEX_MID_Y);
    pop();
    dexCross(DEX_BEETLE_X - 8, DEX_MID_Y + off, 4, [255, 220, 60]);
    dexVolley(g, 75, 70, f => dexBulletAlong(DEX_ANT_X + 12, DEX_MID_Y, DEX_BEETLE_X - 8, DEX_MID_Y + off, f));
  },
  distance: g => {
    // Distances up to 1000px, shrunk to fit the box
    const r = 12 + 52 * g.level;
    const bx = 82;
    dexBeetle(bx, DEX_MID_Y);
    dexRing(bx, DEX_MID_Y, r, [255, 255, 255], 110, true);
    const a = Math.PI + Math.sin(frameCount * 0.02) * 0.6;
    const ax = bx + Math.cos(a) * r, ay = DEX_MID_Y + Math.sin(a) * r;
    dexArrow(bx + Math.cos(a) * 14, DEX_MID_Y + Math.sin(a) * 14, ax - Math.cos(a) * 12, ay - Math.sin(a) * 12, [255, 220, 60], 160);
    dexAnt(ax, ay, 1, a + Math.PI);
  },
  bulletSpeed: g => {
    const travel = Math.round(lerp(90, 24, g.level));
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    dexVolley(g, travel + 30, travel, f => {
      const x = lerp(DEX_ANT_X + 14, DEX_BEETLE_X - 14, f);
      dexSpeedLines(x - 4, DEX_MID_Y, 1 + Math.round(2 * g.level), 6 + 16 * g.level, 3, 160);
      dexBullet(x, DEX_MID_Y);
    });
  },
  cooldown: g => {
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    const interval = Math.round(lerp(60, 16, g.level));
    dexVolley(g, interval, 70, f => dexBulletAlong(DEX_ANT_X + 14, DEX_MID_Y, DEX_BEETLE_X - 14, DEX_MID_Y, f));
    dexClock(132, 18, 9, true);
  },
  bulletSize: g => dexStandardShot(g, { size: g.value || 2 }, 110),
  camoFlash: g => {
    // Fewer flashes per second (higher tiers) keep the bullet hidden longer
    const rate = g.value || 1.5;
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    dexVolley(g, DEX_LOOP, 110, f => {
      const wave = 0.5 + 0.5 * Math.sin(g.t * rate * Math.PI * 2 / 60); // Same curve as getStealthAlpha
      dexBulletAlong(DEX_ANT_X + 14, DEX_MID_Y, DEX_BEETLE_X - 14, DEX_MID_Y, f, { alpha: 255 * (0.08 + 0.92 * wave * wave) });
    });
  },
  knockbackPower: g => DEX_SCENES._knockback(g, 8 + 26 * g.level),
  _knockback: (g, push) => {
    const p = dexPhase(g);
    const hitAt = 0.45;
    const pushF = p < hitAt ? 0 : dexEase((p - hitAt) / 0.15) * (1 - dexEase((p - 0.8) / 0.2));
    const bx = DEX_BEETLE_X - 14 + pushF * push;
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexBeetle(Math.min(bx, 140), DEX_MID_Y);
    if (p < hitAt) dexBulletAlong(DEX_ANT_X + 14, DEX_MID_Y, DEX_BEETLE_X - 26, DEX_MID_Y, p / hitAt, { aura: 'knockback' });
    else if (p < hitAt + 0.2) dexArrow(DEX_BEETLE_X - 30, DEX_MID_Y - 22, DEX_BEETLE_X - 30 + 12 + push * 0.6, DEX_MID_Y - 22);
  },
  burstCount: g => DEX_SCENES._burst(g, Math.max(2, Math.round(g.value || 3)), 0.9),
  burstSpread: g => DEX_SCENES._burst(g, 3, Math.min(g.value || 2, 3.14)),
  _burst: (g, count, spread) => {
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexVolley(g, 100, 80, f => {
      for (let k = 0; k < count; k++) {
        const a = count === 1 ? 0 : -spread / 2 + spread * k / (count - 1);
        const d = 14 + f * 105;
        dexBullet(DEX_ANT_X + Math.cos(a) * d, DEX_MID_Y + Math.sin(a) * d, { angle: a });
      }
    });
  },
  cooldownMult: g => {
    // Alternating fire: a short wait, then a wait `value` times longer
    const mult = g.value || 4;
    const short = 18;
    const period = Math.round(short + short * mult);
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    for (const start of [0, short]) {
      let age = (g.t - start) % period;
      if (age < 0) age += period;
      if (age < 70) dexBulletAlong(DEX_ANT_X + 14, DEX_MID_Y, DEX_BEETLE_X - 14, DEX_MID_Y, age / 70);
    }
    dexClock(132, 18);
  },
  curveStrength: g => {
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    const bend = 14 + 36 * g.level;
    dexVolley(g, DEX_LOOP, 100, f => {
      const pt = dexCurvePoint(DEX_ANT_X + 14, DEX_MID_Y, 130, DEX_MID_Y, f, bend);
      const next = dexCurvePoint(DEX_ANT_X + 14, DEX_MID_Y, 130, DEX_MID_Y, f + 0.02, bend);
      dexBullet(pt.x, pt.y, { angle: Math.atan2(next.y - pt.y, next.x - pt.x) });
    });
  },
  accelDelay: g => {
    DEX_SCENES._accelerate(g, lerp(0.55, 0.15, g.level));
    dexClock(132, 18);
  },
  _accelerate: (g, at) => {
    const p = dexPhase(g);
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    const slow = 22; // px it creeps before speeding up
    const x0 = DEX_ANT_X + 14;
    let x;
    if (p < at) x = x0 + slow * (p / at);
    else x = x0 + slow + (p - at) * (p - at) * 900;
    if (p >= at && p < at + 0.15) dexSpeedRing(x0 + slow, DEX_MID_Y, (p - at) / 0.15);
    if (x < DEX_BEETLE_X - 14) {
      if (p >= at) dexSpeedLines(x - 4, DEX_MID_Y, 2, 14, 3, 160);
      dexBullet(x, DEX_MID_Y);
    }
  },
  radius: g => dexExplodingShot(g, 0.85, { radius: 8 + 9 * (g.value || 2), residue: 0.4 }),
  residue: g => {
    dexExplodingShot(g, 0.8, { radius: 16, residue: 0.4 + 0.6 * g.level });
    dexClock(132, 18);
  },
  fuse: g => {
    // Fuses run up to 800 frames: shown at the scale of the box, a longer fuse flies further before it goes off
    dexExplodingShot(g, lerp(0.25, 0.95, g.level));
    dexClock(132, 18);
  },
  proximity: g => {
    const r = 10 + 40 * g.level;
    const x1 = DEX_ANT_X + 14, bx = DEX_BEETLE_X;
    const at = Math.max(0.05, (bx - r - x1) / (bx - 4 - x1));
    dexRing(bx, DEX_MID_Y, r, [80, 220, 80], 120, true);
    dexExplodingShot(g, at);
  },

  // ----- Abilities -----
  timedExplosion: g => {
    dexExplodingShot(g, 0.5);
    dexClock(132, 18);
  },
  proximityExplosion: g => {
    dexRing(DEX_BEETLE_X, DEX_MID_Y, 30, [80, 220, 80], 120, true);
    dexExplodingShot(g, 0.66);
  },
  knockback: g => DEX_SCENES._knockback(g, 22),
  vacuum: g => {
    const p = dexPhase(g);
    const by = DEX_MID_Y + 14;
    const bulletX = lerp(DEX_ANT_X + 14, 150, p / 0.8);
    const pull = p < 0.8 ? Math.max(0, 1 - Math.abs(bulletX - DEX_BEETLE_X) / 45) : 0;
    dexAnt(DEX_ANT_X, DEX_MID_Y - 14);
    dexBeetle(DEX_BEETLE_X - pull * 6, by - pull * 14);
    if (p < 0.8) dexBullet(bulletX, DEX_MID_Y - 14, { aura: 'vacuum' });
  },
  camo: g => DEX_SCENES.camoFlash(Object.assign({}, g, { value: 1.5 })),
  ghost: g => {
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    dexVolley(g, DEX_LOOP, 100, f => {
      const x = lerp(DEX_ANT_X + 14, DEX_BEETLE_X - 14, f);
      const near = DEX_BEETLE_X - x;
      dexBullet(x, DEX_MID_Y, { alpha: map(near, 50, 25, 0, 255, true) });
    });
    dexRing(DEX_BEETLE_X, DEX_MID_Y, 45, [255, 255, 255], 50, true);
  },
  recoil: g => DEX_SCENES._recoil(g, false),
  launch: g => DEX_SCENES._recoil(g, true),
  _recoil: (g, hop) => {
    const p = dexPhase(g);
    const kick = p < 0.4 ? dexEase(p / 0.25) : 1 - dexEase((p - 0.5) / 0.4);
    const ax = 44 - kick * 22;
    const lift = hop && p < 0.4 ? Math.sin((p / 0.4) * Math.PI) * 16 : 0;
    dexAnt(ax, DEX_MID_Y, 1, 0, 255, lift);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    if (p < 0.6) dexBulletAlong(58, DEX_MID_Y, DEX_BEETLE_X - 14, DEX_MID_Y, p / 0.6);
    if (p < 0.2) dexArrow(ax + 2, DEX_MID_Y + 18, ax - 14, DEX_MID_Y + 18, [255, 255, 255], 200);
  },
  alternating: g => {
    DEX_SCENES.cooldownMult(Object.assign({}, g, { value: 2.5 }));
  },
  hitReload: g => {
    const p = dexPhase(g, 120);
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    const x1 = DEX_ANT_X + 14, x2 = DEX_BEETLE_X - 12;
    if (p < 0.45) dexBulletAlong(x1, DEX_MID_Y, x2, DEX_MID_Y, p / 0.45);
    else if (p < 0.6) {
      const t = (p - 0.45) / 0.15;
      dexFlash(DEX_ANT_X, DEX_MID_Y, 10 + 8 * t, [255, 255, 255], 200 * (1 - t)); // Hit: instant reload flash
      dexFlash(x2, DEX_MID_Y, 6 + 6 * t, [255, 80, 80], 180 * (1 - t));
    }
    if (p >= 0.55) dexBulletAlong(x1, DEX_MID_Y, x2, DEX_MID_Y, (p - 0.55) / 0.45);
  },
  burst: g => DEX_SCENES._burst(g, 3, 0.8),
  delayedBurst: g => {
    const p = dexPhase(g, 120);
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    const splitAt = 0.35;
    const sx = DEX_ANT_X + 14 + 40;
    if (p < splitAt) dexBulletAlong(DEX_ANT_X + 14, DEX_MID_Y, sx, DEX_MID_Y, p / splitAt, { aura: 'split', size: 1.3 });
    else {
      const f = (p - splitAt) / (1 - splitAt);
      for (let k = -1; k <= 1; k++) {
        const a = k * 0.45;
        dexBullet(sx + Math.cos(a) * f * 75, DEX_MID_Y + Math.sin(a) * f * 75, { angle: a });
      }
    }
  },
  rapid: g => {
    // One shot splits into 3 smaller bullets (sized like getBurstBulletSize) fired 15 frames apart, then the
    // ant waits out its cooldown. While it reloads, a faint full-size bullet shows the shot being split.
    const count = 3;
    const size = 1 / (1 + (count - 1) / 4);
    const period = 150;
    const travel = 60;
    const age0 = g.t % period;
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    if (age0 > 100) {
      const t = Math.min(1, (age0 - 100) / 25);
      dexBullet(DEX_ANT_X + 30, DEX_MID_Y - 26, { alpha: 160 * (1 - t) });
      for (let k = 0; k < count; k++) {
        dexBullet(DEX_ANT_X + 30 + (k - 1) * 12 * t, DEX_MID_Y - 26, { size, alpha: 160 * t });
      }
    }
    for (let k = 0; k < count; k++) {
      const age = age0 - k * 15;
      if (age >= 0 && age < travel) dexBulletAlong(DEX_ANT_X + 14, DEX_MID_Y, DEX_BEETLE_X - 14, DEX_MID_Y, age / travel, { size });
    }
  },
  stream: g => {
    const p = dexPhase(g);
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    // Grows out from the base, sprays, then the rest flows away
    const f1 = Math.min(1, p / 0.3);
    const f0 = p < 0.7 ? 0 : (p - 0.7) / 0.3;
    dexStream(DEX_ANT_X + 12, DEX_MID_Y, DEX_BEETLE_X - 4, DEX_MID_Y, f0, f1);
  },
  alarm: g => {
    const p = dexPhase(g, 200);
    const bx = lerp(140, 62, Math.sin(p * Math.PI));
    const d = bx - DEX_ANT_X;
    dexRing(DEX_ANT_X, DEX_MID_Y, 70, [255, 170, 40], 60, true);
    dexRing(DEX_ANT_X, DEX_MID_Y, 40, [255, 60, 40], 60, true);
    if (d < 70) {
      const inner = d < 40;
      const pulse = 0.5 + 0.5 * Math.sin(frameCount * (inner ? 0.6 : 0.3));
      push();
      noFill();
      stroke(255, inner ? 60 : 170, 40, 120 + 120 * pulse);
      strokeWeight(2);
      ellipse(DEX_ANT_X, DEX_MID_Y, 34 + 4 * pulse, 34 + 4 * pulse);
      pop();
    }
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexBeetle(bx, DEX_MID_Y);
    const interval = d < 40 ? 20 : d < 70 ? 30 : 60;
    dexVolley(g, interval, 40, f => {
      const x = lerp(DEX_ANT_X + 14, bx - 12, f);
      if (x < bx - 10) dexBullet(x, DEX_MID_Y);
    });
  },
  avenge: g => {
    const p = dexPhase(g, 160);
    const fx = 50, fy = 36;
    if (p < 0.3) dexAnt(fx, fy, 1, 0.3);
    else if (p < 0.5) {
      const t = (p - 0.3) / 0.2;
      dexAnt(fx, fy, 1, 0.3, 255 * (1 - t));
      dexCross(fx, fy, 8, [255, 60, 60], 255 * (1 - t));
    }
    dexAnt(DEX_ANT_X, DEX_MID_Y + 22);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y + 10);
    if (p >= 0.3 && p < 0.42) dexFlash(DEX_ANT_X, DEX_MID_Y + 22, 14, [255, 255, 255], 220 * (1 - (p - 0.3) / 0.12));
    if (p >= 0.4 && p < 0.85) dexBulletAlong(DEX_ANT_X + 14, DEX_MID_Y + 22, DEX_BEETLE_X - 12, DEX_MID_Y + 10, (p - 0.4) / 0.45);
  },
  highArc: g => {
    dexAnt(DEX_ANT_X, DEX_MID_Y + 20);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y + 20);
    dexVolley(g, DEX_LOOP, 110, f => {
      dexBullet(lerp(DEX_ANT_X + 10, DEX_BEETLE_X - 4, f), DEX_MID_Y + 20, { h: dexArcHeight(f, 50) });
    });
  },
  splitArc: g => {
    const p = dexPhase(g);
    dexAnt(DEX_ANT_X, DEX_MID_Y + 20);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y + 20);
    const f = p / 0.8;
    if (f > 1) return;
    const x = lerp(DEX_ANT_X + 10, DEX_BEETLE_X - 4, f);
    const h = dexArcHeight(f, 50);
    if (f < 0.5) dexBullet(x, DEX_MID_Y + 20, { h, aura: 'split' });
    else {
      for (let k = -1; k <= 1; k++) {
        const spread = (f - 0.5) / 0.5 * 22 * k;
        dexBullet(x, DEX_MID_Y + 20 + spread, { h, size: 0.7 });
      }
    }
  },
  curve: g => DEX_SCENES.curveStrength(Object.assign({}, g, { level: 0.35 })),
  homing: g => {
    const p = dexPhase(g);
    const by = DEX_MID_Y + Math.sin(p * Math.PI * 2) * 35;
    dexAnt(DEX_ANT_X, DEX_MID_Y, 1, Math.atan2(by - DEX_MID_Y, 90));
    dexBeetle(DEX_BEETLE_X, by);
    // Starts straight, then bends toward wherever the beetle is
    const f = Math.min(1, p / 0.7);
    const x = lerp(DEX_ANT_X + 14, DEX_BEETLE_X - 12, f);
    const y = lerp(DEX_MID_Y, by, f * f);
    if (p < 0.7) dexBullet(x, y, { aura: 'homing', angle: Math.atan2((by - DEX_MID_Y) * 2 * f, DEX_BEETLE_X - DEX_ANT_X) });
  },
  accelerate: g => DEX_SCENES._accelerate(g, 0.4),
  beam: g => {
    const p = dexPhase(g);
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    const fireAt = 0.4;
    const bx = DEX_ANT_X + 14 + 26 * Math.min(1, p / fireAt);
    if (p < fireAt) {
      dexBullet(bx, DEX_MID_Y);
      const charge = p / fireAt;
      push();
      noFill();
      strokeWeight(1.5 + charge);
      for (let r = 0; r < 2; r++) {
        const q = ((frameCount / (30 * (1 - 0.6 * charge))) + r * 0.5) % 1;
        stroke(60, 220, 255, (60 + 170 * charge) * q);
        const size = lerp(30, 10, q);
        ellipse(bx, DEX_MID_Y, size, size);
      }
      pop();
    } else if (p < 0.75) {
      dexBeam(bx, DEX_MID_Y, DEX_PIC + 10, DEX_MID_Y, 8, 255 * (1 - (p - fireAt) / 0.35));
    }
  },
  blink: g => DEX_SCENES._blink(g, false),
  portal: g => DEX_SCENES._blink(g, true),
  _blink: (g, portal) => {
    const p = dexPhase(g);
    const by = portal ? DEX_MID_Y + 32 : DEX_MID_Y;
    const col = portal ? [255, 120, 255] : [110, 235, 255];
    dexAnt(DEX_ANT_X, DEX_MID_Y, 1, portal ? 0 : Math.atan2(by - DEX_MID_Y, 90));
    dexBeetle(DEX_BEETLE_X, by);
    const jumpAt = 0.3, x1 = DEX_ANT_X + 14, jx = 52, ox = 92;
    if (p < jumpAt) dexBullet(lerp(x1, jx, p / jumpAt), DEX_MID_Y, { aura: portal ? 'portal' : 'blink' });
    else if (p < 0.8) {
      const t = (p - jumpAt) / 0.5;
      if (t < 0.25) {
        dexFlash(jx, DEX_MID_Y, 8 * (1 - t * 4) + 3, col, 160 * (1 - t * 4));
        dexFlash(ox, DEX_MID_Y, 10 * t * 4 + 2, col, 200 * (1 - t * 2));
      }
      // Portal bullets come out aimed at the beetle
      const tx = portal ? DEX_BEETLE_X - 12 : 150, ty = portal ? by : DEX_MID_Y;
      dexBulletAlong(ox, DEX_MID_Y, tx, ty, t);
    }
  },
  smear: g => {
    const p = dexPhase(g);
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    const stop = 96;
    const f = Math.min(1, p / 0.45);
    const x = lerp(DEX_ANT_X + 14, stop, 1 - (1 - f) * (1 - f)); // slows down as it fades
    if (p < 0.5) dexBullet(x, DEX_MID_Y, { alpha: 255 * (1 - Math.max(0, (p - 0.35) / 0.15)) });
    if (p >= 0.42) {
      const age = (p - 0.42) / 0.58;
      dexSmear(stop, DEX_MID_Y, 11, Math.min(1, age / 0.1), lerp(150, 0, age * age));
    }
  },
  landmine: g => {
    const p = dexPhase(g);
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    if (p < 0.4) dexBulletAlong(DEX_ANT_X + 14, DEX_MID_Y, 100, DEX_MID_Y, p / 0.4, { core: 'mine' });
    else dexMine(100, DEX_MID_Y);
  },
  refire: g => {
    const p = dexPhase(g, 170);
    const sx = 90, sy = DEX_MID_Y - 30;
    const by = DEX_MID_Y + 25;
    dexAnt(DEX_ANT_X, DEX_MID_Y, 1, Math.atan2(sy - DEX_MID_Y, sx - DEX_ANT_X));
    dexBeetle(DEX_BEETLE_X - 6, by);
    if (p < 0.35) dexBulletAlong(DEX_ANT_X + 12, DEX_MID_Y - 4, sx, sy, p / 0.35);
    else if (p < 0.55) dexRefireWindup(sx, sy, (p - 0.35) / 0.2);
    else if (p < 0.85) dexBulletAlong(sx, sy, DEX_BEETLE_X - 16, by, (p - 0.55) / 0.3);
  },
  turret: g => {
    const p = dexPhase(g, 200);
    const sx = 76, sy = DEX_MID_Y - 30;
    const by = DEX_MID_Y + 25;
    dexAnt(DEX_ANT_X, DEX_MID_Y, 1, Math.atan2(sy - DEX_MID_Y, sx - DEX_ANT_X));
    dexBeetle(DEX_BEETLE_X - 6, by);
    if (p < 0.25) dexBulletAlong(DEX_ANT_X + 12, DEX_MID_Y - 4, sx, sy, p / 0.25, { core: 'turret' });
    else {
      // Fires 3 times, its center pulsing faster before each shot, then fades away
      const shots = [0.36, 0.54, 0.72];
      const next = shots.find(s => s > p);
      const charge = next === undefined ? 0 : 1 - constrain((next - p) / 0.12, 0, 1);
      dexTurret(sx, sy, charge, Math.min(1, (p - 0.25) / 0.05), p > 0.88 ? 255 * (1 - (p - 0.88) / 0.12) : 255);
      for (const start of shots) {
        const f = (p - start) / 0.2;
        if (f > 0 && f < 1) dexBulletAlong(sx, sy, DEX_BEETLE_X - 16, by, f);
      }
    }
  },
  _ground: (g, drawEffect, core) => {
    const p = dexPhase(g, 180);
    const lx = 88;
    dexAnt(DEX_ANT_X, DEX_MID_Y + 25);
    if (p < 0.25) dexBulletAlong(DEX_ANT_X + 14, DEX_MID_Y + 25, lx, DEX_MID_Y, p / 0.25, { core });
    else drawEffect(lx, DEX_MID_Y, Math.min(1, (p - 0.25) / 0.1), p);
  },
  territory: g => DEX_SCENES._ground(g, (x, y, grow, p) => {
    dexTerritory(x, y, 35 * grow, false);
    // An ant standing in it reloads faster
    dexAnt(x, y, 1, Math.PI * 0.5);
    dexVolley(g, 25, 30, f => dexBulletAlong(x, y + 10, x, 160, f, { size: 0.7 }));
    dexClock(132, 18, 9, true);
  }),
  nest: g => DEX_SCENES._ground(g, (x, y, grow, p) => {
    dexTerritory(x, y, 35 * grow, true);
    const sz = dexAnt(x, y, 1, Math.PI * 0.5);
    const shield = Math.min(1, (p - 0.35) / 0.4);
    if (shield > 0) {
      push();
      fill(120, 200, 255, 40 * shield);
      stroke(150, 215, 255, 90 + 140 * shield);
      strokeWeight(1 + 1.5 * shield);
      ellipse(x, y, sz * 0.95, sz * 0.95);
      pop();
    }
  }, 'nest'),
  mound: g => DEX_SCENES._ground(g, (x, y, grow, p) => {
    const r = 16 * grow * (p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1);
    push();
    noStroke();
    fill(0, 0, 0, 70);
    ellipse(x + 3, y + 4, r * 2.1, r * 1.9);
    fill(135, 100, 60);
    stroke(80, 55, 30);
    strokeWeight(2);
    ellipse(x, y, r * 2, r * 2);
    noStroke();
    fill(175, 140, 95, 200);
    ellipse(x - r * 0.25, y - r * 0.3, r * 1.1, r * 0.9);
    pop();
    // The beetle's shot is blocked by it
    dexBeetle(DEX_BEETLE_X + 4, y);
    const f = ((g.t % 60) / 60);
    const sx = lerp(DEX_BEETLE_X - 14, x + r, f);
    if (r > 4) {
      push();
      noStroke();
      fill(58, 166, 18);
      ellipse(sx, y, 6, 6);
      pop();
    }
  }),
  bunker: g => DEX_SCENES._ground(g, (x, y, grow, p) => {
    const r = 18 * grow;
    push();
    noStroke();
    fill(0, 0, 0, 70);
    ellipse(x + 3, y + 4, r * 2.4, r * 2.2);
    fill(115, 85, 50);
    ellipse(x, y, r * 2.3, r * 2.1);
    fill(25, 18, 10);
    ellipse(x, y, r * 1.8, r * 1.6);
    pop();
    // A nearby ant climbs in and vanishes
    const t = constrain((p - 0.4) / 0.35, 0, 1);
    if (t < 1) dexAnt(lerp(130, x, t), lerp(30, y, t), 1, Math.atan2(y - 30, x - 130), 255 * (1 - Math.max(0, (t - 0.8) / 0.2)));
  }, 'bunker'),

  // ----- Exotic -----
  airStrike: g => {
    const p = dexPhase(g);
    const gy = DEX_MID_Y + 25;
    dexAnt(DEX_ANT_X, gy);
    dexBeetle(DEX_BEETLE_X - 8, gy);
    const at = 0.72;
    const f = p / 0.75;
    const x = lerp(DEX_ANT_X + 10, DEX_BEETLE_X - 4, Math.min(f, at));
    const h = dexArcHeight(Math.min(f, at), 60);
    if (f < at) dexBullet(x, gy, { h, aura: 'explode' });
    else {
      const age = (f - at) / (1 / 0.75 - at);
      // Blast in the air, linked down to the ground below
      push();
      stroke(80, 220, 80, 200 * (1 - age));
      strokeWeight(3);
      line(x, gy - h, x, gy);
      pop();
      dexExplosion(x, gy - h, 22 * dexEase(age / 0.15), 255 * (1 - age));
      dexResidue(x, gy, 16, 220 * (1 - age));
    }
  },
  explodingAnts: g => {
    const p = dexPhase(g, 180);
    const ax = 48;
    if (p < 0.7) {
      if (p > 0.3) dexSelfDestructFuse(ax, DEX_MID_Y, 70, (p - 0.3) / 0.4);
      dexAnt(ax, DEX_MID_Y);
      dexStream(ax + 12, DEX_MID_Y, DEX_BEETLE_X - 4, DEX_MID_Y, 0, Math.min(1, p / 0.2));
    } else {
      const age = (p - 0.7) / 0.3;
      dexExplosion(ax, DEX_MID_Y, 45 * dexEase(age / 0.15), 255 * (1 - age));
    }
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
  },
  ghostAnts: g => {
    const p = dexPhase(g);
    const alpha = p < 0.15 ? 255 * (1 - p / 0.15) : p < 0.7 ? 0 : 255 * Math.min(1, (p - 0.7) / 0.15);
    dexAnt(DEX_ANT_X, DEX_MID_Y, 1, 0, Math.max(alpha, 25));
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    if (p > 0.15 && p < 0.85) dexStream(DEX_ANT_X + 12, DEX_MID_Y, DEX_BEETLE_X - 4, DEX_MID_Y, p < 0.6 ? 0 : (p - 0.6) / 0.25, Math.min(1, (p - 0.15) / 0.2));
  },
  hoverAnts: g => {
    const p = dexPhase(g);
    const lift = p < 0.1 ? 18 * p / 0.1 : p < 0.75 ? 18 : 18 * (1 - (p - 0.75) / 0.1);
    dexAnt(DEX_ANT_X + 10, DEX_MID_Y, 1, 0, 255, Math.max(0, lift));
    if (lift > 10) {
      push();
      noStroke();
      fill(90, 200, 40, 110);
      ellipse(DEX_ANT_X + 10, DEX_MID_Y, 30, 16); // The spot below it burns
      pop();
    }
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    if (p > 0.1 && p < 0.8) dexStream(DEX_ANT_X + 20, DEX_MID_Y - lift, DEX_BEETLE_X - 4, DEX_MID_Y, 0, Math.min(1, (p - 0.1) / 0.2));
  },
  explodingLandmine: g => {
    const p = dexPhase(g);
    const mx = 70;
    const bx = lerp(140, mx + 10, Math.min(1, p / 0.5));
    if (p < 0.5) dexMine(mx, DEX_MID_Y, { aura: 'explode' });
    else {
      const age = (p - 0.5) / 0.5;
      dexExplosion(mx, DEX_MID_Y, 28 * dexEase(age / 0.15), 255 * (1 - age));
    }
    dexBeetle(bx, DEX_MID_Y);
  },
  hiddenLandmine: g => {
    const p = dexPhase(g);
    const mx = 70;
    const bx = lerp(140, mx + 14, Math.min(1, p / 0.6));
    dexMine(mx, DEX_MID_Y, { alpha: map(bx - mx, 50, 25, 0, 255, true) });
    dexBeetle(bx, DEX_MID_Y);
  },
  flickerLandmine: g => {
    const wave = 0.5 + 0.5 * Math.sin(g.t * 1.5 * Math.PI * 2 / 60);
    dexMine(70, DEX_MID_Y, { alpha: 255 * (0.08 + 0.92 * wave * wave) });
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y + 20);
  },
  twinBeam: g => {
    const p = dexPhase(g);
    const bx = 70, by = DEX_MID_Y - 18;
    dexAnt(DEX_ANT_X, DEX_MID_Y + 20, 1, Math.atan2(by - DEX_MID_Y - 20, bx - DEX_ANT_X));
    dexBeetle(DEX_BEETLE_X, by);
    const fireAt = 0.35;
    if (p < fireAt) dexBulletAlong(DEX_ANT_X + 10, DEX_MID_Y + 14, bx, by, p / fireAt, { aura: 'explode' });
    else if (p < 0.75) {
      const a = 255 * (1 - (p - fireAt) / 0.4);
      dexBeam(bx, by, DEX_PIC + 10, by, 9, a, [0, 255, 0], [210, 255, 170]);
      dexBeam(bx, by, -10, by, 9, a, [0, 255, 0], [210, 255, 170]);
    }
  },
  beamStream: g => {
    const p = dexPhase(g);
    const end = 76;
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    dexBeetle(DEX_BEETLE_X, DEX_MID_Y);
    const f1 = Math.min(1, p / 0.3);
    const f0 = p < 0.7 ? 0 : (p - 0.7) / 0.3;
    dexStream(DEX_ANT_X + 12, DEX_MID_Y, end, DEX_MID_Y, f0, f1);
    if (f1 >= 1 && p < 0.95) dexBeam(end, DEX_MID_Y, DEX_PIC + 10, DEX_MID_Y, 8, 230);
  },
  sprinkler: g => {
    const p = dexPhase(g);
    const end = 72;
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    const f1 = Math.min(1, p / 0.25);
    dexStream(DEX_ANT_X + 12, DEX_MID_Y, end, DEX_MID_Y, 0, f1);
    if (f1 >= 1) {
      for (let k = 0; k < 6; k++) {
        const age = ((g.t + k * 13) % 40) / 40;
        const a = (k / 5 - 0.5) * 1.0;
        const d = age * age * 90;
        push();
        noStroke();
        fill(110, 220, 40, 230);
        ellipse(end + Math.cos(a) * d, DEX_MID_Y + Math.sin(a) * d, 5, 5);
        pop();
      }
    }
  },
  clusterBomb: g => {
    const p = dexPhase(g, 170);
    dexAnt(DEX_ANT_X, DEX_MID_Y);
    const splitAt = 0.2, sx = 46;
    if (p < splitAt) {
      dexBullet(lerp(DEX_ANT_X + 10, sx, p / splitAt), DEX_MID_Y, { aura: 'split', size: 1.3, h: dexArcHeight(p / splitAt * 0.15, 50) });
      return;
    }
    const f = Math.min(1, (p - splitAt) / 0.7);
    if (f >= 1) return;
    for (let k = -1; k <= 1; k++) {
      const a = k * 0.5;
      const x = sx + Math.cos(a) * f * 85;
      const y = DEX_MID_Y + Math.sin(a) * f * 85;
      const h = dexArcHeight(f, 30);
      if (f < 0.5) dexBullet(x, y, { h, aura: 'split' });
      else for (let m = -1; m <= 1; m++) dexBullet(x, y + m * (f - 0.5) * 18, { h, size: 0.6 });
    }
  }
};

// Draws entry's picture in the box (x, y, w, h). Locked entries show a "?" instead.
function drawDexPicture(entry, x, y, w, h, alpha = 255, locked = false) {
  push();
  drawingContext.save();
  drawingContext.globalAlpha *= alpha / 255;
  drawingContext.beginPath();
  drawingContext.rect(x, y, w, h);
  drawingContext.clip();
  imageMode(CORNER);
  ellipseMode(CENTER);
  rectMode(CORNER);
  noStroke();
  if (locked) {
    fill(55);
    rect(x, y, w, h);
    fill(120);
    textAlign(CENTER, CENTER);
    textSize(h * 0.5);
    text('?', x + w / 2, y + h / 2);
  } else {
    fill(196, 108, 46); // The arena floor color (see drawBackground)
    rect(x, y, w, h);
    angleMode(DEGREES);
    translate(x, y);
    scale(w / DEX_PIC, h / DEX_PIC);
    const scene = DEX_SCENES[entry.scene];
    if (scene) scene({ t: frameCount, level: entry.level, value: entry.value, opts: entry.opts || {} });
  }
  drawingContext.restore();
  pop();
  push();
  noFill();
  stroke(0, 0, 0, 120 * alpha / 255);
  strokeWeight(2);
  rect(x, y, w, h, 6);
  pop();
}

// ========== GAMEPAD SUPPORT ==========

function updateGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  gamepad = null;
  
  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i]) {
      gamepad = gamepads[i];
      gamepadConnected = true;
      break;
    }
  }
  
  if (!gamepad) {
    gamepadConnected = false;
  }
}

// Check if left/A is pressed (keyboard A/Left or gamepad left stick left)
function isLeftPressed() {
  if (keyIsDown(65) || keyIsDown(37)) return true;
  if (gamepad && gamepad.axes[0] < -leftStickDeadzone) return true;
  return false;
}

// Check if right/D is pressed (keyboard D/Right or gamepad left stick right)
function isRightPressed() {
  if (keyIsDown(68) || keyIsDown(39)) return true;
  if (gamepad && gamepad.axes[0] > leftStickDeadzone) return true;
  return false;
}

// Check if up/W is pressed (keyboard W/Up or gamepad left stick up)
function isUpPressed() {
  if (keyIsDown(87) || keyIsDown(38)) return true;
  if (gamepad && gamepad.axes[1] < -leftStickDeadzone) return true;
  return false;
}

// Check if down/S is pressed (keyboard S/Down or gamepad left stick down)
function isDownPressed() {
  if (keyIsDown(83) || keyIsDown(40)) return true;
  if (gamepad && gamepad.axes[1] > leftStickDeadzone) return true;
  return false;
}

// Check if space/shoot is pressed (keyboard Space, left mouse button, or gamepad right trigger)
function isShootPressed() {
  if (keyIsDown(32)) return true;
  if (mouseIsPressed && mouseButton === LEFT) return true;
  if (gamepad && gamepad.buttons[7] && gamepad.buttons[7].pressed) return true; // Right trigger (R2/RT)
  return false;
}

// Get gamepad left stick X axis value (returns -1 to 1, accounting for deadzone)
function getGamepadLeftStickX() {
  if (!gamepad || !gamepad.axes[0]) return 0;
  let value = gamepad.axes[0];
  // Apply deadzone
  if (Math.abs(value) < leftStickDeadzone) return 0;
  // Rescale to make deadzone edge = 0, full tilt = 1 or -1
  if (value > 0) {
    return (value - leftStickDeadzone) / (1 - leftStickDeadzone);
  } else {
    return (value + leftStickDeadzone) / (1 - leftStickDeadzone);
  }
}

// Get gamepad left stick Y axis value (returns -1 to 1, accounting for deadzone)
function getGamepadLeftStickY() {
  if (!gamepad || !gamepad.axes[1]) return 0;
  let value = gamepad.axes[1];
  // Apply deadzone
  if (Math.abs(value) < leftStickDeadzone) return 0;
  // Rescale to make deadzone edge = 0, full tilt = 1 or -1
  if (value > 0) {
    return (value - leftStickDeadzone) / (1 - leftStickDeadzone);
  } else {
    return (value + leftStickDeadzone) / (1 - leftStickDeadzone);
  }
}

// Get right stick X axis for aiming (axes[2])
function getRightStickX() {
  if (!gamepad || !gamepad.axes[2]) return 0;
  let value = gamepad.axes[2];
  if (Math.abs(value) < rightStickDeadzone) return 0;
  return value;
}

// Get right stick Y axis for aiming (axes[3])
function getRightStickY() {
  if (!gamepad || !gamepad.axes[3]) return 0;
  let value = gamepad.axes[3];
  if (Math.abs(value) < rightStickDeadzone) return 0;
  return value;
}

// Update aiming based on mouse or right stick
function updateFreeAim() {
  if (!freeAimEnabled || end) {
    isAiming = false;
    return;
  }
  
  let rightStickX = getRightStickX();
  let rightStickY = getRightStickY();
  
  // Get current gameplay mouse positions
  let currentGameplayMouseX = getGameplayMouseX();
  let currentGameplayMouseY = getGameplayMouseY();
  
  // Check right stick first (controller has priority)
  if (Math.abs(rightStickX) > 0 || Math.abs(rightStickY) > 0) {
    isAiming = true;
    lastAimInputTime = frameCount;
    // Calculate angle from right stick using atan2
    // Since angleMode is DEGREES globally, atan2 returns degrees
    aimAngle = atan2(rightStickY, rightStickX);
    playerRotationValue = aimAngle;  // Already in degrees from atan2
  }
  // For mouse aiming, only update when mouse actually moves
  else if (currentGameplayMouseX !== prevGameplayMouseX || currentGameplayMouseY !== prevGameplayMouseY) {
    // Calculate angle from player to mouse like ants do
    // Since angleMode is DEGREES globally, atan2 returns degrees
    aimAngle = atan2(currentGameplayMouseY - playerY, currentGameplayMouseX - playerX);
    playerRotationValue = aimAngle;  // Already in degrees from atan2
    isAiming = true;
    lastAimInputTime = frameCount;
  }
  // If no recent aiming input, deactivate aiming mode to allow movement-based rotation
  else if (frameCount - lastAimInputTime > aimInputTimeout) {
    isAiming = false;
  }
  
  // Update previous mouse position for next frame
  prevGameplayMouseX = currentGameplayMouseX;
  prevGameplayMouseY = currentGameplayMouseY;
}

// Check if enter/confirm is pressed (keyboard Enter or gamepad A button)
// Returns true only on NEW press, not when held down
function isConfirmPressed() {
  let currentlyPressed = false;
  if (keyIsDown(13)) currentlyPressed = true;
  if (gamepad && gamepad.buttons[0] && gamepad.buttons[0].pressed) currentlyPressed = true; // A button (Xbox) / Cross (PS)
  
  // Only return true if currently pressed AND was not pressed last frame
  let result = currentlyPressed && !previousConfirmPressed;
  previousConfirmPressed = currentlyPressed;
  return result;
}

// Check if escape/back is pressed (keyboard Esc or gamepad B button)
function isBackPressed() {
  if (keyIsDown(27)) return true;
  if (gamepad && gamepad.buttons[1] && gamepad.buttons[1].pressed) return true; // B button (Xbox) / Circle (PS)
  return false;
}

// Check if shift/dash is pressed (keyboard Shift or gamepad left stick click)
function isDashPressed() {
  if (keyIsDown(16)) return true;
  if (gamepad && gamepad.buttons[10] && gamepad.buttons[10].pressed) return true; // L3 (left stick click)
  return false;
}

function isWindAttackPressed() {
  if (keyIsDown(69)) return true; // E key
  if (gamepad && gamepad.buttons[5] && gamepad.buttons[5].pressed) return true; // Right bumper (RB)
  return false;
}

// Shockwave variant switch: R or gamepad left bumper (LB/L1)
function isShockwaveVariantPressed() {
  if (keyIsDown(82)) return true; // R key
  if (gamepad && gamepad.buttons[4] && gamepad.buttons[4].pressed) return true; // Left bumper (LB)
  return false;
}

// Shot mode switch: Q, right mouse button, or gamepad left trigger (L2/LT)
function isShotModePressed() {
  if (keyIsDown(81)) return true; // Q key
  if (mouseIsPressed && mouseButton === RIGHT) return true;
  if (gamepad && gamepad.buttons[6] && gamepad.buttons[6].pressed) return true; // Left trigger (L2/LT)
  return false;
}

// Get left stick X axis value (-1 to 1)
function getLeftStickX() {
  if (!gamepad) return 0;
  const value = gamepad.axes[0];
  return Math.abs(value) < leftStickDeadzone ? 0 : value;
}

// Get left stick Y axis value (-1 to 1)
function getLeftStickY() {
  if (!gamepad) return 0;
  const value = gamepad.axes[1];
  return Math.abs(value) < leftStickDeadzone ? 0 : value;
}

// ========== MULTIPLAYER FUNCTIONS ==========

function savePlayerState(playerIndex) {
  if (!multiplayerMode || !players[playerIndex]) return;
  
  let p = players[playerIndex];
  
  // Save the current round score
  p.roundScore = score;
  
  // Save upgrade levels
  p.upgrade1 = upgrade1Level;
  p.upgrade2 = upgrade2Level;
  p.upgrade3 = upgrade3Level;
  p.upgrade4 = upgrade4Level;
  p.upgrade5 = upgrade5Level;
  p.upgrade6 = upgrade6Level;
  p.upgrade7 = upgrade7Level;
  p.upgrade8 = upgrade8Level;
  p.upgrade9 = upgrade9Level;
  p.upgrade10 = upgrade10Level;
  p.upgrade11 = upgrade11Level;
  p.upgrade12 = upgrade12Level;
  p.upgrade13 = upgrade13Level;
  p.upgrade14 = upgrade14Level;
  p.upgrade15 = upgrade15Level;
  p.upgrade16 = upgrade16Level;
  p.upgrade17 = upgrade17Level;
  p.upgrade18 = upgrade18Level;
  p.upgrade19 = upgrade19Level;
  p.upgrade20 = upgrade20Level;
  p.upgrade21 = upgrade21Level;
  p.upgrade22 = upgrade22Level;
  p.upgrade23 = upgrade23Level;
  p.upgrade24 = upgrade24Level;
  p.upgrade25 = upgrade25Level;
  p.upgrade26 = upgrade26Level;
  p.upgrade27 = upgrade27Level;
  p.upgrade28 = upgrade28Level;
  p.upgrade29 = upgrade29Level;
  p.upgrade30 = upgrade30Level;
  p.upgrade31 = upgrade31Level;
  p.upgrade32 = upgrade32Level;
  p.upgrade33 = upgrade33Level;
  p.upgrade34 = upgrade34Level;
  p.upgrade35 = upgrade35Level;
  p.upgrade36 = upgrade36Level;
  p.upgrade37 = upgrade37Level;
  p.upgrade38 = upgrade38Level;
  p.upgrade39 = upgrade39Level;
  p.upgrade40 = upgrade40Level;
  p.upgrade41 = upgrade41Level;
  p.upgrade42 = upgrade42Level;
  p.upgrade43 = upgrade43Level;
  p.upgrade44 = upgrade44Level;
  p.upgrade45 = upgrade45Level;
  p.upgrade46 = upgrade46Level;
  p.upgrade47 = upgrade47Level;
  p.upgrade48 = upgrade48Level;
  p.upgrade49 = upgrade49Level;
  p.upgrade50 = upgrade50Level;
  p.upgrade51 = upgrade51Level;
  p.upgrade52 = upgrade52Level;
  p.upgrade53 = upgrade53Level;
  p.upgrade54 = upgrade54Level;
  p.upgradeRerolls = upgradeRerolls;
  
  // Save experience
  p.expLevel = expLevel;
  p.expProgress = expProgress;
  p.expRequired = expRequired;
  
  // Save stats
  p.movementSpeed = movementSpeed;
  p.dashSpeedStat = dashSpeedStat;
  p.dashCooldownStat = dashCooldownStat;
  p.windCooldownStat = windCooldownStat;
  p.shieldQuantity = shieldQuantity;
  p.bulletQuantity = bulletQuantity;
  p.shieldRegenerationRate = shieldRegenerationRate;
  p.bulletReloadRate = bulletReloadRate;
  p.playerBulletSpeed = playerBulletSpeed;
}

function loadPlayerState(playerIndex) {
  if (!multiplayerMode || !players[playerIndex]) return;
  
  let p = players[playerIndex];
  
  // Load upgrade levels
  upgrade1Level = p.upgrade1;
  upgrade2Level = p.upgrade2;
  upgrade3Level = p.upgrade3;
  upgrade4Level = p.upgrade4;
  upgrade5Level = p.upgrade5;
  upgrade6Level = p.upgrade6;
  upgrade7Level = p.upgrade7;
  upgrade8Level = p.upgrade8;
  upgrade9Level = p.upgrade9;
  upgrade10Level = p.upgrade10 || 0;  // Default to 0 if not saved yet
  upgrade11Level = p.upgrade11 || 0;  // Default to 0 if not saved yet
  upgrade12Level = p.upgrade12 || 0;  // Default to 0 if not saved yet
  upgrade13Level = p.upgrade13 || 0;  // Default to 0 if not saved yet
  upgrade14Level = p.upgrade14 || 0;  // Default to 0 if not saved yet
  upgrade15Level = p.upgrade15 || 0;  // Default to 0 if not saved yet
  upgrade16Level = p.upgrade16 || 0;  // Default to 0 if not saved yet
  upgrade17Level = p.upgrade17 || 0;  // Default to 0 if not saved yet
  upgrade18Level = p.upgrade18 || 0;  // Default to 0 if not saved yet
  upgrade19Level = p.upgrade19 || 0;  // Default to 0 if not saved yet
  upgrade20Level = p.upgrade20 || 0;  // Default to 0 if not saved yet
  upgrade21Level = p.upgrade21 || 0;
  upgrade22Level = p.upgrade22 || 0;
  upgrade23Level = p.upgrade23 || 0;
  upgrade24Level = p.upgrade24 || 0;
  upgrade25Level = p.upgrade25 || 0;
  upgrade26Level = p.upgrade26 || 0;
  upgrade27Level = p.upgrade27 || 0;
  upgrade28Level = p.upgrade28 || 0;
  upgrade29Level = p.upgrade29 || 0;
  upgrade30Level = p.upgrade30 || 0;
  upgrade31Level = p.upgrade31 || 0;
  upgrade32Level = p.upgrade32 || 0;
  upgrade33Level = p.upgrade33 || 0;
  upgrade34Level = p.upgrade34 || 0;
  upgrade35Level = p.upgrade35 || 0;
  upgrade36Level = p.upgrade36 || 0;
  upgrade37Level = p.upgrade37 || 0;
  upgrade38Level = p.upgrade38 || 0;
  upgrade39Level = p.upgrade39 || 0;
  upgrade40Level = p.upgrade40 || 0;
  upgrade41Level = p.upgrade41 || 0;
  upgrade42Level = p.upgrade42 || 0;
  upgrade43Level = p.upgrade43 || 0;
  upgrade44Level = p.upgrade44 || 0;
  upgrade45Level = p.upgrade45 || 0;
  upgrade46Level = p.upgrade46 || 0;
  upgrade47Level = p.upgrade47 || 0;
  upgrade48Level = p.upgrade48 || 0;
  upgrade49Level = p.upgrade49 || 0;
  upgrade50Level = p.upgrade50 || 0;
  upgrade51Level = p.upgrade51 || 0;
  upgrade52Level = p.upgrade52 || 0;
  upgrade53Level = p.upgrade53 || 0;
  upgrade54Level = p.upgrade54 || 0;
  upgradeRerolls = p.upgradeRerolls !== undefined ? p.upgradeRerolls : UPGRADE_REROLLS_PER_RUN;
  resetShotMode(); // Each player's turn starts on the default shot
  resetShockwaveVariant(); // ...and the original shockwave, with nothing left over from the last player
  clearShockwaveVariantEffects();
  resetAphids(); // ...with no aphids or aphid effects left over from the last player

  // Load experience
  expLevel = p.expLevel;
  expProgress = p.expProgress;
  expRequired = p.expRequired;
  
  // Load stats
  movementSpeed = p.movementSpeed;
  dashSpeedStat = p.dashSpeedStat;
  dashCooldownStat = p.dashCooldownStat;
  windCooldownStat = p.windCooldownStat || 2.25;
  shieldQuantity = p.shieldQuantity;
  bulletQuantity = p.bulletQuantity;
  shieldRegenerationRate = p.shieldRegenerationRate;
  bulletReloadRate = p.bulletReloadRate;
  playerBulletSpeed = p.playerBulletSpeed;
  
  // Set current shield and bullets to full based on this player's upgrade levels
  shield = shieldQuantity > 0 ? shieldQuantity : 0;
  shot = bulletQuantity > 0 ? bulletQuantity : 0;
  
  // Update upgrade booleans based on loaded levels
  updateUpgradeBooleans();
}

function initializeMultiplayer() {
  players = [];
  currentPlayerIndex = 0;
  
  // Player controls mapping
  // Player 1: WASD + Space + Shift
  // Player 2: Arrow Keys + Numpad0 + RightShift  
  // Player 3-6: Gamepad
  
  const playerStartPositions = [
    {x: getGameplayWidth() * 0.25, y: getGameplayHeight() * 0.5},
    {x: getGameplayWidth() * 0.75, y: getGameplayHeight() * 0.5},
    {x: getGameplayWidth() * 0.5, y: getGameplayHeight() * 0.3},
    {x: getGameplayWidth() * 0.5, y: getGameplayHeight() * 0.7},
    {x: getGameplayWidth() * 0.3, y: getGameplayHeight() * 0.7},
    {x: getGameplayWidth() * 0.7, y: getGameplayHeight() * 0.3}
  ];
  
  for (let i = 0; i < numPlayers; i++) {
    players.push({
      id: i,
      x: playerStartPositions[i].x,
      y: playerStartPositions[i].y,
      rotation: 0,
      speed: BASE_PLAYER_SPEED,
      health: health,
      shield: 0,
      bullets: 5,
      shotBreak: 0,
      dash: false,
      dashReady: true,
      dashCooldown: 0,
      playerBullets: [],
      score: 0,
      totalScore: 0,
      roundScore: 0,
      alive: true,
      hasPlayedRound: false,
      scoredDeath: false,
      color: playerColors[i],
      // Individual upgrades
      upgrade1: 0, // Walking speed
      upgrade2: 0, // Dash speed
      upgrade3: 0, // Dash cooldown
      upgrade4: 0, // Shield
      upgrade5: 0, // Bullets
      upgrade6: 0, // Shield regen
      upgrade7: 0, // Bullet reload
      upgrade8: 0, // Bullet speed
      upgrade9: 0, // Free-angle aiming
      upgrade10: 0, // Tiger Beetle
      upgrade11: 0, // Oogpister Beetle
      upgrade12: 0, // Horns
      upgrade13: 0, // Potent Acid
      // Experience and stats
      expLevel: 1,
      expProgress: 0,
      expRequired: 500,
      movementSpeed: 3,
      dashSpeedStat: 2,
      dashCooldownStat: 3,
      shieldQuantity: 0,
      bulletQuantity: 0,
      shieldRegenerationRate: 600,
      bulletReloadRate: 180,
      playerBulletSpeed: 1
    });
  }
  
  // Show first player's turn screen
  showPlayerTurnScreen = true;
}

function checkMultiplayerWinCondition() {
  let alivePlayers = players.filter(p => p.alive);
  
  if (alivePlayers.length === 1) {
    multiplayerWinner = alivePlayers[0].id;
    end = true;
    gameOverMenu = false;
    return true;
  }
  
  if (alivePlayers.length === 0) {
    multiplayerWinner = -1; // Draw
    end = true;
    gameOverMenu = false;
    return true;
  }
  
  return false;
}

function advanceToNextPlayer() {
  // Find next alive player
  let origIndex = currentPlayerIndex;
  let attempts = 0;
  
  do {
    currentPlayerIndex = (currentPlayerIndex + 1) % numPlayers;
    attempts++;
    if (attempts > numPlayers) {
      // Safety break - shouldn't happen but prevents infinite loop
      break;
    }
  } while (!players[currentPlayerIndex].alive);
  // Clear any land mines when advancing to the next player's turn
  landMines.length = 0;
  
  // Reset game state for next player's turn (same round)
  end = false;
  levelEnd = 0;
  score = 0;
  health = getStartingHealth();
  
  // Reset player position and state
  centerPlayer();
  playerRotationValue = 0;
  
  // Reset shields and bullets based on upgrades
  shield = shieldQuantity > 0 ? shieldQuantity : 0;
  shot = bulletQuantity > 0 ? bulletQuantity : 0;
  dashCoolDown = 0;
  playerSpeed = movementSpeed / enemyCount;
  
  // Reset all enemies to starting positions
  for (let i = 1; i <= enemyCount; i++) {
    antX[i] = random(0, getGameplayWidth());
    antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
    antHealth[i] = antMaxHealth[i];  // Reset health
    antKnockedBack[i] = false;
    antKnockbackTimer[i] = 0;
    strikeX[i] = 0;
    strikeY[i] = 0;
    strikeTime1[i] = 0;
    drawStrike1[i] = 1;
    bulletShot[i] = 0;
    enemyBullets[i] = [];
  }
  
  // Show turn screen for next player
  showPlayerTurnScreen = true;
  
  // Play title music during turn screen
  gamemusic.stop();
  endmusic.stop();
  if (!titlemusic.isPlaying()) {
    titlemusic.play();
  }
}

function advanceToNextAlivePlayer() {
  // Save current player's state before switching
  savePlayerState(currentPlayerIndex);
  
  // Find next alive player who hasn't played this round yet
  let attempts = 0;
  
  do {
    currentPlayerIndex = (currentPlayerIndex + 1) % numPlayers;
    attempts++;
    if (attempts > numPlayers) {
      // Safety break
      break;
    }
  } while (!players[currentPlayerIndex].alive || players[currentPlayerIndex].hasPlayedRound);
  // Clear any land mines when advancing to the next alive player's turn
  landMines.length = 0;
  
  // Reset game state for next player's turn (same round)
  end = false;
  levelEnd = 0;
  score = 0;
  health = getStartingHealth();
  
  // Load next player's state
  loadPlayerState(currentPlayerIndex);
  
  // Reset upgrade menu state
  upgradeAvailable = false;
  upgradeMenuActive = false;
  upgradeEnterPressed = false;
  selectedUpgrade = 0;
  displayedUpgrades = [];
  
  // Reset time based on level
  if (level <= 3) {
    timeCount = 10; 
  } else if (level <= 7) {
    timeCount = 30; 
  } else {
    timeCount = 60; 
  }
  
  // Reset player position and state
  centerPlayer();
  playerRotationValue = 0;
  
  // Reset shields and bullets based on upgrades
  shield = shieldQuantity > 0 ? shieldQuantity : 0;
  shot = bulletQuantity > 0 ? bulletQuantity : 0;
  dashCoolDown = 0;
  playerSpeed = movementSpeed / enemyCount;
  
  // Reset all enemies to starting positions AND lives for this player's turn
  for (let i = 1; i <= enemyCount; i++) {
    antX[i] = random(0, getGameplayWidth());
    antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
    antHealth[i] = antMaxHealth[i];  // Reset health
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
    antLives[i] = 1; // Each player gets fresh ants
  }
  
  // Show turn screen for next player
  showPlayerTurnScreen = true;
  
  // Play title music during turn screen
  gamemusic.stop();
  endmusic.stop();
  if (!titlemusic.isPlaying()) {
    titlemusic.play();
  }
}

function drawMultiplayerScoreboard() {
  beginMenuScaling();
    rectMode(CORNER);
    fill(20);
    rect(0, 0, getMenuWidth(), getMenuHeight());
    
    fill(255);
    textAlign(CENTER);
    textSize(50);
    text("Round " + level + " Complete", getMenuWidth() / 2, 80);
    
    // Sort players by total score
    let sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);
    
    textSize(30);
    text("Scoreboard - Ranked by Total Score", getMenuWidth() / 2, 150);
    
    let startY = 220;
    let rowHeight = 80;
    
    for (let i = 0; i < sortedPlayers.length; i++) {
      let p = sortedPlayers[i];
      let y = startY + i * rowHeight;
      
      // Rank number
      fill(255, 215, 0); // Gold color
      textAlign(CENTER);
      textSize(32);
      text("#" + (i + 1), getMenuWidth() * 0.15, y + 5);
      
      // Player color box
      push();
        rectMode(CENTER);
        fill(p.color[0], p.color[1], p.color[2]);
        if (!p.alive) {
          fill(100); // Gray out dead players
        }
        rect(getMenuWidth() * 0.25, y, 40, 40, 8);
      pop();
      
      // Player number and status
      fill(255);
      textAlign(LEFT);
      textSize(24);
      let status = p.alive ? "" : " (OUT)";
      text("Player " + (p.id + 1) + status, getMenuWidth() * 0.3, y - 10);
      
      // Stats - smaller text for details
      textSize(18);
      fill(200, 200, 255);
      text("Total: " + Math.round(p.totalScore), getMenuWidth() * 0.3, y + 12);
      text("Round: " + Math.round(p.roundScore), getMenuWidth() * 0.3, y + 30);
      
      // EXP Level on the right
      textAlign(RIGHT);
      fill(255, 255, 100);
      textSize(22);
      text("EXP Lv. " + p.expLevel, getMenuWidth() * 0.8, y + 5);
    }
    
    // Instructions
    let fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
    fill(200, fadeAlpha);
    textSize(18);
    textAlign(CENTER);
    
    let alivePlayers = players.filter(p => p.alive);
    if (alivePlayers.length > 1) {
      text('Enter or A  Continue to Next Round', getMenuWidth() / 2, getMenuHeight() - 60);
      
      if (isConfirmPressed() && menuNavigationCooldown === 0) {
        // Stop end music, title music will start when turn screen shows
        endmusic.stop();
        landMines.length = 0;
        nextRound();
        menuNavigationCooldown = 20;
      }
    } else {
      // Game over
      fill(255, 255, 100);
      textSize(50);
      if (multiplayerWinner >= 0) {
        push();
          fill(players[multiplayerWinner].color[0], 
               players[multiplayerWinner].color[1], 
               players[multiplayerWinner].color[2]);
          text("Player " + (multiplayerWinner + 1) + " Wins!", getMenuWidth() / 2, getMenuHeight() - 150);
        pop();
      } else {
        text("Draw!", getMenuWidth() / 2, getMenuHeight() - 150);
      }
      
      fill(200, fadeAlpha);
      textSize(18);
      text('Enter or A  Return to Main Menu', getMenuWidth() / 2, getMenuHeight() - 60);
      
      if (isConfirmPressed() && menuNavigationCooldown === 0) {
        // Update high score with winner's score before returning to menu
        if (multiplayerWinner >= 0 && players[multiplayerWinner].totalScore > highScore) {
          highScore = players[multiplayerWinner].totalScore;
          storeItem('newHighScore', highScore);
        }
        
        returnToMainMenu();
        multiplayerScoreboard = false;
        multiplayerMode = false;
        multiplayerWinner = -1;
        currentPlayerIndex = 0;
        players = [];
        menuNavigationCooldown = 20;
      }
    }
  endMenuScaling();
}

function drawPlayerTurnScreen() {
  beginMenuScaling();
    rectMode(CORNER);
    fill(20);
    rect(0, 0, getMenuWidth(), getMenuHeight());
    
    let currentPlayer = players[currentPlayerIndex];
    
    // Player color box
    push();
      rectMode(CENTER);
      fill(currentPlayer.color[0], currentPlayer.color[1], currentPlayer.color[2]);
      rect(getMenuWidth() / 2, getMenuHeight() * 0.35, 150, 150, 20);
    pop();
    
    // Title
    fill(255);
    textAlign(CENTER);
    textSize(60);
    text("Player " + (currentPlayerIndex + 1) + "'s Turn", getMenuWidth() / 2, getMenuHeight() * 0.55);
    
    textSize(30);
    text("Round " + level, getMenuWidth() / 2, getMenuHeight() * 0.63);
    
    // Instructions
    let fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
    fill(200, fadeAlpha);
    textSize(24);
    text('Press Enter or A to Begin', getMenuWidth() / 2, getMenuHeight() * 0.75);
    
    if (isConfirmPressed() && menuNavigationCooldown === 0) {
      showPlayerTurnScreen = false;
      loadPlayerState(currentPlayerIndex);
      health = getStartingHealth(); // With this player's Starting Health
      startRoundIntro();
      menuNavigationCooldown = 20;
      
      // Start game music when player begins their turn
      titlemusic.stop();
      endmusic.stop();
      if (!gamemusic.isPlaying()) {
        gamemusic.play();
      }
    }
  endMenuScaling();
}

// Draw Ants Tab in Developer Tools
function drawAntsTab(fadeAlpha) {
  // Define all ant genetic stats with their ranges
  let antStatDefinitions = [
    { name: 'Bullet Speed', key: 'bulletSpeed', min: 60, max: 300, step: 1 },
    { name: 'Bullet Cooldown', key: 'bulletCooldown', min: 79, max: 200, step: 1, integer: true },
    { name: 'Ant Speed', key: 'antSpeed', min: 0.9, max: 3.5, step: 0.01,
      help: 'Max = 4.5 - Ant Size (small=fast, large=slow)' },
    { name: 'Shot Offset X', key: 'shotOffsetX', min: -500, max: 500, step: 1 },
    { name: 'Shot Offset Y', key: 'shotOffsetY', min: -500, max: 500, step: 1 },
    { name: 'Standing Point X', key: 'standingPointX', min: 0, max: 1280, step: 1 },
    { name: 'Standing Point Y', key: 'standingPointY', min: 0, max: 652, step: 1 },
    { name: 'Follow Value', key: 'followValue', min: -0.5, max: 3.49, step: 0.01, 
      help: '0=Beetle, 1=Ant, 2=Location, 3=Still' },
    { name: 'Autonomy', key: 'autonomy', min: -0.5, max: 1.5, step: 0.01,
      help: '0=FollowTarget, 1=KeepDistance' },
    { name: 'Distance From Anchor', key: 'distanceFromAnchor', min: 0.1, max: 1000, step: 1 },
    { name: 'Anchor Offset X', key: 'anchorOffsetX', min: -500, max: 500, step: 1,
      help: 'KeepDistance: shifts the anchor target on X' },
    { name: 'Anchor Offset Y', key: 'anchorOffsetY', min: -500, max: 500, step: 1,
      help: 'KeepDistance: shifts the anchor target on Y' },
    { name: 'Gene Tokens Available', key: 'geneTokens', min: 0, max: 99, step: 1, integer: true,
      help: 'Unspent token count for this ant' },
    
    // Special category (mutation-based)
    { name: '── SPECIAL CATEGORY ──', key: null, min: 0, max: 0, step: 0 }, // Header
    { name: 'Special: Explosion', key: 'specialExplosion', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for explosions (0-2, <1=timed, >=1=proximity)' },
    { name: 'Special: Knockback', key: 'specialKnockback', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for knockback bullets (0-2, <1=knockback, >=1=vacuum)' },
    { name: 'Special Potential', key: 'specialPotential', min: 0, max: 1, step: 0.01,
      help: 'If >0.5, use highest special trait; else none' },
    { name: 'Knockback Multiplier', key: 'bulletKnockbackMultiplier', min: 2, max: 5, step: 0.1,
      help: 'Multiplies knockback strength (2-5)' },
    { name: 'Special: Camouflage', key: 'specialCamo', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for hidden bullets (0-2, <1=camouflage, >=1=ghost)' },
    { name: 'Camo Flash Rate', key: 'bulletCamoFlashRate', min: 0.25, max: 3, step: 0.05,
      help: 'Camouflage opacity flashes per second (0.25-3, lower = better)' },
    { name: 'Special: Recoil', key: 'specialRecoil', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for firing recoil (0-2, <1=recoil, >=1=launch)' },
    
    // Fire category (mutation-based)
    { name: '── FIRE CATEGORY ──', key: null, min: 0, max: 0, step: 0 }, // Header
    { name: 'Fire: Burst', key: 'fireBurst', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for burst fire (0-2, <1=burst, >=1=delayed burst)' },
    { name: 'Fire: Rapid', key: 'fireRapid', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for rapid fire (0-2, <1=rapid, >=1=stream)' },
    { name: 'Fire: Alternating', key: 'fireAlternating', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for fire cooldown (0-2, <1=alternating, >=1=hit reload)' },
    { name: 'Fire Potential', key: 'firePotential', min: 0, max: 1, step: 0.01,
      help: 'If >0.5, use highest fire trait; else normal' },
    { name: 'Bullet Burst Count', key: 'bulletBurstCount', min: 1.5, max: 5.5, step: 0.01,
      help: 'Number of bullets in burst/rapid (2-5)' },
    { name: 'Bullet Burst Spread', key: 'bulletBurstSpread', min: 1.047, max: 3.14, step: 0.01,
      help: 'Spread angle 60-180° (π/3 to π radians)' },
    { name: 'Bullet Burst Delay', key: 'bulletBurstDelay', min: 10, max: 60, step: 1, integer: true,
      help: 'Frames before a delayed burst bullet splits (10-60)' },
    { name: 'Cooldown Multiplier', key: 'bulletCooldownMultiplier', min: 0.5, max: 5.5, step: 0.1,
      help: 'Alternating cooldown multiplier (1-5)' },
    { name: 'Fire: Alarm', key: 'fireAlarm', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for alarm fire (0-2, <1=alarm, >=1=avenge)' },
    { name: 'Alarm Inner Radius', key: 'alarmInnerRadius', min: 25, max: 100, step: 1,
      help: 'Alarm: 2x fire rate inside this radius; outer (1.5x) radius goes 300px -> 100px as it grows' },
    
    // Death category (mutation-based)
    { name: '── DEATH CATEGORY ──', key: null, min: 0, max: 0, step: 0 }, // Header
    { name: 'Death: Landmine', key: 'deathLandmine', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for bullet death (0-2, <1=smear, >=1=landmine)' },
    { name: 'Death: Refire', key: 'deathRefire', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for bullet death (0-2, <1=refire, >=1=turret)' },
    { name: 'Death: Territory', key: 'deathTerritory', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for bullet death (0-2, <1=territory, >=1=nest)' },
    { name: 'Death: Mound', key: 'deathMound', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for bullet death (0-2, <1=mound, >=1=bunker)' },
    { name: 'Bunker Range', key: 'bunkerRange', min: 1, max: 70, step: 1,
      help: 'How close (px) to a bunker edge this ant must be to hide in it' },
    { name: 'Death Potential', key: 'deathPotential', min: 0, max: 1, step: 0.01,
      help: 'If >0.5, use highest death trait; else fading' },
    
    // Path category (mutation-based)
    { name: '── PATH CATEGORY ──', key: null, min: 0, max: 0, step: 0 }, // Header
    { name: 'Path: High Arc', key: 'pathHighArc', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for high arc path (0-2, <1=high arc, >=1=split arc)' },
    { name: 'Path: Curve', key: 'pathCurve', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for curved/homing path (0-2, <1=curved, >=1=homing)' },
    { name: 'Path: Accelerate', key: 'pathAccelerate', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for accelerating bullets (0-2, <1=accelerate, >=1=beam)' },
    { name: 'Bullet Accelerate Delay', key: 'bulletAccelerateDelay', min: 30, max: 200, step: 1, integer: true,
      help: 'Frames before bullet accelerates (200=slow, 30=fast, inverse stat)' },
    { name: 'Path: Blink', key: 'pathBlink', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for blinking bullets (0-2, <1=blink, >=1=portal)' },
    { name: 'Blink Delay', key: 'blinkDelay', min: 10, max: 120, step: 1, integer: true,
      help: 'Frames after firing before a bullet blinks ahead (10-120)' },
    { name: 'Path Potential', key: 'pathPotential', min: 0, max: 1, step: 0.01,
      help: 'If >0.5, use highest path trait; else straight' },
    { name: 'Bullet Arc Duration', key: 'bulletArcDuration', min: 130, max: 600, step: 1,
      help: 'Frames in air for High Arc (130-600)' },
    { name: 'Bullet Curve Strength', key: 'bulletCurveStrength', min: -0.1, max: 0.1, step: 0.001,
      help: 'Curve tightness (+ = clockwise, - = counter-clockwise)' },
    
    { name: 'Explosion Proximity', key: 'explosionProximity', min: 0.1, max: 1000, step: 1 },
    { name: 'Angle From Spawn', key: 'angleFromSpawn', min: 0, max: 6.28, step: 0.01,
      help: 'Radians (0-2π)' },
    { name: 'Bullet Size', key: 'bulletSize', min: 1, max: 3, step: 0.01 },
    { name: 'Radius Mult', key: 'radiusMultiplier', min: 0.5, max: 3, step: 0.01 },
    { name: 'Residue Mult', key: 'residueMultiplier', min: 0.5, max: 3, step: 0.01 },
    { name: 'Bullet Explode After', key: 'bulletExplodeAfter', min: 40, max: 800, step: 1 },
    { name: 'Ant Size', key: 'antSize', min: 0.3, max: 3, step: 0.01,
      help: 'Sprite & hitbox size (mutates: Hard R2+, Medium R5+, Easy R10+)' }
  ];
  
  // Ant sub-tabs (1st, 2nd, 3rd place)
  let subTabY = 220;
  let subTabWidth = 100;
  let subTabHeight = 28;
  let subTabSpacing = 8;
  let totalSubTabWidth = 3 * subTabWidth + 2 * subTabSpacing;
  let subTabStartX = (getMenuWidth() - totalSubTabWidth) / 2;
  
  rectMode(CORNER);
  textAlign(CENTER, CENTER);
  textSize(15);
  
  let antLabels = ['1st Place', '2nd Place', '3rd Place'];
  for (let i = 0; i < 3; i++) {
    let subTabX = subTabStartX + i * (subTabWidth + subTabSpacing);
    
    if (devToolsAntTab === i) {
      fill(235);
      stroke(255);
    } else {
      fill(60);
      stroke(90);
    }
    strokeWeight(2);
    rect(subTabX, subTabY, subTabWidth, subTabHeight, 6);
    
    noStroke();
    fill(devToolsAntTab === i ? 10 : 180);
    text(antLabels[i], subTabX + subTabWidth / 2, subTabY + subTabHeight / 2);
  }
  
  // Sub-tab selection instruction
  textSize(12);
  fill(200, fadeAlpha / 2);
  text('1-3 to select ant rank', getMenuWidth() / 2, subTabY + subTabHeight + 12);
  
  // Custom ants toggle button
  let toggleY = subTabY + subTabHeight + 35;
  let toggleWidth = 350;
  let toggleHeight = 25;
  let toggleX = (getMenuWidth() - toggleWidth) / 2;
  
  rectMode(CORNER);
  if (devToolsUseCustomAnts) {
    fill(100, 255, 100);
    stroke(150, 255, 150);
  } else {
    fill(60);
    stroke(90);
  }
  strokeWeight(2);
  rect(toggleX, toggleY, toggleWidth, toggleHeight, 8);
  
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(14);
  fill(devToolsUseCustomAnts ? 10 : 180);
  text(devToolsUseCustomAnts ? '✓ Custom Ants ENABLED' : 'Custom Ants DISABLED', 
       toggleX + toggleWidth / 2, toggleY + toggleHeight / 2);
  
  textSize(10);
  fill(200, fadeAlpha);
  text('Press T to toggle', toggleX + toggleWidth / 2, toggleY + toggleHeight + 10);
  
  // Status message showing what the stats represent
  textSize(11);
  if (devToolsUseCustomAnts) {
    fill(255, 215, 0);
    text('Showing: Custom user-edited stats', toggleX + toggleWidth / 2, toggleY + toggleHeight + 23);
  } else {
    fill(100, 200, 255);
    text('Showing: Most recent winning ants (read-only)', toggleX + toggleWidth / 2, toggleY + toggleHeight + 23);
  }
  
  // Get current ant stats
  let currentAnt = customAntStats[devToolsAntTab];
  
  // Guard against undefined currentAnt
  if (!currentAnt) {
    fill(255, 0, 0);
    textSize(16);
    textAlign(CENTER, CENTER);
    text('No ant stats available', getMenuWidth() / 2, getMenuHeight() / 2);
    pop();
    return;
  }
  
  // Gene token display
  let tokenY = toggleY + toggleHeight + 42;
  textAlign(CENTER, CENTER);
  textSize(13);
  fill(150, 255, 150);
  let tokenCount = currentAnt.geneTokens || 0;
  let investmentCount = (currentAnt.geneTokenInvestments || []).length;
  let totalTokens = tokenCount + investmentCount;
  text('Gene Tokens: ' + tokenCount + ' available / ' + totalTokens + ' total', getMenuWidth() / 2, tokenY);
  
  // Show trait investments if any
  let investY = tokenY + 16;
  if (currentAnt.geneTokenInvestments && currentAnt.geneTokenInvestments.length > 0) {
    textSize(10);
    fill(200, 200, 100);
    let traitInvestments = currentAnt.geneTokenInvestments.filter(inv => inv.type === 'trait').map(inv => inv.category);
    let capInvestments = currentAnt.geneTokenInvestments.filter(inv => inv.type === 'cap').length;
    let investText = '';
    if (traitInvestments.length > 0) {
      investText += 'Traits: ' + traitInvestments.join(', ');
    }
    if (capInvestments > 0) {
      if (investText.length > 0) investText += ' | ';
      investText += 'Caps: ' + capInvestments;
    }
    text('Investments: ' + investText, getMenuWidth() / 2, investY);
  } else {
    investY -= 8; // Reduce space if no investments
  }

  let selectedStatDef = antStatDefinitions[devToolsAntStatIndex] || null;
  let selectedTraitCategory = (selectedStatDef && selectedStatDef.key) ? getTraitCategoryFromStatKey(selectedStatDef.key) : null;
  if (devToolsUseCustomAnts) {
    textAlign(CENTER, CENTER);
    textSize(10);
    if (selectedTraitCategory) {
      const hasCategoryInvestment = (currentAnt.geneTokenInvestments || []).some(
        inv => inv.type === 'trait' && inv.category === selectedTraitCategory
      );
      fill(hasCategoryInvestment ? color(120, 220, 120) : color(255, 210, 120));
      text('Set Trait Token: Enter on category stat (' + selectedTraitCategory + ')' +
           (hasCategoryInvestment ? ' [already invested]' : ''),
           getMenuWidth() / 2, investY + 14);
    } else {
      fill(170);
      text('Set Trait Token: select a Special/Fire/Death/Path stat, then press Enter',
           getMenuWidth() / 2, investY + 14);
    }
  }
  
  // Draw stat sliders
  let startY = investY + 34;
  let sliderHeight = 22;
  let sliderSpacing = 24;
  let sliderWidth = getMenuWidth() * 0.7;
  let sliderX = (getMenuWidth() - sliderWidth) / 2;
  
  // Calculate visible range (show 10 stats at a time)
  let visibleStats = 10;
  let maxScroll = Math.max(0, antStatDefinitions.length - visibleStats);
  devToolsAntScrollOffset = constrain(devToolsAntScrollOffset, 0, maxScroll);
  
  for (let i = 0; i < visibleStats && (i + devToolsAntScrollOffset) < antStatDefinitions.length; i++) {
    let statIndex = i + devToolsAntScrollOffset;
    let stat = antStatDefinitions[statIndex];
    let y = startY + i * sliderSpacing;
    
    // Check if this is a header row (null key)
    if (stat.key === null) {
      // Display header
      textAlign(CENTER, CENTER);
      textSize(13);
      fill(255, 255, 100);  // Yellow for headers
      text(stat.name, getMenuWidth() / 2, y);
      continue; // Skip the rest of the loop for headers
    }
    
    let value = currentAnt[stat.key];
    if (value === undefined) value = 0; // Fallback for missing stat
    let isSelected = devToolsAntStatIndex === statIndex;
    
    // Define stat cap tiers (used for display)
    const statCapTiers = {
      bulletSpeed: { caps: [250, 200, 150, 120, 90], inverse: true },
      bulletCooldown: { caps: [150, 120, 100, 90, 79], inverse: true },
      antSpeed: { caps: [2, 2.5, 3, 3.5], inverse: false },
      specialExplosion: { caps: [1.0, 2.0], inverse: false },
      specialCamo: { caps: [1.0, 2.0], inverse: false },
      specialRecoil: { caps: [1.0, 2.0], inverse: false },  // <1 = recoil, >=1 = launch
      bulletCamoFlashRate: { caps: [1.5, 1.0, 0.75, 0.5, 0.25], inverse: true },
bulletKnockbackMultiplier: { caps: [2, 3, 4, 5], inverse: false },
      bulletBurstCount: { caps: [3, 4, 5, 5.5], inverse: false },
      bulletBurstSpread: { caps: [2.0, 2.5, 3.0, 3.14], inverse: false },
      bulletCooldownMultiplier: { caps: [3, 4, 5, 5.5], inverse: false },
      bulletCurveStrength: { caps: [0.05, 0.075, 0.1], inverse: false },
      pathCurve: { caps: [1.0, 2.0], inverse: false },
      deathLandmine: { caps: [1.0, 2.0], inverse: false },
      deathRefire: { caps: [1.0, 2.0], inverse: false },  // <1 = refire, >=1 = turret
      fireAlternating: { caps: [1.0, 2.0], inverse: false },
      fireBurst: { caps: [1.0, 2.0], inverse: false },  // <1 = burst, >=1 = delayed burst
      fireRapid: { caps: [1.0, 2.0], inverse: false },  // <1 = rapid, >=1 = stream
      pathHighArc: { caps: [1.0, 2.0], inverse: false },  // <1 = high arc, >=1 = split arc
      pathAccelerate: { caps: [1.0, 2.0], inverse: false },  // <1 = accelerate, >=1 = beam
      specialKnockback: { caps: [1.0, 2.0], inverse: false },  // <1 = knockback, >=1 = vacuum
      fireAlarm: { caps: [1.0, 2.0], inverse: false },  // <1 = alarm, >=1 = avenge
      pathBlink: { caps: [1.0, 2.0], inverse: false },  // <1 = blink, >=1 = portal
      deathTerritory: { caps: [1.0, 2.0], inverse: false },  // <1 = territory, >=1 = nest
      deathMound: { caps: [1.0, 2.0], inverse: false },  // <1 = mound, >=1 = bunker
      bulletSize: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
      radiusMultiplier: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
      residueMultiplier: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
      antSize: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false }
    };
    
    // Count unlocked tiers for this stat
    let unlockedTiers = 0;
    if (statCapTiers[stat.key] && currentAnt.geneTokenInvestments) {
      for (let inv of currentAnt.geneTokenInvestments) {
        if (inv.target === stat.key && inv.type === 'cap') {
          unlockedTiers = Math.max(unlockedTiers, (inv.tier || 0) + 1);
        }
      }
    }
    
    // Stat name
    textAlign(LEFT, CENTER);
    textSize(12);
    fill(isSelected ? 255 : 200);
    text(stat.name + ':', sliderX, y);
    
    // Value display
    textAlign(RIGHT, CENTER);
    let displayValue = stat.integer ? Math.floor(value) : value.toFixed(2);
    text(displayValue, sliderX + sliderWidth, y);
    
    // Show cap tier information if this stat has caps and is selected
    if (statCapTiers[stat.key] && isSelected) {
      // Show cap tiers below the stat
      let tierInfo = statCapTiers[stat.key];
      let capsText = 'Caps: [';
      capsText += tierInfo.caps.map(c => c.toFixed(stat.integer ? 0 : 2)).join(', ');
      capsText += ']';
      if (tierInfo.inverse) capsText += ' (inverse)';
      capsText += ' | Unlocked: ' + unlockedTiers + '/' + tierInfo.caps.length;
      
      textAlign(CENTER, CENTER);
      textSize(9);
      fill(100, 255, 100);
      text(capsText, getMenuWidth() / 2, y + 11);
    }
    
    // Slider bar background
    let barX = sliderX + 200;
    let barWidth = sliderWidth - 280;
    let barHeight = 8;
    let barY = y - barHeight / 2;
    
    rectMode(CORNER);
    noStroke();
    fill(40);
    rect(barX, barY, barWidth, barHeight, 4);
    
    // Calculate effective max for slider
    let effectiveMax = (stat.key === 'antSpeed') ? (4.5 - currentAnt.antSize) : stat.max;
    
    // Draw cap markers on the slider if this stat has caps
    if (statCapTiers[stat.key]) {
      let tierInfo = statCapTiers[stat.key];
      
      // Draw cap markers
      for (let ti = 0; ti < tierInfo.caps.length; ti++) {
        let capValue = tierInfo.caps[ti];
        let markerRatio = (capValue - stat.min) / (effectiveMax - stat.min);
        let markerX = barX + barWidth * markerRatio;
        
        stroke(ti < unlockedTiers ? 0 : 100);
        strokeWeight(2);
        if (ti < unlockedTiers) {
          fill(100, 255, 100); // Green for unlocked
        } else {
          fill(255, 150, 0); // Orange for locked
        }
        rectMode(CENTER);
        rect(markerX, y, 3, barHeight + 4, 1);
      }
    }
    
    // Slider filled portion
    let fillRatio = (value - stat.min) / (effectiveMax - stat.min);
    rectMode(CORNER);
    noStroke();
    if (!devToolsUseCustomAnts) {
      // Read-only mode - showing actual winners with cyan/gray
      if (isSelected) {
        fill(100, 200, 255); // Light cyan for selected
      } else {
        fill(80, 120, 150); // Darker cyan for unselected
      }
    } else if (isSelected) {
      // Custom mode selected stat - yellow
      fill(255, 215, 0);
    } else {
      // Custom mode unselected stat - blue
      fill(100, 150, 255);
    }
    rect(barX, barY, barWidth * fillRatio, barHeight, 4);
    
    // Help text for special stats (shown below cap info if it exists)
    if (stat.help && isSelected) {
      textAlign(CENTER, CENTER);
      textSize(10);
      fill(180);
      // Adjust position based on whether cap info is shown
      let helpYOffset = statCapTiers[stat.key] ? 22 : 12;
      text(stat.help, getMenuWidth() / 2, y + helpYOffset);
    }
  }
  
  // Scroll indicator if needed
  if (antStatDefinitions.length > visibleStats) {
    textAlign(CENTER, CENTER);
    textSize(11);
    fill(150);
    text('↑↓ Scroll (' + (devToolsAntScrollOffset + 1) + '-' + 
         Math.min(devToolsAntScrollOffset + visibleStats, antStatDefinitions.length) + 
         ' of ' + antStatDefinitions.length + ')', 
         getMenuWidth() / 2, startY + visibleStats * sliderSpacing + 5);
  }
  
  // Handle ant sub-tab switching
  if (devToolsTabSwitchCooldown === 0) {
    if (keyIsDown(49)) {  // 1
      devToolsAntTab = 0;
      devToolsTabSwitchCooldown = 10;
    } else if (keyIsDown(50)) {  // 2
      devToolsAntTab = 1;
      devToolsTabSwitchCooldown = 10;
    } else if (keyIsDown(51)) {  // 3
      devToolsAntTab = 2;
      devToolsTabSwitchCooldown = 10;
    }
  }
  
  // Handle toggle custom ants
  if (devToolsNavigationCooldown === 0 && keyIsDown(84)) {  // T key
    devToolsUseCustomAnts = !devToolsUseCustomAnts;
    
    // If enabling custom ants and game is running, apply immediately to current ants
    if (devToolsUseCustomAnts && start && !end) {
      debugLog("Custom ants enabled - applying to current ants immediately");
      applyCustomAntsToInitialPopulation();
    }
    
    devToolsNavigationCooldown = 15;
  }
  
  // Handle stat navigation and adjustment
  if (devToolsNavigationCooldown === 0) {
    let changed = false;
    
    if (keyIsDown(87) || keyIsDown(38)) {  // W or Up - scroll/select up
      if (devToolsAntStatIndex > 0) {
        devToolsAntStatIndex--;
        // Skip header rows
        while (devToolsAntStatIndex > 0 && antStatDefinitions[devToolsAntStatIndex].key === null) {
          devToolsAntStatIndex--;
        }
        // Auto-scroll if needed
        if (devToolsAntStatIndex < devToolsAntScrollOffset) {
          devToolsAntScrollOffset = devToolsAntStatIndex;
        }
      }
      changed = true;
    } else if (keyIsDown(83) || keyIsDown(40)) {  // S or Down - scroll/select down
      if (devToolsAntStatIndex < antStatDefinitions.length - 1) {
        devToolsAntStatIndex++;
        // Skip header rows
        while (devToolsAntStatIndex < antStatDefinitions.length - 1 && 
               antStatDefinitions[devToolsAntStatIndex].key === null) {
          devToolsAntStatIndex++;
        }
        // Auto-scroll if needed
        if (devToolsAntStatIndex >= devToolsAntScrollOffset + visibleStats) {
          devToolsAntScrollOffset = devToolsAntStatIndex - visibleStats + 1;
        }
      }
      changed = true;
    } else if ((keyIsDown(65) || keyIsDown(37)) && devToolsUseCustomAnts) {  // A or Left - decrease value (only if custom mode enabled)
      let stat = antStatDefinitions[devToolsAntStatIndex];
      if (stat.key !== null) { // Only adjust non-header stats
        // Use dynamic max for ant speed based on ant size
        let effectiveMax = (stat.key === 'antSpeed') ? (4.5 - currentAnt.antSize) : stat.max;
        currentAnt[stat.key] = constrain(currentAnt[stat.key] - stat.step * 5, stat.min, effectiveMax);
        if (stat.integer) currentAnt[stat.key] = Math.floor(currentAnt[stat.key]);
        syncCustomAntCapInvestmentsForStat(currentAnt, stat.key);
      }
      changed = true;
    } else if ((keyIsDown(68) || keyIsDown(39)) && devToolsUseCustomAnts) {  // D or Right - increase value (only if custom mode enabled)
      let stat = antStatDefinitions[devToolsAntStatIndex];
      if (stat.key !== null) { // Only adjust non-header stats
        // Use dynamic max for ant speed based on ant size
        let effectiveMax = (stat.key === 'antSpeed') ? (4.5 - currentAnt.antSize) : stat.max;
        currentAnt[stat.key] = constrain(currentAnt[stat.key] + stat.step * 5, stat.min, effectiveMax);
        if (stat.integer) currentAnt[stat.key] = Math.floor(currentAnt[stat.key]);
        // If ant size changed, clamp ant speed to new max
        if (stat.key === 'antSize') {
          let maxAntSpeedDev = 4.5 - currentAnt.antSize;
          currentAnt.antSpeed = min(currentAnt.antSpeed, maxAntSpeedDev);
        }
        syncCustomAntCapInvestmentsForStat(currentAnt, stat.key);
      }
      changed = true;
    } else if (keyIsDown(13) && devToolsUseCustomAnts) {  // Enter - manually invest trait token in selected category
      let stat = antStatDefinitions[devToolsAntStatIndex];
      if (stat.key !== null) {
        let selectedCategory = getTraitCategoryFromStatKey(stat.key);
        if (selectedCategory) {
          investCustomAntTraitToken(currentAnt, selectedCategory);
        }
      }
      changed = true;
    }
    
    if (changed) {
      devToolsNavigationCooldown = 5;
    }
  }
}

// Developer Tools Screen
function drawDevTools() {
  try {
    beginMenuScaling();
    
    // Background - matching AntDex/Upgrade screen style
    fill(20);
    rectMode(CORNER);
    rect(0, 0, getMenuWidth(), getMenuHeight());
    
    // Title
    textAlign(CENTER, CENTER);
    fill(255);
    stroke(0);
    strokeWeight(4);
    textSize(56);
    text('Developer Tools', getMenuWidth() / 2, 70);
    
    // Exit instructions with fade effect
    let fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
    noStroke();
    textSize(16);
    fill(200, fadeAlpha);
    text('Shift + / + \\ to exit', getMenuWidth() / 2, 130);

    // Unlock-all-difficulties toggle (top right, works from any tab)
    let unlockW = 230;
    let unlockH = 28;
    let unlockX = getMenuWidth() - unlockW - 20;
    let unlockY = 20;
    rectMode(CORNER);
    if (devToolsUnlockAllDifficulties) {
      fill(100, 255, 100);
      stroke(150, 255, 150);
    } else {
      fill(60);
      stroke(90);
    }
    strokeWeight(2);
    rect(unlockX, unlockY, unlockW, unlockH, 8);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    fill(devToolsUnlockAllDifficulties ? 10 : 180);
    text(devToolsUnlockAllDifficulties ? '✓ All Difficulties UNLOCKED' : 'Difficulty Locks ON',
         unlockX + unlockW / 2, unlockY + unlockH / 2);
    textSize(10);
    fill(200, fadeAlpha);
    text('Press U to toggle', unlockX + unlockW / 2, unlockY + unlockH + 10);

    if (devToolsKeyCooldown === 0 && keyIsDown(85)) {  // U key
      devToolsUnlockAllDifficulties = !devToolsUnlockAllDifficulties;
      devToolsKeyCooldown = 15;
    }

    // Tab system (3 tabs)
    let tabWidth = 180;
    let tabHeight = 36;
    let tabY = 155;
    let tabSpacing = 8;
    let totalTabWidth = 3 * tabWidth + 2 * tabSpacing;
    let singleTabX = (getMenuWidth() - totalTabWidth) / 2;
    let multiTabX = singleTabX + tabWidth + tabSpacing;
    let antsTabX = multiTabX + tabWidth + tabSpacing;
    
    rectMode(CORNER);
    
    // Single Player tab
    if (devToolsTab === 'single') {
      fill(235);
      stroke(255);
    } else {
      fill(60);
      stroke(90);
    }
    strokeWeight(2);
    rect(singleTabX, tabY, tabWidth, tabHeight, 8, 8, 0, 0);
    
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16);
    fill(devToolsTab === 'single' ? 10 : 180);
    text('Single Player', singleTabX + tabWidth / 2, tabY + tabHeight / 2);
    
    // Multiplayer tab
    if (devToolsTab === 'multi') {
      fill(235);
      stroke(255);
    } else {
      fill(60);
      stroke(90);
    }
    strokeWeight(2);
    rect(multiTabX, tabY, tabWidth, tabHeight, 8, 8, 0, 0);
    
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16);
    fill(devToolsTab === 'multi' ? 10 : 180);
    text('Multiplayer', multiTabX + tabWidth / 2, tabY + tabHeight / 2);
    
    // Ants tab
    if (devToolsTab === 'ants') {
      fill(235);
      stroke(255);
    } else {
      fill(60);
      stroke(90);
    }
    strokeWeight(2);
    rect(antsTabX, tabY, tabWidth, tabHeight, 8, 8, 0, 0);
    
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16);
    fill(devToolsTab === 'ants' ? 10 : 180);
    text('Ants', antsTabX + tabWidth / 2, tabY + tabHeight / 2);
    
    // Tab switching instruction
    textSize(13);
    fill(200, fadeAlpha);
    text('Q/E/R to switch tabs', getMenuWidth() / 2, tabY + tabHeight + 12);
    
    // Handle tab switching (works from any tab)
    if (devToolsTabSwitchCooldown === 0) {
      if (keyIsDown(81)) {  // Q - switch to single player
        devToolsTab = 'single';
        devToolsScrollOffset = 0;
        devToolsTabSwitchCooldown = 10;
      } else if (keyIsDown(69)) {  // E - switch to multiplayer
        devToolsTab = 'multi';
        devToolsScrollOffset = 0;
        devToolsTabSwitchCooldown = 10;
      } else if (keyIsDown(82)) {  // R - switch to ants
        devToolsTab = 'ants';
        devToolsScrollOffset = 0;
        devToolsTabSwitchCooldown = 10;
      }
    }
    
    // Get current upgrade levels based on tab FIRST
    let currentUpgrades;
    if (devToolsTab === 'single') {
      currentUpgrades = {
        upgrade1: upgrade1Level,
        upgrade2: upgrade2Level,
        upgrade3: upgrade3Level,
        upgrade4: upgrade4Level,
        upgrade5: upgrade5Level,
        upgrade6: upgrade6Level,
        upgrade7: upgrade7Level,
        upgrade8: upgrade8Level,
        upgrade9: upgrade9Level,
        upgrade10: upgrade10Level,
        upgrade11: upgrade11Level,
        upgrade12: upgrade12Level,
        upgrade13: upgrade13Level,
        upgrade14: upgrade14Level,
        upgrade15: upgrade15Level,
        upgrade16: upgrade16Level,
        upgrade17: upgrade17Level,
        upgrade18: upgrade18Level,
        upgrade19: upgrade19Level,
        upgrade20: upgrade20Level,
        upgrade21: upgrade21Level,
        upgrade22: upgrade22Level,
        upgrade23: upgrade23Level,
        upgrade24: upgrade24Level,
        upgrade25: upgrade25Level,
        upgrade26: upgrade26Level,
        upgrade27: upgrade27Level,
        upgrade28: upgrade28Level,
        upgrade29: upgrade29Level,
        upgrade30: upgrade30Level,
        upgrade31: upgrade31Level,
        upgrade32: upgrade32Level,
        upgrade33: upgrade33Level,
        upgrade34: upgrade34Level,
        upgrade35: upgrade35Level,
        upgrade36: upgrade36Level,
        upgrade37: upgrade37Level,
        upgrade38: upgrade38Level,
        upgrade39: upgrade39Level,
        upgrade40: upgrade40Level,
        upgrade41: upgrade41Level,
        upgrade42: upgrade42Level,
        upgrade43: upgrade43Level,
        upgrade44: upgrade44Level,
        upgrade45: upgrade45Level,
        upgrade46: upgrade46Level,
        upgrade47: upgrade47Level,
        upgrade48: upgrade48Level,
        upgrade49: upgrade49Level,
        upgrade50: upgrade50Level,
        upgrade51: upgrade51Level,
        upgrade52: upgrade52Level,
        upgrade53: upgrade53Level,
        upgrade54: upgrade54Level
      };
    } else if (devToolsTab === 'multi') {
      // Multiplayer mode - get upgrades from selected player
      if (players[devToolsPlayerTab]) {
        currentUpgrades = {
          upgrade1: players[devToolsPlayerTab].upgrade1 || 0,
          upgrade2: players[devToolsPlayerTab].upgrade2 || 0,
          upgrade3: players[devToolsPlayerTab].upgrade3 || 0,
          upgrade4: players[devToolsPlayerTab].upgrade4 || 0,
          upgrade5: players[devToolsPlayerTab].upgrade5 || 0,
          upgrade6: players[devToolsPlayerTab].upgrade6 || 0,
          upgrade7: players[devToolsPlayerTab].upgrade7 || 0,
          upgrade8: players[devToolsPlayerTab].upgrade8 || 0,
          upgrade9: players[devToolsPlayerTab].upgrade9 || 0,
          upgrade10: players[devToolsPlayerTab].upgrade10 || 0,
          upgrade11: players[devToolsPlayerTab].upgrade11 || 0,
          upgrade12: players[devToolsPlayerTab].upgrade12 || 0,
          upgrade13: players[devToolsPlayerTab].upgrade13 || 0,
          upgrade14: players[devToolsPlayerTab].upgrade14 || 0,
          upgrade15: players[devToolsPlayerTab].upgrade15 || 0,
          upgrade16: players[devToolsPlayerTab].upgrade16 || 0,
          upgrade17: players[devToolsPlayerTab].upgrade17 || 0,
          upgrade18: players[devToolsPlayerTab].upgrade18 || 0,
          upgrade19: players[devToolsPlayerTab].upgrade19 || 0,
          upgrade20: players[devToolsPlayerTab].upgrade20 || 0,
          upgrade21: players[devToolsPlayerTab].upgrade21 || 0,
          upgrade22: players[devToolsPlayerTab].upgrade22 || 0,
          upgrade23: players[devToolsPlayerTab].upgrade23 || 0,
          upgrade24: players[devToolsPlayerTab].upgrade24 || 0,
          upgrade25: players[devToolsPlayerTab].upgrade25 || 0,
          upgrade26: players[devToolsPlayerTab].upgrade26 || 0,
          upgrade27: players[devToolsPlayerTab].upgrade27 || 0,
          upgrade28: players[devToolsPlayerTab].upgrade28 || 0,
          upgrade29: players[devToolsPlayerTab].upgrade29 || 0,
          upgrade30: players[devToolsPlayerTab].upgrade30 || 0,
          upgrade31: players[devToolsPlayerTab].upgrade31 || 0,
          upgrade32: players[devToolsPlayerTab].upgrade32 || 0,
          upgrade33: players[devToolsPlayerTab].upgrade33 || 0,
          upgrade34: players[devToolsPlayerTab].upgrade34 || 0,
          upgrade35: players[devToolsPlayerTab].upgrade35 || 0,
          upgrade36: players[devToolsPlayerTab].upgrade36 || 0,
          upgrade37: players[devToolsPlayerTab].upgrade37 || 0,
          upgrade38: players[devToolsPlayerTab].upgrade38 || 0,
          upgrade39: players[devToolsPlayerTab].upgrade39 || 0,
          upgrade40: players[devToolsPlayerTab].upgrade40 || 0,
          upgrade41: players[devToolsPlayerTab].upgrade41 || 0,
          upgrade42: players[devToolsPlayerTab].upgrade42 || 0,
          upgrade43: players[devToolsPlayerTab].upgrade43 || 0,
          upgrade44: players[devToolsPlayerTab].upgrade44 || 0,
          upgrade45: players[devToolsPlayerTab].upgrade45 || 0,
          upgrade46: players[devToolsPlayerTab].upgrade46 || 0,
          upgrade47: players[devToolsPlayerTab].upgrade47 || 0,
          upgrade48: players[devToolsPlayerTab].upgrade48 || 0,
          upgrade49: players[devToolsPlayerTab].upgrade49 || 0,
          upgrade50: players[devToolsPlayerTab].upgrade50 || 0,
          upgrade51: players[devToolsPlayerTab].upgrade51 || 0,
          upgrade52: players[devToolsPlayerTab].upgrade52 || 0,
          upgrade53: players[devToolsPlayerTab].upgrade53 || 0,
          upgrade54: players[devToolsPlayerTab].upgrade54 || 0
        };
      } else {
        // Player doesn't exist, show zeros
        currentUpgrades = {
          upgrade1: 0, upgrade2: 0, upgrade3: 0, upgrade4: 0, upgrade5: 0,
          upgrade6: 0, upgrade7: 0, upgrade8: 0, upgrade9: 0, upgrade10: 0,
          upgrade11: 0, upgrade12: 0, upgrade13: 0, upgrade14: 0, upgrade15: 0,
          upgrade16: 0, upgrade17: 0, upgrade18: 0, upgrade19: 0, upgrade20: 0,
          upgrade21: 0, upgrade22: 0, upgrade23: 0, upgrade24: 0, upgrade25: 0, upgrade26: 0, upgrade27: 0,
          upgrade28: 0, upgrade29: 0, upgrade30: 0, upgrade31: 0, upgrade32: 0, upgrade33: 0, upgrade34: 0, upgrade35: 0, upgrade36: 0, upgrade37: 0, upgrade38: 0, upgrade39: 0, upgrade40: 0, upgrade41: 0, upgrade42: 0, upgrade43: 0, upgrade44: 0, upgrade45: 0, upgrade46: 0, upgrade47: 0, upgrade48: 0, upgrade49: 0, upgrade50: 0, upgrade51: 0, upgrade52: 0, upgrade53: 0, upgrade54: 0
        };
      }
    }
    
    // RENDER CONTENT BASED ON TAB
    if (devToolsTab === 'single' || devToolsTab === 'multi') {
      // Define all upgrades
      let allUpgrades = [
        { name: 'Walking Speed', level: currentUpgrades.upgrade1, maxLevel: 4, id: 0 },
        { name: 'Dash Speed', level: currentUpgrades.upgrade2, maxLevel: 5, id: 1 },
        { name: 'Dash Cooldown', level: currentUpgrades.upgrade3, maxLevel: 5, id: 2 },
        { name: 'Add Shield', level: currentUpgrades.upgrade4, maxLevel: 9, id: 3 },
        { name: 'Add Bullets', level: currentUpgrades.upgrade5, maxLevel: 8, id: 4 },
        { name: 'Shield Regeneration', level: currentUpgrades.upgrade6, maxLevel: 5, id: 5 },
        { name: 'Bullet Reload', level: currentUpgrades.upgrade7, maxLevel: 5, id: 6 },
        { name: 'Bullet Speed', level: currentUpgrades.upgrade8, maxLevel: 5, id: 7 },
        { name: 'Free-Angle Aiming', level: currentUpgrades.upgrade9, maxLevel: 1, id: 8 },
        { name: 'Tiger Beetle', level: currentUpgrades.upgrade10, maxLevel: 1, id: 9 },
        { name: 'Oogpister Beetle', level: currentUpgrades.upgrade11, maxLevel: 1, id: 10 },
        { name: 'Horns', level: currentUpgrades.upgrade12, maxLevel: 4, id: 11 },
        { name: 'Potent Acid', level: currentUpgrades.upgrade13, maxLevel: 4, id: 12 },
        { name: 'Shockwave', level: currentUpgrades.upgrade14, maxLevel: 1, id: 13 },
        { name: 'Shockwave Radius', level: currentUpgrades.upgrade15, maxLevel: 5, id: 14 },
        { name: 'Shockwave Damage', level: currentUpgrades.upgrade16, maxLevel: 5, id: 15 },
        { name: 'Shockwave Cooldown', level: currentUpgrades.upgrade17, maxLevel: 5, id: 16 },
        { name: 'Shockwave Knockback', level: currentUpgrades.upgrade18, maxLevel: 3, id: 17 },
        { name: 'Bullet Deflection', level: currentUpgrades.upgrade19, maxLevel: 4, id: 18 },
        { name: 'Health Regeneration', level: currentUpgrades.upgrade20, maxLevel: 5, id: 19 },
        { name: 'Runt Hunter', level: currentUpgrades.upgrade21, maxLevel: 1, id: 20 },
        { name: 'Increased Metabolism', level: currentUpgrades.upgrade22, maxLevel: 7, id: 21 },
        { name: 'EXP Boost', level: currentUpgrades.upgrade23, maxLevel: 10, id: 22 },
        { name: 'Combo Surge', level: currentUpgrades.upgrade24, maxLevel: 4, id: 23 },
        { name: 'Dash Harvest', level: currentUpgrades.upgrade25, maxLevel: 1, id: 24 },
        { name: 'Shockwave Harvest', level: currentUpgrades.upgrade26, maxLevel: 1, id: 25 },
        { name: 'Bullet Harvest', level: currentUpgrades.upgrade27, maxLevel: 1, id: 26 },
        { name: 'Spray Acid', level: currentUpgrades.upgrade28, maxLevel: 1, id: 27 },
        { name: 'Spray Length', level: currentUpgrades.upgrade29, maxLevel: 4, id: 28 },
        { name: 'Spray Width', level: currentUpgrades.upgrade30, maxLevel: 4, id: 29 },
        { name: 'Piercing Acid', level: currentUpgrades.upgrade31, maxLevel: 1, id: 30 },
        { name: 'Piercing Depth', level: currentUpgrades.upgrade32, maxLevel: 9, id: 31 },
        { name: 'Impact Bomb', level: currentUpgrades.upgrade33, maxLevel: 1, id: 32 },
        { name: 'Timed Bomb', level: currentUpgrades.upgrade34, maxLevel: 1, id: 33 },
        { name: 'Proximity Bomb', level: currentUpgrades.upgrade35, maxLevel: 1, id: 34 },
        { name: 'Blast Radius', level: currentUpgrades.upgrade36, maxLevel: 3, id: 35 },
        { name: 'Lady Beetle', level: currentUpgrades.upgrade37, maxLevel: 1, id: 36 },
        { name: 'Aphid Health', level: currentUpgrades.upgrade38, maxLevel: 3, id: 37 },
        { name: 'Aphid Spawn Rate', level: currentUpgrades.upgrade39, maxLevel: 2, id: 38 },
        { name: 'Speedy Aphids', level: currentUpgrades.upgrade40, maxLevel: 1, id: 39 },
        { name: 'Armored Aphids', level: currentUpgrades.upgrade41, maxLevel: 1, id: 40 },
        { name: 'Wise Aphids', level: currentUpgrades.upgrade42, maxLevel: 1, id: 41 },
        { name: 'Healthy Aphids', level: currentUpgrades.upgrade43, maxLevel: 1, id: 42 },
        { name: 'Lucky Aphids', level: currentUpgrades.upgrade44, maxLevel: 1, id: 43 },
        { name: 'Mound Ring', level: currentUpgrades.upgrade45, maxLevel: 1, id: 44 },
        { name: 'Bunker', level: currentUpgrades.upgrade46, maxLevel: 1, id: 45 },
        { name: 'Vortex', level: currentUpgrades.upgrade47, maxLevel: 1, id: 46 },
        { name: 'Flight and Slam', level: currentUpgrades.upgrade48, maxLevel: 1, id: 47 },
        { name: 'Mound Health', level: currentUpgrades.upgrade49, maxLevel: 4, id: 48 },
        { name: 'Flight Duration', level: currentUpgrades.upgrade50, maxLevel: 5, id: 49 },
        { name: 'Starting Health', level: currentUpgrades.upgrade51, maxLevel: 4, id: 50 },
        { name: 'Dash Deflection', level: currentUpgrades.upgrade52, maxLevel: 1, id: 51 },
        { name: 'Shell Shrapnel', level: currentUpgrades.upgrade53, maxLevel: 1, id: 52 },
        { name: 'Shrapnel Count', level: currentUpgrades.upgrade54, maxLevel: 2, id: 53 }
      ];
    
    // Handle player sub-tab switching in multiplayer mode
    if (devToolsTab === 'multi' && devToolsTabSwitchCooldown === 0) {
      if (keyIsDown(49)) {  // 1
        devToolsPlayerTab = 0;
        devToolsTabSwitchCooldown = 10;
      } else if (keyIsDown(50)) {  // 2
        devToolsPlayerTab = 1;
        devToolsTabSwitchCooldown = 10;
      } else if (keyIsDown(51)) {  // 3
        devToolsPlayerTab = 2;
        devToolsTabSwitchCooldown = 10;
      } else if (keyIsDown(52)) {  // 4
        devToolsPlayerTab = 3;
        devToolsTabSwitchCooldown = 10;
      } else if (keyIsDown(53)) {  // 5
        devToolsPlayerTab = 4;
        devToolsTabSwitchCooldown = 10;
      } else if (keyIsDown(54)) {  // 6
        devToolsPlayerTab = 5;
        devToolsTabSwitchCooldown = 10;
      }
    }
    
    // Handle navigation (only for upgrade tabs, not ants tab)
    if ((devToolsTab === 'single' || devToolsTab === 'multi') && devToolsNavigationCooldown === 0) {
      if (keyIsDown(87) || keyIsDown(38)) {  // W or Up
        devToolsSelectedUpgrade -= 2;
        if (devToolsSelectedUpgrade < 0) devToolsSelectedUpgrade += UPGRADE_COUNT;
        if (devToolsSelectedUpgrade > UPGRADE_COUNT - 1) devToolsSelectedUpgrade = UPGRADE_COUNT - 1;
        devToolsNavigationCooldown = 10;
      } else if (keyIsDown(83) || keyIsDown(40)) {  // S or Down
        devToolsSelectedUpgrade += 2;
        if (devToolsSelectedUpgrade > UPGRADE_COUNT - 1) devToolsSelectedUpgrade -= UPGRADE_COUNT;
        if (devToolsSelectedUpgrade < 0) devToolsSelectedUpgrade = 0;
        devToolsNavigationCooldown = 10;
      } else if (keyIsDown(65) || keyIsDown(37)) {  // A or Left
        devToolsSelectedUpgrade--;
        if (devToolsSelectedUpgrade < 0) devToolsSelectedUpgrade = UPGRADE_COUNT - 1;
        devToolsNavigationCooldown = 10;
      } else if (keyIsDown(68) || keyIsDown(39)) {  // D or Right
        devToolsSelectedUpgrade++;
        if (devToolsSelectedUpgrade > UPGRADE_COUNT - 1) devToolsSelectedUpgrade = 0;
        devToolsNavigationCooldown = 10;
      } else if (keyIsDown(13)) {  // Enter
        toggleDevUpgrade(devToolsSelectedUpgrade);
        devToolsNavigationCooldown = 10;
      }
      
      // Auto-scroll to keep selected upgrade visible
      let selectedRow = floor(devToolsSelectedUpgrade / 2);
      let cardHeight = 58;
      let spacing = 61;
      let startY = devToolsTab === 'multi' ? 260 : 230;
      let visibleHeight = getMenuHeight() - startY - 40; // leave some margin at bottom
      let selectedY = selectedRow * spacing - devToolsScrollOffset;
      
      // Scroll down if selected is below visible area
      if (selectedY + cardHeight > visibleHeight) {
        devToolsScrollOffset = (selectedRow * spacing + cardHeight) - visibleHeight;
      }
      // Scroll up if selected is above visible area
      if (selectedY < 0) {
        devToolsScrollOffset = selectedRow * spacing;
      }
      // Clamp scroll offset
      if (devToolsScrollOffset < 0) devToolsScrollOffset = 0;
    }
    
    // Player sub-tabs for multiplayer
    if (devToolsTab === 'multi') {
      let subTabY = 220;
      let subTabWidth = 55;
      let subTabHeight = 28;
      let subTabSpacing = 4;
      let totalSubTabWidth = 6 * subTabWidth + 5 * subTabSpacing;
      let subTabStartX = (getMenuWidth() - totalSubTabWidth) / 2;
      
      rectMode(CORNER);
      textAlign(CENTER, CENTER);
      textSize(15);
      
      for (let i = 0; i < 6; i++) {
        let subTabX = subTabStartX + i * (subTabWidth + subTabSpacing);
        
        if (devToolsPlayerTab === i) {
          fill(235);
          stroke(255);
        } else {
          fill(60);
          stroke(90);
        }
        strokeWeight(2);
        rect(subTabX, subTabY, subTabWidth, subTabHeight, 6);
        
        noStroke();
        fill(devToolsPlayerTab === i ? 10 : 180);
        text('P' + (i + 1), subTabX + subTabWidth / 2, subTabY + subTabHeight / 2);
      }
      
      // Player selection instruction
      textSize(12);
      fill(200, fadeAlpha / 2);
      text('1-6 to select player', getMenuWidth() / 2, subTabY + subTabHeight + 12);
    }
    
    // Draw upgrades in 2 columns
    let cardWidth = getMenuWidth() * 0.38;
    let cardHeight = 58;
    let leftColX = getMenuWidth() * 0.15;
    let rightColX = getMenuWidth() * 0.55;
    let startY = devToolsTab === 'multi' ? 260 : 230;
    let spacing = 61;
    
    rectMode(CORNER);
    noStroke();
    
    for (let i = 0; i < UPGRADE_COUNT; i++) {
      let upgrade = allUpgrades[i];
      let col = i % 2;
      let row = floor(i / 2);
      let x = col === 0 ? leftColX : rightColX;
      let y = startY + row * spacing - devToolsScrollOffset;
      
      // Skip rendering if card is off-screen
      if (y + cardHeight < startY || y > getMenuHeight()) {
        continue;
      }
      
      // Card background
      noStroke();
      if (devToolsSelectedUpgrade === i) {
        fill(235); // Selected - white
      } else {
        fill(60); // Unselected - dark grey
      }
      rect(x, y, cardWidth, cardHeight, 12);
      
      // Upgrade name
      noStroke();
      textAlign(LEFT, TOP);
      textSize(15);
      if (devToolsSelectedUpgrade === i) {
        fill(10); // Dark text on white
      } else {
        fill(255); // White text on dark
      }
      text(upgrade.name, x + 12, y + 7);
      
      // Level indicator
      textSize(12);
      if (devToolsSelectedUpgrade === i) {
        fill(40);
      } else {
        fill(180);
      }
      text('Level ' + upgrade.level + ' / ' + upgrade.maxLevel, x + 12, y + 27);
      
      // Yellow progress bar - individual bars side by side
      let totalBarWidth = cardWidth - 24;
      let barHeight = 7;
      let barX = x + 12;
      let barY = y + cardHeight - 12;
      
      // Calculate individual bar dimensions with gaps
      let gapSize = 3;
      let totalGaps = (upgrade.maxLevel - 1) * gapSize;
      let singleBarWidth = (totalBarWidth - totalGaps) / upgrade.maxLevel;
      
      // Draw individual bars
      for (let s = 0; s < upgrade.maxLevel; s++) {
        let individualBarX = barX + s * (singleBarWidth + gapSize);
        
        if (s < upgrade.level) {
          // Active bar - yellow
          noStroke();
          fill(255, 215, 0);
        } else {
          // Inactive bar - dark grey
          noStroke();
          fill(40);
        }
        
        rect(individualBarX, barY, singleBarWidth, barHeight, 4);
      }
    }
    
    } else if (devToolsTab === 'ants') {
      // ANTS TAB - Genetic stats editor
      drawAntsTab(fadeAlpha);
    }
    
    // Instructions at bottom
    textAlign(CENTER, CENTER);
    textSize(14);
    fill(200, fadeAlpha);
    noStroke();
    if (devToolsTab === 'multi') {
      text('Q/E/R Tabs  |  1-6 Player  |  WASD/Arrows Nav  |  Enter Toggle  |  Shift+/+\\\\ Exit', getMenuWidth() / 2, getMenuHeight() - 25);
    } else if (devToolsTab === 'ants') {
      if (devToolsUseCustomAnts) {
        text('Q/E/R Tabs  |  1-3 Ant Rank  |  W/S Select  |  A/D Adjust  |  Enter Set Trait Token  |  T Toggle  |  Shift+/+\\ Exit', getMenuWidth() / 2, getMenuHeight() - 25);
      } else {
        text('Q/E/R Tabs  |  1-3 Ant Rank  |  W/S Navigate  |  T Enable Editing  |  Shift+/+\\\\ Exit', getMenuWidth() / 2, getMenuHeight() - 25);
      }
    } else {
      text('Q/E/R Tabs  |  WASD/Arrows Navigate  |  Enter Toggle  |  Shift+/+\\\\ Exit', getMenuWidth() / 2, getMenuHeight() - 25);
    }
    
    endMenuScaling();
  } catch (error) {
    // Fallback minimal display if there's an error
    background(20);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(32);
    text('DEV TOOLS ERROR', width / 2, height / 2 - 50);
    textSize(20);
    text('Press Shift + / + \\ to exit', width / 2, height / 2 + 50);
  }
}

// Toggle upgrade level in dev tools
function toggleDevUpgrade(upgradeId) {
  // Get current level based on tab
  let currentLevel = 0;
  let maxLevels = UPGRADE_MAX_LEVELS;
  
  if (devToolsTab === 'single') {
    let upgradeLevels = [upgrade1Level, upgrade2Level, upgrade3Level, upgrade4Level, upgrade5Level, 
                         upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level, upgrade21Level, upgrade22Level, upgrade23Level, upgrade24Level, upgrade25Level, upgrade26Level, upgrade27Level, upgrade28Level, upgrade29Level, upgrade30Level, upgrade31Level, upgrade32Level, upgrade33Level, upgrade34Level, upgrade35Level, upgrade36Level, upgrade37Level, upgrade38Level, upgrade39Level, upgrade40Level, upgrade41Level, upgrade42Level, upgrade43Level, upgrade44Level, upgrade45Level, upgrade46Level, upgrade47Level, upgrade48Level, upgrade49Level, upgrade50Level, upgrade51Level, upgrade52Level, upgrade53Level, upgrade54Level];
    currentLevel = upgradeLevels[upgradeId];
  } else {
    // Multiplayer - get from selected player
    if (players[devToolsPlayerTab]) {
      let playerUpgrades = [
        players[devToolsPlayerTab].upgrade1 || 0,
        players[devToolsPlayerTab].upgrade2 || 0,
        players[devToolsPlayerTab].upgrade3 || 0,
        players[devToolsPlayerTab].upgrade4 || 0,
        players[devToolsPlayerTab].upgrade5 || 0,
        players[devToolsPlayerTab].upgrade6 || 0,
        players[devToolsPlayerTab].upgrade7 || 0,
        players[devToolsPlayerTab].upgrade8 || 0,
        players[devToolsPlayerTab].upgrade9 || 0,
        players[devToolsPlayerTab].upgrade10 || 0,
        players[devToolsPlayerTab].upgrade11 || 0,
        players[devToolsPlayerTab].upgrade12 || 0,
        players[devToolsPlayerTab].upgrade13 || 0,
        players[devToolsPlayerTab].upgrade14 || 0,
        players[devToolsPlayerTab].upgrade15 || 0,
        players[devToolsPlayerTab].upgrade16 || 0,
        players[devToolsPlayerTab].upgrade17 || 0,
        players[devToolsPlayerTab].upgrade18 || 0,
        players[devToolsPlayerTab].upgrade19 || 0,
        players[devToolsPlayerTab].upgrade20 || 0,
        players[devToolsPlayerTab].upgrade21 || 0,
        players[devToolsPlayerTab].upgrade22 || 0,
        players[devToolsPlayerTab].upgrade23 || 0,
        players[devToolsPlayerTab].upgrade24 || 0,
        players[devToolsPlayerTab].upgrade25 || 0,
        players[devToolsPlayerTab].upgrade26 || 0,
        players[devToolsPlayerTab].upgrade27 || 0,
        players[devToolsPlayerTab].upgrade28 || 0,
        players[devToolsPlayerTab].upgrade29 || 0,
        players[devToolsPlayerTab].upgrade30 || 0,
        players[devToolsPlayerTab].upgrade31 || 0,
        players[devToolsPlayerTab].upgrade32 || 0,
        players[devToolsPlayerTab].upgrade33 || 0,
        players[devToolsPlayerTab].upgrade34 || 0,
        players[devToolsPlayerTab].upgrade35 || 0,
        players[devToolsPlayerTab].upgrade36 || 0,
        players[devToolsPlayerTab].upgrade37 || 0,
        players[devToolsPlayerTab].upgrade38 || 0,
        players[devToolsPlayerTab].upgrade39 || 0,
        players[devToolsPlayerTab].upgrade40 || 0,
        players[devToolsPlayerTab].upgrade41 || 0,
        players[devToolsPlayerTab].upgrade42 || 0,
        players[devToolsPlayerTab].upgrade43 || 0,
        players[devToolsPlayerTab].upgrade44 || 0,
        players[devToolsPlayerTab].upgrade45 || 0,
        players[devToolsPlayerTab].upgrade46 || 0,
        players[devToolsPlayerTab].upgrade47 || 0,
        players[devToolsPlayerTab].upgrade48 || 0,
        players[devToolsPlayerTab].upgrade49 || 0,
        players[devToolsPlayerTab].upgrade50 || 0,
        players[devToolsPlayerTab].upgrade51 || 0,
        players[devToolsPlayerTab].upgrade52 || 0,
        players[devToolsPlayerTab].upgrade53 || 0,
        players[devToolsPlayerTab].upgrade54 || 0
      ];
      currentLevel = playerUpgrades[upgradeId];
    }
  }
  
  let maxLevel = maxLevels[upgradeId];
  
  if (currentLevel >= maxLevel) {
    // Already maxed - reset to 0 and deactivate dependents
    setDevUpgradeLevel(upgradeId, 0);
    deactivateDevDependentUpgrades(upgradeId);
  } else {
    // Increase by 1 and activate prerequisites
    activateDevPrerequisites(upgradeId, currentLevel + 1);
    setDevUpgradeLevel(upgradeId, currentLevel + 1);
  }
}

// Activate all prerequisites for an upgrade
function activatePrerequisites(upgradeId, targetLevel) {
  // Upgrade 5 (Shield Regen) requires Upgrade 3 (Add Shield)
  if (upgradeId === 5 && upgrade4Level === 0) {
    setUpgradeLevel(3, 1);
  }
  
  // Upgrade 6 (Bullet Reload) requires Upgrade 4 (Add Bullets)
  if (upgradeId === 6 && upgrade5Level === 0) {
    setUpgradeLevel(4, 1);
  }
  
  // Upgrade 7 (Bullet Speed) requires Upgrade 4 (Add Bullets)
  if (upgradeId === 7 && upgrade5Level === 0) {
    setUpgradeLevel(4, 1);
  }
  
  // Upgrade 8 (Free-Angle Aiming) requires Upgrades 4, 6, 7 (Add Bullets, Bullet Reload, Bullet Speed)
  if (upgradeId === 8) {
    if (upgrade5Level === 0) setUpgradeLevel(4, 1);
    if (upgrade7Level === 0) {
      if (upgrade5Level === 0) setUpgradeLevel(4, 1);
      setUpgradeLevel(6, 1);
    }
    if (upgrade8Level === 0) {
      if (upgrade5Level === 0) setUpgradeLevel(4, 1);
      setUpgradeLevel(7, 1);
    }
  }
  
  // Upgrade 9 (Tiger Beetle) requires Upgrade 2 (Dash Cooldown) maxed at 5
  if (upgradeId === 9 && upgrade3Level < 5) {
    setUpgradeLevel(2, 5);
  }
  
  // Upgrade 10 (Oogpister Beetle) requires Upgrade 6 (Bullet Reload) at level 3+
  // Bullet Reload requires Add Bullets, so activate that too
  if (upgradeId === 10) {
    if (upgrade5Level === 0) setUpgradeLevel(4, 1);  // Add Bullets first
    if (upgrade7Level < 3) setUpgradeLevel(6, 3);    // Then Bullet Reload to level 3
  }
  
  // Upgrade 12 (Potent Acid) requires Upgrade 4 (Add Bullets)
  if (upgradeId === 12) {
    if (upgrade5Level === 0) {
      setUpgradeLevel(4, 1);  // Activate Add Bullets
    }
  }
}

// Dev tools version - Activate prerequisites for an upgrade
function activateDevPrerequisites(upgradeId, targetLevel) {
  // Get current levels based on tab
  let getCurrentLevel = (id) => {
    if (devToolsTab === 'single') {
      let levels = [upgrade1Level, upgrade2Level, upgrade3Level, upgrade4Level, upgrade5Level, 
                    upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level, upgrade21Level, upgrade22Level, upgrade23Level, upgrade24Level, upgrade25Level, upgrade26Level, upgrade27Level, upgrade28Level, upgrade29Level, upgrade30Level, upgrade31Level, upgrade32Level, upgrade33Level, upgrade34Level, upgrade35Level, upgrade36Level, upgrade37Level, upgrade38Level, upgrade39Level, upgrade40Level, upgrade41Level, upgrade42Level, upgrade43Level, upgrade44Level, upgrade45Level, upgrade46Level, upgrade47Level, upgrade48Level, upgrade49Level, upgrade50Level, upgrade51Level, upgrade52Level, upgrade53Level, upgrade54Level];
      return levels[id];
    } else if (players[devToolsPlayerTab]) {
      let playerLevels = [
        players[devToolsPlayerTab].upgrade1 || 0,
        players[devToolsPlayerTab].upgrade2 || 0,
        players[devToolsPlayerTab].upgrade3 || 0,
        players[devToolsPlayerTab].upgrade4 || 0,
        players[devToolsPlayerTab].upgrade5 || 0,
        players[devToolsPlayerTab].upgrade6 || 0,
        players[devToolsPlayerTab].upgrade7 || 0,
        players[devToolsPlayerTab].upgrade8 || 0,
        players[devToolsPlayerTab].upgrade9 || 0,
        players[devToolsPlayerTab].upgrade10 || 0,
        players[devToolsPlayerTab].upgrade11 || 0,
        players[devToolsPlayerTab].upgrade12 || 0,
        players[devToolsPlayerTab].upgrade13 || 0,
        players[devToolsPlayerTab].upgrade14 || 0,
        players[devToolsPlayerTab].upgrade15 || 0,
        players[devToolsPlayerTab].upgrade16 || 0,
        players[devToolsPlayerTab].upgrade17 || 0,
        players[devToolsPlayerTab].upgrade18 || 0,
        players[devToolsPlayerTab].upgrade19 || 0,
        players[devToolsPlayerTab].upgrade20 || 0,
        players[devToolsPlayerTab].upgrade21 || 0,
        players[devToolsPlayerTab].upgrade22 || 0,
        players[devToolsPlayerTab].upgrade23 || 0,
        players[devToolsPlayerTab].upgrade24 || 0,
        players[devToolsPlayerTab].upgrade25 || 0,
        players[devToolsPlayerTab].upgrade26 || 0,
        players[devToolsPlayerTab].upgrade27 || 0,
        players[devToolsPlayerTab].upgrade28 || 0,
        players[devToolsPlayerTab].upgrade29 || 0,
        players[devToolsPlayerTab].upgrade30 || 0,
        players[devToolsPlayerTab].upgrade31 || 0,
        players[devToolsPlayerTab].upgrade32 || 0,
        players[devToolsPlayerTab].upgrade33 || 0,
        players[devToolsPlayerTab].upgrade34 || 0,
        players[devToolsPlayerTab].upgrade35 || 0,
        players[devToolsPlayerTab].upgrade36 || 0,
        players[devToolsPlayerTab].upgrade37 || 0,
        players[devToolsPlayerTab].upgrade38 || 0,
        players[devToolsPlayerTab].upgrade39 || 0,
        players[devToolsPlayerTab].upgrade40 || 0,
        players[devToolsPlayerTab].upgrade41 || 0,
        players[devToolsPlayerTab].upgrade42 || 0,
        players[devToolsPlayerTab].upgrade43 || 0,
        players[devToolsPlayerTab].upgrade44 || 0,
        players[devToolsPlayerTab].upgrade45 || 0,
        players[devToolsPlayerTab].upgrade46 || 0,
        players[devToolsPlayerTab].upgrade47 || 0,
        players[devToolsPlayerTab].upgrade48 || 0,
        players[devToolsPlayerTab].upgrade49 || 0,
        players[devToolsPlayerTab].upgrade50 || 0,
        players[devToolsPlayerTab].upgrade51 || 0,
        players[devToolsPlayerTab].upgrade52 || 0,
        players[devToolsPlayerTab].upgrade53 || 0,
        players[devToolsPlayerTab].upgrade54 || 0
      ];
      return playerLevels[id];
    }
    return 0;
  };
  
  // Upgrade 5 (Shield Regen) requires Upgrade 3 (Add Shield)
  if (upgradeId === 5 && getCurrentLevel(3) === 0) {
    setDevUpgradeLevel(3, 1);
  }
  
  // Upgrade 6 (Bullet Reload) requires Upgrade 4 (Add Bullets)
  if (upgradeId === 6 && getCurrentLevel(4) === 0) {
    setDevUpgradeLevel(4, 1);
  }
  
  // Upgrade 7 (Bullet Speed) requires Upgrade 4 (Add Bullets)
  if (upgradeId === 7 && getCurrentLevel(4) === 0) {
    setDevUpgradeLevel(4, 1);
  }
  
  // Upgrade 8 (Free-Angle Aiming) requires Upgrades 4, 6, 7
  if (upgradeId === 8) {
    if (getCurrentLevel(4) === 0) setDevUpgradeLevel(4, 1);
    if (getCurrentLevel(6) === 0) setDevUpgradeLevel(6, 1);
    if (getCurrentLevel(7) === 0) setDevUpgradeLevel(7, 1);
  }
  
  // Upgrade 9 (Tiger Beetle) requires Upgrade 2 (Dash Cooldown) maxed at 5
  if (upgradeId === 9 && getCurrentLevel(2) < 5) {
    setDevUpgradeLevel(2, 5);
  }
  
  // Upgrade 10 (Oogpister Beetle) requires Upgrade 6 (Bullet Reload) at level 3+
  // Bullet Reload requires Add Bullets, so activate that too
  if (upgradeId === 10) {
    if (getCurrentLevel(4) === 0) setDevUpgradeLevel(4, 1); // Add Bullets first
    if (getCurrentLevel(6) < 3) setDevUpgradeLevel(6, 3);   // Then Bullet Reload
  }
  
  // Upgrade 12 (Potent Acid) requires Upgrade 4 (Add Bullets)
  if (upgradeId === 12) {
    if (getCurrentLevel(4) === 0) {
      setDevUpgradeLevel(4, 1);  // Activate Add Bullets
    }
  }
  
  // Upgrade 14-18 (Shockwave upgrades) require Upgrade 13 (Shockwave Unlock)
  if (upgradeId === 14 && getCurrentLevel(13) === 0) {
    setDevUpgradeLevel(13, 1);  // Activate Shockwave Unlock
  }
  if (upgradeId === 15 && getCurrentLevel(13) === 0) {
    setDevUpgradeLevel(13, 1);  // Activate Shockwave Unlock
  }
  if (upgradeId === 16 && getCurrentLevel(13) === 0) {
    setDevUpgradeLevel(13, 1);  // Activate Shockwave Unlock
  }
  if (upgradeId === 17 && getCurrentLevel(13) === 0) {
    setDevUpgradeLevel(13, 1);  // Activate Shockwave Unlock
  }
  if (upgradeId === 18 && getCurrentLevel(13) === 0) {
    setDevUpgradeLevel(13, 1);  // Activate Shockwave Unlock
  }
  if (upgradeId === 25 && getCurrentLevel(13) === 0) {
    setDevUpgradeLevel(13, 1);  // Shockwave Harvest requires Shockwave Unlock
  }
  if (upgradeId === 26 && getCurrentLevel(4) === 0) {
    setDevUpgradeLevel(4, 1);  // Bullet Harvest requires Add Bullets
  }

  // Special shots (27-35): each unlock requires Add Bullets, sub upgrades require their unlock,
  // and bombs unlock in order impact → timed → proximity
  if (upgradeId >= 27 && upgradeId <= 35 && getCurrentLevel(4) === 0) {
    setDevUpgradeLevel(4, 1);
  }
  if ((upgradeId === 28 || upgradeId === 29) && getCurrentLevel(27) === 0) {
    setDevUpgradeLevel(27, 1);  // Spray Length/Width require Spray Acid
  }
  if (upgradeId === 31 && getCurrentLevel(30) === 0) {
    setDevUpgradeLevel(30, 1);  // Piercing Depth requires Piercing Acid
  }
  if ((upgradeId === 33 || upgradeId === 34 || upgradeId === 35) && getCurrentLevel(32) === 0) {
    setDevUpgradeLevel(32, 1);  // Timed Bomb and Blast Radius require Impact Bomb
  }
  if (upgradeId === 34 && getCurrentLevel(33) === 0) {
    setDevUpgradeLevel(33, 1);  // Proximity Bomb requires Timed Bomb
  }
  if (upgradeId >= 37 && upgradeId <= 43 && getCurrentLevel(36) === 0) {
    setDevUpgradeLevel(36, 1);  // Aphid upgrades require Lady Beetle
  }
  if (upgradeId >= 44 && upgradeId <= 47 && getCurrentLevel(13) === 0) {
    setDevUpgradeLevel(13, 1);  // Shockwave variants require Shockwave
  }
  if (upgradeId === 48 && getCurrentLevel(44) === 0 && getCurrentLevel(45) === 0) {
    if (getCurrentLevel(13) === 0) setDevUpgradeLevel(13, 1);
    setDevUpgradeLevel(44, 1);  // Mound Health requires Mound Ring or Bunker
  }
  if (upgradeId === 49 && getCurrentLevel(47) === 0) {
    if (getCurrentLevel(13) === 0) setDevUpgradeLevel(13, 1);
    setDevUpgradeLevel(47, 1);  // Flight Duration requires Flight and Slam
  }
  if (upgradeId === 52 && getCurrentLevel(3) === 0) {
    setDevUpgradeLevel(3, 1);  // Shell Shrapnel requires Add Shield
  }
  if (upgradeId === 53 && getCurrentLevel(52) === 0) {
    if (getCurrentLevel(3) === 0) setDevUpgradeLevel(3, 1);
    setDevUpgradeLevel(52, 1);  // Shrapnel Count requires Shell Shrapnel
  }
}

// Deactivate upgrades that depend on this one
function deactivateDependentUpgrades(upgradeId) {
  // If Add Shield (3) is reset, reset Shield Regen (5)
  if (upgradeId === 3) {
    setUpgradeLevel(5, 0);
  }
  
  // If Add Bullets (4) is reset, reset Bullet Reload (6), Bullet Speed (7), and Free-Angle Aiming (8)
  if (upgradeId === 4) {
    setUpgradeLevel(6, 0);
    setUpgradeLevel(7, 0);
    setUpgradeLevel(8, 0);
  }
  
  // If Bullet Reload (6) is reset, reset Free-Angle Aiming (8)
  if (upgradeId === 6) {
    setUpgradeLevel(8, 0);
  }
  
  // If Bullet Speed (7) is reset, reset Free-Angle Aiming (8)
  if (upgradeId === 7) {
    setUpgradeLevel(8, 0);
  }
  
  // If Dash Cooldown (2) is reset below 5, reset Tiger Beetle (9)
  if (upgradeId === 2) {
    setUpgradeLevel(9, 0);
  }
}

// Dev tools version - Deactivate dependent upgrades
// Level of an upgrade (by id) for whoever the dev tools are editing
function getDevUpgradeLevel(id) {
  if (devToolsTab === 'single') return getCurrentUpgradeLevels()[id];
  const p = players[devToolsPlayerTab];
  return p ? (p['upgrade' + (id + 1)] || 0) : 0;
}

function deactivateDevDependentUpgrades(upgradeId) {
  // If Add Shield (3) is reset, reset Shield Regen (5)
  if (upgradeId === 3) {
    setDevUpgradeLevel(5, 0);
  }
  
  // If Add Bullets (4) is reset, reset Bullet Reload (6), Bullet Speed (7), and Free-Angle Aiming (8)
  if (upgradeId === 4) {
    setDevUpgradeLevel(6, 0);
    setDevUpgradeLevel(7, 0);
    setDevUpgradeLevel(8, 0);
    setDevUpgradeLevel(10, 0); // Also reset Oogpister Beetle since it requires Bullet Reload
    setDevUpgradeLevel(12, 0); // Also reset Potent Acid since it requires Add Bullets
    setDevUpgradeLevel(26, 0); // Also reset Bullet Harvest since it requires Add Bullets
    for (let id = 27; id <= 35; id++) setDevUpgradeLevel(id, 0); // And every special shot upgrade
  }

  // Special shot unlocks reset their sub upgrades (and later bombs in the unlock order)
  if (upgradeId === 27) {
    setDevUpgradeLevel(28, 0);
    setDevUpgradeLevel(29, 0);
  }
  if (upgradeId === 30) {
    setDevUpgradeLevel(31, 0);
  }
  if (upgradeId === 32) {
    setDevUpgradeLevel(33, 0);
    setDevUpgradeLevel(34, 0);
    setDevUpgradeLevel(35, 0);
  }
  if (upgradeId === 33) {
    setDevUpgradeLevel(34, 0);
  }

  // If Lady Beetle (36) is reset, reset every aphid upgrade
  if (upgradeId === 36) {
    for (let id = 37; id <= 43; id++) setDevUpgradeLevel(id, 0);
  }

  // Shockwave variants reset their sub upgrades
  if ((upgradeId === 44 || upgradeId === 45) && getDevUpgradeLevel(44) === 0 && getDevUpgradeLevel(45) === 0) {
    setDevUpgradeLevel(48, 0); // Mound Health needs Mound Ring or Bunker
  }
  if (upgradeId === 47) {
    setDevUpgradeLevel(49, 0);
  }

  // If Add Shield (3) or Shell Shrapnel (52) is reset, reset what's built on it
  if (upgradeId === 3) {
    setDevUpgradeLevel(52, 0);
    setDevUpgradeLevel(53, 0);
  }
  if (upgradeId === 52) {
    setDevUpgradeLevel(53, 0);
  }

  // If Bullet Reload (6) is reset, reset Free-Angle Aiming (8) and Oogpister Beetle (10)
  if (upgradeId === 6) {
    setDevUpgradeLevel(8, 0);
    setDevUpgradeLevel(10, 0);
  }
  
  // If Bullet Speed (7) is reset, reset Free-Angle Aiming (8)
  if (upgradeId === 7) {
    setDevUpgradeLevel(8, 0);
  }
  
  // If Dash Cooldown (2) is reset below 5, reset Tiger Beetle (9)
  if (upgradeId === 2) {
    setDevUpgradeLevel(9, 0);
  }
  
  // If Shockwave (13) is reset, reset all shockwave upgrade levels (14-18)
  if (upgradeId === 13) {
    setDevUpgradeLevel(14, 0);
    setDevUpgradeLevel(15, 0);
    setDevUpgradeLevel(16, 0);
    setDevUpgradeLevel(17, 0);
    setDevUpgradeLevel(18, 0);
    setDevUpgradeLevel(25, 0); // Shockwave Harvest
    for (let id = 44; id <= 49; id++) setDevUpgradeLevel(id, 0); // Shockwave variants and their upgrades
  }
}

// Set upgrade level
function setUpgradeLevel(upgradeId, level) {
  if (upgradeId === 0) upgrade1Level = level;
  else if (upgradeId === 1) upgrade2Level = level;
  else if (upgradeId === 2) upgrade3Level = level;
  else if (upgradeId === 3) upgrade4Level = level;
  else if (upgradeId === 4) upgrade5Level = level;
  else if (upgradeId === 5) upgrade6Level = level;
  else if (upgradeId === 6) upgrade7Level = level;
  else if (upgradeId === 7) upgrade8Level = level;
  else if (upgradeId === 8) upgrade9Level = level;
  else if (upgradeId === 9) upgrade10Level = level;
  else if (upgradeId === 10) upgrade11Level = level;
  else if (upgradeId === 11) upgrade12Level = level;
  else if (upgradeId === 12) upgrade13Level = level;
  else if (upgradeId === 13) upgrade14Level = level;
  else if (upgradeId === 14) upgrade15Level = level;
  else if (upgradeId === 15) upgrade16Level = level;
  else if (upgradeId === 16) upgrade17Level = level;
  else if (upgradeId === 17) upgrade18Level = level;
  else if (upgradeId === 18) upgrade19Level = level;
  else if (upgradeId === 19) upgrade20Level = level;
  else if (upgradeId === 20) upgrade21Level = level;
  else if (upgradeId === 21) upgrade22Level = level;
  else if (upgradeId === 22) upgrade23Level = level;
  else if (upgradeId === 23) upgrade24Level = level;
  else if (upgradeId === 24) upgrade25Level = level;
  else if (upgradeId === 25) upgrade26Level = level;
  else if (upgradeId === 26) upgrade27Level = level;
  else if (upgradeId === 27) upgrade28Level = level;
  else if (upgradeId === 28) upgrade29Level = level;
  else if (upgradeId === 29) upgrade30Level = level;
  else if (upgradeId === 30) upgrade31Level = level;
  else if (upgradeId === 31) upgrade32Level = level;
  else if (upgradeId === 32) upgrade33Level = level;
  else if (upgradeId === 33) upgrade34Level = level;
  else if (upgradeId === 34) upgrade35Level = level;
  else if (upgradeId === 35) upgrade36Level = level;
  else if (upgradeId === 36) upgrade37Level = level;
  else if (upgradeId === 37) upgrade38Level = level;
  else if (upgradeId === 38) upgrade39Level = level;
  else if (upgradeId === 39) upgrade40Level = level;
  else if (upgradeId === 40) upgrade41Level = level;
  else if (upgradeId === 41) upgrade42Level = level;
  else if (upgradeId === 42) upgrade43Level = level;
  else if (upgradeId === 43) upgrade44Level = level;
  else if (upgradeId === 44) upgrade45Level = level;
  else if (upgradeId === 45) upgrade46Level = level;
  else if (upgradeId === 46) upgrade47Level = level;
  else if (upgradeId === 47) upgrade48Level = level;
  else if (upgradeId === 48) upgrade49Level = level;
  else if (upgradeId === 49) upgrade50Level = level;
  else if (upgradeId === 50) upgrade51Level = level;
  else if (upgradeId === 51) upgrade52Level = level;
  else if (upgradeId === 52) upgrade53Level = level;
  else if (upgradeId === 53) upgrade54Level = level;
  
  // Apply the changes to game stats
  updateUpgradeBooleans();
}

// Dev tools version - Set upgrade level for either single or multiplayer
function setDevUpgradeLevel(upgradeId, level) {
  if (devToolsTab === 'single') {
    // Update global upgrades
    if (upgradeId === 0) upgrade1Level = level;
    else if (upgradeId === 1) upgrade2Level = level;
    else if (upgradeId === 2) upgrade3Level = level;
    else if (upgradeId === 3) upgrade4Level = level;
    else if (upgradeId === 4) upgrade5Level = level;
    else if (upgradeId === 5) upgrade6Level = level;
    else if (upgradeId === 6) upgrade7Level = level;
    else if (upgradeId === 7) upgrade8Level = level;
    else if (upgradeId === 8) upgrade9Level = level;
    else if (upgradeId === 9) upgrade10Level = level;
    else if (upgradeId === 10) upgrade11Level = level;
    else if (upgradeId === 11) upgrade12Level = level;
    else if (upgradeId === 12) upgrade13Level = level;
    else if (upgradeId === 13) upgrade14Level = level;
    else if (upgradeId === 14) upgrade15Level = level;
    else if (upgradeId === 15) upgrade16Level = level;
    else if (upgradeId === 16) upgrade17Level = level;
    else if (upgradeId === 17) upgrade18Level = level;
    else if (upgradeId === 18) upgrade19Level = level;
    else if (upgradeId === 19) upgrade20Level = level;
    else if (upgradeId === 20) upgrade21Level = level;
    else if (upgradeId === 21) upgrade22Level = level;
    else if (upgradeId === 22) upgrade23Level = level;
    else if (upgradeId === 23) upgrade24Level = level;
    else if (upgradeId === 24) upgrade25Level = level;
    else if (upgradeId === 25) upgrade26Level = level;
    else if (upgradeId === 26) upgrade27Level = level;
    else if (upgradeId === 27) upgrade28Level = level;
    else if (upgradeId === 28) upgrade29Level = level;
    else if (upgradeId === 29) upgrade30Level = level;
    else if (upgradeId === 30) upgrade31Level = level;
    else if (upgradeId === 31) upgrade32Level = level;
    else if (upgradeId === 32) upgrade33Level = level;
    else if (upgradeId === 33) upgrade34Level = level;
    else if (upgradeId === 34) upgrade35Level = level;
    else if (upgradeId === 35) upgrade36Level = level;
    else if (upgradeId === 36) upgrade37Level = level;
    else if (upgradeId === 37) upgrade38Level = level;
    else if (upgradeId === 38) upgrade39Level = level;
    else if (upgradeId === 39) upgrade40Level = level;
    else if (upgradeId === 40) upgrade41Level = level;
    else if (upgradeId === 41) upgrade42Level = level;
    else if (upgradeId === 42) upgrade43Level = level;
    else if (upgradeId === 43) upgrade44Level = level;
    else if (upgradeId === 44) upgrade45Level = level;
    else if (upgradeId === 45) upgrade46Level = level;
    else if (upgradeId === 46) upgrade47Level = level;
    else if (upgradeId === 47) upgrade48Level = level;
    else if (upgradeId === 48) upgrade49Level = level;
    else if (upgradeId === 49) upgrade50Level = level;
    else if (upgradeId === 50) upgrade51Level = level;
    else if (upgradeId === 51) upgrade52Level = level;
    else if (upgradeId === 52) upgrade53Level = level;
    else if (upgradeId === 53) upgrade54Level = level;
    
    // Apply the changes to game stats
    updateUpgradeBooleans();
  } else {
    // Update specific player upgrades
    if (players[devToolsPlayerTab]) {
      if (upgradeId === 0) players[devToolsPlayerTab].upgrade1 = level;
      else if (upgradeId === 1) players[devToolsPlayerTab].upgrade2 = level;
      else if (upgradeId === 2) players[devToolsPlayerTab].upgrade3 = level;
      else if (upgradeId === 3) players[devToolsPlayerTab].upgrade4 = level;
      else if (upgradeId === 4) players[devToolsPlayerTab].upgrade5 = level;
      else if (upgradeId === 5) players[devToolsPlayerTab].upgrade6 = level;
      else if (upgradeId === 6) players[devToolsPlayerTab].upgrade7 = level;
      else if (upgradeId === 7) players[devToolsPlayerTab].upgrade8 = level;
      else if (upgradeId === 8) players[devToolsPlayerTab].upgrade9 = level;
      else if (upgradeId === 9) players[devToolsPlayerTab].upgrade10 = level;
      else if (upgradeId === 10) players[devToolsPlayerTab].upgrade11 = level;
      else if (upgradeId === 11) players[devToolsPlayerTab].upgrade12 = level;
      else if (upgradeId === 12) players[devToolsPlayerTab].upgrade13 = level;
      else if (upgradeId === 13) players[devToolsPlayerTab].upgrade14 = level;
      else if (upgradeId === 14) players[devToolsPlayerTab].upgrade15 = level;
      else if (upgradeId === 15) players[devToolsPlayerTab].upgrade16 = level;
      else if (upgradeId === 16) players[devToolsPlayerTab].upgrade17 = level;
      else if (upgradeId === 17) players[devToolsPlayerTab].upgrade18 = level;
      else if (upgradeId === 18) players[devToolsPlayerTab].upgrade19 = level;
      else if (upgradeId === 19) players[devToolsPlayerTab].upgrade20 = level;
      else if (upgradeId === 20) players[devToolsPlayerTab].upgrade21 = level;
      else if (upgradeId === 21) players[devToolsPlayerTab].upgrade22 = level;
      else if (upgradeId === 22) players[devToolsPlayerTab].upgrade23 = level;
      else if (upgradeId === 23) players[devToolsPlayerTab].upgrade24 = level;
      else if (upgradeId === 24) players[devToolsPlayerTab].upgrade25 = level;
      else if (upgradeId === 25) players[devToolsPlayerTab].upgrade26 = level;
      else if (upgradeId === 26) players[devToolsPlayerTab].upgrade27 = level;
      else if (upgradeId === 27) players[devToolsPlayerTab].upgrade28 = level;
      else if (upgradeId === 28) players[devToolsPlayerTab].upgrade29 = level;
      else if (upgradeId === 29) players[devToolsPlayerTab].upgrade30 = level;
      else if (upgradeId === 30) players[devToolsPlayerTab].upgrade31 = level;
      else if (upgradeId === 31) players[devToolsPlayerTab].upgrade32 = level;
      else if (upgradeId === 32) players[devToolsPlayerTab].upgrade33 = level;
      else if (upgradeId === 33) players[devToolsPlayerTab].upgrade34 = level;
      else if (upgradeId === 34) players[devToolsPlayerTab].upgrade35 = level;
      else if (upgradeId === 35) players[devToolsPlayerTab].upgrade36 = level;
      else if (upgradeId === 36) players[devToolsPlayerTab].upgrade37 = level;
      else if (upgradeId === 37) players[devToolsPlayerTab].upgrade38 = level;
      else if (upgradeId === 38) players[devToolsPlayerTab].upgrade39 = level;
      else if (upgradeId === 39) players[devToolsPlayerTab].upgrade40 = level;
      else if (upgradeId === 40) players[devToolsPlayerTab].upgrade41 = level;
      else if (upgradeId === 41) players[devToolsPlayerTab].upgrade42 = level;
      else if (upgradeId === 42) players[devToolsPlayerTab].upgrade43 = level;
      else if (upgradeId === 43) players[devToolsPlayerTab].upgrade44 = level;
      else if (upgradeId === 44) players[devToolsPlayerTab].upgrade45 = level;
      else if (upgradeId === 45) players[devToolsPlayerTab].upgrade46 = level;
      else if (upgradeId === 46) players[devToolsPlayerTab].upgrade47 = level;
      else if (upgradeId === 47) players[devToolsPlayerTab].upgrade48 = level;
      else if (upgradeId === 48) players[devToolsPlayerTab].upgrade49 = level;
      else if (upgradeId === 49) players[devToolsPlayerTab].upgrade50 = level;
      else if (upgradeId === 50) players[devToolsPlayerTab].upgrade51 = level;
      else if (upgradeId === 51) players[devToolsPlayerTab].upgrade52 = level;
      else if (upgradeId === 52) players[devToolsPlayerTab].upgrade53 = level;
      else if (upgradeId === 53) players[devToolsPlayerTab].upgrade54 = level;
      
      // Update player's stats based on their new upgrade levels
      updatePlayerStats(devToolsPlayerTab);
    }
  }
}

// Update a specific player's stats based on their upgrade levels
function updatePlayerStats(playerIndex) {
  if (!players[playerIndex]) return;
  
  let p = players[playerIndex];
  
  // Walking Speed (4 levels)
  if (p.upgrade1 === 1) {
    p.movementSpeed = 3.5;
  } else if (p.upgrade1 === 2) {
    p.movementSpeed = 4;
  } else if (p.upgrade1 === 3) {
    p.movementSpeed = 4.5;
  } else if (p.upgrade1 === 4) {
    p.movementSpeed = 5;
  } else {
    p.movementSpeed = 3;
  }
  
  // Dash Speed (5 levels)
  if (p.upgrade2 === 1) {
    p.dashSpeedStat = 3;
  } else if (p.upgrade2 === 2) {
    p.dashSpeedStat = 4;
  } else if (p.upgrade2 === 3) {
    p.dashSpeedStat = 5;
  } else if (p.upgrade2 === 4) {
    p.dashSpeedStat = 6;
  } else if (p.upgrade2 === 5) {
    p.dashSpeedStat = 7;
  } else {
    p.dashSpeedStat = 2;
  }
  
  // Dash Cooldown (5 levels)
  if (p.upgrade3 === 1) {
    p.dashCooldownStat = 2.5;
  } else if (p.upgrade3 === 2) {
    p.dashCooldownStat = 2;
  } else if (p.upgrade3 === 3) {
    p.dashCooldownStat = 1.5;
  } else if (p.upgrade3 === 4) {
    p.dashCooldownStat = 1;
  } else if (p.upgrade3 === 5) {
    p.dashCooldownStat = 0.5;
  } else {
    p.dashCooldownStat = 3;
  }
  
  // Add Shield (9 levels)
  if (p.upgrade4 >= 1 && p.upgrade4 <= 9) {
    p.shieldQuantity = p.upgrade4;
  } else {
    p.shieldQuantity = 0;
  }
  
  // Add Bullets (8 levels)
  if (p.upgrade5 >= 1 && p.upgrade5 <= 8) {
    p.bulletQuantity = p.upgrade5;
  } else {
    p.bulletQuantity = 0;
  }
  
  // Shield Regeneration (5 levels)
  if (p.upgrade6 === 1) {
    p.shieldRegenerationRate = 600;
  } else if (p.upgrade6 === 2) {
    p.shieldRegenerationRate = 480;
  } else if (p.upgrade6 === 3) {
    p.shieldRegenerationRate = 360;
  } else if (p.upgrade6 === 4) {
    p.shieldRegenerationRate = 240;
  } else if (p.upgrade6 === 5) {
    p.shieldRegenerationRate = 120;
  } else {
    p.shieldRegenerationRate = 600;
  }
  
  // Bullet Reload (5 levels)
  if (p.upgrade7 === 1) {
    p.bulletReloadRate = 180;
  } else if (p.upgrade7 === 2) {
    p.bulletReloadRate = 144;
  } else if (p.upgrade7 === 3) {
    p.bulletReloadRate = 108;
  } else if (p.upgrade7 === 4) {
    p.bulletReloadRate = 72;
  } else if (p.upgrade7 === 5) {
    p.bulletReloadRate = 36;
  } else {
    p.bulletReloadRate = 180;
  }
  
  // Bullet Speed (5 levels)
  if (p.upgrade8 === 1) {
    p.playerBulletSpeed = 1.25;
  } else if (p.upgrade8 === 2) {
    p.playerBulletSpeed = 1.5;
  } else if (p.upgrade8 === 3) {
    p.playerBulletSpeed = 1.75;
  } else if (p.upgrade8 === 4) {
    p.playerBulletSpeed = 2;
  } else if (p.upgrade8 === 5) {
    p.playerBulletSpeed = 2.25;
  } else {
    p.playerBulletSpeed = 1;
  }
  
  // Shockwave Cooldown (5 levels - 3/4 of dash cooldown values)
  if (p.upgrade17 === 1) {
    p.windCooldownStat = 1.875; // 3/4 of 2.5
  } else if (p.upgrade17 === 2) {
    p.windCooldownStat = 1.5; // 3/4 of 2.0
  } else if (p.upgrade17 === 3) {
    p.windCooldownStat = 1.125; // 3/4 of 1.5
  } else if (p.upgrade17 === 4) {
    p.windCooldownStat = 0.75; // 3/4 of 1.0
  } else if (p.upgrade17 === 5) {
    p.windCooldownStat = 0.375; // 3/4 of 0.5
  } else {
    p.windCooldownStat = 2.25; // 3/4 of 3.0
  }
}


