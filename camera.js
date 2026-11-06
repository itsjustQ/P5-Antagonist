// ========== ADAPTIVE CAMERA (WORLD 3) ==========
// World 3 (rounds 8+) is a bigger arena than fits on screen, so the camera follows the beetle, always keeps the closest
// ant in view, and briefly frames whatever else the player needs to see. Worlds 1 and 2 and the final nest keep their
// fixed view during play: beginGameplayScaling() only uses this camera when isCameraDriven() says so. Round opening scenes
// use it on every level (see Opening shots). The under-brush at the world's edge (bottom of this file) is drawn on every level.
//
// Everything here is in world units and seconds, except the indicators and the debug overlay, which are drawn in window
// pixels. It only reads gameplay state: it never changes what the ants or the beetle do.
//
// Comfort comes first (people get motion sick from a swaying camera). The beetle is tracked almost rigidly, so the world
// only moves when the player moves it. Anything else (framing, look-ahead) drifts slowly on top of that, and zoom only
// changes for real changes in what needs framing.

const CAMERA_CONFIG = {
  enabled: true,
  firstLevel: 8,                 // Where world 3 starts (see getGameplayReferenceWidth)
  worldScaleByTier: { easy: 1, medium: 1.17, hard: 1.33, insane: 1.5 }, // World 3 grows with the difficulty, x the 1280x652 arena

  // --- Zoom range ---
  restViewHeight: 435,           // The view at rest, and the tightest it gets: world 1's height, so the beetle looks the same size
  maxZoomOutMultiplier: 2,       // Max zoom-out for focus points and big attacks, x the rest view. (The closest ant can go past this.)

  // --- Follow ---
  deadZone: 3,                   // The beetle can wander this far before the camera moves
  followSmoothing: 11,           // Per second. High on purpose: the camera stays locked to the beetle, it doesn't float behind it.
  offsetSmoothing: 1.1,          // Per second. How gently the view drifts off the beetle to frame things, and back.
  lookAhead: {
    moveWeight: 1,               // Blend of movement direction...
    faceWeight: 0,               // ...and facing direction (facing can flip instantly with the mouse, which swings the view)
    strength: 16,                // World units at full blend
    maxOffset: 18,               // Hard limit on the look-ahead
    fullSpeed: 240,              // Units/second that counts as full movement
    minSpeed: 30,                // Slower than this counts as standing still
    smoothing: 1                 // Per second
  },

  // --- Zoom (per second, in log space) ---
  zoomOutSmoothing: 1.6,
  zoomInSmoothing: 0.45,
  zoomOutIgnoreChange: 0.04,     // Wanting to zoom out by less than this fraction is ignored...
  zoomInIgnoreChange: 0.12,      // ...and so is wanting to zoom in by less than this
  zoomInDelay: 1.5,              // Seconds it has to keep wanting to zoom in first, so the view doesn't breathe in and out

  // --- The closest ant is always in view, however far away it is ---
  closestAnt: {
    enabled: true,
    padding: 90,                 // World units kept between it and the edge of the screen
    offScreenZoomSmoothing: 3.5, // Zoom-out speed while it's actually off screen...
    offScreenDriftSmoothing: 3   // ...and how quickly the view leans toward it
  },

  // --- Framing focus points ---
  focus: {
    maxActivePoints: 4,          // Includes the beetle, which is always one
    fadeIn: 0.3,                 // Seconds
    fadeOut: 0.8,
    padding: 70,                 // World units kept around the framed points
    beetleSafeArea: 0.15,        // Framing leans on zoom: it moves the beetle at most this fraction of the way from center to edge
    beetleHardLimit: 0.72        // However fast the beetle goes, it never gets past this fraction
  },

  // Weight is how much of the way toward the source the framing reaches (1 = all the way). Duration is in seconds.
  events: {
    damage:     { weight: 0.9,  duration: 1.75 },  // An enemy damages the beetle
    bossWindup: { weight: 1,    leadFrames: 45, tail: 0.6 },  // Boss ability: the last frames of her timer, plus a tail
    bossFirst:  { weight: 1,    duration: 2 },     // The first thing a queen does (her arrival alone doesn't move the camera)
    shot:       { weight: 0.5,  duration: 1, perAntCooldown: 3 },  // A revealed enemy fires
    elite:      { weight: 0.9,  duration: 2 }      // An ant turns rainbow
  },

  // --- Reveal rule (for focus points only: the closest ant is always framed, revealed or not) ---
  revealTimeout: 10,             // Seconds without a hit before a revealed shooter goes back to unrevealed

  // --- Big attacks: widen the view while the attack is active. Never permanent. ---
  bigAttacks: {
    padding: 50,                 // Room kept around the attack's radius
    shockwaveMinRadius: 200      // Shockwaves this wide count as big (a Flight and Slam landing always does)
  },

  // --- Edge indicators ---
  indicators: {
    enabled: true,
    inset: 26,                   // Pixels from the window's edge
    size: 15,                    // Pixels
    maxAlpha: 165,               // Subtle on purpose
    fadeSpeed: 5,                // Per second
    sectors: 20,                 // Only the most urgent indicator shows per slice of the screen edge
    incomingDuration: 0.7,       // Seconds a warning about an incoming off-screen attack stays up
    incomingCooldown: 1.2,       // Seconds between warnings for the same ant
    screenMargin: 24,            // Pixels past the window's edge that still count as on screen
    shooterColor: [255, 225, 190],
    incomingColor: [255, 95, 70]
  },

  // --- Opening scenes: down on the ground with the beetle, widening only as far as the action needs ---
  intro: {
    closeView: 320,              // View height with nothing else to frame: the beetle fills about 40% of the screen
    pushIn: 1.12,                // Starts this much wider than closeView and slowly pushes in
    widestView: 640,             // Never pulls out further than this, whatever's going on
    arenaOverscan: 60,           // World units past the arena's edge the view can show
    followSmoothing: 8,          // Per second. Stays with the beetle...
    maxFollowSpeed: 0.045,       // ...but no faster than this, x the view's height per frame: a dash can briefly outrun the shot
    offsetSmoothing: 1.5,        // ...and drifts slowly to frame whatever else is happening
    zoomSmoothing: 1.1,          // Per second, in log space
    pointSmoothing: 2.5,         // Per second: how gently a point of interest joins or leaves the shot
    beetleWait: 90,              // Frames the shot holds on the beetle's entrance before framing anything else
    maxPoints: 3,                // Points of interest framed along with the beetle
    padding: 85,                 // World units kept around them
    emoteLead: 30,               // Frames before an ant reacts that the shot starts turning toward it
    beetleReach: 0.6,            // The beetle stays within this fraction of the way from the center to the edge
    returnFrames: 70,            // Frames at the end spent easing into the round's own view
    letterbox: 0.085,            // Bars, x the window's height
    vignette: 0.55               // Darkness at the corners of the screen
  },

  // --- Shake: amounts were tuned for this view height, so they look the same size on screen at any zoom ---
  shakeReferenceView: 652,

  // --- Round end: ease out to the whole arena while the ants run off ---
  outro: { positionSmoothing: 1.2, zoomSmoothing: 1 },

  // --- World edge, on every level. Drawn from sprites made once, because live vector bushes were slow to rasterize. ---
  underbrush: {
    forest: { base: [24, 42, 26], shadow: [15, 28, 19], leaf: [38, 64, 36], canopy: [29, 49, 30] },
    nest:   { base: [14, 7, 18],  shadow: [8, 3, 11],   leaf: [30, 15, 38], canopy: [19, 10, 24] },
    spritePixels: 128,           // Each bush sprite's size
    variants: 6,                 // Different bush sprites
    canopyCell: 150,             // World units between the plain shapes beyond the edge (past canopyDepth it's just flat color)
    canopyDepth: 320,
    fringeSpacing: 30            // World units between the bushes along the edge
  },

  debug: {
    toggleKeyCode: 120,          // F9
    fixedDt: 0                   // Seconds per update instead of real time (headless testing); 0 = off
  }
};

const gameCam = {
  x: 0,
  y: 0,
  logView: Math.log(435),        // Log of the view's height: zoom is smoothed in log space
  logTarget: Math.log(435),
  zoomInWait: 0,                 // Seconds it's been wanting to zoom in
  followX: 0,                    // The beetle, tracked closely...
  followY: 0,
  offsetX: 0,                    // ...plus a slow drift for framing
  offsetY: 0,
  snapPending: true,
  mode: 'play',                  // 'play', 'scene' or 'outro'
  time: 0,                       // Seconds of updated camera time
  anchorX: 0,                    // Follow point, after the dead zone
  anchorY: 0,
  lookX: 0,
  lookY: 0,
  prevPlayerX: 0,
  prevPlayerY: 0,
  shakeX: 0,
  shakeY: 0,
  focus: [],                     // Temporary focus points
  revealedUntil: [],             // By ant index: camera time its reveal runs out (0 / missing = unrevealed)
  antDiedSinceShot: [],          // By ant index: it died, and the new ant hasn't fired yet
  queenRevealedUntil: 0,
  queenActedFor: null,           // The queen whose first action has been framed
  nextShotFocus: [],             // By ant index
  nextIncoming: [],              // By ant index
  incoming: [],                  // Warnings about off-screen shots: { key, x, y, until }
  indicators: {},
  scene: null,                   // The opening shot's state, while a scene plays
  stretch: 0,                    // Levels with a fixed view: how far into that view's stretch-to-window a scene has eased
  debugOn: false,
  debugKeyHeld: false,
  debugBox: null
};

function isAdaptiveCameraWorld() {
  return CAMERA_CONFIG.enabled && level >= CAMERA_CONFIG.firstLevel && !isFinalLevel() && !isTutorialRun();
}

// World 3's size for the current difficulty. The nest isn't world 3 (see getGameplayReferenceWidth).
function getWorld3Scale() {
  return CAMERA_CONFIG.worldScaleByTier[getDifficultyTier()];
}

// Whether the gameplay space is drawn through this camera right now: world 3, or any level's opening scene
function isCameraDriven() {
  return isAdaptiveCameraWorld() || !!roundScene;
}

function getCameraMinView() {
  return CAMERA_CONFIG.restViewHeight;
}

function getCameraMaxView() {
  return getCameraMinView() * CAMERA_CONFIG.maxZoomOutMultiplier;
}

function getCameraAspect() {
  return windowWidth / Math.max(1, windowHeight);
}

// View height that shows the whole arena plus a little of what's around it. Live play only gets this far for the closest ant.
function getCameraWholeWorldView() {
  const pad = CAMERA_CONFIG.closestAnt.padding;
  return Math.max(getGameplayHeight() + pad * 2, (getGameplayWidth() + pad * 2) / getCameraAspect());
}

function getCameraViewHeight() {
  return Math.exp(gameCam.logView);
}

function getCameraScale() {
  return windowHeight / getCameraViewHeight();
}

// Same as getCameraScale, except while an opening scene eases into a fixed view, whose width and height stretch separately
function getCameraScaleX() {
  return gameCam.stretch > 0 ? lerp(getCameraScale(), windowWidth / getGameplayWidth(), gameCam.stretch) : getCameraScale();
}

function getCameraScaleY() {
  return gameCam.stretch > 0 ? lerp(getCameraScale(), windowHeight / getGameplayHeight(), gameCam.stretch) : getCameraScale();
}

function cameraWorldToScreenX(x) {
  return (x - gameCam.x) * getCameraScaleX() + windowWidth / 2;
}

function cameraWorldToScreenY(y) {
  return (y - gameCam.y) * getCameraScaleY() + windowHeight / 2;
}

function cameraScreenToWorldX(x) {
  return (x - windowWidth / 2) / getCameraScaleX() + gameCam.x;
}

function cameraScreenToWorldY(y) {
  return (y - windowHeight / 2) / getCameraScaleY() + gameCam.y;
}

function isOnCameraScreen(x, y, marginPx = 0) {
  const sx = cameraWorldToScreenX(x);
  const sy = cameraWorldToScreenY(y);
  return sx >= -marginPx && sx <= windowWidth + marginPx && sy >= -marginPx && sy <= windowHeight + marginPx;
}

// Called by beginGameplayScaling in place of the stretch-to-window scale
function applyAdaptiveCameraTransform() {
  translate(windowWidth / 2, windowHeight / 2);
  scale(getCameraScaleX(), getCameraScaleY());
  translate(-gameCam.x + gameCam.shakeX, -gameCam.y + gameCam.shakeY);
}

function getCameraDt() {
  if (CAMERA_CONFIG.debug.fixedDt > 0) return CAMERA_CONFIG.debug.fixedDt;
  // Capped, so a long frame (or the first one after a pause) can't make the camera jump
  return constrain(deltaTime / 1000, 1 / 240, 1 / 20);
}

// Frame-rate independent smoothing: how far to move this update at this many per second
function cameraEase(rate, dt) {
  return 1 - Math.exp(-rate * dt);
}

// One shake offset per frame, so the ground and everything on it shake together
function updateCameraShake() {
  const shake = getScreenShake();
  const f = getCameraViewHeight() / CAMERA_CONFIG.shakeReferenceView;
  gameCam.shakeX = shake.x * f;
  gameCam.shakeY = shake.y * f;
}

function updateCameraDebugKey() {
  const held = keyIsDown(CAMERA_CONFIG.debug.toggleKeyCode);
  if (held && !gameCam.debugKeyHeld) gameCam.debugOn = !gameCam.debugOn;
  gameCam.debugKeyHeld = held;
}

function requestCameraSnap() {
  gameCam.snapPending = true;
}

function snapCameraToBeetle() {
  gameCam.snapPending = false;
  gameCam.anchorX = playerX;
  gameCam.anchorY = playerY;
  gameCam.followX = playerX;
  gameCam.followY = playerY;
  gameCam.lookX = 0;
  gameCam.lookY = 0;
  gameCam.prevPlayerX = playerX;
  gameCam.prevPlayerY = playerY;
  gameCam.focus = [];
  gameCam.revealedUntil = [];
  gameCam.antDiedSinceShot = [];
  gameCam.queenRevealedUntil = 0;
  gameCam.queenActedFor = null;
  gameCam.nextShotFocus = [];
  gameCam.nextIncoming = [];
  gameCam.incoming = [];
  gameCam.indicators = {};
  gameCam.zoomInWait = 0;
  // Already framing the closest ant, so there's no zoom-out right after the countdown
  const framing = getCameraFraming();
  gameCam.logView = Math.log(framing.view);
  gameCam.logTarget = gameCam.logView;
  gameCam.offsetX = framing.x - playerX;
  gameCam.offsetY = framing.y - playerY;
  gameCam.x = framing.x;
  gameCam.y = framing.y;
}

// ---------- Sources ----------
// A source is an ant index, or 'queen'. Null position = it's gone (dead ants are parked far outside the arena).

function getCameraSourcePos(src) {
  if (src === 'queen') return queen ? { x: queen.x, y: queen.y } : null;
  if (!(src >= 1) || src > enemyCount || antDormant[src] || antX[src] === PARKED_ANT_POS) return null;
  return { x: antX[src], y: antY[src] };
}

// Fused mines have an array of owners
function normalizeCameraOwner(owner) {
  const i = Array.isArray(owner) ? owner[0] : owner;
  return i >= 1 ? i : null;
}

function isCameraRevealed(src) {
  if (src === 'queen') return gameCam.time < gameCam.queenRevealedUntil;
  return gameCam.time < (gameCam.revealedUntil[src] || 0);
}

function revealCameraSource(src) {
  const until = gameCam.time + CAMERA_CONFIG.revealTimeout;
  if (src === 'queen') gameCam.queenRevealedUntil = until;
  else gameCam.revealedUntil[src] = until;
}

// ---------- Focus points ----------

function getCameraFocusAlpha(f) {
  const c = CAMERA_CONFIG.focus;
  return Math.max(0, Math.min(1, f.age / c.fadeIn, (f.duration - f.age) / c.fadeOut));
}

function addCameraFocus(src, weight, duration) {
  const pos = getCameraSourcePos(src);
  if (!pos) return;
  const existing = gameCam.focus.find(f => f.src === src);
  if (existing) {
    // A new event from the same source extends it, without fading it back in
    existing.weight = Math.max(existing.weight, weight);
    existing.duration = Math.max(existing.duration, existing.age + duration);
    return;
  }
  // The beetle takes one of the slots. When full, the new point has to outrank the weakest one.
  if (gameCam.focus.length >= CAMERA_CONFIG.focus.maxActivePoints - 1) {
    let weakest = null;
    for (const f of gameCam.focus) {
      if (!weakest || f.weight * getCameraFocusAlpha(f) < weakest.weight * getCameraFocusAlpha(weakest)) weakest = f;
    }
    if (!weakest || weakest.weight * getCameraFocusAlpha(weakest) >= weight) return;
    gameCam.focus.splice(gameCam.focus.indexOf(weakest), 1);
  }
  gameCam.focus.push({ src: src, x: pos.x, y: pos.y, weight: weight, duration: duration, age: 0 });
}

function updateCameraFocus(dt) {
  for (let k = gameCam.focus.length - 1; k >= 0; k--) {
    const f = gameCam.focus[k];
    f.age += dt;
    const pos = getCameraSourcePos(f.src);
    if (pos) {
      f.x = pos.x;
      f.y = pos.y;
    } else if (f.duration - f.age > CAMERA_CONFIG.focus.fadeOut) {
      f.duration = f.age + CAMERA_CONFIG.focus.fadeOut; // Gone: stay where it was and fade out
    }
    if (f.age >= f.duration) gameCam.focus.splice(k, 1);
  }
}

// ---------- Events from the game ----------

function isCameraListening() {
  return isAdaptiveCameraWorld() && !end && gameCam.mode === 'play';
}

// An enemy damaged the beetle. This is what reveals a shooter.
function cameraOnEnemyDamagedPlayer(owner) {
  if (!isCameraListening()) return;
  const i = normalizeCameraOwner(owner);
  const src = i !== null ? i : (queen ? 'queen' : null);
  if (src === null) return;
  if (i !== null && gameCam.antDiedSinceShot[i]) return; // A leftover attack from the ant that died, not this one
  revealCameraSource(src);
  const e = CAMERA_CONFIG.events.damage;
  addCameraFocus(src, e.weight, e.duration);
}

function cameraOnQueenDamagedPlayer() {
  cameraOnEnemyDamagedPlayer(null);
}

function addCameraIncoming(src, x, y) {
  const c = CAMERA_CONFIG.indicators;
  if (isOnCameraScreen(x, y, c.screenMargin)) return;
  if (gameCam.time < (gameCam.nextIncoming[src] || 0)) return;
  gameCam.nextIncoming[src] = gameCam.time + c.incomingCooldown;
  gameCam.incoming.push({ src: src, x: x, y: y, until: gameCam.time + c.incomingDuration });
}

// An ant fired from (x, y). Off screen it warns even if it's unrevealed, but only a revealed one moves the camera.
function cameraOnAntFired(owner, x, y) {
  if (!isCameraListening()) return;
  const i = normalizeCameraOwner(owner);
  if (i === null) return;
  // Shots from anywhere else (a dead ant's refire or turret) still warn, but from where they are: not from this ant
  const fromAnt = x === antX[i] && y === antY[i];
  if (fromAnt) gameCam.antDiedSinceShot[i] = false;
  addCameraIncoming(fromAnt ? i : 'leftover', x, y);
  if (gameCam.antDiedSinceShot[i]) return;
  if (!isCameraRevealed(i) || gameCam.time < (gameCam.nextShotFocus[i] || 0)) return;
  const e = CAMERA_CONFIG.events.shot;
  gameCam.nextShotFocus[i] = gameCam.time + e.perAntCooldown;
  addCameraFocus(i, e.weight, e.duration);
}

function cameraOnQueenFired(x, y) {
  if (isCameraListening()) addCameraIncoming('queen', x, y);
}

// An ant turned rainbow
function cameraOnEliteAnt(i) {
  if (!isCameraListening()) return;
  const e = CAMERA_CONFIG.events.elite;
  addCameraFocus(i, e.weight, e.duration);
}

// The queen acted. Her arrival doesn't move the camera; this is the first thing that does.
function cameraOnQueenAction(duration) {
  if (!isCameraListening() || !queen) return;
  revealCameraSource('queen');
  const events = CAMERA_CONFIG.events;
  if (gameCam.queenActedFor !== queen) {
    gameCam.queenActedFor = queen;
    addCameraFocus('queen', events.bossFirst.weight, events.bossFirst.duration);
  }
  addCameraFocus('queen', events.bossWindup.weight, duration === undefined ? events.bossWindup.tail : duration);
}

// Her ability timer is about to fill: treat its last frames as a windup. Her abilities fire the moment it's full, so
// this reads ahead rather than changing when she attacks.
function cameraOnQueenCharging(framesLeft) {
  const e = CAMERA_CONFIG.events.bossWindup;
  if (framesLeft > e.leadFrames) return;
  cameraOnQueenAction(framesLeft / 60 + e.tail);
}

// An ant died: whatever comes back under this index is a new, unrevealed ant. Its old bullets, mines and pools are
// still out there and still count as its index, so they can't reveal the new ant until it fires a shot of its own.
function cameraOnAntDespawn(i) {
  gameCam.revealedUntil[i] = 0;
  gameCam.nextShotFocus[i] = 0;
  gameCam.nextIncoming[i] = 0;
  gameCam.antDiedSinceShot[i] = true;
  gameCam.incoming = gameCam.incoming.filter(w => w.src !== i);
  // A focus point on it stays where the ant was and fades out, instead of following the new one across the map
  for (const f of gameCam.focus) {
    if (f.src === i) f.src = null;
  }
}

// ---------- Live framing ----------

function updateCameraLookAhead(dt) {
  const c = CAMERA_CONFIG.lookAhead;
  let targetX = 0;
  let targetY = 0;
  const vx = (playerX - gameCam.prevPlayerX) / dt;
  const vy = (playerY - gameCam.prevPlayerY) / dt;
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed > c.minSpeed) {
    const amount = Math.min(1, speed / c.fullSpeed) * c.moveWeight;
    targetX += vx / speed * amount;
    targetY += vy / speed * amount;
  }
  if (c.faceWeight > 0) {
    const facing = ((isAiming && freeAimEnabled) ? aimAngle : playerRotationValue) * Math.PI / 180;
    targetX += Math.cos(facing) * c.faceWeight;
    targetY += Math.sin(facing) * c.faceWeight;
  }
  targetX *= c.strength;
  targetY *= c.strength;
  const ease = cameraEase(c.smoothing, dt);
  gameCam.lookX += (targetX - gameCam.lookX) * ease;
  gameCam.lookY += (targetY - gameCam.lookY) * ease;
  const d = Math.sqrt(gameCam.lookX * gameCam.lookX + gameCam.lookY * gameCam.lookY);
  if (d > c.maxOffset) {
    gameCam.lookX *= c.maxOffset / d;
    gameCam.lookY *= c.maxOffset / d;
  }
  gameCam.prevPlayerX = playerX;
  gameCam.prevPlayerY = playerY;
}

function updateCameraFollow(dt) {
  const dx = playerX - gameCam.anchorX;
  const dy = playerY - gameCam.anchorY;
  const d = Math.sqrt(dx * dx + dy * dy);
  const dead = CAMERA_CONFIG.deadZone;
  if (d > dead) {
    gameCam.anchorX += dx * (1 - dead / d);
    gameCam.anchorY += dy * (1 - dead / d);
  }
  const ease = cameraEase(CAMERA_CONFIG.followSmoothing, dt);
  gameCam.followX += (gameCam.anchorX - gameCam.followX) * ease;
  gameCam.followY += (gameCam.anchorY - gameCam.followY) * ease;
}

// The living ant closest to the beetle. The queen and her guards aren't in this list: she only gets framed when she acts.
function getCameraClosestAnt() {
  if (!CAMERA_CONFIG.closestAnt.enabled) return null;
  let best = null;
  let bestD = Infinity;
  for (let i = 1; i <= enemyCount; i++) {
    if (antDormant[i] || antX[i] === PARKED_ANT_POS) continue;
    const dx = antX[i] - playerX;
    const dy = antY[i] - playerY;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best === null ? null : { i: best, x: antX[best], y: antY[best] };
}

// How tall a view has to be for a big attack that's going on right now
function getCameraBigAttackView() {
  const c = CAMERA_CONFIG.bigAttacks;
  let radius = 0;
  if (isPlayerFlying()) radius = getShockwaveRadius() * SLAM_MULTIPLIER; // Up there, it's about to land
  if (windAttackActive || windAttackAlpha > 0) {
    const r = getShockwaveRadius() * windAttackRadiusScale;
    if (r >= c.shockwaveMinRadius) radius = Math.max(radius, r);
  }
  return radius > 0 ? (radius + c.padding) * 2 : 0;
}

// Frame the weighted, padded box of the beetle and the focus points, mostly by zooming: the beetle stays near the
// middle, and points that still don't fit are left for the edge indicators. The closest ant isn't in that box, since it
// would keep tugging the view around. Instead the zoom always leaves room for it, past the usual limit if it has to, and
// the view only leans toward it as far as it needs to.
function getCameraFraming() {
  const c = CAMERA_CONFIG.focus;
  const aspect = getCameraAspect();
  const safe = c.beetleSafeArea;
  const pad = c.padding;
  const lookX = playerX + gameCam.lookX;
  const lookY = playerY + gameCam.lookY;
  let minX = lookX;
  let maxX = lookX;
  let minY = lookY;
  let maxY = lookY;
  let reachX = 0;
  let reachY = 0;
  for (const f of gameCam.focus) {
    const w = Math.min(1, f.weight * getCameraFocusAlpha(f));
    const px = playerX + (f.x - playerX) * w;
    const py = playerY + (f.y - playerY) * w;
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
    reachX = Math.max(reachX, Math.abs(px - playerX));
    reachY = Math.max(reachY, Math.abs(py - playerY));
  }
  // Tall enough for the box itself, and for each point given the beetle can only sit so far off center
  let view = getCameraMinView();
  if (gameCam.focus.length > 0) {
    view = Math.max(view, (maxY - minY) + pad * 2, ((maxX - minX) + pad * 2) / aspect,
      (reachY + pad) * 2 / (1 + safe), (reachX + pad) * 2 / ((1 + safe) * aspect));
  }
  view = Math.max(view, getCameraBigAttackView());
  view = Math.min(view, getCameraMaxView());

  const closest = getCameraClosestAnt();
  const antPad = CAMERA_CONFIG.closestAnt.padding;
  if (closest) {
    const needed = Math.max((Math.abs(closest.y - playerY) + antPad) * 2 / (1 + safe),
      (Math.abs(closest.x - playerX) + antPad) * 2 / ((1 + safe) * aspect));
    view = Math.max(view, Math.min(needed, getCameraWholeWorldView()));
  }

  const limitY = safe * view / 2;
  const limitX = limitY * aspect;
  let x = constrain((minX + maxX) / 2, playerX - limitX, playerX + limitX);
  let y = constrain((minY + maxY) / 2, playerY - limitY, playerY + limitY);
  if (closest) {
    // Lean only as far as it takes to fit it, and never so far that the beetle's the one left out
    const roomY = Math.max(0, view / 2 - antPad);
    const roomX = Math.max(0, view * aspect / 2 - antPad);
    x = constrain(x, closest.x - roomX, closest.x + roomX);
    y = constrain(y, closest.y - roomY, closest.y + roomY);
    x = constrain(x, playerX - roomX, playerX + roomX);
    y = constrain(y, playerY - roomY, playerY + roomY);
  }
  return { view: view, x: x, y: y, box: { minX: minX, maxX: maxX, minY: minY, maxY: maxY }, closest: closest };
}

// Zooming out goes ahead right away. Zooming in has to keep being wanted for a while, so the view doesn't breathe.
function setCameraZoomTarget(view, dt) {
  const c = CAMERA_CONFIG;
  const target = Math.log(view);
  if (target >= gameCam.logTarget) {
    gameCam.zoomInWait = 0;
    if (target - gameCam.logTarget > Math.log(1 + c.zoomOutIgnoreChange)) gameCam.logTarget = target;
    return;
  }
  gameCam.zoomInWait += dt;
  const worthIt = gameCam.logTarget - target > Math.log(1 + c.zoomInIgnoreChange) || view <= getCameraMinView();
  if (worthIt && gameCam.zoomInWait >= c.zoomInDelay) gameCam.logTarget = target;
}

function stepCameraZoom(dt, closest) {
  const c = CAMERA_CONFIG;
  let rate = c.zoomInSmoothing;
  if (gameCam.logTarget > gameCam.logView) {
    const antOffScreen = closest && !isOnCameraScreen(closest.x, closest.y);
    rate = antOffScreen ? c.closestAnt.offScreenZoomSmoothing : c.zoomOutSmoothing;
  }
  gameCam.logView += (gameCam.logTarget - gameCam.logView) * cameraEase(rate, dt);
}

function updateAdaptiveCamera() {
  if (!isAdaptiveCameraWorld()) {
    gameCam.snapPending = true;
    gameCam.mode = 'play';
    return;
  }
  updateCameraDebugKey();
  gameCam.mode = 'play';
  gameCam.stretch = 0;
  if (gameCam.snapPending) snapCameraToBeetle();
  // The round's over or the beetle's dead: hold still behind whatever screen comes up
  if (end) {
    updateCameraShake();
    return;
  }
  const dt = getCameraDt();
  gameCam.time += dt;

  updateCameraLookAhead(dt);
  updateCameraFollow(dt);
  updateCameraFocus(dt);

  const framing = getCameraFraming();
  gameCam.debugBox = framing;
  setCameraZoomTarget(framing.view, dt);
  stepCameraZoom(dt, framing.closest);

  // The view is the (closely tracked) beetle, plus a slow drift toward whatever it's framing
  const antOffScreen = framing.closest && !isOnCameraScreen(framing.closest.x, framing.closest.y);
  const drift = cameraEase(antOffScreen ? CAMERA_CONFIG.closestAnt.offScreenDriftSmoothing : CAMERA_CONFIG.offsetSmoothing, dt);
  gameCam.offsetX += (framing.x - playerX - gameCam.offsetX) * drift;
  gameCam.offsetY += (framing.y - playerY - gameCam.offsetY) * drift;
  gameCam.x = gameCam.followX + gameCam.offsetX;
  gameCam.y = gameCam.followY + gameCam.offsetY;

  // However fast the beetle goes (a dash), it stays well inside the screen. The one thing that can push it further out
  // is fitting the closest ant in, when the two are at opposite ends of the arena.
  const hardY = CAMERA_CONFIG.focus.beetleHardLimit * getCameraViewHeight() / 2;
  const limitX = Math.max(hardY * getCameraAspect(), Math.abs(framing.x - playerX));
  const limitY = Math.max(hardY, Math.abs(framing.y - playerY));
  gameCam.x = constrain(gameCam.x, playerX - limitX, playerX + limitX);
  gameCam.y = constrain(gameCam.y, playerY - limitY, playerY + limitY);

  updateCameraShake();
  updateCameraIndicators(dt);
}

// ---------- Scripted shots ----------

function cameraSmoothstep(t) {
  const u = constrain(t, 0, 1);
  return u * u * (3 - 2 * u);
}

// ---------- Opening shots ----------
// The player's down on the ground with the beetle. The shot stays close on it and only widens as far as it takes to
// bring in what the scene is about: its star ants, whatever's reacting nearby, big explosions. The scene's own actors
// say what that is, so scenes don't need to script the camera. Moves are slow and eased, with no sway (see the comfort
// note at the top of this file). Runs on the scene's clock (60 a second), so it stays in step with what it's filming.

// What's worth framing right now, most important first: { key, x, y, r }. r is how much room it takes up itself.
function getSceneCameraPoints(S) {
  const c = CAMERA_CONFIG.intro;
  const b = S.beetle;
  // The shot waits for the beetle to walk in before looking anywhere else, unless it's going to be gone for a while
  const offStage = b.x < c.arenaOverscan || b.x > S.W - c.arenaOverscan || b.y < c.arenaOverscan || b.y > S.H - c.arenaOverscan;
  if (offStage && S.t < c.beetleWait) return [];
  const found = [];
  const add = (key, x, y, rank, r) => {
    const dx = x - b.x;
    const dy = y - b.y;
    found.push({ key: key, x: x, y: y, r: r, rank: rank, d: dx * dx + dy * dy });
  };
  for (const a of S.actors) {
    if (a === b || !a.visible || a.alpha < 0.05) continue;
    if (a.x < -40 || a.x > S.W + 40 || a.y < -40 || a.y > S.H + 40) continue;
    let rank = a.kind === 'queen' ? 4 : a.featured ? 3 : a.extra ? 2 : 0;
    for (const e of a.emotes) {
      if (S.t >= e.t - c.emoteLead && S.t <= e.t + e.dur) rank = Math.max(rank, 1);
    }
    if (rank > 0) add(a, a.x, a.y, rank, a.imageSize() * a.scale / 2);
  }
  for (const f of S.fx) {
    if (f.kind === 'boom') add(f, f.x, f.y, 3, 0);
  }
  for (const g of S.ground) {
    if (S.t - g.t0 < 90) add(g, g.x, g.y, 2, 0); // Something just landed or got built
  }
  found.sort((p, q) => q.rank - p.rank || p.d - q.d);
  return found.slice(0, c.maxPoints);
}

// Fades points in and out of the shot, so nothing tugs on it the moment it starts or stops mattering
function updateSceneCameraPoints(S, dt) {
  const points = gameCam.scene.points;
  const ease = cameraEase(CAMERA_CONFIG.intro.pointSmoothing, dt);
  for (const p of points.values()) p.wanted = false;
  for (const f of getSceneCameraPoints(S)) {
    let p = points.get(f.key);
    if (!p) {
      p = { w: 0 };
      points.set(f.key, p);
    }
    p.x = f.x;
    p.y = f.y;
    p.r = f.r;
    p.wanted = true;
  }
  for (const [key, p] of points) {
    p.w += ((p.wanted ? 1 : 0) - p.w) * ease;
    if (!p.wanted && p.w < 0.02) points.delete(key);
  }
}

// How tall the view wants to be, and how far off the beetle it wants to sit
function getSceneCameraTarget(S, widest) {
  const c = CAMERA_CONFIG.intro;
  const b = S.beetle;
  const aspect = getCameraAspect();
  let minX = b.x, maxX = b.x, minY = b.y, maxY = b.y;
  let framing = false;
  for (const p of gameCam.scene.points.values()) {
    const x = b.x + (p.x - b.x) * p.w;
    const y = b.y + (p.y - b.y) * p.w;
    const r = Math.max(0, p.r * p.w - c.padding * 0.5); // The padding already covers something ant-sized
    minX = Math.min(minX, x - r);
    maxX = Math.max(maxX, x + r);
    minY = Math.min(minY, y - r);
    maxY = Math.max(maxY, y + r);
    framing = true;
  }
  const pushed = c.closeView * lerp(c.pushIn, 1, constrain(S.t / Math.max(1, S.duration), 0, 1));
  let view = pushed;
  // The letterbox bars cover part of the height
  if (framing) view = Math.max(view, ((maxY - minY) + c.padding * 2) / (1 - c.letterbox * 2), ((maxX - minX) + c.padding * 2) / aspect);
  view = Math.min(view, widest);
  // Centered on what's framed, but it never leaves the beetle behind
  const reachY = c.beetleReach * view / 2;
  const reachX = reachY * aspect;
  return {
    view: view,
    offsetX: constrain((minX + maxX) / 2 - b.x, -reachX, reachX),
    offsetY: constrain((minY + maxY) / 2 - b.y, -reachY, reachY)
  };
}

// The closest the center of a view this tall can get to the arena's edges
function clampSceneCameraX(x, view) {
  const room = CAMERA_CONFIG.intro.arenaOverscan - view * getCameraAspect() / 2;
  const W = getGameplayWidth();
  return room * 2 + W < 0 ? W / 2 : constrain(x, -room, W + room);
}

function clampSceneCameraY(y, view) {
  const room = CAMERA_CONFIG.intro.arenaOverscan - view / 2;
  const H = getGameplayHeight();
  return room * 2 + H < 0 ? H / 2 : constrain(y, -room, H + room);
}

// Called every frame of a round's opening scene, on every level
function updateAdaptiveCameraScene(S) {
  updateCameraDebugKey();
  gameCam.mode = 'scene';
  gameCam.focus = [];
  gameCam.lookX = 0;
  gameCam.lookY = 0;
  const c = CAMERA_CONFIG.intro;
  const dt = 1 / 60;
  const b = S.beetle;
  const widest = Math.min(c.widestView, getGameplayHeight() + c.arenaOverscan * 2);

  let shot = gameCam.scene;
  if (!shot || shot.owner !== S) {
    // First frame: on the spot the beetle's about to walk into, with nothing else framed yet. Everything else fades in.
    shot = gameCam.scene = { owner: S, points: new Map() };
    const start = getSceneCameraTarget(S, widest);
    shot.logView = Math.log(start.view);
    shot.offsetX = start.offsetX;
    shot.offsetY = start.offsetY;
    shot.followX = clampSceneCameraX(b.x, start.view);
    shot.followY = clampSceneCameraY(b.y, start.view);
  }
  updateSceneCameraPoints(S, dt);

  const target = getSceneCameraTarget(S, widest);
  shot.logView += (Math.log(target.view) - shot.logView) * cameraEase(c.zoomSmoothing, dt);
  const view = Math.exp(shot.logView);
  // The beetle often starts past the arena's edge: the follow waits at the edge for it, so the move starts smoothly
  const follow = cameraEase(c.followSmoothing, dt);
  const stepX = (clampSceneCameraX(b.x, view) - shot.followX) * follow;
  const stepY = (clampSceneCameraY(b.y, view) - shot.followY) * follow;
  const slow = Math.min(1, c.maxFollowSpeed * view / Math.max(1e-6, Math.sqrt(stepX * stepX + stepY * stepY)));
  shot.followX += stepX * slow;
  shot.followY += stepY * slow;
  const drift = cameraEase(c.offsetSmoothing, dt);
  shot.offsetX += (target.offsetX - shot.offsetX) * drift;
  shot.offsetY += (target.offsetY - shot.offsetY) * drift;
  const x = clampSceneCameraX(shot.followX + shot.offsetX, view);
  const y = clampSceneCameraY(shot.followY + shot.offsetY, view);

  // Eases into exactly what the round's first frame will show
  const returnFrames = Math.min(c.returnFrames, S.duration * 0.4);
  const back = cameraSmoothstep((S.t - (S.duration - returnFrames)) / returnFrames);
  let endX, endY, endView;
  if (isAdaptiveCameraWorld()) {
    const start = getCameraFraming();
    endX = start.x;
    endY = start.y;
    endView = start.view;
    gameCam.stretch = 0;
  } else {
    endX = getGameplayWidth() / 2;
    endY = getGameplayHeight() / 2;
    endView = getGameplayHeight();
    gameCam.stretch = back;
  }
  gameCam.logView = lerp(shot.logView, Math.log(endView), back);
  gameCam.logTarget = gameCam.logView;
  gameCam.x = lerp(x, endX, back);
  gameCam.y = lerp(y, endY, back);
  updateCameraShake();
}

function endCameraScene() {
  gameCam.scene = null;
  gameCam.stretch = 0;
}

let sceneVignette = null;

// Soft dark corners, painted once and stretched over the window
function getSceneVignette() {
  if (sceneVignette) return sceneVignette;
  const w = 256, h = 144;
  sceneVignette = document.createElement('canvas');
  sceneVignette.width = w;
  sceneVignette.height = h;
  const ctx = sceneVignette.getContext('2d', { willReadFrequently: true });
  ctx.translate(w / 2, h / 2);
  ctx.scale(w / h, 1);
  const g = ctx.createRadialGradient(0, 0, h * 0.28, 0, 0, h * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${CAMERA_CONFIG.intro.vignette})`);
  ctx.fillStyle = g;
  ctx.fillRect(-w, -h, w * 2, h * 2);
  return sceneVignette;
}

function drawSceneVignette(alpha) {
  drawingContext.save();
  drawingContext.globalAlpha = alpha;
  drawingContext.drawImage(getSceneVignette(), 0, 0, windowWidth, windowHeight);
  drawingContext.restore();
}

// The round is over: ease out to the whole arena while the ants run off (and over a queen's death burst)
function updateAdaptiveCameraOutro() {
  if (!isAdaptiveCameraWorld()) return;
  updateCameraDebugKey();
  gameCam.mode = 'outro';
  gameCam.focus = [];
  gameCam.incoming = [];
  gameCam.indicators = {};
  const dt = getCameraDt();
  const c = CAMERA_CONFIG.outro;
  const pos = cameraEase(c.positionSmoothing, dt);
  gameCam.x += (getGameplayWidth() / 2 - gameCam.x) * pos;
  gameCam.y += (getGameplayHeight() / 2 - gameCam.y) * pos;
  gameCam.logTarget = Math.log(getCameraWholeWorldView());
  gameCam.logView += (gameCam.logTarget - gameCam.logView) * cameraEase(c.zoomSmoothing, dt);
  updateCameraShake();
}

// ---------- Edge indicators ----------

function setCameraIndicator(wanted, key, kind, x, y) {
  const id = kind + ':' + key;
  let ind = gameCam.indicators[id];
  if (!ind) ind = gameCam.indicators[id] = { kind: kind, x: x, y: y, alpha: 0 };
  ind.x = x;
  ind.y = y;
  wanted[id] = true;
}

function updateCameraIndicators(dt) {
  const c = CAMERA_CONFIG.indicators;
  const wanted = {};
  if (c.enabled && !end) {
    // Revealed shooters off screen. A focus point that didn't fit gets one too (she may not be revealed any more).
    const showShooter = (src) => {
      const pos = getCameraSourcePos(src);
      if (pos && !isOnCameraScreen(pos.x, pos.y, c.screenMargin)) setCameraIndicator(wanted, src, 'shooter', pos.x, pos.y);
    };
    for (let i = 1; i <= enemyCount; i++) {
      if (isCameraRevealed(i)) showShooter(i);
    }
    if (isCameraRevealed('queen')) showShooter('queen');
    for (const f of gameCam.focus) showShooter(f.src);

    // Incoming attacks from off screen, revealed or not. They follow the shooter while it's still around.
    for (let k = gameCam.incoming.length - 1; k >= 0; k--) {
      const w = gameCam.incoming[k];
      if (gameCam.time >= w.until) {
        gameCam.incoming.splice(k, 1);
        continue;
      }
      const pos = getCameraSourcePos(w.src);
      if (pos) {
        w.x = pos.x;
        w.y = pos.y;
      }
      if (!isOnCameraScreen(w.x, w.y, c.screenMargin)) setCameraIndicator(wanted, w.src, 'incoming', w.x, w.y);
    }
  }
  // Fade in while wanted; fade out once the threat is on screen or gone
  const step = c.fadeSpeed * dt;
  for (const id in gameCam.indicators) {
    const ind = gameCam.indicators[id];
    ind.alpha = wanted[id] ? Math.min(1, ind.alpha + step) : ind.alpha - step;
    if (ind.alpha <= 0) delete gameCam.indicators[id];
  }
}

function drawCameraIndicators() {
  const c = CAMERA_CONFIG.indicators;
  const cx = windowWidth / 2;
  const cy = windowHeight / 2;
  const halfW = Math.max(1, cx - c.inset);
  const halfH = Math.max(1, cy - c.inset);
  // One per slice of the edge, the most urgent one, so a crowd doesn't turn into a row of arrows
  const sectors = {};
  for (const id in gameCam.indicators) {
    const ind = gameCam.indicators[id];
    const dx = cameraWorldToScreenX(ind.x) - cx;
    const dy = cameraWorldToScreenY(ind.y) - cy;
    const angle = Math.atan2(dy, dx);
    const sector = Math.floor((angle + Math.PI) / (Math.PI * 2) * c.sectors);
    const rank = (ind.kind === 'incoming' ? 2 : 1) + ind.alpha * 0.5;
    if (!sectors[sector] || sectors[sector].rank < rank) {
      sectors[sector] = { ind: ind, angle: angle, dx: dx, dy: dy, rank: rank };
    }
  }
  push();
  noStroke();
  for (const key in sectors) {
    const { ind, angle, dx, dy } = sectors[key];
    const t = Math.min(halfW / Math.max(1e-6, Math.abs(dx)), halfH / Math.max(1e-6, Math.abs(dy)));
    const x = cx + dx * t;
    const y = cy + dy * t;
    const color = ind.kind === 'incoming' ? c.incomingColor : c.shooterColor;
    const pulse = ind.kind === 'incoming' ? 0.75 + 0.25 * Math.sin(gameCam.time * 16) : 1;
    const a = c.maxAlpha * ind.alpha * pulse;
    const s = ind.kind === 'incoming' ? c.size * 1.2 : c.size;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    // A soft dark backing keeps it readable on any ground, then the arrow pointing off screen
    fill(0, a * 0.4);
    ellipse(x, y, s * 2.5, s * 2.5);
    fill(color[0], color[1], color[2], a);
    triangle(x + ca * s * 1.1, y + sa * s * 1.1,
      x - ca * s * 0.7 - sa * s * 0.55, y - sa * s * 0.7 + ca * s * 0.55,
      x - ca * s * 0.7 + sa * s * 0.55, y - sa * s * 0.7 - ca * s * 0.55);
  }
  pop();
}

// ---------- World edge (every level) ----------
// The ground ends at the arena's edge and the under-brush takes over. Bushes are sprites painted once into software
// canvases, then stamped, so a screen full of them costs about the same as a few ant sprites.

let underbrushSprites = {};      // By palette name
let underbrushFringe = null;     // Bushes along the arena's edge: { key, stamps }
let canopySprites = {};          // By palette name: the plain shapes further out

function resetUnderbrushSprites() {
  underbrushSprites = {};
  underbrushFringe = null;
  canopySprites = {};
  sceneVignette = null;
}

// Repeatable random number from 0 to 1 (doesn't depend on angleMode, unlike p5's sin)
function brushRand(n) {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

function makeBushSprite(palette, seed) {
  const size = CAMERA_CONFIG.underbrush.spritePixels;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const blob = (color, x, y, r) => {
    ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
    ctx.beginPath();
    ctx.arc(x * size, y * size, r * size, 0, Math.PI * 2);
    ctx.fill();
  };
  const leaves = [];
  const count = 4 + Math.floor(brushRand(seed + 0.5) * 3);
  for (let k = 0; k < count; k++) {
    const a = brushRand(seed + k * 7 + 1) * Math.PI * 2;
    const d = k === 0 ? 0 : 0.1 + brushRand(seed + k * 7 + 2) * 0.13;
    leaves.push({ x: 0.5 + Math.cos(a) * d, y: 0.5 + Math.sin(a) * d, r: 0.14 + brushRand(seed + k * 7 + 3) * 0.1 });
  }
  for (const l of leaves) blob(palette.shadow, l.x + 0.025, l.y + 0.03, l.r + 0.03);
  for (const l of leaves) blob(palette.leaf, l.x, l.y, l.r);
  return canvas;
}

// The forest beyond the edge is only backdrop: one flat, low-contrast shape, a little lighter than the ground under it
function makeCanopySprite(palette, seed) {
  const size = CAMERA_CONFIG.underbrush.spritePixels;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = `rgb(${palette.canopy[0]},${palette.canopy[1]},${palette.canopy[2]})`;
  for (let k = 0; k < 4; k++) {
    const a = brushRand(seed + k * 5 + 1) * Math.PI * 2;
    const d = k === 0 ? 0 : 0.2;
    ctx.beginPath();
    ctx.arc((0.5 + Math.cos(a) * d) * size, (0.5 + Math.sin(a) * d) * size, (k === 0 ? 0.3 : 0.2 + brushRand(seed + k) * 0.08) * size, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function getUnderbrushPalette() {
  return isFinalLevel() ? 'nest' : 'forest';
}

function getUnderbrushSprites(name) {
  if (!underbrushSprites[name]) {
    const c = CAMERA_CONFIG.underbrush;
    underbrushSprites[name] = [];
    for (let k = 0; k < c.variants; k++) underbrushSprites[name].push(makeBushSprite(c[name], k * 31 + 5));
  }
  return underbrushSprites[name];
}

function getCanopySprites(name) {
  if (!canopySprites[name]) {
    const c = CAMERA_CONFIG.underbrush;
    canopySprites[name] = [];
    for (let k = 0; k < c.variants; k++) canopySprites[name].push(makeCanopySprite(c[name], k * 17 + 3));
  }
  return canopySprites[name];
}

// The bushes along all four edges. They only change with the arena's size.
function getUnderbrushFringe(W, H) {
  const key = W + 'x' + H;
  if (underbrushFringe && underbrushFringe.key === key) return underbrushFringe.stamps;
  const spacing = CAMERA_CONFIG.underbrush.fringeSpacing;
  const variants = CAMERA_CONFIG.underbrush.variants;
  const stamps = [];
  const addEdge = (fromX, fromY, toX, toY, normalX, normalY, seed) => {
    const count = Math.ceil((Math.abs(toX - fromX) + Math.abs(toY - fromY)) / spacing);
    for (let k = 0; k <= count; k++) {
      const f = k / count;
      const r1 = brushRand(seed + k * 3 + 1);
      const r2 = brushRand(seed + k * 3 + 2);
      const r3 = brushRand(seed + k * 3 + 3);
      const r = 30 + r1 * 16;
      // The normal points out of the arena: the bush sits on the edge, poking in by a jagged amount
      const out = r * 0.2 - r2 * 9;
      stamps.push({
        x: lerp(fromX, toX, f) + normalX * out + (r3 - 0.5) * spacing * Math.abs(normalY),
        y: lerp(fromY, toY, f) + normalY * out + (r3 - 0.5) * spacing * Math.abs(normalX),
        r: r,
        v: Math.floor(r2 * variants) % variants
      });
    }
  };
  addEdge(0, 0, W, 0, 0, -1, 1000);
  addEdge(0, H, W, H, 0, 1, 2000);
  addEdge(0, 0, 0, H, -1, 0, 3000);
  addEdge(W, 0, W, H, 1, 0, 4000);
  underbrushFringe = { key: key, stamps: stamps };
  return stamps;
}

// Called instead of a plain background on every level
function drawWorldWithUnderbrush(groundColor) {
  const c = CAMERA_CONFIG.underbrush;
  const name = getUnderbrushPalette();
  const palette = c[name];
  const sprites = getUnderbrushSprites(name);
  const W = getGameplayWidth();
  const H = getGameplayHeight();
  background(palette.base[0], palette.base[1], palette.base[2]);

  beginGameplayScaling();
  push();
  const ctx = drawingContext;
  ctx.imageSmoothingEnabled = true;
  // What's on screen, in world units. Fixed-view levels only ever see the arena itself (give or take a shake).
  const adaptive = isCameraDriven();
  const margin = 50;
  const view = adaptive ? {
    minX: cameraScreenToWorldX(0) - margin,
    maxX: cameraScreenToWorldX(windowWidth) + margin,
    minY: cameraScreenToWorldY(0) - margin,
    maxY: cameraScreenToWorldY(windowHeight) + margin
  } : { minX: -margin, maxX: W + margin, minY: -margin, maxY: H + margin };

  // Beyond the edge: a few plain shapes on a fixed grid, so they stay put in the world. Further out it's flat color.
  if (adaptive) {
    const canopy = getCanopySprites(name);
    const cell = c.canopyCell;
    for (let col = Math.floor(view.minX / cell) - 1; col <= Math.ceil(view.maxX / cell); col++) {
      for (let row = Math.floor(view.minY / cell) - 1; row <= Math.ceil(view.maxY / cell); row++) {
        const px = col * cell;
        const py = row * cell;
        if (px > 0 && px < W - cell && py > 0 && py < H - cell) continue; // Under the ground anyway
        if (px < -c.canopyDepth || px > W + c.canopyDepth || py < -c.canopyDepth || py > H + c.canopyDepth) continue;
        const seed = (col + 500) * 37 + (row + 500) * 101;
        const r = 95 + brushRand(seed) * 45;
        ctx.drawImage(canopy[seed % c.variants], px + brushRand(seed + 1) * cell - r, py + brushRand(seed + 2) * cell - r, r * 2, r * 2);
      }
    }
  }

  // The ground
  ctx.fillStyle = `rgb(${groundColor[0]},${groundColor[1]},${groundColor[2]})`;
  ctx.fillRect(0, 0, W, H);

  // The edge of the world: bushes all the way around
  for (const b of getUnderbrushFringe(W, H)) {
    if (b.x < view.minX - b.r || b.x > view.maxX + b.r || b.y < view.minY - b.r || b.y > view.maxY + b.r) continue;
    ctx.drawImage(sprites[b.v], b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }
  pop();
  endGameplayScaling();
}

// ---------- Overlays (window space) ----------

function drawAdaptiveCameraOverlays() {
  if (!isCameraDriven()) return;
  if (gameCam.mode === 'play' && CAMERA_CONFIG.indicators.enabled) drawCameraIndicators();
  if (gameCam.debugOn) drawCameraDebugOverlay();
}

// Press F9: the active focus points, the framing box and the current zoom
function drawCameraDebugOverlay() {
  const toX = cameraWorldToScreenX;
  const toY = cameraWorldToScreenY;
  push();
  rectMode(CORNERS);
  noFill();
  strokeWeight(1.5);

  // The arena's edge
  stroke(120, 255, 140, 170);
  rect(toX(0), toY(0), toX(getGameplayWidth()), toY(getGameplayHeight()));

  // Framing box
  const d = gameCam.debugBox;
  if (gameCam.mode === 'play' && d) {
    stroke(255, 255, 255, 210);
    rect(toX(d.box.minX), toY(d.box.minY), toX(d.box.maxX), toY(d.box.maxY));
    // Where the camera wants to be
    stroke(255, 255, 90);
    line(toX(d.x) - 8, toY(d.y), toX(d.x) + 8, toY(d.y));
    line(toX(d.x), toY(d.y) - 8, toX(d.x), toY(d.y) + 8);
  }

  // The beetle's safe area on screen
  const safe = CAMERA_CONFIG.focus.beetleSafeArea;
  stroke(100, 190, 255, 110);
  rect(windowWidth * (1 - safe) / 2, windowHeight * (1 - safe) / 2, windowWidth * (1 + safe) / 2, windowHeight * (1 + safe) / 2);

  // The closest ant
  if (gameCam.mode === 'play' && d && d.closest) {
    stroke(120, 220, 255);
    ellipse(toX(d.closest.x), toY(d.closest.y), 34, 34);
    line(toX(playerX), toY(playerY), toX(d.closest.x), toY(d.closest.y));
    noFill();
  }

  // Beetle (permanent focus point), then the temporary ones
  stroke(120, 255, 120);
  ellipse(toX(playerX), toY(playerY), 18, 18);
  textSize(13);
  textAlign(LEFT, BOTTOM);
  for (const f of gameCam.focus) {
    const a = getCameraFocusAlpha(f);
    const x = toX(f.x);
    const y = toY(f.y);
    stroke(255, 90, 90, 90 + 165 * a);
    noFill();
    ellipse(x, y, 16 + 40 * f.weight, 16 + 40 * f.weight);
    line(toX(playerX), toY(playerY), x, y);
    noStroke();
    fill(255, 200, 200);
    text(`${f.src} w${f.weight.toFixed(2)} a${a.toFixed(2)} ${(f.duration - f.age).toFixed(1)}s`, x + 12, y - 8);
  }

  // Readout
  const view = getCameraViewHeight();
  let revealed = 0;
  for (let i = 1; i <= enemyCount; i++) {
    if (isCameraRevealed(i)) revealed++;
  }
  const lines = [
    `CAMERA (${gameCam.mode})`,
    `view ${view.toFixed(0)} / target ${Math.exp(gameCam.logTarget).toFixed(0)} (${getCameraMinView()} - ${getCameraMaxView()})`,
    `zoom ${(getCameraMinView() / view).toFixed(2)}x of rest view`,
    `focus ${gameCam.focus.length + 1}/${CAMERA_CONFIG.focus.maxActivePoints}  revealed ${revealed}  indicators ${Object.keys(gameCam.indicators).length}`
  ];
  rectMode(CORNER);
  noStroke();
  fill(0, 170);
  rect(10, windowHeight - 92, 330, 82, 6);
  fill(255);
  textAlign(LEFT, TOP);
  textSize(14);
  lines.forEach((text_, k) => text(text_, 18, windowHeight - 86 + k * 18));
  pop();
}
