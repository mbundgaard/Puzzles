# Maskeværk — Game Specification

*A cozy knitting-themed puzzle game where players repair small knitted projects*

---

## Overview

**Game Name**: Maskeværk (Danish: "Stitch Work")
**Tagline**: "Reparer hyggelige strikkeprojekter, én maske ad gangen"
**Genre**: Relaxing puzzle game
**Platform**: Mobile-first web (single HTML file)
**Session Length**: 5-15 minutes per puzzle
**Target Audience**: Casual puzzle fans, knitting enthusiasts, cozy game lovers

---

## Core Concept

Players are presented with small knitted swatches (scarves, mittens, hat sections) that have "damage":
- **Dropped stitches** — empty spaces where loops should be
- **Flipped stitches** — knits that should be purls, or vice versa  
- **Color mismatches** — wrong yarn color (advanced levels)

Using simple tap-based tools, players repair the swatch to match a target pattern.

---

## Technical Requirements

### Stack
- Single HTML file with embedded CSS and JavaScript
- No external dependencies (no frameworks, no CDN)
- No backend required
- LocalStorage for saving progress

### Compatibility
- Mobile-first, responsive design
- Touch-only interaction (tap, no drag/swipe required)
- Works on iOS Safari, Android Chrome
- Graceful desktop support (mouse clicks)

### Performance
- Instant load (< 100KB total)
- 60fps animations
- No perceptible input lag

---

## Game Mechanics

### Stitch Types

```
KNIT STITCH (displayed as V shape pointing down):
- Visual: Smooth chevron ∨ 
- Represents: Right-side knit stitch
- Color: Inherits yarn color

PURL STITCH (displayed as horizontal bump):
- Visual: Rounded bar ∧ (like a small pillow)
- Represents: Right-side purl stitch  
- Color: Inherits yarn color

EMPTY CELL (dropped stitch):
- Visual: Dotted circle outline ◌
- Represents: Missing stitch that needs repair
- Shows subtle "dangling yarn" indicator
```

### Tools

Players tap a tool to select it, then tap stitches to apply:

```
HOOK TOOL (🪝):
- Icon: Crochet hook
- Action: Fills an empty cell with the correct stitch type
- Logic: Auto-determines knit/purl based on target pattern
- Only works on empty cells
- Danish label: "Hæklenål"

FLIP TOOL (🔄):  
- Icon: Circular arrows
- Action: Toggles a stitch between knit and purl
- Only works on filled cells
- Danish label: "Vend"

DYE TOOL (🎨):
- Icon: Paint drop or yarn ball
- Action: Cycles through available yarn colors
- Only appears in levels with multiple colors
- Danish label: "Farve"
```

### Win Condition

The puzzle is solved when the player's swatch exactly matches the target pattern:
- All empty cells filled
- All stitches correct type (knit/purl)
- All colors correct (if applicable)

### No Fail State

- No move limit
- No timer
- Unlimited undo
- Wrong moves just don't match — player keeps trying

---

## Visual Design

### Color Palette

```css
/* Dark cozy theme */
--bg-primary: #1a1a2e;      /* Deep navy background */
--bg-secondary: #16213e;     /* Slightly lighter panels */
--bg-surface: #0f0f1a;       /* Card/swatch background */

/* Warm accent colors */
--accent-gold: #e8b749;      /* Primary accent, buttons */
--accent-terracotta: #c17767; /* Secondary accent */
--accent-sage: #7d9f85;      /* Success states */
--accent-rose: #c9a0a0;      /* Soft highlight */
--accent-cream: #f5e6d3;     /* Text, light elements */

/* Yarn colors (for stitches) */
--yarn-cream: #f5e6d3;
--yarn-mustard: #d4a84b;
--yarn-rust: #b35941;
--yarn-forest: #4a6741;
--yarn-navy: #2c3e50;
--yarn-berry: #8b4557;
--yarn-sky: #6b9dad;
--yarn-plum: #6b4570;

/* State colors */
--error-soft: #c17767;       /* Wrong stitch highlight */
--success-soft: #7d9f85;     /* Correct indicator */
--empty-outline: #4a4a6a;    /* Dropped stitch border */
```

### Typography

```css
/* Use system fonts for performance */
--font-main: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-display: Georgia, "Times New Roman", serif; /* For headers */

/* Sizes (mobile-first) */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.25rem;
--text-xl: 1.5rem;
--text-2xl: 2rem;
```

### Layout Structure

```
┌─────────────────────────────────┐
│ HEADER                          │
│ - Game title + yarn ball icon   │
│ - Level number and name         │
│ - Settings gear (optional)      │
├─────────────────────────────────┤
│ TARGET PATTERN                  │
│ - Small preview (40% scale)     │
│ - Label: "Mønster"              │
│ - Dimmed/muted appearance       │
├─────────────────────────────────┤
│ MAIN SWATCH (play area)         │
│ - Full size grid                │
│ - Generous tap targets (44px+)  │
│ - Label: "Dit arbejde"          │
├─────────────────────────────────┤
│ TOOL PALETTE                    │
│ - Horizontal row of tools       │
│ - Selected tool highlighted     │
│ - Danish labels below icons     │
├─────────────────────────────────┤
│ STATUS BAR                      │
│ - Remaining errors count        │
│ - Undo button                   │
│ - Hint button (optional)        │
├─────────────────────────────────┤
│ LEVEL SELECT (when applicable)  │
└─────────────────────────────────┘
```

### Stitch Rendering (SVG)

Each stitch cell should be rendered as SVG for crisp scaling:

```svg
<!-- Knit stitch (V shape) -->
<svg viewBox="0 0 40 40">
  <path d="M8 12 L20 28 L32 12" 
        stroke="currentColor" 
        stroke-width="4" 
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"/>
</svg>

<!-- Purl stitch (bump/bar) -->
<svg viewBox="0 0 40 40">
  <ellipse cx="20" cy="20" rx="14" ry="8" 
           fill="currentColor" 
           opacity="0.9"/>
</svg>

<!-- Empty cell (dropped stitch) -->
<svg viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="12" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-dasharray="4 4"
          fill="none"
          opacity="0.5"/>
  <!-- Optional: dangling yarn hint -->
  <path d="M20 32 Q22 38 20 42" 
        stroke="currentColor" 
        stroke-width="2"
        opacity="0.3"
        fill="none"/>
</svg>
```

### Animations

```css
/* Stitch correction - gentle settle */
.stitch-correct {
  animation: settle 0.3s ease-out;
}
@keyframes settle {
  0% { transform: scale(1.1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

/* Error highlight - soft pulse */
.stitch-error {
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Tool selection */
.tool-selected {
  transform: scale(1.1);
  box-shadow: 0 0 20px var(--accent-gold);
}

/* Level complete celebration */
.swatch-complete {
  animation: relax 0.8s ease-out;
}
@keyframes relax {
  0% { transform: scale(1); }
  30% { transform: scale(1.02); }
  100% { transform: scale(1); filter: brightness(1.1); }
}
```

---

## Level Data Structure

### Level Format (JSON)

```javascript
const level = {
  id: 7,
  name: "Hyggevanter",           // Display name
  nameEn: "Cozy Mittens",        // English reference
  difficulty: 2,                  // 1-5 scale
  gridWidth: 4,
  gridHeight: 4,
  colors: ["cream", "mustard"],   // Available yarn colors
  tools: ["hook", "flip"],        // Available tools (dye only if 2+ colors)
  
  // Target pattern (what player must achieve)
  // Format: "K" = knit, "P" = purl
  // Color suffix: "K1" = knit in color index 1
  target: [
    ["K0", "P0", "K0", "P0"],
    ["P0", "K0", "P0", "K0"],
    ["K0", "P0", "K0", "P0"],
    ["P0", "K0", "P0", "K0"]
  ],
  
  // Starting state (what player sees initially)
  // Format: same as target, plus "X" = empty
  initial: [
    ["K0", "P0", "X",  "P0"],
    ["P0", "P0", "P0", "K0"],  // Row 2, col 2 is wrong (P should be K)
    ["K0", "X",  "K0", "P0"],
    ["P0", "K0", "P0", "K0"]
  ],
  
  // Optional hint text
  hint: "Prøv at fokusere på de tomme felter først"
};
```

### Level Progression

```javascript
const levels = [
  // === TUTORIAL SET (1-5): Hook only ===
  {
    id: 1,
    name: "Første maske",
    difficulty: 1,
    gridWidth: 2,
    gridHeight: 2,
    colors: ["cream"],
    tools: ["hook"],
    target: [
      ["K0", "K0"],
      ["K0", "K0"]
    ],
    initial: [
      ["K0", "X"],
      ["K0", "K0"]
    ],
    hint: "Tryk på hæklenålen, derefter på den tomme plads"
  },
  {
    id: 2,
    name: "To masker",
    difficulty: 1,
    gridWidth: 3,
    gridHeight: 2,
    colors: ["cream"],
    tools: ["hook"],
    target: [
      ["K0", "K0", "K0"],
      ["K0", "K0", "K0"]
    ],
    initial: [
      ["K0", "X", "K0"],
      ["X", "K0", "K0"]
    ]
  },
  {
    id: 3,
    name: "Rib mønster",
    difficulty: 1,
    gridWidth: 4,
    gridHeight: 2,
    colors: ["cream"],
    tools: ["hook"],
    target: [
      ["K0", "P0", "K0", "P0"],
      ["K0", "P0", "K0", "P0"]
    ],
    initial: [
      ["K0", "X", "K0", "P0"],
      ["K0", "P0", "X", "P0"]
    ]
  },
  {
    id: 4,
    name: "Større hul",
    difficulty: 1,
    gridWidth: 3,
    gridHeight: 3,
    colors: ["cream"],
    tools: ["hook"],
    target: [
      ["K0", "P0", "K0"],
      ["P0", "K0", "P0"],
      ["K0", "P0", "K0"]
    ],
    initial: [
      ["K0", "X", "K0"],
      ["X", "K0", "X"],
      ["K0", "X", "K0"]
    ]
  },
  {
    id: 5,
    name: "Retstrik",
    difficulty: 1,
    gridWidth: 4,
    gridHeight: 3,
    colors: ["cream"],
    tools: ["hook"],
    target: [
      ["K0", "K0", "K0", "K0"],
      ["P0", "P0", "P0", "P0"],
      ["K0", "K0", "K0", "K0"]
    ],
    initial: [
      ["K0", "X", "K0", "X"],
      ["X", "P0", "X", "P0"],
      ["K0", "K0", "X", "K0"]
    ]
  },

  // === SCARVES SET (6-10): Hook + Flip ===
  {
    id: 6,
    name: "Vend masken",
    difficulty: 2,
    gridWidth: 3,
    gridHeight: 2,
    colors: ["cream"],
    tools: ["hook", "flip"],
    target: [
      ["K0", "P0", "K0"],
      ["K0", "P0", "K0"]
    ],
    initial: [
      ["K0", "K0", "K0"],  // Middle should be P
      ["K0", "P0", "K0"]
    ],
    hint: "Brug 'Vend' værktøjet til at ændre maske-typen"
  },
  {
    id: 7,
    name: "Lille tørklæde",
    difficulty: 2,
    gridWidth: 4,
    gridHeight: 3,
    colors: ["cream"],
    tools: ["hook", "flip"],
    target: [
      ["K0", "P0", "K0", "P0"],
      ["P0", "K0", "P0", "K0"],
      ["K0", "P0", "K0", "P0"]
    ],
    initial: [
      ["K0", "P0", "X", "P0"],
      ["P0", "P0", "P0", "K0"],  // Position [1][1] wrong
      ["K0", "X", "K0", "K0"]    // Position [2][3] wrong
    ]
  },
  {
    id: 8,
    name: "Perlestrik",
    difficulty: 2,
    gridWidth: 4,
    gridHeight: 4,
    colors: ["cream"],
    tools: ["hook", "flip"],
    target: [
      ["K0", "P0", "K0", "P0"],
      ["P0", "K0", "P0", "K0"],
      ["K0", "P0", "K0", "P0"],
      ["P0", "K0", "P0", "K0"]
    ],
    initial: [
      ["K0", "K0", "K0", "P0"],
      ["P0", "K0", "X", "K0"],
      ["K0", "P0", "K0", "P0"],
      ["K0", "X", "P0", "K0"]
    ]
  },
  {
    id: 9,
    name: "Bred rib",
    difficulty: 2,
    gridWidth: 6,
    gridHeight: 3,
    colors: ["cream"],
    tools: ["hook", "flip"],
    target: [
      ["K0", "K0", "P0", "P0", "K0", "K0"],
      ["K0", "K0", "P0", "P0", "K0", "K0"],
      ["K0", "K0", "P0", "P0", "K0", "K0"]
    ],
    initial: [
      ["K0", "X", "P0", "P0", "K0", "K0"],
      ["K0", "K0", "K0", "P0", "X", "K0"],
      ["K0", "K0", "P0", "K0", "K0", "K0"]
    ]
  },
  {
    id: 10,
    name: "Skakternet",
    difficulty: 2,
    gridWidth: 4,
    gridHeight: 4,
    colors: ["cream"],
    tools: ["hook", "flip"],
    target: [
      ["K0", "K0", "P0", "P0"],
      ["K0", "K0", "P0", "P0"],
      ["P0", "P0", "K0", "K0"],
      ["P0", "P0", "K0", "K0"]
    ],
    initial: [
      ["K0", "X", "P0", "P0"],
      ["K0", "K0", "K0", "P0"],
      ["P0", "X", "K0", "K0"],
      ["K0", "P0", "K0", "K0"]
    ]
  },

  // === MITTENS SET (11-15): Hook + Flip + Color ===
  {
    id: 11,
    name: "To farver",
    difficulty: 3,
    gridWidth: 4,
    gridHeight: 3,
    colors: ["cream", "mustard"],
    tools: ["hook", "flip", "dye"],
    target: [
      ["K0", "K0", "K1", "K1"],
      ["K0", "K0", "K1", "K1"],
      ["K0", "K0", "K1", "K1"]
    ],
    initial: [
      ["K0", "K0", "K0", "K1"],  // [0][2] wrong color
      ["K0", "X", "K1", "K1"],
      ["K0", "K0", "K1", "K1"]
    ],
    hint: "Brug 'Farve' til at skifte garnfarve"
  },
  {
    id: 12,
    name: "Striber",
    difficulty: 3,
    gridWidth: 4,
    gridHeight: 4,
    colors: ["cream", "rust"],
    tools: ["hook", "flip", "dye"],
    target: [
      ["K0", "K0", "K0", "K0"],
      ["K1", "K1", "K1", "K1"],
      ["K0", "K0", "K0", "K0"],
      ["K1", "K1", "K1", "K1"]
    ],
    initial: [
      ["K0", "K1", "K0", "K0"],
      ["K1", "X", "K1", "K1"],
      ["K0", "K0", "K1", "K0"],
      ["K1", "K1", "K1", "K0"]
    ]
  },
  {
    id: 13,
    name: "Vante mønster",
    difficulty: 3,
    gridWidth: 5,
    gridHeight: 4,
    colors: ["cream", "forest"],
    tools: ["hook", "flip", "dye"],
    target: [
      ["K1", "K0", "K1", "K0", "K1"],
      ["K0", "K1", "K0", "K1", "K0"],
      ["K1", "K0", "K1", "K0", "K1"],
      ["K0", "K1", "K0", "K1", "K0"]
    ],
    initial: [
      ["K1", "X", "K1", "K0", "K1"],
      ["K0", "K0", "K0", "K1", "K0"],
      ["K1", "K0", "K1", "X", "K1"],
      ["K0", "K1", "K1", "K1", "K0"]
    ]
  },
  {
    id: 14,
    name: "Norsk mønster",
    difficulty: 3,
    gridWidth: 5,
    gridHeight: 5,
    colors: ["cream", "navy"],
    tools: ["hook", "flip", "dye"],
    target: [
      ["K0", "K1", "K0", "K1", "K0"],
      ["K1", "K0", "K0", "K0", "K1"],
      ["K0", "K0", "K1", "K0", "K0"],
      ["K1", "K0", "K0", "K0", "K1"],
      ["K0", "K1", "K0", "K1", "K0"]
    ],
    initial: [
      ["K0", "K1", "X", "K1", "K0"],
      ["K1", "K1", "K0", "K0", "K1"],
      ["K0", "K0", "K1", "K0", "X"],
      ["K1", "K0", "K0", "K1", "K1"],
      ["K0", "X", "K0", "K1", "K0"]
    ]
  },
  {
    id: 15,
    name: "Selburose",
    difficulty: 4,
    gridWidth: 5,
    gridHeight: 5,
    colors: ["cream", "berry"],
    tools: ["hook", "flip", "dye"],
    target: [
      ["K0", "K0", "K1", "K0", "K0"],
      ["K0", "K1", "K0", "K1", "K0"],
      ["K1", "K0", "K1", "K0", "K1"],
      ["K0", "K1", "K0", "K1", "K0"],
      ["K0", "K0", "K1", "K0", "K0"]
    ],
    initial: [
      ["K0", "X", "K1", "K0", "K0"],
      ["K0", "K1", "K1", "K1", "K0"],
      ["K1", "K0", "K1", "X", "K1"],
      ["K0", "K0", "K0", "K1", "K0"],
      ["K0", "K0", "K1", "K0", "K1"]
    ]
  }
];
```

---

## UI Text (Danish)

```javascript
const uiText = {
  // Header
  gameTitle: "Maskeværk",
  levelPrefix: "Niveau",
  
  // Labels
  targetLabel: "Mønster",
  swatchLabel: "Dit arbejde",
  
  // Tools
  toolHook: "Hæklenål",
  toolFlip: "Vend",
  toolDye: "Farve",
  
  // Status
  emptyCount: "Tomme",
  wrongCount: "Forkerte",
  
  // Buttons
  undo: "Fortryd",
  hint: "Hint",
  reset: "Start forfra",
  nextLevel: "Næste niveau",
  levelSelect: "Vælg niveau",
  
  // Messages
  levelComplete: "Flot arbejde!",
  levelCompleteSubtitle: "Dit projekt er repareret",
  allLevelsComplete: "Tillykke! Du har klaret alle niveauer",
  
  // Tutorial hints
  tutorialHook: "Tryk på hæklenålen, derefter på et tomt felt",
  tutorialFlip: "Tryk på 'Vend' for at ændre masketypen",
  tutorialDye: "Tryk på 'Farve' for at skifte garnfarve",
  
  // Accessibility
  stitchKnit: "Ret maske",
  stitchPurl: "Vrang maske",
  stitchEmpty: "Tom maske",
  colorNames: {
    cream: "Creme",
    mustard: "Sennep",
    rust: "Rust",
    forest: "Skovgrøn",
    navy: "Marineblå",
    berry: "Bær",
    sky: "Himmelblå",
    plum: "Blomme"
  }
};
```

---

## Game State Management

```javascript
// Main game state object
const gameState = {
  currentLevel: 1,
  unlockedLevels: 1,
  currentGrid: [],           // 2D array of current stitch states
  selectedTool: "hook",      // "hook" | "flip" | "dye"
  moveHistory: [],           // For undo functionality
  hintsUsed: 0,
  levelStartTime: null,
  
  // Computed
  get errorsRemaining() {
    let count = 0;
    const level = levels[this.currentLevel - 1];
    for (let row = 0; row < level.gridHeight; row++) {
      for (let col = 0; col < level.gridWidth; col++) {
        if (this.currentGrid[row][col] !== level.target[row][col]) {
          count++;
        }
      }
    }
    return count;
  },
  
  get isComplete() {
    return this.errorsRemaining === 0;
  }
};

// Persistence functions
function saveProgress() {
  localStorage.setItem('maskevaerk_progress', JSON.stringify({
    unlockedLevels: gameState.unlockedLevels,
    currentLevel: gameState.currentLevel
  }));
}

function loadProgress() {
  const saved = localStorage.getItem('maskevaerk_progress');
  if (saved) {
    const data = JSON.parse(saved);
    gameState.unlockedLevels = data.unlockedLevels || 1;
    gameState.currentLevel = data.currentLevel || 1;
  }
}
```

---

## Interaction Logic

### Tool Actions

```javascript
function handleCellTap(row, col) {
  const level = levels[gameState.currentLevel - 1];
  const currentStitch = gameState.currentGrid[row][col];
  const targetStitch = level.target[row][col];
  
  // Save state for undo
  saveToHistory();
  
  switch (gameState.selectedTool) {
    case "hook":
      // Only works on empty cells
      if (currentStitch === "X") {
        // Fill with target stitch (auto-correct type and color)
        gameState.currentGrid[row][col] = targetStitch;
        playSound("hook");
        animateStitch(row, col, "settle");
      } else {
        playSound("error");
        animateStitch(row, col, "shake");
      }
      break;
      
    case "flip":
      // Only works on filled cells
      if (currentStitch !== "X") {
        const color = currentStitch[1];
        const type = currentStitch[0];
        // Toggle K <-> P
        const newType = type === "K" ? "P" : "K";
        gameState.currentGrid[row][col] = newType + color;
        playSound("flip");
        animateStitch(row, col, "flip");
      } else {
        playSound("error");
      }
      break;
      
    case "dye":
      // Only works on filled cells, cycles through colors
      if (currentStitch !== "X") {
        const type = currentStitch[0];
        const currentColorIndex = parseInt(currentStitch[1]);
        const nextColorIndex = (currentColorIndex + 1) % level.colors.length;
        gameState.currentGrid[row][col] = type + nextColorIndex;
        playSound("dye");
        animateStitch(row, col, "color");
      } else {
        playSound("error");
      }
      break;
  }
  
  updateDisplay();
  checkWinCondition();
}

function undo() {
  if (gameState.moveHistory.length > 0) {
    gameState.currentGrid = gameState.moveHistory.pop();
    playSound("undo");
    updateDisplay();
  }
}

function saveToHistory() {
  // Deep copy current grid
  const copy = gameState.currentGrid.map(row => [...row]);
  gameState.moveHistory.push(copy);
  // Limit history to 50 moves
  if (gameState.moveHistory.length > 50) {
    gameState.moveHistory.shift();
  }
}
```

### Win Condition

```javascript
function checkWinCondition() {
  if (gameState.isComplete) {
    // Delay for final animation to play
    setTimeout(() => {
      showCompletionModal();
      
      // Unlock next level
      if (gameState.currentLevel >= gameState.unlockedLevels) {
        gameState.unlockedLevels = Math.min(
          gameState.currentLevel + 1, 
          levels.length
        );
        saveProgress();
      }
    }, 300);
  }
}
```

---

## Accessibility Requirements

### Touch Targets
- Minimum 44×44px tap targets for all interactive elements
- Grid cells should be at least 48×48px on mobile
- Tools palette buttons: 56×56px minimum

### Screen Reader Support
```html
<!-- Example stitch cell -->
<button 
  class="stitch-cell"
  role="gridcell"
  aria-label="Række 2, kolonne 3: Ret maske, creme farve. Forventet: Vrang maske"
  aria-pressed="false"
>
  <!-- SVG stitch graphic -->
</button>

<!-- Tool button -->
<button 
  class="tool-button"
  aria-label="Hæklenål værktøj - udfylder tomme masker"
  aria-pressed="true"
>
  🪝
</button>
```

### Visual Indicators
- Selected tool: Bold outline + subtle glow
- Wrong stitches: Gentle pulsing border (not harsh red)
- Empty cells: Dashed border + reduced opacity
- Correct stitches: No special indicator (looks normal)

### Color Contrast
- All text meets WCAG AA contrast ratio (4.5:1)
- Yarn colors distinguishable with color blindness simulation
- Don't rely solely on color — shapes differ too

---

## Sound Design (Optional)

Keep sounds subtle and optional. All should be short (< 500ms), warm, and non-intrusive:

```javascript
const sounds = {
  hook: "Soft 'click' like knitting needles",
  flip: "Gentle 'whoosh' rotation sound",
  dye: "Soft 'dip' or 'squish' sound",
  undo: "Light 'pop' or reverse click",
  error: "Soft low 'thump' - not harsh",
  complete: "Warm chime or gentle fanfare",
  levelStart: "Soft ambient 'settle' sound"
};

// Sound toggle in settings
let soundEnabled = true;
function playSound(name) {
  if (!soundEnabled) return;
  // Play sound...
}
```

---

## Responsive Layout

### Mobile Portrait (Primary)
```css
/* Base: iPhone SE and up */
@media (max-width: 480px) {
  .game-container {
    padding: 12px;
  }
  .target-preview {
    transform: scale(0.5);
    margin-bottom: 8px;
  }
  .main-swatch {
    --cell-size: calc((100vw - 48px) / var(--grid-cols));
    max-width: 100%;
  }
  .tool-palette {
    gap: 16px;
  }
  .tool-button {
    width: 56px;
    height: 56px;
  }
}
```

### Tablet / Large Mobile
```css
@media (min-width: 481px) and (max-width: 768px) {
  .game-container {
    max-width: 500px;
    margin: 0 auto;
  }
  .main-swatch {
    --cell-size: 52px;
  }
}
```

### Desktop
```css
@media (min-width: 769px) {
  .game-container {
    max-width: 600px;
    margin: 40px auto;
  }
  .main-swatch {
    --cell-size: 56px;
  }
  /* Optional: Show both target and swatch side-by-side */
}
```

---

## Implementation Checklist

### Phase 1: Core Structure
- [ ] HTML skeleton with semantic structure
- [ ] CSS variables and base styles
- [ ] Dark theme implementation
- [ ] Responsive grid layout
- [ ] Basic stitch SVG rendering

### Phase 2: Game Logic
- [ ] Level data structure
- [ ] Game state management
- [ ] Tool selection logic
- [ ] Cell tap handling
- [ ] Win condition checking
- [ ] Undo functionality

### Phase 3: UI Polish
- [ ] Stitch animations (settle, flip, color change)
- [ ] Tool selection highlight
- [ ] Error state indicators
- [ ] Completion modal
- [ ] Level select screen

### Phase 4: Persistence & Progress
- [ ] LocalStorage save/load
- [ ] Level unlock system
- [ ] Progress indicators

### Phase 5: Final Polish
- [ ] Sound effects (optional)
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Touch target verification

---

## File Structure

Since this is a single HTML file:

```html
<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maskeværk</title>
  <style>
    /* All CSS here */
  </style>
</head>
<body>
  <!-- Game HTML structure -->
  
  <script>
    // All JavaScript here
    // 1. Constants (colors, levels, UI text)
    // 2. Game state
    // 3. Rendering functions
    // 4. Game logic functions
    // 5. Event handlers
    // 6. Initialization
  </script>
</body>
</html>
```

---

## Notes for Implementation

1. **Start simple**: Get levels 1-5 working first (hook only), then add complexity.

2. **Touch feedback**: Every tap should have immediate visual feedback, even if invalid.

3. **Animation timing**: Keep animations under 300ms — snappy but smooth.

4. **Error states**: Never block the player. Wrong moves just don't progress the puzzle.

5. **Level balance**: Early levels should be solvable in under 10 taps. Later levels can require 20-30.

6. **Testing**: Test on actual mobile devices, not just browser dev tools.

7. **Color accessibility**: Test with color blindness simulators — the knit/purl shapes should be distinguishable even without color.

---

*End of specification*
