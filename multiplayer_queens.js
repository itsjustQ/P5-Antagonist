// ========== MULTIPLAYER QUEENS ==========
// A player can send their queen at another player's beetle. She drops in (after the usual warning) somewhere in that
// player's next combat turn, with her owner's upgrades, and only commands her owner's ants. Several queens can be out
// at once (from one player or several): the game's queen code works on one current queen (the `queen` global and her
// projectile and effect lists), so this file swaps each queen in as the current one to update her, and the hit tests
// pick the queen that was hit (see isQueenHitAt, forEachLiveQueen).

let mpQueens = [];              // Queens out in this combat turn
let mpArrivals = [];            // { owner, at } queens due to drop in this turn (at = combat frame)
let mpCombatFrame = 0;
let mpLastQueenHitOwner = null; // Owner of the last queen (or royal guard) to hurt the beetle
let mpLastKillWasQueen = false;
let mpQueenDamage = {};         // Owner -> damage their queens did this turn (scored like ant damage)

function mpHasQueens() {
  return mpActive() && mpQueens.length > 0;
}

// Make q the current queen (stashing the current one's projectile and effect lists on her)
function mpSelectQueen(q) {
  if (queen === q) return;
  if (queen && queen._mpLive) {
    queen._proj = queenProjectiles;
    queen._fx = queenEffects;
  }
  queen = q;
  if (q) {
    queenProjectiles = q._proj || [];
    queenEffects = q._fx || [];
  } else {
    queenProjectiles = [];
    queenEffects = [];
  }
}

function mpSelectPrimaryQueen() {
  mpSelectQueen(mpQueens.length > 0 ? mpQueens[0] : null);
}

function mpWithQueen(q, fn) {
  const prev = queen && queen._mpLive && mpQueens.includes(queen) ? queen : null;
  mpSelectQueen(q);
  try {
    return fn();
  } finally {
    mpSelectQueen(prev && mpQueens.includes(prev) ? prev : (mpQueens[0] || null));
  }
}

function mpForEachQueen(fn) {
  const prev = queen;
  for (const q of mpQueens.slice()) {
    if (!mpQueens.includes(q)) continue;
    mpSelectQueen(q);
    fn();
  }
  mpSelectQueen(prev && mpQueens.includes(prev) ? prev : (mpQueens[0] || null));
}

// Hit test across every queen; the one that's hit becomes the current queen
function mpQueenHitAt(x, y, pad) {
  for (const q of mpQueens) {
    if (q.bunker || q.airHeight > 0) continue;
    if (dist(x, y, q.x, q.y) < QUEEN_BODY_RADIUS + pad) {
      mpSelectQueen(q);
      return true;
    }
  }
  return false;
}

function mpRoyalGuardHitAt(x, y, pad, skip) {
  const reach = ROYAL_GUARD_BODY_RADIUS + pad;
  for (const q of mpQueens) {
    for (const g of q.guards) {
      if (skip && skip.has(g)) continue;
      if ((x - g.x) ** 2 + (y - g.y) ** 2 < reach * reach) return g;
    }
  }
  return null;
}

function mpRoyalGuardsWithin(x, y, pad) {
  const reach = ROYAL_GUARD_BODY_RADIUS + pad;
  const out = [];
  for (const q of mpQueens) for (const g of q.guards) if ((x - g.x) ** 2 + (y - g.y) ** 2 < reach * reach) out.push(g);
  return out;
}

// ---------- Arrivals ----------

// At the start of a combat turn: the queens sent at this player arrive at random times in the turn
function mpPrepareQueenArrivals(p) {
  mpQueens = [];
  mpArrivals = [];
  mpCombatFrame = 0;
  mpLastQueenHitOwner = null;
  mpLastKillWasQueen = false;
  mpQueenDamage = {};
  queen = null;
  queenProjectiles = [];
  queenEffects = [];
  const roundFrames = timeCount * 60;
  const mine = mp.pendingQueens.filter(q => q.target === p.index);
  mp.pendingQueens = mp.pendingQueens.filter(q => q.target !== p.index);
  mine.forEach((q, k) => {
    // Normally a surprise somewhere in the turn; in the final stand they all come right away
    const at = mp.finalStand ? 60 + k * 90 + QUEEN_WARNING_FRAMES :
      Math.round(random(2 * 60, Math.max(3 * 60, roundFrames * 0.55))) + k * 90 + QUEEN_WARNING_FRAMES;
    mpArrivals.push({ owner: q.owner, at: at });
    p.stats.queensTargeted++;
  });
}

function mpUpdateQueens() {
  mpCombatTick();
  if (!end && roundIntroTimer === 0) mpCombatFrame++;
  // Warnings, then the drop-ins
  let soonest = Infinity;
  for (let k = mpArrivals.length - 1; k >= 0; k--) {
    const a = mpArrivals[k];
    if (end) break;
    if (mpCombatFrame >= a.at) {
      mpArrivals.splice(k, 1);
      mpSpawnQueen(a.owner);
    } else {
      soonest = Math.min(soonest, a.at - mpCombatFrame);
    }
  }
  queenWarningFrames = soonest <= QUEEN_WARNING_FRAMES && !end ? Math.max(1, soonest) : 0;
  if (mpQueens.length === 0) {
    queen = null;
    return;
  }
  for (const q of mpQueens.slice()) {
    if (!mpQueens.includes(q)) continue;
    mpSelectQueen(q);
    updateQueen();
  }
  mpSelectPrimaryQueen();
}

// The owner's queen, built like the game's own (startQueenFight) and then given the owner's upgrades and ants
function mpSpawnQueen(ownerIndex) {
  const owner = mp.players[ownerIndex];
  // Her owner needs an ant on the field for her to copy: if none got a slot this turn, one waits with her
  let types = [];
  let waiting = -1;
  for (let i = 1; i <= enemyCount; i++) if (mpAntOwner[i] === ownerIndex) types.push(i);
  if (types.length === 0) {
    waiting = enemyCount + 1;
    const i = enemyCount + 1;
    mpPrepareAntSlot(i);
    applyStatsToAnt(i, mpBuildAntStats(owner.design, true).stats);
    antSizeGene[i] = antSize[i];
    antAbilityLock[i] = {};
    mpAntOwner[i] = ownerIndex;
    enemyCount = i;
    antDormant[i] = true;
    parkAnt(i);
    types = [i];
  }
  // startQueenFight() treats every ant as hers and takes over the respawn queue: keep the other players' ants out of it
  const queueBefore = antRespawnQueue.slice();
  const dormantBefore = antDormant.slice();
  mpSelectQueen(null);
  startQueenFight();
  const q = queen;
  q._mpLive = true;
  q.mpOwner = ownerIndex;
  q.types = types;
  for (let i = 1; i <= enemyCount; i++) {
    if (mpAntOwner[i] === ownerIndex) {
      antDormant[i] = queueBefore.includes(i) || i === waiting; // Waiting to respawn: she brings them back now
    } else {
      antDormant[i] = !!dormantBefore[i];
    }
  }
  antRespawnQueue = queueBefore.filter(i => mpAntOwner[i] !== ownerIndex);
  // Her upgrades
  const up = owner.queen;
  q.health = q.maxHealth = MP_QUEEN_HEALTH[up.health];
  q.mpGuardsPerBatch = MP_QUEEN_GUARD_COUNT[up.guardCount];
  q.mpGuardFrames = Math.round(MP_QUEEN_GUARD_SECONDS[up.guardFreq] * 60);
  q.attackSpeed = QUEEN_ABILITY_FRAMES / (MP_QUEEN_FIRE_SECONDS[up.fireRate] * 60);
  q.title = `${owner.name.toUpperCase()}'S QUEEN`;
  q._proj = queenProjectiles;
  q._fx = queenEffects;
  mpQueens.push(q);
  mpSelectPrimaryQueen();
}

function mpKillQueen() {
  const q = queen;
  if (mpInDuel()) {
    mpDuelQueenDown(q); // A tournament fight (multiplayer_duel.js)
    return;
  }
  spawnSmokeImpact(q.x, q.y, 70, 8);
  for (const g of q.guards) spawnSmokeImpact(g.x, g.y, 30, 4);
  shakeScreen(QUEEN_DEATH_SHAKE_FRAMES, QUEEN_DEATH_SHAKE);
  queenDeathBurst = createQueenDeathBurst(q.x, q.y);
  if (!sHit2.isPlaying()) sHit2.play();
  // Eating a queen is worth a lot to the beetle
  const gained = addKillScore(QUEEN_KILL_EXP, 1, null);
  addDeathEffect(q.x, q.y, gained);
  // Her ants that were waiting on her go back to the normal respawns
  for (let i = 1; i <= enemyCount; i++) {
    if (mpAntOwner[i] === q.mpOwner && antDormant[i] && !antRespawnQueue.includes(i)) antRespawnQueue.push(i);
  }
  mpQueens.splice(mpQueens.indexOf(q), 1);
  q._mpLive = false;
  queen = null;
  queenProjectiles = [];
  queenEffects = [];
  if (mpQueens.length === 0) {
    if (mpArrivals.length > 0) {
      // More are on the way: the next one comes right away
      for (const a of mpArrivals) a.at = Math.min(a.at, mpCombatFrame + QUEEN_WARNING_FRAMES);
    } else {
      queenDefeatedThisRound = true;
      timeCount = -1; // The last queen is down: the round ends, like killing a queen in the normal game
    }
  }
}

// An ant died: if its owner's queen is out, it waits for her to bring it back
function mpOnAntDiedQueen(i) {
  const q = mpQueens.find(x => x.mpOwner === mpAntOwner[i]);
  if (!q) return;
  mpWithQueen(q, () => onQueenAntDied(i));
}

function mpOnQueenDamagedBeetle(damage) {
  if (!mpActive() || !queen || queen.mpOwner === undefined) return;
  mpLastQueenHitOwner = queen.mpOwner;
  mpQueenDamage[queen.mpOwner] = (mpQueenDamage[queen.mpOwner] || 0) + damage;
}

function mpOnBeetleThrown() {
  if (!mpActive() || !queen || queen.mpOwner === undefined) return;
  mp.players[queen.mpOwner].stats.throws++;
}

// End of a combat turn: queen damage scores for her owner, and queens that never arrived wait for another turn
function mpOnQueensCombatEnd(antGains) {
  for (const o in mpQueenDamage) {
    const owner = mp.players[o];
    const gain = Math.round(mpQueenDamage[o] * MP_ANT_POINTS_PER_DAMAGE * mpPointsMultiplier(owner));
    owner.antPoints += gain;
    antGains[o] = (antGains[o] || 0) + gain;
  }
  const target = mp.players[mp.turn];
  for (const a of mp.finalStand ? [] : mpArrivals) {
    const owner = mp.players[a.owner];
    // Still alive: she waits for their next turn. Otherwise someone else (never her owner), or her levels come back.
    if (target.alive && health >= 0) mp.pendingQueens.push({ owner: a.owner, target: target.index });
    else {
      const others = mp.players.filter(p => p.alive && p.index !== a.owner && p.index !== target.index);
      if (others.length) mp.pendingQueens.push({ owner: a.owner, target: random(others).index });
      else owner.levelsSpent = Math.max(0, owner.levelsSpent - MP_QUEEN_COST_LEVELS);
    }
  }
  mpArrivals = [];
  mpQueens = [];
  queen = null;
  queenProjectiles = [];
  queenEffects = [];
  queenWarningFrames = 0;
}

// Her owner's color under her, and whose she is
function mpDrawQueenRing() {
  const owner = mp.players[queen.mpOwner];
  if (!owner) return;
  const c = owner.color;
  const r = getQueenBodyRadius() * 2.3;
  push();
  noFill();
  stroke(c[0], c[1], c[2], 230);
  strokeWeight(4);
  ellipse(queen.x, queen.y + 6, r * 1.15, r * 0.75);
  noStroke();
  fill(c[0], c[1], c[2]);
  textAlign(CENTER, CENTER);
  textSize(14);
  stroke(0);
  strokeWeight(3);
  text(`${owner.name}'s queen`, queen.x, queen.y + r * 0.55);
  pop();
}

function mpDrawQueenHuds() {
  if (mpQueens.length === 0) {
    queenHudOffset = 0;
    const prev = queen;
    queen = null;
    drawQueenHud(); // The "queen incoming" warning
    queen = prev;
    return;
  }
  const prev = queen;
  mpQueens.forEach((q, k) => {
    queenHudOffset = k * 46;
    mpSelectQueen(q);
    drawQueenHud();
  });
  queenHudOffset = 0;
  mpSelectQueen(prev && mpQueens.includes(prev) ? prev : mpQueens[0]);
}
