# Antagonist - Copilot Instructions

**Project**: p5.js evolutionary game where player controls a beetle defending against procedurally-evolved enemy ants.

## Architecture

### Core Game Loop & State Management
- **`sketch.js`**: Monolithic 2200+ line file containing all game logic (no external modules)
- **Global state arrays** (indexed from 1, not 0): `antX[], antY[], bulletSpeed[], antSpeed[], bulletCooldown[]`, etc.
- **Game flow**: `setup()` → `draw()` loop → `start` flag gates gameplay
- **Scene states**: splash screen → main menu → antdex (discovery log) → gameplay → round results

### Entity System: Indexed Arrays
Enemies ("ants") are tracked via **parallel arrays** by index (`i = 1 to enemyCount`):
- **Position/Movement**: `antX[i], antY[i], antMoveX[i], antMoveY[i], antSpeed[i]`
- **Combat**: `bulletSpeed[i], bulletCooldown[i], bulletSize[i], shotOffsetX[i], shotOffsetY[i]`
- **Behavior flags**: `followBeetle[i], followAnt[i], findLocation[i], standStill[i], followTarget[i], keepDistance[i]`
- **Genealogy**: `autonomy[i], followValue[i], distanceFromAnchor[i]` (determine behavior type on spawn)

**Player** (beetle) is tracked separately: `playerX, playerY, playerSpeed, shield, health`

### Evolutionary Algorithm (Central Feature)
**Between rounds** (`nextRound()` function, line ~1700):
1. **Selection**: Rank ants by `points/lives` ratio via `getTopAnts()`
2. **Reproduction**: Top 3 ants breed 50%, 30%, 20% of next generation
3. **Mutation**: Offspring inherit parent stats ± random deltas within constrained ranges:
   - `bulletSpeed: ±50, range [60-300]`
   - `bulletCooldown: ±5, range [79-200]`
   - `antSpeed: ±0.3-0.5, range [0.9-3]`
   - **Behavioral genes**: `autonomy` (0=follow target, 1=keep distance), `followValue` (0-3 = different movement types)
4. **Fitness tracking**: `antPoints[i]` accumulates hits dealt; `antLives[i]` counts deaths

**Key mutation rate drivers**:
- Levels 1-3: `movementMutationRate = 0.1`
- Levels 4-7: `movementMutationRate = 0.2`
- Levels 8+: `movementMutationRate = 0.4`

### Ant Behavior Types
**Defined by combination of `autonomy` and `followValue`** (rounded to nearest integer):

| autonomy | followValue | Behavior | Example |
|----------|-------------|----------|---------|
| 0 | 0 | Follow player directly | Straight chasers |
| 0 | 1 | Follow nearest ant | Herding behavior |
| 0 | 2 | Seek standing point | Positioning |
| 0 | 3 | Stay still | Stationary turrets |
| 1 | 0 | Keep distance from player | Circling opponents |
| 1 | 1 | Keep distance from nearest ant | Group spreaders |
| 1 | 2 | Orbit standing point at distance | Perimeter guards |
| 1 | 3 | Maintain distance from spawn | Static anchored ants |

### Player Mechanics
- **Movement**: WASD/arrows, speed scales as `BASE_PLAYER_SPEED / enemyCount` (balances difficulty)
- **Dash**: Shift key, 7x speed for 0.25s, 2s cooldown
- **Shoot**: Spacebar (or mobile button), 3 shots per round, 4-directional (0°/90°/180°/270°)
- **Health**: 10 HP; shield (3 pts) absorbs hits first; health regen on ant kills
- **Mobile**: Touch buttons defined in `buttons` object; desktop priority

### Round Progression
- **Time limit**: `timeCount` decrements each frame
  - Levels 1-3: 10 frames (~0.17s)
  - Levels 4-7: 30 frames (~0.5s)
  - Levels 8+: 60 frames (~1s)
- **Enemy scaling**: `enemyCount++` each round until level 16 (cap at ~16 ants)
- **Win condition**: Survive `timeCount` → advance; Top 3 ants breed
- **Lose condition**: `health < 1` → game over, restart option

## Critical Workflows

### Running Locally
```powershell
# Terminal must be in project root
python -m http.server 8000
# OR
npx http-server -p 8000

# Then open: http://localhost:8000
```
(Documented in `index.html` comment block)

### Discovery System (Antdex)
- **Triggered on**: Player encounters specific ant stat combinations (see `updateAntDexEntries()` line ~1900)
- **Storage**: `storeItem()` / `getItem()` uses browser localStorage under keys like `movementType1PreviouslyDiscovered`
- **Display**: `antdexScreen()` shows card-based UI with smooth scrolling; progress bar animates through colors
- **Unlock conditions**: Exact stat matches (e.g., `bulletSpeed[i] === 60`, `antSpeed[i] === 3`)

### Sound Effects
- **Pool strategy**: Check `!sound.isPlaying()` before `.play()` to avoid overlaps
- **Current sounds**: Hit effects, shield loss, spit, dash, music tracks (title/game/end)
- **Files**: `sounds/*.mp3` loaded via `loadSound()` in `preload()`

## Code Patterns & Conventions

### Array Indexing (1-Based)
```javascript
// Enemy loops always start at i=1, NOT i=0
for (let i = 1; i <= enemyCount; i++) { /* ... */ }

// During setup: initialize from i=1
for (let i = 1; i < enemyCount + 1; i++) { antX[i] = ...; }
```
**Never** use `i < enemyCount` for setup; use `i < enemyCount + 1` or `i <= enemyCount`.

### Rendering Coordinates
- Canvas top-left: (0, 0); bottom-right: (windowWidth, windowHeight)
- Score bar height: 40px reserved at top; playable area: y ∈ [scoreBarHeight, windowHeight]
- Ant spawn buffer: `ANT_SPAWN_BUFFER = 20` pixels from edges
- Image centering: Use `imageMode(CENTER)` before `image()` to rotate correctly

### Delta Time (Frame-Based)
- All animations/cooldowns use frame counts: `frameCount % bulletCooldown[i] === 0`
- Smoothing: Linear interpolation `lerp(current, target, 0.2)` for animations
- Time progression: `comboTime--` each frame; decrement rate balances gameplay

### Collision Detection
- **Circle-based**: `(b.x - antX[j])^2 + (b.y - antY[j])^2` (squared distance)
- **Box approximation**: `b.x < antX[j] + 25 && b.x > antX[j] - 25 && b.y < antY[j] + 25 && b.y > antY[j] - 25`
- **Cleanup**: Remove bullets/particles immediately upon collision via `splice()`

### State Flag Patterns
- Boolean state machines: `start`, `dash`, `end`, `antdex`, `showDiscoveryPopup`
- Transition via: check event → set `true` → draw logic → set `false` after resolution
- Multiple flags can be true; precedence is in `draw()` order

## Adding Features

### New Ant Behavior Type
1. Choose next `followValue` or `autonomy` value combination
2. Add conditional in `autonomousAntMovement()` (line ~924)
3. Add discovery trigger in `updateAntDexEntries()` with condition (line ~1900)
4. Add `antDexEntries` card with name/description in same function
5. Assign random initial value in `setup()` (line ~230)

### New Stat (Gene)
1. Add global array: `let newStat[]; ` at top
2. Initialize in `setup()`: `newStat[i] = ...;`
3. Mutate in `nextRound()`: `newStat[i] = constrain(newStat[parent.id] + random(...), min, max);`
4. Use in behavior/combat logic (e.g., `autonomousAntMovement()`, `enemyShoot1()`)

### UI Screens
- Follow pattern: `if (conditionFlag) { fill/text/rect logic; if (input) set nextFlag; }`
- Position text relative to `windowWidth` / `windowHeight` (not hardcoded pixels)
- Use `textSize()` before each `text()` call (persists otherwise)

## Key Files
- **`sketch.js`**: Game engine (only code file; edit here)
- **`index.html`**: Entry point; loads p5.js CDN + local `sketch.js`
- **`style.css`**: Minimal styling (body margin/padding reset)
- **`jsconfig.json`**: ES6 target + p5.js type hints

## Common Pitfalls
1. **Off-by-one in loops**: Always `i=1` to `i<=enemyCount` (not `i<enemyCount`)
2. **Uninitialized arrays**: All enemy arrays must have `[i]` values set in `setup()`
3. **Sound overlap**: Always check `.isPlaying()` before `.play()`
4. **Stat constraints**: Use `constrain()` to lock evolved stats in valid ranges or evolution diverges
5. **Canvas resize**: Use `windowWidth/Height` (not fixed), call `createCanvas()` in `setup()` only
