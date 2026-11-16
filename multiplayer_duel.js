// ========== MULTIPLAYER: QUEEN TOURNAMENT FIGHTS ==========
// A tournament fight runs on the real game: the real queens (with their brains, abilities, royal guards and
// ant spawning) and real ants made from each player's design, all in a normal arena, with no beetle in it.
//
// The game's code is all aimed at one beetle (playerX / playerY, health). So each frame runs in passes, one for each
// queen with her ants. In a queen's pass, "the beetle" is the nearest enemy queen: everything she and her ants do
// that would hurt the beetle hurts that queen, and her bumps, grabs and knockback push her. Everyone else is hidden
// as dormant for that pass, so it doesn't move or fire twice. In a three-way fight, each ant aims at whichever enemy
// queen is closest to it (its own pass), and the queen goes after the one closest to her. Damage is added up over the
// whole frame and dealt at the end, so two queens can kill each other on the same frame (a draw). Ant bullets also
// hit enemy ants and royal guards, which doesn't happen in a normal game.

const MP_DUEL_SLOTS = 8;              // Ant slots for each queen's design (a big ant takes more than one)
const MP_DUEL_HEALTH_SCALE = 2;       // Her health in a fight, times her usual health
const MP_DUEL_MAX_ALIVE = 10;         // Her living ants at once (a normal queen goes up to 50, against one beetle)
const MP_DUEL_MAX_FRAMES = 60 * 150;  // After this long, the healthiest queen takes it
const MP_DUEL_SENTINEL_HEALTH = 1000; // The stand-in beetle's health during a pass (what it loses is the damage)

function mpInDuel() {
  return mp !== null && mp.phase === 'showdown' && mp.showdown && mp.showdown.step === 'duel' && !!mp.showdown.duel;
}

// The lists of things her ants (and she) leave behind that hurt the beetle. Each item is tagged with its side, and only
// updated in that side's queen pass.
const MP_DUEL_LISTS = [
  [() => enemyExplosions, v => { enemyExplosions = v; }],
  [() => enemyArcExplosionLinks, v => { enemyArcExplosionLinks = v; }],
  [() => enemyGroundImpacts, v => { enemyGroundImpacts = v; }],
  [() => enemySmears, v => { enemySmears = v; }],
  [() => deathRefires, v => { deathRefires = v; }],
  [() => enemyBeams, v => { enemyBeams = v; }],
  [() => enemyStreams, v => { enemyStreams = v; }],
  [() => landMines, v => { landMines = v; }]
];

function mpStartDuel(players) {
  const sd = mp.showdown;
  // A fresh arena with a blank beetle (its upgrades would change the damage taken)
  level = Math.max(1, mp.round);
  clearRoundEffects();
  mpLoadBeetle({ upgrades: new Array(UPGRADE_COUNT).fill(0) });
  end = false;
  levelEnd = 0;
  start = true;
  startMenu = false;
  gamePaused = false;
  roundIntroTimer = 0;
  roundOutroTimer = 0;
  roundScene = null;
  roundScenePending = false;
  timeCount = 9999;
  score = 0;
  combo = 0;
  comboTime = 0;
  dash = false;
  centerPlayer();
  mpQueens = [];
  mpArrivals = [];
  mpQueenDamage = {};
  queen = null;
  queenProjectiles = [];
  queenEffects = [];
  queenWarningFrames = 0;
  antRespawnQueue = [];
  antRespawnWait = 0;
  antOrder = [];
  antQueenType = [];

  // Each queen's ants: her player's design, mutated like any spawn
  mpAntOwner = [];
  mpAntDeltas = [];
  let i = 1;
  for (const pi of players) {
    const p = mp.players[pi];
    const size = MP_SIZES[p.design.size].value;
    const n = Math.max(1, Math.floor(MP_DUEL_SLOTS / size + 1e-6));
    for (let k = 0; k < n; k++, i++) {
      mpPrepareAntSlot(i);
      applyStatsToAnt(i, mpBuildAntStats(p.design, true).stats);
      antSizeGene[i] = antSize[i];
      antAbilityLock[i] = {};
      mpAntOwner[i] = pi;
    }
  }
  enemyCount = i - 1;
  totalAntSlots = enemyCount;
  playerSpeed = movementSpeed / Math.max(1, enemyCount);

  // The queens, spread around the arena
  const b = getPlayAreaBounds(120);
  const W = b.maxX - b.minX, H = b.maxY - b.minY;
  const spots = players.length === 2 ?
    [[b.minX + W * 0.1, b.minY + H * 0.5], [b.minX + W * 0.9, b.minY + H * 0.5]] :
    [[b.minX + W * 0.12, b.minY + H * 0.15], [b.minX + W * 0.88, b.minY + H * 0.15], [b.minX + W * 0.5, b.minY + H * 0.95]];
  players.forEach((pi, k) => {
    mpSpawnQueen(pi);
    const q = mpQueens[mpQueens.length - 1];
    q.x = spots[k][0];
    q.y = spots[k][1];
    q.health = q.maxHealth = q.maxHealth * MP_DUEL_HEALTH_SCALE;
    q.maxAlive = MP_DUEL_MAX_ALIVE;
    q.strictMaxAlive = true; // Even her panic bodyguards count
    q.lastBeetleX = playerX;
    q.lastBeetleY = playerY;
  });
  // Every ant starts with its queen, waiting to be spawned
  for (let j = 1; j <= enemyCount; j++) {
    antDormant[j] = true;
    antOrder[j] = null;
    parkAnt(j);
  }
  for (const q of mpQueens) {
    q.spawnCharges = Math.max(q.spawnCharges, 4);
    queenEffects = q._fx;
  }
  mpSelectPrimaryQueen();

  sd.duel = { players: players.slice(), t: 0, over: null, lastAttack: {}, pending: new Map(), camSnap: true };
  sd.step = 'duel';
  sd.frames = 0;
  titlemusic.stop();
  if (!gamemusic.isPlaying()) gamemusic.play();
}

// Back to the menus
function mpEndDuelField() {
  clearRoundEffects();
  mpQueens = [];
  mpArrivals = [];
  queen = null;
  queenProjectiles = [];
  queenEffects = [];
  queenWarningFrames = 0;
  enemyCount = 0;
  mpAntOwner = [];
  antDormant = [];
  antQueenType = [];
  antOrder = [];
  start = false;
  end = false;
  stopRumble();
  gamemusic.stop();
  if (!titlemusic.isPlaying()) titlemusic.play();
}

function mpDuelNearestQueen(x, y, ownerIndex) {
  let best = null, bd = Infinity;
  for (const q of mpQueens) {
    if (q.mpOwner === ownerIndex) continue;
    const d = (q.x - x) ** 2 + (q.y - y) ** 2;
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

// The passes for this frame: for each queen, the group of her ants aimed at each enemy queen. Her own pass (withQueen)
// is the group aimed where she is, plus her dormant ants (so she can spawn them, and their bullets still in the air fly on).
function mpDuelGroups() {
  const groups = [];
  for (const q of mpQueens) {
    const qT = mpDuelNearestQueen(q.x, q.y, q.mpOwner);
    if (!qT) continue;
    const byTarget = new Map([[qT, new Set()]]);
    for (let j = 1; j <= enemyCount; j++) {
      if (mpAntOwner[j] !== q.mpOwner || antDormant[j]) continue;
      const T = mpDuelNearestQueen(antX[j], antY[j], q.mpOwner);
      if (!byTarget.has(T)) byTarget.set(T, new Set());
      byTarget.get(T).add(j);
    }
    for (const [T, ants] of byTarget) groups.push({ q: q, T: T, ants: ants, withQueen: T === qT });
  }
  // Each side's queen pass goes last, so whatever its other passes leave behind is there for it
  return groups.sort((a, b) => a.withQueen - b.withQueen);
}

function mpDuelPass(D, g, phase) {
  const owner = g.q.mpOwner;
  const T = g.T;
  // Hide everyone that isn't in this pass
  const masked = [];
  let hiddenAlive = 0;
  for (let j = 1; j <= enemyCount; j++) {
    const own = mpAntOwner[j] === owner;
    if (own && (g.ants.has(j) || (g.withQueen && antDormant[j]))) continue;
    if (own && !antDormant[j]) hiddenAlive++;
    masked.push([j, antDormant[j], enemyBullets[j], antRapidFireNextFrame[j], antOrder[j], antQueenType[j]]);
    antDormant[j] = true;
    enemyBullets[j] = [];
    antRapidFireNextFrame[j] = Infinity;
    antOrder[j] = null;
    antQueenType[j] = -1; // So she never "spawns" one of her ants that's out fighting another queen
  }
  const key = owner;
  let rests = null;
  if (phase === 'act') {
    rests = MP_DUEL_LISTS.map(([get, set]) => {
      const all = get();
      const mine = [], rest = [];
      for (const o of all) ((g.withQueen && (o.mpSide === undefined || o.mpSide === key)) ? mine : rest).push(o);
      set(mine);
      return rest;
    });
  }
  // The stand-in beetle: the queen this pass is fighting
  playerX = T.x;
  playerY = T.y;
  playerPrevX = T.x;
  playerPrevY = T.y;
  health = MP_DUEL_SENTINEL_HEALTH;
  shield = 0;
  playerKnockedBack = false;
  playerKnockbackVelX = 0;
  playerKnockbackVelY = 0;
  dash = false;
  beetleBodyCheckX = null;
  beetleBodyCheckY = null;
  lastBeetleShotFrame = D.lastAttack[T.mpOwner] !== undefined ? D.lastAttack[T.mpOwner] : -9999;
  lastBeetleShockwaveFrame = -9999;
  lastBeetleDashFrame = -9999;
  mpSelectQueen(g.q);
  g.q.mpHiddenAlive = hiddenAlive;
  try {
    if (phase === 'move') {
      autonomousAntMovement();
    } else {
      if (g.withQueen) updateQueen();
      updateAntCooldownBoosts();
      enemyShoot1();
      drawEnemyArcExplosionLinks();
      drawEnemySmears();
      updateDeathRefires();
      drawEnemyExplosions();
      drawEnemyGroundImpacts();
      updateEnemyBeams();
      updateEnemyStreams();
      if (g.withQueen && queen === g.q) drawQueenOverlays();
    }
  } finally {
    const dmg = MP_DUEL_SENTINEL_HEALTH - health;
    if (dmg > 0) D.pending.set(T, (D.pending.get(T) || 0) + dmg);
    if (phase === 'act') {
      // Bumped, grabbed and swung, vacuumed in: the stand-in beetle's moves are hers
      const dx = playerX - T.x, dy = playerY - T.y;
      if (!T.bunker && dx * dx + dy * dy > 0.01 && dx * dx + dy * dy < 250 * 250) {
        const p = clampToPlayArea(T.x + dx, T.y + dy, 20);
        T.x = p.x;
        T.y = p.y;
      }
      if (playerKnockedBack && !T.bunker) {
        T.vx += playerKnockbackTargetX * 0.8;
        T.vy += playerKnockbackTargetY * 0.8;
      }
      for (const j of g.ants) if (antLastShotFrame[j] === frameCount) D.lastAttack[owner] = frameCount;
      if (g.withQueen && g.q.abilityTimer === 0) D.lastAttack[owner] = Math.max(D.lastAttack[owner] || -9999, frameCount - 1);
      MP_DUEL_LISTS.forEach(([get, set], k) => {
        const mine = get();
        for (const o of mine) o.mpSide = key;
        set(rests[k].concat(mine));
      });
    }
    for (const [j, dormant, bullets, rapidNext, order, type] of masked) {
      antDormant[j] = dormant;
      enemyBullets[j] = bullets;
      antRapidFireNextFrame[j] = rapidNext;
      antOrder[j] = order;
      antQueenType[j] = type;
    }
    g.q.mpHiddenAlive = 0;
    health = MP_DUEL_SENTINEL_HEALTH;
    playerKnockedBack = false;
  }
}

// One frame of the fight (called from draw() in place of everything else)
function mpDuelFrame() {
  const sd = mp.showdown;
  const D = sd.duel;
  sd.frames++;
  D.t++;
  const inp = mpReadInput(false);

  updateSpatialGrid();
  for (let i = 1; i <= enemyCount; i++) {
    antMoveX[i] = 0;
    antMoveY[i] = 0;
  }
  mpDuelCamera(D);
  drawBackground();
  beginGameplayScaling();
  updateEnemyTerritories();
  updateEnemyWalls();

  const groups = mpDuelGroups();
  D.pending = new Map();
  for (const g of groups) mpDuelPass(D, g, 'move');
  drawEnemy();
  for (const g of groups) mpDuelPass(D, g, 'act');
  // A queen with nobody left to fight just stands there
  for (const q of mpQueens.slice()) {
    if (groups.some(g => g.q === q && g.withQueen)) continue;
    mpSelectQueen(q);
    drawQueen();
  }

  drawAirborneAnts();
  drawDeferredEnemyBullets();
  handleAntKnockback();
  holdBunkeredAnts();
  holdDormantAnts();
  resolveAntWallCollisions();
  drawBlinkFlashes();
  drawEnemySmokeImpacts();
  drawDeathEffects();
  drawSpeedRings();
  drawBeetleHitEffects();
  mpDuelAntHits();
  mpDuelApplyDamage(D);
  // Between fights' passes, "the beetle" sits in the middle of the queens (some drawing looks at it)
  if (mpQueens.length > 0) {
    playerX = mpQueens.reduce((s, q) => s + q.x, 0) / mpQueens.length;
    playerY = mpQueens.reduce((s, q) => s + q.y, 0) / mpQueens.length;
  }
  endGameplayScaling();

  mpDrawQueenHuds();
  mpDrawDuelHud(D, inp);
}

// Ant bullets hit enemy ants and royal guards too
function mpDuelAntHits() {
  for (let i = 1; i <= enemyCount; i++) {
    const o = mpAntOwner[i];
    const list = enemyBullets[i];
    if (!list || list.length === 0) continue;
    for (let b = list.length - 1; b >= 0; b--) {
      const bl = list[b];
      if (bl.delayFrames > 0 || (bl.pathType === 1 && bl.airHeight > 1)) continue;
      const dmg = bl.size * getBulletSpeedTier(getEnemyBulletHitSpeed(bl)).damageMultiplier * getAntAttackMultiplier(i);
      let hit = false;
      for (let j = 1; j <= enemyCount && !hit; j++) {
        if (mpAntOwner[j] === o || antDormant[j] || antInBunker[j] || antAirHeight[j] > 0 || antX[j] === PARKED_ANT_POS) continue;
        const r = 10 + 8 * antSize[j];
        if ((antX[j] - bl.x) ** 2 + (antY[j] - bl.y) ** 2 < r * r) {
          mpDuelHurtAnt(j, dmg);
          hit = true;
        }
      }
      for (const q of mpQueens) {
        if (hit || q.mpOwner === o) continue;
        for (const g of q.guards) {
          const r = ROYAL_GUARD_BODY_RADIUS + 4;
          if ((g.x - bl.x) ** 2 + (g.y - bl.y) ** 2 < r * r) {
            mpDuelHurtGuard(q, g, dmg);
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        spawnSmokeImpact(bl.x, bl.y, 14, 2);
        list.splice(b, 1);
      }
    }
  }
}

function mpDuelHurtAnt(j, dmg) {
  damageAnt(j, dmg);
  antLastHitTime[j] = millis();
  if (antHealth[j] > 0) {
    antStunned[j] = true;
    antStunTimer[j] = 20;
    return;
  }
  const x = antX[j], y = antY[j];
  antLives[j]++;
  onAntDied(j); // Back to her queen, to be spawned again
  spawnSmokeImpact(x, y, 30, 4);
  if (!sGetHit1.isPlaying() && !sGetHit2.isPlaying()) (random() < 0.5 ? sGetHit1 : sGetHit2).play();
  respawnAnt(j);
}

function mpDuelHurtGuard(q, g, dmg) {
  g.health -= dmg;
  g.hitFlash = 10;
  g.lastHitTime = millis();
  if (g.health > 0) return;
  const k = q.guards.indexOf(g);
  if (k >= 0) q.guards.splice(k, 1);
  q.segmentScore += QUEEN_SCORE_PER_GUARD_LOST;
  spawnSmokeImpact(g.x, g.y, 30, 4);
}

// Everything that hurt a queen this frame lands at once (so a double knockout is a draw)
function mpDuelApplyDamage(D) {
  for (const [T, dmg] of D.pending) {
    if (!mpQueens.includes(T)) continue;
    const foe = mpDuelNearestQueen(T.x, T.y, T.mpOwner);
    if (foe) {
      playerX = foe.x; // She re-strategizes when hit, around whoever she's fighting
      playerY = foe.y;
    }
    mpSelectQueen(T);
    damageQueen(dmg, true);
  }
  D.pending = new Map();
  if (D.over === null && D.t > MP_DUEL_MAX_FRAMES && mpQueens.length > 1) {
    // Time: the healthiest queen takes it
    const best = mpQueens.slice().sort((a, b) => b.health / b.maxHealth - a.health / a.maxHealth)[0];
    for (const q of mpQueens.slice()) if (q !== best) mpDuelQueenDown(q);
    D.timeout = true;
  }
  if (D.over === null && mpQueens.length <= 1) {
    D.over = { winner: mpQueens.length ? mpQueens[0].mpOwner : null, t: D.t };
  }
  mpSelectPrimaryQueen();
}

// A queen is beaten (from killQueen): she and her ants leave the fight
function mpDuelQueenDown(q) {
  spawnSmokeImpact(q.x, q.y, 70, 8);
  for (const g of q.guards) spawnSmokeImpact(g.x, g.y, 30, 4);
  shakeScreen(QUEEN_DEATH_SHAKE_FRAMES, QUEEN_DEATH_SHAKE);
  queenDeathBurst = createQueenDeathBurst(q.x, q.y);
  if (!sHit2.isPlaying()) sHit2.play();
  for (let j = 1; j <= enemyCount; j++) {
    if (mpAntOwner[j] !== q.mpOwner) continue;
    if (!antDormant[j]) spawnSmokeImpact(antX[j], antY[j], 26, 3);
    antDormant[j] = true;
    antOrder[j] = null;
    enemyBullets[j] = [];
    releaseAntFromBunker(j, false);
    parkAnt(j);
  }
  for (const [get, set] of MP_DUEL_LISTS) set(get().filter(o => o.mpSide !== q.mpOwner));
  const k = mpQueens.indexOf(q);
  if (k >= 0) mpQueens.splice(k, 1);
  q._mpLive = false;
  if (queen === q) {
    queen = null;
    queenProjectiles = [];
    queenEffects = [];
  }
}

// World 3 has a camera: frame every queen still in it
function mpDuelCamera(D) {
  if (!isAdaptiveCameraWorld()) return;
  gameCam.mode = 'play';
  gameCam.stretch = 0;
  gameCam.snapPending = false;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const q of mpQueens) {
    minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x);
    minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
  }
  if (minX === Infinity) {
    updateCameraShake();
    return;
  }
  const pad = 260;
  let view = Math.max(getCameraMinView(), maxY - minY + pad * 2, (maxX - minX + pad * 2) / getCameraAspect());
  view = Math.min(view, getCameraWholeWorldView());
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const target = Math.log(view);
  if (D.camSnap) {
    gameCam.logView = gameCam.logTarget = target;
    gameCam.x = cx;
    gameCam.y = cy;
    D.camSnap = false;
  } else {
    const dt = getCameraDt();
    gameCam.logTarget = target;
    gameCam.logView += (target - gameCam.logView) * cameraEase(2, dt);
    gameCam.x += (cx - gameCam.x) * cameraEase(2.5, dt);
    gameCam.y += (cy - gameCam.y) * cameraEase(2.5, dt);
  }
  updateCameraShake();
}

// Who's fighting, and the result
function mpDrawDuelHud(D, inp) {
  beginMenuScaling();
  const W = getMenuWidth(), H = getMenuHeight();
  push();
  textAlign(CENTER, CENTER);
  stroke(0);
  strokeWeight(5);
  textSize(24);
  const names = D.players.map(pi => mp.players[pi]);
  const total = names.reduce((s, p) => s + textWidth(p.name), 0) + textWidth('  vs  ') * (names.length - 1);
  let x = W / 2 - total / 2;
  names.forEach((p, k) => {
    if (k > 0) {
      fill(255);
      textAlign(LEFT, CENTER);
      text('  vs  ', x, H - 30);
      x += textWidth('  vs  ');
    }
    const out = !mpQueens.some(q => q.mpOwner === p.index);
    fill(out ? 110 : p.color[0], out ? 110 : p.color[1], out ? 110 : p.color[2]);
    textAlign(LEFT, CENTER);
    text(p.name, x, H - 30);
    x += textWidth(p.name);
  });
  // The opening call
  if (D.t < 100) {
    const a = 255 * Math.min(1, (100 - D.t) / 25);
    textAlign(CENTER, CENTER);
    textSize(64);
    strokeWeight(8);
    fill(255, 215, 110, a);
    stroke(0, a);
    text('FIGHT!', W / 2, H * 0.42);
  }
  pop();
  if (D.over !== null && D.t - D.over.t >= 90) {
    push();
    textAlign(CENTER, CENTER);
    textSize(52);
    stroke(0);
    strokeWeight(7);
    const w = D.over.winner;
    fill(w !== null ? color(...mp.players[w].color) : color(255));
    text(w !== null ? `${mp.players[w].name}'s queen wins!` : 'Draw! Nobody moves on.', W / 2, H * 0.42);
    if (D.timeout) {
      textSize(20);
      strokeWeight(4);
      fill(255);
      text('Time! The healthiest queen takes it.', W / 2, H * 0.42 + 50);
    }
    pop();
    mpContinueHint('Continue');
    if (inp.confirm || inp.click) {
      mpEndDuelField();
      mpOnDuelOver(w);
    }
  }
  endMenuScaling();
}
