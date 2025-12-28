# Claude Development Guidelines

## Project Overview

This is a collection of browser-based puzzles and mind games. Each puzzle is a standalone HTML/CSS/JS application in its own numbered folder.

## Requirements

### Language

**All UI text must be in Danish.** This includes:
- Titles and subtitles
- Button labels
- Instructions and rules
- Status messages
- Victory messages

### Touch-First Design

All puzzles MUST work on mobile devices with touch-only input (no mouse, no keyboard):

- **No right-click dependencies**: Right-click is unavailable on touch devices. If a puzzle needs secondary actions (like marking cells), provide a visible toggle button or mode selector.
- **No keyboard dependencies**: All gameplay must be possible with touch/tap only.
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
2. "Nyt Spil" button (New Game)
3. Rules/instructions section in Danish
4. "Tilbage til Puslespil" link (Back to Puzzles)
5. Victory detection and celebration

## Adding a New Puzzle

1. Create folder `XX-puzzle-name/` with next available number
2. Implement with index.html, style.css, script.js
3. Add entry to root index.html
4. Update README.md puzzle table
5. Ensure touch-only gameplay works
6. All text in Danish

## Main Page (index.html)

The main page should include:

1. **Title**: "Tænkeren"
2. **Subtitle**: Brief description in Danish
3. **Puzzle grid**: Cards linking to each puzzle
4. **Share button**: Icon (📤) in top-right corner that opens QR code popup
5. **QR code popup**: Links to https://mbundgaard.github.io/Puzzles/index.html
6. **iOS meta tags**: For "Add to Home Screen" functionality
   - `apple-mobile-web-app-capable`
   - `apple-mobile-web-app-title`
   - `apple-touch-icon` (180x180 PNG)

## Git Workflow

- Commit messages in Danish
- Push to feature branch, not main
- Clear, descriptive commit messages
