let playerX, playerY;
let playerRotationValue = 0;
let bg;
let tx;
let ty;
let start = false;
let startMenu = false;
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

// Custom ant genetic stats for dev tools (3 ants: 1st, 2nd, 3rd place)
let customAntStats = [
  // 1st place ant (index 0)
  {
    bulletSpeed: 180,
    bulletCooldown: 120,
    antSpeed: 1.95,
    shotOffsetX: 0,
    shotOffsetY: 0,
    standingPointX: 640,
    standingPointY: 326,
    followValue: 0,
    autonomy: 0,
    distanceFromAnchor: 200,
    explosionBehavior: 0,
    explosionProximity: 200,
    angleFromSpawn: Math.PI,
    bulletSize: 1,
    explosionRadiusMultiplier: 1,
    explosionResidueMultiplier: 1,
    bulletExplodeAfter: 800,
    antSize: 1
  },
  // 2nd place ant (index 1)
  {
    bulletSpeed: 180,
    bulletCooldown: 120,
    antSpeed: 1.95,
    shotOffsetX: 0,
    shotOffsetY: 0,
    standingPointX: 640,
    standingPointY: 326,
    followValue: 0,
    autonomy: 0,
    distanceFromAnchor: 200,
    explosionBehavior: 0,
    explosionProximity: 200,
    angleFromSpawn: Math.PI,
    bulletSize: 1,
    explosionRadiusMultiplier: 1,
    explosionResidueMultiplier: 1,
    bulletExplodeAfter: 800,
    antSize: 1
  },
  // 3rd place ant (index 2)
  {
    bulletSpeed: 180,
    bulletCooldown: 120,
    antSpeed: 1.95,
    shotOffsetX: 0,
    shotOffsetY: 0,
    standingPointX: 640,
    standingPointY: 326,
    followValue: 0,
    autonomy: 0,
    distanceFromAnchor: 200,
    explosionBehavior: 0,
    explosionProximity: 200,
    angleFromSpawn: Math.PI,
    bulletSize: 1,
    explosionRadiusMultiplier: 1,
    explosionResidueMultiplier: 1,
    bulletExplodeAfter: 800,
    antSize: 1
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

let movementType1Discovered = false; 
let movementType2Discovered = false; 
let movementType3Discovered = false; 
let movementType4Discovered = false;
let movementType5Discovered = false;
let movementType6Discovered = false;
let movementType7Discovered = false;
let movementType8Discovered = false;

let maxSpeedDiscovered = false;
let minSpeedDiscovered = false;
let walkingAntsDiscovered = false;

let basicBulletsDiscovered = false;
let heavyBulletsDiscovered = false;
let landMineDiscovered = false;

let minBulletSpeedDiscovered = false;
let midBulletSpeedDiscovered = false;
let maxBulletSpeedDiscovered = false;

let straightShootingAntsDiscovered = false;
let wideShotAntsDiscovered = false;
let wildShotAntsDiscovered = false;
let mostOffTargetAntsDiscovered = false;

let rapidFireDiscovered = false;
let averageFireRateAntsDiscovered = false;
let minimalFireRateAntsDiscovered = false;

let middleStationedAntsDiscovered = false;

let chaserAntsDiscovered = false;
let midrangeAntsDiscovered = false;
let farRangeAntsDiscovered = false;
let playerBasedSnipersDiscovered = false;

// Explosion-related discoveries
let noExplosionDiscovered = false;
let timeExplosionDiscovered = false;
let proximityExplosionDiscovered = false;

// Time-based explosion fuse tiers
let quickFuseDiscovered = false;     // short fuse
let averageFuseDiscovered = false;   // mid fuse
let longFuseDiscovered = false;      // long fuse

// Proximity explosion distance tiers
let closeProximityDiscovered = false;
let averageProximityDiscovered = false;
let farProximityDiscovered = false;

// Explosion size (radius multiplier) tiers
let smallExplosionDiscovered = false;    // radiusMultiplier ≤ 1.0
let averageExplosionDiscovered = false;  // 1.0 < radiusMultiplier ≤ 2.0
let largeExplosionDiscovered = false;    // radiusMultiplier > 2.0

// Explosion residue tiers
let lowResidueDiscovered = false;        // residueMultiplier ≤ 1.0
let averageResidueDiscovered = false;    // 1.0 < residueMultiplier ≤ 2.0
let highResidueDiscovered = false;       // residueMultiplier > 2.0

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

let deathAnimations = [];
let floatingTexts = [];


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
let explosionBehavior = [];
let explodeOnTermination = [];
let triggerExplodeViaProximity = [];
let explosionProximity = [];
let standingPointX = [];
let standingPointY = [];
let anchorPointX = [];
let anchorPointY = [];
let distanceFromAnchor = [];
let spawnX = [];
let spawnY = [];
let angleFromSpawn = [];
let movementMutationRate = [];
let bulletSize = [];
let antSize = [];
let antHealth = [];
let antMaxHealth = [];
let antKnockedBack = [];
let antKnockbackTimer = [];
let antKnockbackVelX = [];
let antKnockbackVelY = [];
const ANT_SPAWN_BUFFER = 20;
let antMoveX = [];
let antMoveY = [];
let antPrevX = [];
let antPrevY = [];

let bulletSplitCount = []; // NEW: how many pieces (1–5)
let bulletSpread = [];     // NEW: spread angle in degrees (or radians)

let explosionRadiusMultiplier = [];
let explosionResidueMultiplier = [];

let enemyExplosions = [];
let bulletExplodeAfter = [];

let buttons = {};


//let canvasSize = 600;
let playerSpeed = 3;
let scoreBarHeight = 40;
let expBarHeight = 25;
let expBarBuffer = 15;
let sideBuffer = 25;
let score = 0;
let totalScore = 0;
let health = 10;
let playerLastDamageFrame = 0;  // Track when player last took damage for regeneration
let timeCount = 10;
let highScore = 0;
let end = false;
let comboTime = 0;
let combo = 0;
let comboConstant = 50;
let comboPoints = 0;
let streakPoints = 0;

// EXP Level System
let expLevel = 1;
let expProgress = 0;
let expRequired = 500;
let upgradeAvailable = false;
let upgradeMenuActive = false;
let selectedUpgrade = 0;  // 0, 1, or 2 for three options
let upgradeKeyDebounce = 0;
let upgradeEnterPressed = false;  // Track if Enter was pressed to prevent bleed-through
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
let displayedUpgrades = [];  // Array of up to 3 randomly selected upgrade indices (0-9)

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
  console.log('Window Width:', windowWidth);
  console.log('Window Height:', windowHeight);
  //enemyCount = windowWidth/150 + windowHeight/150;
  //Beetle
  playerX = width / 2;
  playerY = height / 2;
  playerPrevX = playerX;
  playerPrevY = playerY;
  flashingEntities = [];
  flashTimer = 0;
  playerBulletX = playerX;
  playerBulletY = playerY;
  playerBulletRotationValue = playerRotationValue;
  playerSpeed = movementSpeed / enemyCount;
  let dashCooldown = 0;


  for (let i = 1; i < enemyCount + 1; i++) {
    //enemy one
      antX[i] = random(0, getGameplayWidth());
      antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
      spawnX[i] = antX[i] + cos(angleFromSpawn[i]);
      spawnY[i] = antY[i] + sin(angleFromSpawn[i]);
    //console.log(antX[i]);
    antPrevX[i] = antX[i];
    antPrevY[i] = antY[i];
    
    strikeX[i] = 0;
    strikeY[i] = 0;
    strikeTime1[i] = 0;
    drawStrike1[i] = 1;
    bulletShot[i] = 0;
    //console.log(bulletShot[i]);
    enemyBullets[i] = [];
    bulletSpeed[i] = 180; // Random speed for each enemy
    bulletCooldown[i] = 120; // Random cooldown for each enemy
    antSpeed[i] = 1.95;
    bulletSize[i] = 1;
    antSize[i] = 1;
    antMaxHealth[i] = antSize[i];
    antHealth[i] = antMaxHealth[i];
    antKnockedBack[i] = false;
    antKnockbackTimer[i] = 0;
    antKnockbackVelX[i] = 0;
    antKnockbackVelY[i] = 0;
    bulletSplitCount[i] = 1;          // no split by default
    bulletSpread[i] = 0;              // 0° spread (all bullets same direction)
    bulletExplodeAfter[i] = 800; 
    explosionRadiusMultiplier[i] = 1;
    explosionResidueMultiplier[i] = 1;
    shotOffsetX[i] = 0;
    shotOffsetY[i] = 0;
    followValue[i] = 0;
    autonomy[i] = 0;
    explosionBehavior[i] = 0;
    explosionProximity[i] = 200;
    if (Math.round(explosionBehavior[i]) === 0){
      explodeOnTermination[i] = false;   // non-exploding default
      triggerExplodeViaProximity[i] = false;
    } else if (Math.round(explosionBehavior[i]) === 1){
      explodeOnTermination[i] = true;    // time-based explosion
      triggerExplodeViaProximity[i] = false;
    } else if (Math.round(explosionBehavior[i]) === 2){
      explodeOnTermination[i] = false;
      triggerExplodeViaProximity[i] = true; // proximity-based explosion
    }
    standingPointX[i] = width / 2;
    standingPointY[i] = height / 2;
    distanceFromAnchor[i] = 200;
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
}

function triggerDiscoveryPopup() {
  showDiscoveryPopup = true;
  discoveryPopupTimer = discoveryPopupDuration;
  discoveryPopupY = windowHeight + 100;          // start off-screen
  discoveryPopupTargetY = windowHeight - 50;    // where it should slide to
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

  if (start == true){
      // Check if Tiger Beetle is dashing (for visual effects)
      if (tigerBeetleActive) {
        tigerBeetleMoving = dash;
        
        // Handle flash effect when dashing
        if (tigerBeetleMoving) {
          flashTimer--;
          if (flashTimer <= 0) {
            // Select new entity to flash
            flashTimer = 3; // Flash selection every 3 frames
            
            // Randomly choose between ant or bullet
            let choice = random();
            if (choice < 0.5 && enemyCount > 0) {
              // Flash an ant
              flashingEntities.push({
                type: 'ant',
                index: floor(random(1, enemyCount + 1)),
                owner: -1,
                fade: 255
              });
            } else {
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
      
      for (let i = 1; i <= enemyCount; i++) {
        antMoveX[i] = 0;
        antMoveY[i] = 0;
      }
      healthBegin = health;
      shieldBegin = shield;
      
      // UI elements (not scaled)
      drawBackground();
      drawScoreboard();
      
      // Begin gameplay scaling based on level
      beginGameplayScaling();
      autonomousAntMovement();
      drawEnemy();
      drawBeetle();
      drawStrikes();
      calculateBonus();
      enemyInteraction1(); // Beetle Eats Enemy
      enemyShoot1();
      drawEnemyExplosions();
      detectKeyboardInput();
      // Beetle Moves
      beetleShoot();
      beetleDash();
      handleWindAttack(); // Handle shockwave attack
      dashCollision(); // Check for dash collisions with ants
      handleAntKnockback(); // Handle knocked back ants
      drawDeathEffects();
      endGameplayScaling();
      
      // Draw damage flash effects AFTER gameplay (not scaled)
      if (healthBegin > health){
        noStroke();
        rectMode(CORNER);
        fill(250, 0, 0, 75);
        rect(0, 0, windowWidth, windowHeight);
      }
      if (shieldBegin > shield){
        noStroke();
        rectMode(CORNER);
        fill( 0, 0, 255, 75);
        rect(0, 0, windowWidth, windowHeight);
      }
      
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
      
      endGame();
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
  playerX = width / 2;
  playerY = height / 2;
  playerPrevX = playerX;
  playerPrevY = playerY;
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
  dashPrevPressed = false;
  dashButtonTouched = false;
  windAttackReady = true;
  windAttackCooldown = 0;
  windAttackActive = false;
  windAttackAnimRadius = 0;
  windAttackAlpha = 0;
  windAttackPrevPressed = false;
  windAttackReadyFlash = 0;
  playerBullets = [];
  playerBulletShot = false;
  deathAnimations = [];
  floatingTexts = [];
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
  displayedUpgrades = [];
  updateUpgradeBooleans();  // Reset all upgrade booleans to false
}

function restartGame() {
  resetRunState();
  
  // Apply custom ant stats if enabled in dev tools
  if (devToolsUseCustomAnts) {
    applyCustomAntsToInitialPopulation();
  }
  
  start = true;
  startMenu = false;
  endmusic.stop();
  titlemusic.stop();
  if (!gamemusic.isPlaying()) {
    gamemusic.play();
  }
}

function applyCustomAntsToInitialPopulation() {
  console.log("Applying custom ant stats to initial population");
  console.log("Enemy count:", enemyCount);
  
  // Use first place ant stats for all initial ants (level 1 has only 1 ant)
  let s = customAntStats[0];
  console.log("Custom ant stats:", s);
  
  for (let i = 1; i <= enemyCount; i++) {
    console.log(`Setting ant ${i} to custom stats`);
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
    explosionBehavior[i] = s.explosionBehavior;
    explosionProximity[i] = s.explosionProximity;
    angleFromSpawn[i] = s.angleFromSpawn;
    bulletSize[i] = s.bulletSize;
    explosionRadiusMultiplier[i] = s.explosionRadiusMultiplier;
    explosionResidueMultiplier[i] = s.explosionResidueMultiplier;
    bulletExplodeAfter[i] = s.bulletExplodeAfter;
    
    // Set derived boolean values
    if (Math.round(autonomy[i]) === 0){
      followTarget[i] = true;
      keepDistance[i] = false;
    } else if (Math.round(autonomy[i]) === 1){
      followTarget[i] = false;
      keepDistance[i] = true;
    }
    if (Math.round(explosionBehavior[i]) === 0){
      explodeOnTermination[i] = false;
      triggerExplodeViaProximity[i] = false;
    } else if (Math.round(explosionBehavior[i]) === 1){
      explodeOnTermination[i] = true;
      triggerExplodeViaProximity[i] = false;
    } else if (Math.round(explosionBehavior[i]) === 2){
      explodeOnTermination[i] = false;
      triggerExplodeViaProximity[i] = true;
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
    
    console.log(`Ant ${i} final stats: speed=${bulletSpeed[i]}, cooldown=${bulletCooldown[i]}, antSpeed=${antSpeed[i]}`);
  }
  
  console.log("Custom ant stats applied successfully to all ants");
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
        explosionBehavior: explosionBehavior[antId],
        explosionProximity: explosionProximity[antId],
        angleFromSpawn: angleFromSpawn[antId],
        bulletSize: bulletSize[antId],
        explosionRadiusMultiplier: explosionRadiusMultiplier[antId],
        explosionResidueMultiplier: explosionResidueMultiplier[antId],
        bulletExplodeAfter: bulletExplodeAfter[antId],
        antSize: antSize[antId]
      };
    }
  }
  console.log("Synced actual winners to custom ant stats for viewing");
}

function returnToMainMenu() {
  resetRunState();
  antdex = false;
  start = false;
  startMenu = true;
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

function drawBackground() {
  // Normal background (no stripes anymore)
  imageMode(CORNER);
  tx = 0;
  ty = 0;
  image(bg, tx * windowWidth / 2, ty * windowHeight / 2, windowWidth / 2, windowHeight / 2);
  ty = ty + 1;
  image(bg, tx * windowWidth / 2, ty * windowHeight / 2, windowWidth / 2, windowHeight / 2);
  ty = 0;
  tx = tx + 1;
  image(bg, tx * windowWidth / 2, ty * windowHeight / 2, windowWidth / 2, windowHeight / 2);
  ty = ty + 1;
  image(bg, tx * windowWidth / 2, ty * windowHeight / 2, windowWidth / 2, windowHeight / 2);
}

function drawScoreboard() {
  rectMode(CORNER);
  fill(0, 50, 120);  // Darker blue background
  rect(0, 0, windowWidth, scoreBarHeight);

  fill(255);  // White text
  stroke(0);  // Black border
  strokeWeight(2);
  textSize(16);
  textAlign(CENTER);

  highScore = getItem('newHighScore');
  if (highScore == null) {
    highScore = 0;
  }

  // Calculate current run score based on mode
  let currentRunScore;
  if (multiplayerMode && players.length > 0) {
    // In multiplayer, show current player's total + current round score
    currentRunScore = players[currentPlayerIndex].totalScore + score;
  } else {
    // In single player, use global totalScore
    currentRunScore = totalScore + score;
  }
  
  // Only update high score in single player mode during gameplay (and not when game is over)
  if (!multiplayerMode && !end && currentRunScore > highScore) {
    highScore = currentRunScore;
    storeItem('newHighScore', highScore);
  }

  let padding = 10;
  let yPos = scoreBarHeight * 0.65;
  
  // Available width for text
  let sectionWidth = windowWidth / 7;
  let startX = sectionWidth / 2;

  // Left to right: Round, Time, Combo, Health, Score, Total, High Score
  
  // Round
  fill(255);
  text(`Round: ${level}`, startX, yPos);

  // Time
  text(`Time: ${round(timeCount)}`, startX + sectionWidth, yPos);

  // Combo (colored - fades yellow → red → white)
  let comboText = `Combo: ${combo}`;
  if (streakPoints > 0) {
    comboText += ` +${streakPoints}`;
  }
  // Color transition: Yellow (60) → Red (30) → White (0)
  let r, g, b;
  if (comboTime > 30) {
    // Yellow to Red transition
    r = 255;
    g = map(comboTime, 60, 30, 255, 0);  // 255 at 60 (yellow), 0 at 30 (red)
    b = 0;
  } else {
    // Red to White transition
    r = 255;
    g = map(comboTime, 30, 0, 0, 255);   // 0 at 30 (red), 255 at 0 (white)
    b = map(comboTime, 30, 0, 0, 255);   // 0 at 30 (red), 255 at 0 (white)
  }
  fill(r, g, b);
  text(comboText, startX + sectionWidth * 2, yPos);

  // Health
  // Flash red box if health below 10
  if (health < 10) {
    let flashAlpha = map(sin(frameCount * 20/health), -1, 1, 50, 150);
    fill(255, 0, 0, flashAlpha);
    noStroke();
    rectMode(CENTER);
    rect(startX + sectionWidth * 3, scoreBarHeight / 2, sectionWidth * 0.8, scoreBarHeight * 1);
    rectMode(CORNER);
  }
  
  fill(255);
  stroke(0);
  strokeWeight(2);
  text(`Health: ${health.toFixed(2)}`, startX + sectionWidth * 3, yPos);

  // Score
  text(`Score: ${score}`, startX + sectionWidth * 4, yPos);

  // Total
  text(`Total: ${currentRunScore}`, startX + sectionWidth * 5, yPos);

  // High Score
  text(`High Score: ${highScore}`, startX + sectionWidth * 6, yPos);

  // EXP Progress Bar
  drawExpBar();

  if (!end) {
    timeCount -= (1 / 100);
  }
}

function drawExpBar() {
  // EXP bar dimensions
  let barWidth = windowWidth;  // Full screen width
  let barHeight = expBarHeight;
  let barX = 0;  // Start at left edge
  let barY = windowHeight - barHeight;  // At the bottom of screen
  
  // Background (empty bar)
  fill(80, 80, 0);  // Dark yellow
  stroke(0);
  strokeWeight(2);
  rectMode(CORNER);
  rect(barX, barY, barWidth, barHeight);
  
  // Progress (filled portion)
  let progressWidth = map(expProgress, 0, expRequired, 0, barWidth);
  fill(255, 255, 0);  // Bright yellow
  noStroke();
  rect(barX, barY, progressWidth, barHeight);
  
  // EXP Level text (with border)
  if (upgradeAvailable) {
    // Pulsing "Upgrade Available" text
    let pulseSize = map(sin(frameCount * 0.1), -1, 1, 14, 18);
    let pulseAlpha = map(sin(frameCount * 0.1), -1, 1, 180, 255);
    fill(255, pulseAlpha);
    stroke(0);
    strokeWeight(3);
    textSize(pulseSize);
    textAlign(CENTER);
    text(`UPGRADE AVAILABLE!`, windowWidth / 2, barY + barHeight / 2 + 5);
  } else {
    fill(255);
    stroke(0);
    strokeWeight(3);
    textSize(14);
    textAlign(CENTER);
    text(`EXP Level: ${expLevel} | ${expProgress}/${expRequired}`, windowWidth / 2, barY + barHeight / 2 + 5);
  }
}

function addScore(points) {
  score += points;
  expProgress += points;
  
  // Check if upgrade should be available
  if (expProgress >= expRequired && !upgradeAvailable) {
    upgradeAvailable = true;
    // Don't auto-level - wait for upgrade selection at round end
  }
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
      push();
        // Apply fade if Tiger Beetle is active
        if (tigerBeetleActive && tigerBeetleMoving) {
          tint(255, fadeAmount);
        }
        angleMode(DEGREES)
        imageMode(CENTER);
        translate(antX[i], antY[i]);
        let a = atan2(playerY - antY[i], playerX - antX[i]);
        rotate(a);
        let antImageSize = 45 + (15 * antSize[i]);
        image(ant, 0, 0, antImageSize, antImageSize);
      pop();
    }


  }
  //console.log(enemyIndex);
}

function drawBeetle(){


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

function enemyInteraction1(){

  //enemy one interaction
  for (let i = 1; i < enemyCount + 1; i++) {
    let antHitboxSize = 20.25 + (6.75 * antSize[i]);
    if(playerX > (antX[i] - antHitboxSize) && playerY > (antY[i] - antHitboxSize) && playerX < (antX[i] + antHitboxSize) && playerY < (antY[i] + antHitboxSize)) {
      // Only run over ants with health <= 1
      if (end == false && antHealth[i] <= 1){
        comboTime = 60;
        combo = combo + 1;
        calculateBonus();
        streakPoints = streakPoints + comboPoints;
        addScore(100 + comboPoints);
        health = health + 1;
        
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
        
        addDeathEffect(antX[i], antY[i], 100 + comboPoints);
        antX[i] = random(0, getGameplayWidth());
        antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
        spawnX[i] = antX[i] + cos(angleFromSpawn[i]);
        spawnY[i] = antY[i] + sin(angleFromSpawn[i]);
        antHealth[i] = antMaxHealth[i];  // Reset health on respawn
        antKnockedBack[i] = false;
        antKnockbackTimer[i] = 0;
        antLives[i]++;
        console.log("Ant", i, "lives:", antLives[i]);

        if(!sGetHit1.isPlaying() || !sGetHit2.isPlaying()) {
          sHit = round(random(1,2));
          if(sHit == 1) {
            sGetHit1.play();
          } else {
            sGetHit2.play();
          }       
        }

      }
      // Push ants with health > 1 out of the way when walking (not dashing)
      else if (end == false && antHealth[i] > 1 && !dash) {
        // Calculate gentle push direction (away from player)
        let dx = antX[i] - playerX;
        let dy = antY[i] - playerY;
        let distance = dist(playerX, playerY, antX[i], antY[i]);
        
        if (distance > 0) {
          let pushSpeed = playerSpeed * 4 / antSize[i]; // Push inversely proportional to ant size
          
          // If already knocked back, add to existing velocity instead of replacing
          if (antKnockedBack[i]) {
            // Continue pushing in the new direction
            antKnockbackVelX[i] = (dx / distance) * pushSpeed;
            antKnockbackVelY[i] = (dy / distance) * pushSpeed;
            antKnockbackTimer[i] = max(antKnockbackTimer[i], 10); // Extend timer if needed
          } else {
            // Start new knockback and deal damage
            antHealth[i] -= 0.2;
            
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
              score += 100 * combo;
              expProgress += 100 * combo;
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
  
  for (let i = 1; i < enemyCount + 1; i++) {
    // Skip if ant is already knocked back (can only be hit once per dash)
    if (antKnockedBack[i]) continue;
    
    let antHitboxSize = 20.25 + (6.75 * antSize[i]);
    if(playerX > (antX[i] - antHitboxSize) && playerY > (antY[i] - antHitboxSize) && 
       playerX < (antX[i] + antHitboxSize) && playerY < (antY[i] + antHitboxSize)) {
      
      // Deal damage based on Horns upgrade (1 + 0.2 per level)
      let dashDamage = 1 + (upgrade12Level * 0.2);
      antHealth[i] -= dashDamage;
      
      // Calculate knockback direction (away from player)
      let dx = antX[i] - playerX;
      let dy = antY[i] - playerY;
      let distance = dist(playerX, playerY, antX[i], antY[i]);
      
      // Normalize and apply knockback velocity
      if (distance > 0) {
        let knockbackSpeed = playerSpeed * 4 / antSize[i]; // Knockback inversely proportional to ant size
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
        streakPoints += comboPoints;
        addScore(100 + comboPoints);
        health++;
        addDeathEffect(antX[i], antY[i], 100 + comboPoints);
        antX[i] = random(0, getGameplayWidth());
        antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
        spawnX[i] = antX[i] + cos(angleFromSpawn[i]);
        spawnY[i] = antY[i] + sin(angleFromSpawn[i]);
        antHealth[i] = antMaxHealth[i];
        antKnockedBack[i] = false;
        antKnockbackTimer[i] = 0;
        
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

function handleAntKnockback() {
  for (let i = 1; i <= enemyCount; i++) {
    if (antKnockedBack[i]) {
      // Apply knockback velocity
      antX[i] += antKnockbackVelX[i];
      antY[i] += antKnockbackVelY[i];
      
      // Apply friction to slow down
      antKnockbackVelX[i] *= 0.95;
      antKnockbackVelY[i] *= 0.95;
      
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
      }
    }
  }
}


function enemyShoot1() {
  if (end == false) {
    for (let i = 1; i < enemyCount + 1; i++) {
      if (frameCount % bulletCooldown[i] === 0) {

        let vx = ((playerX + shotOffsetX[i]) - antX[i] + 1) /
                 (bulletSpeed[i] * (bulletSize[i] ** bulletSize[i]));
        let vy = ((playerY + shotOffsetY[i]) - antY[i] + 1) /
                 (bulletSpeed[i] * (bulletSize[i] ** bulletSize[i]));

        let bullet = {
          x: antX[i],
          y: antY[i],
          speedX: vx,
          speedY: vy,
          angle: atan2((playerY + shotOffsetY[i]) - antY[i],
                       (playerX + shotOffsetX[i]) - antX[i]),
          life: 0,
          explodeAfter: bulletExplodeAfter[i], // per-ant timer

          size: bulletSize[i]                  // 🔴 key: keep the bullet's size
        };

        enemyBullets[i].push(bullet);
      }

      // Update and draw bullets
      for (let b = enemyBullets[i].length - 1; b >= 0; b--) {
        let bullet = enemyBullets[i][b];

        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;
        bullet.life++;

        // --- EXPLOSION TRIGGER ---
        let shouldExplode = false;

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

        if (shouldExplode) {
          spawnEnemyExplosion(bullet.x, bullet.y, bullet.size, i);
          enemyBullets[i].splice(b, 1);
          continue;
        }

        // draw bullet (check if should be visible with Tiger Beetle flash)
        let shouldDrawBullet = true;
        let bulletFadeAmount = 255;
        if (tigerBeetleActive && tigerBeetleMoving) {
          // Check if this bullet is in the flashing entities list
          shouldDrawBullet = false;
          for (let f = 0; f < flashingEntities.length; f++) {
            if (flashingEntities[f].type === 'bullet' && flashingEntities[f].owner === i && flashingEntities[f].index === b) {
              shouldDrawBullet = true;
              bulletFadeAmount = flashingEntities[f].fade;
              break;
            }
          }
        }
        
        if (shouldDrawBullet) {
          push();
          // Apply fade if Tiger Beetle is active
          if (tigerBeetleActive && tigerBeetleMoving) {
            tint(255, bulletFadeAmount);
          }
          angleMode(DEGREES);
          imageMode(CENTER);
          translate(bullet.x, bullet.y);
          rotate(bullet.angle);
          image(bulletImage, 0, 0, (20 * bulletSize[i]), (20 * bulletSize[i]));
          pop();
        }

        if (!sSpit1.isPlaying() && !sSpit2.isPlaying()) {
          sHit = round(random(1, 2));
          if (sHit == 1) {
            sSpit1.play();
          } else {
            sSpit2.play();
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
          enemyBullets[i].splice(b, 1);
          handlePlayerHit(i);
        }
      }
    }
  }
}


function handlePlayerHit(i){
  if (end == false){
    playerLastDamageFrame = frameCount;  // Track when player took damage
    if (shield > 0){
      shield = shield - bulletSize[i];
      antPoints[i] = antPoints[i] + bulletSize[i];
      console.log("Ant", i, "points:", antPoints[i]);
      if(!sShieldHit1.isPlaying() || !sShieldHit2.isPlaying()) {
        sHit = round(random(1,2));
        if(sHit == 1) {
          sShieldHit1.play();
        } else {
          sShieldHit2.play();
        }       
      }
    } else {
      health = health - bulletSize[i];
      antPoints[i] = antPoints[i] + bulletSize[i];
      console.log("Ant", i, "points:", antPoints[i]);
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

    // bullet collisions
    for (let j = 1; j < enemyCount + 1; j++) {
      if (
        b.x < antX[j] + 25 &&
        b.x > antX[j] - 25 &&
        b.y < antY[j] + 25 &&
        b.y > antY[j] - 25
      ) {
        // Deal damage to ant with Potent Acid multiplier
        let bulletDamage = 1 + (upgrade13Level * 0.2);
        antHealth[j] -= bulletDamage;
        
        // Only kill ant if health drops to 0 or below
        if (antHealth[j] <= 0) {
          antLives[j]++;
          comboTime = 60;
          combo++;
          calculateBonus();
          streakPoints += comboPoints;
          addScore(100 + comboPoints);
          health++;
          addDeathEffect(antX[j], antY[j], 100 + comboPoints);
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
        break;
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
    //console.log(round(dashCoolDown));
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
      
      for (let i = 1; i <= enemyCount; i++) {
        for (let b = enemyBullets[i].length - 1; b >= 0; b--) {
          let bullet = enemyBullets[i][b];
          let bulletDistance = dist(playerX, playerY, bullet.x, bullet.y);
            
            if (bulletDistance <= maxRadius) {
              // Check if this bullet gets deflected
              if (random() < deflectChance) {
                // Convert to player bullet
                // Calculate angle from bullet to nearest ant
                let nearestAntDist = Infinity;
                let targetAngle = 0;
                
                for (let j = 1; j <= enemyCount; j++) {
                  let distToAnt = dist(bullet.x, bullet.y, antX[j], antY[j]);
                  if (distToAnt < nearestAntDist) {
                    nearestAntDist = distToAnt;
                    targetAngle = atan2(antY[j] - bullet.y, antX[j] - bullet.x) * (180 / PI);
                  }
                }
                
                playerBullets.push({
                  x: bullet.x,
                  y: bullet.y,
                  rotation: targetAngle
                });
                
                // Remove the enemy bullet
                enemyBullets[i].splice(b, 1);
              }
            }
          }
        }
      
      // Deal damage when radius reaches max
      let windDamage = 0.5 + (upgrade16Level * 0.14); // 0.5 to 1.2 in 5 steps
      let knockbackMultiplier = 4 + (upgrade18Level * 2); // 4, 6, 8, 10 in 3 steps
      
      for (let i = 1; i <= enemyCount; i++) {
        let distance = dist(playerX, playerY, antX[i], antY[i]);
        if (distance <= maxRadius) {
          // Deal damage
          antHealth[i] -= windDamage;
          
          // Apply knockback
          let angle = atan2(antY[i] - playerY, antX[i] - playerX);
          let knockbackSpeed = (movementSpeed / enemyCount) * knockbackMultiplier / antSize[i];
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
            streakPoints += comboPoints;
            addScore(100 + comboPoints);
            health++;
            addDeathEffect(antX[i], antY[i], 100 + comboPoints);
            antX[i] = random(0, getGameplayWidth());
            antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
            spawnX[i] = antX[i] + cos(angleFromSpawn[i]);
            spawnY[i] = antY[i] + sin(angleFromSpawn[i]);
            antHealth[i] = antMaxHealth[i];
            antKnockedBack[i] = false;
            antKnockbackTimer[i] = 0;
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
            let roundedCombo = Math.ceil(combo / 5) * 5;
            comboPoints = (roundedCombo / 5) * comboConstant; // Calculate bonus points
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

function addDeathEffect(x, y, points = 100) {
  // death burst
  deathAnimations.push({
    x: x,
    y: y,
    size: 10,
    opacity: 255,
  });

  // floating score text
  floatingTexts.push({
    x: x,
    y: y - 10,
    text: `+${points}`,
    opacity: 255,
    riseSpeed: 1.5,
  });
}

function spawnEnemyExplosion(x, y, size, ownerId) {
  const BASE_RADIUS     = 20;  // radius for size 1
  const RADIUS_PER_SIZE = 40;

  const BASE_LIFE       = 10;  // frames for size 1 (~0.3 sec)
  const LIFE_PER_SIZE   = 20;

  let radius  = (BASE_RADIUS + RADIUS_PER_SIZE * (size - 1)) * explosionRadiusMultiplier[ownerId];
  let maxLife = (BASE_LIFE   + LIFE_PER_SIZE   * (size - 1)) * explosionResidueMultiplier[ownerId];

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

    // --- Calculate movement ---
    let dx = anchorPointX[i] - antX[i];
    let dy = anchorPointY[i] - antY[i];
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
      textAlign(CENTER);
      textSize(24);
      noStroke();
      fill(255, 255, 0, t.opacity);
      text(t.text, t.x, t.y);
    pop();

    // Animate floating upward and fading out
    t.y -= t.riseSpeed;
    t.opacity -= 5;
    if (t.opacity <= 0) floatingTexts.splice(i, 1);
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
          return;
        }
      }
    }
    
    // Single player mode
    if(levelEnd == 0){
      intermissionMenu = false;
      intermissionMenuCooldown = 0;
      gameOverMenu = false;
      gameOverMenuCooldown = 0;
      totalScore = totalScore + score;
      score = 0;  // Reset score to prevent double-counting in drawScoreboard
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
      text(highScore, getMenuWidth() / 2 + getMenuWidth() * 0.18, getMenuHeight() * 0.46);

      textSize(24);
      fill(180, 220, 255);
      text(`Final Health`, getMenuWidth() / 2 - getMenuWidth() * 0.20, getMenuHeight() * 0.56);
      text(`Total Score`, getMenuWidth() / 2 + getMenuWidth() * 0.20, getMenuHeight() * 0.56);

      textSize(42);
      fill(255, 90, 90);
      text(Math.max(0, health).toFixed(2), getMenuWidth() / 2 - getMenuWidth() * 0.20, getMenuHeight() * 0.61);

      fill(240, 164, 0);
      text(totalScore, getMenuWidth() / 2 + getMenuWidth() * 0.20, getMenuHeight() * 0.61);

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
      // Only update global totalScore in single player mode
      if (!multiplayerMode) {
        totalScore = totalScore + score;
        score = 0;  // Reset score to prevent double-counting in drawScoreboard
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

    const intermissionRound = level;
    const intermissionHealth = health;
    
    // Calculate scores to display based on mode
    let displayScore = score;
    let displayTotal;
    if (multiplayerMode && players.length > 0) {
      // In multiplayer, show current player's total + this round's score
      displayTotal = players[currentPlayerIndex].totalScore + score;
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
      text(displayScore, getMenuWidth() / 2 - getMenuWidth() * 0.15, getMenuHeight() * 0.46);
      text(displayTotal, getMenuWidth() / 2 + getMenuWidth() * 0.15, getMenuHeight() * 0.46);

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
      text(highScore, getMenuWidth() / 2 + getMenuWidth() * 0.20, getMenuHeight() * 0.61);

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
      let upgradeLevels = [upgrade1Level, upgrade2Level, upgrade3Level, upgrade4Level, upgrade5Level, upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level];
      let upgradeMaxLevels = [4, 5, 5, 9, 8, 5, 5, 5, 1, 1, 1, 4, 4, 1, 5, 5, 5, 3, 4, 5];  // Walking Speed, Dash Speed, Dash Cooldown, Add Shield, Add Bullets, Shield Regen, Bullet Reload, Bullet Speed, Free-Angle Aiming, Tiger Beetle, Oogpister Beetle, Horns, Potent Acid, Shockwave, Shockwave Radius, Shockwave Damage, Shockwave Cooldown, Shockwave Knockback, Shockwave Deflection, Health Regeneration
      
      // Filter out maxed upgrades and locked upgrades (prerequisites not met)
      let availableUpgrades = [];
      for (let i = 0; i < 20; i++) {
        // Check if upgrade is not maxed
        if (upgradeLevels[i] < upgradeMaxLevels[i]) {
          // Check prerequisites
          if (i === 5 && upgrade4Level === 0) continue;  // Shield Regeneration requires Add Shield
          if (i === 6 && upgrade5Level === 0) continue;  // Bullet Reload requires Add Bullets
          if (i === 7 && upgrade5Level === 0) continue;  // Bullet Speed requires Add Bullets
          if (i === 8 && (upgrade5Level === 0 || upgrade7Level === 0 || upgrade8Level === 0)) continue;  // Free-Angle Aiming requires Add Bullets, Bullet Reload, and Bullet Speed
          if (i === 9 && upgrade3Level < 5) continue;  // Tiger Beetle requires Dash Cooldown maxed
          if (i === 10 && upgrade7Level < 3) continue;  // Oogpister Beetle requires Bullet Reload level 3+
          if (i === 12 && upgrade5Level === 0) continue;  // Potent Acid requires Add Bullets
          if (i === 14 && upgrade14Level === 0) continue;  // Shockwave Radius requires Shockwave Unlock
          if (i === 15 && upgrade14Level === 0) continue;  // Shockwave Damage requires Shockwave Unlock
          if (i === 16 && upgrade14Level === 0) continue;  // Shockwave Cooldown requires Shockwave Unlock
          if (i === 17 && upgrade14Level === 0) continue;  // Shockwave Knockback requires Shockwave Unlock
          if (i === 18 && upgrade14Level === 0) continue;  // Shockwave Deflection requires Shockwave Unlock
          availableUpgrades.push(i);
        }
      }
      
      // Randomly select up to 3 upgrades from available ones
      displayedUpgrades = [];
      let numToSelect = min(3, availableUpgrades.length);
      for (let i = 0; i < numToSelect; i++) {
        let randomIndex = floor(random(availableUpgrades.length));
        displayedUpgrades.push(availableUpgrades[randomIndex]);
        availableUpgrades.splice(randomIndex, 1);
      }
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
        nextRound();
      } else if (touches.length > 0) {
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
  // Define all 18 upgrade options with their max levels
  let upgradeMaxLevels = [4, 5, 5, 9, 8, 5, 5, 5, 1, 1, 1, 4, 4, 1, 5, 5, 5, 3];
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
      description: 'Increase dash damage. Each level adds 0.2 damage.',
      level: upgrade12Level,
      maxLevel: 4
    },
    {
      title: 'Potent Acid',
      description: 'Increase bullet damage. Each level adds 20% damage (doubles at max level). Requires Add Bullets.',
      level: upgrade13Level,
      maxLevel: 4
    },
    {
      title: 'Shockwave',
      description: 'Unlock a circular AOE shockwave attack (E key / RB). Deals knockback and 0.5 damage.',
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
      description: 'Regenerate health after 200 frames without taking damage. Can exceed 10 health but slows down, stopping at 30. Rates: 0.001→0.1/frame.',
      level: upgrade20Level,
      maxLevel: 5
    }
  ];
  
  // Get the randomly selected upgrades
  let upgrades = displayedUpgrades.map(index => allUpgrades[index]);
  let numOptions = displayedUpgrades.length;

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

      // Title
      if (selectedUpgrade === i) {
        fill(10);  // Dark text on white background
      } else {
        fill(255);  // White text on dark background
      }
      textSize(28);
      textAlign(CENTER, CENTER);
      text(upgrades[i].title, cardX, cardY - cardHeight * 0.28);

      // Description
      if (selectedUpgrade === i) {
        fill(40);  // Dark grey text on white background
      } else {
        fill(180);  // Light grey text on dark background
      }
      textSize(16);
      textAlign(CENTER, TOP);
      text(upgrades[i].description, cardX, cardY + cardHeight * 0.02, cardWidth * 0.8, cardHeight * 0.4);

      // Level counter at bottom
      if (selectedUpgrade === i) {
        fill(10);  // Dark text on white background
      } else {
        fill(255);  // White text on dark background
      }
      textSize(20);
      textAlign(CENTER, CENTER);
      let levelText = upgrades[i].level >= upgrades[i].maxLevel ? 'MAX LEVEL' : `Level ${upgrades[i].level}`;
      text(levelText, cardX, cardY + cardHeight * 0.38);
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
    }
  endMenuScaling();
}

function applyUpgrade(upgradeIndex) {
  // Get the actual upgrade ID from the displayed upgrades
  let actualUpgradeId = displayedUpgrades[upgradeIndex];
  let upgradeMaxLevels = [4, 5, 5, 9, 8, 5, 5, 5, 1, 1, 1, 4, 4, 1, 5, 5, 5, 3];
  
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
  }
  
  // Level up the EXP system
  expProgress -= expRequired;
  expLevel++;
  let roundedEXPLevel = Math.ceil(expLevel / 5);
  expRequired += 500 * roundedEXPLevel;
  
  // Check if another upgrade is available immediately
  if (expProgress >= expRequired) {
    upgradeAvailable = true;
    // Keep upgrade menu active and regenerate upgrade options
    let upgradeLevels = [upgrade1Level, upgrade2Level, upgrade3Level, upgrade4Level, upgrade5Level, upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level];
    let upgradeMaxLevels = [4, 5, 5, 9, 8, 5, 5, 5, 1, 1, 1, 4, 4, 1, 5, 5, 5, 3, 4, 5];
    let availableUpgrades = [];
    for (let i = 0; i < 20; i++) {
      // Check if upgrade is not maxed
      if (upgradeLevels[i] < upgradeMaxLevels[i]) {
        // Check prerequisites
        if (i === 5 && upgrade4Level === 0) continue;  // Shield Regeneration requires Add Shield
        if (i === 6 && upgrade5Level === 0) continue;  // Bullet Reload requires Add Bullets
        if (i === 7 && upgrade5Level === 0) continue;  // Bullet Speed requires Add Bullets
        if (i === 8 && (upgrade5Level === 0 || upgrade7Level === 0 || upgrade8Level === 0)) continue;  // Free-Angle Aiming requires Add Bullets, Bullet Reload, and Bullet Speed
        if (i === 9 && upgrade3Level < 5) continue;  // Tiger Beetle requires Dash Cooldown maxed
        if (i === 10 && upgrade7Level < 3) continue;  // Oogpister Beetle requires Bullet Reload level 3+
        if (i === 12 && upgrade5Level === 0) continue;  // Potent Acid requires Add Bullets
        if (i === 14 && upgrade14Level === 0) continue;  // Shockwave Radius requires Shockwave Unlock
        if (i === 15 && upgrade14Level === 0) continue;  // Shockwave Damage requires Shockwave Unlock
        if (i === 16 && upgrade14Level === 0) continue;  // Shockwave Cooldown requires Shockwave Unlock
        if (i === 17 && upgrade14Level === 0) continue;  // Shockwave Knockback requires Shockwave Unlock
        if (i === 18 && upgrade14Level === 0) continue;  // Bullet Deflection requires Shockwave Unlock
        availableUpgrades.push(i);
      }
    }
    
    displayedUpgrades = [];
    let numToSelect = min(3, availableUpgrades.length);
    for (let i = 0; i < numToSelect; i++) {
      let randomIndex = floor(random(availableUpgrades.length));
      displayedUpgrades.push(availableUpgrades[randomIndex]);
      availableUpgrades.splice(randomIndex, 1);
    }
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
  let levels = [upgrade1Level, upgrade2Level, upgrade3Level, upgrade4Level, upgrade5Level, upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level];
  let upgradeNames = ['Walking Speed', 'Dash Speed', 'Dash Cooldown', 'Add Shield', 'Add Bullets', 'Shield Regeneration', 'Bullet Reload', 'Bullet Speed', 'Free-Angle Aiming', 'Tiger Beetle', 'Oogpister Beetle', 'Horns', 'Potent Acid', 'Shockwave', 'Shockwave Radius', 'Shockwave Damage', 'Shockwave Cooldown', 'Shockwave Knockback', 'Bullet Deflection', 'Health Regeneration'];
  console.log(`${upgradeNames[actualUpgradeId]} selected! Level: ${levels[actualUpgradeId]}`);
  
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
  console.log("-------------------------------");
  console.log("=== Live Ant Rankings ===");
  for (let i = 0; i < antStats.length; i++) {
    console.log(
      `#${i + 1}: Ant ${antStats[i].id}  | Points: ${antStats[i].points}  | Lives: ${antStats[i].lives}  | Ratio: ${antStats[i].ratio.toFixed(2)}`
    );
  }

  console.log(`Currently winning ant: ${antStats[0].id} with ratio ${antStats[0].ratio.toFixed(2)}`);

}

function printWinningAntStats() {
  const topAnts = getTopAnts();
  const count1 = Math.round((enemyCount + 1) * 0.5);
  const count2 = Math.round((enemyCount + 1) * 0.3);
  const count3 = (enemyCount + 1) - count1 - count2;
  console.log("===============================");
  console.log("=== Round Over: Top 3 Ants ===");
  for (let i = 0; i < topAnts.length; i++) {
    const ant = topAnts[i];
    console.log(
      `#${i + 1}: Ant ${ant.id} | Points: ${ant.points} | Lives: ${ant.lives} | Ratio: ${ant.ratio.toFixed(2)}`
    );
    console.log(
      `   bulletSpeed: ${bulletSpeed[ant.id].toFixed(2)}, bulletCooldown: ${bulletCooldown[ant.id]}, antSpeed: ${antSpeed[ant.id].toFixed(2)}`
    );
    console.log(
      `   shotOffsetX: ${shotOffsetX[ant.id].toFixed(2)}, shotOffsetY: ${shotOffsetY[ant.id].toFixed(2)}`
    );
    console.log(
      `   followValue: ${followValue[ant.id].toFixed(2)}, autonomy: ${autonomy[ant.id].toFixed(2)}, bulletSize: ${bulletSize[ant.id].toFixed(2)}`
    );
    console.log(
      `   standingPointX: ${standingPointX[ant.id].toFixed(2)}, standingPointY: ${standingPointY[ant.id]}, distanceFromAnchor: ${distanceFromAnchor[ant.id].toFixed(2)}`
    );
  }

  console.log(`
Next generation distribution:`);
  console.log(`   ${count1} ants inherit from #1`);
  console.log(`   ${count2} ants inherit from #2`);
  console.log(`   ${count3} ants inherit from #3`);
  console.log("===============================");
}



function nextRound(){
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
    console.log("Using custom ant stats from dev tools");
    topAnts = [
      { id: -1, custom: true, stats: customAntStats[0] },
      { id: -2, custom: true, stats: customAntStats[1] },
      { id: -3, custom: true, stats: customAntStats[2] }
    ];
  } else {
    topAnts = getTopAnts();  // Get top 3 from actual performance
    console.log("Top ants this round:", topAnts);
    
    // Update customAntStats to reflect actual winners (for viewing in dev tools)
    syncActualWinnersToCustomStats(topAnts);
  }
  
  level++;
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
  
  // antSize mutation rate: 0 until round 10, then 0.2
  let antSizeMutationRate = (level >= 10) ? 0.2 : 0;

  playerRotationValue = 0;
  bulletShot[enemyIndex] = 0;
  playerX = width / 2;
  playerY = height / 2;
  console.log("enemy count:", enemyCount);

  shield = shieldQuantity > 0 ? shieldQuantity : 0;
  shot = bulletQuantity > 0 ? bulletQuantity : 0;
  dashCoolDown = 0;

  // playerSpeed will be set after ant creation (based on actual enemyCount)
  
  endmusic.stop();
  gamemusic.play();
  

  // Allocate slots per winner (50%, 30%, remainder)
  let slots1 = Math.round(totalAntSlots * 0.5);
  let slots2 = Math.round(totalAntSlots * 0.3);
  let slots3 = totalAntSlots - slots1 - slots2;  // Gets the remainder
  
  console.log(`Slot allocation: #1=${slots1}, #2=${slots2}, #3=${slots3} (total ${totalAntSlots})`);

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
    const SLOT_EPSILON = 0.001;  // Tolerance for floating point comparisons
    
    while (usedSlots < group.slots && antIndex <= MAX_ANTS) {
      let i = antIndex;
      let parent = group.parent;
    
    // Set ant spawn position
    antX[i] = random(0, getGameplayWidth());
    antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, getGameplayHeight() - expBarHeight - expBarBuffer - ANT_SPAWN_BUFFER);
    
    strikeX[i] = 0;
    strikeY[i] = 0;
    strikeTime1[i] = 0;
    drawStrike1[i] = 1;
    bulletShot[i] = 0;
    enemyBullets[i] = [];

    if (parent) {
      // Check if this is a custom ant from dev tools
      if (parent.custom && parent.stats) {
        console.log(`Ant ${i} inherits from custom ant template #${Math.abs(parent.id)}`);
        let s = parent.stats;
        bulletSpeed[i]   = constrain(s.bulletSpeed   + random(-50, 50), 60, 300);
        bulletCooldown[i]= constrain(floor(s.bulletCooldown + random(-5, 5)), 79, 200);
        antSpeed[i]      = constrain(s.antSpeed      + random(-0.3, 0.3), 0.9, 3.5);
        shotOffsetX[i]   = constrain(s.shotOffsetX   + random(-50, 50), -500, 500);
        shotOffsetY[i]   = constrain(s.shotOffsetY   + random(-50, 50), -500, 500);
        standingPointX[i]   = constrain(s.standingPointX   + random(-100, 100), 0, getGameplayWidth());
        standingPointY[i]   = constrain(s.standingPointY   + random(-100, 100), scoreBarHeight, getGameplayHeight());
        followValue[i]    = constrain(s.followValue    + random(-movementMutationRate, movementMutationRate), -0.5, 3.49);
        autonomy[i]    = constrain(s.autonomy    + random(-movementMutationRate, movementMutationRate), -0.5, 1.5);
        distanceFromAnchor[i]    = constrain(s.distanceFromAnchor    + random(-100, 100), 0.1, 1000);
        explosionBehavior[i]    = constrain(s.explosionBehavior    + random(-movementMutationRate, movementMutationRate), -0.5, 2.5);
        explosionProximity[i]    = constrain(s.explosionProximity    + random(-100, 100), 0.1, 1000);
        angleFromSpawn[i]    = constrain(s.angleFromSpawn    + random((-PI / 3), (PI / 3)), 0, TWO_PI);
        bulletSize[i]    = constrain(s.bulletSize    + random(-(movementMutationRate / 2), (movementMutationRate / 2)), 1, 3);
        explosionRadiusMultiplier[i] = constrain(s.explosionRadiusMultiplier + random(-0.2, 0.2), 0.5, 3);
        explosionResidueMultiplier[i] = constrain(s.explosionResidueMultiplier + random(-0.2, 0.2), 0.5, 3);
        bulletExplodeAfter[i] = constrain(s.bulletExplodeAfter + random(-50, 50), 100, 800);
        antSize[i] = constrain(s.antSize + random(-antSizeMutationRate, antSizeMutationRate), 0.3, 3);
        // Cap bullet size based on ant size (small ants can't have huge bullets)
        let maxBulletSize = min(3, antSize[i] + 1.0);
        bulletSize[i] = min(bulletSize[i], maxBulletSize);
        antMaxHealth[i] = antSize[i];
        antHealth[i] = antMaxHealth[i];
        antKnockedBack[i] = false;
        antKnockbackTimer[i] = 0;
      } else {
        // Regular ant from game performance
        console.log(`Ant ${i} inherits from parent Ant ${parent.id}`);
        bulletSpeed[i]   = constrain(bulletSpeed[parent.id]   + random(-50, 50), 60, 300);
        bulletCooldown[i]= constrain(floor(bulletCooldown[parent.id] + random(-5, 5)), 79, 200);
        antSpeed[i]      = constrain(antSpeed[parent.id]      + random(-0.3, 0.3), 0.9, 3.5);
        shotOffsetX[i]   = constrain(shotOffsetX[parent.id]   + random(-50, 50), -500, 500);
        shotOffsetY[i]   = constrain(shotOffsetY[parent.id]   + random(-50, 50), -500, 500);
        standingPointX[i]   = constrain(standingPointX[parent.id]   + random(-100, 100), 0, getGameplayWidth());
        standingPointY[i]   = constrain(standingPointY[parent.id]   + random(-100, 100), scoreBarHeight, getGameplayHeight());
        followValue[i]    = constrain(followValue[parent.id]    + random(-movementMutationRate, movementMutationRate), -0.5, 3.49);
        autonomy[i]    = constrain(autonomy[parent.id]    + random(-movementMutationRate, movementMutationRate), -0.5, 1.5);
        distanceFromAnchor[i]    = constrain(distanceFromAnchor[parent.id]    + random(-100, 100), 0.1, 1000);
        explosionBehavior[i]    = constrain(explosionBehavior[parent.id]    + random(-movementMutationRate, movementMutationRate), -0.5, 2.5);
        explosionProximity[i]    = constrain(explosionProximity[parent.id]    + random(-100, 100), 0.1, 1000);
        angleFromSpawn[i]    = constrain(angleFromSpawn[parent.id]    + random((-PI / 3), (PI / 3)), 0, TWO_PI);
        bulletSize[i]    = constrain(bulletSize[parent.id]    + random(-(movementMutationRate / 2), (movementMutationRate / 2)), 1, 3);
        explosionRadiusMultiplier[i] = constrain(explosionRadiusMultiplier[parent.id] + random(-0.2, 0.2), 0.5, 3);
        explosionResidueMultiplier[i] = constrain(explosionResidueMultiplier[parent.id] + random(-0.2, 0.2), 0.5, 3);
        bulletExplodeAfter[i] = constrain(bulletExplodeAfter[parent.id] + random(-50, 50), 100, 800);
        antSize[i] = constrain(antSize[parent.id] + random(-antSizeMutationRate, antSizeMutationRate), 0.3, 3);
        // Cap bullet size based on ant size (small ants can't have huge bullets)
        let maxBulletSize = min(3, antSize[i] + 1.0);
        bulletSize[i] = min(bulletSize[i], maxBulletSize);
        antMaxHealth[i] = antSize[i];
        antHealth[i] = antMaxHealth[i];
        antKnockedBack[i] = false;
        antKnockbackTimer[i] = 0;
      }

      if (Math.round(autonomy[i]) === 0){
        followTarget[i] = true;
        keepDistance[i] = false;
      } else if (Math.round(autonomy[i]) === 1){
        followTarget[i] = false;
        keepDistance[i] = true;
      }
      if (Math.round(explosionBehavior[i]) === 0){
        explodeOnTermination[i] = false;
        triggerExplodeViaProximity[i] = false;
      } else if (Math.round(explosionBehavior[i]) === 1){
        explodeOnTermination[i] = true;
        triggerExplodeViaProximity[i] = false;
      } else if (Math.round(explosionBehavior[i]) === 2){
        explodeOnTermination[i] = false;
        triggerExplodeViaProximity[i] = true;
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
        ? constrain(bulletSpeed[winner.id] + random(-50, 50), 60, 300)   
        : random(60, 300);

      bulletCooldown[i] = winner 
        ? constrain(floor(bulletCooldown[winner.id] + random(-5, 5)), 79, 200)
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
      
      standingPointX[i] = winner 
        ? constrain(standingPointX[winner.id] + random(-100, 100), 0, getGameplayWidth())
        : random(0, getGameplayWidth());

      standingPointY[i] = winner 
        ? constrain(standingPointY[winner.id] + random(-100, 100), scoreBarHeight, getGameplayHeight() - expBarHeight - expBarBuffer)
        : random(scoreBarHeight, getGameplayHeight() - expBarHeight - expBarBuffer);
      
      followValue[i] = winner 
        ? constrain(followValue[winner.id] + random(-movementMutationRate, movementMutationRate), -0.5, 3.49)
        : random(-0.5, 3.49);
      
      autonomy[i] = winner 
        ? constrain(autonomy[winner.id] + random(-movementMutationRate, movementMutationRate), -0.5, 1.5)
        : random(-0.5, 1.5);
      
      distanceFromAnchor[i] = winner 
        ? constrain(distanceFromAnchor[winner.id] + random(-100, 100), 0.1, 1000)
        : random(0.1, 1000);
      
      explosionBehavior[i] = winner
        ? constrain(explosionBehavior[winner.id] + random(-movementMutationRate, movementMutationRate), -0.5, 2.5)
        : random(-0.5, 2.5);
      
      explosionProximity[i] = winner
        ? constrain(explosionProximity[winner.id] + random(-100, 100), 0.1, 1000)
        : random(0.1, 1000);
      
      angleFromSpawn[i] = winner 
        ? constrain(angleFromSpawn[winner.id] + random((-PI / 3), (PI / 3)), 0, TWO_PI)
        : random(0, TWO_PI);
      
      bulletSize[i] = winner 
        ? constrain(bulletSize[winner.id] + random(-(movementMutationRate / 2), (movementMutationRate / 2)), 1, 3)
        : random(1, 3);

      explosionRadiusMultiplier[i] = winner
        ? constrain(explosionRadiusMultiplier[winner.id] + random(-0.2, 0.2), 0.5, 3)
        : random(0.5, 3);

      explosionResidueMultiplier[i] = winner
        ? constrain(explosionResidueMultiplier[winner.id] + random(-0.2, 0.2), 0.5, 3)
        : random(0.5, 3);

      bulletExplodeAfter[i] = constrain(bulletExplodeAfter[winner.id] + random(-50, 50), 100, 800);
      
      antSize[i] = winner 
        ? constrain(antSize[winner.id] + random(-antSizeMutationRate, antSizeMutationRate), 0.3, 3)
        : 1;  // Start at 1 if no winner
      
      // Cap bullet size based on ant size (small ants can't have huge bullets)
      let maxBulletSize = min(3, antSize[i] + 1.0);
      bulletSize[i] = min(bulletSize[i], maxBulletSize);
      
      antMaxHealth[i] = antSize[i];
      antHealth[i] = antMaxHealth[i];
      antKnockedBack[i] = false;
      antKnockbackTimer[i] = 0;
      antKnockbackVelX[i] = 0;
      antKnockbackVelY[i] = 0;
      
      if (Math.round(autonomy[i]) === 0){
        followTarget[i] = true;
        keepDistance[i] = false;
      } else if (Math.round(autonomy[i]) === 1){
        followTarget[i] = false;
        keepDistance[i] = true;
      }
      if (Math.round(explosionBehavior[i]) === 0){
        explodeOnTermination[i] = false;
        triggerExplodeViaProximity[i] = false;
      } else if (Math.round(explosionBehavior[i]) === 1){
        explodeOnTermination[i] = true;
        triggerExplodeViaProximity[i] = false;
      } else if (Math.round(explosionBehavior[i]) === 2){
        explodeOnTermination[i] = false;
        triggerExplodeViaProximity[i] = true;
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
      console.log(`  Ant ${i} (size ${antSize[i].toFixed(2)}) won't fit in remaining slots (${(group.slots - usedSlots).toFixed(2)}), skipping`);
      break;  // Exit this winner's loop
    }
    
    antPoints[i] = 0;
    antLives[i] = 1;

    
    console.log(`Ant ${i} bulletSpeed = ${bulletSpeed[i]}, cooldown = ${bulletCooldown[i]}`);
    
    // Track slot usage and increment counters
    usedSlots += antSize[i];
    antIndex++;
    antsFromThisWinner++;
    
    console.log(`  Ant ${i} from ${group.name}: size=${antSize[i].toFixed(2)}, used slots=${usedSlots.toFixed(2)}/${group.slots}`);
    }
    
    console.log(`Winner ${group.name}: created ${antsFromThisWinner} ants using ${usedSlots.toFixed(2)}/${group.slots} slots`);
  }
  
  // Set enemyCount to actual number of ants created
  enemyCount = antIndex - 1;
  playerSpeed = movementSpeed / enemyCount;
  console.log(`Total: Created ${enemyCount} ants across all winners`);

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
        }
        start = true;
        titlemusic.stop();
        gamemusic.play();
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
    
    if (startMenu === false){
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
    if (startMenu === true){
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
            multiplayerMode = false;
            numPlayers = 1;
            // Apply custom ant stats if enabled
            if (devToolsUseCustomAnts) {
              applyCustomAntsToInitialPopulation();
            }
            start = true;
            titlemusic.stop();
            gamemusic.play();
            menuNavigationCooldown = 20;
          }
        } 
        // Check option 1 (Multiplayer)
        else if (mx > option1X - option1W/2 && mx < option1X + option1W/2 &&
                 my > option1Y - option1H/2 && my < option1Y + option1H/2) {
          if (menuNavigationCooldown === 0) {
            playerSelectScreen = true;
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
          multiplayerMode = false;
          numPlayers = 1;
          // Apply custom ant stats if enabled
          if (devToolsUseCustomAnts) {
            applyCustomAntsToInitialPopulation();
          }
          start = true;
          titlemusic.stop();
          gamemusic.play();
        } else if (startMenuSelection === 1) {
          playerSelectScreen = true;
          startMenu = false;
        } else if (startMenuSelection === 2) {
          antdex = true;
          startMenu = false;
          antdexReturnState = 'menu';
        }
        menuNavigationCooldown = 20;
      }

    }
  
  endMenuScaling();
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
  if (movementType1Discovered === true){
    storeItem('movementType1PreviouslyDiscovered', movementType1Discovered)
  }
  if (getItem('movementType1PreviouslyDiscovered') === true){
    movementType1Discovered = getItem('movementType1PreviouslyDiscovered')
  }
  if (movementType2Discovered === true){
    storeItem('movementType2PreviouslyDiscovered', movementType2Discovered)
  }
  if (getItem('movementType2PreviouslyDiscovered') === true){
    movementType2Discovered = getItem('movementType2PreviouslyDiscovered')
  }
  if (movementType3Discovered === true){
    storeItem('movementType3PreviouslyDiscovered', movementType3Discovered)
  }
  if (getItem('movementType3PreviouslyDiscovered') === true){
    movementType3Discovered = getItem('movementType3PreviouslyDiscovered')
  }
  if (movementType4Discovered === true){
    storeItem('movementType4PreviouslyDiscovered', movementType4Discovered)
  }
  if (getItem('movementType4PreviouslyDiscovered') === true){
    movementType4Discovered = getItem('movementType4PreviouslyDiscovered')
  }
  if (movementType5Discovered === true) {
    storeItem('movementType5PreviouslyDiscovered', movementType5Discovered);
  }
  if (getItem('movementType5PreviouslyDiscovered') === true) {
    movementType5Discovered = getItem('movementType5PreviouslyDiscovered');
  }

  if (movementType6Discovered === true) {
    storeItem('movementType6PreviouslyDiscovered', movementType6Discovered);
  }
  if (getItem('movementType6PreviouslyDiscovered') === true) {
    movementType6Discovered = getItem('movementType6PreviouslyDiscovered');
  }

  if (movementType7Discovered === true) {
    storeItem('movementType7PreviouslyDiscovered', movementType7Discovered);
  }
  if (getItem('movementType7PreviouslyDiscovered') === true) {
    movementType7Discovered = getItem('movementType7PreviouslyDiscovered');
  }

  if (movementType8Discovered === true) {
    storeItem('movementType8PreviouslyDiscovered', movementType8Discovered);
  }
  if (getItem('movementType8PreviouslyDiscovered') === true) {
    movementType8Discovered = getItem('movementType8PreviouslyDiscovered');
  }
  if (maxSpeedDiscovered === true) {
    storeItem('maxSpeedPreviouslyDiscovered', maxSpeedDiscovered);
  }
  if (getItem('maxSpeedPreviouslyDiscovered') === true) {
    maxSpeedDiscovered = getItem('maxSpeedPreviouslyDiscovered');
  }

  if (minSpeedDiscovered === true) {
    storeItem('minSpeedPreviouslyDiscovered', minSpeedDiscovered);
  }
  if (getItem('minSpeedPreviouslyDiscovered') === true) {
    minSpeedDiscovered = getItem('minSpeedPreviouslyDiscovered');
  }
  if (heavyBulletsDiscovered === true) {
    storeItem('heavyBulletsPreviouslyDiscovered', heavyBulletsDiscovered);
  }
  if (getItem('heavyBulletsPreviouslyDiscovered') === true) {
    heavyBulletsDiscovered = getItem('heavyBulletsPreviouslyDiscovered');
  }

  if (landMineDiscovered === true) {
    storeItem('landMinePreviouslyDiscovered', landMineDiscovered);
  }
  if (getItem('landMinePreviouslyDiscovered') === true) {
    landMineDiscovered = getItem('landMinePreviouslyDiscovered');
  }
  
  if (minBulletSpeedDiscovered === true) {
    storeItem('minBulletSpeedPreviouslyDiscovered', minBulletSpeedDiscovered);
  }
  if (getItem('minBulletSpeedPreviouslyDiscovered') === true) {
    minBulletSpeedDiscovered = getItem('minBulletSpeedPreviouslyDiscovered');
  }

  if (midBulletSpeedDiscovered === true) {
    storeItem('midBulletSpeedPreviouslyDiscovered', midBulletSpeedDiscovered);
  }
  if (getItem('midBulletSpeedPreviouslyDiscovered') === true) {
    midBulletSpeedDiscovered = getItem('midBulletSpeedPreviouslyDiscovered');
  }

  if (maxBulletSpeedDiscovered === true) {
    storeItem('maxBulletSpeedPreviouslyDiscovered', maxBulletSpeedDiscovered);
  }
  if (getItem('maxBulletSpeedPreviouslyDiscovered') === true) {
    maxBulletSpeedDiscovered = getItem('maxBulletSpeedPreviouslyDiscovered');
  }

  if (basicBulletsDiscovered === true) {
    storeItem('basicBulletsPreviouslyDiscovered', basicBulletsDiscovered);
  }
  if (getItem('basicBulletsPreviouslyDiscovered') === true) {
    basicBulletsDiscovered = getItem('basicBulletsPreviouslyDiscovered');
  }

  if (rapidFireDiscovered === true) {
    storeItem('rapidFirePreviouslyDiscovered', rapidFireDiscovered);
  }
  if (getItem('rapidFirePreviouslyDiscovered') === true) {
    rapidFireDiscovered = getItem('rapidFirePreviouslyDiscovered');
  }
  
  if (walkingAntsDiscovered === true) {
    storeItem('walkingAntsPreviouslyDiscovered', walkingAntsDiscovered);
  }
  if (getItem('walkingAntsPreviouslyDiscovered') === true) {
    walkingAntsDiscovered = getItem('walkingAntsPreviouslyDiscovered');
  }

  if (averageFireRateAntsDiscovered === true) {
    storeItem('averageFireRateAntsPreviouslyDiscovered', averageFireRateAntsDiscovered);
  }
  if (getItem('averageFireRateAntsPreviouslyDiscovered') === true) {
    averageFireRateAntsDiscovered = getItem('averageFireRateAntsPreviouslyDiscovered');
  }

  if (minimalFireRateAntsDiscovered === true) {
    storeItem('minimalFireRateAntsPreviouslyDiscovered', minimalFireRateAntsDiscovered);
  }
  if (getItem('minimalFireRateAntsPreviouslyDiscovered') === true) {
    minimalFireRateAntsDiscovered = getItem('minimalFireRateAntsPreviouslyDiscovered');
  }

  if (straightShootingAntsDiscovered === true) {
    storeItem('straightShootingAntsPreviouslyDiscovered', straightShootingAntsDiscovered);
  }
  if (getItem('straightShootingAntsPreviouslyDiscovered') === true) {
    straightShootingAntsDiscovered = getItem('straightShootingAntsPreviouslyDiscovered');
  }

  if (wideShotAntsDiscovered === true) {
    storeItem('wideShotAntsPreviouslyDiscovered', wideShotAntsDiscovered);
  }
  if (getItem('wideShotAntsPreviouslyDiscovered') === true) {
    wideShotAntsDiscovered = getItem('wideShotAntsPreviouslyDiscovered');
  }

  if (wildShotAntsDiscovered === true) {
    storeItem('wildShotAntsPreviouslyDiscovered', wildShotAntsDiscovered);
  }
  if (getItem('wildShotAntsPreviouslyDiscovered') === true) {
    wildShotAntsDiscovered = getItem('wildShotAntsPreviouslyDiscovered');
  }

  if (mostOffTargetAntsDiscovered === true) {
    storeItem('mostOffTargetAntsPreviouslyDiscovered', mostOffTargetAntsDiscovered);
  }
  if (getItem('mostOffTargetAntsPreviouslyDiscovered') === true) {
    mostOffTargetAntsDiscovered = getItem('mostOffTargetAntsPreviouslyDiscovered');
  }

  if (middleStationedAntsDiscovered === true) {
    storeItem('middleStationedAntsPreviouslyDiscovered', middleStationedAntsDiscovered);
  }
  if (getItem('middleStationedAntsPreviouslyDiscovered') === true) {
    middleStationedAntsDiscovered = getItem('middleStationedAntsPreviouslyDiscovered');
  }

  if (chaserAntsDiscovered === true) {
    storeItem('chaserAntsPreviouslyDiscovered', chaserAntsDiscovered);
  }
  if (getItem('chaserAntsPreviouslyDiscovered') === true) {
    chaserAntsDiscovered = getItem('chaserAntsPreviouslyDiscovered');
  }

  if (midrangeAntsDiscovered === true) {
    storeItem('midrangeAntsPreviouslyDiscovered', midrangeAntsDiscovered);
  }
  if (getItem('midrangeAntsPreviouslyDiscovered') === true) {
    midrangeAntsDiscovered = getItem('midrangeAntsPreviouslyDiscovered');
  }

  if (farRangeAntsDiscovered === true) {
    storeItem('farRangeAntsPreviouslyDiscovered', farRangeAntsDiscovered);
  }
  if (getItem('farRangeAntsPreviouslyDiscovered') === true) {
    farRangeAntsDiscovered = getItem('farRangeAntsPreviouslyDiscovered');
  }

  if (playerBasedSnipersDiscovered === true) {
    storeItem('playerBasedSnipersPreviouslyDiscovered', playerBasedSnipersDiscovered);
  }
  if (getItem('playerBasedSnipersPreviouslyDiscovered') === true) {
    playerBasedSnipersDiscovered = getItem('playerBasedSnipersPreviouslyDiscovered');
  }

  // Explosion type persistence
  if (noExplosionDiscovered === true) {
    storeItem('noExplosionPreviouslyDiscovered', noExplosionDiscovered);
  }
  if (getItem('noExplosionPreviouslyDiscovered') === true) {
    noExplosionDiscovered = getItem('noExplosionPreviouslyDiscovered');
  }
  if (timeExplosionDiscovered === true) {
    storeItem('timeExplosionPreviouslyDiscovered', timeExplosionDiscovered);
  }
  if (getItem('timeExplosionPreviouslyDiscovered') === true) {
    timeExplosionDiscovered = getItem('timeExplosionPreviouslyDiscovered');
  }
  if (proximityExplosionDiscovered === true) {
    storeItem('proximityExplosionPreviouslyDiscovered', proximityExplosionDiscovered);
  }
  if (getItem('proximityExplosionPreviouslyDiscovered') === true) {
    proximityExplosionDiscovered = getItem('proximityExplosionPreviouslyDiscovered');
  }

  // Time fuse tiers persistence
  if (quickFuseDiscovered === true) {
    storeItem('quickFusePreviouslyDiscovered', quickFuseDiscovered);
  }
  if (getItem('quickFusePreviouslyDiscovered') === true) {
    quickFuseDiscovered = getItem('quickFusePreviouslyDiscovered');
  }
  if (averageFuseDiscovered === true) {
    storeItem('averageFusePreviouslyDiscovered', averageFuseDiscovered);
  }
  if (getItem('averageFusePreviouslyDiscovered') === true) {
    averageFuseDiscovered = getItem('averageFusePreviouslyDiscovered');
  }
  if (longFuseDiscovered === true) {
    storeItem('longFusePreviouslyDiscovered', longFuseDiscovered);
  }
  if (getItem('longFusePreviouslyDiscovered') === true) {
    longFuseDiscovered = getItem('longFusePreviouslyDiscovered');
  }

  // Proximity tiers persistence
  if (closeProximityDiscovered === true) {
    storeItem('closeProximityPreviouslyDiscovered', closeProximityDiscovered);
  }
  if (getItem('closeProximityPreviouslyDiscovered') === true) {
    closeProximityDiscovered = getItem('closeProximityPreviouslyDiscovered');
  }
  if (averageProximityDiscovered === true) {
    storeItem('averageProximityPreviouslyDiscovered', averageProximityDiscovered);
  }
  if (getItem('averageProximityPreviouslyDiscovered') === true) {
    averageProximityDiscovered = getItem('averageProximityPreviouslyDiscovered');
  }
  if (farProximityDiscovered === true) {
    storeItem('farProximityPreviouslyDiscovered', farProximityDiscovered);
  }
  if (getItem('farProximityPreviouslyDiscovered') === true) {
    farProximityDiscovered = getItem('farProximityPreviouslyDiscovered');
  }

  // Explosion size tiers persistence
  if (smallExplosionDiscovered === true) {
    storeItem('smallExplosionPreviouslyDiscovered', smallExplosionDiscovered);
  }
  if (getItem('smallExplosionPreviouslyDiscovered') === true) {
    smallExplosionDiscovered = getItem('smallExplosionPreviouslyDiscovered');
  }
  if (averageExplosionDiscovered === true) {
    storeItem('averageExplosionPreviouslyDiscovered', averageExplosionDiscovered);
  }
  if (getItem('averageExplosionPreviouslyDiscovered') === true) {
    averageExplosionDiscovered = getItem('averageExplosionPreviouslyDiscovered');
  }
  if (largeExplosionDiscovered === true) {
    storeItem('largeExplosionPreviouslyDiscovered', largeExplosionDiscovered);
  }
  if (getItem('largeExplosionPreviouslyDiscovered') === true) {
    largeExplosionDiscovered = getItem('largeExplosionPreviouslyDiscovered');
  }

  // Explosion residue tiers persistence
  if (lowResidueDiscovered === true) {
    storeItem('lowResiduePreviouslyDiscovered', lowResidueDiscovered);
  }
  if (getItem('lowResiduePreviouslyDiscovered') === true) {
    lowResidueDiscovered = getItem('lowResiduePreviouslyDiscovered');
  }
  if (averageResidueDiscovered === true) {
    storeItem('averageResiduePreviouslyDiscovered', averageResidueDiscovered);
  }
  if (getItem('averageResiduePreviouslyDiscovered') === true) {
    averageResidueDiscovered = getItem('averageResiduePreviouslyDiscovered');
  }
  if (highResidueDiscovered === true) {
    storeItem('highResiduePreviouslyDiscovered', highResidueDiscovered);
  }
  if (getItem('highResiduePreviouslyDiscovered') === true) {
    highResidueDiscovered = getItem('highResiduePreviouslyDiscovered');
  }
  
  //checks for new discoveries
  if (start === true){
    for (let i = 1; i <= enemyCount; i++) {
      if (!movementType1Discovered && followBeetle[i] === true && followTarget[i] === true){
        movementType1Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType2Discovered && followAnt[i] === true && followTarget[i] === true){
        movementType2Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType3Discovered && findLocation[i] === true && followTarget[i] === true){
        movementType3Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType4Discovered && standStill[i] === true && followTarget[i] === true){
        movementType4Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType5Discovered && followBeetle[i] === true && keepDistance[i] === true) {
        movementType5Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType6Discovered && followAnt[i] === true && keepDistance[i] === true) {
        movementType6Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType7Discovered && findLocation[i] === true && keepDistance[i] === true) {
        movementType7Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType8Discovered && standStill[i] === true && keepDistance[i] === true) {
        movementType8Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!maxSpeedDiscovered && antSpeed[i] === 3.5) {
        maxSpeedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!minSpeedDiscovered && antSpeed[i] === 0.9) {
        minSpeedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!heavyBulletsDiscovered && bulletSize[i] >= 1.5) {
        heavyBulletsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!landMineDiscovered && bulletSize[i] >= 2.5) {
        landMineDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!minBulletSpeedDiscovered && bulletSpeed[i] === 300) {
        minBulletSpeedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!midBulletSpeedDiscovered && bulletSpeed[i] === 180) {
        midBulletSpeedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!maxBulletSpeedDiscovered && bulletSpeed[i] === 60) {
        maxBulletSpeedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!basicBulletsDiscovered && bulletSize[i] === 1) {
        basicBulletsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!rapidFireDiscovered && bulletCooldown[i] === 80) {
        rapidFireDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!walkingAntsDiscovered && antSpeed[i] === 1.95) {
        walkingAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!averageFireRateAntsDiscovered && bulletCooldown[i] === 120) {
        averageFireRateAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!minimalFireRateAntsDiscovered && bulletCooldown[i] === 200) {
        minimalFireRateAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!straightShootingAntsDiscovered && shotOffsetX[i] === 0 && shotOffsetY[i] === 0) {
        straightShootingAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!wideShotAntsDiscovered && (shotOffsetX[i] > 100 || shotOffsetY[i] > 0)) {
        wideShotAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!wildShotAntsDiscovered && (shotOffsetX[i] > 350 || shotOffsetY[i] > 350)) {
        wildShotAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!mostOffTargetAntsDiscovered && (shotOffsetX[i] === 500 || shotOffsetY[i] === 500)) {
        mostOffTargetAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!middleStationedAntsDiscovered && findLocation[i] === true && followTarget[i] === true && (standingPointX[i] === getGameplayWidth() / 2 || standingPointY === getGameplayHeight() / 2)) {
        middleStationedAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!chaserAntsDiscovered && followBeetle[i] === true && keepDistance[i] === true && distanceFromAnchor[i] < 80) {
        chaserAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!midrangeAntsDiscovered && followBeetle[i] === true && keepDistance[i] === true && distanceFromAnchor[i] > 150) {
        midrangeAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!farRangeAntsDiscovered && followBeetle[i] === true && keepDistance[i] === true && distanceFromAnchor[i] > 500) {
        farRangeAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!playerBasedSnipersDiscovered && followBeetle[i] === true && keepDistance[i] === true && distanceFromAnchor[i] > 800) {
        playerBasedSnipersDiscovered = true;
        triggerDiscoveryPopup();
      }

      // Explosion type discoveries
      const expMode = Math.round(explosionBehavior[i]);
      if (!noExplosionDiscovered && expMode === 0) {
        noExplosionDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!timeExplosionDiscovered && expMode === 1) {
        timeExplosionDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!proximityExplosionDiscovered && expMode === 2) {
        proximityExplosionDiscovered = true;
        triggerDiscoveryPopup();
      }

      // Time fuse tiers (only when time-based explosion is active)
      if (expMode === 1) {
        const fuse = bulletExplodeAfter[i]; // 100..800 typical
        if (!quickFuseDiscovered && fuse <= 300) {
          quickFuseDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!averageFuseDiscovered && fuse > 300 && fuse <= 600) {
          averageFuseDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!longFuseDiscovered && fuse > 600) {
          longFuseDiscovered = true;
          triggerDiscoveryPopup();
        }
      }

      // Proximity tiers (only when proximity explosion is active)
      if (expMode === 2) {
        const prox = explosionProximity[i]; // ~0.1..1000 typical
        if (!closeProximityDiscovered && prox <= 150) {
          closeProximityDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!averageProximityDiscovered && prox > 150 && prox <= 400) {
          averageProximityDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!farProximityDiscovered && prox > 400) {
          farProximityDiscovered = true;
          triggerDiscoveryPopup();
        }
      }

      // Explosion size/residue tiers (apply only if explosions are enabled)
      if (expMode === 1 || expMode === 2) {
        const radiusMul = explosionRadiusMultiplier[i]; // 0.5..3
        if (!smallExplosionDiscovered && radiusMul <= 1.0) {
          smallExplosionDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!averageExplosionDiscovered && radiusMul > 1.0 && radiusMul <= 2.0) {
          averageExplosionDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!largeExplosionDiscovered && radiusMul > 2.0) {
          largeExplosionDiscovered = true;
          triggerDiscoveryPopup();
        }

        const residueMul = explosionResidueMultiplier[i]; // 0.5..3
        if (!lowResidueDiscovered && residueMul <= 1.0) {
          lowResidueDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!averageResidueDiscovered && residueMul > 1.0 && residueMul <= 2.0) {
          averageResidueDiscovered = true;
          triggerDiscoveryPopup();
        }
        if (!highResidueDiscovered && residueMul > 2.0) {
          highResidueDiscovered = true;
          triggerDiscoveryPopup();
        }
      }
    }
  }
  

  
  antDexEntries = [
    // Explosion behavior types
    {
      name: "Non-Exploding Ants",
      desc: "Bullets never explode. They persist until collision or leaving the arena.",
      stats: "Explosion: None",
      discovered: noExplosionDiscovered
    },
    {
      name: "Timed Explosion Ants",
      desc: "Bullets explode after a fuse duration unique to each ant.",
      stats: "Explosion: Time (Fuse)",
      discovered: timeExplosionDiscovered
    },
    {
      name: "Proximity Explosion Ants",
      desc: "Bullets explode when close enough to the beetle.",
      stats: "Explosion: Proximity",
      discovered: proximityExplosionDiscovered
    },

    // Timed fuse tiers
    {
      name: "Quick Fuse Ants",
      desc: "Short fuse timers. Bullets detonate quickly after being fired.",
      stats: "Fuse: Low (≤ 300 frames)",
      discovered: quickFuseDiscovered
    },
    {
      name: "Standard Fuse Ants",
      desc: "Moderate fuse timers typical of most ants.",
      stats: "Fuse: Average (301–600 frames)",
      discovered: averageFuseDiscovered
    },
    {
      name: "Long Fuse Ants",
      desc: "Extended fuse timers. Bullets linger before detonation.",
      stats: "Fuse: High (> 600 frames)",
      discovered: longFuseDiscovered
    },

    // Proximity radius tiers
    {
      name: "Close Proximity Ants",
      desc: "Explodes only very close to the beetle.",
      stats: "Proximity Radius: Low (≤ 150)",
      discovered: closeProximityDiscovered
    },
    {
      name: "Medium Proximity Ants",
      desc: "Explodes at a moderate distance from the beetle.",
      stats: "Proximity Radius: Average (151–400)",
      discovered: averageProximityDiscovered
    },
    {
      name: "Wide Proximity Ants",
      desc: "Explodes from far away. Harder to approach safely.",
      stats: "Proximity Radius: High (> 400)",
      discovered: farProximityDiscovered
    },

    // Explosion size tiers
    {
      name: "Small Blast Ants",
      desc: "Smaller explosion radius. Easier to dodge its area of effect.",
      stats: "Explosion Size: Low (≤ 1.0x)",
      discovered: smallExplosionDiscovered
    },
    {
      name: "Standard Blast Ants",
      desc: "Typical explosion radius.",
      stats: "Explosion Size: Average (1.0–2.0x)",
      discovered: averageExplosionDiscovered
    },
    {
      name: "Massive Blast Ants",
      desc: "Large explosion radius. A small bullet could have a big surprise.",
      stats: "Explosion Size: High (> 2.0x)",
      discovered: largeExplosionDiscovered
    },

    // Explosion residue tiers
    {
      name: "Clean Detonation Ants",
      desc: "Minimal residue left behind after explosions.",
      stats: "Residue: Low (≤ 1.0x)",
      discovered: lowResidueDiscovered
    },
    {
      name: "Lingering Detonation Ants",
      desc: "Typical residue that slightly clutters the arena.",
      stats: "Residue: Average (1.0–2.0x)",
      discovered: averageResidueDiscovered
    },
    {
      name: "Saturated Detonation Ants",
      desc: "Heavy residue. The explosions stay for a long time.",
      stats: "Residue: High (> 2.0x)",
      discovered: highResidueDiscovered
    },
    {
      name: "Follow Beetle Ants",
      desc: "Follows the movements and intentions of the player, easily influenced and trapped.",
      stats: "Follow Target: Beetle • Follow Style: Follow",
      discovered: movementType1Discovered
    },
    {
      name: "Follow Ants Ants",
      desc: "Follows the movements of other ants, adapting to the style that's working for its neighbors.",
      stats: "Follow Target: Ants • Follow Style: Follow",
      discovered: movementType2Discovered
    },
    {
      name: "Find Spot Ants",
      desc: "Constantly moving to a chosen spot on the screen. This spot stays the same the entire round.",
      stats: "Follow Target: Location • Follow Style: Follow",
      discovered: movementType3Discovered
    },
    {
      name: "Stand Still Ants",
      desc: "Never moves. Stay on the location of its spawn until killed. The lack of movement often grants better aim.",
      stats: "Follow Target: Spawn • Follow Style: Follow",
      discovered: movementType4Discovered
    },
    {
      name: "Keep Distance From Beetle Ants",
      desc: "Strives to maintain a certain distance from the player, retreating if they're too close and closing in if they're too far.",
      stats: "Follow Target: Beetle • Follow Style: Keep Distance",
      discovered: movementType5Discovered
    },
    {
      name: "Keep Distance From Ants Ants",
      desc: "Keeps a certain distance from other ants, allowing them to coordinate how they distribute themselves across the screen.",
      stats: "Follow Target: Ants • Follow Style: Keep Distance",
      discovered: movementType6Discovered
    },
    {
      name: "Keep Distance From Location Ants",
      desc: "Stays a certain distance away from a spot in all directions. This spot and distance does not change for the entire round.",
      stats: "Follow Target: Location • Follow Style: Keep Distance",
      discovered: movementType7Discovered
    },
    {
      name: "Keep Distance From Spawn Ants",
      desc: "Moves a certain distance away from where it spawned each time it respawns. This combines slightly chaotic movements with the accuracy of standing still.",
      stats: "Follow Target: Spawn • Follow Style: Keep Distance",
      discovered: movementType8Discovered
    },
    {
      name: "Sprinting Ants",
      desc: "The fastest ants possible, moving at 3/4 the speed of the player. this allows them to prolong close encounters but more easily influenced.",
      stats: "Ant Speed: 3",
      discovered: maxSpeedDiscovered
    },
    {
      name: "Crawling Ants",
      desc: "The slowest ants possible, moving at just barely a crawl. They can't be influenced much position wise but they often get more accurate shots.",
      stats: "Ant Speed: 0.9",
      discovered: minSpeedDiscovered
    },
    {
      name: "Heavy Bullets Ants",
      desc: "These ants have bigger bullets, dealing more damage but moving at a slower speed. If they hit shields for more damage than the shields can handle the shield will take longer to regenerate.",
      stats: "Bullet Size: > 1.5",
      discovered: heavyBulletsDiscovered
    },
    {
      name: "Land Mine Ants",
      desc: "These ants have humongous bullets dealing devastating damage, so big that they practically aren't even moving, creating traps. It is extremely rare for bullets to get this size.",
      stats: "Bullet Size: > 2.5",
      discovered: landMineDiscovered,
      category: 'exotic'
    },
    {
      name: "Basic Bullets Ants",
      desc: "Ants with normal sized bullets, each one doing basic damage. They often stay this way when the speed decrease of larger bullets is not worth the extra damage.",
      stats: "Bullet Size: 1",
      discovered: basicBulletsDiscovered
    },
    {
      name: "Slow Bullets Ants",
      desc: "The slowest a bullet can be. With a basic bullet it takes around 5 seconds for one to reach its target. This keeps the bullets on the screen for longer, providing more obstacles to avoid.",
      stats: "Bullet Speed: 300",
      discovered: minBulletSpeedDiscovered
    },
    {
      name: "Moderate Bullet Speed Ants",
      desc: "The most moderate bullet speed possible. With a basic bullet it takes around 3 seconds for one to reach its target. It’s not too fast or slow.",
      stats: "Bullet Speed: 180",
      discovered: midBulletSpeedDiscovered
    },
    {
      name: "Fast Bullets Ants",
      desc: "The fastest a bullet can be. With a basic bullet it takes around 1 seconds for one to reach its target. This gives the player less time to react but also less lingering obstacles",
      stats: "Bullet Speed: 60",
      discovered: maxBulletSpeedDiscovered
    },
    {
      name: "Rapid Fire Ants",
      desc: "Ants with shortest possible cooldown, shooting a bullet every 1.2 seconds. This is often peak difficulty.",
      stats: "Bullet Cooldown: 80",
      discovered: rapidFireDiscovered
    },
    {
      name: "Walking Ants",
      desc: "Ants with a moderate movement speed, enough to get around in a decent time but not speeding around, moving about half as fast as the player.",
      stats: "Ant Speed: 1.95",
      discovered: walkingAntsDiscovered
    },
    {
      name: "Average Fire Rate Ants",
      desc: "Fires bullets at a moderate rate. The ant will fire a bullet every 2 seconds.",
      stats: "Bullet Cooldown: 120",
      discovered: averageFireRateAntsDiscovered
    },
    {
      name: "Minimal Fire Rate Ants",
      desc: "What? How? Why? There’s no advantage to this, it starts the game at a faster fire rate already. Fires a bullet every 3.3 seconds.",
      stats: "Bullet Cooldown: 200",
      discovered: minimalFireRateAntsDiscovered,
      category: 'exotic'
    },
    {
      name: "Straight Shooting Ants",
      desc: "These ants shoot directly at the player, often not hitting a moving target. Good for players that sit still.",
      stats: "Shot Offset: 0",
      discovered: straightShootingAntsDiscovered
    },
    {
      name: "Wide Shot Ants",
      desc: "These ants shoot off target often in an attempt to lead the player. Sometimes this gets so precise you could swear the ants can predict the future.",
      stats: "Shot Offset: < 100",
      discovered: wideShotAntsDiscovered
    },
    {
      name: "Wild Shot Ants",
      desc: "These ants shoot way off target, maybe taking advantage of extra speed from shooting a far bullet or blocking off the player’s next part of the screen. There are many potential uses for this.",
      stats: "Shot Offset: < 350",
      discovered: wildShotAntsDiscovered
    },
    {
      name: "The Most Off Target Ants",
      desc: "Doesn’t shoot anywhere near the player. Who knows why.",
      stats: "Shot Offset: 500",
      discovered: mostOffTargetAntsDiscovered,
      category: 'exotic'
    },
    {
      name: "Middle Stationed Ants",
      desc: "These ants move towards spots in the middle of the screen, either because it's advantageous or nowhere else is.",
      stats: "Follow Target: Location • Follow Style: Follow • Standing Point: Middle",
      discovered: middleStationedAntsDiscovered
    },
    {
      name: "Chaser Ants",
      desc: "aka. Oh My God Those Ants Are Coming Right At Me Ants. These ants get close to the player to hit more of their shots, often seen as threatening because of their chosen proximity.",
      stats: "Follow Target: Beetle • Follow Style: Keep Distance • Distance From Target: < 80",
      discovered: chaserAntsDiscovered
    },
    {
      name: "Midrange Ants",
      desc: "These ants usually blend into a group, using bullets to keep the beetle at bay. They tend to skillfully dodge if the beetle gets too close.",
      stats: "Follow Target: Beetle • Follow Style: Keep Distance • Distance From Target: > 150",
      discovered: midrangeAntsDiscovered
    },
    {
      name: "Far Range Ants",
      desc: "These ants keep a distance from the player that is often inconvenient to close, usually resulting in them being overlooked and ignored in favor of easier prey.",
      stats: "Follow Target: Beetle • Follow Style: Keep Distance • Distance From Target: > 500",
      discovered: farRangeAntsDiscovered
    },
    {
      name: "Player Based Snipers",
      desc: "Stays very far away from the player, often ensuring a faster bullet.",
      stats: "Follow Target: Beetle • Follow Style: Keep Distance • Distance From Target: > 800",
      discovered: playerBasedSnipersDiscovered
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
  
  // Reset game state for next player's turn (same round)
  end = false;
  levelEnd = 0;
  score = 0;
  health = 10;
  
  // Reset player position and state
  playerX = width / 2;
  playerY = height / 2;
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
  playerX = width / 2;
  playerY = height / 2;
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
      text("Total: " + p.totalScore, getMenuWidth() * 0.3, y + 12);
      text("Round: " + p.roundScore, getMenuWidth() * 0.3, y + 30);
      
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
      menuNavigationCooldown = 20;
    }
  endMenuScaling();
}

// Draw Ants Tab in Developer Tools
function drawAntsTab(fadeAlpha) {
  // Define all ant genetic stats with their ranges
  let antStatDefinitions = [
    { name: 'Bullet Speed', key: 'bulletSpeed', min: 60, max: 300, step: 1 },
    { name: 'Bullet Cooldown', key: 'bulletCooldown', min: 79, max: 200, step: 1, integer: true },
    { name: 'Ant Speed', key: 'antSpeed', min: 0.9, max: 3.5, step: 0.01 },
    { name: 'Shot Offset X', key: 'shotOffsetX', min: -500, max: 500, step: 1 },
    { name: 'Shot Offset Y', key: 'shotOffsetY', min: -500, max: 500, step: 1 },
    { name: 'Standing Point X', key: 'standingPointX', min: 0, max: 1280, step: 1 },
    { name: 'Standing Point Y', key: 'standingPointY', min: 0, max: 652, step: 1 },
    { name: 'Follow Value', key: 'followValue', min: -0.5, max: 3.49, step: 0.01, 
      help: '0=Beetle, 1=Ant, 2=Location, 3=Still' },
    { name: 'Autonomy', key: 'autonomy', min: -0.5, max: 1.5, step: 0.01,
      help: '0=FollowTarget, 1=KeepDistance' },
    { name: 'Distance From Anchor', key: 'distanceFromAnchor', min: 0.1, max: 1000, step: 1 },
    { name: 'Explosion Behavior', key: 'explosionBehavior', min: -0.5, max: 2.5, step: 0.01,
      help: '0=None, 1=OnTerminate, 2=Proximity' },
    { name: 'Explosion Proximity', key: 'explosionProximity', min: 0.1, max: 1000, step: 1 },
    { name: 'Angle From Spawn', key: 'angleFromSpawn', min: 0, max: 6.28, step: 0.01,
      help: 'Radians (0-2π)' },
    { name: 'Bullet Size', key: 'bulletSize', min: 1, max: 3, step: 0.01 },
    { name: 'Explosion Radius Mult', key: 'explosionRadiusMultiplier', min: 0.5, max: 3, step: 0.01 },
    { name: 'Explosion Residue Mult', key: 'explosionResidueMultiplier', min: 0.5, max: 3, step: 0.01 },
    { name: 'Bullet Explode After', key: 'bulletExplodeAfter', min: 100, max: 800, step: 1 },
    { name: 'Ant Size', key: 'antSize', min: 0.3, max: 3, step: 0.01,
      help: 'Sprite & hitbox size (mutates from round 10+)' }
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
  
  // Draw stat sliders
  let startY = toggleY + 58;
  let sliderHeight = 22;
  let sliderSpacing = 24;
  let sliderWidth = getMenuWidth() * 0.7;
  let sliderX = (getMenuWidth() - sliderWidth) / 2;
  
  let currentAnt = customAntStats[devToolsAntTab];
  
  // Calculate visible range (show 10 stats at a time)
  let visibleStats = 10;
  let maxScroll = Math.max(0, antStatDefinitions.length - visibleStats);
  devToolsAntScrollOffset = constrain(devToolsAntScrollOffset, 0, maxScroll);
  
  for (let i = 0; i < visibleStats && (i + devToolsAntScrollOffset) < antStatDefinitions.length; i++) {
    let statIndex = i + devToolsAntScrollOffset;
    let stat = antStatDefinitions[statIndex];
    let value = currentAnt[stat.key];
    let y = startY + i * sliderSpacing;
    
    // Stat name
    textAlign(LEFT, CENTER);
    textSize(12);
    let isSelected = devToolsAntStatIndex === statIndex;
    fill(isSelected ? 255 : 200);
    text(stat.name + ':', sliderX, y);
    
    // Value display
    textAlign(RIGHT, CENTER);
    let displayValue = stat.integer ? Math.floor(value) : value.toFixed(2);
    text(displayValue, sliderX + sliderWidth, y);
    
    // Slider bar background
    let barX = sliderX + 200;
    let barWidth = sliderWidth - 280;
    let barHeight = 8;
    let barY = y - barHeight / 2;
    
    rectMode(CORNER);
    noStroke();
    fill(40);
    rect(barX, barY, barWidth, barHeight, 4);
    
    // Slider filled portion
    let fillRatio = (value - stat.min) / (stat.max - stat.min);
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
    
    // Help text for special stats
    if (stat.help && isSelected) {
      textAlign(CENTER, CENTER);
      textSize(10);
      fill(180);
      text(stat.help, getMenuWidth() / 2, y + 12);
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
      console.log("Custom ants enabled - applying to current ants immediately");
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
        // Auto-scroll if needed
        if (devToolsAntStatIndex < devToolsAntScrollOffset) {
          devToolsAntScrollOffset = devToolsAntStatIndex;
        }
      }
      changed = true;
    } else if (keyIsDown(83) || keyIsDown(40)) {  // S or Down - scroll/select down
      if (devToolsAntStatIndex < antStatDefinitions.length - 1) {
        devToolsAntStatIndex++;
        // Auto-scroll if needed
        if (devToolsAntStatIndex >= devToolsAntScrollOffset + visibleStats) {
          devToolsAntScrollOffset = devToolsAntStatIndex - visibleStats + 1;
        }
      }
      changed = true;
    } else if ((keyIsDown(65) || keyIsDown(37)) && devToolsUseCustomAnts) {  // A or Left - decrease value (only if custom mode enabled)
      let stat = antStatDefinitions[devToolsAntStatIndex];
      currentAnt[stat.key] = constrain(currentAnt[stat.key] - stat.step * 5, stat.min, stat.max);
      if (stat.integer) currentAnt[stat.key] = Math.floor(currentAnt[stat.key]);
      changed = true;
    } else if ((keyIsDown(68) || keyIsDown(39)) && devToolsUseCustomAnts) {  // D or Right - increase value (only if custom mode enabled)
      let stat = antStatDefinitions[devToolsAntStatIndex];
      currentAnt[stat.key] = constrain(currentAnt[stat.key] + stat.step * 5, stat.min, stat.max);
      if (stat.integer) currentAnt[stat.key] = Math.floor(currentAnt[stat.key]);
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
        upgrade20: upgrade20Level
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
          upgrade20: players[devToolsPlayerTab].upgrade20 || 0
        };
      } else {
        // Player doesn't exist, show zeros
        currentUpgrades = {
          upgrade1: 0, upgrade2: 0, upgrade3: 0, upgrade4: 0, upgrade5: 0,
          upgrade6: 0, upgrade7: 0, upgrade8: 0, upgrade9: 0, upgrade10: 0,
          upgrade11: 0, upgrade12: 0, upgrade13: 0, upgrade14: 0, upgrade15: 0,
          upgrade16: 0, upgrade17: 0, upgrade18: 0, upgrade19: 0, upgrade20: 0
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
        { name: 'Health Regeneration', level: currentUpgrades.upgrade20, maxLevel: 5, id: 19 }
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
        if (devToolsSelectedUpgrade < 0) devToolsSelectedUpgrade += 20;
        if (devToolsSelectedUpgrade > 19) devToolsSelectedUpgrade = 19;
        devToolsNavigationCooldown = 10;
      } else if (keyIsDown(83) || keyIsDown(40)) {  // S or Down
        devToolsSelectedUpgrade += 2;
        if (devToolsSelectedUpgrade > 19) devToolsSelectedUpgrade -= 20;
        if (devToolsSelectedUpgrade < 0) devToolsSelectedUpgrade = 0;
        devToolsNavigationCooldown = 10;
      } else if (keyIsDown(65) || keyIsDown(37)) {  // A or Left
        devToolsSelectedUpgrade--;
        if (devToolsSelectedUpgrade < 0) devToolsSelectedUpgrade = 19;
        devToolsNavigationCooldown = 10;
      } else if (keyIsDown(68) || keyIsDown(39)) {  // D or Right
        devToolsSelectedUpgrade++;
        if (devToolsSelectedUpgrade > 19) devToolsSelectedUpgrade = 0;
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
    
    for (let i = 0; i < 20; i++) {
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
        text('Q/E/R Tabs  |  1-3 Ant Rank  |  W/S Select  |  A/D Adjust  |  T Toggle  |  Shift+/+\\\\ Exit', getMenuWidth() / 2, getMenuHeight() - 25);
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
  let maxLevels = [4, 5, 5, 9, 8, 5, 5, 5, 1, 1, 1, 4, 4, 1, 5, 5, 5, 3, 4, 5];
  
  if (devToolsTab === 'single') {
    let upgradeLevels = [upgrade1Level, upgrade2Level, upgrade3Level, upgrade4Level, upgrade5Level, 
                         upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level];
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
        players[devToolsPlayerTab].upgrade20 || 0
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
                    upgrade6Level, upgrade7Level, upgrade8Level, upgrade9Level, upgrade10Level, upgrade11Level, upgrade12Level, upgrade13Level, upgrade14Level, upgrade15Level, upgrade16Level, upgrade17Level, upgrade18Level, upgrade19Level, upgrade20Level];
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
        players[devToolsPlayerTab].upgrade20 || 0
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


