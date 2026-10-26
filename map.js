// ========== DIFFICULTY MAP ==========
// The difficulty select is a map: a dirt path through the forest that goes from orange to dark purple the further
// it gets into ant territory. Each difficulty is a stop on the path. Past difficulty 10, once it's beaten, an 11th
// stop shows up at the end: the main ant nest (see finalboss.js). The ground in each round is tinted the same way.

const GROUND_ORANGE = [196, 108, 46];   // Difficulty 1: the forest's edge
const GROUND_PURPLE = [66, 32, 82];     // Difficulty 10: deep in ant territory
const GROUND_NEST = [38, 18, 48];       // The main nest

// Ground color for a difficulty (1-10, or 11 for the nest)
function getGroundColorFor(value) {
  if (value >= 11) return GROUND_NEST;
  const f = constrain((value - 1) / 9, 0, 1);
  // Through a dark red-brown rather than straight across, so the middle doesn't go muddy grey
  const mid = [150, 66, 58];
  if (f < 0.5) return lerpRgb(GROUND_ORANGE, mid, f * 2);
  return lerpRgb(mid, GROUND_PURPLE, (f - 0.5) * 2);
}

function lerpRgb(a, b, f) {
  return [Math.round(lerp(a[0], b[0], f)), Math.round(lerp(a[1], b[1], f)), Math.round(lerp(a[2], b[2], f))];
}

// The ground of the round being played
function getGroundColor() {
  if (typeof isFinalLevel === 'function' && isFinalLevel()) return GROUND_NEST;
  if (typeof isTutorialRun === 'function' && isTutorialRun()) return GROUND_ORANGE;
  return getGroundColorFor(difficulty);
}

// Stops on the map: 10, plus the nest once difficulty 10 is beaten
function getMapStopCount() {
  return isDifficultyUnlocked(11) ? 11 : 10;
}

const MAP_TOP = 0.1;      // Fractions of the menu height the map takes up
const MAP_BOTTOM = 0.6;

// Where each stop sits on the map (menu space)
function getMapStop(value) {
  const w = getMenuWidth();
  const h = getMenuHeight();
  const left = 95;
  const right = w - 95;
  const x = lerp(left, right, (value - 1) / 10);
  const midY = h * (MAP_TOP + MAP_BOTTOM) / 2 + 6;
  const y = midY + Math.sin((value - 1) * 1.15 + 0.4) * h * 0.12;
  return { x: x, y: y };
}

// Click / hover area for a stop (also what getDifficultyButtonRect returns)
function getMapStopRect(value) {
  const p = getMapStop(value);
  const r = value === 11 ? 46 : 36;
  return { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 };
}

let mapTrees = null;
function getMapTrees() {
  if (mapTrees) return mapTrees;
  mapTrees = [];
  const w = getMenuWidth();
  const h = getMenuHeight();
  for (let k = 0; k < 140; k++) {
    const x = cineRand(k * 3 + 1) * w;
    const y = h * MAP_TOP + cineRand(k * 7 + 2) * h * (MAP_BOTTOM - MAP_TOP);
    // Keep the path clear
    let near = Infinity;
    for (let v = 1; v < 11; v++) {
      const a = getMapStop(v);
      const b = getMapStop(v + 1);
      near = Math.min(near, distToSegment(x, y, a.x, a.y, b.x, b.y));
    }
    if (near < 42) continue;
    mapTrees.push({ x: x, y: y, r: 14 + cineRand(k * 11 + 3) * 18 });
  }
  return mapTrees;
}

function drawDifficultyMap() {
  const w = getMenuWidth();
  const h = getMenuHeight();
  const stops = getMapStopCount();
  const top = h * MAP_TOP;
  const bottom = h * MAP_BOTTOM;

  push();
  // Everything stays inside the map's strip
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(0, top, w, bottom - top);
  drawingContext.clip();
  // Forest floor, darkening across the map
  noStroke();
  for (let k = 0; k < 40; k++) {
    const f = k / 39;
    const c = getGroundColorFor(1 + f * (stops === 11 ? 10 : 9.4));
    fill(c[0] * 0.55, c[1] * 0.55, c[2] * 0.55);
    rect(f * w - 1, top, w / 39 + 2, bottom - top);
  }

  // The path: each leg shaded from one stop's ground to the next's
  strokeCap(ROUND);
  for (let v = 1; v < stops; v++) {
    const a = getMapStop(v);
    const b = getMapStop(v + 1);
    const steps = 10;
    for (let s = 0; s < steps; s++) {
      const f0 = s / steps;
      const f1 = (s + 1) / steps;
      const c = getGroundColorFor(v + (f0 + f1) / 2);
      const p0 = mapPathPoint(a, b, f0);
      const p1 = mapPathPoint(a, b, f1);
      stroke(0, 0, 0, 90);
      strokeWeight(30);
      line(p0.x, p0.y + 3, p1.x, p1.y + 3);
      stroke(c[0], c[1], c[2]);
      strokeWeight(24);
      line(p0.x, p0.y, p1.x, p1.y);
    }
  }
  // Past the last stop the path fades into the dark
  if (stops === 10) {
    const a = getMapStop(10);
    for (let s = 0; s < 8; s++) {
      const p0 = { x: a.x + s * 10, y: a.y - s * 3 };
      const c = getGroundColorFor(10);
      stroke(c[0], c[1], c[2], 255 * (1 - s / 8));
      strokeWeight(24 * (1 - s / 12));
      line(p0.x, p0.y, p0.x + 10, p0.y - 3);
    }
  }

  // Trees: green at the forest's edge, sickly purple deep in ant territory
  noStroke();
  for (const t of getMapTrees()) {
    const f = constrain(t.x / w, 0, 1);
    const leaf = lerpRgb([58, 120, 48], [70, 40, 80], f);
    fill(0, 0, 0, 70);
    ellipse(t.x + 4, t.y + 5, t.r * 2);
    fill(leaf[0], leaf[1], leaf[2]);
    ellipse(t.x, t.y, t.r * 2);
    fill(leaf[0] * 1.25, leaf[1] * 1.25, leaf[2] * 1.25);
    ellipse(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r);
  }

  // Ant trails scurrying along the path toward the nest
  for (let k = 0; k < 14; k++) {
    const pos = ((frameCount * 0.0025 + k / 14) % 1) * (stops - 1);
    const v = 1 + Math.floor(pos);
    const a = getMapStop(v);
    const b = getMapStop(Math.min(stops, v + 1));
    const p = mapPathPoint(a, b, pos - Math.floor(pos));
    fill(40, 10, 10, 200);
    ellipse(p.x + Math.sin(k * 3) * 6, p.y + Math.cos(k * 5) * 5, 5, 4);
  }

  // Stops
  textAlign(CENTER, CENTER);
  for (let v = 1; v <= stops; v++) {
    const p = getMapStop(v);
    const selected = v === difficultySelection;
    const locked = !isDifficultyUnlocked(v);
    const info = getDifficultyTierInfo(v);
    if (v === 11) {
      drawMapNest(p.x, p.y, selected);
      continue;
    }
    const r = selected ? 30 + 2 * Math.sin(frameCount * 0.12) : 26;
    noStroke();
    fill(0, 0, 0, 90);
    ellipse(p.x + 2, p.y + 4, r * 2);
    if (locked) {
      fill(45);
      stroke(selected ? 255 : 110);
    } else {
      const c = getGroundColorFor(v);
      fill(c[0] * 1.15, c[1] * 1.15, c[2] * 1.15);
      stroke(selected ? 255 : info.color[0], selected ? 255 : info.color[1], selected ? 255 : info.color[2]);
    }
    strokeWeight(selected ? 4 : 2.5);
    ellipse(p.x, p.y, r * 2);
    noStroke();
    if (locked) {
      drawLockIcon(p.x, p.y + 1, 22, 220);
    } else {
      fill(255);
      textSize(selected ? 26 : 22);
      textStyle(BOLD);
      text(v, p.x, p.y + 1);
      textStyle(NORMAL);
      // Queens beaten here show as little crowns under the stop
      const crowns = Math.min(5, getQueensCollectedOnDifficulty(v));
      for (let k = 0; k < crowns; k++) drawQueenCrown(p.x + (k - (crowns - 1) / 2) * 13, p.y + r + 10, 0.32, 230);
    }
  }

  // The beetle stands on the selected stop
  const sel = getMapStop(difficultySelection);
  const bob = Math.sin(frameCount * 0.15) * 2;
  push();
  angleMode(DEGREES);
  imageMode(CENTER);
  translate(sel.x - 2, sel.y - (difficultySelection === 11 ? 58 : 46) + bob);
  rotate(-90);
  image(beetle, 0, 0, 56, 56);
  pop();
  drawingContext.restore();

  // Title banner
  noStroke();
  fill(0, 0, 0, 150);
  rect(w / 2 - 200, top - 4, 400, 36, 0, 0, 12, 12);
  fill(255);
  textSize(22);
  textStyle(BOLD);
  text('Into Ant Territory', w / 2, top + 14);
  textStyle(NORMAL);
  pop();
}

// Point on the leg from a to b (a slight bend so it reads as a trail, not a ruler line)
function mapPathPoint(a, b, f) {
  const bend = Math.sin(f * Math.PI) * 14 * ((a.x * 7) % 2 > 1 ? 1 : -1);
  const nx = -(b.y - a.y);
  const ny = b.x - a.x;
  const len = Math.hypot(nx, ny) || 1;
  return { x: lerp(a.x, b.x, f) + nx / len * bend, y: lerp(a.y, b.y, f) + ny / len * bend };
}

// The main nest: a dark hole ringed with tunnels
function drawMapNest(x, y, selected) {
  push();
  noStroke();
  fill(20, 8, 26);
  ellipse(x, y, 96, 80);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2 + 0.2;
    fill(10, 4, 14);
    ellipse(x + Math.cos(a) * 40, y + Math.sin(a) * 33, 16, 13);
  }
  fill(0);
  ellipse(x, y, 56, 44);
  stroke(selected ? 255 : 170, selected ? 255 : 90, 255, 160 + 80 * Math.sin(frameCount * 0.08));
  strokeWeight(selected ? 4 : 2);
  noFill();
  ellipse(x, y, 104, 88);
  noStroke();
  fill(230, 170, 255);
  textSize(selected ? 22 : 18);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text('???', x, y);
  textStyle(NORMAL);
  pop();
}
