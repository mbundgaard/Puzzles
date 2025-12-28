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

- **Mobile first, desktop compatible**: Design for mobile screens first, but ensure it works well on desktop too
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

- Modern gaming/app aesthetic with dark theme
- Glassmorphism effects (blur, transparency, subtle borders)
- Responsive design for mobile and desktop
- Color palette: Dark backgrounds (#0f0f23), purple/magenta/cyan accents, white text
- Poppins font for modern feel
- Animated elements and smooth transitions
- Clear visual feedback for interactions (scale on tap, color accents)

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

The main page uses a modern gaming/app design with:

1. **Header**:
   - Title "Tænkeren" with gradient text effect
   - Share button (SVG icon) with glassmorphism style
2. **Subtitle**: "Træn din hjerne med sjove udfordringer"
3. **Game grid**: Square cards (2 columns on mobile, 3 on desktop)
   - Each card has: badge (#XX), large icon, title, short description
   - Glassmorphism background with colored accent line on tap
   - Play indicator appears on active state
   - Unique accent color per game
4. **Footer**: Refresh button with spinning animation
5. **Animated background**: Pulsing gradient orbs in purple/magenta/cyan
6. **QR modal**: Dark theme modal with pop animation
7. **iOS/Android meta tags**: For "Add to Home Screen" functionality
   - `apple-mobile-web-app-capable`
   - `apple-mobile-web-app-title`
   - `apple-touch-icon` (180x180 PNG)
   - `theme-color` (#0f0f23)

## Git Workflow

- Commit messages in Danish
- Push to feature branch, not main
- Clear, descriptive commit messages
