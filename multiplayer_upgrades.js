// ========== MULTIPLAYER UPGRADE TURN ==========
// Each player's turn in the upgrade phase, on two tabs:
// - Beetle: like the normal game, each upgrade level buys one of three random upgrades.
// - Ants: design the ants, and upgrade or send the queen. Everything is a click: a stepped stat goes up a step, a
//   choice is picked straight from its options. Gene caps, abilities and small sizes are paid in upgrade levels
//   (MP_LEVELS_PER_TOKEN levels for each gene token they'd cost), so there's no separate token to make.

function mpOpenUpgradeTurn() {
  const p = mp.players[mp.upgradeTurn];
  mpLoadBeetle(p);
  mp.up = {
    tab: p.alive ? 'beetle' : 'ants',
    cardSel: 0,
    antSel: 0,
    chipSel: 0,
    chipFor: -1,
    msg: '',
    msgFrames: 0,
    suggestions: mpComputeSuggestions(p),
    followed: new Set(),
    targetPick: null,
    dragging: null
  };
  if (p.alive && (!p.offer || p.offer.length === 0)) mpRollOffer(p);
  mpSetPhase('upgrade');
}

function mpSay(msg) {
  mp.up.msg = msg;
  mp.up.msgFrames = 150;
}

function mpSpendLevels(p, n) {
  if (mpLevelsAvailable(p) < n) return false;
  p.levelsSpent += n;
  return true;
}

// ---------- Paying for genes ----------
// Prices are kept in gene tokens (the main game's prices); multiplayer pays them in upgrade levels.

function mpTokenLevels(tokens) {
  return tokens * MP_LEVELS_PER_TOKEN;
}

function mpLevelsText(tokens) {
  const n = mpTokenLevels(tokens);
  return `${n} level${n === 1 ? '' : 's'}`;
}

// Pay a price in tokens: any tokens left over from before come first, then upgrade levels
function mpPayTokens(p, tokens) {
  const banked = Math.min(p.geneTokens || 0, tokens);
  const levels = mpTokenLevels(tokens - banked);
  if (mpLevelsAvailable(p) < levels) return false;
  p.geneTokens -= banked;
  p.levelsSpent += levels;
  return true;
}

function mpRefundTokens(p, tokens) {
  p.levelsSpent = Math.max(0, p.levelsSpent - mpTokenLevels(tokens));
}

// ---------- The screen ----------

const MP_TABS = ['beetle', 'ants'];
const MP_TAB_NAMES = { beetle: 'Beetle', ants: 'Ants & Queen' };
const MP_NO_INPUT = { up: false, down: false, left: false, right: false, confirm: false, back: false, click: false,
  tabLeft: false, tabRight: false, done: false, token: false, heldFrames: 0 };

function mpDrawUpgrade(inp) {
  const p = mp.players[mp.upgradeTurn];
  const up = mp.up;
  const t = mp.phaseFrames;
  const W = getMenuWidth(), H = getMenuHeight();
  p.stats.upgradeFrames++;
  if (up.msgFrames > 0) up.msgFrames--;
  if (!up.fx) { up.fx = []; up.levelPulse = 0; up.focus = { x: W / 2, y: H / 2 }; up.lastLevels = mpLevelsAvailable(p); }
  // While picking the queen's target, the page underneath doesn't take input
  const picking = up.targetPick !== null;
  const pageInp = picking ? MP_NO_INPUT : inp;
  const c = p.color;
  const ink = mpTextColorOn(c);

  mpUpgradeBackdrop(c, t);

  // Banner: the player's color, like the handoff, with who and their levels
  push();
  noStroke();
  fill(c[0], c[1], c[2]);
  rect(0, 0, W, 88);
  fill(255, 255, 255, 30);
  for (let k = -2; k < 26; k++) {
    const x = ((k * 70 + t * 1.5) % (W + 140)) - 70;
    quad(x, 0, x + 30, 0, x - 18, 88, x - 48, 88);
  }
  fill(0, 0, 0, 70);
  rect(0, 88, W, 5);
  pop();
  mpDrawMenuBeetle(48, 44 + Math.sin(t * 0.08) * 3, 64, Math.sin(t * 0.05) * 0.15, c);
  push();
  noStroke();
  textAlign(LEFT, CENTER);
  fill(ink[0], ink[1], ink[2]);
  fitTextSize(p.name, 32, 350);
  text(p.name, 90, 34);
  const roundLine = `${mp.preGame ? 'Starting upgrades' : `Round ${mp.round} upgrades`}${p.alive ? '' : '  ·  beetle out, ants fight on'}`;
  fitTextSize(roundLine, 15, 350);
  fill(ink[0], ink[1], ink[2], 200);
  text(roundLine, 90, 64);
  pop();

  // The level counter: a white pill that pops whenever levels are spent or refunded
  const levels = mpLevelsAvailable(p);
  if (levels !== up.lastLevels) { up.levelPulse = 1; up.lastLevels = levels; }
  up.levelPulse *= 0.88;
  push();
  const pill = { x: W - 250, y: 10, w: 230, h: 42 };
  const s = 1 + 0.18 * up.levelPulse;
  translate(pill.x + pill.w / 2, pill.y + pill.h / 2);
  scale(s);
  noStroke();
  fill(0, 0, 0, 60);
  rect(-pill.w / 2 + 3, -pill.h / 2 + 4, pill.w, pill.h, 21);
  fill(255);
  rect(-pill.w / 2, -pill.h / 2, pill.w, pill.h, 21);
  textAlign(CENTER, CENTER);
  const levelLine = `${levels} upgrade level${levels === 1 ? '' : 's'}`;
  fitTextSize(levelLine, 24, pill.w - 24);
  fill(levels > 0 ? color(30, 150, 70) : color(150));
  text(levelLine, 0, 1);
  pop();
  // Progress to the next level
  const prog = mpLevelProgress(p);
  push();
  noStroke();
  fill(0, 0, 0, 70);
  rect(W - 250, 60, 230, 8, 4);
  fill(255);
  rect(W - 250, 60, 230 * constrain(prog.into / prog.need, 0, 1), 8, 4);
  if (p.geneTokens > 0) {
    textAlign(RIGHT, CENTER);
    textSize(13);
    fill(ink[0], ink[1], ink[2]);
    text(`+ ${p.geneTokens} saved gene token${p.geneTokens > 1 ? 's' : ''}`, W - 20, 78);
  }
  pop();

  // Tabs
  if (!picking) {
    let tb = MP_TABS.indexOf(up.tab);
    if (inp.tabLeft) tb = (tb + MP_TABS.length - 1) % MP_TABS.length;
    if (inp.tabRight) tb = (tb + 1) % MP_TABS.length;
    up.tab = MP_TABS[tb];
  }
  MP_TABS.forEach((tab, k) => {
    const r = { x: W / 2 - 185 + k * 190, y: 14, w: 180, h: 44 };
    mpTabPill(r, MP_TAB_NAMES[tab], up.tab === tab, c, ink);
    if (!picking && inp.click && mpMouseIn(r)) up.tab = tab;
  });
  push();
  textAlign(CENTER, CENTER);
  textSize(12);
  fill(ink[0], ink[1], ink[2], 170);
  text('LB / RB or Q / E to switch tabs', W / 2, 74);
  pop();

  // Footer band, so the help and messages read over the stripes
  push();
  noStroke();
  fill(0, 0, 0, 120);
  rect(0, H - 58, W, 58);
  pop();

  if (up.tab === 'beetle') mpDrawBeetleShop(p, pageInp);
  else mpDrawAntDesigner(p, pageInp);

  const doneBtn = { x: W - 224, y: H - 50, w: 200, h: 40 };
  const doneHot = mpMouseIn(doneBtn);
  mpButton(doneBtn, 'Done  [F / X]', doneHot, { color: [120, 220, 140], size: 18 });
  if (up.msgFrames > 0) {
    push();
    textAlign(LEFT, CENTER);
    fitTextSize(up.msg, 17, W - 280);
    fill(255, 230, 150, Math.min(255, up.msgFrames * 6));
    text(up.msg, 24, H - 30);
    pop();
  }

  // Spending sets off confetti where it happened; a refund floats back up in green
  const spent = p.levelsSpent - (up.lastSpent === undefined ? p.levelsSpent : up.lastSpent);
  up.lastSpent = p.levelsSpent;
  if (spent !== 0) {
    const at = inp.click ? { x: getMenuMouseX(), y: getMenuMouseY() } : up.focus;
    mpUpgradeBurst(at, spent, c);
  }
  mpDrawUpgradeFx();

  if (picking) {
    mpDrawQueenTargetPick(p, inp);
    return;
  }
  if (inp.done || (inp.click && doneHot)) mpFinishUpgradeTurn();
}

// The upgrade screen's backdrop: the player's color, dimmed, with slow stripes and drifting bubbles
function mpUpgradeBackdrop(c, t) {
  const W = getMenuWidth(), H = getMenuHeight();
  push();
  noStroke();
  fill(c[0] * 0.2 + 10, c[1] * 0.2 + 10, c[2] * 0.2 + 14);
  rect(0, 0, W, H);
  fill(c[0], c[1], c[2], 26);
  for (let k = -2; k < 14; k++) {
    const x = ((k * 140 + t * 0.7) % (W + 280)) - 140;
    quad(x, 0, x + 60, 0, x - 140, H, x - 200, H);
  }
  for (let k = 0; k < 16; k++) {
    const bx = ((k * 97.3 + t * (0.25 + (k % 3) * 0.15)) % (W + 80)) - 40;
    const by = (k * 173.7) % H + Math.sin(t * 0.02 + k) * 16;
    const hue = MP_FUN_COLORS[k % MP_FUN_COLORS.length];
    fill(hue[0], hue[1], hue[2], 16 + (k % 4) * 5);
    ellipse(bx, by, 16 + (k % 5) * 12);
  }
  pop();
}

const MP_TIER_COLORS = { 'Common': [110, 215, 120], 'Uncommon': [70, 195, 230], 'Medium': [95, 135, 255], 'Very Rare': [200, 90, 255], 'Ultra Rare': [255, 180, 0] };
const MP_FUN_COLORS = [[255, 110, 200], [90, 210, 255], [255, 200, 70], [140, 240, 120], [190, 140, 255], [255, 140, 80]];

function mpTabPill(r, label, sel, c, ink) {
  push();
  noStroke();
  if (sel) {
    fill(0, 0, 0, 60);
    rect(r.x + 2, r.y + 4, r.w, r.h, 22);
    fill(255);
  } else {
    fill(0, 0, 0, mpMouseIn(r) ? 90 : 55);
  }
  rect(r.x, r.y, r.w, r.h, 22);
  textAlign(CENTER, CENTER);
  textSize(20);
  // On the white pill the label takes the player's color (darkened so light colors still read)
  const dark = (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) > 150 ? 0.55 : 1;
  if (sel) fill(c[0] * dark, c[1] * dark, c[2] * dark);
  else fill(ink[0], ink[1], ink[2]);
  text(label, r.x + r.w / 2, r.y + r.h / 2);
  pop();
}

function mpUpgradeBurst(at, spent, c) {
  const fx = mp.up.fx;
  if (spent > 0) {
    const n = 14 + Math.min(4, spent) * 6;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const v = 2 + Math.random() * 5;
      const hue = k % 3 === 0 ? c : MP_FUN_COLORS[k % MP_FUN_COLORS.length];
      fx.push({ kind: 'bit', x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        life: 50 + Math.random() * 20, max: 70, rgb: hue, w: 5 + Math.random() * 5, h: 3 + Math.random() * 3 });
    }
  }
  fx.push({ kind: 'text', x: at.x, y: at.y - 14, vx: 0, vy: -1.2, life: 60, max: 60,
    label: spent > 0 ? `-${spent} level${spent === 1 ? '' : 's'}` : `+${-spent} refunded`, rgb: spent > 0 ? [255, 230, 120] : [140, 255, 160] });
}

function mpDrawUpgradeFx() {
  const fx = mp.up.fx;
  push();
  for (let k = fx.length - 1; k >= 0; k--) {
    const f = fx[k];
    f.life--;
    if (f.life <= 0) { fx.splice(k, 1); continue; }
    f.x += f.vx;
    f.y += f.vy;
    const a = 255 * Math.min(1, f.life / 20);
    if (f.kind === 'bit') {
      f.vy += 0.22;
      f.vx *= 0.97;
      f.rot += f.vr;
      push();
      translate(f.x, f.y);
      mpRotate(f.rot);
      noStroke();
      fill(f.rgb[0], f.rgb[1], f.rgb[2], a);
      rectMode(CENTER);
      rect(0, 0, f.w, f.h, 1);
      pop();
    } else {
      f.vy *= 0.97;
      textAlign(CENTER, CENTER);
      textSize(22);
      stroke(0, 0, 0, a * 0.8);
      strokeWeight(4);
      fill(f.rgb[0], f.rgb[1], f.rgb[2], a);
      text(f.label, f.x, f.y);
    }
  }
  pop();
}

// ---------- Beetle: one of three ----------

// Three random upgrades, picked the way the normal game picks them. They stay until one is bought, so switching tabs
// or ending the turn doesn't reroll them.
function mpRollOffer(p) {
  const saved = displayedUpgrades;
  pickUpgradeOptions();
  p.offer = displayedUpgrades.slice();
  displayedUpgrades = saved;
}

function mpDrawBeetleShop(p, inp) {
  const up = mp.up;
  const W = getMenuWidth();
  if (!p.alive) {
    push();
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(220);
    text(`${p.name}'s beetle is out, so there's nothing left to upgrade on it.`, W / 2, 260);
    textSize(18);
    fill(170);
    text('Your ants still fight in every other player\'s turn: design them on the Ants & Queen tab, or send your queen.', W / 2, 300);
    pop();
    return;
  }
  const offer = p.offer || [];
  if (offer.length === 0) {
    push();
    textAlign(CENTER, CENTER);
    textSize(22);
    fill(200);
    text('Every upgrade your beetle can get is maxed out.', W / 2, 280);
    pop();
    return;
  }
  const levels = mpLevelsAvailable(p);
  const cards = getAllUpgradeCards();
  up.cardSel = constrain(up.cardSel, 0, offer.length - 1);
  if (inp.left) up.cardSel = Math.max(0, up.cardSel - 1);
  if (inp.right) up.cardSel = Math.min(offer.length - 1, up.cardSel + 1);
  const cw = 360, ch = 390, gap = 30;
  const x0 = W / 2 - (offer.length * cw + (offer.length - 1) * gap) / 2;
  if (!up.cardLift) up.cardLift = [0, 0, 0];
  let picked = -1;
  offer.forEach((id, k) => {
    const base = { x: x0 + k * (cw + gap), y: 112, w: cw, h: ch };
    if (mpMouseIn(base) && mpMouseMoved()) up.cardSel = k;
    if (inp.click && mpMouseIn(base)) picked = k;
    const sel = up.cardSel === k;
    up.cardLift[k] = lerp(up.cardLift[k] || 0, sel ? 1 : 0, 0.2);
    const lift = up.cardLift[k];
    const r = { x: base.x, y: base.y - 12 * lift + (sel ? Math.sin(mp.phaseFrames * 0.08) * 2 : 0), w: cw, h: ch };
    if (sel) up.focus = { x: r.x + r.w / 2, y: r.y + 120 };
    const card = cards[id] || { title: UPGRADE_NAMES[id], description: '' };
    const tier = getUpgradeRarityTier(id);
    const tc = MP_TIER_COLORS[tier] || [140, 240, 120];
    const lv = p.upgrades[id];
    const max = UPGRADE_MAX_LEVELS[id];
    push();
    rectMode(CORNER);
    noStroke();
    // Shadow, then a glow in the tier's color for the selected card
    fill(0, 0, 0, 90);
    rect(r.x + 5, r.y + 9, r.w, r.h, 18);
    if (lift > 0.05) {
      fill(tc[0], tc[1], tc[2], 70 * lift);
      rect(r.x - 8, r.y - 8, r.w + 16, r.h + 16, 24);
    }
    // The body, washed toward the tier's color at the top
    fill(tc[0] * 0.18 + 20, tc[1] * 0.18 + 20, tc[2] * 0.18 + 26);
    rect(r.x, r.y, r.w, r.h, 18);
    for (let b = 0; b < 10; b++) {
      fill(tc[0], tc[1], tc[2], 34 - b * 3.4);
      rect(r.x, r.y + 70 + b * 16, r.w, 16);
    }
    // The tier ribbon across the top
    fill(tc[0], tc[1], tc[2]);
    rect(r.x, r.y, r.w, 70, 18, 18, 0, 0);
    fill(255, 255, 255, 40);
    for (let s2 = 0; s2 < 8; s2++) {
      const sx = r.x + ((s2 * 60 + mp.phaseFrames * (sel ? 1.2 : 0.4)) % (r.w + 60)) - 30;
      quad(Math.max(r.x, sx), r.y, Math.min(r.x + r.w, sx + 22), r.y, Math.min(r.x + r.w, Math.max(r.x, sx + 4)), r.y + 70, Math.max(r.x, sx - 18), r.y + 70);
    }
    const tink = mpTextColorOn(tc);
    textAlign(CENTER, CENTER);
    fill(tink[0], tink[1], tink[2], 210);
    textSize(13);
    text(tier.toUpperCase(), r.x + r.w / 2, r.y + 16);
    fill(tink[0], tink[1], tink[2]);
    fitTextSize(card.title, 28, r.w - 30);
    text(card.title, r.x + r.w / 2, r.y + 44);
    // Level pips: what you have, and the one this buys (pulsing)
    const pipW = Math.min(30, (r.w - 60) / Math.max(1, max));
    const px0 = r.x + r.w / 2 - (pipW * max) / 2 + pipW / 2;
    for (let q = 0; q < max; q++) {
      if (q < lv) fill(tc[0], tc[1], tc[2]);
      else if (q === lv) fill(255, 255, 255, 140 + 110 * Math.sin(mp.phaseFrames * 0.15));
      else fill(255, 255, 255, 30);
      ellipse(px0 + q * pipW, r.y + 98, Math.min(18, pipW - 6));
    }
    textSize(16);
    fill(255);
    text(`Level ${lv}  →  ${lv + 1}`, r.x + r.w / 2, r.y + 126);
    fill(225);
    textAlign(LEFT, TOP);
    mpFitBox(card.description, 17, r.w - 48, 170);
    text(card.description, r.x + 24, r.y + 152, r.w - 48, 175);
    // The buy strip along the bottom
    const strip = { x: r.x + 20, y: r.y + r.h - 56, w: r.w - 40, h: 38 };
    fill(levels > 0 ? (sel ? color(255) : color(255, 255, 255, 40)) : color(60));
    rect(strip.x, strip.y, strip.w, strip.h, 19);
    textAlign(CENTER, CENTER);
    textSize(16);
    fill(levels > 0 ? (sel ? color(tc[0] * 0.6, tc[1] * 0.6, tc[2] * 0.6) : color(255)) : color(150));
    text(levels > 0 ? 'Take it  ·  1 level' : 'No upgrade levels left', strip.x + strip.w / 2, strip.y + strip.h / 2);
    pop();
  });
  // Reroll: a few for the whole game, like a run's
  const rerolls = p.rerolls === undefined ? UPGRADE_REROLLS_PER_RUN : p.rerolls;
  const rr = { x: W / 2 - 140, y: 520, w: 280, h: 40 };
  const canReroll = rerolls > 0 && mpCanReroll(p);
  mpButton(rr, `R / Y  Reroll  (${rerolls} left)`, canReroll && mpMouseIn(rr), { color: [255, 200, 70], size: 17, disabled: !canReroll });
  if (inp.reroll || (inp.click && mpMouseIn(rr))) {
    if (!canReroll) mpSay(rerolls > 0 ? 'There\'s nothing else to reroll into.' : 'No rerolls left this game.');
    else {
      p.rerolls = rerolls - 1;
      upgradeRerolls = p.rerolls;
      const saved = displayedUpgrades;
      pickUpgradeOptions(p.offer);
      p.offer = displayedUpgrades.slice();
      displayedUpgrades = saved;
      up.cardSel = constrain(up.cardSel, 0, p.offer.length - 1);
      up.cardLift = [0, 0, 0];
      mpSay(`Rerolled. ${p.rerolls} reroll${p.rerolls === 1 ? '' : 's'} left this game.`);
    }
    return;
  }
  push();
  textAlign(CENTER, CENTER);
  textSize(14);
  fill(220);
  text('Each upgrade level picks one of three, like the normal game. A new three comes up after each pick.', W / 2, 578);
  pop();
  if (inp.confirm) picked = up.cardSel;
  if (picked < 0) return;
  up.cardSel = picked;
  const id = offer[picked];
  if (!mpSpendLevels(p, 1)) {
    mpSay('No upgrade levels left. Earn points to get more.');
    return;
  }
  p.upgrades[id]++;
  setUpgradeLevel(id, p.upgrades[id]);
  mpSay(`${UPGRADE_NAMES[id]} is now level ${p.upgrades[id]}.`);
  mpRollOffer(p);
}

// The normal game's check: is there some upgrade not already on offer to roll into?
function mpCanReroll(p) {
  const saved = displayedUpgrades;
  displayedUpgrades = p.offer || [];
  const ok = canRerollUpgrades();
  displayedUpgrades = saved;
  return ok;
}

// ---------- Ants & Queen ----------

const MP_SLIDER_ORDER = ['distanceFromAnchor', 'anchorOffsetX', 'anchorOffsetY', 'standingPointX', 'standingPointY', 'angleFromSpawn'];
const MP_ABILITY_STAT_ORDER = ['bulletBurstCount', 'bulletBurstSpread', 'bulletBurstDelay', 'bulletCooldownMultiplier', 'alarmInnerRadius',
  'bulletArcDuration', 'bulletCurveStrength', 'bulletAccelerateDelay', 'blinkDelay', 'bulletExplodeAfter', 'explosionProximity',
  'bulletKnockbackMultiplier', 'bulletCamoFlashRate', 'bunkerRange', 'radiusMultiplier', 'residueMultiplier'];
const MP_SIZE_CHIPS = ['1/3', '1/2', 'Full', '1.25x', '1.5x', '2x', '2.5x', '3x'];
const MP_TARGET_CHIPS = ['Beetle', 'Other ants', 'A spot', 'Spawn'];
const MP_STYLE_CHIPS = ['Mimic movement', 'Keep a distance'];

const MP_QUEEN_ROWS = [
  { key: 'health', label: 'Queen health', max: 7, value: lv => `${MP_QUEEN_HEALTH[lv]} health` },
  { key: 'guardCount', label: 'Royal guards', max: 5, value: lv => lv ? `${MP_QUEEN_GUARD_COUNT[lv]} each time` : 'none' },
  { key: 'guardFreq', label: 'Guards every', max: 3, value: lv => `${MP_QUEEN_GUARD_SECONDS[lv].toFixed(1).replace('.0', '')} s` },
  { key: 'fireRate', label: 'Queen attacks every', max: 6, value: lv => `${MP_QUEEN_FIRE_SECONDS[lv]} s` }
];

const MP_ROW_H = 25;
const MP_ABILITY_ROW_H = 46;
const MP_COL_W = 600;
const MP_COL_X = [24, 656];
const MP_LIST_TOP = 100, MP_LIST_BOTTOM = 592;

// Each section has its own color: its header ribbon, its rows' edge, and the chips picked in it
const MP_SECTION_HUES = { body: [80, 205, 255], shoot: [255, 150, 70], ability: [255, 105, 195], abilityStats: [160, 140, 255], queen: [205, 135, 255] };

function mpDesignRows(p) {
  const d = p.design;
  const rel = mpRelevantStats(d);
  const rows = [];
  let hue = MP_SECTION_HUES.body;
  const add = r => rows.push(Object.assign(r, { hue: hue }));
  const section = (label, h) => { hue = h; add({ type: 'header', label: label }); };
  const stat = k => add(MP_STEPPED[k] ? { type: 'stepped', key: k } : { type: 'slider', key: k });
  section('Body and movement', MP_SECTION_HUES.body);
  add({ type: 'chips', key: 'size', label: 'Size' });
  stat('antSpeed');
  add({ type: 'chips', key: 'move', label: 'Target' });
  add({ type: 'chips', key: 'keepDistance', label: 'Movement style' });
  for (const k of MP_SLIDER_ORDER) if (rel.has(k)) stat(k);
  section('Shooting', MP_SECTION_HUES.shoot);
  ['bulletSpeed', 'bulletCooldown', 'bulletSize', 'shotOffsetX', 'shotOffsetY'].forEach(stat);
  section(`Abilities  (${mpLevelsText(ABILITY_TOKEN_COST)} each; click again for level 2)`, MP_SECTION_HUES.ability);
  for (const cat in MP_ABILITIES) add({ type: 'ability', cat: cat });
  const extra = MP_ABILITY_STAT_ORDER.filter(k => rel.has(k));
  if (extra.length) {
    section('Ability stats', MP_SECTION_HUES.abilityStats);
    extra.forEach(stat);
  }
  section('Queen', MP_SECTION_HUES.queen);
  MP_QUEEN_ROWS.forEach(q => add({ type: 'queen', q: q }));
  add({ type: 'send' });
  return rows;
}

// Lay the rows out down the first column, then the second. A long design (many abilities and their stats) squeezes
// the rows a little so it all still fits on the page.
function mpLayoutDesign(rows) {
  for (let squeeze = 0; ; squeeze++) {
    const rowH = MP_ROW_H - squeeze, abilityH = MP_ABILITY_ROW_H - squeeze;
    const out = mpLayoutDesignAt(rows, rowH, abilityH);
    if (out.fits || rowH <= 17) return out.items;
  }
}

function mpLayoutDesignAt(rows, rowH, abilityH) {
  const items = [];
  const hOf = row => row.type === 'ability' ? abilityH : rowH;
  // Split into sections (a header and its rows)
  const sections = [];
  for (const row of rows) {
    if (row.type === 'header' || !sections.length) sections.push([]);
    sections[sections.length - 1].push(row);
  }
  const colH = MP_LIST_BOTTOM - MP_LIST_TOP;
  let col = 0, y = MP_LIST_TOP;
  const place = row => {
    const h = hOf(row);
    if (y + h > MP_LIST_BOTTOM && y > MP_LIST_TOP) {
      col++;
      y = MP_LIST_TOP;
    }
    items.push({ row: row, x: MP_COL_X[Math.min(col, 1)] + Math.max(0, col - 1) * 2000, y: y, w: MP_COL_W, h: h });
    y += h + 2;
  };
  for (const sec of sections) {
    const secH = sec.reduce((a, row) => a + hOf(row) + 2, 0) - 2;
    // A section that won't fit what's left of this column starts the next one, so it's never cut in two
    // (unless it's taller than a whole column)
    if (secH <= colH && y + secH > MP_LIST_BOTTOM && y > MP_LIST_TOP) {
      col++;
      y = MP_LIST_TOP;
    }
    sec.forEach(place);
  }
  return { items: items, fits: col <= 1 };
}

// The options a chip row offers: [{ label, current, apply() -> message }]
function mpChips(p, row) {
  const d = p.design;
  if (row.type === 'chips' && row.key === 'size') {
    return MP_SIZES.map((s, k) => ({ label: MP_SIZE_CHIPS[k], current: d.size === k, cost: s.tokens, apply: () => mpSetSize(p, k) }));
  }
  if (row.type === 'chips' && row.key === 'move') {
    return MP_TARGET_CHIPS.map((l, k) => ({ label: l, current: d.move === k, apply: () => { d.move = k; return null; } }));
  }
  if (row.type === 'chips' && row.key === 'keepDistance') {
    return MP_STYLE_CHIPS.map((l, k) => ({ label: l, current: (d.keepDistance ? 1 : 0) === k, apply: () => { d.keepDistance = k === 1; return null; } }));
  }
  if (row.type === 'ability') {
    const cur = d.abilities[row.cat];
    const chips = [{ label: 'None', current: !cur, apply: () => cur ? mpChangeAbility(p, row.cat, null) : null }];
    for (const r of MP_ABILITIES[row.cat]) {
      const mine = cur && cur.stat === r[0];
      chips.push({
        label: mine && cur.level === 2 ? r[2] + ' (lv 2)' : r[1],
        current: !!mine,
        level2: mine && cur.level === 2,
        apply: () => mpChangeAbility(p, row.cat, { stat: r[0], level: mine && cur.level === 1 ? 2 : 1 })
      });
    }
    return chips;
  }
  return null;
}

function mpChipRects(it, count) {
  const ability = it.row.type === 'ability';
  const x = ability ? it.x + 6 : it.x + 170;
  const y = ability ? it.y + it.h - 24 : it.y + 2;
  const w = (it.x + it.w - 6 - x - (count - 1) * 4) / count;
  const h = ability ? 22 : it.h - 4;
  const out = [];
  for (let k = 0; k < count; k++) out.push({ x: x + k * (w + 4), y: y, w: w, h: h });
  return out;
}

function mpDrawAntDesigner(p, inp) {
  const up = mp.up;
  const d = p.design;
  const items = mpLayoutDesign(mpDesignRows(p));
  const pick = items.filter(it => it.row.type !== 'header');
  up.antSel = constrain(up.antSel, 0, pick.length - 1);
  if (inp.up) up.antSel = Math.max(0, up.antSel - 1);
  if (inp.down) up.antSel = Math.min(pick.length - 1, up.antSel + 1);
  let sel = pick[up.antSel];
  // Chip rows: the highlighted chip starts on the current choice
  const selChips = mpChips(p, sel.row);
  if (up.chipFor !== up.antSel) {
    up.chipFor = up.antSel;
    up.chipSel = selChips ? Math.max(0, selChips.findIndex(c => c.current)) : 1;  // Stepped rows start on +
  }

  let msg = null;
  let clicked = null; // { item, chip, side }
  for (const it of items) {
    const isSel = it === sel;
    const chips = mpChips(p, it.row);
    const chipRects = chips ? mpChipRects(it, chips.length) : null;
    if (it.row.type !== 'header' && mpMouseIn(it) && mpMouseMoved()) {
      up.antSel = pick.indexOf(it);
      if (chipRects) {
        const k = chipRects.findIndex(r => mpMouseIn(r));
        if (k >= 0) { up.chipFor = up.antSel; up.chipSel = k; }
      }
    }
    if (it.row.type !== 'header' && inp.click && mpMouseIn(it)) {
      clicked = { item: it, chip: chipRects ? chipRects.findIndex(r => mpMouseIn(r)) : -1,
        minus: it.row.type === 'stepped' && mpMouseIn(mpMinusRect(it)) };
    }
    mpDrawDesignRow(p, it, isSel, chips, chipRects);
  }

  // Help for the selected row
  sel = pick[up.antSel];
  up.focus = { x: sel.x + sel.w / 2, y: sel.y + sel.h / 2 };
  if (up.msgFrames <= 0) {
    push();
    textAlign(LEFT, CENTER);
    fill(225);
    const help = mpDesignRowHelp(p, sel.row);
    mpFitBox(help, 14, getMenuWidth() - 290, 50);
    text(help, 24, getMenuHeight() - 56, getMenuWidth() - 290, 54);
    pop();
  }

  // Clicks
  if (clicked) {
    const row = clicked.item.row;
    up.antSel = pick.indexOf(clicked.item);
    up.chipFor = up.antSel;
    const chips = mpChips(p, row);
    if (chips) {
      if (clicked.chip >= 0) {
        up.chipSel = clicked.chip;
        msg = chips[clicked.chip].apply();
      }
    } else if (row.type === 'stepped') {
      if (clicked.minus) { up.chipSel = 0; msg = mpStepStat(p, row.key, -1); }
      else if (mpMouseIn(mpPlusRect(clicked.item))) { up.chipSel = 1; msg = mpStepStat(p, row.key, 1); }
    } else if (row.type === 'slider') {
      const bar = mpSliderBarRect(clicked.item);
      if (mpMouseIn({ x: bar.x - 10, y: clicked.item.y, w: bar.w + 20, h: clicked.item.h })) up.dragging = row.key;
    } else if (row.type === 'queen') {
      if (mpMouseIn(mpPlusRect(clicked.item))) msg = mpBuyQueenUpgrade(p, row.q);
    } else if (row.type === 'send') {
      msg = mpStartSendQueen(p);
    }
  }

  // Controller and keyboard
  const row = sel.row;
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  const chips = mpChips(p, row);
  if (chips) {
    if (dir) up.chipSel = constrain(up.chipSel + dir, 0, chips.length - 1);
    if (inp.confirm) msg = chips[up.chipSel].apply();
  } else if (row.type === 'stepped') {
    if (dir) up.chipSel = dir < 0 ? 0 : 1;
    if (inp.confirm) msg = mpStepStat(p, row.key, up.chipSel === 0 ? -1 : 1);
  } else if (row.type === 'slider') {
    const def = MP_SLIDERS[row.key];
    const accel = inp.heldFrames > 60 ? 5 : inp.heldFrames > 30 ? 2 : 1;
    let v = d.sliders[row.key];
    if (dir) v += dir * (def.max - def.min) / 100 * accel;
    if (!mouseIsPressed) up.dragging = null;
    if (up.dragging === row.key) {
      const bar = mpSliderBarRect(sel);
      v = lerp(def.min, def.max, constrain((getMenuMouseX() - bar.x) / bar.w, 0, 1));
    }
    v = constrain(v, def.min, def.max);
    const sug = up.suggestions[row.key];
    if (sug && v !== d.sliders[row.key] && Math.sign(v - d.sliders[row.key]) === sug.dir && !up.followed.has(row.key)) {
      up.followed.add(row.key);
      p.stats.suggestionsFollowed++;
    }
    d.sliders[row.key] = v;
  } else if (row.type === 'queen' && inp.confirm) {
    msg = mpBuyQueenUpgrade(p, row.q);
  } else if (row.type === 'send' && inp.confirm) {
    msg = mpStartSendQueen(p);
  }
  if (msg) mpSay(msg);
}

// A row's name, shrunk to fit before the controls start
function mpRowLabel(str, it, y) {
  fitTextSize(str, 14, it.row.type === 'ability' ? it.w - 160 : 152);
  text(str, it.x + 10, y);
  textSize(14);
}

function mpPlusRect(it) {
  return { x: it.x + it.w - 176, y: it.y + 2, w: 170, h: it.h - 4 };
}

// The + button on stepped and queen rows (label null = maxed)
function mpDrawPlusButton(it, label, hot, hue) {
  const r = mpPlusRect(it);
  push();
  rectMode(CORNER);
  textAlign(CENTER, CENTER);
  if (!label) {
    noStroke();
    fill(140, 255, 150);
    textSize(12);
    text('max', r.x + r.w / 2, r.y + r.h / 2);
    pop();
    return;
  }
  const lit = hot || mpMouseIn(r);
  fill(lit ? color(hue[0], hue[1], hue[2]) : color(hue[0] * 0.3 + 20, hue[1] * 0.3 + 20, hue[2] * 0.3 + 26));
  stroke(hot ? 255 : color(hue[0], hue[1], hue[2], 150));
  strokeWeight(hot ? 2 : 1);
  rect(r.x, r.y, r.w, r.h, 5);
  noStroke();
  const ink = lit ? mpTextColorOn(hue) : [235, 235, 235];
  fill(ink[0], ink[1], ink[2]);
  fitTextSize(label, 12, r.w - 8);
  text(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  pop();
}

function mpMinusRect(it) {
  return { x: it.x + 170, y: it.y + 2, w: 26, h: it.h - 4 };
}

function mpSliderBarRect(it) {
  return { x: it.x + 190, y: it.y + it.h / 2, w: it.w - 300 };
}

function mpDrawDesignRow(p, it, selected, chips, chipRects) {
  const d = p.design;
  const row = it.row;
  push();
  rectMode(CORNER);
  const hue = row.hue || MP_SECTION_HUES.body;
  if (row.type === 'header') {
    // A ribbon in the section's color
    noStroke();
    fill(0, 0, 0, 70);
    rect(it.x + 2, it.y + 3, it.w, it.h, 12);
    fill(hue[0], hue[1], hue[2]);
    rect(it.x, it.y, it.w, it.h, 12);
    fill(255, 255, 255, 45);
    for (let k = 0; k < 6; k++) ellipse(it.x + it.w - 20 - k * 16, it.y + it.h / 2, 7);
    const hink = mpTextColorOn(hue);
    fill(hink[0], hink[1], hink[2]);
    textAlign(LEFT, CENTER);
    textSize(15);
    textStyle(BOLD);
    text(row.label, it.x + 12, it.y + it.h / 2);
    pop();
    return;
  }
  noStroke();
  if (selected) {
    fill(hue[0], hue[1], hue[2], 60);
    rect(it.x - 3, it.y - 3, it.w + 6, it.h + 6, 9);
  }
  fill(selected ? color(hue[0] * 0.22 + 26, hue[1] * 0.22 + 26, hue[2] * 0.22 + 32, 240) : color(14, 14, 20, 200));
  if (selected) { stroke(hue[0], hue[1], hue[2]); strokeWeight(2); }
  rect(it.x, it.y, it.w, it.h, 6);
  noStroke();
  // The section's color down the left edge
  fill(hue[0], hue[1], hue[2], selected ? 255 : 170);
  rect(it.x, it.y + 3, 4, it.h - 6, 2);
  textAlign(LEFT, CENTER);
  textSize(14);
  fill(235);
  const midY = row.type === 'ability' ? it.y + (it.h - 24) / 2 + 1 : it.y + it.h / 2;

  if (chips) {
    mpRowLabel(row.type === 'ability' ? `${MP_CATEGORY_NAMES[row.cat]} ability` : row.label, it, midY);
    if (row.type === 'ability') {
      const cur = d.abilities[row.cat];
      if (cur && mpRoundsUntil(cur.since) > 0) {
        textAlign(RIGHT, CENTER);
        textSize(12);
        fill(255, 170, 120);
        text(cur.since === mp.round ? `can undo this turn, then locked until round ${cur.since + GENE_LOCK_ROUNDS}` :
          `locked until round ${cur.since + GENE_LOCK_ROUNDS}`, it.x + it.w - 10, midY);
      }
    }
    chips.forEach((c, k) => {
      const r = chipRects[k];
      const hot = selected && mp.up.chipSel === k;
      const on = c.level2 ? [255, 190, 80] : hue;
      fill(c.current ? color(on[0], on[1], on[2]) : (hot ? color(60, 62, 76) : color(36, 38, 48)));
      stroke(hot ? 255 : c.current ? 255 : color(hue[0], hue[1], hue[2], 70));
      strokeWeight(hot ? 2.5 : 1);
      rect(r.x, r.y, r.w, r.h, 5);
      noStroke();
      fill(c.current ? mpTextColorOn(on) : color(220));
      textAlign(CENTER, CENTER);
      fitTextSize(c.label, 13, r.w - 6);
      text(c.label, r.x + r.w / 2, r.y + r.h / 2);
    });
  } else if (row.type === 'stepped') {
    const s = MP_STEPPED[row.key];
    mpRowLabel(s.label, it, midY);
    const values = mpStepValues(row.key);
    const step = d.steps[row.key];
    // − button, pips (gold ones are gene caps), the value, and a + button saying what the next step costs
    const freeTop = mpFreeTop(row.key);
    const m = mpMinusRect(it);
    const hotMinus = selected && mp.up.chipSel === 0;
    fill(step > 0 ? (hotMinus ? color(110, 116, 134) : color(70, 74, 86)) : color(40));
    if (hotMinus) { stroke(255); strokeWeight(2); }
    rect(m.x, m.y, m.w, m.h, 4);
    noStroke();
    fill(step > 0 ? 255 : 100);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('−', m.x + m.w / 2, m.y + m.h / 2);
    for (let k = 0; k < values.length; k++) {
      const isPaid = k > freeTop;
      fill(k <= step ? (isPaid ? color(255, 205, 90) : color(hue[0], hue[1], hue[2])) : color(70));
      ellipse(m.x + m.w + 14 + k * 14, midY, isPaid ? 9 : 7);
    }
    const vx = m.x + m.w + 14 + values.length * 14 + 6;
    fill(255);
    textAlign(LEFT, CENTER);
    textSize(14);
    text(s.fmt(values[step]), vx, midY);
    const next = step + 1 < values.length ? `+ ${s.fmt(values[step + 1])}` + (step + 1 > freeTop ? `  ·  ${mpLevelsText(1)}` : '') : null;
    mpDrawPlusButton(it, next, selected && mp.up.chipSel === 1, hue);
  } else if (row.type === 'slider') {
    const def = MP_SLIDERS[row.key];
    mpRowLabel(def.label, it, midY);
    const bar = mpSliderBarRect(it);
    stroke(90);
    strokeWeight(4);
    line(bar.x, bar.y, bar.x + bar.w, bar.y);
    const f = (d.sliders[row.key] - def.min) / (def.max - def.min);
    noStroke();
    stroke(hue[0], hue[1], hue[2]);
    strokeWeight(4);
    line(bar.x, bar.y, bar.x + bar.w * f, bar.y);
    noStroke();
    fill(255);
    ellipse(bar.x + bar.w * f, bar.y, 15);
    fill(hue[0], hue[1], hue[2]);
    ellipse(bar.x + bar.w * f, bar.y, 9);
    fill(230);
    textAlign(RIGHT, CENTER);
    textSize(13);
    text(def.fmt(d.sliders[row.key]), it.x + it.w - 10, midY);
    // Suggestion arrow: the way the better ants leaned (bigger and bolder when they did a lot better)
    const sug = mp.up.suggestions[row.key];
    if (sug) {
      const ax = bar.x + bar.w * f + sug.dir * (sug.strong ? 22 : 16);
      const sz = sug.strong ? 10 + 2 * Math.sin(frameCount * 0.2) : 6;
      fill(sug.strong ? color(120, 255, 140) : color(170, 230, 180, 200));
      triangle(ax + sug.dir * sz, bar.y, ax - sug.dir * sz * 0.6, bar.y - sz * 0.8, ax - sug.dir * sz * 0.6, bar.y + sz * 0.8);
    }
  } else if (row.type === 'queen') {
    const q = row.q;
    const lv = p.queen[q.key];
    mpRowLabel(q.label, it, midY);
    fill(230, 190, 255);
    const qv = q.value(lv) + (lv < q.max ? `  →  ${q.value(lv + 1)}` : '');
    fitTextSize(qv, 14, it.w - 170 - 186);
    text(qv, it.x + 170, midY);
    mpDrawPlusButton(it, lv < q.max ? `Upgrade  ·  ${mpLevelsText(1)}` : null, selected, hue);
  } else if (row.type === 'send') {
    // Always a button; greyed out until she's ready
    const ready = p.queen.meter >= MP_QUEEN_METER_FULL;
    const r = { x: it.x + 10, y: it.y + 2, w: it.w - 20, h: it.h - 4 };
    const lit = ready && (selected || mpMouseIn(r));
    if (ready) {
      const glow = 0.75 + 0.25 * Math.sin(frameCount * 0.12);
      fill(hue[0] * (lit ? 1 : glow), hue[1] * (lit ? 1 : glow), hue[2] * (lit ? 1 : glow));
      stroke(lit ? 255 : color(255, 255, 255, 120));
    } else {
      fill(58, 58, 64);
      stroke(85);
    }
    strokeWeight(lit ? 2 : 1);
    rect(r.x, r.y, r.w, r.h, 6);
    noStroke();
    const label = ready ? `Send your queen at someone  ·  ${mpLevelsText(MP_QUEEN_COST_LEVELS)}` : 'Send your queen  ·  not ready yet';
    const ink = ready ? mpTextColorOn(hue) : [130, 130, 136];
    fill(ink[0], ink[1], ink[2]);
    textAlign(CENTER, CENTER);
    fitTextSize(label, 14, r.w - 16);
    text(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  }
  pop();
}

function mpDesignRowHelp(p, row) {
  const d = p.design;
  if (!row) return '';
  if (row.type === 'stepped') {
    return `${MP_STEPPED[row.key].label}: + buys the next step for ${mpLevelsText(1)} (each gold step is a gene cap), − steps back (refunded once it's two rounds old). ◀ ▶ pick − or +, A presses it.`;
  }
  if (row.type === 'slider') {
    const sug = mp.up.suggestions[row.key];
    let t = `${MP_SLIDERS[row.key].label}: drag (or ◀ ▶). Each spawned ant mutates up to ±${MP_SLIDERS[row.key].fmt(MP_SLIDERS[row.key].mut).replace('-', '')} from this.`;
    if (sug) t += sug.strong ? ' The arrow: your ants did a lot better leaning this way.' : ' The arrow: your ants did a bit better leaning this way.';
    return t;
  }
  if (row.type === 'chips' && row.key === 'size') return `Size: Full is free; every other size costs levels: 1/3 is ${mpLevelsText(3)} (3 ants a slot), 1/2 is ${mpLevelsText(2)} (2 a slot), 1.25x to 2x are ${mpLevelsText(1)}, 2.5x is ${mpLevelsText(2)}, 3x is ${mpLevelsText(3)}. Switching pays or refunds the difference.`;
  if (row.type === 'chips' && row.key === 'move') return 'Target: what your ants move around: the beetle, other ants, a spot you set, or where they spawned.';
  if (row.type === 'chips') return 'Movement style: mimic the target\'s movement, or keep a set distance from it.';
  if (row.type === 'ability') {
    const cur = d.abilities[row.cat];
    let t = `Click an ability to buy it (${mpLevelsText(ABILITY_TOKEN_COST)}); click it again for level 2, once more to go back to level 1. Locked for two rounds after you pick it; after that, switching is free (level 2 is refunded).`;
    if (cur && mpRoundsUntil(cur.since) > 0) t = `${mpAbilityName(row.cat, cur)} is locked until round ${cur.since + GENE_LOCK_ROUNDS} (you can still take it to level 2). ` + t;
    return t;
  }
  if (row.type === 'queen') return `${row.q.label}: the Upgrade button (or A) buys the next level for 1 upgrade level. Your queen counts in every fight she's in, and in the tournament.`;
  if (row.type === 'send') return `Sending her costs ${MP_QUEEN_COST_LEVELS} upgrade levels and empties her meter. She drops in on that player's next turn, with your ants.`;
  return '';
}

// Refunds wait two rounds, but anything bought this same turn can be undone straight away (a misclick)
function mpLocked(since) {
  return since !== mp.round && mpRoundsUntil(since) > 0;
}

function mpRoundsUntil(since) {
  return since + GENE_LOCK_ROUNDS - mp.round;
}

// ---------- Buying genes ----------

// Buy, upgrade, downgrade or switch a category's ability. Returns a message.
function mpChangeAbility(p, cat, target) {
  const d = p.design;
  const cur = d.abilities[cat] || null;
  const l2cost = stat => ABILITY_LEVEL2_TOKEN_COSTS[stat] || 3;
  const have = () => mpLevelsAvailable(p);
  if (!cur && !target) return 'No ability to remove.';
  if (cur && target && cur.stat === target.stat && cur.level === target.level) return 'That\'s already the ability.';
  if (!cur) {
    const cost = ABILITY_TOKEN_COST + (target.level === 2 ? l2cost(target.stat) : 0);
    if (!mpPayTokens(p, cost)) return `Needs ${mpLevelsText(cost)} (you have ${have()}).`;
    d.abilities[cat] = { stat: target.stat, level: target.level, since: mp.round, l2Since: target.level === 2 ? mp.round : null };
    return `Bought ${mpAbilityName(cat, d.abilities[cat])} for ${mpLevelsText(cost)}.`;
  }
  if (target && cur.stat === target.stat) {
    if (target.level === 2) {
      const cost = l2cost(cur.stat);
      if (!mpPayTokens(p, cost)) return `Level 2 needs ${mpLevelsText(cost)} (you have ${have()}).`;
      cur.level = 2;
      cur.l2Since = mp.round;
      return `Upgraded to ${mpAbilityName(cat, cur)} for ${mpLevelsText(cost)}.`;
    }
    // Back down to level 1: a gene cap, so the refund waits two rounds
    if (mpLocked(cur.l2Since)) return `Level 2 can't be refunded until round ${cur.l2Since + GENE_LOCK_ROUNDS}.`;
    mpRefundTokens(p, l2cost(cur.stat));
    cur.level = 1;
    cur.l2Since = null;
    return `Back to ${mpAbilityName(cat, cur)}: ${mpLevelsText(l2cost(cur.stat))} refunded.`;
  }
  // Switching (or removing): the ability is locked for two rounds after it was picked
  if (mpLocked(cur.since)) return `${mpAbilityName(cat, cur)} is locked until round ${cur.since + GENE_LOCK_ROUNDS}.`;
  if (cur.level === 2 && mpLocked(cur.l2Since)) return `Level 2 is locked until round ${cur.l2Since + GENE_LOCK_ROUNDS}.`;
  const refund = cur.level === 2 ? l2cost(cur.stat) : 0;
  if (!target) {
    mpRefundTokens(p, ABILITY_TOKEN_COST + refund);
    p.stats.abilitySwitches++;
    delete d.abilities[cat];
    return `Removed it: ${mpLevelsText(ABILITY_TOKEN_COST + refund)} refunded.`;
  }
  // A switch, not a new purchase: the category is already paid for, and the new ability starts at level 1
  mpRefundTokens(p, refund);
  p.stats.abilitySwitches++;
  d.abilities[cat] = { stat: target.stat, level: 1, since: mp.round, l2Since: null };
  return `Switched to ${mpAbilityName(cat, d.abilities[cat])}` + (refund ? ` (${mpLevelsText(refund)} refunded).` : '.');
}

// Step a stepped stat up or down (gene cap steps cost levels; stepping off one refunds it after two rounds)
function mpStepStat(p, key, dir) {
  const d = p.design;
  const values = mpStepValues(key);
  const next = d.steps[key] + dir;
  if (next < 0) return null;
  if (next >= values.length) return 'That\'s as far as it goes.';
  const freeTop = mpFreeTop(key);
  if (!d.paidRounds[key]) d.paidRounds[key] = [];
  if (dir > 0 && next > freeTop) {
    if (!mpPayTokens(p, 1)) return `That step is a gene cap: it needs ${mpLevelsText(1)} (you have ${mpLevelsAvailable(p)}).`;
    d.paidRounds[key].push(mp.round);
  } else if (dir < 0 && d.steps[key] > freeTop) {
    const bought = d.paidRounds[key][d.paidRounds[key].length - 1];
    if (mpLocked(bought)) return `That gene cap can't be refunded until round ${bought + GENE_LOCK_ROUNDS}.`;
    d.paidRounds[key].pop();
    mpRefundTokens(p, 1);
  }
  d.steps[key] = next;
  return null;
}

// Size: full is free; every other size is bought (at least a level)
function mpSetSize(p, index) {
  const d = p.design;
  if (index === d.size) return null;
  const cost = MP_SIZES[index].tokens - MP_SIZES[d.size].tokens;
  if (!d.sizeRounds) d.sizeRounds = {};
  if (cost < 0 || (cost === 0 && MP_SIZES[d.size].tokens > 0)) {
    const bought = d.sizeRounds[d.size] || 0;
    if (mpLocked(bought)) return `This size can't be refunded until round ${bought + GENE_LOCK_ROUNDS}.`;
  }
  if (cost > 0) {
    if (!mpPayTokens(p, cost)) return `${MP_SIZES[index].label} needs ${mpLevelsText(cost)} more (you have ${mpLevelsAvailable(p)}).`;
    d.sizeRounds[index] = mp.round;
  } else if (cost < 0) {
    mpRefundTokens(p, -cost);
  }
  d.size = index;
  return null;
}

// Slider suggestions: does damage go up or down with how far the ants mutated each slider?
function mpComputeSuggestions(p) {
  const out = {};
  for (const k in MP_SLIDERS) {
    const pts = p.samples.filter(s => s.deltas && s.deltas[k] !== undefined).slice(-60);
    if (pts.length < 6) continue;
    const n = pts.length;
    const mx = pts.reduce((a, s) => a + s.deltas[k], 0) / n;
    const my = pts.reduce((a, s) => a + s.damage, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (const s of pts) {
      const dx = s.deltas[k] - mx;
      const dy = s.damage - my;
      sxy += dx * dy;
      sxx += dx * dx;
      syy += dy * dy;
    }
    if (sxx <= 1e-9 || syy <= 1e-9) continue;
    const r = sxy / Math.sqrt(sxx * syy);
    if (Math.abs(r) < 0.25) continue;
    // Strong when the better half did a lot better than the rest
    out[k] = { dir: Math.sign(r), strength: Math.abs(r), strong: Math.abs(r) >= 0.5 };
  }
  return out;
}

// ---------- The queen ----------

function mpBuyQueenUpgrade(p, row) {
  const q = p.queen;
  if (q[row.key] >= row.max) return 'Already maxed.';
  if (!mpSpendLevels(p, 1)) return 'No upgrade levels left.';
  q[row.key]++;
  return `${row.label}: ${row.value(q[row.key])}.`;
}

function mpStartSendQueen(p) {
  if (p.queen.meter < MP_QUEEN_METER_FULL) return 'Your queen isn\'t ready yet.';
  if (mpQueenTargets(p).length === 0) return 'There\'s no living beetle to send her at.';
  if (mpLevelsAvailable(p) < MP_QUEEN_COST_LEVELS) return `Sending her costs ${MP_QUEEN_COST_LEVELS} upgrade levels.`;
  mp.up.targetPick = 0;
  return null;
}

// Living beetles other than the player's own
function mpQueenTargets(p) {
  return mp.players.filter(q => q.alive && q.index !== p.index);
}

function mpDrawQueenTargetPick(p, inp) {
  const up = mp.up;
  const targets = mpQueenTargets(p);
  const opts = targets.map(t => ({ label: t.name, player: t })).concat([{ label: 'Random (they won\'t know who)', player: null }]);
  if (inp.up) up.targetPick = (up.targetPick + opts.length - 1) % opts.length;
  if (inp.down) up.targetPick = (up.targetPick + 1) % opts.length;
  push();
  noStroke();
  fill(0, 0, 0, 200);
  rect(0, 0, getMenuWidth(), getMenuHeight());
  pop();
  mpTitle('Whose beetle does she go after?', 140, 34);
  let picked = -1;
  opts.forEach((o, k) => {
    const r = { x: getMenuWidth() / 2 - 220, y: 190 + k * 52, w: 440, h: 44 };
    if (mpMouseIn(r) && mpMouseMoved()) up.targetPick = k;
    mpButton(r, o.label, up.targetPick === k, { color: o.player ? o.player.color : [210, 140, 255], size: 19 });
    if (inp.click && mpMouseIn(r)) picked = k;
  });
  push();
  textAlign(CENTER, CENTER);
  textSize(15);
  fill(200);
  text('Click or A to send her  ·  B to cancel', getMenuWidth() / 2, 190 + opts.length * 52 + 20);
  pop();
  if (inp.back) {
    up.targetPick = null;
    return;
  }
  if (inp.confirm) picked = up.targetPick;
  if (picked < 0) return;
  const o = opts[picked];
  const target = o.player || targets[Math.floor(Math.random() * targets.length)];
  if (!mpSpendLevels(p, MP_QUEEN_COST_LEVELS)) {
    up.targetPick = null;
    mpSay(`Sending her costs ${MP_QUEEN_COST_LEVELS} upgrade levels.`);
    return;
  }
  p.queen.meter = 0;
  p.stats.queensSpawned++;
  mp.pendingQueens.push({ owner: p.index, target: target.index, secret: !o.player });
  up.targetPick = null;
  mpSay(o.player ? `Your queen will drop in on ${target.name}'s next turn.` : 'Your queen is on her way to someone. Nobody knows who.');
}
