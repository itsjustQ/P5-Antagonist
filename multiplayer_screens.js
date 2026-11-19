// ========== MULTIPLAYER SCREENS ==========
// Everything multiplayer shows between combat turns, in the 1280 x 652 menu space: setup, names, the controller
// handoff, the leaderboards, and the upgrade turn (beetle shop, ant designer, queen). See multiplayer.js for the flow.

// ---------- Input ----------
// Directions repeat while held (after a short wait), confirm/back/clicks fire once per press

let mpWheelDelta = 0;  // Mouse wheel movement since the last menu frame (see mouseWheel in sketch.js)

const MP_REPEAT_WAIT = 16;
const MP_REPEAT_EVERY = 4;

function mpReadInput(ignoreKeyboardNav) {
  const inp = { up: false, down: false, left: false, right: false, confirm: false, back: false, click: false,
    tabLeft: false, tabRight: false, done: false, token: false };
  const keys = { up: [87, 38], down: [83, 40], left: [65, 37], right: [68, 39] };
  const dirs = {};
  for (const d in keys) dirs[d] = () => mpPadDir(d) || (!ignoreKeyboardNav && keys[d].some(k => keyIsDown(k)));
  for (const d in dirs) {
    const down = dirs[d]();
    if (down) {
      const held = (mp.nav.held[d] || 0) + 1;
      mp.nav.held[d] = held;
      if (held === 1 || (held > MP_REPEAT_WAIT && (held - MP_REPEAT_WAIT) % MP_REPEAT_EVERY === 0)) inp[d] = true;
    } else {
      mp.nav.held[d] = 0;
    }
  }
  inp.heldFrames = Math.max(mp.nav.held.left || 0, mp.nav.held.right || 0);
  inp.confirm = isConfirmPressed();
  const back = isBackPressed();
  inp.back = back && !mp.backHeld;
  mp.backHeld = back;
  const clicking = mouseIsPressed && mouseButton === LEFT;
  inp.click = clicking && !mp.clickHeld;
  mp.clickHeld = clicking;
  const btn = b => !!(gamepad && gamepad.buttons[b] && gamepad.buttons[b].pressed);
  const edge = (key, down) => {
    const was = mp.nav.repeat[key];
    mp.nav.repeat[key] = down;
    return down && !was;
  };
  inp.tabLeft = edge('tabL', btn(4) || (!ignoreKeyboardNav && keyIsDown(81)));   // LB / Q
  inp.tabRight = edge('tabR', btn(5) || (!ignoreKeyboardNav && keyIsDown(69)));  // RB / E
  // Reroll is R / Y, the same as the normal game's upgrade screen, so Done takes F / X instead
  inp.done = edge('done', btn(2) || (!ignoreKeyboardNav && keyIsDown(70)));      // X / F
  inp.reroll = edge('reroll', btn(3) || (!ignoreKeyboardNav && keyIsDown(82)));  // Y / R
  inp.pause = pausePressedThisFrame;
  inp.wheel = Math.sign(mpWheelDelta); // One step per frame the wheel turned
  mpWheelDelta = 0;
  if (mp.phaseFrames < 10) {
    // Whatever was held to get here doesn't count on the new screen
    inp.confirm = inp.back = inp.click = inp.done = inp.reroll = false;
  }
  return inp;
}

function mpPadDir(d) {
  if (!gamepad) return false;
  const ax = gamepad.axes;
  const b = k => gamepad.buttons[k] && gamepad.buttons[k].pressed;
  // Menus want a firm push, and only along the stick's main direction: scrolling down a list with a slightly
  // diagonal stick mustn't nudge the sliders it passes
  const x = ax[0] || 0, y = ax[1] || 0;
  const vertical = Math.abs(y) >= Math.abs(x);
  const firm = Math.max(0.5, leftStickDeadzone);
  if (d === 'up') return (vertical && y < -firm) || b(12);
  if (d === 'down') return (vertical && y > firm) || b(13);
  if (d === 'left') return (!vertical && x < -firm) || b(14);
  return (!vertical && x > firm) || b(15);
}

function mpMouseIn(r) {
  return pointInRect(getMenuMouseX(), getMenuMouseY(), r);
}

function mpMouseMoved() {
  return movedX !== 0 || movedY !== 0;
}

// ---------- Drawing helpers ----------

function mpButton(r, label, selected, opts = {}) {
  push();
  rectMode(CORNER);
  const c = opts.color || [90, 200, 120];
  if (opts.disabled) {
    menuLockedFill();
    menuDimStroke();
  } else if (selected) {
    fill(c[0], c[1], c[2]);
    stroke(255);
  } else {
    menuCardFill();
    stroke(c[0], c[1], c[2]);
  }
  strokeWeight(selected ? 3 : 2);
  rect(r.x, r.y, r.w, r.h, 10);
  noStroke();
  fill(opts.disabled ? 120 : selected ? mpTextColorOn(c) : 235);
  textAlign(CENTER, CENTER);
  fitTextSize(label, opts.size || 20, r.w - 16);
  text(label, r.x + r.w / 2, r.y + r.h / 2);
  pop();
}

function mpColorChip(x, y, d, rgb) {
  push();
  stroke(rgb[0] > 200 && rgb[1] > 200 && rgb[2] > 200 ? 120 : 255);
  strokeWeight(2);
  fill(rgb[0], rgb[1], rgb[2]);
  ellipse(x, y, d, d);
  pop();
}

// Wrapped text in a box: shrinks the text size until every line fits inside it
function mpFitBox(str, size, w, h, minSize = 9) {
  for (let s = size; s >= minSize; s -= 0.5) {
    textSize(s);
    if (mpWrapLines(str, w) * s * 1.25 <= h) return s;
  }
  textSize(minSize);
  return minSize;
}

function mpWrapLines(str, w) {
  let lines = 0;
  for (const para of String(str).split('\n')) {
    let cur = '';
    lines++;
    for (const word of para.split(' ')) {
      const next = cur ? cur + ' ' + word : word;
      if (cur && textWidth(next) > w) {
        lines++;
        cur = word;
      } else {
        cur = next;
      }
    }
  }
  return lines;
}

// Rotate by radians, whatever angle mode the game left on (it draws in degrees)
function mpRotate(rad) {
  angleMode(DEGREES);
  rotate(rad * 180 / Math.PI);
}

// The ant sprite (the animated image itself, so tint() works on it, the way the round scenes draw queens)
function mpAntImage() {
  return ant;
}

// An ant in a player's color ring, for the menus
function mpDrawMenuAnt(x, y, size, angle, rgb, alpha = 255) {
  const s = 45 + 15 * size;
  push();
  noFill();
  stroke(rgb[0], rgb[1], rgb[2], alpha);
  strokeWeight(3);
  ellipse(x, y + 4, s * 0.95, s * 0.6);
  translate(x, y);
  mpRotate(angle);
  imageMode(CENTER);
  if (alpha < 255) tint(255, alpha);
  image(mpAntImage(), 0, 0, s, s);
  pop();
}

function mpDrawMenuBeetle(x, y, size, angle, rgb) {
  push();
  noStroke();
  fill(rgb[0] * 0.5, rgb[1] * 0.5, rgb[2] * 0.5, 120);
  ellipse(x + 3, y + 10, size * 0.62, size * 0.4);
  translate(x, y);
  mpRotate(angle);
  imageMode(CENTER);
  image(beetle, 0, 0, size, size);
  pop();
}

function mpTitle(str, y = 52, size = 44) {
  push();
  textAlign(CENTER, CENTER);
  fitTextSize(str, size, getMenuWidth() - 60);
  fill(255);
  stroke(0);
  strokeWeight(5);
  text(str, getMenuWidth() / 2, y);
  pop();
}

// No color: the themed forest floor (menutheme.js)
function mpBackground(rgb) {
  if (!rgb) {
    drawMenuBackdrop();
    return;
  }
  push();
  noStroke();
  fill(rgb[0], rgb[1], rgb[2]);
  rect(0, 0, getMenuWidth(), getMenuHeight());
  pop();
}

// ---------- The screen loop (called from draw() whenever multiplayer isn't in combat) ----------

function mpDraw() {
  mp.phaseFrames++;
  // Shake for the leaderboards
  let sx = 0, sy = 0;
  if (mp.shake > 0.3) {
    sx = random(-mp.shake, mp.shake);
    sy = random(-mp.shake, mp.shake);
    mp.shake *= mp.phase === 'turnBoard' ? 0.9 : 0.85;
  }
  beginMenuScaling();
  push();
  translate(sx, sy);
  const typing = mp.phase === 'names' && !mp.oskOpen;
  const inp = mpReadInput(typing);
  // Esc means "back" on screens that have one (P still pauses there), and P is just a letter while typing a name
  const escBack = (mp.phase === 'gameOver' && mp.result && mp.result.showAll) ||
    (mp.phase === 'upgrade' && mp.up && mp.up.targetPick !== null && mp.up.targetPick !== undefined) ||
    (mp.phase === 'names' && mp.oskOpen);
  const startBtn = !!(gamepad && gamepad.buttons[9] && gamepad.buttons[9].pressed);
  if (inp.pause && !startBtn && ((escBack && keyIsDown(27) && !keyIsDown(80)) || (typing && !keyIsDown(27)))) inp.pause = false;
  if (mp.paused) {
    mpDrawPhase(null);
    mpDrawPause(inp);
  } else {
    if (inp.pause && mp.phase !== 'setup') {
      mp.paused = true;
      mp.pauseSel = 0;
      inp.confirm = inp.back = inp.click = false;
    }
    mpDrawPhase(inp);
  }
  pop();
  endMenuScaling();
}

function mpDrawPhase(inp) {
  const none = { up: false, down: false, left: false, right: false, confirm: false, back: false, click: false,
    tabLeft: false, tabRight: false, done: false, token: false };
  const i = inp || none;
  switch (mp.phase) {
    case 'setup': mpDrawSetup(i); break;
    case 'names': mpDrawNames(i); break;
    case 'handoff': mpDrawHandoff(i); break;
    case 'turnBoard': mpDrawTurnBoard(i); break;
    case 'roundBoard': mpDrawRoundBoard(i); break;
    case 'upgrade': mpDrawUpgrade(i); break;
    case 'showdown': mpDrawShowdown(i); break;
    case 'gameOver': mpDrawGameOver(i); break;
  }
}

function mpDrawPause(inp) {
  push();
  noStroke();
  fill(0, 0, 0, 170);
  rect(0, 0, getMenuWidth(), getMenuHeight());
  pop();
  mpTitle('Paused', 200, 60);
  const items = ['Resume', 'Quit to the main menu'];
  if (inp.up || inp.down) mp.pauseSel = 1 - mp.pauseSel;
  for (let k = 0; k < 2; k++) {
    const r = { x: getMenuWidth() / 2 - 170, y: 280 + k * 70, w: 340, h: 54 };
    if (mpMouseIn(r) && mpMouseMoved()) mp.pauseSel = k;
    mpButton(r, items[k], mp.pauseSel === k, { color: k ? [230, 90, 90] : [90, 200, 120] });
    if (inp.click && mpMouseIn(r)) { mp.pauseSel = k; inp.confirm = true; }
  }
  if (inp.pause || inp.back) {
    mp.paused = false;
    return;
  }
  if (inp.confirm) {
    if (mp.pauseSel === 0) mp.paused = false;
    else {
      mpQuit();
      returnToMainMenu();
      menuNavigationCooldown = 20;
    }
  }
}

// ---------- Setup ----------

function mpDrawSetup(inp) {
  mpBackground();
  mpTitle('Multiplayer', 60, 52);
  push();
  textAlign(CENTER, CENTER);
  textSize(18);
  fill(200);
  text('Everyone plays on this device, passing the controller between turns. You fight the ants the others design.', getMenuWidth() / 2, 108);
  pop();
  const rows = ['players', 'limit', 'levels', 'start', 'back'];
  if (inp.up) mp.setupSel = (mp.setupSel + rows.length - 1) % rows.length;
  if (inp.down) mp.setupSel = (mp.setupSel + 1) % rows.length;
  const cx = getMenuWidth() / 2;
  const rects = {
    players: { x: cx - 300, y: 170, w: 600, h: 90 },
    limit: { x: cx - 300, y: 275, w: 600, h: 64 },
    levels: { x: cx - 300, y: 350, w: 600, h: 64 },
    start: { x: cx - 160, y: 440, w: 320, h: 60 },
    back: { x: cx - 160, y: 512, w: 320, h: 46 }
  };
  rows.forEach((k, n) => { if (mpMouseIn(rects[k]) && mpMouseMoved()) mp.setupSel = n; });
  const sel = rows[mp.setupSel];
  const step = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  if (sel === 'players' && step) mp.playerCount = constrain(mp.playerCount + step, 2, MP_MAX_PLAYERS);
  if (sel === 'limit' && step) mp.roundLimitIndex = (mp.roundLimitIndex + step + MP_ROUND_LIMITS.length) % MP_ROUND_LIMITS.length;
  if (sel === 'levels' && step) mp.startLevels = constrain(mp.startLevels + step, 0, MP_START_LEVELS_MAX);

  // Players
  push();
  rectMode(CORNER);
  let r = rects.players;
  if (sel === 'players') menuCardFill(); else menuLockedFill();
  if (sel === 'players') stroke(255); else menuDimStroke();
  strokeWeight(2);
  rect(r.x, r.y, r.w, r.h, 12);
  noStroke();
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(22);
  text(`Players:  ◀ ${mp.playerCount} ▶`, r.x + 20, r.y + 28);
  for (let k = 0; k < MP_MAX_PLAYERS; k++) {
    const on = k < mp.playerCount;
    const c = MP_COLORS[k].rgb;
    push();
    if (!on) tint(255, 60);
    mpColorChip(r.x + 40 + k * 70, r.y + 66, on ? 26 : 16, on ? c : [70, 70, 70]);
    pop();
  }
  // Limit
  r = rects.limit;
  if (sel === 'limit') menuCardFill(); else menuLockedFill();
  if (sel === 'limit') stroke(255); else menuDimStroke();
  strokeWeight(2);
  rect(r.x, r.y, r.w, r.h, 12);
  noStroke();
  fill(255);
  textSize(22);
  const lim = MP_ROUND_LIMITS[mp.roundLimitIndex];
  text(`Round limit:  ◀ ${lim} rounds ▶`, r.x + 20, r.y + r.h / 2);
  // Starting levels
  r = rects.levels;
  if (sel === 'levels') menuCardFill(); else menuLockedFill();
  if (sel === 'levels') stroke(255); else menuDimStroke();
  strokeWeight(2);
  rect(r.x, r.y, r.w, r.h, 12);
  noStroke();
  fill(255);
  text(`Starting upgrade levels:  ◀ ${mp.startLevels} ▶`, r.x + 20, r.y + r.h / 2);
  pop();
  if (inp.click) {
    if (mpMouseIn(rects.players)) mp.playerCount = mp.playerCount >= MP_MAX_PLAYERS ? 2 : mp.playerCount + 1;
    if (mpMouseIn(rects.limit)) mp.roundLimitIndex = (mp.roundLimitIndex + 1) % MP_ROUND_LIMITS.length;
    if (mpMouseIn(rects.levels)) mp.startLevels = mp.startLevels >= MP_START_LEVELS_MAX ? 0 : Math.min(MP_START_LEVELS_MAX, mp.startLevels + 5);
  }
  mpButton(rects.start, 'Start', sel === 'start');
  mpButton(rects.back, 'Back', sel === 'back', { color: [200, 200, 200], size: 18 });
  push();
  textAlign(CENTER, CENTER);
  textSize(14);
  fill(160);
  text(`Last beetle standing wins (if the last ones fall in the same round, the queens fight it out). After round ${lim}, the best total score wins.`, cx, 588);
  text('◀ ▶ to change  ·  Enter / A to pick  ·  Esc / B to go back', cx, 620);
  pop();
  const go = k => inp.confirm && sel === k || inp.click && mpMouseIn(rects[k]);
  if (go('start')) mpBeginGame();
  else if (go('back') || inp.back) {
    mpQuit();
    startMenu = true;
    menuNavigationCooldown = 20;
  }
}

// ---------- Names ----------

const MP_OSK_ROWS = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ-\'!?', '0123456789'];
const MP_OSK_SPECIAL = ['Space', 'Delete', 'Done'];

// Typed letters (p5 calls this for printable keys)
function keyTyped() {
  if (!mp || mp.phase !== 'names' || mp.oskOpen || mp.paused) return;
  if (key && key.length === 1 && key >= ' ' && mp.nameText.length < MP_NAME_MAX) {
    mp.nameText += key;
    return false;
  }
}

function keyPressed() {
  if (!mp || mp.phase !== 'names' || mp.oskOpen || mp.paused) return;
  if (keyCode === BACKSPACE) {
    mp.nameText = mp.nameText.slice(0, -1);
    return false;
  }
}

function mpDrawNames(inp) {
  const p = mp.players[mp.nameIndex];
  const c = p.color;
  mpBackground([c[0] * 0.25, c[1] * 0.25, c[2] * 0.25]);
  mpTitle(`Player ${p.index + 1}, what's your name?`, 70, 40);
  mpDrawMenuBeetle(getMenuWidth() / 2 - 330, 230, 120, -Math.PI / 2 + Math.sin(frameCount * 0.05) * 0.2, c);
  mpDrawMenuAnt(getMenuWidth() / 2 + 330, 230, 1, Math.PI / 2, c);

  const field = { x: getMenuWidth() / 2 - 260, y: 170, w: 520, h: 70 };
  const cont = { x: getMenuWidth() / 2 - 140, y: 268, w: 280, h: 52 };
  if (!mp.oskOpen) {
    if (inp.up || inp.down) mp.nameSel = 1 - mp.nameSel;
    if (mpMouseIn(field) && mpMouseMoved()) mp.nameSel = 0;
    if (mpMouseIn(cont) && mpMouseMoved()) mp.nameSel = 1;
  }
  push();
  rectMode(CORNER);
  fill(15);
  stroke(mp.nameSel === 0 || mp.oskOpen ? 255 : 120);
  strokeWeight(3);
  rect(field.x, field.y, field.w, field.h, 12);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(34);
  const shown = mp.nameText || '';
  fill(shown ? 255 : 110);
  const caret = (frameCount % 50 < 25) ? '|' : ' ';
  text((shown || (mp.nameSel === 0 ? '' : p.name)) + (mp.nameSel === 0 || mp.oskOpen ? caret : ''), field.x + field.w / 2, field.y + field.h / 2);
  textSize(14);
  fill(200);
  textAlign(RIGHT, TOP);
  text(`${shown.length}/${MP_NAME_MAX}`, field.x + field.w - 10, field.y + field.h + 4);
  pop();
  mpButton(cont, mp.nameIndex === mp.players.length - 1 ? 'Start the game' : 'Next player', mp.nameSel === 1 && !mp.oskOpen, { color: c });

  push();
  textAlign(CENTER, CENTER);
  textSize(15);
  fill(220);
  text(mp.oskOpen ? 'Pick letters with the stick or D-pad and A  ·  B deletes  ·  Done closes the keyboard' :
    'Type your name, then press Enter  ·  On a controller: select the name and press A for a keyboard', getMenuWidth() / 2, 628);
  pop();

  if (mp.oskOpen) {
    mpDrawOsk(inp);
    return;
  }
  const typedEnter = inp.confirm && keyIsDown(13);
  if (inp.click && mpMouseIn(field)) mp.nameSel = 0;
  if (inp.confirm && mp.nameSel === 0 && !typedEnter) {
    // A on the name field opens the on-screen keyboard
    mp.oskOpen = true;
    mp.oskRow = 0;
    mp.oskCol = 0;
    return;
  }
  if (inp.back && gamepad && gamepad.buttons[1] && gamepad.buttons[1].pressed) mp.nameText = mp.nameText.slice(0, -1);
  if (typedEnter || (inp.confirm && mp.nameSel === 1) || (inp.click && mpMouseIn(cont))) {
    const name = mp.nameText.trim();
    if (name) p.name = name.slice(0, MP_NAME_MAX);
    mp.nameIndex++;
    mp.nameText = '';
    mp.nameSel = 0;
    if (mp.nameIndex >= mp.players.length) mpStartFirstRound();
    else mpSetPhase('names');
  }
}

function mpDrawOsk(inp) {
  const rows = MP_OSK_ROWS.length + 1;
  const keyW = 64, keyH = 46, gap = 8;
  const top = 345;
  const left = getMenuWidth() / 2 - (10 * (keyW + gap) - gap) / 2;
  if (inp.up) mp.oskRow = (mp.oskRow + rows - 1) % rows;
  if (inp.down) mp.oskRow = (mp.oskRow + 1) % rows;
  const cols = mp.oskRow < MP_OSK_ROWS.length ? 10 : MP_OSK_SPECIAL.length;
  if (inp.left) mp.oskCol = (mp.oskCol + cols - 1) % cols;
  if (inp.right) mp.oskCol = (mp.oskCol + 1) % cols;
  mp.oskCol = Math.min(mp.oskCol, cols - 1);
  let pressed = null;
  for (let r = 0; r < rows; r++) {
    const special = r === MP_OSK_ROWS.length;
    const keys = special ? MP_OSK_SPECIAL : MP_OSK_ROWS[r].split('');
    const w = special ? (10 * (keyW + gap) - gap - gap * 2) / 3 : keyW;
    keys.forEach((k, c) => {
      const rect = { x: left + c * (w + gap), y: top + r * (keyH + gap), w: w, h: keyH };
      if (mpMouseIn(rect) && mpMouseMoved()) { mp.oskRow = r; mp.oskCol = c; }
      const sel = mp.oskRow === r && mp.oskCol === c;
      mpButton(rect, k, sel, { color: [235, 235, 235], size: special ? 18 : 22 });
      if (inp.click && mpMouseIn(rect)) pressed = k;
    });
  }
  if (inp.confirm) {
    pressed = mp.oskRow < MP_OSK_ROWS.length ? MP_OSK_ROWS[mp.oskRow][mp.oskCol] : MP_OSK_SPECIAL[mp.oskCol];
  }
  if (inp.back) pressed = 'Delete';
  if (!pressed) return;
  if (pressed === 'Space') {
    if (mp.nameText.length < MP_NAME_MAX) mp.nameText += ' ';
  } else if (pressed === 'Delete') {
    mp.nameText = mp.nameText.slice(0, -1);
  } else if (pressed === 'Done') {
    mp.oskOpen = false;
    mp.nameSel = 1;
  } else if (mp.nameText.length < MP_NAME_MAX) {
    // Capital first letters, lower case after
    const lower = mp.nameText.length > 0 && mp.nameText[mp.nameText.length - 1] !== ' ';
    mp.nameText += lower ? pressed.toLowerCase() : pressed;
  }
}

// ---------- Handoff ----------

function mpDrawHandoff(inp) {
  const p = mp.players[mp.handoff.player];
  const c = p.color;
  const t = mp.phaseFrames;
  mpBackground();
  // The player's color sweeps in from the left
  const sweep = Math.min(1, t / 18);
  push();
  noStroke();
  fill(c[0], c[1], c[2]);
  rect(0, 0, getMenuWidth() * (1 - Math.pow(1 - sweep, 3)), getMenuHeight());
  // Soft stripes for some motion
  fill(255, 255, 255, 18);
  for (let k = -2; k < 14; k++) {
    const x = ((k * 140 + t * 2) % (getMenuWidth() + 280)) - 140;
    quad(x, 0, x + 60, 0, x - 140, getMenuHeight(), x - 200, getMenuHeight());
  }
  pop();
  const ink = mpTextColorOn(c);
  // The beetle and an ant of their design slide into the middle
  const slide = Math.min(1, Math.max(0, (t - 8) / 26));
  const ease = 1 - Math.pow(1 - slide, 3);
  const cx = getMenuWidth() / 2;
  const bob = Math.sin(t * 0.08) * 4;
  mpDrawMenuBeetle(lerp(-200, cx - 90, ease), 270 + bob, 150, 0, c);
  const size = MP_SIZES[p.design.size].value;
  mpDrawMenuAnt(lerp(getMenuWidth() + 200, cx + 110, ease), 285 - bob, Math.min(2, size), Math.PI, [ink[0], ink[1], ink[2]]);
  const appear = Math.min(1, Math.max(0, (t - 20) / 12));
  push();
  textAlign(CENTER, CENTER);
  fill(ink[0], ink[1], ink[2], 255 * appear);
  const line = mp.handoff.kind === 'combat' ? `${p.name}, you're up` : `${p.name}, choose your upgrades`;
  fitTextSize(line, 54, getMenuWidth() - 80);
  textSize(textSize() * (0.7 + 0.3 * appear));
  text(line, cx, 120);
  const sub = mp.handoff.kind === 'combat' ?
    `Round ${mp.round}  ·  Pass the controller to ${p.name}` :
    `${mp.preGame ? 'Starting upgrades' : `Round ${mp.round} upgrades`}  ·  ${mpLevelsAvailable(p)} upgrade level${mpLevelsAvailable(p) === 1 ? '' : 's'} to spend${p.alive ? '' : '  ·  Your beetle is out, but your ants fight on'}`;
  fitTextSize(sub, 22, getMenuWidth() - 80);
  text(sub, cx, 175);
  if (t > 40) {
    fill(ink[0], ink[1], ink[2], 150 + 100 * Math.sin(frameCount * 0.1));
    textSize(20);
    text('Press A, Enter or click when you have the controller', cx, 560);
  }
  pop();
  if (t > 40 && (inp.confirm || inp.click)) {
    if (mp.handoff.kind === 'combat') mpStartCombat();
    else mpOpenUpgradeTurn();
  }
}

// ---------- Leaderboards ----------

// One row of a leaderboard
function mpDrawBoardRow(s, place, x, y, w, h, opts = {}) {
  const p = mp.players[s.index];
  const c = p.color;
  push();
  rectMode(CORNER);
  noStroke();
  if (opts.solid) fill(30, 26, 40);
  else fill(0, 0, 0, 140);
  rect(x, y, w, h, 10);
  fill(c[0], c[1], c[2]);
  rect(x, y, 14, h, 10, 0, 0, 10);
  textAlign(LEFT, CENTER);
  fill(255);
  textSize(Math.min(26, h * 0.5));
  text(`${opts.place || place}.`, x + 26, y + h / 2);
  mpColorChip(x + 86, y + h / 2, h * 0.45, c);
  const name = p.name + (p.alive ? '' : '  ✝');
  fitTextSize(name, Math.min(24, h * 0.46), w - 110 - 420);
  fill(p.alive ? 255 : 170);
  text(name, x + 110, y + h / 2);
  textAlign(RIGHT, CENTER);
  fill(255, 215, 110);
  textSize(Math.min(26, h * 0.5));
  text(Math.round(opts.total !== undefined ? opts.total : s.total).toLocaleString(), x + w - 250, y + h / 2);
  textSize(Math.min(15, h * 0.3));
  fill(190, 220, 255);
  text(`beetle ${Math.round(opts.beetle !== undefined ? opts.beetle : s.beetle).toLocaleString()}`, x + w - 120, y + h / 2 - h * 0.18);
  fill(255, 170, 150);
  text(`ants ${Math.round(opts.ants !== undefined ? opts.ants : s.ants).toLocaleString()}`, x + w - 120, y + h / 2 + h * 0.18);
  if (opts.delta) {
    fill(opts.delta > 0 ? color(120, 255, 140) : color(255, 120, 120));
    textSize(Math.min(16, h * 0.32));
    text((opts.delta > 0 ? '▲' : '▼') + Math.abs(opts.delta), x + w - 14, y + h / 2);
  }
  pop();
}

// After each combat turn (but the round's last): the rows slide on, the totals count up, then anyone who climbed
// lifts off the board, swings around the players they passed and slams into their new place
const MP_BOARD_IN = 34;       // Rows finish sliding on
const MP_BOARD_COUNT = 64;    // Totals finish counting
const MP_BOARD_CLIMB = 46;    // Each climber's trip, ending in its slam

function mpDrawTurnBoard(inp) {
  const b = mp.board;
  const lc = mp.lastCombat;
  const p = mp.players[lc.player];
  const f = mp.phaseFrames;
  const W = getMenuWidth();
  mpBackground([24, 18, 30]);
  mpTitle(lc.died ? `${p.name}'s beetle was defeated!` : `${p.name} survived round ${mp.round}`, 50, 40);
  push();
  textAlign(CENTER, CENTER);
  let line = `+${lc.beetleGain.toLocaleString()} beetle points`;
  if (lc.died && lc.killer !== null && lc.killer >= 0) line += `  ·  Killed by ${mp.players[lc.killer].name}'s ${mpLastKillWasQueen ? 'queen' : 'ants'}`;
  fitTextSize(line, 18, W - 80);
  fill(220);
  text(line, W / 2, 95);
  pop();

  const n = b.after.length;
  const rowH = Math.min(58, 420 / n);
  const top = 130;
  const x0 = 140, w = W - 280;
  const count = mpEase(constrain((f - MP_BOARD_IN) / (MP_BOARD_COUNT - MP_BOARD_IN), 0, 1));
  // Climbers go one after another (the one landing highest first), each with its own slam
  if (!b.climbs) {
    b.climbs = {};
    let i = 0;
    b.after.forEach((s, k) => {
      const was = b.before.findIndex(q => q.index === s.index);
      if (was > k) {
        const start = MP_BOARD_COUNT + i * 16;
        b.climbs[s.index] = { start: start, end: start + MP_BOARD_CLIMB };
        i++;
      }
    });
    b.moveEnd = MP_BOARD_COUNT + Math.max(0, i - 1) * 16 + MP_BOARD_CLIMB;
    b.dust = [];
  }
  // How far along each climber's trip is (0 to 1, eased the way it moves)
  const climbT = {};
  b.after.forEach((s2, k) => {
    const c = b.climbs[s2.index];
    if (!c) return;
    const was = b.before.findIndex(q => q.index === s2.index);
    const u = constrain((f - c.start) / (c.end - c.start), 0, 1);
    climbT[s2.index] = { t: u * u, was: was, k: k, done: f >= c.end };
  });
  // A row that drops steps down at the moment each climber that overtakes it goes past, and is always exactly on its
  // new place once every climber has landed
  const dropPos = (was, k) => {
    const passing = Object.values(climbT).filter(c => c.was > was && c.k < k);
    if (!passing.length) return k;
    let moved = 0;
    for (const c of passing) {
      if (c.done) { moved++; continue; }
      // The point in the climber's trip where it reaches this row
      const cross = constrain((c.was - was) / (c.was - c.k), 0, 1);
      moved += mpEase(constrain((c.t - cross + 0.2) / 0.3, 0, 1));
    }
    return lerp(was, k, moved / passing.length);
  };

  // Rows that fell or stayed are drawn first, then climbers (the one moving now on top)
  const rows = b.after.map((s, k) => ({ s: s, k: k, was: b.before.findIndex(q => q.index === s.index), c: b.climbs[s.index] }));
  rows.sort((a, c) => (a.c ? a.c.start : -1) - (c.c ? c.c.start : -1));
  for (const r of rows) {
    const old = b.before[r.was];
    const c = r.c;
    // Sliding on from the right, one after another
    const slide = mpEase(constrain((f - r.was * 4) / 22, 0, 1));
    let dx = (1 - slide) * (W + 40);
    let y, sc = 1, sy = 1, lift = 0;
    const since = c ? f - c.end : -1;
    if (c) {
      // Up and over: lifts off, swings out to the left around the rows it passes, and speeds into the landing
      const u = constrain((f - c.start) / (c.end - c.start), 0, 1);
      y = top + lerp(r.was, r.k, u * u) * (rowH + 6);
      lift = Math.sin(Math.PI * u);
      dx -= lift * 90;
      sc = 1 + 0.14 * lift;
      if (since === 0 && !c.slammed) {
        // The slam: shake (unless the whole change was small) and dust off both ends
        c.slammed = true;
        mp.shake = Math.max(mp.shake, b.shakeAmount || 0);
        const ly = top + r.k * (rowH + 6);
        for (let d = 0; d < 26; d++) {
          const side = d % 2 ? 1 : -1;
          b.dust.push({ x: side > 0 ? x0 + w : x0, y: ly + Math.random() * rowH, vx: side * (1 + Math.random() * 4), vy: (Math.random() - 0.5) * 3,
            life: 30 + Math.random() * 15, rgb: mp.players[r.s.index].color });
        }
      }
      if (since >= 0 && since < 10) {
        const q = 1 - since / 10;
        sy = 1 - 0.16 * q;
        sc = 1 + 0.06 * q;
      }
    } else {
      // Pushed down out of the climbers' way (or not moving at all)
      y = top + (r.was < r.k ? dropPos(r.was, r.k) : r.was) * (rowH + 6);
    }
    push();
    translate(x0 + dx + w / 2, y + rowH / 2);
    if (lift > 0.01) {
      noStroke();
      fill(0, 0, 0, 120 * lift);
      rect(-w / 2 * sc + 12, -rowH / 2 + 16 * lift, w * sc, rowH * sc, 10);
    }
    scale(sc, sc * sy);
    const landed = c ? since >= 0 : f >= b.moveEnd;
    mpDrawBoardRow(r.s, r.k + 1, -w / 2, -rowH / 2, w, rowH, {
      total: lerp(old.total, r.s.total, count), beetle: lerp(old.beetle, r.s.beetle, count), ants: lerp(old.ants, r.s.ants, count),
      delta: landed ? r.was - r.k : 0,
      place: landed ? r.k + 1 : r.was + 1,
      solid: true
    });
    // A flash on landing
    if (since >= 0 && since < 14) {
      noStroke();
      fill(255, 255, 255, 170 * (1 - since / 14));
      rect(-w / 2, -rowH / 2, w, rowH, 10);
    }
    pop();
  }
  push();
  noStroke();
  for (let k = b.dust.length - 1; k >= 0; k--) {
    const d = b.dust[k];
    if (--d.life <= 0) { b.dust.splice(k, 1); continue; }
    d.x += d.vx;
    d.y += d.vy;
    d.vx *= 0.92;
    d.vy *= 0.92;
    fill(d.rgb[0], d.rgb[1], d.rgb[2], 220 * d.life / 45);
    ellipse(d.x, d.y, 4 + d.life * 0.2);
  }
  pop();
  // The first press skips ahead to the last landing; the next one goes on
  if (f < b.moveEnd + 20) {
    if (f > 10 && f < b.moveEnd - 1 && (inp.confirm || inp.click)) mp.phaseFrames = b.moveEnd - 1;
    return;
  }
  mpContinueHint('Next turn');
  if (inp.confirm || inp.click) {
    mp.shake = 0;
    mpNextCombatTurn();
  }
}

function mpEase(t) {
  return t * t * (3 - 2 * t);
}

function mpContinueHint(what) {
  push();
  textAlign(CENTER, CENTER);
  textSize(18);
  fill(230, 230, 230, 160 + 80 * Math.sin(frameCount * 0.1));
  text(`${what}: A, Enter or click`, getMenuWidth() / 2, getMenuHeight() - 26);
  pop();
}

// End of a round: one big static sheet of where everyone stands
function mpDrawRoundBoard(inp) {
  mpBackground();
  mpTitle(`End of round ${mp.board.round}`, 46, 44);
  const n = mp.board.after.length;
  const rowH = Math.min(58, 430 / n);
  const top = 100;
  push();
  textAlign(LEFT, CENTER);
  textSize(14);
  fill(170);
  text('Upgrade levels', getMenuWidth() - 300, top - 14);
  pop();
  mp.board.after.forEach((s, k) => {
    const p = mp.players[s.index];
    const y = top + k * (rowH + 6);
    const slide = mpEase(constrain((mp.phaseFrames - k * 4) / 22, 0, 1));
    push();
    translate((1 - slide) * (getMenuWidth() + 40), 0);
    mpDrawBoardRow(s, k + 1, 60, y, getMenuWidth() - 380, rowH);
    textAlign(LEFT, CENTER);
    textSize(Math.min(20, rowH * 0.4));
    fill(150, 255, 170);
    text(`${mpLevelsAvailable(p)} to spend`, getMenuWidth() - 300, y + rowH / 2 - 8);
    textSize(13);
    fill(p.alive ? color(200) : color(255, 140, 140));
    text(p.alive ? (p.queen.meter >= MP_QUEEN_METER_FULL ? 'queen ready' : '') : `out in round ${p.diedRound}`, getMenuWidth() - 300, y + rowH / 2 + 12);
    pop();
  });
  if (mp.phaseFrames > 30) mpContinueHint(`${mp.players[0].name}, choose your upgrades`);
  if (mp.phaseFrames > 30 && (inp.confirm || inp.click)) mpStartUpgradePhase();
}
