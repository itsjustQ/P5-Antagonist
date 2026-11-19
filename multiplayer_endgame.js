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
      if ((hitInfo && hitInfo.highArc && !isMine) || explosionFromHighArc) o.stats.highArcDamage += dealt;
      const path = getPathType(i);
      if (!isMine && (path === 2 || path === 3 || path === -1 || path === -2)) o.stats.calculatedHits++;
      if (getFireType(i) === -2) o.stats.ignoredCooldowns++; // Hit reload fires again right away
    } });
  // Air strike residue
  mpWrap('handleExplosionDamage', {
    before: () => ({ health: health, shield: shield }),
    after: (ctx, r, size, i) => {
      const o = explosionFromHighArc && mpOwnerOf(i);
      if (!o) return;
      const dealt = (ctx.health - health) + (ctx.shield - shield);
      if (dealt > 0) o.stats.highArcDamage += dealt;
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
// turn order (wrapping around, and skipping players who were already out). Kills made after the killer's own
// beetle was out don't count.
function mpNeighborChains() {
  const log = (mp.killLog || []).slice().sort((a, b) => a.order - b.order);
  const n = mp.players.length;
  const best = {};
  const chain = {};
  const deadBefore = order => new Set(mp.players.filter(p => p.deathOrder !== null && p.deathOrder < order).map(p => p.index));
  for (const k of log) {
    const killer = mp.players[k.killer];
    if (killer && killer.deathOrder !== null && killer.deathOrder < k.order) continue; // Their beetle was already out
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

function mpTitleDefs() {
  const chains = mpNeighborChains();
  const owned = (p, ids) => ids.reduce((a, id) => a + (p.upgrades[id] > 0 ? 1 : 0), 0);
  const levels = (p, ids) => ids.reduce((a, id) => a + p.upgrades[id], 0);
  const n = (v, one, many) => `${Math.round(v).toLocaleString()} ${Math.round(v) === 1 ? one : many}`;
  const secs = v => `${Math.round(v / 60).toLocaleString()} s`;
  // Each: id, name, value per player, what it's for, how the amount reads, and 'max' or 'min'
  return [
    ['queensSpawned', 'Most queens spawned', p => p.stats.queensSpawned, 'sent their queen at other beetles the most', v => n(v, 'queen sent', 'queens sent')],
    ['queensTargeted', 'Most targeted by queens', p => p.stats.queensTargeted, 'had the most queens sent at them', v => n(v, 'queen', 'queens') + ' sent at them'],
    ['kills', 'Most player kills', p => p.stats.kills, 'their ants or queen defeated the most beetles', v => n(v, 'beetle defeated', 'beetles defeated')],
    ['antsShot', 'Most ants shot', p => p.stats.antsShot, 'shot the most ants with their beetle', v => n(v, 'ant shot', 'ants shot')],
    ['bestCombo', 'Largest combo', p => p.stats.bestCombo, 'ate the most ants in one combo', v => `a ${v}-ant combo`],
    ['throws', 'Bully', p => p.stats.throws, 'their queens and guards threw beetles the most', v => n(v, 'throw', 'throws')],
    ['dashes', 'Most dashes used', p => p.stats.dashes, 'dashed the most', v => n(v, 'dash', 'dashes')],
    ['circles', 'Most circles done', p => p.stats.circles, 'ran their beetle in the most circles', v => n(v, 'circle', 'circles')],
    ['distance', 'Most distance traveled', p => Math.round(p.stats.distance), 'their beetle walked the furthest', v => `${Math.round(v).toLocaleString()} px walked`],
    ['shockwaves', 'Most shockwaves used', p => p.stats.shockwaves, 'set off the most shockwaves', v => n(v, 'shockwave', 'shockwaves')],
    ['bulletsFired', 'Most bullets fired', p => p.stats.bulletsFired, 'their beetle fired the most bullets', v => n(v, 'bullet', 'bullets')],
    ['versatile', 'Versatile', p => owned(p, MP_SPECIAL_UPGRADES), 'the most special shot, shockwave and dash upgrades', v => n(v, 'special upgrade', 'special upgrades')],
    ['defensive', 'Most defensive', p => levels(p, MP_DEFENSE_UPGRADES), 'the most defense upgrades', v => n(v, 'defense level', 'defense levels')],
    ['shieldsBurned', 'Most shields burned', p => p.stats.shieldsBurned, 'lost the most shields to hits', v => n(v, 'shield', 'shields')],
    ['beetleAir', 'Most airtime (beetle)', p => p.stats.beetleAirFrames, 'their beetle spent the longest in the air', v => secs(v) + ' in the air'],
    ['antAir', 'Most airtime (ants)', p => p.stats.antAirFrames, 'their ants spent the longest in the air', v => secs(v) + ' of ant airtime'],
    ['fastestBullet', 'Fastest bullet', p => Math.round(p.stats.fastestBullet * 100) / 100, 'their ants fired the fastest bullet', v => `speed ${v}`],
    ['antDeaths', 'Most Negative Feedback', p => p.stats.antDeaths, 'their ants died the most', v => n(v, 'ant lost', 'ants lost')],
    ['slotsHeld', 'Multitudes', p => p.stats.slotsHeld, 'held the most ant slots', v => n(v, 'slot', 'slots') + ' held'],
    ['biggestBullet', 'Biggest Bullet', p => Math.round(p.stats.biggestBullet * 100) / 100, 'their ants fired the biggest bullet', v => `${v}x size`],
    ['smallestBullet', 'Smallest Bullet', p => Math.round(p.stats.smallestBullet * 100) / 100, 'their ants fired the smallest bullet', v => `${(1 / v).toFixed(2)}x size`],
    ['obedient', 'Obedient', p => p.stats.suggestionsFollowed, 'followed the most slider suggestions', v => n(v, 'suggestion followed', 'suggestions followed')],
    ['nonLethal', 'Why Won\'t You Die', p => p.stats.nonLethalHits, 'took the most hits without dying', v => n(v, 'hit', 'hits') + ' survived'],
    ['abduction', 'Abduction', p => Math.round(p.stats.movedOthers), 'pushed and threw other beetles around the most', v => `${Math.round(v).toLocaleString()} px of pushing`],
    ['rememberMe', 'Remember Me', p => p.deathOrder === 1 ? 1 : 0, 'the first one out', v => 'first out'],
    ['cheater', 'Cheater!', p => p.stats.standingRunIns, 'the most ants ran into them while they stood still', v => n(v, 'ant', 'ants') + ' ran into them'],
    ['camper', 'Camper', p => p.stats.campEats, 'ate the most ants right as they landed or came out of a bunker', v => n(v, 'ant', 'ants') + ' eaten on landing'],
    ['temptingFate', 'Tempting Fate', p => p.stats.temptingFate, 'their ants lingered next to beetles the longest and lived', v => n(v, 'close call', 'close calls')],
    ['makeUpYourMind', 'Make Up Your Mind', p => p.stats.abilitySwitches, 'switched abilities the most', v => n(v, 'switch', 'switches')],
    ['taken', 'Taken', p => Math.round(p.stats.movedByOthers), 'got pushed and thrown around the most', v => `${Math.round(v).toLocaleString()} px pushed`],
    ['backShots', 'Back Shots', p => p.stats.backShots, 'their ants shot the most beetles in the back', v => n(v, 'back shot', 'back shots')],
    ['thief', 'Thief', p => p.stats.aphidsDrunk, 'their ants drank from the most aphids', v => n(v, 'aphid', 'aphids') + ' drunk from'],
    ['beetleiest', 'Beetleiest Beetle', p => owned(p, MP_BEETLE_NAMED), 'the most upgrades with "beetle" in the name', v => n(v, '"beetle" upgrade', '"beetle" upgrades')],
    ['easyMeals', 'Easy Meals', p => p.stats.aphidsEaten, 'ate the most aphids', v => n(v, 'aphid', 'aphids') + ' eaten'],
    ['comingDown', 'Y\'all Coming Down With Me', p => p.stats.killsAfterDeath, 'the most kills after their own beetle was out', v => n(v, 'kill', 'kills') + ' after going out'],
    ['termsAndConditions', 'I Have Read the Terms and Conditions', p => p.stats.upgradeFrames, 'the longest on the upgrade screen', v => secs(v) + ' upgrading'],
    ['aintGotTime', 'Ain\'t Got Time', p => p.stats.upgradeFrames, 'the least time on the upgrade screen', v => secs(v) + ' upgrading', 'min'],
    ['legalGuardian', 'Waiting for My Legal Guardian', p => p.stats.centerStillFrames, 'stood still in the middle the longest', v => secs(v) + ' standing still'],
    ['architect', 'Architect', p => p.stats.structures, 'their ants built the most landmines, bunkers and the like', v => n(v, 'structure', 'structures')],
    ['neighbors', 'Upstairs Neighbor Activities', p => (chains[p.index] || 0) >= 2 ? chains[p.index] : 0, 'the longest chain of neighbors taken out', v => `${v} neighbors in a row`],
    ['special', 'I\'m Special!', p => p.stats.specialBullets, 'their ants fired the most special bullets', v => n(v, 'special bullet', 'special bullets')],
    ['splitter', 'Splitter', p => p.stats.smallBullets, 'their ants fired the most small bullets', v => n(v, 'small bullet', 'small bullets')],
    ['noCooldowns', 'Who Needs Cooldowns?', p => p.stats.ignoredCooldowns, 'their ants skipped the most cooldowns', v => n(v, 'cooldown', 'cooldowns') + ' skipped'],
    ['rainingPain', 'Raining Pain', p => Math.round(p.stats.highArcDamage * 10) / 10, 'the most damage from high arcs and air strikes', v => `${v} damage from above`],
    ['calculated', 'Calculated', p => p.stats.calculatedHits, 'the most hits with tricky bullet paths', v => n(v, 'tricky hit', 'tricky hits')],
    ['inescapable', 'Inescapable', p => p.stats.homingBullets, 'their ants fired the most heat-seeking bullets', v => n(v, 'heat-seeker', 'heat-seekers')],
    ['loyalty', 'Loyalty', p => p.stats.loyalDeaths, 'the most ants that died right after landing a hit', v => n(v, 'loyal ant', 'loyal ants')]
  ].map(([id, name, value, desc, amount, mode]) => ({ id, name, value, desc, amount, mode: mode || 'max' }));
}

// How much of a title's measure its holder has, as words ("12 dashes")
function mpTitleAmount(t) {
  try { return t.def.amount(t.value); } catch (e) { return String(t.value); }
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

// ----- The bonus achievements, one at a time: a face-down card shakes harder and harder, then bursts open -----

const MP_REVEAL_BUILD = 95;  // Frames of build-up before a card flips
const MP_REVEAL_HOLD = 75;   // Frames it sits face up before the next one starts
const MP_REVEAL_CYCLE = MP_REVEAL_BUILD + MP_REVEAL_HOLD;

function mpDrawBonusReveal(inp) {
  const sd = mp.showdown;
  const W = getMenuWidth(), H = getMenuHeight();
  const lone = sd.kind === 'loneSurvivor';
  const f = sd.frames;
  // Which card is up, and where it is in its build-up
  const cur = Math.min(2, Math.floor(f / MP_REVEAL_CYCLE));
  const into = f - cur * MP_REVEAL_CYCLE;
  const allDone = f >= 2 * MP_REVEAL_CYCLE + MP_REVEAL_BUILD + 40;
  // A press during a build-up skips straight to the flip
  if (!allDone && into < MP_REVEAL_BUILD && f > 10 && (inp.confirm || inp.click)) {
    sd.frames = cur * MP_REVEAL_CYCLE + MP_REVEAL_BUILD - 1;
    inp.confirm = inp.click = false;
  }

  // Background: dark, pulsing toward the holder's color as each card flips
  mpBackground(lone ? [40, 6, 64] : [20, 14, 32]);
  // A soft glow behind the card that's up, brightest right as it flips
  const pulse = allDone ? 0 : into < MP_REVEAL_BUILD ? (into / MP_REVEAL_BUILD) : Math.max(0, 1 - (into - MP_REVEAL_BUILD) / 40);
  if (pulse > 0) {
    const gx = W / 2 + (cur - 1) * 380, gy = 300, gr = 260 + 120 * pulse;
    const ctx = drawingContext;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, `rgba(255,215,110,${0.35 * pulse})`);
    g.addColorStop(1, 'rgba(255,215,110,0)');
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    ctx.restore();
  }
  mpTitle(lone ? 'Bonus achievements' : sd.kind === 'roundLimit' ? `Round ${mp.round}: the round limit` : 'Every beetle has fallen', 50, 40);
  push();
  textAlign(CENTER, CENTER);
  fill(220);
  const sub = lone ? 'Every achievement another player earned brings their queen back to challenge the survivor.' :
    sd.kind === 'roundLimit' ? `Each bonus achievement is worth ${MP_BONUS_ACHIEVEMENT_POINTS.toLocaleString()} points. Then the best score wins.` :
    `Each bonus achievement is worth ${MP_BONUS_ACHIEVEMENT_POINTS.toLocaleString()} points before the queens are seeded.`;
  fitTextSize(sub, 17, W - 80);
  text(sub, W / 2, 92);
  pop();

  sd.burst = sd.burst || [];
  for (let k = 0; k < 3; k++) {
    const start = k * MP_REVEAL_CYCLE;
    const age = f - start;
    if (age < 0) continue;
    const x = W / 2 + (k - 1) * 380;
    const y = 300;
    const t = sd.bonus[k];
    const flipped = age >= MP_REVEAL_BUILD;
    if (!flipped) {
      // Build-up: the card slides in face down, then shakes harder and harder, with the screen rumbling along
      const u = age / MP_REVEAL_BUILD;
      const enter = Math.min(1, age / 16);
      const jit = 1 + 9 * u * u;
      mp.shake = Math.max(mp.shake, 0.5 + 3.5 * u * u);
      push();
      translate(x + random(-jit, jit), y + (1 - enter) * 120 + random(-jit, jit));
      mpRotate(random(-0.05, 0.05) * u);
      scale(0.85 + 0.15 * enter + 0.06 * u);
      mpDrawFaceDownCard(u);
      pop();
      // Sparks pulled in toward it
      if (u > 0.3 && Math.random() < u) {
        const a = Math.random() * Math.PI * 2;
        sd.burst.push({ x: x + Math.cos(a) * 260, y: y + Math.sin(a) * 200, vx: -Math.cos(a) * 6, vy: -Math.sin(a) * 5, life: 40, rgb: [255, 215, 110], s: 4 });
      }
      continue;
    }
    // The flip: a flash, a hard shake and a burst in the holder's color
    const since = age - MP_REVEAL_BUILD;
    if (since === 0 && !sd['flipped' + k]) {
      sd['flipped' + k] = true;
      mp.shake = t ? 14 : 4;
      const rgb = t ? mp.players[t.holder].color : [140, 140, 140];
      for (let b = 0; b < (t ? 70 : 12); b++) {
        const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 9;
        sd.burst.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 50 + Math.random() * 30, rgb: b % 3 ? rgb : [255, 230, 140], s: 5 + Math.random() * 5 });
      }
      if (t && typeof sHit2 !== 'undefined' && !sHit2.isPlaying()) sHit2.play();
    }
    push();
    translate(x, y);
    scale(since < 12 ? 1.25 - 0.25 * (since / 12) : 1);
    mpDrawTitleCard(t, lone, sd);
    pop();
    if (since < 10) {
      push();
      noStroke();
      fill(255, 255, 255, 200 * (1 - since / 10));
      rectMode(CENTER);
      rect(x, y, 360, 280, 18);
      pop();
    }
    // Each queen that comes back appears under her card
    if (lone && t && t.holder !== sd.survivor && since > 20) {
      const p = mp.players[t.holder];
      push();
      translate(x, y + 185);
      imageMode(CENTER);
      tint(220, 160, 255, 255 * Math.min(1, (since - 20) / 20));
      image(mpAntImage(), 0, 0, 80, 80);
      noTint();
      noFill();
      stroke(p.color[0], p.color[1], p.color[2]);
      strokeWeight(3);
      ellipse(0, 6, 92, 58);
      pop();
    }
  }
  // Sparks and bursts
  push();
  noStroke();
  for (let k = sd.burst.length - 1; k >= 0; k--) {
    const b = sd.burst[k];
    b.x += b.vx; b.y += b.vy; b.vx *= 0.96; b.vy = b.vy * 0.96 + 0.08; b.life--;
    if (b.life <= 0) { sd.burst.splice(k, 1); continue; }
    fill(b.rgb[0], b.rgb[1], b.rgb[2], 255 * Math.min(1, b.life / 20));
    ellipse(b.x, b.y, b.s);
  }
  pop();
  if (allDone) {
    mpContinueHint(lone ? 'Face them' : sd.kind === 'roundLimit' ? 'See who won' : 'To the tournament');
    if (inp.confirm || inp.click) mpAfterBonus();
  } else if (f > 10) {
    push();
    textAlign(CENTER, CENTER);
    textSize(15);
    fill(200, 200, 200, 150);
    text('A, Enter or click to skip ahead', W / 2, H - 24);
    pop();
  }
}

function mpDrawFaceDownCard(u) {
  push();
  rectMode(CENTER);
  stroke(255, 215, 110, 120 + 135 * u);
  strokeWeight(3 + 3 * u);
  fill(40 + 30 * u, 20, 60 + 30 * u);
  rect(0, 0, 330, 250, 16);
  noStroke();
  fill(255, 215, 110, 40 + 60 * u);
  for (let k = 0; k < 6; k++) ellipse(-125 + k * 50, -100, 10);
  for (let k = 0; k < 6; k++) ellipse(-125 + k * 50, 100, 10);
  textAlign(CENTER, CENTER);
  textSize(110);
  fill(255, 215, 110, 160 + 95 * u);
  text('?', 0, 4);
  pop();
}

// A face-up bonus card: the title, what it's for, who got it, how much, and what it does for them
function mpDrawTitleCard(t, lone, sd) {
  push();
  rectMode(CENTER);
  if (!t) {
    noFill();
    stroke(120, 120, 120, 200);
    strokeWeight(2);
    drawingContext.setLineDash([8, 8]);
    rect(0, 0, 330, 250, 16);
    drawingContext.setLineDash([]);
    noStroke();
    fill(140);
    textAlign(CENTER, CENTER);
    textSize(22);
    text('...nothing.', 0, -10);
    textSize(14);
    text('Nobody earned this one outright.', 0, 22);
    pop();
    return;
  }
  const p = mp.players[t.holder];
  fill(24, 12, 36, 240);
  stroke(p.color[0], p.color[1], p.color[2]);
  strokeWeight(5);
  rect(0, 0, 330, 250, 16);
  noStroke();
  rectMode(CORNER);
  textAlign(CENTER, TOP);
  fill(255, 215, 110);
  mpFitBox(t.def.name, 26, 300, 56);
  text(t.def.name, -150, -112, 300, 60);
  fill(200);
  mpFitBox(t.def.desc, 14, 300, 38);
  text(t.def.desc, -150, -52, 300, 40);
  textAlign(CENTER, CENTER);
  fill(p.color[0], p.color[1], p.color[2]);
  fitTextSize(p.name, 30, 300);
  stroke(0);
  strokeWeight(4);
  text(p.name, 0, 8);
  noStroke();
  fill(255);
  const amt = mpTitleAmount(t);
  fitTextSize(amt, 17, 300);
  text(amt, 0, 42);
  textAlign(CENTER, TOP);
  fill(255, 230, 150);
  const effect = lone ? (t.holder === sd.survivor ? 'The survivor\'s reward: every ladybug upgrade, and twice the aphids' : `${p.name}'s queen returns!`) : `+${MP_BONUS_ACHIEVEMENT_POINTS.toLocaleString()} points`;
  mpFitBox(effect, 15, 300, 40);
  text(effect, -150, 70, 300, 44);
  pop();
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

// Every round of the bracket, the ones still to come filled in with "?" cards (one winner per fight)
function mpBracketPlan(sd) {
  const plan = sd.rounds.map(r => r.fights.map(fi => ({ players: fi.players, winner: fi.winner })));
  let m = plan[plan.length - 1].length;
  while (m > 1) {
    const next = mpBracketFights(new Array(m).fill(-1)).map(ps => ({ players: ps, winner: undefined }));
    plan.push(next);
    m = next.length;
  }
  return plan;
}

// The queen tournament bracket: each queen on her own card, the first rounds split down the left and right
// sides, and every round closer to the final in the middle
function mpDrawBracket(inp) {
  const sd = mp.showdown;
  const W = getMenuWidth(), H = getMenuHeight();
  const f = sd.frames;
  const cur = sd.rounds[sd.rounds.length - 1];
  const next = cur.fights[sd.fightIndex];
  const curR = sd.rounds.length - 1;

  // The arena: deep purple with slow light rays from the middle
  push();
  noStroke();
  fill(22, 8, 36);
  rect(0, 0, W, H);
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2 + f * 0.003;
    fill(150, 80, 220, 12);
    triangle(W / 2, 360, W / 2 + Math.cos(a) * 1400, 360 + Math.sin(a) * 1400, W / 2 + Math.cos(a + 0.16) * 1400, 360 + Math.sin(a + 0.16) * 1400);
  }
  const glow = drawingContext.createRadialGradient(W / 2, 360, 10, W / 2, 360, 420);
  glow.addColorStop(0, 'rgba(255,220,140,0.16)');
  glow.addColorStop(1, 'rgba(255,220,140,0)');
  drawingContext.fillStyle = glow;
  drawingContext.fillRect(0, 0, W, H);
  pop();

  const roundsLeft = mpBracketPlan(sd).length - curR;
  const roundName = cur.fights.length === 1 ? 'The Final' : roundsLeft === 2 ? 'Semifinals' : `Round ${curR + 1}`;
  mpTitle('QUEEN TOURNAMENT', 40, 40);
  push();
  textAlign(CENTER, CENTER);
  textSize(20);
  fill(255, 215, 110);
  text(roundName + (cur.fights.length > 1 ? `  ·  fight ${Math.min(sd.fightIndex + 1, cur.fights.length)} of ${cur.fights.length}` : ''), W / 2, 76);
  pop();

  // Columns: the outer rounds on both sides, the final in the middle
  const plan = mpBracketPlan(sd);
  const sideCols = plan.length - 1;
  const top = 104, bottom = H - 56;
  const centerW = 250;
  const sideW = sideCols ? (W - 60 - centerW - 40) / (sideCols * 2) : 0;
  const colX = (r, side) => {
    if (r === plan.length - 1) return W / 2;
    return side < 0 ? 30 + sideW * (r + 0.5) : W - 30 - sideW * (r + 0.5);
  };
  // Where every card goes: { r, side, fight, pi, x, y, w, h }
  const groups = [];
  plan.forEach((fights, r) => {
    const final = r === plan.length - 1;
    const sides = final ? [[0, fights]] : [[-1, fights.slice(0, Math.ceil(fights.length / 2))], [1, fights.slice(Math.ceil(fights.length / 2))]];
    for (const [side, list] of sides) {
      if (!list.length) continue;
      const cards = list.reduce((a, fi) => a + fi.players.length, 0);
      const gapIn = 6, gapOut = final ? 40 : 26;
      const w = final ? centerW : Math.min(210, sideW - 18);
      const h = Math.min(final ? 104 : 80, (bottom - top - gapIn * (cards - list.length) - gapOut * (list.length - 1)) / cards);
      const total = cards * h + gapIn * (cards - list.length) + gapOut * (list.length - 1);
      let y = (top + bottom) / 2 - total / 2 + (final ? 20 : 0);
      list.forEach(fi => {
        const g = { r, side, fight: fi, cards: [], index: fights.indexOf(fi) };
        fi.players.forEach(pi => {
          g.cards.push({ pi, x: colX(r, side), y: y + h / 2, w, h });
          y += h + gapIn;
        });
        y += gapOut - gapIn;
        g.midY = (g.cards[0].y + g.cards[g.cards.length - 1].y) / 2;
        groups.push(g);
      });
    }
  });

  // Bracket lines: each fight joins toward the next column in
  push();
  stroke(255, 215, 110, 90);
  strokeWeight(2);
  noFill();
  for (const g of groups) {
    const c0 = g.cards[0];
    if (g.r === plan.length - 1) continue;
    const edge = c0.x - g.side * c0.w / 2;
    const innerR = g.r + 1;
    const innerX = innerR === plan.length - 1 ? W / 2 + g.side * centerW / 2 : colX(innerR, g.side) + g.side * Math.min(210, sideW - 18) / 2;
    const midX = (edge + innerX) / 2;
    // A bracket down the fight's cards, then across
    line(edge, g.cards[0].y, edge + (midX - edge) * 0.5, g.cards[0].y);
    line(edge, g.cards[g.cards.length - 1].y, edge + (midX - edge) * 0.5, g.cards[g.cards.length - 1].y);
    line(edge + (midX - edge) * 0.5, g.cards[0].y, edge + (midX - edge) * 0.5, g.cards[g.cards.length - 1].y);
    const inner = groups.filter(o => o.r === innerR && (o.side === g.side || o.side === 0));
    const toY = inner.length ? inner.reduce((a, o) => a + o.midY, 0) / inner.length : g.midY;
    line(edge + (midX - edge) * 0.5, g.midY, midX, g.midY);
    line(midX, g.midY, midX, toY);
    line(midX, toY, innerX, toY);
  }
  pop();

  // The cards slide in from their side of the screen (the final's drop in from above), outer rounds first
  for (const g of groups) {
    const isNext = g.r === curR && g.index === sd.fightIndex && !!next;
    g.cards.forEach((c, m) => {
      const delay = (g.side === 0 ? sideCols * 8 + 10 : g.r * 8) + m * 3;
      const u = constrain((f - delay) / 26, 0, 1);
      const e = 1 - Math.pow(1 - u, 3);
      const x = g.side === 0 ? c.x : lerp(g.side < 0 ? -c.w : W + c.w, c.x, e);
      const y = g.side === 0 ? lerp(-c.h, c.y, e) : c.y;
      mpDrawBracketCard(c.pi, x, y, c.w, c.h, g.fight, isNext, f, sd);
    });
    // VS between the cards of the next fight, slamming down once they're in
    if (isNext && g.cards.length >= 2) {
      const vsAt = (g.side === 0 ? sideCols * 8 + 10 : g.r * 8) + 34;
      if (f >= vsAt) {
        const v = f - vsAt;
        if (v === 0) mp.shake = Math.max(mp.shake, 7);
        const s = v < 10 ? 3 - 2 * (v / 10) : 1 + 0.05 * Math.sin(f * 0.15);
        for (let m = 0; m < g.cards.length - 1; m++) {
          push();
          translate(g.cards[m].x, (g.cards[m].y + g.cards[m + 1].y) / 2);
          scale(s);
          textAlign(CENTER, CENTER);
          textSize(g.side === 0 ? 34 : 22);
          stroke(0);
          strokeWeight(6);
          fill(255, 215, 110);
          text('VS', 0, 0);
          pop();
        }
      }
    }
    if (g.fight.winner === null) {
      push();
      textAlign(CENTER, CENTER);
      textSize(13);
      fill(255, 130, 130);
      text('draw: both go on', g.cards[0].x, g.cards[g.cards.length - 1].y + g.cards[0].h / 2 + 9);
      pop();
    }
  }
  // The crown over the final
  push();
  textAlign(CENTER, CENTER);
  textSize(40);
  fill(255, 215, 110, 200 + 55 * Math.sin(f * 0.08));
  const finalGroup = groups.find(g => g.side === 0);
  if (finalGroup) text('♛', W / 2, finalGroup.cards[0].y - finalGroup.cards[0].h / 2 - 28);
  pop();

  if (next && f > 50) {
    mpContinueHint('Fight');
    if (inp.confirm || inp.click) mpStartDuel(next.players);
  }
}

// One queen's card: her color, her queen, name, seed and strength. Winners shine gold, losers fade, unknowns are "?"
function mpDrawBracketCard(pi, x, y, w, h, fight, isNext, f, sd) {
  push();
  rectMode(CENTER);
  if (pi < 0) {
    noFill();
    stroke(255, 215, 110, 80);
    strokeWeight(2);
    drawingContext.setLineDash([7, 6]);
    rect(x, y, w, h, 10);
    drawingContext.setLineDash([]);
    noStroke();
    fill(255, 215, 110, 110);
    textAlign(CENTER, CENTER);
    textSize(Math.min(30, h * 0.5));
    text('?', x, y + 1);
    pop();
    return;
  }
  const p = mp.players[pi];
  const won = fight.winner !== undefined && fight.winner === pi;
  const lost = fight.winner !== undefined && fight.winner !== pi;
  const a = lost ? 0.45 : 1;
  fill(lost ? 30 : 46, lost ? 22 : 26, lost ? 40 : 70, 235);
  stroke(won ? color(255, 215, 110) : color(p.color[0], p.color[1], p.color[2], 255 * a));
  strokeWeight(won ? 4 : 3);
  if (isNext) {
    drawingContext.shadowBlur = 18 + 8 * Math.sin(f * 0.15);
    drawingContext.shadowColor = 'rgba(255,215,110,0.9)';
    stroke(255, 215, 110);
  }
  rect(x, y, w, h, 10);
  drawingContext.shadowBlur = 0;
  noStroke();
  // A strip of her color down the left, then her queen
  fill(p.color[0], p.color[1], p.color[2], 255 * a);
  rect(x - w / 2 + 5, y, 6, h - 14, 3);
  const img = Math.min(h - 8, 80);
  push();
  translate(x - w / 2 + 14 + img / 2, y + Math.sin((f + pi * 20) * 0.06) * (isNext ? 2 : 0));
  mpRotate(-Math.PI / 2); // Head up
  imageMode(CENTER);
  tint(220, 160, 255, 255 * a);
  image(mpAntImage(), 0, 0, img * 1.25, img * 1.25);
  noTint();
  pop();
  const tx = x - w / 2 + 18 + img;
  const tw = w - (tx - (x - w / 2)) - 10;
  textAlign(LEFT, CENTER);
  const dark = p.color[0] + p.color[1] + p.color[2] < 200;
  if (dark) { stroke(230, 230, 230, 255 * a); strokeWeight(3); }
  fill(p.color[0], p.color[1], p.color[2], 255 * a);
  const label = p.name + (won ? '  ♛' : '');
  fitTextSize(label, Math.min(24, h * 0.32), tw);
  text(label, tx, y - h * 0.16);
  noStroke();
  fill(220, 220, 220, 230 * a);
  const seed = sd.seeds.indexOf(pi) + 1;
  const info = `Seed ${seed}  ·  ${MP_QUEEN_HEALTH[p.queen.health]} hp  ·  ${MP_QUEEN_GUARD_COUNT[p.queen.guardCount]} guards`;
  fitTextSize(info, Math.min(14, h * 0.2), tw);
  text(info, tx, y + h * 0.2);
  if (lost) {
    stroke(255, 90, 90, 160);
    strokeWeight(3);
    line(x - w / 2 + 10, y, x + w / 2 - 10, y);
  }
  pop();
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
  mp.result.allTitles = mpEligibleTitles();
  mp.result.popups = mp.result.allTitles.slice().sort(() => Math.random() - 0.5);
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
      mpContinueHint('Leaderboards');
      if (inp.confirm || inp.click) { R.step = 'boards'; R.frames = 0; }
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
  // The titles pop up one at a time on either side, stay a few seconds, then fade away (they cycle round)
  const POP_EVERY = 110, POP_LIFE = 300;
  if (R.popups.length) {
    R.popupSpots = R.popupSpots || [];
    const newest = Math.floor(R.frames / POP_EVERY);
    for (let n = Math.max(0, newest - Math.ceil(POP_LIFE / POP_EVERY)); n <= newest; n++) {
      const age = R.frames - n * POP_EVERY;
      if (age < 0 || age >= POP_LIFE) continue;
      const t = R.popups[n % R.popups.length];
      const p = mp.players[t.holder];
      // Alternate sides, three rows per side, so live ones never overlap
      if (!R.popupSpots[n]) R.popupSpots[n] = { x: n % 2 ? 1115 : 165, y: 150 + (Math.floor(n / 2) % 3) * 140 };
      const sp = R.popupSpots[n];
      const fade = Math.min(1, age / 12, (POP_LIFE - age) / 30);
      push();
      translate(sp.x, sp.y);
      scale(0.85 + 0.15 * Math.min(1, age / 12));
      rectMode(CENTER);
      fill(20, 20, 30, 230 * fade);
      stroke(p.color[0], p.color[1], p.color[2], 255 * fade);
      strokeWeight(2);
      rect(0, 0, 250, 110, 10);
      noStroke();
      textAlign(CENTER, CENTER);
      fill(255, 215, 110, 255 * fade);
      fitTextSize(t.def.name, 16, 230);
      text(t.def.name, 0, -34);
      fill(190, 190, 190, 255 * fade);
      fitTextSize(t.def.desc, 11, 234);
      text(t.def.desc, 0, -13);
      fill(p.color[0], p.color[1], p.color[2], 255 * fade);
      fitTextSize(p.name, 18, 230);
      text(p.name, 0, 12);
      fill(255, 255, 255, 230 * fade);
      const amt = mpTitleAmount(t);
      fitTextSize(amt, 13, 230);
      text(amt, 0, 36);
      pop();
    }
  }
  const allBtn = { x: W / 2 - 330, y: H - 64, w: 300, h: 46 };
  const menuBtn = { x: W / 2 + 30, y: H - 64, w: 300, h: 46 };
  R.sel = R.sel || 0;
  if (inp.left || inp.right) R.sel = 1 - R.sel;
  if (mpMouseIn(allBtn) && mpMouseMoved()) R.sel = 0;
  if (mpMouseIn(menuBtn) && mpMouseMoved()) R.sel = 1;
  mpButton(allBtn, 'Titles', R.sel === 0, { color: [255, 215, 110], size: 18 });
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
  const W = getMenuWidth(), H = getMenuHeight();
  mpBackground();
  mpTitle('Titles', 40, 40);
  const defs = mpTitleDefs();
  const rowH = 44, perPage = 11;
  const maxScroll = Math.max(0, defs.length - perPage);
  // Scrolling: up / down (W / S, arrows, stick), the mouse wheel, or the arrow buttons
  const upBtn = { x: W - 66, y: 80, w: 44, h: 44 };
  const downBtn = { x: W - 66, y: 80 + perPage * rowH - 48, w: 44, h: 44 };
  const backBtn = { x: W / 2 - 120, y: H - 60, w: 240, h: 44 };
  let step = (inp.down ? 1 : 0) - (inp.up ? 1 : 0) + (inp.wheel || 0);
  if (inp.click && mpMouseIn(upBtn)) step--;
  if (inp.click && mpMouseIn(downBtn)) step++;
  R.allScroll = constrain(R.allScroll + step, 0, maxScroll);
  defs.slice(R.allScroll, R.allScroll + perPage).forEach((def, k) => {
    const t = mpEvaluateTitle(def);
    const y = 80 + k * rowH;
    push();
    noStroke();
    fill(255, 255, 255, k % 2 ? 8 : 16);
    rect(60, y, W - 140, rowH - 4, 6);
    textAlign(LEFT, CENTER);
    fill(255, 215, 110);
    fitTextSize(def.name, 17, 470);
    text(def.name, 76, y + 13);
    fill(170);
    fitTextSize(def.desc, 13, 520);
    text(def.desc, 76, y + 31);
    textAlign(RIGHT, CENTER);
    if (t) {
      const p = mp.players[t.holder];
      fill(p.color[0], p.color[1], p.color[2]);
      fitTextSize(p.name, 17, 380);
      text(p.name, W - 96, y + 13);
      fill(220);
      const amt = mpTitleAmount(t);
      fitTextSize(amt, 13, 380);
      text(amt, W - 96, y + 31);
    } else {
      fill(110);
      textSize(14);
      text('nobody (tied, or it never happened)', W - 96, y + 20);
    }
    pop();
  });
  // Scroll arrows and a bar showing where in the list this is
  push();
  noStroke();
  fill(255, 255, 255, 25);
  rect(W - 50, upBtn.y + upBtn.h + 6, 12, downBtn.y - upBtn.y - upBtn.h - 12, 6);
  const trackY = upBtn.y + upBtn.h + 6, trackH = downBtn.y - upBtn.y - upBtn.h - 12;
  const thumbH = trackH * Math.min(1, perPage / defs.length);
  fill(255, 215, 110, 180);
  rect(W - 50, trackY + (trackH - thumbH) * (maxScroll ? R.allScroll / maxScroll : 0), 12, thumbH, 6);
  pop();
  mpButton(upBtn, '▲', mpMouseIn(upBtn), { color: [255, 215, 110], size: 18, disabled: R.allScroll === 0 });
  mpButton(downBtn, '▼', mpMouseIn(downBtn), { color: [255, 215, 110], size: 18, disabled: R.allScroll >= maxScroll });
  push();
  textAlign(LEFT, CENTER);
  textSize(14);
  fill(160);
  text(`${R.allScroll + 1}-${Math.min(defs.length, R.allScroll + perPage)} of ${defs.length}  ·  scroll: up / down, W / S or the mouse wheel`, 60, H - 38);
  pop();
  mpButton(backBtn, 'Back  (Enter / Esc / B)', true, { color: [255, 215, 110], size: 17 });
  if (inp.confirm || inp.back || (inp.click && mpMouseIn(backBtn))) R.showAll = false;
}
