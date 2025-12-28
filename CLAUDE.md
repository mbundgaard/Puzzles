# Claude Development Guidelines

## Project Overview

This is a collection of browser-based puzzles and mind games. Each puzzle is a standalone HTML/CSS/JS application in its own numbered folder.

## Requirements

### Touch-First Design

All puzzles MUST work on mobile devices with touch-only input:

- **No right-click dependencies**: Right-click is unavailable on touch devices. If a puzzle needs secondary actions (like marking cells), provide a visible toggle button or mode selector.
- **Tap targets**: Interactive elements should be at least 44x44 pixels for easy tapping.
- **No hover-only interactions**: Any hover effects should be supplementary, not required for gameplay.

### Structure

```
├── index.html              # Main puzzle index
├── XX-puzzle-name/         # Numbered folder per puzzle
│   ├── index.html          # Puzzle page
│   ├── style.css           # Styles
│   └── script.js           # Game logic
```

### Styling Guidelines

- Board game aesthetic with warm, tactile feel
- Responsive design for mobile and desktop
- Consistent color palette (browns, greens, parchment tones)
- Clear visual feedback for interactions

### Each Puzzle Should Have

1. Clear title and puzzle number
2. "New Game" button
3. Rules/instructions section
4. "Back to Puzzles" link
5. Victory detection and celebration

## Adding a New Puzzle

1. Create folder `XX-puzzle-name/` with next available number
2. Implement with index.html, style.css, script.js
3. Add entry to root index.html
4. Update README.md puzzle table
5. Ensure touch-only gameplay works
