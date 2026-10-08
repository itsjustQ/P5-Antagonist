let playerX, playerY;
let playerRotationValue = 0;
let bg;
let tx;
let ty;
let start = false;
let startMenu = false;
let difficultyMenu = false;
let difficultySelection = 5; // 1-10 button carousel
let difficultyScroll = 5; // Smoothed carousel position (follows difficultySelection)
let difficulty = 5; // 1-10: 1-3=easy, 4-5=medium, 6-7=hard, 8-10=insane
let pendingGameMode = null; // stores whether we're starting single or multiplayer
let preGameUpgradeMenu = false; // For difficulty 8-10
let antdex = false;
let antdexReturnState = 'menu';
let antdexOpenCooldown = 0;
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
  if (multiplayerMode) return;
  let record = getDifficultyRecord(difficulty);
  if (runScore > record.score) storeItem('highScore_difficulty' + difficulty, runScore);
  if (roundReached > record.round) storeItem('highestRound_difficulty' + difficulty, roundReached);
}

// Difficulty unlocks: each level unlocks by completing this round on the previous level
const DIFFICULTY_UNLOCK_ROUND = 15;

function getDifficultyCompletedRound(value) {
  let completed = getItem('completedRound_difficulty' + value);
  if (completed == null) completed = 0;
  // Reaching round N means round N-1 was completed (covers runs saved before this was tracked)
  return max(completed, getDifficultyRecord(value).round - 1);
}

function updateDifficultyCompletedRound(roundCompleted) {
  if (multiplayerMode) return;
  if (roundCompleted > getDifficultyCompletedRound(difficulty)) {
    storeItem('completedRound_difficulty' + difficulty, roundCompleted);
  }
}

function isDifficultyUnlocked(value) {
  if (value <= 1 || devToolsUnlockAllDifficulties) return true;
  return getDifficultyCompletedRound(value - 1) >= DIFFICULTY_UNLOCK_ROUND;
}

function openDifficultyMenu() {
  difficultyMenu = true;
  // Keep the last pick if it's still allowed, otherwise jump to the highest unlocked level
  if (!isDifficultyUnlocked(difficultySelection)) {
    difficultySelection = 1;
    while (difficultySelection < 10 && isDifficultyUnlocked(difficultySelection + 1)) difficultySelection++;
  }
  difficultyScroll = difficultySelection;
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

// Difficulty menu button layout: a horizontal row that scrolls so the selection is centered
const DIFFICULTY_BUTTON_SIZE = 150;
const DIFFICULTY_BUTTON_GAP = 30;

function getDifficultyButtonRect(value) {
  let centerX = getMenuWidth() / 2 + (value - difficultyScroll) * (DIFFICULTY_BUTTON_SIZE + DIFFICULTY_BUTTON_GAP);
  let centerY = getMenuHeight() * 0.36;
  return {
    x: centerX - DIFFICULTY_BUTTON_SIZE / 2,
    y: centerY - DIFFICULTY_BUTTON_SIZE / 2,
    w: DIFFICULTY_BUTTON_SIZE,
    h: DIFFICULTY_BUTTON_SIZE
  };
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
    { target: 'deathLandmine', category: 'death', potential: 'deathPotential' },
    { target: 'deathRefire', category: 'death', potential: 'deathPotential' },
    { target: 'pathHighArc', category: 'path', potential: 'pathPotential' },
    { target: 'pathCurve', category: 'path', potential: 'pathPotential' },
    { target: 'pathAccelerate', category: 'path', potential: 'pathPotential' }
  ];

  const trait = random(randomTraits);

  // Spend the dedicated 6th token.
  geneTokens[antIndex]--;

  // Ensure the category can express abilities.
  eval(trait.potential + '[' + antIndex + '] = max(' + trait.potential + '[' + antIndex + '], 0.6)');
  
  // Nudge the selected trait to win its category for expression.
  // For tiered stats (specialExplosion, pathCurve, pathAccelerate, deathLandmine, deathRefire, fireAlternating, fireBurst, pathHighArc, specialKnockback, specialCamo, specialRecoil), cap at 0.9 to prevent unlocking tier 2 without cap investment
  // For bulletAccelerateDelay (inverse stat), set to 150 (tier 1, better than default 200)
  let initialValue = 0.9;
  if (trait.target === 'specialExplosion' || trait.target === 'pathCurve' || trait.target === 'pathAccelerate' || trait.target === 'deathLandmine' || trait.target === 'deathRefire' || trait.target === 'fireAlternating' || trait.target === 'fireBurst' || trait.target === 'pathHighArc' || trait.target === 'specialKnockback' || trait.target === 'specialCamo' || trait.target === 'specialRecoil') {
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
let devToolsUnlockAllDifficulties = false; // bypass round-15 difficulty unlock requirements

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
    firePotential: 0.3,
    bulletBurstCount: 2,
    bulletBurstSpread: 1.5,
    bulletBurstDelay: 40,
    bulletCooldownMultiplier: 2,
    // Death category (mutation-based)
    deathLandmine: 0.3,
    deathRefire: 0.2,
    deathPotential: 0.3,
    // Path category (mutation-based)
    pathHighArc: 0.1,
    pathCurve: 0.1,
    pathAccelerate: 0.1,
    bulletAccelerateDelay: 200,
    pathPotential: 0.3,
    bulletArcDuration: 200,
    bulletCurveStrength: 0.015,
    explosionProximity: 200,
    angleFromSpawn: Math.PI,
    bulletSize: 1,
    radiusMultiplier: 1,
    residueMultiplier: 1,
    bulletExplodeAfter: 400,
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
    firePotential: 0.3,
    bulletBurstCount: 2,
    bulletBurstSpread: 1.5,
    bulletBurstDelay: 40,
    bulletCooldownMultiplier: 2,
    // Death category (mutation-based)
    deathLandmine: 0.3,
    deathRefire: 0.2,
    deathPotential: 0.3,
    // Path category (mutation-based)
    pathHighArc: 0.1,
    pathCurve: 0.1,
    pathAccelerate: 0.1,
    bulletAccelerateDelay: 200,
    pathPotential: 0.3,
    bulletArcDuration: 200,
    bulletCurveStrength: 0.015,
    explosionProximity: 200,
    angleFromSpawn: Math.PI,
    bulletSize: 1,
    radiusMultiplier: 1,
    residueMultiplier: 1,
    bulletExplodeAfter: 400,
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
    firePotential: 0.3,
    bulletBurstCount: 2,
    bulletBurstSpread: 1.5,
    bulletBurstDelay: 40,
    bulletCooldownMultiplier: 2,
    // Death category (mutation-based)
    deathLandmine: 0.3,
    deathRefire: 0.2,
    deathPotential: 0.3,
    // Path category (mutation-based)
    pathHighArc: 0.1,
    pathCurve: 0.1,
    pathAccelerate: 0.1,
    bulletAccelerateDelay: 200,
    pathPotential: 0.3,
    bulletArcDuration: 200,
    bulletCurveStrength: 0.015,
    explosionProximity: 200,
    angleFromSpawn: Math.PI,
    bulletSize: 1,
    radiusMultiplier: 1,
    residueMultiplier: 1,
    bulletExplodeAfter: 400,
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

let antDexEntries = [];   // array of objects {name, desc, stats}
let dexScrollY = 0;       // current scroll offset
let dexTargetScroll = 0;  // for smooth scrolling
let dexScrollSpeed = 20;  // scroll sensitivity
let selectedDexIndex = -1;// highlight
let dexCategory = 'normal';
let progressDisplayNormal = 0;
let progressTargetNormal = 0;
let progressDisplayExotic = 0;
let progressTargetExotic = 0;
let dexTabSwitchCooldown = 0;
let dexTabRegions = {
  normal: { x: 0, y: 0, w: 0, h: 0 },
  exotic: { x: 0, y: 0, w: 0, h: 0 }
};

// Movement behavior discoveries
let movementType1Discovered = false;  // Follow Beetle
let movementType2Discovered = false;  // Follow Ants
let movementType3Discovered = false;  // Find Location
let movementType4Discovered = false;  // Stand Still
let movementType5Discovered = false;  // Keep Distance From Beetle
let movementType6Discovered = false;  // Keep Distance From Ants
let movementType7Discovered = false;  // Keep Distance From Location
let movementType8Discovered = false;  // Keep Distance From Spawn

// Ant Speed discoveries (0.9-3.5)
let antSpeedMinDiscovered = false;     // 0.9-1.2
let antSpeedLowDiscovered = false;     // 1.3-1.7
let antSpeedMedDiscovered = false;     // 1.8-2.3
let antSpeedHighDiscovered = false;    // 2.4-3.0
let antSpeedMaxDiscovered = false;     // 3.1-3.5

// Bullet Speed discoveries (60-300)
let bulletSpeedMinDiscovered = false;  // 60-90 (fastest)
let bulletSpeedLowDiscovered = false;  // 91-140
let bulletSpeedMedDiscovered = false;  // 141-220
let bulletSpeedHighDiscovered = false; // 221-270
let bulletSpeedMaxDiscovered = false;  // 271-300 (slowest)

// Bullet Cooldown discoveries (79-200)
let cooldownMinDiscovered = false;     // 79-95 (rapid fire)
let cooldownLowDiscovered = false;     // 96-120
let cooldownMedDiscovered = false;     // 121-150
let cooldownHighDiscovered = false;    // 151-180
let cooldownMaxDiscovered = false;     // 181-200 (slow fire)

// Shot Offset discoveries (0-500)
let offsetMinDiscovered = false;       // 0-50
let offsetLowDiscovered = false;       // 51-150
let offsetMedDiscovered = false;       // 151-300
let offsetHighDiscovered = false;      // 301-450
let offsetMaxDiscovered = false;       // 451-500

// Bullet Size discoveries (1-3)
let bulletSizeMinDiscovered = false;   // 1.0
let bulletSizeLowDiscovered = false;   // 1.1-1.4
let bulletSizeMedDiscovered = false;   // 1.5-2.0
let bulletSizeHighDiscovered = false;  // 2.1-2.4
let bulletSizeMaxDiscovered = false;   // 2.5-3.0

// Ant Size discoveries (exact values + categories)
let antSizeMinDiscovered = false;      // 0.3
let antSizeLowDiscovered = false;      // 0.7
let antSizeMedDiscovered = false;      // 1.0
let antSizeHighDiscovered = false;     // 2.0
let antSizeMaxDiscovered = false;      // 3.0
let smallAntsDiscovered = false;       // Any < 1.0
let largeAntsDiscovered = false;       // Any > 1.0

// Distance From Anchor discoveries (0.1-1000, Keep Distance mode only)
let distanceMinDiscovered = false;     // 0.1-100
let distanceLowDiscovered = false;     // 101-250
let distanceMedDiscovered = false;     // 251-500
let distanceHighDiscovered = false;    // 501-750
let distanceMaxDiscovered = false;     // 751-1000

// Special ability discoveries
let noSpecialDiscovered = false;       // No special
let timeExplosionDiscovered = false;   // Time-based explosion
let proximityExplosionDiscovered = false; // Proximity explosion
let knockbackDiscovered = false;       // Knockback bullets
let vacuumDiscovered = false;          // Vacuum bullets (pull the beetle in at close range)
let camouflageDiscovered = false;      // Camouflage bullets (flashing opacity)
let ghostBulletDiscovered = false;     // Ghost bullets (invisible until near the beetle)
let recoilDiscovered = false;          // Recoil (firing pushes the ant back)
let launchDiscovered = false;          // Launch (recoil plus a hop into the air)

// Fire type discoveries
let normalFireDiscovered = false;      // Normal fire mode
let burstFireDiscovered = false;       // Burst fire mode
let rapidFireDiscovered = false;       // Rapid fire mode
let alternatingFireDiscovered = false; // Alternating cooldown fire mode
let hitReloadFireDiscovered = false;   // Hit reload fire mode (long cooldown, resets on hit)
let delayedBurstFireDiscovered = false; // Delayed burst fire mode (one bullet that splits into a burst)

// Explosion Fuse discoveries (40-800, Time Explosion only)
let fuseMinDiscovered = false;         // 40-250
let fuseLowDiscovered = false;         // 251-400
let fuseMedDiscovered = false;         // 401-550
let fuseHighDiscovered = false;        // 551-700
let fuseMaxDiscovered = false;         // 701-800

// Explosion Proximity discoveries (0.1-1000, Proximity Explosion only)
let proxMinDiscovered = false;         // 0.1-150
let proxLowDiscovered = false;         // 151-300
let proxMedDiscovered = false;         // 301-550
let proxHighDiscovered = false;        // 551-800
let proxMaxDiscovered = false;         // 801-1000

// Explosion Radius discoveries (0.5-3, Explosions only)
let radiusMinDiscovered = false;       // 0.5-1.0
let radiusLowDiscovered = false;       // 1.1-1.5
let radiusMedDiscovered = false;       // 1.6-2.0
let radiusHighDiscovered = false;      // 2.1-2.5
let radiusMaxDiscovered = false;       // 2.6-3.0

// Explosion Residue discoveries (0.5-3, Explosions only)
let residueMinDiscovered = false;      // 0.5-1.0
let residueLowDiscovered = false;      // 1.1-1.5
let residueMedDiscovered = false;      // 1.6-2.0
let residueHighDiscovered = false;     // 2.1-2.5
let residueMaxDiscovered = false;      // 2.6-3.0

// Knockback Multiplier discoveries (2-5, Knockback only)
let knockbackMinDiscovered = false;    // 2.0-2.5
let knockbackLowDiscovered = false;    // 2.6-3.1
let knockbackMedDiscovered = false;    // 3.2-3.8
let knockbackHighDiscovered = false;   // 3.9-4.5
let knockbackMaxDiscovered = false;    // 4.6-5.0

// Bullet Burst Count discoveries (1.5-5.5)
let burstCountMinDiscovered = false;   // 1.5-2.3
let burstCountLowDiscovered = false;   // 2.4-3.2
let burstCountMedDiscovered = false;   // 3.3-4.1
let burstCountHighDiscovered = false;  // 4.2-4.9
let burstCountMaxDiscovered = false;   // 5.0-5.5 (exotic)

// Cooldown Multiplier discoveries (0.5-5.5)
let cooldownMultiplierMinDiscovered = false; // 0.5-1.4
let cooldownMultiplierLowDiscovered = false; // 1.5-2.4
let cooldownMultiplierMedDiscovered = false; // 2.5-3.4
let cooldownMultiplierHighDiscovered = false; // 3.5-4.4
let cooldownMultiplierMaxDiscovered = false; // 4.5-5.5 (exotic)

// Bullet Death Type discovery
let landmineConversionDiscovered = false;  // Bullets convert to landmines (deathType === 1)
let smearDeathDiscovered = false;          // Bullets leave a damaging smear when they fade (deathType === -1)
let refireDeathDiscovered = false;         // Bullets fire again from where they die (deathType === 2)
let turretDeathDiscovered = false;         // Bullets become a turret that fires 3 times (deathType === 3)

// Bullet Path Type discoveries
let clockwiseCurveDiscovered = false;      // Bullets curve clockwise (pathType === -1)
let homingCurveDiscovered = false;         // Bullets curve toward player (pathType === -2)
let highArcDiscovered = false;             // Bullets arc high and land (pathType === 1)
let splitArcDiscovered = false;            // High arc bullets split into 3 at their peak
let beamDiscovered = false;                // Accelerating bullets fire a beam instead of speeding up

// Burst Spread discoveries (PI/3 to PI = 60° to 180°, Burst Fire only)
let burstSpreadMinDiscovered = false;     // 60-84°
let burstSpreadLowDiscovered = false;     // 85-109°
let burstSpreadMedDiscovered = false;     // 110-134°
let burstSpreadHighDiscovered = false;    // 135-159°
let burstSpreadMaxDiscovered = false;     // 160-180°

let showDiscoveryPopup = false;
let discoveryPopupTimer = 0;
let discoveryPopupDuration = 240; // frames (~4 seconds)
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

// Death category (mutation-based)
let deathLandmine = [];
let deathRefire = [];  // <1 = refire (dead bullets fire again once), >=1 = turret (dead bullets become a turret that fires 3 times)
let deathPotential = [];

// Path category (mutation-based)
let pathHighArc = [];
let pathCurve = [];  // <1 = curved, >=1 = homing (heat-seeking)
let pathAccelerate = [];  // Whether to use accelerating bullets (0-1, competes with pathHighArc/pathCurve)
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
let upgrade15Level = 0; // Shockwave Radius (max 5, 60→150)
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
const UPGRADE_COUNT = 27;
const UPGRADE_MAX_LEVELS = [4, 5, 5, 9, 8, 5, 5, 5, 1, 1, 1, 4, 4, 1, 5, 5, 5, 3, 4, 5, 1, 7, 10, 4, 1, 1, 1];
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


function setup() {
  
  createCanvas(windowWidth, windowHeight);
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
    bulletExplodeAfter[i] = 400; 
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
    firePotential[i] = 0.3;
    bulletBurstCount[i] = 2;
    bulletBurstSpread[i] = 1.5; // Below first cap (2.0)
    bulletBurstDelay[i] = 40;
    bulletCooldownMultiplier[i] = 2;
    // Death category (mutation-based)
    deathLandmine[i] = 0.3;
    deathRefire[i] = 0.2;
    deathPotential[i] = 0.3;
    // Path category (mutation-based)
    pathHighArc[i] = 0.1;
    pathCurve[i] = 0.1;
    pathAccelerate[i] = 0.1;
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

function triggerDiscoveryPopup() {
  showDiscoveryPopup = true;
  discoveryPopupTimer = discoveryPopupDuration;
  discoveryPopupY = windowHeight + 100;          // start off-screen
  discoveryPopupTargetY = windowHeight - 50;    // where it should slide to
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

function getNearbyCells(x, y) {
  // Get all cells within radius (current cell + 8 surrounding cells)
  let cells = [];
  let col = Math.floor(x / GRID_CELL_SIZE);
  let row = Math.floor(y / GRID_CELL_SIZE);
  
  for (let dc = -1; dc <= 1; dc++) {
    for (let dr = -1; dr <= 1; dr++) {
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
    updateAntDexEntries();
    antdexScreen();
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

  if (start == true && roundIntroTimer > 0 && roundIntroSnapshot) {
    // Round intro: everything stays frozen until the countdown finishes
    drawRoundIntro();
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
      drawEnemy();
      drawBeetle();
      drawStrikes();
      calculateBonus();
      enemyInteraction1(); // Beetle Eats Enemy
      enemyShoot1();
      drawEnemyArcExplosionLinks();
      drawEnemySmears();
      updateDeathRefires();
      drawEnemyExplosions();
      drawEnemyGroundImpacts();
      updateEnemyBeams();
      detectKeyboardInput();
      // Beetle Moves
      beetleShoot();
      beetleDash();
      handleWindAttack(); // Handle shockwave attack
      dashCollision(); // Check for dash collisions with ants
      handleAntKnockback(); // Handle knocked back ants
      drawDeathEffects();
      drawSpeedRings();
      updateComboSparks();
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
      
      // Shield regeneration (outside scaling)
      let maxShields = shieldQuantity > 0 ? shieldQuantity : 0;
      if (shield < maxShields){
        shield = shield + (1 / shieldRegenerationRate);
      }
      
      // Health regeneration - if player hasn't taken damage for 200 frames
      if (upgrade20Level > 0 && end == false) {
        if (frameCount - playerLastDamageFrame >= 200 && health < 30) {
          // Regeneration rates: 0.001, 0.005, 0.01, 0.05, 0.1
          let regenRates = [0.001, 0.005, 0.01, 0.05, 0.1];
          let regenAmount = regenRates[upgrade20Level - 1];
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
      if (frameCount % 1000 === 0 && end === false) {  // roughly every 5 seconds at 60fps
        printLiveAntRankings();
      }

  } else {
    drawStartScreen();
  }
  if (start && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    drawMobileControls();
  }
  updateAntDexEntries();
  
  if (showDiscoveryPopup) {
    const popupWidth = 300;
    const popupHeight = 100;
    const popupX = windowWidth - 150;

    discoveryPopupY = lerp(discoveryPopupY, discoveryPopupTargetY, 0.1);

    // fade out near the end of its timer
    const fadeOutStart = 60; // last 1 second
    const alpha = map(discoveryPopupTimer, 0, fadeOutStart, 0, 180, true);

    push();
    noStroke();
    fill(0, 0, 0, alpha);
    rectMode(CENTER);
    rect(popupX, discoveryPopupY, popupWidth, popupHeight, 20);

    fill(255, 255, 255, alpha + 75);
    textSize(24);
    textAlign(CENTER, CENTER);
    text("New Ant Discovered!", popupX, discoveryPopupY);
    pop();

    // Countdown
    discoveryPopupTimer--;
    if (discoveryPopupTimer <= 0) {
      showDiscoveryPopup = false;
    }
  }
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
  health = 10;
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
  upgradeRerolls = UPGRADE_REROLLS_PER_RUN;
  displayedUpgrades = [];
  updateUpgradeBooleans();  // Reset all upgrade booleans to false
}

function restartGame() {
  resetRunState();
  
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
    firePotential[i] = s.firePotential;
    bulletBurstCount[i] = s.bulletBurstCount;
    bulletBurstSpread[i] = s.bulletBurstSpread;
    bulletBurstDelay[i] = s.bulletBurstDelay ?? 40;
    bulletCooldownMultiplier[i] = s.bulletCooldownMultiplier;
    // Death category (mutation-based)
    deathLandmine[i] = s.deathLandmine;
    deathRefire[i] = s.deathRefire || 0;
    deathPotential[i] = s.deathPotential;
    // Path category (mutation-based)
    pathHighArc[i] = s.pathHighArc;
    pathCurve[i] = s.pathCurve;
    pathAccelerate[i] = s.pathAccelerate;
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
  
  debugLog("Custom ant stats applied successfully to all ants");
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
    // Ensure all core stats exist for ants created by difficulty expansion.
    if (bulletSpeed[i] === undefined) bulletSpeed[i] = 260;
    if (bulletCooldown[i] === undefined) bulletCooldown[i] = 160;
    if (antSpeed[i] === undefined) antSpeed[i] = 1.95;
    if (bulletSize[i] === undefined) bulletSize[i] = 1;
    if (shotOffsetX[i] === undefined) shotOffsetX[i] = 0;
    if (shotOffsetY[i] === undefined) shotOffsetY[i] = 0;
    if (standingPointX[i] === undefined) standingPointX[i] = width / 2;
    if (standingPointY[i] === undefined) standingPointY[i] = height / 2;
    if (distanceFromAnchor[i] === undefined) distanceFromAnchor[i] = 200;
    if (anchorOffsetX[i] === undefined) anchorOffsetX[i] = 0;
    if (anchorOffsetY[i] === undefined) anchorOffsetY[i] = 0;
    if (angleFromSpawn[i] === undefined) angleFromSpawn[i] = PI;
    if (enemyBullets[i] === undefined) enemyBullets[i] = [];
    if (antPoints[i] === undefined) antPoints[i] = 0;
    if (antLives[i] === undefined) antLives[i] = 1;
    if (antKnockedBack[i] === undefined) antKnockedBack[i] = false;
    if (antKnockbackTimer[i] === undefined) antKnockbackTimer[i] = 0;
    if (antKnockbackVelX[i] === undefined) antKnockbackVelX[i] = 0;
    if (antKnockbackVelY[i] === undefined) antKnockbackVelY[i] = 0;
    if (antStunned[i] === undefined) antStunned[i] = false;
    if (antStunTimer[i] === undefined) antStunTimer[i] = 0;
    if (antLastShotFrame[i] === undefined) antLastShotFrame[i] = 0;
    if (antAlternatingCooldownState[i] === undefined) antAlternatingCooldownState[i] = 0;
    if (antRapidFireActive[i] === undefined) antRapidFireActive[i] = false;
    if (antAirHeight[i] === undefined) antAirHeight[i] = 0;
    if (antRecoilVelX[i] === undefined) antRecoilVelX[i] = 0;
    if (antRecoilVelY[i] === undefined) antRecoilVelY[i] = 0;
    if (antRecoilAirTimer[i] === undefined) antRecoilAirTimer[i] = 0;
    if (explosionProximity[i] === undefined) explosionProximity[i] = 200;
    if (bulletExplodeAfter[i] === undefined) bulletExplodeAfter[i] = 400;
    if (bulletBurstCount[i] === undefined) bulletBurstCount[i] = 2;
    if (bulletBurstSpread[i] === undefined) bulletBurstSpread[i] = 1.5;
    if (bulletBurstDelay[i] === undefined) bulletBurstDelay[i] = 40;
    if (bulletCooldownMultiplier[i] === undefined) bulletCooldownMultiplier[i] = 2;
    if (bulletArcDuration[i] === undefined) bulletArcDuration[i] = 200;
    if (bulletCurveStrength[i] === undefined) bulletCurveStrength[i] = 0.015;
    if (bulletAccelerateDelay[i] === undefined) bulletAccelerateDelay[i] = 200;
    if (specialExplosion[i] === undefined) specialExplosion[i] = 0.2;
    if (specialKnockback[i] === undefined) specialKnockback[i] = 0.2;
    if (specialCamo[i] === undefined) specialCamo[i] = 0.2;
    if (specialRecoil[i] === undefined) specialRecoil[i] = 0.2;
    if (specialPotential[i] === undefined) specialPotential[i] = 0.3;
    if (fireBurst[i] === undefined) fireBurst[i] = 0.1;
    if (fireRapid[i] === undefined) fireRapid[i] = 0.1;
    if (fireAlternating[i] === undefined) fireAlternating[i] = 0.1;
    if (firePotential[i] === undefined) firePotential[i] = 0.3;
    if (deathLandmine[i] === undefined) deathLandmine[i] = 0.3;
    if (deathRefire[i] === undefined) deathRefire[i] = 0.2;
    if (deathPotential[i] === undefined) deathPotential[i] = 0.3;
    if (pathHighArc[i] === undefined) pathHighArc[i] = 0.1;
    if (pathCurve[i] === undefined) pathCurve[i] = 0.1;
    if (pathAccelerate[i] === undefined) pathAccelerate[i] = 0.1;
    if (pathPotential[i] === undefined) pathPotential[i] = 0.3;
    if (bulletKnockbackMultiplier[i] === undefined) bulletKnockbackMultiplier[i] = 2;
    if (bulletCamoFlashRate[i] === undefined) bulletCamoFlashRate[i] = 2.5;
    if (radiusMultiplier[i] === undefined) radiusMultiplier[i] = 1;
    if (residueMultiplier[i] === undefined) residueMultiplier[i] = 1;
    if (bulletSpread[i] === undefined) bulletSpread[i] = 0;
    if (bulletSplitCount[i] === undefined) bulletSplitCount[i] = 1;
    if (antRapidFireCount[i] === undefined) antRapidFireCount[i] = 0;
    if (antRapidFireNextFrame[i] === undefined) antRapidFireNextFrame[i] = 0;

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
      customAntStats[i] = {
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
        firePotential: firePotential[antId],
        bulletBurstCount: bulletBurstCount[antId],
        bulletBurstSpread: bulletBurstSpread[antId],
        bulletBurstDelay: bulletBurstDelay[antId],
        bulletCooldownMultiplier: bulletCooldownMultiplier[antId],
        // Death category (mutation-based)
        deathLandmine: deathLandmine[antId],
        deathRefire: deathRefire[antId],
        deathPotential: deathPotential[antId],
        // Path category (mutation-based)
        pathHighArc: pathHighArc[antId],
        pathCurve: pathCurve[antId],
        pathAccelerate: pathAccelerate[antId],
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
  }
  debugLog("Synced actual winners to custom ant stats for viewing");
}

function returnToMainMenu() {
  resetRunState();
  antdex = false;
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
  if (level <= 3) {
    return 853;
  } else if (level <= 7) {
    return 1024;
  } else {
    return 1280;
  }
}

function getGameplayReferenceHeight() {
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
  background(196, 108, 46);
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

  if (!end) {
    timeCount -= (1 / 100);
  }
}

// Round timer in the upper left corner; turns red for the last 3 seconds
function drawRoundTimer() {
  let secondsLeft = max(0, round(timeCount));
  push();
  textAlign(LEFT, TOP);
  textSize(32);
  stroke(0);
  strokeWeight(4);
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
  addExp(points);
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
    
    if (shouldDraw) {
      // Ground shadow; shrinks and lightens as the ant rises
      let antShadowHeight = constrain(antAirHeight[i], 0, 30);
      let antShadowAlpha = map(antShadowHeight, 0, 30, 80, 40) * (fadeAmount / 255);
      let antShadowScale = (45 + (15 * antSize[i])) * map(antShadowHeight, 0, 30, 1, 0.75);
      angleMode(DEGREES);
      let antShadowAngle = atan2(playerY - antY[i], playerX - antX[i]);
      drawGroundShadow(antX[i], antY[i], antShadowScale * 0.6, antShadowScale * 0.26, antShadowAngle, antShadowAlpha);
      
      push();
        // Apply fade if Tiger Beetle is active
        if (tigerBeetleActive && tigerBeetleMoving) {
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
        fill(80, 150, 255, smallFlashAlpha);
        let smallAuraSize = antImageSize * 0.75;
        ellipse(antX[i], antY[i] - antAirHeight[i], smallAuraSize, smallAuraSize);
        pop();
      }

      // Health bar (appears for 1 second after getting hit)
      if (antLastHitTime[i] > 0) {
        let timeSinceHit = millis() - antLastHitTime[i];
        let fadeTime = 1000; // 1 second
        
        if (timeSinceHit < fadeTime) {
          push();
          let fadeFactor = map(timeSinceHit, 0, fadeTime, 1, 0);
          
          // Health bar dimensions (match dash/shockwave style)
          let barWidth = 30;
          let barHeight = 5;
          let barY = antY[i] - antAirHeight[i] + antImageSize * 0.35; // Below ant, closer
          
          // Health percentage
          let healthPercent = antHealth[i] / antMaxHealth[i];
          
          // Background (dark grey - match dash/shockwave)
          fill(50, 50, 50, 220 * fadeFactor);
          stroke(0, 255 * fadeFactor);
          strokeWeight(1);
          rect(antX[i] - barWidth / 2, barY, barWidth, barHeight, 2);
          
          // Color based on health: red (<=1, can be run over), yellow (1-1.5), yellow->green (1.5-2), green->blue (2-3)
          let barColor;
          if (antHealth[i] <= 1) {
            barColor = color(255, 50, 50); // Red
          } else if (antHealth[i] < 1.5) {
            // Yellow
            barColor = color(255, 220, 50);
          } else if (antHealth[i] < 2) {
            // Yellow to green gradient (1.5 to 2)
            let greenAmount = map(antHealth[i], 1.5, 2, 0, 1, true);
            barColor = lerpColor(color(255, 220, 50), color(50, 255, 50), greenAmount);
          } else {
            // Green to blue gradient (2 to 3)
            let blueAmount = map(antHealth[i], 2, 3, 0, 1, true);
            barColor = lerpColor(color(50, 255, 50), color(50, 150, 255), blueAmount);
          }
          
          // Fill (match dash/shockwave style with rounded corners)
          fill(red(barColor), green(barColor), blue(barColor), 240 * fadeFactor);
          stroke(0, 255 * fadeFactor);
          strokeWeight(1);
          rect(antX[i] - barWidth / 2, barY, barWidth * healthPercent, barHeight, 2);
          
          pop();
        }
      }

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

function drawBeetle(){
  // Upright shadow centered under the beetle: wider when it faces sideways, taller when it
  // faces up/down. Dimensions ease toward their target so sharp turns don't snap it.
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

  push();
    angleMode(DEGREES)
    imageMode(CENTER);
    translate(playerX, playerY);
    push()
      // When aiming, use aimAngle; otherwise use playerRotationValue
      // Both are in degrees thanks to angleMode(DEGREES) affecting atan2
      if (isAiming && freeAimEnabled) {
        rotate(aimAngle);
      } else {
        rotate(playerRotationValue);
      }
      image(beetle, 0, 0, 130, 130);
    pop()

    // Shot icons on right side - dynamic 4x4 grid (up to 16 bullets)
    let maxBullets = bulletQuantity > 0 ? bulletQuantity : 0; // No bullets until upgrade
    let bulletIconSize = 50;
    let bulletSpacing = 10;
    let bulletStartX = -55;
    let bulletStartY = -50;
    
    for (let i = 0; i < maxBullets; i++) {
      let col = i % 4;  // 4 columns
      let row = Math.floor(i / 4);  // 4 rows max
      let bx = bulletStartX + col * bulletSpacing;
      let by = bulletStartY + row * bulletSpacing;
      
      if (shot >= i + 1) {
        image(acidFull, bx, by, bulletIconSize, bulletIconSize);
      } else {
        image(acidEmpty, bx, by, bulletIconSize, bulletIconSize);
      }
    }

    // Shield icons on left side - dynamic 3x3 grid (up to 9 shields)
    let maxShields = shieldQuantity > 0 ? shieldQuantity : 0; // No shields until upgrade
    let shieldIconSize = 30;
    let shieldSpacing = 20;
    let shieldStartX = 30;
    let shieldStartY = -50;
    
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
        
        let fillPercent = 1 - (windAttackCooldown / windCooldownStat);
        
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
    }
  pop();

  // Reload shots based on bulletQuantity
  let maxShots = bulletQuantity > 0 ? bulletQuantity : 0;
  if (shot < maxShots){
    shot = shot + (1 / bulletReloadRate);
  }

}

// Freeze the next gameplay frame and count down 3-2-1 before play starts
function startRoundIntro() {
  roundIntroTimer = ROUND_INTRO_FRAMES;
  roundIntroSnapshot = null;
  roundGoTimer = 0;
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
  text(`ROUND ${level}`, windowWidth / 2, windowHeight * 0.38);

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

  //enemy one interaction
  for (let i = 1; i < enemyCount + 1; i++) {
    // Skip if ant is airborne (in the air, not just knocked back)
    if (antAirHeight[i] > 0) continue;
    
    let antHitboxSize = 20.25 + (6.75 * antSize[i]);
    if(playerX > (antX[i] - antHitboxSize) && playerY > (antY[i] - antHitboxSize) && playerX < (antX[i] + antHitboxSize) && playerY < (antY[i] + antHitboxSize)) {
      // Only run over ants with health <= 1, and only if round is active and player is alive
      if (end == false && health > 0 && antHealth[i] <= 1){
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
        
        addDeathEffect(antX[i], antY[i], scoreGained);
        antX[i] = random(0, getGameplayWidth());
        antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
        spawnX[i] = antX[i] + cos(angleFromSpawn[i]);
        spawnY[i] = antY[i] + sin(angleFromSpawn[i]);
        antHealth[i] = antMaxHealth[i];  // Reset health on respawn
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
      // Push ants with health >= 1 out of the way when walking (not dashing)
      else if (end == false && antHealth[i] >= 1 && !dash) {
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
            antHealth[i] -= 0.2;
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
              comboTime = 60;
              if (combo < 1) {
                combo = 1;
              }
              let scoreGained = addKillScore(100 * combo, 1, null);
              addDeathEffect(antX[i], antY[i], scoreGained);
              combo++;
              antHealth[i] = antMaxHealth[i]; // Reset health for respawn
            }
          }
        }
      }
    }
  }
}

function dashCollision() {
  // Only check for dash collisions when dashing
  if (!dash) return;
  
  // Use spatial grid to only check nearby ants
  let nearbyCells = getNearbyCells(playerX, playerY);
  
  for (let cell of nearbyCells) {
    for (let i of cell.ants) {
      // Skip if ant is already knocked back (can only be hit once per dash) or airborne
      if (antKnockedBack[i] || antAirHeight[i] > 0) continue;
      
      let antHitboxSize = 20.25 + (6.75 * antSize[i]);
      if(playerX > (antX[i] - antHitboxSize) && playerY > (antY[i] - antHitboxSize) && 
         playerX < (antX[i] + antHitboxSize) && playerY < (antY[i] + antHitboxSize)) {
        
        // Deal damage based on Horns upgrade (1 + 0.2 per level)
        let dashDamage = 1 + (upgrade12Level * 0.2);
        antHealth[i] -= dashDamage;
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
          comboTime = 60;
          combo++;
          calculateBonus();
          streakPoints += Math.round(comboPoints * antSize[i]);
          let scoreGained = addKillScore(100 + comboPoints, antSize[i], 'dash');
          health += antSize[i];
          addDeathEffect(antX[i], antY[i], scoreGained);
          antX[i] = random(0, getGameplayWidth());
          antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
          spawnX[i] = antX[i] + cos(angleFromSpawn[i]);
          spawnY[i] = antY[i] + sin(angleFromSpawn[i]);
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

    // Handle stun timer
    if (antStunned[i] && antStunTimer[i] > 0) {
      antStunTimer[i]--;
      if (antStunTimer[i] <= 0) {
        antStunned[i] = false;
      }
    }
  }
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
      
      // Only skip shooting new bullets if ant is stunned, but still update existing bullets
      if (!antStunned[i]) {
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
        
        // Use cooldown tracking instead of modulo for proper reset capability
        if (frameCount - antLastShotFrame[i] >= currentCooldown) {
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

            // Log bullet firing
            const volleySpeed = volley[0].trueSpeed;
            let speedTier = getBulletSpeedTier(volleySpeed);
            let fireTypeName = { '-2': 'Hit Reload', '-1': 'Alt', 0: 'Single', 1: 'Burst', 2: 'Rapid', 3: 'Delayed Burst' }[fireType] || 'Unknown';
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
        
        // Store previous air height for velocity calculation
        let previousAirHeight = bullet.airHeight || 0;
        
        // Update air height for arc trajectory
        if (pathType === 1) {
          // High arc mode: Use arcDuration and scale height with duration
          bullet.airProgress = Math.min(bullet.life / bullet.arcDuration, 1);
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
          // Accelerating bullets (pathType === 2): special rendering
          const isAccelerating = bullet.pathType === 2;
          const hasAccelerated = isAccelerating && bullet.hasAccelerated;
          
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

        if (
          bullet.x < 0 || bullet.x > getGameplayWidth() ||
          bullet.y < scoreBarHeight || bullet.y > getGameplayHeight() - expBarHeight
        ) {
          enemyBullets[i].splice(b, 1);
        } else if (
          bullet.x > playerX - 25 && bullet.x < playerX + 25 &&
          bullet.y > playerY - 25 && bullet.y < playerY + 25
        ) {
          // High arc bullets (pathType === 1) can only hit when on the ground
          if (bullet.pathType === 1 && bullet.airHeight > 1) {
            // Bullet is still in the air, can't hit yet
            continue;
          }
          
          let isKnockbackBullet = bullet.knockbackBullet || false;
          let knockbackMult = bullet.knockbackMultiplier || 1;
          // Calculate bullet speed for damage
          let bulletSpeed;
          if (bullet.pathType === 1) {
            // High arc bullets always deal damage as high-speed bullets (FAST tier)
            bulletSpeed = 10;
          } else if (bullet.pathType === -1) {
            // Curved bullets: recalculate speed based on current velocity (they accelerate as they curve)
            bulletSpeed = Math.sqrt(bullet.speedX * bullet.speedX + bullet.speedY * bullet.speedY);
          } else {
            // Normal bullets use initial speed
            bulletSpeed = bullet.trueSpeed || 5;
          }
          enemyBullets[i].splice(b, 1);
          handlePlayerHit(i, isKnockbackBullet, bullet.x, bullet.y, knockbackMult, bulletSpeed, false, bullet.size);
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
                handlePlayerHit(
                  bullet.owner,
                  true,
                  bullet.x,
                  bullet.y,
                  bullet.knockbackMultiplier || 1,
                  10,
                  false,
                  bullet.size
                );
              }
            } else {
              // Non-special high-arc bullets create a small ground impact AoE that damages the player.
              let defaultImpactRadius = 22 * bullet.size * (radiusMultiplier[bullet.owner] || 1);
              spawnEnemyGroundImpact(bullet.x, bullet.y, defaultImpactRadius, false, residueMultiplier[bullet.owner] || 1);
              let distToPlayer = dist(playerX, playerY, bullet.x, bullet.y);
              if (distToPlayer <= defaultImpactRadius) {
                handlePlayerHit(
                  bullet.owner,
                  false,
                  bullet.x,
                  bullet.y,
                  1,
                  10,
                  false,
                  bullet.size
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
          if (antAirHeight[ai] > 0) continue; // Airborne ants are above ground-level blasts
          let d = dist(mine.x, mine.y, antX[ai], antY[ai]);
          if (d <= radius) {
            antHealth[ai] -= mine.size;
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
              comboTime = 60;
              combo++;
              calculateBonus();
              streakPoints += Math.round(comboPoints * antSize[ai]);
              let scoreGained = addKillScore(100 + comboPoints, antSize[ai], 'bullet');
              health += antSize[ai];
              addDeathEffect(antX[ai], antY[ai], scoreGained);
              antX[ai] = random(0, getGameplayWidth());
              antY[ai] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
              spawnX[ai] = antX[ai] + cos(angleFromSpawn[ai]);
              spawnY[ai] = antY[ai] + sin(angleFromSpawn[ai]);
              antHealth[ai] = antMaxHealth[ai];
              antKnockedBack[ai] = false;
              antKnockbackTimer[ai] = 0;
              antStunned[ai] = false;
              antStunTimer[ai] = 0;
              antLastShotFrame[ai] = 0;
              antAlternatingCooldownState[ai] = 0;
              antAirHeight[ai] = 0;
              antRecoilVelX[ai] = 0;
              antRecoilVelY[ai] = 0;
              antRecoilAirTimer[ai] = 0;
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
          if (antAirHeight[ai] > 0) continue; // Airborne ants don't trip ground mines
          let d = dist(antX[ai], antY[ai], mine.x, mine.y);
          if (d <= (mine.explosionProximity || 0)) {
            // Apply explosion damage to nearby ants (same as time-based)
            const BASE_RADIUS = 20;
            const RADIUS_PER_SIZE = 40;
            let radius = (BASE_RADIUS + RADIUS_PER_SIZE * (mine.size - 1));
            for (let aj = 1; aj <= enemyCount; aj++) {
              if (antAirHeight[aj] > 0) continue; // Airborne ants are above ground-level blasts
              let dj = dist(mine.x, mine.y, antX[aj], antY[aj]);
              if (dj <= radius) {
                antHealth[aj] -= mine.size;
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
                  comboTime = 60;
                  combo++;
                  calculateBonus();
                  streakPoints += Math.round(comboPoints * antSize[aj]);
                  let scoreGained = addKillScore(100 + comboPoints, antSize[aj], 'bullet');
                  health += antSize[aj];
                  addDeathEffect(antX[aj], antY[aj], scoreGained);
                  antX[aj] = random(0, getGameplayWidth());
                  antY[aj] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
                  spawnX[aj] = antX[aj] + cos(angleFromSpawn[aj]);
                  spawnY[aj] = antY[aj] + sin(angleFromSpawn[aj]);
                  antHealth[aj] = antMaxHealth[aj];
                  antKnockedBack[aj] = false;
                  antKnockbackTimer[aj] = 0;
                  antStunned[aj] = false;
                  antStunTimer[aj] = 0;
                  antLastShotFrame[aj] = 0;
                  antAlternatingCooldownState[aj] = 0;
                  antAirHeight[aj] = 0;
                  antRecoilVelX[aj] = 0;
                  antRecoilVelY[aj] = 0;
                  antRecoilAirTimer[aj] = 0;
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
        if (dist(playerX, playerY, mine.x, mine.y) < hitboxSize) {
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
      if (dist(playerX, playerY, mine.x, mine.y) < hitboxSize) {
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
          if (antAirHeight[i] > 0) continue; // Airborne ants pass over mines
          let antHitboxSize = 20.25 + (6.75 * antSize[i]);
          let mineHitboxSize = (mineSize / 2);
          if (dist(antX[i], antY[i], mine.x, mine.y) < antHitboxSize + mineHitboxSize) {
            // Mine hits ant
            let damage = mine.size;
            antHealth[i] -= damage;
            
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
              comboTime = 60;
              combo++;
              calculateBonus();
              streakPoints += Math.round(comboPoints * antSize[i]);
              let scoreGained = addKillScore(100 + comboPoints, antSize[i], 'bullet');
              health += antSize[i];
              addDeathEffect(antX[i], antY[i], scoreGained);
              antX[i] = random(0, getGameplayWidth());
              antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
              spawnX[i] = antX[i] + cos(angleFromSpawn[i]);
              spawnY[i] = antY[i] + sin(angleFromSpawn[i]);
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

function handlePlayerHit(i, isKnockbackBullet = false, bulletX = 0, bulletY = 0, knockbackMult = 1, bulletSpeed = 5, isMine = false, customBulletSize = null){
  if (end == false){
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
    
    if (shield > 0){
      shield = shield - damage;
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
        if (followTarget[i] === true){
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
        if (followTarget[i] === true){
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
        if (followTarget[i] === true){
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
        if (followTarget[i] === true){
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
      if (dashPressed && !dashPrevPressed && dashReady){
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
        if (windAttackPressed && !windAttackPrevPressed && windAttackReady) {
          windAttackActive = true;
          windAttackReady = false;
          windAttackAnimRadius = 0;
          windAttackAlpha = 255;
        }
        windAttackPrevPressed = windAttackPressed;
      }

      if (isShootPressed() && shot >= 1 && shotBreak <= 0){
        shot = shot - 1;
        shotBreak = 0.1;
        playerBulletShot = true;
      }
    }
  }
  
  // Calculate ant movement vectors for followAnt behavior
  for (let i = 1; i <= enemyCount; i++) {
    antMoveX[i] = antX[i] - antPrevX[i];
    antMoveY[i] = antY[i] - antPrevY[i];
  }
  
  // Handle followAnt + followTarget ants (follow nearest ant's movement vector)
  for (let i = 1; i <= enemyCount; i++) {
    if (followTarget[i] === true && followAnt[i] === true) {
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
        if (!dashButtonTouched && dashReady) {
          if (tigerBeetleActive) {
            dash = !dash; // Toggle with Tiger Beetle
          } else {
            dash = true; // Normal burst
          }
        }
      }
      if (key === "shoot" && shot >= 1 && shotBreak <= 0) {
        shot -= 1;
        shotBreak = 0.1;
        playerBulletShot = true;
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
    playerBullets.push({
      x: playerX,
      y: playerY,
      rotation: playerRotationValue
    });
    playerBulletShot = false;
  }

  // Update bullets
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    let b = playerBullets[i];

    // Move bullet in its facing direction
    // Check if using free aim (arbitrary angle) or cardinal directions
    if (b.rotation === 90 || b.rotation === 0 || b.rotation === 270 || b.rotation === 180) {
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
      push();
      angleMode(DEGREES);
      imageMode(CENTER);
      translate(b.x, b.y);
      rotate(b.rotation);
      image(bulletImage, 0, 0, 20, 20);
      pop();
    }

    // bullet collisions - use spatial grid for optimization
    let nearbyCells = getNearbyCells(b.x, b.y);
    let bulletHit = false;
    
    for (let cell of nearbyCells) {
      if (bulletHit) break;
      
      for (let j of cell.ants) {
        // Skip if ant is airborne (in the air, not just knocked back)
        if (antAirHeight[j] > 0) continue;
        
        if (
          b.x < antX[j] + 25 &&
          b.x > antX[j] - 25 &&
          b.y < antY[j] + 25 &&
          b.y > antY[j] - 25
        ) {
          // Deal damage to ant with Potent Acid multiplier
          let bulletDamage = 1 + (upgrade13Level * 0.2);
          antHealth[j] -= bulletDamage;
          antLastHitTime[j] = millis();
          
          // Stun if damaged but not killed
          if (antHealth[j] > 0) {
            antStunned[j] = true;
            antStunTimer[j] = 30;
            antLastShotFrame[j] = frameCount; // Reset shooting cooldown
            antRapidFireActive[j] = false; // Cancel rapid fire
          }
          
          // Only kill ant if health drops to 0 or below
          if (antHealth[j] <= 0) {
            antLives[j]++;
            comboTime = 60;
            combo++;
            calculateBonus();
            streakPoints += Math.round(comboPoints * antSize[j]);
            let scoreGained = addKillScore(100 + comboPoints, antSize[j], 'bullet');
            // Only restore health if round is active and player is alive
            if (end == false && health > 0) {
              health += antSize[j];
            }
            addDeathEffect(antX[j], antY[j], scoreGained);
            antX[j] = random(0, getGameplayWidth());
            antY[j] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
            spawnX[j] = antX[j] + cos(angleFromSpawn[j]);
            spawnY[j] = antY[j] + sin(angleFromSpawn[j]);
            antHealth[j] = antMaxHealth[j];  // Reset health on respawn
            antKnockedBack[j] = false;
            antKnockbackTimer[j] = 0;
          }
          
          // Always remove bullet after hitting ant
          playerBullets.splice(i, 1);
          bulletHit = true;
          break;
        }
      }
    }

    // remove bullet if off-screen or hitting EXP bar
    if (
      b.x < 0 ||
      b.x > getGameplayWidth() ||
      b.y < scoreBarHeight ||
      b.y > getGameplayHeight() - expBarHeight
    ) {
      playerBullets.splice(i, 1);
    }
  }
}

function beetleDash(){

  //handle dash
  if (dash == true && dashReady == true) {
    playerSpeed = movementSpeed / enemyCount * dashSpeedStat;
    
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
    dashCoolDown = dashCoolDown - (1 / 100);
    //debugLog(round(dashCoolDown));
    playerSpeed = movementSpeed / enemyCount;
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
    // Calculate radius based on upgrade15Level (60 to 150 in 5 steps)
    let maxRadius = 60 + (upgrade15Level * 18); // 60, 78, 96, 114, 132, 150
    
    // Expand radius quickly (violently)
    windAttackAnimRadius += 10;
    
    if (windAttackAnimRadius >= maxRadius) {
      // Deflect enemy bullets within shockwave area (20% base, increases with Bullet Deflection upgrade)
      let deflectChance = (upgrade19Level + 1) * 0.2; // 20% base, +20% per level (0.2, 0.4, 0.6, 0.8, 1.0)
      
      // Use spatial grid to find bullets and mines in shockwave radius
      let nearbyCells = getNearbyCells(playerX, playerY);
      
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
      let windDamage = 0.5 + (upgrade16Level * 0.14); // 0.5 to 1.2 in 5 steps
      let knockbackMultiplier = 4; // 4, 6, 8, 10 in 3 steps
      
      for (let cell of nearbyCells) {
        for (let i of cell.ants) {
          // Skip if ant is airborne (in the air, not just knocked back)
          if (antAirHeight[i] > 0) continue;
          
          let distance = dist(playerX, playerY, antX[i], antY[i]);
          if (distance <= maxRadius) {
            // Deal damage
            antHealth[i] -= windDamage;
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
              comboTime = 60;
              combo++;
              calculateBonus();
              streakPoints += Math.round(comboPoints * antSize[i]);
              let scoreGained = addKillScore(100 + comboPoints, antSize[i], 'shockwave');
              health += antSize[i];
              addDeathEffect(antX[i], antY[i], scoreGained);
              antX[i] = random(0, getGameplayWidth());
              antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
              spawnX[i] = antX[i] + cos(angleFromSpawn[i]);
              spawnY[i] = antY[i] + sin(angleFromSpawn[i]);
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
            }
          }
        }
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
    
    windAttackCooldown -= (1 / 100);
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
    if (j !== index) { // don’t compare to self
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
    targetX: targetX,
    targetY: targetY,
    noDeathEffect: false, // Refired bullets skip their ant's death type
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
    fireAlternating[antIndex]
  );
  // fireBurst: <1 = Burst (tier 1), >=1 = Delayed Burst (tier 2)
  if (fireBurst[antIndex] === maxVal) return fireBurst[antIndex] >= 1 ? 3 : 1;
  if (fireRapid[antIndex] === maxVal) return 2; // Rapid
  // fireAlternating: <1 = Alternating (tier 1), >=1 = Hit Reload (tier 2)
  if (fireAlternating[antIndex] === maxVal) return fireAlternating[antIndex] >= 1 ? -2 : -1;
  return 0; // Normal (fallback)
}

function getDeathType(antIndex) {
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
  // Highest death trait wins; ties go to landmine
  if (deathLandmine[antIndex] >= (deathRefire[antIndex] || 0)) {
    // deathLandmine: <1 = Smear (tier 1), >=1 = Landmine (tier 2)
    if (deathLandmine[antIndex] >= 1) return 1; // Landmine (tier 2)
    if (deathLandmine[antIndex] > 0) return -1; // Smear (tier 1, base)
    return 0; // Fading (fallback)
  }
  // deathRefire: <1 = Refire (tier 1), >=1 = Turret (tier 2)
  return deathRefire[antIndex] >= 1 ? 3 : 2;
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

// Frame a bullet will split at (delayed burst or split arc), or null if it never splits
function getBulletSplitFrame(bullet) {
  if (bullet.delayedBurst) return bullet.delayedBurst.at;
  if (bullet.splitAtApex) return bullet.arcDuration / 2;
  return null;
}

function getPathType(antIndex) {
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
  let maxVal = Math.max(pathHighArc[antIndex], pathCurve[antIndex], pathAccelerate[antIndex]);
  
  if (pathHighArc[antIndex] === maxVal) return 1; // High Arc
  
  // For accelerate type
  if (pathAccelerate[antIndex] === maxVal) {
    return 2; // Accelerate path
  }
  
  // For curve types, use pathCurve value to determine tier
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
  bulletArcDuration: { caps: [300, 400, 500, 600], inverse: false },
  bulletCurveStrength: { caps: [0.05, 0.075, 0.1], inverse: false },
  pathCurve: { caps: [1.0, 2.0], inverse: false },  // <1 = curved, >=1 = homing
  deathLandmine: { caps: [1.0, 2.0], inverse: false },  // <1 = smear, >=1 = landmine
  deathRefire: { caps: [1.0, 2.0], inverse: false },  // <1 = refire, >=1 = turret
  fireAlternating: { caps: [1.0, 2.0], inverse: false },  // <1 = alternating, >=1 = hit reload
  fireBurst: { caps: [1.0, 2.0], inverse: false },  // <1 = burst, >=1 = delayed burst
  pathHighArc: { caps: [1.0, 2.0], inverse: false },  // <1 = high arc, >=1 = split arc
  specialKnockback: { caps: [1.0, 2.0], inverse: false },  // <1 = knockback, >=1 = vacuum
  pathAccelerate: { caps: [1.0, 2.0], inverse: false },  // <1 = accelerate, >=1 = beam
  bulletAccelerateDelay: { caps: [150, 100, 60, 30], inverse: true, start: 200 },  // Frames before acceleration (inverse: lower=better)
  
  // Explosion stats
  explosionProximity: { caps: [400, 600, 800, 1000], inverse: false },
  bulletSize: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
  radiusMultiplier: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
  residueMultiplier: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false },
  
  // Ant size
  antSize: { caps: [1.5, 2.0, 2.5, 3.0], inverse: false }
};

// Stats whose caps mark level 1 / level 2 ability thresholds rather than plain range limits
const THRESHOLD_GATED_STATS = ['specialExplosion', 'pathCurve', 'deathLandmine', 'deathRefire', 'fireAlternating', 'fireBurst', 'pathHighArc', 'pathAccelerate', 'specialKnockback', 'specialCamo', 'specialRecoil'];

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
  if (['fireBurst', 'fireRapid', 'fireAlternating', 'firePotential', 'bulletBurstCount', 'bulletBurstSpread', 'bulletBurstDelay', 'bulletCooldownMultiplier'].includes(statKey)) return 'fire';
  if (['deathLandmine', 'deathRefire', 'deathPotential'].includes(statKey)) return 'death';
  if (['pathHighArc', 'pathCurve', 'pathAccelerate', 'pathPotential', 'bulletArcDuration', 'bulletCurveStrength'].includes(statKey)) return 'path';
  return null;
}

function getDominantTraitKeyForCategory(customAnt, category) {
  const traitKeysByCategory = {
    special: ['specialExplosion', 'specialKnockback', 'specialCamo', 'specialRecoil'],
    fire: ['fireBurst', 'fireRapid', 'fireAlternating'],
    death: ['deathLandmine', 'deathRefire'],
    path: ['pathHighArc', 'pathCurve', 'pathAccelerate']
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
    bulletArcDuration: { caps: [300, 400, 500, 600], inverse: false },
    bulletCurveStrength: { caps: [0.05, 0.075, 0.1], inverse: false },
    pathCurve: { caps: [1.0, 2.0], inverse: false },  // <1 = curved, >=1 = homing

    // Death category mutation stats (can be capped)
    deathLandmine: { caps: [1.0, 2.0], inverse: false },  // <1 = smear, >=1 = landmine
    deathRefire: { caps: [1.0, 2.0], inverse: false },  // <1 = refire, >=1 = turret

    // Fire category mutation stats (can be capped)
    fireAlternating: { caps: [1.0, 2.0], inverse: false },  // <1 = alternating, >=1 = hit reload
    fireBurst: { caps: [1.0, 2.0], inverse: false },  // <1 = burst, >=1 = delayed burst
    pathHighArc: { caps: [1.0, 2.0], inverse: false },  // <1 = high arc, >=1 = split arc
    pathAccelerate: { caps: [1.0, 2.0], inverse: false },  // <1 = accelerate, >=1 = beam
    specialKnockback: { caps: [1.0, 2.0], inverse: false },  // <1 = knockback, >=1 = vacuum
    
    // Explosion stats
    explosionProximity: { caps: [400, 600, 800, 1000], inverse: false },
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
    if (statName === 'radiusMultiplier' && (specialType === 1 || pathType === 1 || deathType === -1 || isBeamAccelerate(antIndex))) return true; // Explosion, High Arc, Smear, or Beam
    if (statName === 'residueMultiplier' && (specialType === 1 || pathType === 1 || deathType === 1 || deathType === -1 || isBeamAccelerate(antIndex))) return true; // Explosion, High Arc, Landmine, Smear, or Beam
    if (statName === 'bulletExplodeAfter' && specialType === 1) return true; // Explosion
    
    // Fire category stats
    if (statName === 'bulletBurstCount' && (fireType === 1 || fireType === 3)) return true; // Burst or Delayed Burst
    if (statName === 'bulletBurstSpread' && (fireType === 1 || fireType === 3)) return true; // Burst or Delayed Burst
    if (statName === 'fireBurst' && (fireType === 1 || fireType === 3)) return true; // Burst or Delayed Burst (mutation stat)
    if (statName === 'bulletCooldownMultiplier' && fireType === -1) return true; // Alternating
    if (statName === 'fireAlternating' && (fireType === -1 || fireType === -2)) return true; // Alternating or Hit Reload (mutation stat)
    
    // Path category stats
    if (statName === 'bulletArcDuration' && pathType === 1) return true; // High Arc
    if (statName === 'pathHighArc' && pathType === 1) return true; // High Arc or Split Arc (mutation stat)
    if (statName === 'bulletCurveStrength' && (pathType === -1 || pathType === -2)) return true; // Clockwise or Homing
    if (statName === 'pathCurve' && (pathType === -1 || pathType === -2)) return true; // Curve (mutation stat)
    if (statName === 'pathAccelerate' && pathType === 2) return true; // Accelerate or Beam (mutation stat)

    // Death category stats
    if (statName === 'deathLandmine' && (deathType === -1 || deathType === 1)) return true; // Smear or Landmine (mutation stat)
    if (statName === 'deathRefire' && (deathType === 2 || deathType === 3)) return true; // Refire or Turret (mutation stat)
    
    // Ant size unlock varies by difficulty
    if (statName === 'antSize') {
      if ((getDifficultyTier() === 'hard' || getDifficultyTier() === 'insane') && currentRound >= 2) return true;
      if (currentRound >= 10) return true; // Easy and medium
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
      } else if (category === 'death') {
        // Ties go to landmine, matching getDeathType
        bestMutation = deathRefire[antIndex] > deathLandmine[antIndex] ? 'deathRefire' : 'deathLandmine';
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
            investment.target !== 'fireAlternating' ? fireAlternating[antIndex] : 0
          );
        } else if (investment.category === 'death') {
          maxOtherValue = Math.max(
            investment.target !== 'deathLandmine' ? deathLandmine[antIndex] : 0,
            investment.target !== 'deathRefire' ? deathRefire[antIndex] : 0
          );
        } else if (investment.category === 'path') {
          maxOtherValue = Math.max(
            investment.target !== 'pathHighArc' ? pathHighArc[antIndex] : 0,
            investment.target !== 'pathCurve' ? pathCurve[antIndex] : 0,
            investment.target !== 'pathAccelerate' ? pathAccelerate[antIndex] : 0
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
    bulletArcDuration: { caps: [300, 400, 500, 600], inverse: false },
    bulletCurveStrength: { caps: [0.05, 0.075, 0.1], inverse: false },
    pathCurve: { caps: [1.0, 2.0], inverse: false },  // <1 = curved, >=1 = homing

    // Death category mutation stats (can be capped)
    deathLandmine: { caps: [1.0, 2.0], inverse: false },  // <1 = smear, >=1 = landmine
    deathRefire: { caps: [1.0, 2.0], inverse: false },  // <1 = refire, >=1 = turret

    // Fire category mutation stats (can be capped)
    fireAlternating: { caps: [1.0, 2.0], inverse: false },  // <1 = alternating, >=1 = hit reload
    fireBurst: { caps: [1.0, 2.0], inverse: false },  // <1 = burst, >=1 = delayed burst
    pathHighArc: { caps: [1.0, 2.0], inverse: false },  // <1 = high arc, >=1 = split arc
    pathAccelerate: { caps: [1.0, 2.0], inverse: false },  // <1 = accelerate, >=1 = beam
    specialKnockback: { caps: [1.0, 2.0], inverse: false },  // <1 = knockback, >=1 = vacuum
    
    // Explosion stats
    explosionProximity: { caps: [400, 600, 800, 1000], inverse: false },
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

function spawnEnemyExplosion(x, y, size, ownerId, radiusScale = 1) {
  const BASE_RADIUS     = 20;  // radius for size 1
  const RADIUS_PER_SIZE = 40;

  const BASE_LIFE       = 10;  // frames for size 1 (~0.3 sec)
  const LIFE_PER_SIZE   = 20;

  let radius  = (BASE_RADIUS + RADIUS_PER_SIZE * (size - 1)) * radiusMultiplier[ownerId] * radiusScale;
  let maxLife = (BASE_LIFE   + LIFE_PER_SIZE   * (size - 1)) * residueMultiplier[ownerId];

  enemyExplosions.push({
    x: x,
    y: y,
    radius: radius,
    maxLife: maxLife,
    life: 0,
    size: size,       // bulletSize that created it
    ownerId: ownerId  // which ant owns this explosion
  });
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

    e.life++;

    let t = e.life / e.maxLife;
    let alpha = lerp(180, 0, t);
    let currentRadius = e.radius * (0.9 + 0.2 * sin(e.life * 0.4));

    // damage player ONCE if inside

    let d = dist(playerX, playerY, e.x, e.y);
    if (d < currentRadius) {
      // every frame the beetle is inside, do a “tick” of damage
      handleExplosionDamage(e.size, e.ownerId);
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
  let damage = size/60; // same “units” as bulletSize

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

function autonomousAntMovement(){
  for (let i = 1; i <= enemyCount; i++) {
    // Skip knocked back ants - they use knockback movement instead
    if (antKnockedBack[i]) continue;
    
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
    // Skip knocked back ants
    if (antKnockedBack[i]) continue;
    
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
      fill(255, 255, 0, t.opacity);
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
    stroke(80, 255, 120, alpha); // Bright green
    
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
    }
    if (liveRankingsPrinted === false){
      printLiveAntRankings();
      printWinningAntStats();
      liveRankingsPrinted = true;
    }

    end = true;

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
      text(`Round ${intermissionRound} Cleared`, getMenuWidth() / 2, getMenuHeight() * 0.30);

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
      description: 'Increase shockwave radius. Each level adds 18 pixels (60→150). Requires Shockwave.',
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
      description: 'Shockwave deflects enemy bullets into player bullets. Starts at 20%, +20% per level (20%→100%). Requires Shockwave.',
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
        const cur = ((level + 1) * 0.2 * 100).toFixed(0) + '%';
        const nxt = ((nextLevel + 1) * 0.2 * 100).toFixed(0) + '%';
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
      case 18:{ cur = `${((level + 1) * 0.2 * 100).toFixed(0)}%`; nxt = `${((nextLevel + 1) * 0.2 * 100).toFixed(0)}%`; break; }
      case 19:{ const rates=[0,0.001,0.005,0.01,0.05,0.1]; cur = `${rates[level]}`; nxt = `${rates[nextLevel]}`; break; }
      case 20:{ cur = level > 0 ? 'ON' : 'OFF'; nxt = 'ON'; break; }
      case 21:{ cur = `-${level * 10}%`; nxt = `-${nextLevel * 10}%`; break; }
      case 22:{ cur = `+${level * 10}%`; nxt = `+${nextLevel * 10}%`; break; }
      case 23:{ cur = `every ${5 - level}`; nxt = `every ${5 - nextLevel}`; break; }
      case 24:
      case 25:
      case 26:{ cur = level > 0 ? 'ON' : 'OFF'; nxt = 'ON'; break; }
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

// Rarity of each upgrade: weight is its relative chance to be offered
function getUpgradeRarity(upgradeId) {
  if (upgradeId === 20) return { label: 'ULTRA RARE', weight: 0.1, color: [255, 180, 0] };
  if (upgradeId >= 24 && upgradeId <= 26) return { label: 'VERY RARE', weight: 0.2, color: [200, 90, 255] };
  return { label: '', weight: 1, color: null };
}

// Whether an upgrade's prerequisites are met
function isUpgradeUnlocked(i) {
  if (i === 5 && upgrade4Level === 0) return false;  // Shield Regeneration requires Add Shield
  if (i === 6 && upgrade5Level === 0) return false;  // Bullet Reload requires Add Bullets
  if (i === 7 && upgrade5Level === 0) return false;  // Bullet Speed requires Add Bullets
  if (i === 8 && (upgrade5Level === 0 || upgrade7Level === 0 || upgrade8Level === 0)) return false;  // Free-Angle Aiming requires Add Bullets, Bullet Reload, and Bullet Speed
  if (i === 9 && upgrade3Level < 5) return false;  // Tiger Beetle requires Dash Cooldown maxed
  if (i === 10 && upgrade7Level < 3) return false;  // Oogpister Beetle requires Bullet Reload level 3+
  if (i === 11 && level <= 5) return false;  // Horns unlocks after round 5
  if (i === 12 && upgrade5Level === 0) return false;  // Potent Acid requires Add Bullets
  if (i === 12 && level <= 5) return false;  // Potent Acid unlocks after round 5
  if (i === 13 && level <= 5) return false;  // Shockwave unlocks after round 5
  if (i === 14 && upgrade14Level === 0) return false;  // Shockwave Radius requires Shockwave Unlock
  if (i === 15 && upgrade14Level === 0) return false;  // Shockwave Damage requires Shockwave Unlock
  if (i === 16 && upgrade14Level === 0) return false;  // Shockwave Cooldown requires Shockwave Unlock
  if (i === 17) return false;  // Shockwave Knockback removed (now constant)
  if (i === 18 && upgrade14Level === 0) return false;  // Bullet Deflection requires Shockwave Unlock
  if (i === 19 && level <= 5) return false;  // Health Regeneration unlocks after round 5
  if (i === 25 && upgrade14Level === 0) return false;  // Shockwave Harvest requires Shockwave Unlock
  if (i === 26 && upgrade5Level === 0) return false;  // Bullet Harvest requires Add Bullets
  return true;
}

// Fill displayedUpgrades with up to 3 unmaxed, unlocked upgrades, weighted by rarity.
// Upgrades in `exclude` are only offered once nothing else is left.
function pickUpgradeOptions(exclude = []) {
  let upgradeLevels = [upgrade1Level, upgrade2Level, upgrade3Level, upgrade4Level, upgrade5Level, upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level, upgrade21Level, upgrade22Level, upgrade23Level, upgrade24Level, upgrade25Level, upgrade26Level, upgrade27Level];
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
  let upgradeLevels = [upgrade1Level, upgrade2Level, upgrade3Level, upgrade4Level, upgrade5Level, upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level, upgrade21Level, upgrade22Level, upgrade23Level, upgrade24Level, upgrade25Level, upgrade26Level, upgrade27Level];
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
  let levels = [upgrade1Level, upgrade2Level, upgrade3Level, upgrade4Level, upgrade5Level, upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level, upgrade21Level, upgrade22Level, upgrade23Level, upgrade24Level, upgrade25Level, upgrade26Level, upgrade27Level];
  let upgradeNames = ['Walking Speed', 'Dash Speed', 'Dash Cooldown', 'Add Shield', 'Add Bullets', 'Shield Regeneration', 'Bullet Reload', 'Bullet Speed', 'Free-Angle Aiming', 'Tiger Beetle', 'Oogpister Beetle', 'Horns', 'Potent Acid', 'Shockwave', 'Shockwave Radius', 'Shockwave Damage', 'Shockwave Cooldown', 'Shockwave Knockback', 'Bullet Deflection', 'Health Regeneration', 'Runt Hunter', 'Increased Metabolism', 'EXP Boost', 'Combo Surge', 'Dash Harvest', 'Shockwave Harvest', 'Bullet Harvest'];
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
  landMines = [];
  speedRings = [];
  enemyExplosions = [];
  enemyArcExplosionLinks = [];
  enemyGroundImpacts = [];
  enemySmears = [];
  deathRefires = [];
  enemyBeams = [];
  deathAnimations = [];
  floatingTexts = [];
  flashingEntities = [];
}

function nextRound(){
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
  health = 10;
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
  
  // antSize mutation rate: varies by difficulty (hard/insane: round 2+, easy/medium: round 10+)
  let antSizeMutationRate = 0;
  if ((getDifficultyTier() === 'hard' || getDifficultyTier() === 'insane') && level >= 2) {
    antSizeMutationRate = 0.2;
  } else if (level >= 10) {
    antSizeMutationRate = 0.2;
  }

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
        const sUsesHighArc = s.pathPotential > 0.5 && s.pathHighArc >= s.pathCurve && s.pathHighArc >= s.pathAccelerate;
        const sUsesLandmine = s.deathPotential > 0.5 && s.deathLandmine > 0 && s.deathLandmine >= (s.deathRefire || 0);
        const sUsesSmear = sUsesLandmine && s.deathLandmine < 1;
        const sUsesBeam = s.pathPotential > 0.5 && s.pathAccelerate >= 1 && s.pathAccelerate >= s.pathHighArc && s.pathAccelerate >= s.pathCurve;
        if (sUsesExplosion || sUsesHighArc || sUsesSmear || sUsesBeam) {
          radiusMultiplier[i] = constrain(s.radiusMultiplier + random(-0.2, 0.2), 0.5, 3);
        } else {
          radiusMultiplier[i] = s.radiusMultiplier;
        }
        if (sUsesExplosion || sUsesHighArc || sUsesLandmine || sUsesBeam) {
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
        fireRapid[i]    = constrain(s.fireRapid    + random(-movementMutationRate, movementMutationRate), 0, 1);
        fireAlternating[i]    = constrain(s.fireAlternating    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireAlternating', i, s.geneTokenInvestments || []));
        firePotential[i]    = constrain(s.firePotential    + random(-movementMutationRate, movementMutationRate), 0, 1);
        // Only mutate burst/rapid stats if parent uses burst or rapid fire
        if (s.firePotential > 0.5 && (s.fireBurst >= Math.max(s.fireRapid, s.fireAlternating) || s.fireRapid >= Math.max(s.fireBurst, s.fireAlternating))) {
          bulletBurstCount[i] = constrain(s.bulletBurstCount + random(-movementMutationRate, movementMutationRate), 1.5, getMaxAllowedValue('bulletBurstCount', i, s.geneTokenInvestments || []));
          bulletBurstSpread[i] = constrain(s.bulletBurstSpread + random(-movementMutationRate, movementMutationRate), PI/3, getMaxAllowedValue('bulletBurstSpread', i, s.geneTokenInvestments || []));
        } else {
          bulletBurstCount[i] = s.bulletBurstCount;
          bulletBurstSpread[i] = s.bulletBurstSpread;
        }
        // Only mutate burst delay if parent uses delayed burst fire
        if (s.firePotential > 0.5 && s.fireBurst >= 1 && s.fireBurst >= Math.max(s.fireRapid, s.fireAlternating)) {
          bulletBurstDelay[i] = constrain((s.bulletBurstDelay ?? 40) + random(-5, 5), DELAYED_BURST_MIN_DELAY, DELAYED_BURST_MAX_DELAY);
        } else {
          bulletBurstDelay[i] = s.bulletBurstDelay ?? 40;
        }
        // Only mutate cooldown multiplier if parent uses alternating fire
        if (s.firePotential > 0.5 && s.fireAlternating >= Math.max(s.fireBurst, s.fireRapid)) {
          bulletCooldownMultiplier[i] = constrain(s.bulletCooldownMultiplier + random(-movementMutationRate, movementMutationRate), 0.5, getMaxAllowedValue('bulletCooldownMultiplier', i, s.geneTokenInvestments || []));
        } else {
          bulletCooldownMultiplier[i] = s.bulletCooldownMultiplier;
        }
        // Death category (mutation-based)
        deathLandmine[i]    = constrain(s.deathLandmine    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathLandmine', i, s.geneTokenInvestments || []));
        deathRefire[i]    = constrain((s.deathRefire || 0)    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathRefire', i, s.geneTokenInvestments || []));
        deathPotential[i]    = constrain(s.deathPotential    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, 1);
        // Path category (mutation-based)
        pathHighArc[i]    = constrain(s.pathHighArc    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathHighArc', i, s.geneTokenInvestments || []));
        pathCurve[i]    = constrain(s.pathCurve    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathCurve', i, s.geneTokenInvestments || []));
        pathAccelerate[i]    = constrain(s.pathAccelerate    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathAccelerate', i, s.geneTokenInvestments || []));
        pathPotential[i]    = constrain(s.pathPotential    + random(-movementMutationRate, movementMutationRate), 0, 1);
        // Determine dominant path trait
        let pathHighArcVal = s.pathHighArc;
        let pathCurveVal = s.pathCurve;
        let pathAccelerateVal = s.pathAccelerate;
        // Only mutate arc duration if parent uses high arc
        if (s.pathPotential > 0.5 && pathHighArcVal >= pathCurveVal && pathHighArcVal >= pathAccelerateVal) {
          bulletArcDuration[i] = constrain(s.bulletArcDuration + random(-50, 50), HIGH_ARC_MIN_DURATION, getMaxAllowedValue('bulletArcDuration', i, s.geneTokenInvestments || []));
        } else {
          bulletArcDuration[i] = s.bulletArcDuration;
        }
        // Only mutate curve strength if parent uses curve/homing path
        if (s.pathPotential > 0.5 && pathCurveVal >= pathHighArcVal && pathCurveVal >= pathAccelerateVal) {
          const maxCurve = getMaxAllowedValue('bulletCurveStrength', i, s.geneTokenInvestments || []);
          bulletCurveStrength[i] = constrain(s.bulletCurveStrength + random(-0.005, 0.005), -maxCurve, maxCurve);
        } else {
          bulletCurveStrength[i] = s.bulletCurveStrength;
        }
        // Only mutate accelerate delay if parent uses accelerating bullets
        if (s.pathPotential > 0.5 && pathAccelerateVal >= pathHighArcVal && pathAccelerateVal >= pathCurveVal) {
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
        const parentUsesHighArc = pathPotential[parent.id] > 0.5 && pathHighArc[parent.id] >= pathCurve[parent.id] && pathHighArc[parent.id] >= pathAccelerate[parent.id];
        const parentUsesLandmine = deathPotential[parent.id] > 0.5 && deathLandmine[parent.id] > 0 && deathLandmine[parent.id] >= deathRefire[parent.id];
        const parentUsesSmear = parentUsesLandmine && deathLandmine[parent.id] < 1;
        const parentUsesBeam = isBeamAccelerate(parent.id);
        if (parentUsesExplosion || parentUsesHighArc || parentUsesSmear || parentUsesBeam) {
          radiusMultiplier[i] = constrain(radiusMultiplier[parent.id] + random(-0.2, 0.2), 0.5, 3);
        } else {
          radiusMultiplier[i] = radiusMultiplier[parent.id];
        }
        if (parentUsesExplosion || parentUsesHighArc || parentUsesLandmine || parentUsesBeam) {
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
        fireRapid[i]    = constrain(fireRapid[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, 1);
        fireAlternating[i]    = constrain(fireAlternating[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireAlternating', parent.id));
        firePotential[i]    = constrain(firePotential[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, 1);
        // Only mutate burst/rapid stats if parent uses burst or rapid fire
        if (firePotential[parent.id] > 0.5 && (fireBurst[parent.id] >= Math.max(fireRapid[parent.id], fireAlternating[parent.id]) || fireRapid[parent.id] >= Math.max(fireBurst[parent.id], fireAlternating[parent.id]))) {
          bulletBurstCount[i] = constrain(bulletBurstCount[parent.id] + random(-movementMutationRate, movementMutationRate), 1.5, getMaxAllowedValue('bulletBurstCount', parent.id));
          bulletBurstSpread[i] = constrain(bulletBurstSpread[parent.id] + random(-movementMutationRate, movementMutationRate), PI/3, getMaxAllowedValue('bulletBurstSpread', parent.id));
        } else {
          bulletBurstCount[i] = bulletBurstCount[parent.id];
          bulletBurstSpread[i] = bulletBurstSpread[parent.id];
        }
        // Only mutate burst delay if parent uses delayed burst fire
        if (firePotential[parent.id] > 0.5 && fireBurst[parent.id] >= 1 && fireBurst[parent.id] >= Math.max(fireRapid[parent.id], fireAlternating[parent.id])) {
          bulletBurstDelay[i] = constrain(bulletBurstDelay[parent.id] + random(-5, 5), DELAYED_BURST_MIN_DELAY, DELAYED_BURST_MAX_DELAY);
        } else {
          bulletBurstDelay[i] = bulletBurstDelay[parent.id];
        }
        // Only mutate cooldown multiplier if parent uses alternating fire
        if (firePotential[parent.id] > 0.5 && fireAlternating[parent.id] >= Math.max(fireBurst[parent.id], fireRapid[parent.id])) {
          bulletCooldownMultiplier[i] = constrain(bulletCooldownMultiplier[parent.id] + random(-movementMutationRate, movementMutationRate), 0.5, getMaxAllowedValue('bulletCooldownMultiplier', parent.id));
        } else {
          bulletCooldownMultiplier[i] = bulletCooldownMultiplier[parent.id];
        }
        // Death category (mutation-based)
        deathLandmine[i]    = constrain(deathLandmine[parent.id]    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathLandmine', parent.id));
        deathRefire[i]    = constrain(deathRefire[parent.id]    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, getMaxAllowedValue('deathRefire', parent.id));
        deathPotential[i]    = constrain(deathPotential[parent.id]    + random(-(movementMutationRate/2), (movementMutationRate/2)), 0, 1);
        // Path category (mutation-based)
        pathHighArc[i]    = constrain(pathHighArc[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathHighArc', parent.id));
        pathCurve[i]    = constrain(pathCurve[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathCurve', parent.id));
        pathAccelerate[i]    = constrain(pathAccelerate[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('pathAccelerate', parent.id));
        pathPotential[i]    = constrain(pathPotential[parent.id]    + random(-movementMutationRate, movementMutationRate), 0, 1);
        // Determine dominant path trait
        let pathHighArcVal = pathHighArc[parent.id];
        let pathCurveVal = pathCurve[parent.id];
        let pathAccelerateVal = pathAccelerate[parent.id];
        // Only mutate arc duration if parent uses high arc
        if (pathPotential[parent.id] > 0.5 && pathHighArcVal >= pathCurveVal && pathHighArcVal >= pathAccelerateVal) {
          bulletArcDuration[i] = constrain(bulletArcDuration[parent.id] + random(-50, 50), HIGH_ARC_MIN_DURATION, getMaxAllowedValue('bulletArcDuration', parent.id));
        } else {
          bulletArcDuration[i] = bulletArcDuration[parent.id];
        }
        // Only mutate curve strength if parent uses curve/homing path
        if (pathPotential[parent.id] > 0.5 && pathCurveVal >= pathHighArcVal && pathCurveVal >= pathAccelerateVal) {
          const maxCurve = getMaxAllowedValue('bulletCurveStrength', parent.id);
          bulletCurveStrength[i] = constrain(bulletCurveStrength[parent.id] + random(-0.005, 0.005), -maxCurve, maxCurve);
        } else {
          bulletCurveStrength[i] = bulletCurveStrength[parent.id];
        }
        // Only mutate accelerate delay if parent uses accelerating bullets
        if (pathPotential[parent.id] > 0.5 && pathAccelerateVal >= pathHighArcVal && pathAccelerateVal >= pathCurveVal) {
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
        ? constrain(fireRapid[winner.id] + random(-movementMutationRate, movementMutationRate), 0, 1)
        : random(0, 1);
      
      fireAlternating[i] = winner
        ? constrain(fireAlternating[winner.id] + random(-movementMutationRate, movementMutationRate), 0, getMaxAllowedValue('fireAlternating', winner.id))
        : random(0, 1);
      
      firePotential[i] = winner
        ? constrain(firePotential[winner.id] + random(-movementMutationRate, movementMutationRate), 0, 1)
        : random(0, 1);
      
      // Only mutate burst/rapid stats if winner uses burst or rapid fire
      if (winner && firePotential[winner.id] > 0.5 && (fireBurst[winner.id] >= Math.max(fireRapid[winner.id], fireAlternating[winner.id]) || fireRapid[winner.id] >= Math.max(fireBurst[winner.id], fireAlternating[winner.id]))) {
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
      if (winner && firePotential[winner.id] > 0.5 && fireBurst[winner.id] >= 1 && fireBurst[winner.id] >= Math.max(fireRapid[winner.id], fireAlternating[winner.id])) {
        bulletBurstDelay[i] = constrain(bulletBurstDelay[winner.id] + random(-10, 10), DELAYED_BURST_MIN_DELAY, DELAYED_BURST_MAX_DELAY);
      } else if (winner) {
        bulletBurstDelay[i] = bulletBurstDelay[winner.id];
      } else {
        bulletBurstDelay[i] = random(DELAYED_BURST_MIN_DELAY, DELAYED_BURST_MAX_DELAY);
      }
      
      // Only mutate cooldown multiplier if winner uses alternating fire
      if (winner && firePotential[winner.id] > 0.5 && fireAlternating[winner.id] >= Math.max(fireBurst[winner.id], fireRapid[winner.id])) {
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
      
      pathPotential[i] = winner
        ? constrain(pathPotential[winner.id] + random(-movementMutationRate, movementMutationRate), 0, 1)
        : random(0, 1);
      
      // Determine dominant path trait
      let pathHighArcVal = winner ? pathHighArc[winner.id] : 0.5;
      let pathCurveVal = winner ? pathCurve[winner.id] : 0.5;
      let pathAccelerateVal = winner ? pathAccelerate[winner.id] : 0.5;
      
      // Only mutate arc duration if winner uses high arc
      if (winner && pathPotential[winner.id] > 0.5 && pathHighArcVal >= pathCurveVal && pathHighArcVal >= pathAccelerateVal) {
        bulletArcDuration[i] = constrain(bulletArcDuration[winner.id] + random(-50, 50), HIGH_ARC_MIN_DURATION, getMaxAllowedValue('bulletArcDuration', winner.id));
      } else if (winner) {
        bulletArcDuration[i] = bulletArcDuration[winner.id];
      } else {
        bulletArcDuration[i] = random(HIGH_ARC_MIN_DURATION, 600);
      }
      
      // Only mutate curve strength if winner uses curve/homing path
      if (winner && pathPotential[winner.id] > 0.5 && pathCurveVal >= pathHighArcVal && pathCurveVal >= pathAccelerateVal) {
        const maxCurve = getMaxAllowedValue('bulletCurveStrength', winner.id);
        bulletCurveStrength[i] = constrain(bulletCurveStrength[winner.id] + random(-0.005, 0.005), -maxCurve, maxCurve);
      } else if (winner) {
        bulletCurveStrength[i] = bulletCurveStrength[winner.id];
      } else {
        bulletCurveStrength[i] = random(-0.1, 0.1);
      }
      
      // Only mutate accelerate delay if winner uses accelerating bullets
      if (winner && pathPotential[winner.id] > 0.5 && pathAccelerateVal >= pathHighArcVal && pathAccelerateVal >= pathCurveVal) {
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
      const winnerUsesHighArc = winner && pathPotential[winner.id] > 0.5 && pathHighArc[winner.id] >= pathCurve[winner.id] && pathHighArc[winner.id] >= pathAccelerate[winner.id];
      if (winnerUsesExplosion) {
        bulletExplodeAfter[i] = constrain(bulletExplodeAfter[winner.id] + random(-50, 50), EXPLODE_AFTER_MIN, EXPLODE_AFTER_MAX);
      } else if (winner) {
        bulletExplodeAfter[i] = bulletExplodeAfter[winner.id];
      } else {
        bulletExplodeAfter[i] = random(EXPLODE_AFTER_MIN, EXPLODE_AFTER_MAX);
      }

      // Radius stat - only mutate if winner uses explosions or high arc
      const winnerUsesLandmine = winner && deathPotential[winner.id] > 0.5 && deathLandmine[winner.id] > 0 && deathLandmine[winner.id] >= deathRefire[winner.id];
      const winnerUsesSmear = winnerUsesLandmine && deathLandmine[winner.id] < 1;
      const winnerUsesBeam = winner && isBeamAccelerate(winner.id);
      if (winnerUsesExplosion || winnerUsesHighArc || winnerUsesSmear || winnerUsesBeam) {
        radiusMultiplier[i] = constrain(radiusMultiplier[winner.id] + random(-0.2, 0.2), 0.5, 3);
      } else if (winner) {
        radiusMultiplier[i] = radiusMultiplier[winner.id];
      } else {
        radiusMultiplier[i] = random(0.5, 3);
      }

      // Residue stat - only mutate if winner uses explosions, high arc, landmines, or beams
      if (winnerUsesExplosion || winnerUsesHighArc || winnerUsesLandmine || winnerUsesBeam) {
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
    
    if (startMenu === false && !difficultyMenu){
      imageMode(CENTER);
      image(splashScreen, getMenuWidth() / 2, getMenuHeight() / 2, getMenuHeight() * 1.4, getMenuHeight());
      if(!titlemusic.isPlaying()) {
        titlemusic.play();
      }
      if (isConfirmPressed()) {
        startMenu = true;
        menuNavigationCooldown = 20; // Prevent immediate menu selection
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
      
      // Menu navigation with arrow keys, WASD, and gamepad
      if (menuNavigationCooldown === 0) {
        if (isUpPressed()) { // Up or W
          startMenuSelection = (startMenuSelection - 1 + 3) % 3;
          menuNavigationCooldown = 10;
        } else if (isDownPressed()) { // Down or S
          startMenuSelection = (startMenuSelection + 1) % 3;
          menuNavigationCooldown = 10;
        }
      }

      // Title
      fill(255);
      textAlign(CENTER);
      textSize(70);
      text("Main Menu", getMenuWidth() / 2, getMenuHeight() * 0.20);
      
      // Menu option 0: Single Player - Card style
      let option0Y = getMenuHeight() * 0.35;
      let option0X = getMenuWidth() / 2;
      let option0W = 340;
      let option0H = 70;
      push();
        rectMode(CENTER);
        if (startMenuSelection === 0) {
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
        if (startMenuSelection === 0) {
          fill(10);  // Dark text on white
        } else {
          fill(255);  // White text on dark
        }
        textSize(32);
        textAlign(CENTER, CENTER);
        text("Single Player", option0X, option0Y);
      pop();
      
      // Menu option 1: Multiplayer - Card style
      let option1Y = getMenuHeight() * 0.47;
      let option1X = getMenuWidth() / 2;
      let option1W = 340;
      let option1H = 80;
      push();
        rectMode(CENTER);
        if (startMenuSelection === 1) {
          fill(255);  // White background for selected
          stroke(100, 255, 100);  // Green stroke
          strokeWeight(3);
        } else {
          fill(50, 50, 50);  // Dark grey for unselected
          stroke(100, 100, 100);
          strokeWeight(2);
        }
        rect(option1X, option1Y, option1W, option1H, 12);
        
        // Text
        if (startMenuSelection === 1) {
          fill(10);  // Dark text on white
        } else {
          fill(255);  // White text on dark
        }
        textSize(32);
        textAlign(CENTER, CENTER);
        text("Multiplayer", option1X, option1Y);
      pop();
      
      // Menu option 2: Antdex - Card style
      let option2Y = getMenuHeight() * 0.59;
      let option2X = getMenuWidth() / 2;
      let option2W = 340;
      let option2H = 70;
      push();
        rectMode(CENTER);
        if (startMenuSelection === 2) {
          fill(255);  // White background for selected
          stroke(160, 120, 255);  // Purple stroke like exotic tab
          strokeWeight(3);
        } else {
          fill(50, 50, 50);  // Dark grey for unselected
          stroke(100, 100, 100);
          strokeWeight(2);
        }
        rect(option2X, option2Y, option2W, option2H, 12);
        
        // Text
        if (startMenuSelection === 2) {
          fill(10);  // Dark text on white
        } else {
          fill(255);  // White text on dark
        }
        textSize(32);
        textAlign(CENTER, CENTER);
        text("Antdex", option2X, option2Y);
      pop();
      
      // Instructions with fade
      let fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
      fill(200, fadeAlpha);
      textSize(18);
      textAlign(CENTER);
      text('W/S or ↑/↓ or Left Stick  Navigate  |  Enter or A  Confirm', getMenuWidth() / 2, getMenuHeight() * 0.72);

      // Mouse click detection
      if (mouseIsPressed) {
        let mx = getMenuMouseX();
        let my = getMenuMouseY();
        
        // Check option 0 (Single Player)
        if (mx > option0X - option0W/2 && mx < option0X + option0W/2 &&
            my > option0Y - option0H/2 && my < option0Y + option0H/2) {
          if (menuNavigationCooldown === 0) {
            pendingGameMode = 'single';
            openDifficultyMenu();
            startMenu = false;
            menuNavigationCooldown = 20;
          }
        } 
        // Check option 1 (Multiplayer)
        else if (mx > option1X - option1W/2 && mx < option1X + option1W/2 &&
                 my > option1Y - option1H/2 && my < option1Y + option1H/2) {
          if (menuNavigationCooldown === 0) {
            pendingGameMode = 'multiplayer';
            openDifficultyMenu();
            startMenu = false;
            menuNavigationCooldown = 20;
          }
        }
        // Check option 2 (Antdex)
        else if (mx > option2X - option2W/2 && mx < option2X + option2W/2 &&
                 my > option2Y - option2H/2 && my < option2Y + option2H/2) {
          if (menuNavigationCooldown === 0) {
            antdex = true;
            startMenu = false;
            antdexReturnState = 'menu';
            menuNavigationCooldown = 20;
          }
        }
      }

      // Enter key to select
      if (isConfirmPressed() && menuNavigationCooldown === 0) {
        if (startMenuSelection === 0) {
          // Single Player - go to difficulty menu
          pendingGameMode = 'single';
          openDifficultyMenu();
          startMenu = false;
        } else if (startMenuSelection === 1) {
          // Multiplayer - go to difficulty menu
          pendingGameMode = 'multiplayer';
          openDifficultyMenu();
          startMenu = false;
        } else if (startMenuSelection === 2) {
          antdex = true;
          startMenu = false;
          antdexReturnState = 'menu';
        }
        menuNavigationCooldown = 20;
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
          difficultySelection = constrain(difficultySelection - 1, 1, 10);
          menuNavigationCooldown = 8;
        } else if (isRightPressed() || isDownPressed()) {
          difficultySelection = constrain(difficultySelection + 1, 1, 10);
          menuNavigationCooldown = 8;
        }
      }
      
      // Title
      fill(255);
      textAlign(CENTER);
      textSize(60);
      text("Select Difficulty", getMenuWidth() / 2, getMenuHeight() * 0.12);
      
      // Hovering a button with the mouse selects it
      if (movedX !== 0 || movedY !== 0) {
        for (let i = 1; i <= 10; i++) {
          if (pointInRect(getMenuMouseX(), getMenuMouseY(), getDifficultyButtonRect(i))) {
            difficultySelection = i;
            break;
          }
        }
      }

      // Difficulty buttons 1-10 in a row that scrolls to keep the selection centered
      difficultyScroll = lerp(difficultyScroll, difficultySelection, 0.2);
      if (abs(difficultyScroll - difficultySelection) < 0.01) difficultyScroll = difficultySelection;

      push();
        rectMode(CORNER);
        textAlign(CENTER, CENTER);
        for (let i = 1; i <= 10; i++) {
          let r = getDifficultyButtonRect(i);
          if (r.x + r.w < 0 || r.x > getMenuWidth()) continue;

          let info = getDifficultyTierInfo(i);
          let selected = (i === difficultySelection);
          let locked = !isDifficultyUnlocked(i);
          // Fade buttons out toward the screen edges
          let distFromCenter = abs((r.x + r.w / 2) - getMenuWidth() / 2);
          let edgeAlpha = constrain(map(distFromCenter, getMenuWidth() * 0.3, getMenuWidth() * 0.5, 255, 40), 40, 255);

          if (locked) {
            fill(selected ? 70 : 30, edgeAlpha);
            stroke(selected ? 255 : 90, edgeAlpha);
            strokeWeight(selected ? 4 : 2);
          } else if (selected) {
            fill(info.color[0], info.color[1], info.color[2], edgeAlpha);
            stroke(255, edgeAlpha);
            strokeWeight(4);
          } else {
            fill(45, edgeAlpha);
            stroke(info.color[0], info.color[1], info.color[2], edgeAlpha);
            strokeWeight(2);
          }
          rect(r.x, r.y, r.w, r.h, 16);

          noStroke();
          if (locked) {
            fill(110, edgeAlpha);
            textSize(64);
            text(i, r.x + r.w / 2, r.y + r.h * 0.42);
            drawLockIcon(r.x + r.w / 2, r.y + r.h * 0.8, 22, edgeAlpha);
          } else {
            fill(selected ? 20 : 230, edgeAlpha);
            textSize(64);
            text(i, r.x + r.w / 2, r.y + r.h * 0.42);
            textSize(20);
            text(info.name, r.x + r.w / 2, r.y + r.h * 0.8);
          }
        }

        // Scroll hints when more buttons are off-screen
        noStroke();
        fill(200, 160);
        textSize(40);
        if (getDifficultyButtonRect(1).x < 0) text('‹', 25, getMenuHeight() * 0.36);
        if (getDifficultyButtonRect(10).x + DIFFICULTY_BUTTON_SIZE > getMenuWidth()) text('›', getMenuWidth() - 25, getMenuHeight() * 0.36);
      pop();

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
        attributes.push('Normal ant size (can change from round 10)');
      } else if (sel <= 5) {
        attributes.push('Keep Distance movement');
        attributes.push('Normal ant size (can change from round 10)');
      } else if (sel <= 7) {
        attributes.push('Keep Distance movement');
        attributes.push('Small ants (can change from round 2)');
        attributes.push('Random starting ability');
      } else {
        attributes.push('Keep Distance movement');
        attributes.push('Tiny ants (can change from round 2)');
        attributes.push('Random starting ability');
        attributes.push('Free pre-game upgrade');
      }

      let panelX = getMenuWidth() * 0.12;
      let panelY = getMenuHeight() * 0.54;
      let panelW = getMenuWidth() * 0.76;
      let panelH = getMenuHeight() * 0.33;
      let lineH = 24;

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
          let prevCompleted = getDifficultyCompletedRound(sel - 1);
          drawLockIcon(colRightX + 11, headerY - 8, 22, 255);
          fill(255, 80, 80);
          textSize(22);
          text('Locked', colRightX + 32, headerY);
          fill(200);
          textSize(17);
          text(`Complete round ${DIFFICULTY_UNLOCK_ROUND} on`, colRightX, headerY + 40);
          text(`Difficulty ${sel - 1} to unlock`, colRightX, headerY + 64);
          fill(150);
          textSize(16);
          text(`Best on Difficulty ${sel - 1}`, colRightX, headerY + 110);
          fill(255);
          textSize(32);
          text(`${prevCompleted} / ${DIFFICULTY_UNLOCK_ROUND}`, colRightX, headerY + 146);
        }
      pop();

      // Instructions
      let fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
      fill(200, fadeAlpha);
      textSize(18);
      textAlign(CENTER);
      text('←/→ or ↑/↓ or Click  Select  |  Enter or A  Confirm  |  Esc  Back', getMenuWidth() / 2, getMenuHeight() * 0.93);
      
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
      } else if (confirmPressed) {
        // Set difficulty
        difficulty = difficultySelection;
        
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

function antdexScreen() {
  if (!antdex) return;

  beginMenuScaling();

  if (dexTabSwitchCooldown === 0) {
    if (isLeftPressed()) {
      setDexCategory('normal');
      dexTabSwitchCooldown = 10;
    } else if (isRightPressed()) {
      setDexCategory('exotic');
      dexTabSwitchCooldown = 10;
    }
  }

  const normalEntries = antDexEntries.filter(entry => entry.category === 'normal');
  const exoticEntries = antDexEntries.filter(entry => entry.category === 'exotic');
  const visibleEntries = dexCategory === 'normal' ? normalEntries : exoticEntries;

  const normalDiscovered = normalEntries.filter(entry => entry.discovered).length;
  const exoticDiscovered = exoticEntries.filter(entry => entry.discovered).length;

  progressTargetNormal = normalEntries.length === 0 ? 0 : normalDiscovered / normalEntries.length;
  progressTargetExotic = exoticEntries.length === 0 ? 0 : exoticDiscovered / exoticEntries.length;

  if (dexCategory === 'normal') {
    const diffNormal = abs(progressTargetNormal - progressDisplayNormal);
    const easingNormal = map(diffNormal, 0, 1, 0.01, 0.05, true);
    progressDisplayNormal += (progressTargetNormal - progressDisplayNormal) * easingNormal;
  }

  if (dexCategory === 'exotic') {
    const diffExotic = abs(progressTargetExotic - progressDisplayExotic);
    const easingExotic = map(diffExotic, 0, 1, 0.01, 0.05, true);
    progressDisplayExotic += (progressTargetExotic - progressDisplayExotic) * easingExotic;
  }

  imageMode(CORNER);
  fill(20);
  rect(0, 0, getMenuWidth(), getMenuHeight());

  fill(255);
  textAlign(CENTER);
  textSize(70);
  text("Antdex", getMenuWidth() / 2, 90);

  const tabWidth = 220;
  const tabHeight = 44;
  const tabSpacing = 24;
  const tabY = 150;
  const normalTabX = getMenuWidth() / 2 - tabWidth - tabSpacing / 2;
  const exoticTabX = getMenuWidth() / 2 + tabSpacing / 2;

  dexTabRegions.normal = { x: normalTabX, y: tabY - tabHeight / 2, w: tabWidth, h: tabHeight };
  dexTabRegions.exotic = { x: exoticTabX, y: tabY - tabHeight / 2, w: tabWidth, h: tabHeight };

  rectMode(CORNER);
  strokeWeight(2);

  stroke(255, 255, 255, dexCategory === 'normal' ? 180 : 80);
  fill(dexCategory === 'normal' ? color(90, 90, 90) : color(45, 45, 45));
  rect(dexTabRegions.normal.x, dexTabRegions.normal.y, tabWidth, tabHeight, 12);

  stroke(160, 120, 255, dexCategory === 'exotic' ? 200 : 80);
  fill(dexCategory === 'exotic' ? color(70, 40, 110) : color(35, 25, 55));
  rect(dexTabRegions.exotic.x, dexTabRegions.exotic.y, tabWidth, tabHeight, 12);

  noStroke();
  textAlign(CENTER, CENTER);
  textSize(26);
  fill(255);
  text("Normal Types", dexTabRegions.normal.x + tabWidth / 2, tabY);
  text("Exotic Types", dexTabRegions.exotic.x + tabWidth / 2, tabY);

  let fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
  textSize(18);
  fill(200, fadeAlpha);
  text("← or A or click for Normal • → or D or click for Exotic", getMenuWidth() / 2, tabY + 50);

  const barWidth = 360;
  const barHeight = 18;
  const barY = tabY + 110;

  rectMode(CENTER);
  textAlign(CENTER);
  textSize(24);

  if (dexCategory === 'normal') {
    fill(255);
    text(`Normal Discoveries: ${normalDiscovered} / ${normalEntries.length}`, getMenuWidth() / 2, barY - 38);
    fill(60);
    rect(getMenuWidth() / 2, barY, barWidth, barHeight, 8);

    let normalColorStart;
    let normalColorEnd;
    let normalT;
    if (progressDisplayNormal < 0.25) {
      normalColorStart = color(255, 0, 0);
      normalColorEnd = color(0, 255, 0);
      normalT = progressDisplayNormal / 0.25;
    } else if (progressDisplayNormal < 0.5) {
      normalColorStart = color(0, 255, 0);
      normalColorEnd = color(160, 32, 240);
      normalT = (progressDisplayNormal - 0.25) / 0.25;
    } else if (progressDisplayNormal < 0.75) {
      normalColorStart = color(160, 32, 240);
      normalColorEnd = color(255, 255, 255);
      normalT = (progressDisplayNormal - 0.5) / 0.25;
    } else {
      normalColorStart = color(255, 255, 255);
      normalColorEnd = color(255, 215, 0);
      normalT = map(progressDisplayNormal, 0.99, 1, 0, 1, true);
    }
    const normalFillColor = lerpColor(normalColorStart, normalColorEnd, constrain(normalT, 0, 1));

    let normalShakeX = 0;
    let normalShakeY = 0;
    if (progressDisplayNormal > 0.85 && progressDisplayNormal < 0.999) {
      normalShakeX = random(-3 * progressDisplayNormal, 3 * progressDisplayNormal);
      normalShakeY = random(-3 * progressDisplayNormal, 3 * progressDisplayNormal);
    }

    push();
    translate(normalShakeX, normalShakeY);
    fill(normalFillColor);
    noStroke();
    const normalWidth = barWidth * constrain(progressDisplayNormal, 0, 1);
    rect(getMenuWidth() / 2 - barWidth / 2 + normalWidth / 2, barY, normalWidth, barHeight, 8);
    pop();

    if (progressDisplayNormal > 0.999) {
      const normalGlow = map(sin(frameCount * 0.05), -1, 1, 50, 180);
      noFill();
      stroke(255, 215, 0, normalGlow);
      strokeWeight(10);
      rect(getMenuWidth() / 2, barY, barWidth + 9, barHeight + 6, 10);
      noStroke();
    }
  } else {
    fill(255);
    text(`Exotic Discoveries: ${exoticDiscovered} / ${exoticEntries.length}`, getMenuWidth() / 2, barY - 38);
    fill(45, 35, 70);
    rect(getMenuWidth() / 2, barY, barWidth, barHeight, 8);

    let exoticColorStart;
    let exoticColorEnd;
    let exoticT;
    if (progressDisplayExotic < 0.25) {
      exoticColorStart = color(160, 32, 240);
      exoticColorEnd = color(60, 110, 255);
      exoticT = progressDisplayExotic / 0.25;
    } else if (progressDisplayExotic < 0.5) {
      exoticColorStart = color(60, 110, 255);
      exoticColorEnd = color(35, 200, 255);
      exoticT = (progressDisplayExotic - 0.25) / 0.25;
    } else if (progressDisplayExotic < 0.75) {
      exoticColorStart = color(35, 200, 255);
      exoticColorEnd = color(255, 140, 0);
      exoticT = (progressDisplayExotic - 0.5) / 0.25;
    } else {
      exoticColorStart = color(255, 140, 0);
      exoticColorEnd = color(255, 80, 200);
      exoticT = map(progressDisplayExotic, 0.99, 1, 0, 1, true);
    }
    const exoticFillColor = lerpColor(exoticColorStart, exoticColorEnd, constrain(exoticT, 0, 1));

    let exoticShakeX = 0;
    let exoticShakeY = 0;
    if (progressDisplayExotic > 0.85 && progressDisplayExotic < 0.999) {
      exoticShakeX = random(-4 * progressDisplayExotic, 4 * progressDisplayExotic);
      exoticShakeY = random(-4 * progressDisplayExotic, 4 * progressDisplayExotic);
    }

    push();
    translate(exoticShakeX, exoticShakeY);
    fill(exoticFillColor);
    noStroke();
    const exoticWidth = barWidth * constrain(progressDisplayExotic, 0, 1);
    rect(getMenuWidth() / 2 - barWidth / 2 + exoticWidth / 2, barY, exoticWidth, barHeight, 8);
    pop();

    if (progressDisplayExotic > 0.999) {
      const exoticGlow = map(sin(frameCount * 0.07), -1, 1, 80, 200);
      noFill();
      stroke(255, 80, 200, exoticGlow);
      strokeWeight(10);
      rect(getMenuWidth() / 2, barY, barWidth + 10, barHeight + 9, 12);
      noStroke();
    }
  }

  rectMode(CORNER);

  if (isUpPressed()) dexTargetScroll += dexScrollSpeed;
  if (isDownPressed()) dexTargetScroll -= dexScrollSpeed;

  const rowHeight = 220;
  const listTop = barY + 80;
  const viewHeight = getMenuHeight() - listTop - 80;
  const totalRows = Math.ceil(visibleEntries.length / 2);
  const contentHeight = totalRows * rowHeight;
  const maxOffset = max(0, contentHeight - viewHeight);
  const minScroll = -maxOffset;

  dexTargetScroll = constrain(dexTargetScroll, minScroll, 0);
  dexScrollY = lerp(dexScrollY, dexTargetScroll, 0.2);

  const colWidth = getMenuWidth() / 2.3;
  const leftColX = getMenuWidth() / 2 - colWidth - 30;
  const rightColX = getMenuWidth() / 2 + 30;
  const baseY = listTop + dexScrollY;

  textAlign(LEFT);
  textSize(32);

  if (visibleEntries.length === 0) {
    fill(200);
    textAlign(CENTER);
    textSize(24);
    text("No entries unlocked in this tab yet.", getMenuWidth() / 2, listTop + 40);
  }

  for (let i = 0; i < visibleEntries.length; i++) {
    const entry = visibleEntries[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? leftColX : rightColX;
    const y = baseY + row * rowHeight;

    if (y > listTop - 180 && y < getMenuHeight() + 180) {
      let cardFillColor;
      let primaryTextColor;
      let secondaryTextColor;

      if (!entry.discovered) {
        cardFillColor = color(40);
        primaryTextColor = color(180);
        secondaryTextColor = color(180);
      } else if (entry.category === 'exotic') {
        cardFillColor = color(255, 204, 0);
        primaryTextColor = color(0);
        secondaryTextColor = color(40);
      } else {
        cardFillColor = color(235);
        primaryTextColor = color(10);
        secondaryTextColor = color(0, 0, 0, 160);
      }

      fill(cardFillColor);
      rect(x, y - 60, colWidth, 180, 20);

      if (entry.discovered) {
        fill(primaryTextColor);
        textSize(32);
        text(entry.name, x + 20, y - 20);
        textSize(20);
        fill(primaryTextColor);
        text(entry.desc, x + 20, y + 5, colWidth - 40, 90);

        fill(secondaryTextColor);
        textSize(18);
        text(entry.stats, x + 20, y + 100);
      } else {
        fill(primaryTextColor);
        textSize(32);
        text("???", x + 20, y - 20);

        textSize(20);
        text("?????????????????", x + 20, y + 10, colWidth - 40, 60);

        textSize(18);
        text("????????????", x + 20, y + 70);
      }
    }
  }

  if (maxOffset > 0) {
    const viewRatio = viewHeight / contentHeight;
    const barH = max(60, viewHeight * viewRatio);
    const scrollableRange = maxOffset;
    const scrollProgress = scrollableRange === 0 ? 0 : (-dexTargetScroll) / scrollableRange;
    const barY = listTop + scrollProgress * (viewHeight - barH);
    fill(100, 100, 100, 150);
    rect(getMenuWidth() - 30, barY, 10, barH, 5);
  }

  fadeAlpha = map(sin(frameCount * 0.05), -1, 1, 30, 70);
  fill(255, fadeAlpha);
  textAlign(CENTER);
  textSize(24);
  text("Esc or B  Back", getMenuWidth() / 2, getMenuHeight() - 40);

  if (isBackPressed()) {
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
    selectedDexIndex = -1;
  }
}

function pointInRect(px, py, rect) {
  return (
    px >= rect.x && px <= rect.x + rect.w &&
    py >= rect.y && py <= rect.y + rect.h
  );
}

function mousePressed() {
  // Difficulty menu: clicking a button selects it
  if (difficultyMenu) {
    for (let i = 1; i <= 10; i++) {
      if (pointInRect(getMenuMouseX(), getMenuMouseY(), getDifficultyButtonRect(i))) {
        difficultySelection = i;
        return;
      }
    }
  }

  // Handle upgrade menu clicks
  if (upgradeMenuActive) {
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

  const normalTab = dexTabRegions.normal;
  const exoticTab = dexTabRegions.exotic;

  if (pointInRect(getMenuMouseX(), getMenuMouseY(), normalTab)) {
    setDexCategory('normal');
    dexTabSwitchCooldown = 10;
  } else if (pointInRect(getMenuMouseX(), getMenuMouseY(), exoticTab)) {
    setDexCategory('exotic');
    dexTabSwitchCooldown = 10;
  }
}

function updateAntDexEntries() {
  //checks for and stores previously discovered ants
  
  // Movement Type 1-8
  if (movementType1Discovered === true) storeItem('movementType1PreviouslyDiscovered', movementType1Discovered);
  if (getItem('movementType1PreviouslyDiscovered') === true) movementType1Discovered = getItem('movementType1PreviouslyDiscovered');
  
  if (movementType2Discovered === true) storeItem('movementType2PreviouslyDiscovered', movementType2Discovered);
  if (getItem('movementType2PreviouslyDiscovered') === true) movementType2Discovered = getItem('movementType2PreviouslyDiscovered');
  
  if (movementType3Discovered === true) storeItem('movementType3PreviouslyDiscovered', movementType3Discovered);
  if (getItem('movementType3PreviouslyDiscovered') === true) movementType3Discovered = getItem('movementType3PreviouslyDiscovered');
  
  if (movementType4Discovered === true) storeItem('movementType4PreviouslyDiscovered', movementType4Discovered);
  if (getItem('movementType4PreviouslyDiscovered') === true) movementType4Discovered = getItem('movementType4PreviouslyDiscovered');
  
  if (movementType5Discovered === true) storeItem('movementType5PreviouslyDiscovered', movementType5Discovered);
  if (getItem('movementType5PreviouslyDiscovered') === true) movementType5Discovered = getItem('movementType5PreviouslyDiscovered');
  
  if (movementType6Discovered === true) storeItem('movementType6PreviouslyDiscovered', movementType6Discovered);
  if (getItem('movementType6PreviouslyDiscovered') === true) movementType6Discovered = getItem('movementType6PreviouslyDiscovered');
  
  if (movementType7Discovered === true) storeItem('movementType7PreviouslyDiscovered', movementType7Discovered);
  if (getItem('movementType7PreviouslyDiscovered') === true) movementType7Discovered = getItem('movementType7PreviouslyDiscovered');
  
  if (movementType8Discovered === true) storeItem('movementType8PreviouslyDiscovered', movementType8Discovered);
  if (getItem('movementType8PreviouslyDiscovered') === true) movementType8Discovered = getItem('movementType8PreviouslyDiscovered');

  // Ant Speed (9-13)
  if (antSpeedMinDiscovered === true) storeItem('antSpeedMinPreviouslyDiscovered', antSpeedMinDiscovered);
  if (getItem('antSpeedMinPreviouslyDiscovered') === true) antSpeedMinDiscovered = getItem('antSpeedMinPreviouslyDiscovered');
  
  if (antSpeedLowDiscovered === true) storeItem('antSpeedLowPreviouslyDiscovered', antSpeedLowDiscovered);
  if (getItem('antSpeedLowPreviouslyDiscovered') === true) antSpeedLowDiscovered = getItem('antSpeedLowPreviouslyDiscovered');
  
  if (antSpeedMedDiscovered === true) storeItem('antSpeedMedPreviouslyDiscovered', antSpeedMedDiscovered);
  if (getItem('antSpeedMedPreviouslyDiscovered') === true) antSpeedMedDiscovered = getItem('antSpeedMedPreviouslyDiscovered');
  
  if (antSpeedHighDiscovered === true) storeItem('antSpeedHighPreviouslyDiscovered', antSpeedHighDiscovered);
  if (getItem('antSpeedHighPreviouslyDiscovered') === true) antSpeedHighDiscovered = getItem('antSpeedHighPreviouslyDiscovered');
  
  if (antSpeedMaxDiscovered === true) storeItem('antSpeedMaxPreviouslyDiscovered', antSpeedMaxDiscovered);
  if (getItem('antSpeedMaxPreviouslyDiscovered') === true) antSpeedMaxDiscovered = getItem('antSpeedMaxPreviouslyDiscovered');

  // Bullet Speed (14-18)
  if (bulletSpeedMinDiscovered === true) storeItem('bulletSpeedMinPreviouslyDiscovered', bulletSpeedMinDiscovered);
  if (getItem('bulletSpeedMinPreviouslyDiscovered') === true) bulletSpeedMinDiscovered = getItem('bulletSpeedMinPreviouslyDiscovered');
  
  if (bulletSpeedLowDiscovered === true) storeItem('bulletSpeedLowPreviouslyDiscovered', bulletSpeedLowDiscovered);
  if (getItem('bulletSpeedLowPreviouslyDiscovered') === true) bulletSpeedLowDiscovered = getItem('bulletSpeedLowPreviouslyDiscovered');
  
  if (bulletSpeedMedDiscovered === true) storeItem('bulletSpeedMedPreviouslyDiscovered', bulletSpeedMedDiscovered);
  if (getItem('bulletSpeedMedPreviouslyDiscovered') === true) bulletSpeedMedDiscovered = getItem('bulletSpeedMedPreviouslyDiscovered');
  
  if (bulletSpeedHighDiscovered === true) storeItem('bulletSpeedHighPreviouslyDiscovered', bulletSpeedHighDiscovered);
  if (getItem('bulletSpeedHighPreviouslyDiscovered') === true) bulletSpeedHighDiscovered = getItem('bulletSpeedHighPreviouslyDiscovered');
  
  if (bulletSpeedMaxDiscovered === true) storeItem('bulletSpeedMaxPreviouslyDiscovered', bulletSpeedMaxDiscovered);
  if (getItem('bulletSpeedMaxPreviouslyDiscovered') === true) bulletSpeedMaxDiscovered = getItem('bulletSpeedMaxPreviouslyDiscovered');

  // Cooldown (19-23)
  if (cooldownMinDiscovered === true) storeItem('cooldownMinPreviouslyDiscovered', cooldownMinDiscovered);
  if (getItem('cooldownMinPreviouslyDiscovered') === true) cooldownMinDiscovered = getItem('cooldownMinPreviouslyDiscovered');
  
  if (cooldownLowDiscovered === true) storeItem('cooldownLowPreviouslyDiscovered', cooldownLowDiscovered);
  if (getItem('cooldownLowPreviouslyDiscovered') === true) cooldownLowDiscovered = getItem('cooldownLowPreviouslyDiscovered');
  
  if (cooldownMedDiscovered === true) storeItem('cooldownMedPreviouslyDiscovered', cooldownMedDiscovered);
  if (getItem('cooldownMedPreviouslyDiscovered') === true) cooldownMedDiscovered = getItem('cooldownMedPreviouslyDiscovered');
  
  if (cooldownHighDiscovered === true) storeItem('cooldownHighPreviouslyDiscovered', cooldownHighDiscovered);
  if (getItem('cooldownHighPreviouslyDiscovered') === true) cooldownHighDiscovered = getItem('cooldownHighPreviouslyDiscovered');
  
  if (cooldownMaxDiscovered === true) storeItem('cooldownMaxPreviouslyDiscovered', cooldownMaxDiscovered);
  if (getItem('cooldownMaxPreviouslyDiscovered') === true) cooldownMaxDiscovered = getItem('cooldownMaxPreviouslyDiscovered');

  // Offset (24-28)
  if (offsetMinDiscovered === true) storeItem('offsetMinPreviouslyDiscovered', offsetMinDiscovered);
  if (getItem('offsetMinPreviouslyDiscovered') === true) offsetMinDiscovered = getItem('offsetMinPreviouslyDiscovered');
  
  if (offsetLowDiscovered === true) storeItem('offsetLowPreviouslyDiscovered', offsetLowDiscovered);
  if (getItem('offsetLowPreviouslyDiscovered') === true) offsetLowDiscovered = getItem('offsetLowPreviouslyDiscovered');
  
  if (offsetMedDiscovered === true) storeItem('offsetMedPreviouslyDiscovered', offsetMedDiscovered);
  if (getItem('offsetMedPreviouslyDiscovered') === true) offsetMedDiscovered = getItem('offsetMedPreviouslyDiscovered');
  
  if (offsetHighDiscovered === true) storeItem('offsetHighPreviouslyDiscovered', offsetHighDiscovered);
  if (getItem('offsetHighPreviouslyDiscovered') === true) offsetHighDiscovered = getItem('offsetHighPreviouslyDiscovered');
  
  if (offsetMaxDiscovered === true) storeItem('offsetMaxPreviouslyDiscovered', offsetMaxDiscovered);
  if (getItem('offsetMaxPreviouslyDiscovered') === true) offsetMaxDiscovered = getItem('offsetMaxPreviouslyDiscovered');

  // Bullet Size (29-33)
  if (bulletSizeMinDiscovered === true) storeItem('bulletSizeMinPreviouslyDiscovered', bulletSizeMinDiscovered);
  if (getItem('bulletSizeMinPreviouslyDiscovered') === true) bulletSizeMinDiscovered = getItem('bulletSizeMinPreviouslyDiscovered');
  
  if (bulletSizeLowDiscovered === true) storeItem('bulletSizeLowPreviouslyDiscovered', bulletSizeLowDiscovered);
  if (getItem('bulletSizeLowPreviouslyDiscovered') === true) bulletSizeLowDiscovered = getItem('bulletSizeLowPreviouslyDiscovered');
  
  if (bulletSizeMedDiscovered === true) storeItem('bulletSizeMedPreviouslyDiscovered', bulletSizeMedDiscovered);
  if (getItem('bulletSizeMedPreviouslyDiscovered') === true) bulletSizeMedDiscovered = getItem('bulletSizeMedPreviouslyDiscovered');
  
  if (bulletSizeHighDiscovered === true) storeItem('bulletSizeHighPreviouslyDiscovered', bulletSizeHighDiscovered);
  if (getItem('bulletSizeHighPreviouslyDiscovered') === true) bulletSizeHighDiscovered = getItem('bulletSizeHighPreviouslyDiscovered');
  
  if (bulletSizeMaxDiscovered === true) storeItem('bulletSizeMaxPreviouslyDiscovered', bulletSizeMaxDiscovered);
  if (getItem('bulletSizeMaxPreviouslyDiscovered') === true) bulletSizeMaxDiscovered = getItem('bulletSizeMaxPreviouslyDiscovered');

  // Ant Size (34-38 + 73-74)
  if (antSizeMinDiscovered === true) storeItem('antSizeMinPreviouslyDiscovered', antSizeMinDiscovered);
  if (getItem('antSizeMinPreviouslyDiscovered') === true) antSizeMinDiscovered = getItem('antSizeMinPreviouslyDiscovered');
  
  if (antSizeLowDiscovered === true) storeItem('antSizeLowPreviouslyDiscovered', antSizeLowDiscovered);
  if (getItem('antSizeLowPreviouslyDiscovered') === true) antSizeLowDiscovered = getItem('antSizeLowPreviouslyDiscovered');
  
  if (antSizeMedDiscovered === true) storeItem('antSizeMedPreviouslyDiscovered', antSizeMedDiscovered);
  if (getItem('antSizeMedPreviouslyDiscovered') === true) antSizeMedDiscovered = getItem('antSizeMedPreviouslyDiscovered');
  
  if (antSizeHighDiscovered === true) storeItem('antSizeHighPreviouslyDiscovered', antSizeHighDiscovered);
  if (getItem('antSizeHighPreviouslyDiscovered') === true) antSizeHighDiscovered = getItem('antSizeHighPreviouslyDiscovered');
  
  if (antSizeMaxDiscovered === true) storeItem('antSizeMaxPreviouslyDiscovered', antSizeMaxDiscovered);
  if (getItem('antSizeMaxPreviouslyDiscovered') === true) antSizeMaxDiscovered = getItem('antSizeMaxPreviouslyDiscovered');
  
  if (smallAntsDiscovered === true) storeItem('smallAntsPreviouslyDiscovered', smallAntsDiscovered);
  if (getItem('smallAntsPreviouslyDiscovered') === true) smallAntsDiscovered = getItem('smallAntsPreviouslyDiscovered');
  
  if (largeAntsDiscovered === true) storeItem('largeAntsPreviouslyDiscovered', largeAntsDiscovered);
  if (getItem('largeAntsPreviouslyDiscovered') === true) largeAntsDiscovered = getItem('largeAntsPreviouslyDiscovered');

  // Distance From Anchor (39-43)
  if (distanceMinDiscovered === true) storeItem('distanceMinPreviouslyDiscovered', distanceMinDiscovered);
  if (getItem('distanceMinPreviouslyDiscovered') === true) distanceMinDiscovered = getItem('distanceMinPreviouslyDiscovered');
  
  if (distanceLowDiscovered === true) storeItem('distanceLowPreviouslyDiscovered', distanceLowDiscovered);
  if (getItem('distanceLowPreviouslyDiscovered') === true) distanceLowDiscovered = getItem('distanceLowPreviouslyDiscovered');
  
  if (distanceMedDiscovered === true) storeItem('distanceMedPreviouslyDiscovered', distanceMedDiscovered);
  if (getItem('distanceMedPreviouslyDiscovered') === true) distanceMedDiscovered = getItem('distanceMedPreviouslyDiscovered');
  
  if (distanceHighDiscovered === true) storeItem('distanceHighPreviouslyDiscovered', distanceHighDiscovered);
  if (getItem('distanceHighPreviouslyDiscovered') === true) distanceHighDiscovered = getItem('distanceHighPreviouslyDiscovered');
  
  if (distanceMaxDiscovered === true) storeItem('distanceMaxPreviouslyDiscovered', distanceMaxDiscovered);
  if (getItem('distanceMaxPreviouslyDiscovered') === true) distanceMaxDiscovered = getItem('distanceMaxPreviouslyDiscovered');

  // Special Abilities (44-46 + 67)
  if (noSpecialDiscovered === true) storeItem('noSpecialPreviouslyDiscovered', noSpecialDiscovered);
  if (getItem('noSpecialPreviouslyDiscovered') === true) noSpecialDiscovered = getItem('noSpecialPreviouslyDiscovered');
  
  if (timeExplosionDiscovered === true) storeItem('timeExplosionPreviouslyDiscovered', timeExplosionDiscovered);
  if (getItem('timeExplosionPreviouslyDiscovered') === true) timeExplosionDiscovered = getItem('timeExplosionPreviouslyDiscovered');
  
  if (proximityExplosionDiscovered === true) storeItem('proximityExplosionPreviouslyDiscovered', proximityExplosionDiscovered);
  if (getItem('proximityExplosionPreviouslyDiscovered') === true) proximityExplosionDiscovered = getItem('proximityExplosionPreviouslyDiscovered');
  
  if (knockbackDiscovered === true) storeItem('knockbackPreviouslyDiscovered', knockbackDiscovered);
  if (getItem('knockbackPreviouslyDiscovered') === true) knockbackDiscovered = getItem('knockbackPreviouslyDiscovered');
  if (vacuumDiscovered === true) storeItem('vacuumPreviouslyDiscovered', vacuumDiscovered);
  if (getItem('vacuumPreviouslyDiscovered') === true) vacuumDiscovered = getItem('vacuumPreviouslyDiscovered');
  if (camouflageDiscovered === true) storeItem('camouflagePreviouslyDiscovered', camouflageDiscovered);
  if (getItem('camouflagePreviouslyDiscovered') === true) camouflageDiscovered = getItem('camouflagePreviouslyDiscovered');
  if (ghostBulletDiscovered === true) storeItem('ghostBulletPreviouslyDiscovered', ghostBulletDiscovered);
  if (getItem('ghostBulletPreviouslyDiscovered') === true) ghostBulletDiscovered = getItem('ghostBulletPreviouslyDiscovered');
  if (recoilDiscovered === true) storeItem('recoilPreviouslyDiscovered', recoilDiscovered);
  if (getItem('recoilPreviouslyDiscovered') === true) recoilDiscovered = getItem('recoilPreviouslyDiscovered');
  if (launchDiscovered === true) storeItem('launchPreviouslyDiscovered', launchDiscovered);
  if (getItem('launchPreviouslyDiscovered') === true) launchDiscovered = getItem('launchPreviouslyDiscovered');

  // Fire Types
  if (alternatingFireDiscovered === true) storeItem('alternatingFirePreviouslyDiscovered', alternatingFireDiscovered);
  if (getItem('alternatingFirePreviouslyDiscovered') === true) alternatingFireDiscovered = getItem('alternatingFirePreviouslyDiscovered');
  if (hitReloadFireDiscovered === true) storeItem('hitReloadFirePreviouslyDiscovered', hitReloadFireDiscovered);
  if (getItem('hitReloadFirePreviouslyDiscovered') === true) hitReloadFireDiscovered = getItem('hitReloadFirePreviouslyDiscovered');

  if (normalFireDiscovered === true) storeItem('normalFirePreviouslyDiscovered', normalFireDiscovered);
  if (getItem('normalFirePreviouslyDiscovered') === true) normalFireDiscovered = getItem('normalFirePreviouslyDiscovered');

  if (burstFireDiscovered === true) storeItem('burstFirePreviouslyDiscovered', burstFireDiscovered);
  if (getItem('burstFirePreviouslyDiscovered') === true) burstFireDiscovered = getItem('burstFirePreviouslyDiscovered');
  if (delayedBurstFireDiscovered === true) storeItem('delayedBurstFirePreviouslyDiscovered', delayedBurstFireDiscovered);
  if (getItem('delayedBurstFirePreviouslyDiscovered') === true) delayedBurstFireDiscovered = getItem('delayedBurstFirePreviouslyDiscovered');
  
  if (rapidFireDiscovered === true) storeItem('rapidFirePreviouslyDiscovered', rapidFireDiscovered);
  if (getItem('rapidFirePreviouslyDiscovered') === true) rapidFireDiscovered = getItem('rapidFirePreviouslyDiscovered');

  // Explosion Fuse (47-51)
  if (fuseMinDiscovered === true) storeItem('fuseMinPreviouslyDiscovered', fuseMinDiscovered);
  if (getItem('fuseMinPreviouslyDiscovered') === true) fuseMinDiscovered = getItem('fuseMinPreviouslyDiscovered');
  
  if (fuseLowDiscovered === true) storeItem('fuseLowPreviouslyDiscovered', fuseLowDiscovered);
  if (getItem('fuseLowPreviouslyDiscovered') === true) fuseLowDiscovered = getItem('fuseLowPreviouslyDiscovered');
  
  if (fuseMedDiscovered === true) storeItem('fuseMedPreviouslyDiscovered', fuseMedDiscovered);
  if (getItem('fuseMedPreviouslyDiscovered') === true) fuseMedDiscovered = getItem('fuseMedPreviouslyDiscovered');
  
  if (fuseHighDiscovered === true) storeItem('fuseHighPreviouslyDiscovered', fuseHighDiscovered);
  if (getItem('fuseHighPreviouslyDiscovered') === true) fuseHighDiscovered = getItem('fuseHighPreviouslyDiscovered');
  
  if (fuseMaxDiscovered === true) storeItem('fuseMaxPreviouslyDiscovered', fuseMaxDiscovered);
  if (getItem('fuseMaxPreviouslyDiscovered') === true) fuseMaxDiscovered = getItem('fuseMaxPreviouslyDiscovered');

  // Proximity (52-56)
  if (proxMinDiscovered === true) storeItem('proxMinPreviouslyDiscovered', proxMinDiscovered);
  if (getItem('proxMinPreviouslyDiscovered') === true) proxMinDiscovered = getItem('proxMinPreviouslyDiscovered');
  
  if (proxLowDiscovered === true) storeItem('proxLowPreviouslyDiscovered', proxLowDiscovered);
  if (getItem('proxLowPreviouslyDiscovered') === true) proxLowDiscovered = getItem('proxLowPreviouslyDiscovered');
  
  if (proxMedDiscovered === true) storeItem('proxMedPreviouslyDiscovered', proxMedDiscovered);
  if (getItem('proxMedPreviouslyDiscovered') === true) proxMedDiscovered = getItem('proxMedPreviouslyDiscovered');
  
  if (proxHighDiscovered === true) storeItem('proxHighPreviouslyDiscovered', proxHighDiscovered);
  if (getItem('proxHighPreviouslyDiscovered') === true) proxHighDiscovered = getItem('proxHighPreviouslyDiscovered');
  
  if (proxMaxDiscovered === true) storeItem('proxMaxPreviouslyDiscovered', proxMaxDiscovered);
  if (getItem('proxMaxPreviouslyDiscovered') === true) proxMaxDiscovered = getItem('proxMaxPreviouslyDiscovered');

  // Explosion Radius (57-61)
  if (radiusMinDiscovered === true) storeItem('radiusMinPreviouslyDiscovered', radiusMinDiscovered);
  if (getItem('radiusMinPreviouslyDiscovered') === true) radiusMinDiscovered = getItem('radiusMinPreviouslyDiscovered');
  
  if (radiusLowDiscovered === true) storeItem('radiusLowPreviouslyDiscovered', radiusLowDiscovered);
  if (getItem('radiusLowPreviouslyDiscovered') === true) radiusLowDiscovered = getItem('radiusLowPreviouslyDiscovered');
  
  if (radiusMedDiscovered === true) storeItem('radiusMedPreviouslyDiscovered', radiusMedDiscovered);
  if (getItem('radiusMedPreviouslyDiscovered') === true) radiusMedDiscovered = getItem('radiusMedPreviouslyDiscovered');
  
  if (radiusHighDiscovered === true) storeItem('radiusHighPreviouslyDiscovered', radiusHighDiscovered);
  if (getItem('radiusHighPreviouslyDiscovered') === true) radiusHighDiscovered = getItem('radiusHighPreviouslyDiscovered');
  
  if (radiusMaxDiscovered === true) storeItem('radiusMaxPreviouslyDiscovered', radiusMaxDiscovered);
  if (getItem('radiusMaxPreviouslyDiscovered') === true) radiusMaxDiscovered = getItem('radiusMaxPreviouslyDiscovered');

  // Explosion Residue (62-66)
  if (residueMinDiscovered === true) storeItem('residueMinPreviouslyDiscovered', residueMinDiscovered);
  if (getItem('residueMinPreviouslyDiscovered') === true) residueMinDiscovered = getItem('residueMinPreviouslyDiscovered');
  
  if (residueLowDiscovered === true) storeItem('residueLowPreviouslyDiscovered', residueLowDiscovered);
  if (getItem('residueLowPreviouslyDiscovered') === true) residueLowDiscovered = getItem('residueLowPreviouslyDiscovered');
  
  if (residueMedDiscovered === true) storeItem('residueMedPreviouslyDiscovered', residueMedDiscovered);
  if (getItem('residueMedPreviouslyDiscovered') === true) residueMedDiscovered = getItem('residueMedPreviouslyDiscovered');
  
  if (residueHighDiscovered === true) storeItem('residueHighPreviouslyDiscovered', residueHighDiscovered);
  if (getItem('residueHighPreviouslyDiscovered') === true) residueHighDiscovered = getItem('residueHighPreviouslyDiscovered');
  
  if (residueMaxDiscovered === true) storeItem('residueMaxPreviouslyDiscovered', residueMaxDiscovered);
  if (getItem('residueMaxPreviouslyDiscovered') === true) residueMaxDiscovered = getItem('residueMaxPreviouslyDiscovered');

  // Knockback Multiplier (68-72)
  if (knockbackMinDiscovered === true) storeItem('knockbackMinPreviouslyDiscovered', knockbackMinDiscovered);
  if (getItem('knockbackMinPreviouslyDiscovered') === true) knockbackMinDiscovered = getItem('knockbackMinPreviouslyDiscovered');
  
  if (knockbackLowDiscovered === true) storeItem('knockbackLowPreviouslyDiscovered', knockbackLowDiscovered);
  if (getItem('knockbackLowPreviouslyDiscovered') === true) knockbackLowDiscovered = getItem('knockbackLowPreviouslyDiscovered');
  
  if (knockbackMedDiscovered === true) storeItem('knockbackMedPreviouslyDiscovered', knockbackMedDiscovered);
  if (getItem('knockbackMedPreviouslyDiscovered') === true) knockbackMedDiscovered = getItem('knockbackMedPreviouslyDiscovered');
  
  if (knockbackHighDiscovered === true) storeItem('knockbackHighPreviouslyDiscovered', knockbackHighDiscovered);
  if (getItem('knockbackHighPreviouslyDiscovered') === true) knockbackHighDiscovered = getItem('knockbackHighPreviouslyDiscovered');
  
  if (knockbackMaxDiscovered === true) storeItem('knockbackMaxPreviouslyDiscovered', knockbackMaxDiscovered);
  if (getItem('knockbackMaxPreviouslyDiscovered') === true) knockbackMaxDiscovered = getItem('knockbackMaxPreviouslyDiscovered');

  // Burst Count (1.5-5.5)
  if (burstCountMinDiscovered === true) storeItem('burstCountMinPreviouslyDiscovered', burstCountMinDiscovered);
  if (getItem('burstCountMinPreviouslyDiscovered') === true) burstCountMinDiscovered = getItem('burstCountMinPreviouslyDiscovered');
  
  if (burstCountLowDiscovered === true) storeItem('burstCountLowPreviouslyDiscovered', burstCountLowDiscovered);
  if (getItem('burstCountLowPreviouslyDiscovered') === true) burstCountLowDiscovered = getItem('burstCountLowPreviouslyDiscovered');
  
  if (burstCountMedDiscovered === true) storeItem('burstCountMedPreviouslyDiscovered', burstCountMedDiscovered);
  if (getItem('burstCountMedPreviouslyDiscovered') === true) burstCountMedDiscovered = getItem('burstCountMedPreviouslyDiscovered');
  
  if (burstCountHighDiscovered === true) storeItem('burstCountHighPreviouslyDiscovered', burstCountHighDiscovered);
  if (getItem('burstCountHighPreviouslyDiscovered') === true) burstCountHighDiscovered = getItem('burstCountHighPreviouslyDiscovered');
  
  if (burstCountMaxDiscovered === true) storeItem('burstCountMaxPreviouslyDiscovered', burstCountMaxDiscovered);
  if (getItem('burstCountMaxPreviouslyDiscovered') === true) burstCountMaxDiscovered = getItem('burstCountMaxPreviouslyDiscovered');

  // Cooldown Multiplier (0.5-5.5)
  if (cooldownMultiplierMinDiscovered === true) storeItem('cooldownMultiplierMinPreviouslyDiscovered', cooldownMultiplierMinDiscovered);
  if (getItem('cooldownMultiplierMinPreviouslyDiscovered') === true) cooldownMultiplierMinDiscovered = getItem('cooldownMultiplierMinPreviouslyDiscovered');
  
  if (cooldownMultiplierLowDiscovered === true) storeItem('cooldownMultiplierLowPreviouslyDiscovered', cooldownMultiplierLowDiscovered);
  if (getItem('cooldownMultiplierLowPreviouslyDiscovered') === true) cooldownMultiplierLowDiscovered = getItem('cooldownMultiplierLowPreviouslyDiscovered');
  
  if (cooldownMultiplierMedDiscovered === true) storeItem('cooldownMultiplierMedPreviouslyDiscovered', cooldownMultiplierMedDiscovered);
  if (getItem('cooldownMultiplierMedPreviouslyDiscovered') === true) cooldownMultiplierMedDiscovered = getItem('cooldownMultiplierMedPreviouslyDiscovered');
  
  if (cooldownMultiplierHighDiscovered === true) storeItem('cooldownMultiplierHighPreviouslyDiscovered', cooldownMultiplierHighDiscovered);
  if (getItem('cooldownMultiplierHighPreviouslyDiscovered') === true) cooldownMultiplierHighDiscovered = getItem('cooldownMultiplierHighPreviouslyDiscovered');
  
  if (cooldownMultiplierMaxDiscovered === true) storeItem('cooldownMultiplierMaxPreviouslyDiscovered', cooldownMultiplierMaxDiscovered);
  if (getItem('cooldownMultiplierMaxPreviouslyDiscovered') === true) cooldownMultiplierMaxDiscovered = getItem('cooldownMultiplierMaxPreviouslyDiscovered');

  // Bullet Death Type: Smear
  if (smearDeathDiscovered === true) storeItem('smearDeathPreviouslyDiscovered', smearDeathDiscovered);
  if (getItem('smearDeathPreviouslyDiscovered') === true) smearDeathDiscovered = getItem('smearDeathPreviouslyDiscovered');

  // Bullet Death Type: Refire
  if (refireDeathDiscovered === true) storeItem('refireDeathPreviouslyDiscovered', refireDeathDiscovered);
  if (getItem('refireDeathPreviouslyDiscovered') === true) refireDeathDiscovered = getItem('refireDeathPreviouslyDiscovered');

  // Bullet Death Type: Turret
  if (turretDeathDiscovered === true) storeItem('turretDeathPreviouslyDiscovered', turretDeathDiscovered);
  if (getItem('turretDeathPreviouslyDiscovered') === true) turretDeathDiscovered = getItem('turretDeathPreviouslyDiscovered');

  // Bullet Death Type: Landmine Conversion
  if (landmineConversionDiscovered === true) storeItem('landmineConversionPreviouslyDiscovered', landmineConversionDiscovered);
  if (getItem('landmineConversionPreviouslyDiscovered') === true) landmineConversionDiscovered = getItem('landmineConversionPreviouslyDiscovered');

  // Bullet Path Type
  if (clockwiseCurveDiscovered === true) storeItem('clockwiseCurvePreviouslyDiscovered', clockwiseCurveDiscovered);
  if (getItem('clockwiseCurvePreviouslyDiscovered') === true) clockwiseCurveDiscovered = getItem('clockwiseCurvePreviouslyDiscovered');
  
  if (homingCurveDiscovered === true) storeItem('homingCurvePreviouslyDiscovered', homingCurveDiscovered);
  if (getItem('homingCurvePreviouslyDiscovered') === true) homingCurveDiscovered = getItem('homingCurvePreviouslyDiscovered');
  
  if (highArcDiscovered === true) storeItem('highArcPreviouslyDiscovered', highArcDiscovered);
  if (getItem('highArcPreviouslyDiscovered') === true) highArcDiscovered = getItem('highArcPreviouslyDiscovered');
  if (splitArcDiscovered === true) storeItem('splitArcPreviouslyDiscovered', splitArcDiscovered);
  if (getItem('splitArcPreviouslyDiscovered') === true) splitArcDiscovered = getItem('splitArcPreviouslyDiscovered');
  if (beamDiscovered === true) storeItem('beamPreviouslyDiscovered', beamDiscovered);
  if (getItem('beamPreviouslyDiscovered') === true) beamDiscovered = getItem('beamPreviouslyDiscovered');

  // Burst Spread (88-92)
  if (burstSpreadMinDiscovered === true) storeItem('burstSpreadMinPreviouslyDiscovered', burstSpreadMinDiscovered);
  if (getItem('burstSpreadMinPreviouslyDiscovered') === true) burstSpreadMinDiscovered = getItem('burstSpreadMinPreviouslyDiscovered');
  
  if (burstSpreadLowDiscovered === true) storeItem('burstSpreadLowPreviouslyDiscovered', burstSpreadLowDiscovered);
  if (getItem('burstSpreadLowPreviouslyDiscovered') === true) burstSpreadLowDiscovered = getItem('burstSpreadLowPreviouslyDiscovered');
  
  if (burstSpreadMedDiscovered === true) storeItem('burstSpreadMedPreviouslyDiscovered', burstSpreadMedDiscovered);
  if (getItem('burstSpreadMedPreviouslyDiscovered') === true) burstSpreadMedDiscovered = getItem('burstSpreadMedPreviouslyDiscovered');
  
  if (burstSpreadHighDiscovered === true) storeItem('burstSpreadHighPreviouslyDiscovered', burstSpreadHighDiscovered);
  if (getItem('burstSpreadHighPreviouslyDiscovered') === true) burstSpreadHighDiscovered = getItem('burstSpreadHighPreviouslyDiscovered');
  
  if (burstSpreadMaxDiscovered === true) storeItem('burstSpreadMaxPreviouslyDiscovered', burstSpreadMaxDiscovered);
  if (getItem('burstSpreadMaxPreviouslyDiscovered') === true) burstSpreadMaxDiscovered = getItem('burstSpreadMaxPreviouslyDiscovered');

  
  //checks for new discoveries
  if (start === true){
    for (let i = 1; i <= enemyCount; i++) {
      // 1-8: Movement Behaviors
      if (!movementType1Discovered && followBeetle[i] && followTarget[i]) {
        movementType1Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType2Discovered && followAnt[i] && followTarget[i]) {
        movementType2Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType3Discovered && findLocation[i] && followTarget[i]) {
        movementType3Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType4Discovered && standStill[i] && followTarget[i]) {
        movementType4Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType5Discovered && followBeetle[i] && keepDistance[i]) {
        movementType5Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType6Discovered && followAnt[i] && keepDistance[i]) {
        movementType6Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType7Discovered && findLocation[i] && keepDistance[i]) {
        movementType7Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType8Discovered && standStill[i] && keepDistance[i]) {
        movementType8Discovered = true;
        triggerDiscoveryPopup();
      }

      // 9-13: Ant Speed (0.9-3.5)
      const spd = antSpeed[i];
      if (!antSpeedMinDiscovered && spd >= 0.9 && spd <= 1.2) {
        antSpeedMinDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!antSpeedLowDiscovered && spd > 1.2 && spd <= 1.7) {
        antSpeedLowDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!antSpeedMedDiscovered && spd > 1.7 && spd <= 2.3) {
        antSpeedMedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!antSpeedHighDiscovered && spd > 2.3 && spd <= 3.0) {
        antSpeedHighDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!antSpeedMaxDiscovered && spd > 3.0 && spd <= 3.5) {
        antSpeedMaxDiscovered = true;
        triggerDiscoveryPopup();
      }

      // 14-18: Bullet Speed (60-300, note: lower = faster)
      const bSpd = bulletSpeed[i];
      if (!bulletSpeedMinDiscovered && bSpd >= 60 && bSpd <= 90) {
        bulletSpeedMinDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!bulletSpeedLowDiscovered && bSpd > 90 && bSpd <= 140) {
        bulletSpeedLowDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!bulletSpeedMedDiscovered && bSpd > 140 && bSpd <= 220) {
        bulletSpeedMedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!bulletSpeedHighDiscovered && bSpd > 220 && bSpd <= 270) {
        bulletSpeedHighDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!bulletSpeedMaxDiscovered && bSpd > 270 && bSpd <= 300) {
        bulletSpeedMaxDiscovered = true;
        triggerDiscoveryPopup();
      }

      // 19-23: Bullet Cooldown (79-200)
      const cd = bulletCooldown[i];
      if (!cooldownMinDiscovered && cd >= 79 && cd <= 95) {
        cooldownMinDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!cooldownLowDiscovered && cd > 95 && cd <= 120) {
        cooldownLowDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!cooldownMedDiscovered && cd > 120 && cd <= 150) {
        cooldownMedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!cooldownHighDiscovered && cd > 150 && cd <= 180) {
        cooldownHighDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!cooldownMaxDiscovered && cd > 180 && cd <= 200) {
        cooldownMaxDiscovered = true;
        triggerDiscoveryPopup();
      }

      // 24-28: Shot Offset (0-500)
      const offset = Math.max(Math.abs(shotOffsetX[i]), Math.abs(shotOffsetY[i]));
      if (!offsetMinDiscovered && offset >= 0 && offset <= 50) {
        offsetMinDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!offsetLowDiscovered && offset > 50 && offset <= 150) {
        offsetLowDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!offsetMedDiscovered && offset > 150 && offset <= 300) {
        offsetMedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!offsetHighDiscovered && offset > 300 && offset <= 450) {
        offsetHighDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!offsetMaxDiscovered && offset > 450 && offset <= 500) {
        offsetMaxDiscovered = true;
        triggerDiscoveryPopup();
      }

      // 29-33: Bullet Size (1-3)
      const bSize = bulletSize[i];
      if (!bulletSizeMinDiscovered && bSize === 1.0) {
        bulletSizeMinDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!bulletSizeLowDiscovered && bSize > 1.0 && bSize <= 1.4) {
        bulletSizeLowDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!bulletSizeMedDiscovered && bSize > 1.4 && bSize <= 2.0) {
        bulletSizeMedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!bulletSizeHighDiscovered && bSize > 2.0 && bSize < 2.5) {
        bulletSizeHighDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!bulletSizeMaxDiscovered && bSize >= 2.5 && bSize <= 3.0) {
        bulletSizeMaxDiscovered = true;
        triggerDiscoveryPopup();
      }

      // 34-38: Ant Size (exact values) + 83-84: Small/Large Ants
      const aSize = antSize[i];
      if (!antSizeMinDiscovered && aSize === 0.3) {
        antSizeMinDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!antSizeLowDiscovered && aSize === 0.7) {
        antSizeLowDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!antSizeMedDiscovered && aSize === 1.0) {
        antSizeMedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!antSizeHighDiscovered && aSize === 2.0) {
        antSizeHighDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!antSizeMaxDiscovered && aSize === 3.0) {
        antSizeMaxDiscovered = true;
        triggerDiscoveryPopup();
      }
      // Categorical: any variation from 1.0
      if (!smallAntsDiscovered && aSize < 1.0) {
        smallAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!largeAntsDiscovered && aSize > 1.0) {
        largeAntsDiscovered = true;
        triggerDiscoveryPopup();
      }

      // 39-43: Distance From Anchor (only for Keep Distance mode)
      if (keepDistance[i]) {
        const dist = distanceFromAnchor[i];
        if (!distanceMinDiscovered && dist >= 0.1 && dist <= 100) {
          distanceMinDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!distanceLowDiscovered && dist > 100 && dist <= 250) {
          distanceLowDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!distanceMedDiscovered && dist > 250 && dist <= 500) {
          distanceMedDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!distanceHighDiscovered && dist > 500 && dist <= 750) {
          distanceHighDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!distanceMaxDiscovered && dist > 750 && dist <= 1000) {
          distanceMaxDiscovered = true;
          triggerDiscoveryPopup();
        }
      }

      // 44-46 + 67: Special Abilities
      const specialType = getSpecialType(i);

      if (!noSpecialDiscovered && specialType === 0) {
        noSpecialDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!timeExplosionDiscovered && specialType === 1 && specialExplosion[i] < 1) {
        timeExplosionDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!proximityExplosionDiscovered && specialType === 1 && specialExplosion[i] >= 1) {
        proximityExplosionDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!vacuumDiscovered && isVacuumKnockback(i)) {
        vacuumDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!knockbackDiscovered && specialType === -1) {
        knockbackDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!camouflageDiscovered && specialType === 2) {
        camouflageDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!ghostBulletDiscovered && specialType === -2) {
        ghostBulletDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!recoilDiscovered && specialType === 3) {
        recoilDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!launchDiscovered && specialType === -3) {
        launchDiscovered = true;
        triggerDiscoveryPopup();
      }

      // Fire Type discoveries
      const fireType = getFireType(i);
      if (!alternatingFireDiscovered && fireType === -1) {
        alternatingFireDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!hitReloadFireDiscovered && fireType === -2) {
        hitReloadFireDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!normalFireDiscovered && fireType === 0) {
        normalFireDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!delayedBurstFireDiscovered && fireType === 3) {
        delayedBurstFireDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!burstFireDiscovered && fireType === 1) {
        burstFireDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!rapidFireDiscovered && fireType === 2) {
        rapidFireDiscovered = true;
        triggerDiscoveryPopup();
      }

      // 47-51: Explosion Fuse (Time Explosion only)
      if (specialType === 1 && specialExplosion[i] < 1) {
        const fuse = bulletExplodeAfter[i];
        if (!fuseMinDiscovered && fuse >= EXPLODE_AFTER_MIN && fuse <= 250) {
          fuseMinDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!fuseLowDiscovered && fuse > 250 && fuse <= 400) {
          fuseLowDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!fuseMedDiscovered && fuse > 400 && fuse <= 550) {
          fuseMedDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!fuseHighDiscovered && fuse > 550 && fuse <= 700) {
          fuseHighDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!fuseMaxDiscovered && fuse > 700 && fuse <= 800) {
          fuseMaxDiscovered = true;
          triggerDiscoveryPopup();
        }
      }

      // 52-56: Explosion Proximity (Proximity Explosion only)
      if (specialType === 1 && specialExplosion[i] >= 1) {
        const prox = explosionProximity[i];
        if (!proxMinDiscovered && prox >= 0.1 && prox <= 150) {
          proxMinDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!proxLowDiscovered && prox > 150 && prox <= 300) {
          proxLowDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!proxMedDiscovered && prox > 300 && prox <= 550) {
          proxMedDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!proxHighDiscovered && prox > 550 && prox <= 800) {
          proxHighDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!proxMaxDiscovered && prox > 800 && prox <= 1000) {
          proxMaxDiscovered = true;
          triggerDiscoveryPopup();
        }
      }

      // 57-61: Radius (Any Explosion type, High Arc path, or Smear death)
      if (specialType === 1 || getPathType(i) === 1 || getDeathType(i) === -1) {
        const rad = radiusMultiplier[i];
        if (!radiusMinDiscovered && rad >= 0.5 && rad <= 1.0) {
          radiusMinDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!radiusLowDiscovered && rad > 1.0 && rad <= 1.5) {
          radiusLowDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!radiusMedDiscovered && rad > 1.5 && rad <= 2.0) {
          radiusMedDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!radiusHighDiscovered && rad > 2.0 && rad <= 2.5) {
          radiusHighDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!radiusMaxDiscovered && rad > 2.5 && rad <= 3.0) {
          radiusMaxDiscovered = true;
          triggerDiscoveryPopup();
        }
      }

      // 62-66: Residue (Any Explosion type, High Arc path, Landmine death, or Smear death)
      if (specialType === 1 || getPathType(i) === 1 || getDeathType(i) === 1 || getDeathType(i) === -1) {
        const res = residueMultiplier[i];
        if (!residueMinDiscovered && res >= 0.5 && res <= 1.0) {
          residueMinDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!residueLowDiscovered && res > 1.0 && res <= 1.5) {
          residueLowDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!residueMedDiscovered && res > 1.5 && res <= 2.0) {
          residueMedDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!residueHighDiscovered && res > 2.0 && res <= 2.5) {
          residueHighDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!residueMaxDiscovered && res > 2.5 && res <= 3.0) {
          residueMaxDiscovered = true;
          triggerDiscoveryPopup();
        }
      }

      // 68-72: Knockback Multiplier (Knockback type only)
      if (specialType === -1) {
        const kb = bulletKnockbackMultiplier[i];
        if (!knockbackMinDiscovered && kb >= 2.0 && kb <= 2.5) {
          knockbackMinDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!knockbackLowDiscovered && kb > 2.5 && kb <= 3.1) {
          knockbackLowDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!knockbackMedDiscovered && kb > 3.1 && kb <= 3.8) {
          knockbackMedDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!knockbackHighDiscovered && kb > 3.8 && kb <= 4.5) {
          knockbackHighDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!knockbackMaxDiscovered && kb > 4.5 && kb <= 5.0) {
          knockbackMaxDiscovered = true;
          triggerDiscoveryPopup();
        }
      }

      // 73-82: Bullet Burst Count (1.5-5.5, Burst / Delayed Burst Fire only)
      if (fireType === 1 || fireType === 3) {
        const burstCount = bulletBurstCount[i];
        if (!burstCountMinDiscovered && burstCount >= 1.5 && burstCount <= 2.3) {
          burstCountMinDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!burstCountLowDiscovered && burstCount > 2.3 && burstCount <= 3.2) {
          burstCountLowDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!burstCountMedDiscovered && burstCount > 3.2 && burstCount <= 4.1) {
          burstCountMedDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!burstCountHighDiscovered && burstCount > 4.1 && burstCount < 5.0) {
          burstCountHighDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!burstCountMaxDiscovered && burstCount >= 5.0 && burstCount <= 5.5) {
          burstCountMaxDiscovered = true;
          triggerDiscoveryPopup();
        }
      }

      // 83-87: Cooldown Multiplier (0.5-5.5, Alternating/Burst/Rapid Fire)
      if (fireType === -1 || fireType === 1 || fireType === 2) {
        const cdMultiplier = bulletCooldownMultiplier[i];
        if (!cooldownMultiplierMinDiscovered && cdMultiplier >= 0.5 && cdMultiplier <= 1.4) {
          cooldownMultiplierMinDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!cooldownMultiplierLowDiscovered && cdMultiplier > 1.4 && cdMultiplier <= 2.4) {
          cooldownMultiplierLowDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!cooldownMultiplierMedDiscovered && cdMultiplier > 2.4 && cdMultiplier <= 3.4) {
          cooldownMultiplierMedDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!cooldownMultiplierHighDiscovered && cdMultiplier > 3.4 && cdMultiplier < 4.5) {
          cooldownMultiplierHighDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!cooldownMultiplierMaxDiscovered && cdMultiplier >= 4.5 && cdMultiplier <= 5.5) {
          cooldownMultiplierMaxDiscovered = true;
          triggerDiscoveryPopup();
        }
      }

      // Bullet Death Type: Landmine Conversion
      const deathType = getDeathType(i);
      if (!landmineConversionDiscovered && deathType === 1) {
        landmineConversionDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!smearDeathDiscovered && deathType === -1) {
        smearDeathDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!refireDeathDiscovered && deathType === 2) {
        refireDeathDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!turretDeathDiscovered && deathType === 3) {
        turretDeathDiscovered = true;
        triggerDiscoveryPopup();
      }

      // Bullet Path Type discoveries
      const pathType = getPathType(i);
      if (!clockwiseCurveDiscovered && pathType === -1) {
        clockwiseCurveDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!homingCurveDiscovered && pathType === -2) {
        homingCurveDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!splitArcDiscovered && isSplitArc(i)) {
        splitArcDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!beamDiscovered && isBeamAccelerate(i)) {
        beamDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!highArcDiscovered && pathType === 1) {
        highArcDiscovered = true;
        triggerDiscoveryPopup();
      }

      // 88-92: Burst Spread (60°-180°, Burst / Delayed Burst Fire only)
      if (fireType === 1 || fireType === 3) {
        const spreadDegrees = bulletBurstSpread[i] * 180 / PI;
        if (!burstSpreadMinDiscovered && spreadDegrees >= 60 && spreadDegrees <= 84) {
          burstSpreadMinDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!burstSpreadLowDiscovered && spreadDegrees > 84 && spreadDegrees <= 109) {
          burstSpreadLowDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!burstSpreadMedDiscovered && spreadDegrees > 109 && spreadDegrees <= 134) {
          burstSpreadMedDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!burstSpreadHighDiscovered && spreadDegrees > 134 && spreadDegrees <= 159) {
          burstSpreadHighDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!burstSpreadMaxDiscovered && spreadDegrees > 159 && spreadDegrees <= 180) {
          burstSpreadMaxDiscovered = true;
          triggerDiscoveryPopup();
        }
      }
    }
  }
  

  
  antDexEntries = [
    // 1-8: Movement Behaviors
    {
      name: "Follow Beetle Ants",
      desc: "Tracks and follows the beetle's position directly.",
      stats: "Autonomy: Beetle • Follow Style: Follow",
      discovered: movementType1Discovered
    },
    {
      name: "Follow Other Ants",
      desc: "Mirrors the movement patterns of nearby ants.",
      stats: "Autonomy: Ants • Follow Style: Follow",
      discovered: movementType2Discovered
    },
    {
      name: "Find Location Ants",
      desc: "Moves toward a predetermined spot on the screen.",
      stats: "Autonomy: Location • Follow Style: Follow",
      discovered: movementType3Discovered
    },
    {
      name: "Stand Still Ants",
      desc: "Remains stationary at spawn point for better aim.",
      stats: "Autonomy: Spawn • Follow Style: Follow",
      discovered: movementType4Discovered
    },
    {
      name: "Keep Distance From Beetle Ants",
      desc: "Maintains a specific range from the beetle.",
      stats: "Autonomy: Beetle • Follow Style: Keep Distance",
      discovered: movementType5Discovered
    },
    {
      name: "Keep Distance From Ants",
      desc: "Maintains spacing relative to other ants.",
      stats: "Autonomy: Ants • Follow Style: Keep Distance",
      discovered: movementType6Discovered
    },
    {
      name: "Keep Distance From Location Ants",
      desc: "Orbits around a fixed point at set distance.",
      stats: "Autonomy: Location • Follow Style: Keep Distance",
      discovered: movementType7Discovered
    },
    {
      name: "Keep Distance From Spawn Ants",
      desc: "Moves set distance from respawn location.",
      stats: "Autonomy: Spawn • Follow Style: Keep Distance",
      discovered: movementType8Discovered
    },

    // 9-13: Ant Speed
    {
      name: "Minimum Speed Ants",
      desc: "Barely moving, prioritizing aim over mobility.",
      stats: "Ant Speed: 0.9-1.2",
      discovered: antSpeedMinDiscovered
    },
    {
      name: "Low Speed Ants",
      desc: "Slow crawlers with deliberate movement.",
      stats: "Ant Speed: 1.3-1.7",
      discovered: antSpeedLowDiscovered
    },
    {
      name: "Medium Speed Ants",
      desc: "Balanced speed for versatility.",
      stats: "Ant Speed: 1.8-2.3",
      discovered: antSpeedMedDiscovered
    },
    {
      name: "High Speed Ants",
      desc: "Quick movers that reposition rapidly.",
      stats: "Ant Speed: 2.4-3.0",
      discovered: antSpeedHighDiscovered
    },
    {
      name: "Maximum Speed Ants",
      desc: "Sprinters moving at beetle-threatening pace. Small ants can reach even higher speeds (max = 4.5 - Ant Size).",
      stats: "Ant Speed: 3.1-4.2 (size dependent)",
      discovered: antSpeedMaxDiscovered
    },

    // 14-18: Bullet Speed
    {
      name: "Minimum Bullet Speed Ants",
      desc: "Lightning-fast projectiles with minimal dodge time.",
      stats: "Bullet Speed: 60-90",
      discovered: bulletSpeedMinDiscovered
    },
    {
      name: "Low Bullet Speed Ants",
      desc: "Fast bullets that pressure the beetle.",
      stats: "Bullet Speed: 91-140",
      discovered: bulletSpeedLowDiscovered
    },
    {
      name: "Medium Bullet Speed Ants",
      desc: "Moderate bullet velocity for balanced threat.",
      stats: "Bullet Speed: 141-220",
      discovered: bulletSpeedMedDiscovered
    },
    {
      name: "High Bullet Speed Ants",
      desc: "Slow bullets that linger as obstacles.",
      stats: "Bullet Speed: 221-270",
      discovered: bulletSpeedHighDiscovered
    },
    {
      name: "Maximum Bullet Speed Ants",
      desc: "Crawling projectiles that clutter the arena.",
      stats: "Bullet Speed: 271-300",
      discovered: bulletSpeedMaxDiscovered
    },

    // 19-23: Bullet Cooldown
    {
      name: "Minimum Cooldown Ants",
      desc: "Rapid fire with overwhelming bullet spam.",
      stats: "Bullet Cooldown: 79-95",
      discovered: cooldownMinDiscovered
    },
    {
      name: "Low Cooldown Ants",
      desc: "Quick shots that maintain pressure.",
      stats: "Bullet Cooldown: 96-120",
      discovered: cooldownLowDiscovered
    },
    {
      name: "Medium Cooldown Ants",
      desc: "Standard firing rate for typical ants.",
      stats: "Bullet Cooldown: 121-150",
      discovered: cooldownMedDiscovered
    },
    {
      name: "High Cooldown Ants",
      desc: "Slow shooters with deliberate shots.",
      stats: "Bullet Cooldown: 151-180",
      discovered: cooldownHighDiscovered
    },
    {
      name: "Maximum Cooldown Ants",
      desc: "Bizarrely sluggish fire rate, barely shooting.",
      stats: "Bullet Cooldown: 181-200",
      discovered: cooldownMaxDiscovered,
      category: 'exotic'
    },

    // 24-28: Shot Offset
    {
      name: "Minimum Offset Ants",
      desc: "Perfect aim directly at the beetle's position.",
      stats: "Shot Offset: 0-50",
      discovered: offsetMinDiscovered
    },
    {
      name: "Low Offset Ants",
      desc: "Slight lead shots that predict movement.",
      stats: "Shot Offset: 51-150",
      discovered: offsetLowDiscovered
    },
    {
      name: "Medium Offset Ants",
      desc: "Moderate angles for area denial.",
      stats: "Shot Offset: 151-300",
      discovered: offsetMedDiscovered
    },
    {
      name: "High Offset Ants",
      desc: "Wide-angle shots that flank the beetle.",
      stats: "Shot Offset: 301-450",
      discovered: offsetHighDiscovered
    },
    {
      name: "Maximum Offset Ants",
      desc: "Shooting completely away from the beetle.",
      stats: "Shot Offset: 451-500",
      discovered: offsetMaxDiscovered,
      category: 'exotic'
    },

    // 29-33: Bullet Size
    {
      name: "Minimum Bullet Size Ants",
      desc: "Standard projectiles with basic damage.",
      stats: "Bullet Size: 1.0",
      discovered: bulletSizeMinDiscovered
    },
    {
      name: "Low Bullet Size Ants",
      desc: "Slightly enlarged bullets with more impact.",
      stats: "Bullet Size: 1.1-1.4",
      discovered: bulletSizeLowDiscovered
    },
    {
      name: "Medium Bullet Size Ants",
      desc: "Noticeably larger bullets that slow down.",
      stats: "Bullet Size: 1.5-2.0",
      discovered: bulletSizeMedDiscovered
    },
    {
      name: "High Bullet Size Ants",
      desc: "Heavy projectiles with serious damage.",
      stats: "Bullet Size: 2.1-2.4",
      discovered: bulletSizeHighDiscovered
    },
    {
      name: "Maximum Bullet Size Ants",
      desc: "Massive landmine-like bullets that barely move.",
      stats: "Bullet Size: 2.5-3.0",
      discovered: bulletSizeMaxDiscovered,
      category: 'exotic'
    },

    // 34-38: Ant Size
    {
      name: "Minimum Ant Size Ants",
      desc: "Tiniest possible ants, barely visible.",
      stats: "Ant Size: 0.3",
      discovered: antSizeMinDiscovered,
      category: 'exotic'
    },
    {
      name: "Low Ant Size Ants",
      desc: "Small ants with reduced hitboxes.",
      stats: "Ant Size: 0.7",
      discovered: antSizeLowDiscovered
    },
    {
      name: "Medium Ant Size Ants",
      desc: "Standard-sized ants, well-balanced.",
      stats: "Ant Size: 1.0",
      discovered: antSizeMedDiscovered
    },
    {
      name: "High Ant Size Ants",
      desc: "Large ants that are easier targets.",
      stats: "Ant Size: 2.0",
      discovered: antSizeHighDiscovered
    },
    {
      name: "Maximum Ant Size Ants",
      desc: "Gigantic ants with massive health pools.",
      stats: "Ant Size: 3.0",
      discovered: antSizeMaxDiscovered,
      category: 'exotic'
    },

    // 39-43: Distance From Anchor
    {
      name: "Minimum Distance Ants",
      desc: "Stays extremely close to target, aggressive.",
      stats: "Distance From Anchor: 0.1-100",
      discovered: distanceMinDiscovered
    },
    {
      name: "Low Distance Ants",
      desc: "Moderately close positioning.",
      stats: "Distance From Anchor: 101-250",
      discovered: distanceLowDiscovered
    },
    {
      name: "Medium Distance Ants",
      desc: "Maintains mid-range combat distance.",
      stats: "Distance From Anchor: 251-500",
      discovered: distanceMedDiscovered
    },
    {
      name: "High Distance Ants",
      desc: "Prefers long-range positioning.",
      stats: "Distance From Anchor: 501-750",
      discovered: distanceHighDiscovered
    },
    {
      name: "Maximum Distance Ants",
      desc: "Extreme range, almost arena-edge positioning.",
      stats: "Distance From Anchor: 751-1000",
      discovered: distanceMaxDiscovered,
      category: 'exotic'
    },

    // 44-46: Special Abilities
    {
      name: "No Special Ability Ants",
      desc: "Basic bullets with no special properties.",
      stats: "Special: None",
      discovered: noSpecialDiscovered
    },
    {
      name: "Time Explosion Ants",
      desc: "Bullets detonate after a set duration.",
      stats: "Special: Explosion • Trigger: Time",
      discovered: timeExplosionDiscovered
    },
    {
      name: "Proximity Explosion Ants",
      desc: "Bullets explode when near the beetle.",
      stats: "Special: Explosion • Trigger: Proximity",
      discovered: proximityExplosionDiscovered
    },

    // 47-51: Explosion Fuse
    {
      name: "Minimum Fuse Ants",
      desc: "Very short fuse, quick detonations.",
      stats: "Explode After: 40-250 frames",
      discovered: fuseMinDiscovered
    },
    {
      name: "Low Fuse Ants",
      desc: "Short fuse for moderate timing.",
      stats: "Explode After: 251-400 frames",
      discovered: fuseLowDiscovered
    },
    {
      name: "Medium Fuse Ants",
      desc: "Standard detonation timing.",
      stats: "Explode After: 401-550 frames",
      discovered: fuseMedDiscovered
    },
    {
      name: "High Fuse Ants",
      desc: "Long fuse bullets that linger.",
      stats: "Explode After: 551-700 frames",
      discovered: fuseHighDiscovered
    },
    {
      name: "Maximum Fuse Ants",
      desc: "Extremely delayed explosions.",
      stats: "Explode After: 701-800 frames",
      discovered: fuseMaxDiscovered,
      category: 'exotic'
    },

    // 52-56: Explosion Proximity
    {
      name: "Minimum Proximity Ants",
      desc: "Must be very close to beetle to detonate.",
      stats: "Explosion Proximity: 0.1-150",
      discovered: proxMinDiscovered
    },
    {
      name: "Low Proximity Ants",
      desc: "Modest trigger range for explosions.",
      stats: "Explosion Proximity: 151-300",
      discovered: proxLowDiscovered
    },
    {
      name: "Medium Proximity Ants",
      desc: "Standard proximity detection range.",
      stats: "Explosion Proximity: 301-550",
      discovered: proxMedDiscovered
    },
    {
      name: "High Proximity Ants",
      desc: "Wide trigger radius, hard to avoid.",
      stats: "Explosion Proximity: 551-800",
      discovered: proxHighDiscovered
    },
    {
      name: "Maximum Proximity Ants",
      desc: "Extreme range proximity detonation.",
      stats: "Explosion Proximity: 801-1000",
      discovered: proxMaxDiscovered,
      category: 'exotic'
    },

    // 57-61: Explosion Radius
    {
      name: "Minimum Explosion Radius Ants",
      desc: "Small blast radius, easier to dodge.",
      stats: "Explosion Radius: 0.5-1.0x",
      discovered: radiusMinDiscovered
    },
    {
      name: "Low Explosion Radius Ants",
      desc: "Modest blast area.",
      stats: "Explosion Radius: 1.1-1.5x",
      discovered: radiusLowDiscovered
    },
    {
      name: "Medium Explosion Radius Ants",
      desc: "Standard explosion size.",
      stats: "Explosion Radius: 1.6-2.0x",
      discovered: radiusMedDiscovered
    },
    {
      name: "High Explosion Radius Ants",
      desc: "Large blast zone.",
      stats: "Explosion Radius: 2.1-2.5x",
      discovered: radiusHighDiscovered
    },
    {
      name: "Maximum Explosion Radius Ants",
      desc: "Massive explosions covering huge areas.",
      stats: "Explosion Radius: 2.6-3.0x",
      discovered: radiusMaxDiscovered,
      category: 'exotic'
    },

    // 62-66: Explosion Residue
    {
      name: "Minimum Explosion Residue Ants",
      desc: "Clean explosions with minimal lingering.",
      stats: "Explosion Residue: 0.5-1.0x",
      discovered: residueMinDiscovered
    },
    {
      name: "Low Explosion Residue Ants",
      desc: "Brief residue duration.",
      stats: "Explosion Residue: 1.1-1.5x",
      discovered: residueLowDiscovered
    },
    {
      name: "Medium Explosion Residue Ants",
      desc: "Standard residue persistence.",
      stats: "Explosion Residue: 1.6-2.0x",
      discovered: residueMedDiscovered
    },
    {
      name: "High Explosion Residue Ants",
      desc: "Long-lasting explosion residue.",
      stats: "Explosion Residue: 2.1-2.5x",
      discovered: residueHighDiscovered
    },
    {
      name: "Maximum Explosion Residue Ants",
      desc: "Extremely persistent residue clutter.",
      stats: "Explosion Residue: 2.6-3.0x",
      discovered: residueMaxDiscovered,
      category: 'exotic'
    },

    // 67: Knockback Special
    {
      name: "Knock back Bullet Ants",
      desc: "Bullets push the beetle when hit.",
      stats: "Special: Knockback",
      discovered: knockbackDiscovered
    },
    {
      name: "Vacuum Bullet Ants",
      desc: "Bullets pull the beetle toward them at close range, then knock it back on hit. Pull strength and range grow with knockback multiplier.",
      stats: "Special: Vacuum",
      discovered: vacuumDiscovered
    },

    // Camouflage / Ghost Specials
    {
      name: "Camouflage Bullet Ants",
      desc: "Bullets (and landmines they become) flicker in and out of sight. Slower flickering keeps them hidden longer and is genetic.",
      stats: "Special: Camouflage • Flash Rate: 0.25-3 per second",
      discovered: camouflageDiscovered
    },
    {
      name: "Ghost Bullet Ants",
      desc: "Bullets (and landmines they become) stay invisible and only appear within 150 pixels of the beetle. Misses vanish again.",
      stats: "Special: Ghost",
      discovered: ghostBulletDiscovered
    },

    // Recoil / Launch Specials
    {
      name: "Recoil Ants",
      desc: "Every shot kicks the ant backward, away from where it fired. Bigger, faster bullets kick harder; bigger ants are pushed less.",
      stats: "Special: Recoil",
      discovered: recoilDiscovered
    },
    {
      name: "Launch Ants",
      desc: "Every shot kicks the ant backward and briefly up into the air (higher and longer for bigger, faster bullets), where walking, dashing, bullets, shockwaves and mines can't touch it.",
      stats: "Special: Launch",
      discovered: launchDiscovered
    },

    // 68-72: Knockback Multiplier
    {
      name: "Minimum Knockback Ants",
      desc: "Modest push when hit.",
      stats: "Knockback Multiplier: 2.0-2.5x",
      discovered: knockbackMinDiscovered
    },
    {
      name: "Low Knockback Ants",
      desc: "Noticeable shove on impact.",
      stats: "Knockback Multiplier: 2.6-3.1x",
      discovered: knockbackLowDiscovered
    },
    {
      name: "Medium Knockback Ants",
      desc: "Strong knockback force.",
      stats: "Knockback Multiplier: 3.2-3.8x",
      discovered: knockbackMedDiscovered
    },
    {
      name: "High Knockback Ants",
      desc: "Very strong push that disrupts movement.",
      stats: "Knockback Multiplier: 3.9-4.5x",
      discovered: knockbackHighDiscovered
    },
    {
      name: "Maximum Knockback Ants",
      desc: "Devastating knockback that launches beetle.",
      stats: "Knockback Multiplier: 4.6-5.0x",
      discovered: knockbackMaxDiscovered,
      category: 'exotic'
    },

    // Fire Types
    {
      name: "Alternating Fire Ants",
      desc: "Alternate between fast and slow shots. Each shot toggles cooldown speed. Affected by cooldown multiplier.",
      stats: "Fire Type: Alternating",
      discovered: alternatingFireDiscovered
    },
    {
      name: "Hit Reload Ants",
      desc: "Fire on a cooldown 3x longer than normal, but every bullet that hits the beetle instantly reloads them for another shot.",
      stats: "Fire Type: Hit Reload",
      discovered: hitReloadFireDiscovered
    },
    {
      name: "Normal Fire Ants",
      desc: "Fire one bullet at a time with standard timing.",
      stats: "Fire Type: Normal",
      discovered: normalFireDiscovered
    },
    {
      name: "Burst Fire Ants",
      desc: "Fire multiple bullets in rapid succession with each trigger. Affected by burst count.",
      stats: "Fire Type: Burst",
      discovered: burstFireDiscovered
    },
    {
      name: "Delayed Burst Ants",
      desc: "Fire a single full-size bullet that glows orange, then splits into a burst mid-flight (up to 1 second later). Affected by burst count, spread, and delay.",
      stats: "Fire Type: Delayed Burst",
      discovered: delayedBurstFireDiscovered
    },
    {
      name: "Rapid Fire Ants",
      desc: "Vary their firing rate with unpredictable timing. Affected by cooldown multiplier.",
      stats: "Fire Type: Rapid",
      discovered: rapidFireDiscovered
    },

    // 73-77: Bullet Burst Count
    {
      name: "Minimum Burst Count Ants",
      desc: "Fire 1-2 bullets per burst. Nearly single-shot behavior.",
      stats: "Bullet Burst Count: 1.5-2.3",
      discovered: burstCountMinDiscovered
    },
    {
      name: "Low Burst Count Ants",
      desc: "Fire 2-3 bullets per burst. Controlled volleys.",
      stats: "Bullet Burst Count: 2.4-3.2",
      discovered: burstCountLowDiscovered
    },
    {
      name: "Medium Burst Count Ants",
      desc: "Fire 3-4 bullets per burst. Balanced pressure.",
      stats: "Bullet Burst Count: 3.3-4.1",
      discovered: burstCountMedDiscovered
    },
    {
      name: "High Burst Count Ants",
      desc: "Fire 4-5 bullets per burst. Heavy barrages.",
      stats: "Bullet Burst Count: 4.2-4.9",
      discovered: burstCountHighDiscovered
    },
    {
      name: "Maximum Burst Count Ants",
      desc: "Fire 5-6 bullets per burst. Overwhelming volleys.",
      stats: "Bullet Burst Count: 5.0-5.5",
      discovered: burstCountMaxDiscovered,
      category: 'exotic'
    },

    // 78-82: Cooldown Multiplier
    {
      name: "Minimum Cooldown Multiplier Ants",
      desc: "Faster shooting with 0.5-1.4x time between shots.",
      stats: "Cooldown Multiplier: 0.5-1.4x",
      discovered: cooldownMultiplierMinDiscovered
    },
    {
      name: "Low Cooldown Multiplier Ants",
      desc: "Moderate firing with 1.5-2.4x time between shots.",
      stats: "Cooldown Multiplier: 1.5-2.4x",
      discovered: cooldownMultiplierLowDiscovered
    },
    {
      name: "Medium Cooldown Multiplier Ants",
      desc: "Slower firing with 2.5-3.4x time between shots.",
      stats: "Cooldown Multiplier: 2.5-3.4x",
      discovered: cooldownMultiplierMedDiscovered
    },
    {
      name: "High Cooldown Multiplier Ants",
      desc: "Much slower firing with 3.5-4.4x time between shots.",
      stats: "Cooldown Multiplier: 3.5-4.4x",
      discovered: cooldownMultiplierHighDiscovered
    },
    {
      name: "Maximum Cooldown Multiplier Ants",
      desc: "Extremely slow firing with 4.5-5.5x time between shots.",
      stats: "Cooldown Multiplier: 4.5-5.5x",
      discovered: cooldownMultiplierMaxDiscovered,
      category: 'exotic'
    },

    // Bullet Death Type - Smear
    {
      name: "Smear Ants",
      desc: "Bullets leave a small damaging smear where they fade out. Radius and residue stats control its size and how long it lingers.",
      stats: "Death Type: Smear",
      discovered: smearDeathDiscovered
    },

    // 83: Bullet Death Type - Landmine Conversion
    {
      name: "Landmine Conversion Ants",
      desc: "Bullets transform into landmines when they expire instead of fading.",
      stats: "Death Type: Landmine Conversion",
      discovered: landmineConversionDiscovered
    },

    // Bullet Death Type - Refire
    {
      name: "Refire Ants",
      desc: "Where a bullet dies, it winds up and is fired at the beetle again, just as the ant would fire it. Refired bullets have no death effect.",
      stats: "Death Type: Refire",
      discovered: refireDeathDiscovered
    },

    // Bullet Death Type - Turret
    {
      name: "Turret Ants",
      desc: "Where a bullet dies, a small turret sets up and fires at the beetle 3 times, just as the ant would, then disappears. Turret bullets have no death effect.",
      stats: "Death Type: Turret",
      discovered: turretDeathDiscovered
    },

    // 84-86: Bullet Path Types
    {
      name: "Clockwise Curve Ants",
      desc: "Bullets curve in a clockwise spiral as they travel. Creates unpredictable arcing shots. Curve intensifies over bullet lifetime.",
      stats: "Path Type: Clockwise Curve • Curve Strength: -0.1 to 0.1",
      discovered: clockwiseCurveDiscovered
    },
    {
      name: "Homing Curve Ants",
      desc: "Bullets gradually turn toward the beetle mid-flight. Difficult to dodge.",
      stats: "Path Type: Homing",
      discovered: homingCurveDiscovered
    },
    {
      name: "High Arc Ants",
      desc: "Bullets launch in a high arc and land like artillery. Cannot be touched until they hit the ground. Deal high-speed damage on impact.",
      stats: "Path Type: High Arc • Arc Duration: 130-600 frames",
      discovered: highArcDiscovered
    },
    {
      name: "Split Arc Ants",
      desc: "Lob high arc bullets that glow orange on the way up, then split into 3 smaller bullets at the top of the arc that land in a row across the target.",
      stats: "Path Type: Split Arc • Arc Duration: 130-600 frames",
      discovered: splitArcDiscovered
    },
    {
      name: "Beam Ants",
      desc: "Bullets charge up with closing rings, then fire a beam to the edge of the screen when they would start accelerating. Knockback beams shove the beetle along the beam and vacuum beams pull it in. Explosive beams fire both ways and burn like an explosion. Beam color shows the effect: white knockback, purple vacuum, green explosive, cyan plain. Beam bullets have no death effect.",
      stats: "Path Type: Beam • Width: Radius Multiplier • Duration: Residue Multiplier",
      discovered: beamDiscovered
    },

    // 87-91: Burst Spread (60°-180°, Burst Fire only)
    {
      name: "Minimum Burst Spread Ants",
      desc: "Tight burst spread of 60-84°. Concentrated fire pattern.",
      stats: "Burst Spread: 60-84°",
      discovered: burstSpreadMinDiscovered
    },
    {
      name: "Low Burst Spread Ants",
      desc: "Narrow burst spread of 85-109°. Focused volleys.",
      stats: "Burst Spread: 85-109°",
      discovered: burstSpreadLowDiscovered
    },
    {
      name: "Medium Burst Spread Ants",
      desc: "Moderate burst spread of 110-134°. Balanced coverage.",
      stats: "Burst Spread: 110-134°",
      discovered: burstSpreadMedDiscovered
    },
    {
      name: "High Burst Spread Ants",
      desc: "Wide burst spread of 135-159°. Area denial pattern.",
      stats: "Burst Spread: 135-159°",
      discovered: burstSpreadHighDiscovered
    },
    {
      name: "Maximum Burst Spread Ants",
      desc: "Extreme burst spread of 160-180°. Full hemisphere coverage.",
      stats: "Burst Spread: 160-180°",
      discovered: burstSpreadMaxDiscovered,
      category: 'exotic'
    },

    // 89-90: Categorical Ant Size
    {
      name: "Small Ants",
      desc: "Ants smaller than standard size.",
      stats: "Ant Size: < 1.0",
      discovered: smallAntsDiscovered
    },
    {
      name: "Large Ants",
      desc: "Ants larger than standard size.",
      stats: "Ant Size: > 1.0",
      discovered: largeAntsDiscovered
    },
  ].map(entry => ({
    ...entry,
    category: entry.category || 'normal'
  }));
  
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
  upgradeRerolls = p.upgradeRerolls !== undefined ? p.upgradeRerolls : UPGRADE_REROLLS_PER_RUN;
  
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
  health = 10;
  
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
  health = 10;
  
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
    { name: 'Fire: Rapid', key: 'fireRapid', min: 0, max: 1, step: 0.01,
      help: 'Mutation stat for rapid fire (0-1)' },
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
    
    // Death category (mutation-based)
    { name: '── DEATH CATEGORY ──', key: null, min: 0, max: 0, step: 0 }, // Header
    { name: 'Death: Landmine', key: 'deathLandmine', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for bullet death (0-2, <1=smear, >=1=landmine)' },
    { name: 'Death: Refire', key: 'deathRefire', min: 0, max: 2, step: 0.01,
      help: 'Mutation stat for bullet death (0-2, <1=refire, >=1=turret)' },
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
      bulletArcDuration: { caps: [300, 400, 500, 600], inverse: false },
      bulletCurveStrength: { caps: [0.05, 0.075, 0.1], inverse: false },
      pathCurve: { caps: [1.0, 2.0], inverse: false },
      deathLandmine: { caps: [1.0, 2.0], inverse: false },
      deathRefire: { caps: [1.0, 2.0], inverse: false },  // <1 = refire, >=1 = turret
      fireAlternating: { caps: [1.0, 2.0], inverse: false },
      fireBurst: { caps: [1.0, 2.0], inverse: false },  // <1 = burst, >=1 = delayed burst
      pathHighArc: { caps: [1.0, 2.0], inverse: false },  // <1 = high arc, >=1 = split arc
      pathAccelerate: { caps: [1.0, 2.0], inverse: false },  // <1 = accelerate, >=1 = beam
      specialKnockback: { caps: [1.0, 2.0], inverse: false },  // <1 = knockback, >=1 = vacuum
      explosionProximity: { caps: [400, 600, 800, 1000], inverse: false },
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
        upgrade27: upgrade27Level
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
          upgrade27: players[devToolsPlayerTab].upgrade27 || 0
        };
      } else {
        // Player doesn't exist, show zeros
        currentUpgrades = {
          upgrade1: 0, upgrade2: 0, upgrade3: 0, upgrade4: 0, upgrade5: 0,
          upgrade6: 0, upgrade7: 0, upgrade8: 0, upgrade9: 0, upgrade10: 0,
          upgrade11: 0, upgrade12: 0, upgrade13: 0, upgrade14: 0, upgrade15: 0,
          upgrade16: 0, upgrade17: 0, upgrade18: 0, upgrade19: 0, upgrade20: 0,
          upgrade21: 0, upgrade22: 0, upgrade23: 0, upgrade24: 0, upgrade25: 0, upgrade26: 0, upgrade27: 0
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
        { name: 'Bullet Harvest', level: currentUpgrades.upgrade27, maxLevel: 1, id: 26 }
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
                         upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level, upgrade21Level, upgrade22Level, upgrade23Level, upgrade24Level, upgrade25Level, upgrade26Level, upgrade27Level];
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
        players[devToolsPlayerTab].upgrade27 || 0
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
                    upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level, upgrade21Level, upgrade22Level, upgrade23Level, upgrade24Level, upgrade25Level, upgrade26Level, upgrade27Level];
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
        players[devToolsPlayerTab].upgrade27 || 0
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


