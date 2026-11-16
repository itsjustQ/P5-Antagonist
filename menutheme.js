// ========== MENU THEME ==========
// The menus sit on the forest floor, like the rounds do. The ground is tinted by how far into ant territory the
// player has gotten: orange at the forest's edge (only difficulty 1 unlocked), shifting through red-brown to purple
// as harder difficulties unlock, and the nest's dark purple once the nest is open (same colors as map.js).
// Cards, panels and outlines take the same tint, so the whole menu shifts together.

const MENU_BACKDROP_SCALE = 1.5;   // Backdrop pixels per menu unit (it's stretched to the window)

let menuThemeCache = null;          // { frame, level, theme }
let menuBackdrop = null;            // { level, canvas }

// Highest difficulty the player can pick (1-10, 11 once the nest is open)
function getMenuProgressLevel() {
  let level = 1;
  while (level < 11 && isDifficultyUnlocked(level + 1)) level++;
  return level;
}

function scaleRgb(c, f) {
  return [Math.round(c[0] * f), Math.round(c[1] * f), Math.round(c[2] * f)];
}

// Checking unlocks reads storage, so it's only redone every half second (or when a dev toggle changes it)
function getMenuTheme() {
  const key = devToolsUnlockAllDifficulties ? 'all' : 'save';
  if (menuThemeCache && menuThemeCache.key === key && frameCount - menuThemeCache.frame < 30) return menuThemeCache.theme;
  const level = getMenuProgressLevel();
  if (!menuThemeCache || menuThemeCache.level !== level) {
    const g = getGroundColorFor(level);
    const nest = level >= 11;
    // The purple grounds are much darker than the orange one, so they're lifted more to stay as colorful
    const lift = nest ? 1.9 : lerp(1, 1.55, (level - 1) / 9);
    const shade = f => scaleRgb(g, Math.min(1, f * lift));
    menuThemeCache = {
      level: level,
      theme: {
        level: level,
        ground: g,
        // Dark bark-and-soil cards that read against the ground behind them
        soil: [shade(0.8), shade(0.55), shade(0.3)],   // Middle, partway out, edges
        card: lerpRgb(shade(0.4), [14, 22, 14], 0.15),
        cardLocked: lerpRgb(shade(0.24), [10, 14, 10], 0.25),
        cardDone: lerpRgb(shade(0.34), [40, 90, 40], 0.55),
        panel: lerpRgb(shade(0.3), [10, 16, 10], 0.2),
        stroke: lerpRgb(shade(1), [255, 225, 180], 0.3),
        strokeDim: lerpRgb(shade(0.65), [60, 70, 50], 0.25),
        selected: lerpRgb([255, 255, 255], [255, 236, 205], 0.6),
        bar: lerpRgb(g, [255, 235, 200], 0.4),
        nest: nest
      }
    };
  }
  menuThemeCache.frame = frameCount;
  menuThemeCache.key = key;
  return menuThemeCache.theme;
}

// Shorthands for the grey fills and strokes the menus used to use
function menuCardFill(alpha = 245) {
  const c = getMenuTheme().card;
  fill(c[0], c[1], c[2], alpha);
}

function menuLockedFill(alpha = 245) {
  const c = getMenuTheme().cardLocked;
  fill(c[0], c[1], c[2], alpha);
}

function menuPanelFill(alpha = 235) {
  const c = getMenuTheme().panel;
  fill(c[0], c[1], c[2], alpha);
}

function menuCardStroke(alpha = 255) {
  const c = getMenuTheme().stroke;
  stroke(c[0], c[1], c[2], alpha);
}

function menuDimStroke(alpha = 255) {
  const c = getMenuTheme().strokeDim;
  stroke(c[0], c[1], c[2], alpha);
}

function menuSelectedFill() {
  const c = getMenuTheme().selected;
  fill(c[0], c[1], c[2]);
}

function menuScrollBarFill(alpha = 150) {
  const c = getMenuTheme().bar;
  fill(c[0], c[1], c[2], alpha);
}

// Fills the whole menu (1280x652 menu units) with the forest floor. `wash` is an optional [r, g, b, a] laid over it
// (the lose screen goes red, the win screen green).
function drawMenuBackdrop(wash) {
  const theme = getMenuTheme();
  if (!menuBackdrop || menuBackdrop.level !== theme.level) {
    menuBackdrop = { level: theme.level, canvas: makeMenuBackdrop(theme) };
  }
  push();
  const ctx = drawingContext;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(menuBackdrop.canvas, 0, 0, getMenuWidth(), getMenuHeight());
  if (wash) {
    noStroke();
    fill(wash[0], wash[1], wash[2], wash[3]);
    rectMode(CORNER);
    rect(0, 0, getMenuWidth(), getMenuHeight());
  }
  pop();
}

// Painted once per tint on a plain 2D canvas (only fills, never copied from the GPU canvas, so a GPU reset can't wipe it)
function makeMenuBackdrop(theme) {
  const s = MENU_BACKDROP_SCALE;
  const W = getMenuWidth();
  const H = getMenuHeight();
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * s);
  canvas.height = Math.round(H * s);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.scale(s, s);
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const g = theme.ground;
  let seed = 7;
  const rand = () => brushRand(seed++);
  // How deep into ant territory (0 at the forest's edge, 1 at difficulty 10 and the nest): the forest litter thins out
  // and the ants take over, with more nests and more trails between them
  const territory = theme.nest ? 1 : (theme.level - 1) / 9;
  const litter = 1 - 0.9 * territory;

  // Soil: lit in the middle, falling off into shade toward the edges
  const soil = ctx.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H / 2, W * 0.62);
  soil.addColorStop(0, rgb(theme.soil[0]));
  soil.addColorStop(0.6, rgb(theme.soil[1]));
  soil.addColorStop(1, rgb(theme.soil[2]));
  ctx.fillStyle = soil;
  ctx.fillRect(0, 0, W, H);

  // Grit and pebbles
  for (let k = 0; k < 420; k++) {
    const light = rand() < 0.5;
    ctx.fillStyle = rgb(light ? lerpRgb(g, [255, 230, 190], 0.15) : scaleRgb(g, 0.18), 0.12 + rand() * 0.18);
    ctx.beginPath();
    ctx.arc(rand() * W, rand() * H, 0.8 + rand() * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Twigs
  ctx.lineCap = 'round';
  for (let k = 0; k < Math.round(26 * litter); k++) {
    const x = rand() * W;
    const y = rand() * H;
    const a = rand() * Math.PI;
    const len = 14 + rand() * 30;
    ctx.strokeStyle = rgb(scaleRgb(g, 0.22), 0.45);
    ctx.lineWidth = 1.5 + rand() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }

  // Fallen leaves, in the ground's own tones plus a few greens
  const leafColors = theme.nest ?
    [[70, 30, 90], [45, 20, 60], [95, 50, 110], [38, 64, 36]] :
    [lerpRgb(g, [235, 160, 60], 0.35), lerpRgb(g, [140, 40, 30], 0.3), scaleRgb(g, 0.65), [52, 80, 40], lerpRgb(g, [230, 200, 90], 0.3)];
  for (let k = 0; k < Math.round(110 * litter); k++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 5 + rand() * 8;
    const c = leafColors[Math.floor(rand() * leafColors.length)];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI * 2);
    ctx.fillStyle = rgb(c, 0.35 + rand() * 0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb(scaleRgb(c, 0.6), 0.5);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.stroke();
    ctx.restore();
  }

  drawMenuAntTerritory(ctx, theme, territory, rand, W, H);

  // Shade before the bushes, so they stand out against a darker rim
  const shade = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.66);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  // Under-brush around the edges, like the rounds (camera.js palettes)
  const bush = CAMERA_CONFIG.underbrush[theme.nest ? 'nest' : 'forest'];
  const highlight = lerpRgb(bush.leaf, theme.nest ? [120, 70, 150] : [110, 150, 70], 0.35);
  const clumps = [];
  const addEdge = (x0, y0, x1, y1, nx, ny, maxReach = 20) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const count = Math.ceil(len / 34);
    for (let k = 0; k <= count; k++) {
      const f = k / count;
      // Mostly hugging the edge, now and then a clump that reaches further in
      const reach = Math.min(maxReach, rand() < 0.12 ? 8 + rand() * 12 : rand() * 6 - 6);
      clumps.push({
        x: lerp(x0, x1, f) - nx * reach + (rand() - 0.5) * 18 * Math.abs(ny),
        y: lerp(y0, y1, f) - ny * reach + (rand() - 0.5) * 18 * Math.abs(nx),
        r: 14 + rand() * 10
      });
    }
  };
  addEdge(0, 0, W, 0, 0, -1);
  addEdge(0, H, W, H, 0, 1, -4); // Kept low: most menus have a line of controls along the bottom
  addEdge(0, 0, 0, H, -1, 0);
  addEdge(W, 0, W, H, 1, 0);
  // Big clumps in the corners
  for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    for (let k = 0; k < 5; k++) clumps.push({ x: cx + (rand() - 0.5) * 110, y: cy + (rand() - 0.5) * 90, r: 34 + rand() * 18 });
  }
  const leavesOf = c => {
    const out = [];
    const n = 4 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const d = k === 0 ? 0 : c.r * (0.35 + rand() * 0.45);
      out.push({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, r: c.r * (0.45 + rand() * 0.35) });
    }
    return out;
  };
  const blob = (c, x, y, r, a = 1) => {
    ctx.fillStyle = rgb(c, a);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const leaves = clumps.map(leavesOf);
  for (const ls of leaves) for (const l of ls) blob([0, 0, 0], l.x + 3, l.y + 5, l.r + 3, 0.35);
  for (const ls of leaves) for (const l of ls) blob(bush.shadow, l.x + 1.5, l.y + 2, l.r + 1.5);
  for (const ls of leaves) for (const l of ls) blob(bush.leaf, l.x, l.y, l.r);
  for (const ls of leaves) {
    const l = ls[0];
    blob(highlight, l.x - l.r * 0.25, l.y - l.r * 0.3, l.r * 0.45, 0.55);
  }
  return canvas;
}

// Ant nests and the trails of ants running between them, more of both the deeper into ant territory
function drawMenuAntTerritory(ctx, theme, territory, rand, W, H) {
  if (territory <= 0) return;
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const g = theme.ground;
  const nestCount = theme.nest ? 6 : Math.round(territory * 5);
  const trailCount = theme.nest ? 10 : Math.max(1, Math.round(territory * 8));

  // Nests sit off to the sides, clear of the menu cards in the middle
  const nests = [];
  for (let k = 0; k < nestCount; k++) {
    const left = k % 2 === 0;
    const x = left ? W * (0.05 + rand() * 0.2) : W * (0.75 + rand() * 0.2);
    const y = H * (0.14 + ((k >> 1) + rand() * 0.8) / Math.ceil(nestCount / 2) * 0.72);
    nests.push({ x: x, y: y, r: 28 + rand() * 14 });
  }

  // A point just off a random edge, where a trail comes in from the forest
  const edgePoint = () => {
    const side = Math.floor(rand() * 4);
    const f = 0.1 + rand() * 0.8;
    if (side === 0) return { x: W * f, y: -10 };
    if (side === 1) return { x: W * f, y: H + 10 };
    if (side === 2) return { x: -10, y: H * f };
    return { x: W + 10, y: H * f };
  };

  const antColor = lerpRgb(scaleRgb(g, 0.15), [10, 6, 4], 0.6);
  const trailColor = scaleRgb(g, 0.45);
  for (let k = 0; k < trailCount; k++) {
    // Nest to nest when there are two, otherwise nest (or forest edge) out to the edge
    const from = nests.length ? nests[k % nests.length] : edgePoint();
    let to = edgePoint();
    if (nests.length > 1 && rand() < 0.45) {
      const other = nests[(k + 1 + Math.floor(rand() * (nests.length - 1))) % nests.length];
      if (other !== from) to = other;
    }
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    const bend1 = (rand() - 0.5) * len * 0.6;
    const bend2 = (rand() - 0.5) * len * 0.6;
    const c1 = { x: from.x + dx * 0.33 + nx * bend1, y: from.y + dy * 0.33 + ny * bend1 };
    const c2 = { x: from.x + dx * 0.66 + nx * bend2, y: from.y + dy * 0.66 + ny * bend2 };
    const at = t => {
      const u = 1 - t;
      return {
        x: u * u * u * from.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * to.x,
        y: u * u * u * from.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * to.y
      };
    };

    // The worn path
    ctx.strokeStyle = rgb(trailColor, 0.25);
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, to.x, to.y);
    ctx.stroke();

    // The ants on it, in bunches with gaps between
    const steps = Math.floor(len * 1.3 / 11);
    let bunch = 0;
    for (let i = 1; i < steps; i++) {
      if (bunch <= 0) {
        if (rand() < 0.35) continue;
        bunch = 3 + Math.floor(rand() * 8);
      }
      bunch--;
      const t = i / steps;
      const p = at(t);
      const q = at(Math.min(1, t + 0.01));
      // Some walk each way
      const angle = Math.atan2(q.y - p.y, q.x - p.x) + (rand() < 0.5 ? Math.PI : 0) + (rand() - 0.5) * 0.4;
      const side = (rand() - 0.5) * 5;
      drawMenuAnt(ctx, p.x - Math.sin(angle) * side, p.y + Math.cos(angle) * side, angle, rgb(antColor, 0.85));
    }
  }

  // Nests on top of their trails: a mound of dug-up dirt round a dark hole
  for (const n of nests) {
    // Dug-up dirt is paler than the ground around it
    const dirt = lerpRgb(theme.soil[0], [235, 200, 160], 0.22);
    const mound = ctx.createRadialGradient(n.x, n.y, n.r * 0.2, n.x, n.y, n.r);
    mound.addColorStop(0, rgb(lerpRgb(dirt, [255, 230, 200], 0.12)));
    mound.addColorStop(0.65, rgb(dirt, 0.85));
    mound.addColorStop(1, rgb(dirt, 0));
    ctx.fillStyle = mound;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 24; k++) {
      const a = rand() * Math.PI * 2;
      const d = n.r * (0.3 + rand() * 0.75);
      ctx.fillStyle = rgb(lerpRgb(dirt, [255, 230, 190], 0.3), 0.7);
      ctx.beginPath();
      ctx.arc(n.x + Math.cos(a) * d, n.y + Math.sin(a) * d, 0.8 + rand() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = rgb([8, 4, 6], 0.9);
    ctx.beginPath();
    ctx.ellipse(n.x, n.y, n.r * 0.26, n.r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // A few ants milling around the entrance
    for (let k = 0; k < 4; k++) {
      const a = rand() * Math.PI * 2;
      const d = n.r * (0.35 + rand() * 0.4);
      drawMenuAnt(ctx, n.x + Math.cos(a) * d, n.y + Math.sin(a) * d, rand() * Math.PI * 2, rgb(antColor, 0.85));
    }
  }
}

// A tiny top-down ant: abdomen, thorax and head in a line, with a hint of legs
function drawMenuAnt(ctx, x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1.2, 1.2);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-1.2, -2.2);
  ctx.lineTo(1.2, 2.2);
  ctx.moveTo(1.2, -2.2);
  ctx.lineTo(-1.2, 2.2);
  ctx.moveTo(0, -2.4);
  ctx.lineTo(0, 2.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-2.6, 0, 1.9, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, 1.1, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1.9, 0, 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
