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
const MAP_STOP_SPACING = 1.15;  // Menu widths of forest from one stop to the next, so only one is on screen

// The map is a long strip of forest; the camera walks along it to the selected stop.
// World x of a stop, and the path's height at any world x.
function getMapStopWorldX(value) {
  return (value - 1) * getMenuWidth() * MAP_STOP_SPACING;
}

function mapPathY(wx) {
  const h = getMenuHeight();
  const midY = h * (MAP_TOP + MAP_BOTTOM) / 2 + 6;
  const u = wx / (getMenuWidth() * MAP_STOP_SPACING);
  return midY + Math.sin(u * Math.PI * 2 + 0.6) * h * 0.09 + Math.sin(u * 9.1 + 1.3) * h * 0.035;
}

// Difficulty (fractional) along the path at a world x
function mapValueAt(wx) {
  return 1 + wx / (getMenuWidth() * MAP_STOP_SPACING);
}

let mapCamX = 0;           // World x at the center of the screen
let mapLastFrame = -10;
let mapWheel = 0;
let mapWheelCooldown = 0;
let mapBeetleAngle = null;

function mapScreenX(wx) {
  return wx - mapCamX + getMenuWidth() / 2;
}

// Where each stop sits on screen right now (menu space)
function getMapStop(value) {
  const wx = getMapStopWorldX(value);
  return { x: mapScreenX(wx), y: mapPathY(wx) };
}

// Click / hover area for a stop (also what getDifficultyButtonRect returns)
function getMapStopRect(value) {
  const p = getMapStop(value);
  const r = value === 11 ? 46 : 36;
  return { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 };
}

// Arrows at the screen's edges pointing to the stops just off screen (dir -1 / 1)
function getMapArrowRect(dir) {
  const w = getMenuWidth();
  const h = getMenuHeight();
  const y = h * (MAP_TOP + MAP_BOTTOM) / 2 - 30;
  return { x: dir < 0 ? 14 : w - 14 - 60, y: y, w: 60, h: 60 };
}

function mapStep(dir) {
  difficultySelection = constrain(difficultySelection + dir, 1, getMapStopCount());
}

// Mouse wheel / trackpad: one notch (or one flick) walks one stop down the path
function mapScroll(delta) {
  if (mapWheelCooldown > 0) return;
  mapWheel += delta;
  if (Math.abs(mapWheel) >= 60) {
    mapStep(mapWheel > 0 ? 1 : -1);
    mapWheel = 0;
    mapWheelCooldown = 12;
  }
}

// Clicking an edge arrow walks to that neighbor; true if one was hit
function mapArrowClicked(mx, my) {
  for (const dir of [-1, 1]) {
    const next = difficultySelection + dir;
    if (next < 1 || next > getMapStopCount()) continue;
    if (pointInRect(mx, my, getMapArrowRect(dir))) {
      mapStep(dir);
      return true;
    }
  }
  return false;
}

let mapTrees = null;
function getMapTrees() {
  if (mapTrees) return mapTrees;
  mapTrees = [];
  const w = getMenuWidth();
  const h = getMenuHeight();
  const len = getMapStopWorldX(11) + w * 1.5;
  for (let k = 0; k < 1500; k++) {
    const x = -w / 2 + cineRand(k * 3 + 1) * len;
    const y = h * MAP_TOP + cineRand(k * 7 + 2) * h * (MAP_BOTTOM - MAP_TOP);
    // Keep the path clear
    if (Math.abs(y - mapPathY(x)) < 44) continue;
    mapTrees.push({ x: x, y: y, r: 14 + cineRand(k * 11 + 3) * 18 });
  }
  mapTrees.sort((a, b) => a.x - b.x);
  return mapTrees;
}

function drawDifficultyMap() {
  const w = getMenuWidth();
  const h = getMenuHeight();
  const stops = getMapStopCount();
  const top = h * MAP_TOP;
  const bottom = h * MAP_BOTTOM;
  const endX = getMapStopWorldX(stops);

  // Camera: walks to the selected stop (snaps there when the menu opens)
  const target = getMapStopWorldX(difficultySelection);
  const snap = frameCount - mapLastFrame > 2;
  if (snap) mapCamX = target;
  else mapCamX += (target - mapCamX) * 0.07;
  if (Math.abs(target - mapCamX) < 0.5) mapCamX = target;
  mapLastFrame = frameCount;
  if (mapWheelCooldown > 0) mapWheelCooldown--;
  const left = mapCamX - w / 2;
  const right = mapCamX + w / 2;
  const groundAt = wx => getGroundColorFor(constrain(mapValueAt(wx), 1, stops === 11 ? 11 : 10));

  push();
  // Everything stays inside the map's strip
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(0, top, w, bottom - top);
  drawingContext.clip();
  // Forest floor, darkening down the path
  noStroke();
  const band = w / 24;
  for (let sx = 0; sx < w; sx += band) {
    const c = groundAt(left + sx + band / 2);
    fill(c[0] * 0.55, c[1] * 0.55, c[2] * 0.55);
    rect(sx - 1, top, band + 2, bottom - top);
  }

  // The path, shaded by the ground it runs through; past the last stop it fades into the dark
  strokeCap(ROUND);
  const step = 12;
  const fadeLen = 110;
  const pathEnd = stops === 10 ? endX + fadeLen : endX;
  // Shadow first, then the dirt on top, so the legs don't overlap each other's shadows
  for (const pass of [0, 1]) {
    for (let wx = Math.floor(left / step) * step - step; wx < Math.min(right + step, pathEnd); wx += step) {
      const x0 = mapScreenX(wx);
      const x1 = mapScreenX(wx + step);
      const y0 = mapPathY(wx);
      const y1 = mapPathY(wx + step);
      const fade = wx > endX ? 1 - (wx - endX) / fadeLen : 1;
      if (pass === 0) {
        stroke(0, 0, 0, 90 * fade);
        strokeWeight(30 * (0.4 + 0.6 * fade));
        line(x0, y0 + 3, x1, y1 + 3);
      } else {
        const c = groundAt(wx + step / 2);
        stroke(c[0], c[1], c[2], 255 * fade);
        strokeWeight(24 * (0.4 + 0.6 * fade));
        line(x0, y0, x1, y1);
      }
    }
  }

  // Trees: green at the forest's edge, sickly purple deep in ant territory
  noStroke();
  for (const t of getMapTrees()) {
    if (t.x < left - 40) continue;
    if (t.x > right + 40) break;
    const x = mapScreenX(t.x);
    const leaf = lerpRgb([58, 120, 48], [70, 40, 80], constrain((mapValueAt(t.x) - 1) / 9.5, 0, 1));
    fill(0, 0, 0, 70);
    ellipse(x + 4, t.y + 5, t.r * 2);
    fill(leaf[0], leaf[1], leaf[2]);
    ellipse(x, t.y, t.r * 2);
    fill(leaf[0] * 1.25, leaf[1] * 1.25, leaf[2] * 1.25);
    ellipse(x - t.r * 0.3, t.y - t.r * 0.3, t.r);
  }

  // Ant trails scurrying along the path toward the nest
  fill(40, 10, 10, 200);
  for (let k = 0; k < 150; k++) {
    const wx = ((frameCount * 0.0004 + k / 150) % 1) * endX;
    if (wx < left - 10 || wx > right + 10) continue;
    ellipse(mapScreenX(wx) + Math.sin(k * 3) * 6, mapPathY(wx) + Math.cos(k * 5) * 5, 5, 4);
  }

  // Stops (just the ones on screen)
  textAlign(CENTER, CENTER);
  for (let v = 1; v <= stops; v++) {
    const p = getMapStop(v);
    if (p.x < -80 || p.x > w + 80) continue;
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

  // The beetle walks the path with the camera, then stands on the stop it reached
  const away = Math.abs(target - mapCamX);
  const walking = constrain(away / 90, 0, 1);
  const lift = (difficultySelection === 11 ? 58 : 46) * (1 - walking);
  const by = mapPathY(mapCamX);
  const dir = target >= mapCamX ? 1 : -1;
  const wantAngle = walking > 0.25 ? Math.atan2(mapPathY(mapCamX + dir * 8) - by, dir * 8) : -Math.PI / 2;
  if (snap || mapBeetleAngle === null) mapBeetleAngle = wantAngle;
  mapBeetleAngle = sceneLerpAngle(mapBeetleAngle, wantAngle, 0.25);
  const bob = walking > 0.25 ? -Math.abs(Math.sin(frameCount * 0.4)) * 3 : Math.sin(frameCount * 0.15) * 2;
  push();
  angleMode(RADIANS);
  imageMode(CENTER);
  translate(w / 2 - 2, by - lift + bob);
  rotate(mapBeetleAngle);
  image(beetle, 0, 0, 56, 56);
  pop();

  // Arrows to the stops off either edge
  for (const side of [-1, 1]) {
    const next = difficultySelection + side;
    if (next < 1 || next > stops) continue;
    const a = getMapArrowRect(side);
    const hover = pointInRect(getMenuMouseX(), getMenuMouseY(), a);
    const cx = a.x + a.w / 2;
    const cy = a.y + a.h / 2;
    const nudge = Math.sin(frameCount * 0.1) * 3 * side;
    noStroke();
    fill(0, 0, 0, hover ? 170 : 120);
    ellipse(cx, cy, a.w);
    fill(255, hover ? 255 : 200);
    triangle(cx + nudge + side * 14, cy, cx + nudge - side * 6, cy - 13, cx + nudge - side * 6, cy + 13);
    textSize(14);
    textStyle(BOLD);
    text(next === 11 ? '???' : next, cx, cy + a.h / 2 + 12);
    textStyle(NORMAL);
  }
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
