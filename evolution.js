// ========== EVOLUTION TREE ==========
// Every round, the top 3 ants (see getTopAnts) are recorded as nodes of a tree, linked to the top ant they were
// born from. When the beetle dies, the death round's top 3 (and the ant that landed the killing blow, if it
// isn't one of them) are added as the last column, so the lose screen can show how the ants that won evolved.
// A top ant whose children never made a later top 3 is the end of an extinct branch.
// Only the current run is kept; resetRunState() clears it. Not recorded in multiplayer, the tutorial, the final
// level or with dev tools custom ants.

let evoNodes = [];          // {id, round, rank, parent (node id or null), score, sprite, size, abilities, movement, caps, numbers, final, killer}
let antEvoParent = [];      // Ant index -> node id of the top ant it was born from (undefined for founding ants)
let lastBeetleDamager = 0;  // Ant index that last took the beetle's health (-1 = the queen)
let evoTreeOpen = false;
let evoTreeCooldown = 0;
let evoScrollX = 0;
let evoTargetScrollX = 0;

const EVO_CARD_W = 250;
const EVO_CARD_H = 104;
const EVO_COL_W = 300;
const EVO_PIC_W = 64;       // The ant's picture down the left side of its card
const EVO_ROW_H = 112;
const EVO_ROWS = 4;         // Top 3, plus the killing-blow ant on the last column
const EVO_TREE_H = EVO_ROWS * EVO_ROW_H;
const EVO_RANK_COLORS = [[255, 215, 0], [200, 210, 225], [215, 140, 70]];
const EVO_KILLER_COLOR = [255, 70, 70];
const EVO_LINE_COLOR = [240, 190, 90];
const EVO_EXTINCT_COLOR = [95, 95, 105];

function resetEvolutionTree() {
  evoNodes = [];
  antEvoParent = [];
  lastBeetleDamager = 0;
  evoTreeOpen = false;
}

function isEvolutionTracked() {
  return !multiplayerMode && !isFinalLevel() && !isTutorialRun() && !devToolsUseCustomAnts;
}

function hasEvolutionTree() {
  return evoNodes.length > 0;
}

// Antdex names without "Ants" (and scientific names), except where the ants are what's followed
function getEvoShortName(entry) {
  return entry.name.replace(/ \(.*\)$/, '').replace(/(?<!From|Other) Ants\b/, '');
}

// What a node shows for ant i: its abilities (exotic combinations first), then a few Antdex stats
function snapshotEvoAnt(i) {
  if (antDexEntries.length === 0) buildAntDexEntries();
  const exotic = [];
  const abilities = [];
  const caps = {}; // Stat -> its highest gene cap entry
  let movement = null;
  for (const entry of antDexEntries) {
    if (entry.section === 'stats' && entry.scene !== 'movement' && !entry.id.startsWith('cap_')) continue;
    if (!entry.check(i)) continue;
    if (entry.section === 'exotic') exotic.push(getEvoShortName(entry));
    else if (entry.section === 'abilities') abilities.push(getEvoShortName(entry));
    else if (entry.scene === 'movement') movement = getEvoShortName(entry);
    else caps[entry.id.slice(4, entry.id.lastIndexOf('_'))] = getEvoShortName(entry);
  }
  return {
    sprite: getAntSprite(i),
    size: antSize[i],
    abilities: exotic.concat(abilities),
    movement,
    caps: Object.values(caps),
    numbers: `Speed ${antSpeed[i].toFixed(1)} · Cooldown ${Math.round(bulletCooldown[i])} · Size ${antSize[i].toFixed(2)}`
  };
}

function addEvoNode(i, round, rank, score) {
  const parent = antEvoParent[i];
  const node = { id: evoNodes.length, round, rank, parent: parent === undefined ? null : parent, score, final: false, killer: false, ...snapshotEvoAnt(i) };
  evoNodes.push(node);
  return node;
}

// Called by nextRound() with the round's top ants (before level goes up). Returns {ant index: node id} so the
// new ants can be linked to the top ant they're born from.
function recordEvolutionRound(topAnts) {
  const nodeOf = {};
  if (!isEvolutionTracked()) return nodeOf;
  let rank = 1;
  for (const top of topAnts) {
    if (nodeOf[top.id] !== undefined) continue; // Missing places are filled with copies of the best ant
    nodeOf[top.id] = addEvoNode(top.id, level, rank++, top.ratio).id;
  }
  return nodeOf;
}

// Called once when the beetle dies: the death round's top 3, plus the ant that landed the killing blow
function recordEvolutionDeath() {
  if (!isEvolutionTracked()) return;
  const topAnts = getTopAnts();
  let rank = 1;
  for (const top of topAnts) {
    const node = addEvoNode(top.id, level, rank++, top.ratio);
    node.final = true;
    node.killer = top.id === lastBeetleDamager;
  }
  if (lastBeetleDamager >= 1 && lastBeetleDamager <= enemyCount && !topAnts.some(t => t.id === lastBeetleDamager)) {
    const node = addEvoNode(lastBeetleDamager, level, 0, getAntRatio(lastBeetleDamager));
    node.final = true;
    node.killer = true;
  }
}

function openEvolutionTree() {
  evoTreeOpen = true;
  evoTreeCooldown = 20;
  evoScrollX = evoTargetScrollX = -Infinity; // Starts at the death round; clamped when drawn
}

// ----- Layout -----

// Positions every node in tree space (columns of rounds, left to right) and works out each node's fate
function layoutEvolutionTree() {
  const rounds = [...new Set(evoNodes.map(n => n.round))].sort((a, b) => a - b);
  const children = evoNodes.map(() => []);
  for (const n of evoNodes) if (n.parent !== null) children[n.parent].push(n.id);

  // Ancestors of the death round's ants, and of the killing-blow ant
  const survivor = new Set();
  const killerLine = new Set();
  for (const n of evoNodes) {
    if (!n.final) continue;
    for (let p = n; p; p = p.parent === null ? null : evoNodes[p.parent]) {
      survivor.add(p.id);
      if (n.killer) killerLine.add(p.id);
    }
  }

  const pos = [];
  rounds.forEach((round, col) => {
    const column = evoNodes.filter(n => n.round === round);
    // Children sit in the order of their parents, so lines cross as little as possible
    column.sort((a, b) => {
      const pa = a.parent === null ? -1 : pos[a.parent].y;
      const pb = b.parent === null ? -1 : pos[b.parent].y;
      return pa - pb || (a.rank || 4) - (b.rank || 4);
    });
    const top = (EVO_TREE_H - column.length * EVO_ROW_H) / 2;
    column.forEach((n, k) => {
      pos[n.id] = { x: col * EVO_COL_W, y: top + k * EVO_ROW_H + (EVO_ROW_H - EVO_CARD_H) / 2 };
    });
  });

  return {
    rounds,
    pos,
    width: (rounds.length - 1) * EVO_COL_W + EVO_CARD_W,
    extinct: n => !n.final && children[n.id].length === 0,
    survivor,
    killerLine
  };
}

function getEvoEdgeColor(layout, n) {
  if (layout.killerLine.has(n.id)) return EVO_KILLER_COLOR;
  if (layout.survivor.has(n.id)) return EVO_LINE_COLOR;
  return EVO_EXTINCT_COLOR;
}

// Draws the tree with its left edge at (ox, oy) in tree space scaled by s. mini draws plain blocks with no text.
function drawEvolutionTreeAt(layout, ox, oy, s, mini) {
  push();
  translate(ox, oy);
  scale(s);

  // Lines from each parent to its children
  noFill();
  for (const n of evoNodes) {
    if (n.parent === null) continue;
    const a = layout.pos[n.parent];
    const b = layout.pos[n.id];
    const x1 = a.x + EVO_CARD_W, y1 = a.y + EVO_CARD_H / 2;
    const x2 = b.x, y2 = b.y + EVO_CARD_H / 2;
    const midX = (x1 + x2) / 2;
    stroke(...getEvoEdgeColor(layout, n), layout.survivor.has(n.id) ? 230 : 140);
    strokeWeight(mini ? 2 / s : layout.killerLine.has(n.id) ? 6 : 4);
    bezier(x1, y1, midX, y1, midX, y2, x2, y2);
  }

  for (const n of evoNodes) {
    const p = layout.pos[n.id];
    if (mini) drawEvoMiniNode(layout, n, p, s);
    else drawEvoNode(layout, n, p);
  }
  pop();
}

function drawEvoMiniNode(layout, n, p, s) {
  const extinct = layout.extinct(n);
  noStroke();
  if (n.killer) fill(...EVO_KILLER_COLOR);
  else if (extinct) fill(55, 55, 62);
  else fill(...(n.rank ? EVO_RANK_COLORS[n.rank - 1] : EVO_KILLER_COLOR), layout.survivor.has(n.id) ? 255 : 150);
  rect(p.x, p.y, EVO_CARD_W, EVO_CARD_H, 4 / s);
}

function drawEvoNode(layout, n, p) {
  const extinct = layout.extinct(n);
  const rankColor = n.rank ? EVO_RANK_COLORS[n.rank - 1] : EVO_KILLER_COLOR;
  const x = p.x, y = p.y;

  // Card
  if (n.killer) {
    stroke(...EVO_KILLER_COLOR, map(sin(frameCount * 0.08), -1, 1, 160, 255));
    strokeWeight(4);
  } else {
    stroke(...rankColor, extinct ? 70 : 180);
    strokeWeight(2);
  }
  fill(extinct ? 32 : 44, extinct ? 32 : 42, extinct ? 36 : 56);
  rect(x, y, EVO_CARD_W, EVO_CARD_H, 12);
  noStroke();
  const textAlpha = extinct ? 130 : 255;

  // Place, picture and score
  textAlign(LEFT, CENTER);
  textSize(15);
  fill(...rankColor, textAlpha);
  text(n.rank ? `#${n.rank}` : 'Killer', x + 10, y + 14);
  drawEvoAntPicture(n, x + EVO_PIC_W / 2 + 2, y + 60, extinct ? 0.5 : 1);
  textAlign(RIGHT, CENTER);
  textSize(12);
  fill(200, textAlpha * 0.8);
  text(`Score ${n.score.toFixed(1)}`, x + EVO_CARD_W - 10, y + 14);

  // Abilities first
  const tx = x + EVO_PIC_W + 4;
  const tw = EVO_CARD_W - EVO_PIC_W - 14;
  textAlign(LEFT, CENTER);
  const shown = n.abilities.length > 3 ? n.abilities.slice(0, 2) : n.abilities;
  shown.forEach((name, k) => {
    fill(130, 215, 255, textAlpha);
    fitTextSize(name, 14, tw);
    text(name, tx, y + 30 + k * 14);
  });
  if (n.abilities.length > 3) {
    fill(130, 215, 255, textAlpha * 0.7);
    textSize(12);
    text(`+${n.abilities.length - 2} more`, tx, y + 30 + 2 * 14);
  }
  if (n.abilities.length === 0) {
    fill(150, textAlpha * 0.8);
    textSize(13);
    text('No abilities', tx, y + 30);
  }

  // Then stats: movement, gene caps (as many as fit), and a few numbers
  textSize(11);
  if (n.movement) {
    fill(205, textAlpha * 0.85);
    fitTextSize(n.movement, 11, tw);
    text(n.movement, tx, y + 73);
  }
  textSize(11);
  fill(225, 200, 140, textAlpha * 0.85);
  text(getEvoCapLine(n.caps, tw), tx, y + 85);
  fill(160, textAlpha * 0.8);
  fitTextSize(n.numbers, 11, tw);
  text(n.numbers, tx, y + 96);

  // Tags along the top edge
  if (n.killer) drawEvoTag('Landed the killing blow', x + EVO_CARD_W / 2, y, EVO_KILLER_COLOR, [255, 255, 255]);
  else if (extinct) drawEvoTag('Extinct', x + EVO_CARD_W / 2, y, [80, 80, 90], [210, 210, 210]);
}

// The ant as it looked, facing its children, sized by its ant size like in the game
function drawEvoAntPicture(n, cx, cy, alpha) {
  if (!n.sprite) return;
  const sz = Math.min(EVO_PIC_W - 6, (45 + 15 * n.size) * 0.8);
  push();
  drawingContext.globalAlpha = alpha; // Not tint(): it stalls frames
  imageMode(CENTER);
  image(n.sprite, cx, cy, sz, sz);
  drawingContext.globalAlpha = 1;
  pop();
}

// As many gene caps as fit in maxWidth (at the current text size), then how many more there are
function getEvoCapLine(caps, maxWidth) {
  if (caps.length === 0) return 'No gene caps';
  let line = caps[0];
  for (let k = 1; k < caps.length; k++) {
    const rest = caps.length - k - 1;
    const next = `${line}, ${caps[k]}`;
    if (textWidth(rest > 0 ? `${next} +${rest}` : next) > maxWidth) return `${line} +${caps.length - k}`;
    line = next;
  }
  return line;
}

function drawEvoTag(label, cx, cy, bg, fg) {
  textSize(12);
  const w = textWidth(label) + 18;
  noStroke();
  fill(...bg);
  rect(cx - w / 2, cy - 10, w, 20, 10);
  fill(...fg);
  textAlign(CENTER, CENTER);
  text(label, cx, cy);
}

// ----- Lose screen preview -----

// Just above the lose screen's option cards, as wide as their row
function getEvoPreviewRect() {
  const w = 778, h = 104;
  return { x: getMenuWidth() / 2 - w / 2, y: getLoseScreenLayout().buttons - 29 - 14 - h, w, h };
}

// The latest rounds of the tree as plain blocks; selecting it opens the full tree
function drawEvoPreview(r, selected) {
  const layout = layoutEvolutionTree();
  push();
  rectMode(CORNER);
  fill(0, 0, 0, 170);
  stroke(selected ? color(120, 220, 140) : color(90));
  strokeWeight(selected ? 3 : 2);
  rect(r.x, r.y, r.w, r.h, 14);
  noStroke();

  const labelW = 190;
  textAlign(LEFT, CENTER);
  textSize(22);
  fill(selected ? color(160, 255, 180) : color(230));
  text('Evolution', r.x + 18, r.y + r.h / 2 - 12);
  textSize(13);
  fill(170);
  text('How the ants that beat\nyou evolved. Select it to\nsee the whole tree.', r.x + 18, r.y + r.h / 2 + 20);

  // Right-aligned so the death round is always in view
  const area = { x: r.x + labelW, y: r.y + 8, w: r.w - labelW - 14, h: r.h - 16 };
  const s = area.h / EVO_TREE_H;
  const ox = Math.min(area.x, area.x + area.w - layout.width * s);
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(area.x, area.y, area.w, area.h);
  drawingContext.clip();
  rectMode(CORNER);
  drawEvolutionTreeAt(layout, ox, area.y, s, true);
  drawingContext.restore();
  pop();
}

// ----- Full screen tree -----

function drawEvolutionTree() {
  const layout = layoutEvolutionTree();
  const viewLeft = 40;
  const viewW = getMenuWidth() - 80;
  const treeTop = 100;

  if (evoTreeCooldown > 0) evoTreeCooldown--;
  if (isLeftPressed()) evoTargetScrollX += 16;
  if (isRightPressed()) evoTargetScrollX -= 16;
  const minScroll = Math.min(0, viewW - layout.width);
  evoTargetScrollX = constrain(evoTargetScrollX, minScroll, 0);
  if (!isFinite(evoScrollX)) evoScrollX = evoTargetScrollX;
  evoScrollX = lerp(evoScrollX, evoTargetScrollX, 0.2);
  // Short runs sit in the middle
  const ox = layout.width < viewW ? viewLeft + (viewW - layout.width) / 2 : viewLeft + evoScrollX;

  push();
  rectMode(CORNER);
  noStroke();
  fill(18, 20, 26);
  rect(0, 0, getMenuWidth(), getMenuHeight());

  // Round labels over each column
  textAlign(CENTER, CENTER);
  layout.rounds.forEach((round, col) => {
    const cx = ox + col * EVO_COL_W + EVO_CARD_W / 2;
    if (cx < -EVO_CARD_W || cx > getMenuWidth() + EVO_CARD_W) return;
    const last = col === layout.rounds.length - 1;
    textSize(16);
    fill(last ? color(255, 140, 140) : color(170));
    text(last ? `Round ${round} (you lost)` : `Round ${round}`, cx, treeTop - 14);
  });

  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(0, treeTop - 2, getMenuWidth(), EVO_TREE_H + 14);
  drawingContext.clip();
  drawEvolutionTreeAt(layout, ox, treeTop + 10, 1, false);
  drawingContext.restore();

  // Header
  fill(18, 20, 26);
  rect(0, 0, getMenuWidth(), treeTop - 28);
  textAlign(CENTER, CENTER);
  textSize(38);
  fill(255);
  text('Evolution', getMenuWidth() / 2, 30);
  textSize(15);
  fill(185);
  text('Each round\'s top 3 ants (by score: damage per life) and the top ant each was born from', getMenuWidth() / 2, 60);

  // Legend
  const legend = [
    [EVO_KILLER_COLOR, 'Line of the ant that killed you'],
    [EVO_LINE_COLOR, 'Lines that made it to the end'],
    [EVO_EXTINCT_COLOR, 'Extinct branches']
  ];
  const legendY = getMenuHeight() - 44;
  let lx = getMenuWidth() / 2 - 390;
  textAlign(LEFT, CENTER);
  textSize(15);
  for (const [c, label] of legend) {
    stroke(...c);
    strokeWeight(4);
    line(lx, legendY, lx + 30, legendY);
    noStroke();
    fill(210);
    text(label, lx + 40, legendY);
    lx += 60 + textWidth(label) + 20;
  }
  textAlign(CENTER, CENTER);
  textSize(15);
  fill(200, map(sin(frameCount * 0.05), -1, 1, 30, 90));
  text('A/D or ←/→ or scroll  Look around  |  Esc or B  Back', getMenuWidth() / 2, getMenuHeight() - 16);

  // Scroll bar
  if (minScroll < 0) {
    const barW = viewW * viewW / layout.width;
    fill(100, 100, 100, 150);
    rect(viewLeft + (evoTargetScrollX / minScroll) * (viewW - barW), treeTop + EVO_TREE_H + 18, barW, 8, 4);
  }
  pop();

  if (evoTreeCooldown === 0 && isBackPressed()) {
    evoTreeOpen = false;
    gameOverMenuCooldown = 20;
  }
}
