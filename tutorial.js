// ========== TUTORIAL ==========
// Starts the first time the player picks Single Player, and can be skipped or replayed from the main menu.
// The game pauses on cards to explain things, then the player tries each thing with the ants holding fire. Rounds
// start easy and then suddenly get very hard, so each lesson has to be learned to get through it:
//   1. Movement, eating and dashing; fight the round 1 ant until leveling up, and take Add Bullets
//   2. Shooting; rerolling upgrades, and take Shockwave
//   3. The shockwave; take Spray Acid and Mound Ring
//   4. Switching shot types and shockwave types
//   5. The first queen
//   6. The ants suddenly evolve way past the beetle and kill it
//   7. The Queen Upgrades store, where defeated queens buy permanent upgrades
//   8. The Antdex, the log of every kind of ant the player has run into
//   9. The map, gene tokens and evolution; then the player is on their own
// Progress is saved at the start of each step, so leaving in the middle picks back up there.

const TUTORIAL_KEY = 'tutorialProgress';
const TUTORIAL_LAST_ROUND = 5;    // Stages 0-5 are played rounds; then the store, the Antdex and the map
const TUTORIAL_STAGE_SHOP = 6;
const TUTORIAL_STAGE_DEX = 7;
const TUTORIAL_STAGE_MAP = 8;
const TUTORIAL_CARD_GRACE = 18;   // Frames before a card can be dismissed

let tutorial = null;              // The tutorial run being played (null when not in one)
let tutorialMenuPhase = null;     // 'shop', 'dex' or 'map' once the tutorial moves on to the menus
let tutorialMenuCard = null;      // A card shown over a menu
let tutorialMenuOpen = false;     // The Start / Skip / Replay choice over the main menu
let tutorialMenuSelection = 0;

function getTutorialProgress() {
  const saved = getItem(TUTORIAL_KEY);
  return saved && typeof saved === 'object' ? saved : { stage: 0, done: false, skipped: false, started: false };
}

function saveTutorialProgress(changes) {
  storeItem(TUTORIAL_KEY, Object.assign(getTutorialProgress(), changes));
}

// Never touched the tutorial at all: Enter on the title screen goes straight into it
function isFirstTutorialLaunch() {
  const p = getTutorialProgress();
  return !p.started && !p.done && !p.skipped;
}

function shouldAutoStartTutorial() {
  const p = getTutorialProgress();
  return !p.done && !p.skipped;
}

function isTutorialRun() {
  return !!tutorial;
}

function tutorialBlocksScenes() {
  return !!tutorial;
}

function getTutorialRoundTitle() {
  if (!tutorial) return null;
  return `TUTORIAL ${tutorial.stage + 1}`;
}

function leaveTutorialRun() {
  tutorial = null;
}

// ---------- Starting ----------

function startTutorial(fromStart) {
  const p = getTutorialProgress();
  let stage = fromStart ? 0 : (p.done || p.skipped ? 0 : p.stage || 0);
  saveTutorialProgress({ started: true, done: false, skipped: false, stage: stage });
  tutorialMenuOpen = false;
  if (stage >= TUTORIAL_STAGE_SHOP) {
    startTutorialMenus(stage);
    return;
  }
  startTutorialRun(stage);
}

function restartTutorialRun() {
  startTutorialRun(tutorial ? tutorial.stage : getTutorialProgress().stage || 0);
}

function startTutorialRun(stage) {
  resetRunState();
  difficulty = 1;
  multiplayerMode = false;
  numPlayers = 1;
  pendingGameMode = null;
  applyDifficultyToInitialPopulation();
  tutorial = {
    stage: stage,
    baseStats: snapshotAntStats(1),
    steps: [],
    step: -1,
    card: null,
    cardPending: null,
    cardAge: 0,
    snapshot: null,
    counters: {},
    lastX: playerX,
    lastY: playerY,
    wasShockwaveReady: true,
    forced: [],
    awaitingReroll: false,
    upgradeHint: null,
    queenStarted: false,
    finished: false
  };
  // Starting partway through: the upgrades the earlier steps hand out
  if (stage >= 1) upgrade5Level = Math.max(upgrade5Level, 1);
  if (stage >= 2) upgrade14Level = Math.max(upgrade14Level, 1);
  if (stage >= 3) {
    upgrade28Level = Math.max(upgrade28Level, 1);
    upgrade45Level = Math.max(upgrade45Level, 1);
  }
  updateUpgradeBooleans();
  shield = shieldQuantity > 0 ? shieldQuantity : 0;
  shot = bulletQuantity > 0 ? bulletQuantity : 0;
  level = stage + 1;
  centerPlayer();
  setupTutorialStage();

  start = true;
  startMenu = false;
  difficultyMenu = false;
  queenShopMenu = false;
  tutorialMenuOpen = false;
  titlemusic.stop();
  endmusic.stop();
  if (!gamemusic.isPlaying()) gamemusic.play();
  startRoundIntro();
}

// nextRound() during the tutorial: on to the next step. Returns true if it set the round up.
function tutorialNextRound() {
  if (!tutorial) return false;
  const next = tutorial.stage + 1;
  if (next > TUTORIAL_LAST_ROUND) {
    leaveTutorialToMenus(TUTORIAL_STAGE_SHOP);
    return true;
  }
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
  centerPlayer();
  shield = shieldQuantity > 0 ? shieldQuantity : 0;
  shot = bulletQuantity > 0 ? bulletQuantity : 0;
  dashCoolDown = 0;
  endmusic.stop();
  if (!gamemusic.isPlaying()) gamemusic.play();
  tutorial.stage = next;
  setupTutorialStage();
  startRoundIntro();
  return true;
}

function spawnTutorialAnts(stats, count) {
  spawnFinalGroup(stats, count);
}

// The suddenly-very-hard ants: many of them, small, quick, firing fast bullets often from a distance
function getTutorialHardStats() {
  const s = JSON.parse(JSON.stringify(tutorial.baseStats));
  s.antSize = 0.6;
  s.bulletSize = 1.3;
  s.bulletSpeed = 45;
  s.bulletCooldown = 42;
  s.antSpeed = 2.8;
  s.autonomy = 1;
  s.followValue = 0;
  s.distanceFromAnchor = 170;
  return s;
}

function setupTutorialStage() {
  const T = tutorial;
  T.step = -1;
  T.counters = {};
  T.finished = false;
  T.queenStarted = false;
  T.forced = [];
  T.awaitingReroll = false;
  T.upgradeHint = null;
  timeCount = 99;
  saveTutorialProgress({ stage: T.stage });
  const base = T.baseStats;
  switch (T.stage) {
    case 0:
      spawnTutorialAnts(base, 1);
      T.steps = [
        { card: ['The Hunt Begins', [
          'Invasive ants have overrun the forest, and you are the only one who can push them back.',
          'This tutorial pauses to walk you through how everything works. The real thing gets brutal, so take your time here.']] },
        { prompt: 'Move with WASD, the arrow keys, or the left stick', passive: true, done: c => (c.moved || 0) >= 220, progress: c => `${Math.min(220, Math.round(c.moved || 0))}/220` },
        { card: ['Eat Them', [
          'Run straight into an ant to eat it.',
          'Eating ants scores points, heals you a little, and fills your EXP bar (under your health).']],
          prompt: 'Run into the ant to eat it', passive: true, done: c => (c.kills || 0) >= 1 },
        { card: ['Dash', [
          'Press SHIFT (or click the left stick) to dash: a burst of speed that eats anything in your way.',
          'It has a cooldown, so pick your moment.']],
          prompt: 'Dash into an ant (SHIFT)', passive: true, done: c => (c.dashKills || 0) >= 1 },
        { card: ['They Shoot Back', [
          'Ants spit acid at you. Keep moving and dodge it.',
          'Rounds normally end on a timer. This one keeps going until you level up.']],
          prompt: 'Keep eating ants until you level up', done: () => upgradeAvailable,
          then: () => {
            grantTutorialLevels(1);
            T.forced = [{ options: [4], hint: 'Level up! Every level you pick one upgrade. Take Add Bullets: you can spit acid now.' }];
          } }
      ];
      break;
    case 1:
      spawnTutorialAnts(base, 4);
      T.steps = [
        { card: ['Acid', [
          'Press SPACE, left-click, or the right trigger to spit acid the way you are facing.',
          'Each shot uses up one of the acid drops beside you, and they refill over time.']],
          prompt: 'Shoot 3 ants with acid (SPACE or left-click)', passive: true, done: c => (c.bulletKills || 0) >= 3, progress: c => `${c.bulletKills || 0}/3` },
        { prompt: 'Clear the round: take out 4 more ants', done: c => (c.kills || 0) >= 7, progress: c => `${Math.max(0, (c.kills || 0) - 3)}/4`,
          then: () => {
            grantTutorialLevels(1);
            T.forced = [{ options: [0, 1, 2], reroll: [13],
              hint: 'Not what you need? Press R (or Y / Triangle) to reroll the choices. You get 3 rerolls a run, so try one now.',
              rerollHint: 'Rerolled! Take Shockwave.' }];
          } }
      ];
      break;
    case 2:
      spawnTutorialAnts(base, 6);
      T.steps = [
        { card: ['Shockwave', [
          'Press E (or the right bumper) to blast everything around you.',
          'It knocks ants back, hurts them, and can knock their acid right out of the air. It has its own cooldown.']],
          prompt: 'Use your shockwave 3 times (E)', passive: true, done: c => (c.shockwaves || 0) >= 3, progress: c => `${c.shockwaves || 0}/3` },
        { prompt: 'Clear the round: take out 5 ants', done: c => (c.kills || 0) >= 5, progress: c => `${c.kills || 0}/5`,
          then: () => {
            grantTutorialLevels(2);
            T.forced = [
              { options: [27], hint: 'Two level ups this time. Spray Acid is a new kind of shot.' },
              { options: [44], hint: 'Mound Ring is a new kind of shockwave.' }
            ];
          } }
      ];
      break;
    case 3:
      spawnTutorialAnts(base, 6);
      T.steps = [
        { card: ['Switching Shots', [
          'You have two kinds of acid now. Press Q, right-click, or the left trigger to switch between them.',
          'Spray Acid hits everything in a short cone in front of you, but each spray uses 2 acid drops instead of 1.']],
          prompt: 'Switch to Spray Acid (Q or right-click)', passive: true, done: () => shotMode !== SHOT_MODE_DEFAULT },
        { prompt: 'Spray 2 ants', passive: true, done: c => (c.sprayKills || 0) >= 2, progress: c => `${c.sprayKills || 0}/2` },
        { card: ['Switching Shockwaves', [
          'Shockwaves come in different kinds too. Press R or the left bumper to switch between them.',
          'Mound Ring raises a ring of mounds around you that blocks acid and traps ants.']],
          prompt: 'Switch to Mound Ring (R) and use it (E)', passive: true, done: c => (c.variantShockwaves || 0) >= 1 },
        { prompt: 'Clear the round: take out 4 more ants', done: c => (c.kills || 0) >= 6, progress: c => `${Math.max(0, (c.kills || 0) - 2)}/4`,
          then: () => grantTutorialLevels(1) }
      ];
      break;
    case 4:
      spawnTutorialAnts(base, 3);
      T.steps = [
        { card: ['A Queen', [
          'Get hit enough in a round and a queen shows up. She spawns ants, orders them around, and uses their abilities against you.',
          'While she is out, the round only ends when she dies. Hit her with acid, dashes and shockwaves.']],
          start: () => startTutorialQueen(),
          prompt: 'Defeat the queen', done: () => !queen && T.queenStarted }
      ];
      break;
    case 5:
      spawnTutorialAnts(getTutorialHardStats(), 14);
      timeCount = 30;
      T.steps = [
        { card: ['Evolution', [
          'After every round, the ants that hurt you most breed the next round\'s ants. They keep getting stronger.',
          'Let\'s skip ahead a few dozen rounds and see where that goes...']],
          prompt: 'Survive!', done: () => false }
      ];
      break;
  }
}

// A weak queen, right away
function startTutorialQueen() {
  if (queen) return;
  startQueenFight();
  queen.maxHealth = 3;
  queen.health = 3;
  // Gentler than a real queen: 1 ant every 2 seconds instead of 2
  queen.antsPerSpawn = 1;
  queen.spawnCharges = 1;
  tutorial.queenStarted = true;
}

// The round end has exactly `n` upgrades waiting
function grantTutorialLevels(n) {
  let needed = 0;
  let req = expRequired;
  let lvl = expLevel;
  for (let k = 0; k < n; k++) {
    needed += Math.round(req * (1 - 0.1 * upgrade22Level));
    lvl++;
    req += 500 * Math.ceil(lvl / 5);
  }
  expProgress = needed;
  upgradeAvailable = true;
}

// ---------- Per frame (gameplay) ----------

// Called every gameplay frame from draw(), inside gameplay scaling
function updateTutorial() {
  const T = tutorial;
  if (!T || end || roundIntroTimer > 0) return;
  const c = T.counters;

  // Track what the player did
  const moved = dist(playerX, playerY, T.lastX, T.lastY);
  if (moved < 40) c.moved = (c.moved || 0) + moved;
  T.lastX = playerX;
  T.lastY = playerY;
  if (T.wasShockwaveReady && !windAttackReady) {
    c.shockwaves = (c.shockwaves || 0) + 1;
    if (shockwaveVariant !== SHOCKWAVE_ORIGINAL) c.variantShockwaves = (c.variantShockwaves || 0) + 1;
  }
  T.wasShockwaveReady = windAttackReady;

  // Before the very hard round the beetle can't die
  if (T.stage < TUTORIAL_LAST_ROUND && health < 3) health = 3;

  if (T.step === -1) advanceTutorialStep();
  const step = T.steps[T.step];
  if (!step) return;

  if (step.passive) {
    // Holding fire while the player tries something new
    for (let i = 1; i <= enemyCount; i++) {
      antLastShotFrame[i] = frameCount;
      antRapidFireActive[i] = false;
    }
  }
  if (!T.finished && T.stage !== 5) timeCount = 99;

  // A step that's only a card moves on as soon as the card is closed
  if (!T.card && !T.cardPending && (!step.done || step.done(c))) {
    if (step.then) step.then();
    advanceTutorialStep();
  }
}

function advanceTutorialStep() {
  const T = tutorial;
  T.step++;
  const step = T.steps[T.step];
  if (!step) {
    // Last thing done: the round ends
    T.finished = true;
    if (T.stage !== 4) timeCount = -1;
    return;
  }
  if (step.card) openTutorialCard(step.card[0], step.card[1], step.start || null);
  else if (step.start) step.start();
}

function openTutorialCard(title, lines, onClose = null) {
  tutorial.cardPending = { title: title, lines: lines, onClose: onClose };
}

// Kills, from addKillScore (source: 'dash', 'shockwave', 'bullet' or null)
function onTutorialKill(source) {
  if (!tutorial) return;
  const c = tutorial.counters;
  c.kills = (c.kills || 0) + 1;
  if (source === 'dash' || dash) c.dashKills = (c.dashKills || 0) + 1;
  if (source === 'bullet') {
    c.bulletKills = (c.bulletKills || 0) + 1;
    if (shotMode !== SHOT_MODE_DEFAULT) c.sprayKills = (c.sprayKills || 0) + 1;
  }
}

// The very hard round kills the beetle; that's the lesson. Returns true if the tutorial took care of the death.
function tutorialHandlesDeath() {
  const T = tutorial;
  if (!T) return false;
  if (T.stage < TUTORIAL_LAST_ROUND) {
    health = 3;
    return true;
  }
  if (!T.deathShown) {
    T.deathShown = true;
    end = true;
    for (let i = 1; i <= enemyCount; i++) enemyBullets[i] = [];
    openTutorialCard('Outmatched', [
      'Every run ends like this sooner or later. The ants never stop evolving.',
      'But what you win along the way stays with you. Let\'s spend it.'], () => leaveTutorialToMenus(TUTORIAL_STAGE_SHOP));
  }
  return true;
}

// Upgrades the tutorial hands out. exclude is non-empty for a reroll.
function getTutorialForcedUpgrades(exclude) {
  const T = tutorial;
  if (!T) return null;
  if (exclude && exclude.length > 0) {
    if (!T.awaitingReroll || !T.current) return null;
    T.awaitingReroll = false;
    T.upgradeHint = T.current.rerollHint;
    return T.current.reroll.slice();
  }
  const next = T.forced.shift();
  if (!next) {
    T.current = null;
    T.upgradeHint = null;
    return null;
  }
  T.current = next;
  T.upgradeHint = next.hint;
  T.awaitingReroll = !!next.reroll;
  return next.options.slice();
}

// Rerolling only works in the tutorial during its reroll lesson
function tutorialAllowsReroll() {
  return !!tutorial && tutorial.awaitingReroll;
}

// The reroll lesson holds off picking until a reroll
function tutorialAllowsUpgradePick() {
  return !tutorial || !tutorial.awaitingReroll;
}

// ---------- Cards and prompts ----------

function isTutorialPaused() {
  return !!(tutorial && tutorial.card);
}

// Drawn at the very end of a gameplay frame: freeze it under a card that just opened, or show the prompt
function drawTutorialOverlay() {
  const T = tutorial;
  if (!T) return;
  if (T.cardPending) {
    T.snapshot = get();
    T.card = T.cardPending;
    T.cardPending = null;
    T.cardAge = 0;
    return;
  }
  if (upgradeMenuActive && T.upgradeHint) {
    drawTutorialBanner(T.upgradeHint, windowHeight - 70, [120, 200, 255]);
    return;
  }
  if (end || roundIntroTimer > 0) return;
  const step = T.steps[T.step];
  if (step && step.prompt) {
    const extra = step.progress ? `   ${step.progress(T.counters)}` : '';
    drawTutorialBanner('▶ ' + step.prompt + extra, 54, [255, 230, 120]);
  }
}

function drawTutorialBanner(message, y, color) {
  push();
  textSize(Math.min(24, windowWidth * 0.022));
  textAlign(CENTER, CENTER);
  const w = textWidth(message) + 48;
  rectMode(CENTER);
  noStroke();
  fill(0, 0, 0, 170);
  rect(windowWidth / 2, y, w, 44, 12);
  fill(color[0], color[1], color[2]);
  text(message, windowWidth / 2, y);
  pop();
}

// The game, frozen under a card
function drawTutorialPausedFrame() {
  const T = tutorial;
  if (T.snapshot) image(T.snapshot, 0, 0, windowWidth, windowHeight);
  push();
  noStroke();
  fill(0, 0, 0, 140);
  rect(0, 0, windowWidth, windowHeight);
  pop();
  T.cardAge++;
  drawTutorialCard(T.card, T.cardAge);
  if (T.cardAge < TUTORIAL_CARD_GRACE) return;
  if (isBackPressed()) {
    // Leave; this step picks back up next time
    tutorial = null;
    returnToMainMenu();
    menuNavigationCooldown = 20;
    return;
  }
  if (isConfirmPressed() || mouseIsPressed) {
    const card = T.card;
    T.card = null;
    T.snapshot = null;
    menuNavigationCooldown = 15;
    upgradeKeyDebounce = 15;
    if (card.onClose) card.onClose();
  }
}

// A card in the middle of the screen (window space)
function drawTutorialCard(card, age, footer) {
  const s = Math.min(windowWidth / 1280, windowHeight / 652);
  const w = 720 * s;
  const pad = 28 * s;
  const popIn = age < 8 ? map(age, 0, 8, 0.9, 1) : 1;
  push();
  translate(windowWidth / 2, windowHeight / 2);
  scale(popIn);
  textSize(19 * s);
  let bodyH = 0;
  for (const line of card.lines) bodyH += Math.ceil(textWidth(line) / (w - pad * 2)) * 26 * s + 10 * s;
  const h = 70 * s + bodyH + 60 * s;
  rectMode(CENTER);
  fill(22, 26, 30, 240);
  stroke(255, 230, 120);
  strokeWeight(2.5);
  rect(0, 0, w, h, 14 * s);
  noStroke();
  textAlign(LEFT, TOP);
  fill(255, 230, 120);
  textSize(30 * s);
  textStyle(BOLD);
  text(card.title, -w / 2 + pad, -h / 2 + pad * 0.8);
  textStyle(NORMAL);
  fill(230);
  textSize(19 * s);
  textLeading(26 * s);
  let y = -h / 2 + pad * 0.8 + 50 * s;
  for (const line of card.lines) {
    rectMode(CORNER);
    text(line, -w / 2 + pad, y, w - pad * 2);
    y += Math.ceil(textWidth(line) / (w - pad * 2)) * 26 * s + 10 * s;
  }
  textAlign(CENTER, BOTTOM);
  textSize(15 * s);
  fill(170, 170, 170, age >= TUTORIAL_CARD_GRACE ? 255 : 90);
  text(footer || 'Enter / A / Click: continue     Esc: leave the tutorial (it picks back up here)', 0, h / 2 - pad * 0.6);
  pop();
}

// ---------- After the rounds: the store and the map ----------

function leaveTutorialToMenus(stage) {
  tutorial = null;
  returnToMainMenu();
  startTutorialMenus(stage);
}

function startTutorialMenus(stage) {
  saveTutorialProgress({ stage: stage });
  tutorialMenuOpen = false;
  if (stage === TUTORIAL_STAGE_SHOP) {
    tutorialMenuPhase = 'shop';
    openQueenShop();
    tutorialMenuCard = { title: 'Queen Upgrades', lines: [
      'Every queen you defeat is yours to spend here, on permanent upgrades that every single player run starts with.',
      `You have ${getQueensAvailable()} queen${getQueensAvailable() === 1 ? '' : 's'} to spend. Buy something if you like, then press Esc to move on.`] };
  } else if (stage === TUTORIAL_STAGE_DEX) {
    tutorialMenuPhase = 'dex';
    antdex = true;
    antdexReturnState = 'menu';
    antdexOpenCooldown = 20;
    startMenu = false;
    tutorialMenuCard = { title: 'The Antdex', lines: [
      "No one actually knows everything that's out there. I'd be impressed if you see them all.",
      'Keep a log of the ones you see: the Antdex fills in every kind of ant you run into, from their stats and abilities to the strange combinations they evolve. New ones pop up as you find them.',
      'Look around, then press Esc to move on.'] };
  } else {
    tutorialMenuPhase = 'map';
    pendingGameMode = 'single';
    startMenu = false;
    openDifficultyMenu();
    difficultySelection = 1;
    tutorialMenuCard = { title: 'Into Ant Territory', lines: [
      'This map is where runs start. Each stop is a difficulty, deeper and deeper into ant territory.',
      'Gene tokens: ants start with tokens and earn more every 5 rounds (more the deeper you go). They spend them to raise their stats and unlock abilities: new ways to fire, bullet paths, special bullets and death effects.',
      'Evolution: after each round, the 3 ants with the best score (damage to you for each life they lost) breed the next round, with small mutations. Learn what they do, and change it up.',
      'Defeat queens on a stop to unlock the next one. You\'re on your own now. Good luck.'] };
  }
  tutorialMenuCard.age = 0;
}

// Menu frames: read input for a card before the menus underneath can. Returns true while a card is up.
function updateTutorialMenus() {
  if (tutorialMenuPhase === 'shop' && !tutorialMenuCard && !queenShopMenu) {
    // Left the store: on to the Antdex
    startTutorialMenus(TUTORIAL_STAGE_DEX);
  } else if (tutorialMenuPhase === 'dex' && !tutorialMenuCard && !antdex) {
    // Left the Antdex: on to the map
    startTutorialMenus(TUTORIAL_STAGE_MAP);
  }
  if (!tutorialMenuCard) return false;
  const card = tutorialMenuCard;
  card.age++;
  // In the Antdex, Esc would close it too, so only Enter or a click closes the card there
  const back = tutorialMenuPhase !== 'dex' && isBackPressed();
  if (card.age >= TUTORIAL_CARD_GRACE && (isConfirmPressed() || back || mouseIsPressed)) {
    tutorialMenuCard = null;
    menuNavigationCooldown = 20;
    if (tutorialMenuPhase === 'map') {
      tutorialMenuPhase = null;
      saveTutorialProgress({ done: true, stage: 0 });
    }
  }
  return true;
}

function drawTutorialMenuCard() {
  if (!tutorialMenuCard) return;
  push();
  noStroke();
  fill(0, 0, 0, 120);
  rect(0, 0, windowWidth, windowHeight);
  pop();
  drawTutorialCard(tutorialMenuCard, tutorialMenuCard.age, 'Enter / A / Click: continue');
}

// ---------- The main menu's Tutorial entry ----------

function getTutorialMenuNote() {
  const p = getTutorialProgress();
  if (p.done) return 'Completed: replay any time';
  if (p.skipped) return 'Skipped';
  if (p.started) return 'In progress: pick up where you left off';
  return 'New here? Start with this';
}

function getTutorialMenuChoices() {
  const p = getTutorialProgress();
  if (p.done || p.skipped) return [['Replay Tutorial', () => startTutorial(true)], ['Back', null]];
  if (p.started) {
    return [['Resume Tutorial', () => startTutorial(false)], ['Restart Tutorial', () => startTutorial(true)],
      ['Skip Tutorial', () => saveTutorialProgress({ skipped: true })], ['Back', null]];
  }
  return [['Start Tutorial', () => startTutorial(true)], ['Skip Tutorial', () => saveTutorialProgress({ skipped: true })], ['Back', null]];
}

function openTutorialMenu() {
  tutorialMenuOpen = true;
  tutorialMenuSelection = 0;
  menuNavigationCooldown = 20;
}

// Drawn inside the main menu's menu scaling, over the main menu
function drawTutorialMenu() {
  const choices = getTutorialMenuChoices();
  const w = getMenuWidth();
  const h = getMenuHeight();
  tutorialMenuSelection = constrain(tutorialMenuSelection, 0, choices.length - 1);
  push();
  noStroke();
  fill(0, 0, 0, 180);
  rect(0, 0, w, h);
  rectMode(CENTER);
  fill(30, 34, 40);
  stroke(120, 200, 255);
  strokeWeight(2);
  const panelH = 110 + choices.length * 66;
  rect(w / 2, h / 2, 420, panelH, 14);
  noStroke();
  textAlign(CENTER, CENTER);
  fill(120, 200, 255);
  textSize(30);
  text('Tutorial', w / 2, h / 2 - panelH / 2 + 40);
  const rowY = k => h / 2 - panelH / 2 + 100 + k * 66;
  choices.forEach(([label], k) => {
    const sel = k === tutorialMenuSelection;
    fill(sel ? 255 : 55);
    stroke(sel ? color(120, 200, 255) : color(100));
    strokeWeight(sel ? 3 : 2);
    rect(w / 2, rowY(k), 320, 52, 10);
    noStroke();
    fill(sel ? 10 : 240);
    textSize(24);
    text(label, w / 2, rowY(k));
  });
  pop();

  if (menuNavigationCooldown > 0) return;
  if (isUpPressed()) {
    tutorialMenuSelection = (tutorialMenuSelection - 1 + choices.length) % choices.length;
    menuNavigationCooldown = 10;
  } else if (isDownPressed()) {
    tutorialMenuSelection = (tutorialMenuSelection + 1) % choices.length;
    menuNavigationCooldown = 10;
  }
  let pick = -1;
  if (isConfirmPressed()) pick = tutorialMenuSelection;
  if (mouseIsPressed) {
    choices.forEach((_, k) => {
      if (abs(getMenuMouseX() - w / 2) < 160 && abs(getMenuMouseY() - rowY(k)) < 26) pick = k;
    });
  }
  if (isBackPressed()) pick = choices.length - 1;
  if (pick === -1) return;
  menuNavigationCooldown = 20;
  tutorialMenuOpen = false;
  const action = choices[pick][1];
  if (action) action();
}
