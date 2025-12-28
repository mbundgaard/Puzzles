# Claude Development Guidelines

## Project Overview

This is a collection of browser-based puzzles and mind games. Each puzzle is a standalone HTML/CSS/JS application in its own numbered folder.

## Requirements

### Language

**Communication with Claude must be in English.** All conversation, questions, and responses should be in English.

**All UI/content text must be in Danish.** This includes:
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
├── shared/
│   ├── api.js              # Shared API client (HjernespilAPI)
│   └── ui.js               # Shared UI components (feedback button)
├── XX-puzzle-name/         # Numbered folder per puzzle
│   ├── index.html          # Puzzle page
│   ├── style.css           # Styles
│   └── script.js           # Game logic
├── api/                    # Azure Functions backend
│   ├── Functions/          # HTTP endpoints
│   ├── Models/             # Data models
│   ├── Storage/            # Azure Table Storage implementations
│   └── Program.cs          # DI and startup
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
4. Close button (X) in top-right corner to return to main page
5. Victory detection and celebration
6. Favicon link: `<link rel="icon" href="../favicon.ico">`
7. API tracking (trackStart/trackComplete)

## Adding a New Puzzle

1. Create folder `XX-puzzle-name/` with next available number
2. Implement with index.html, style.css, script.js
3. Add `<link rel="icon" href="../favicon.ico">` in `<head>`
4. Add close button as first child of container (see below)
5. Add `<script src="../shared/api.js"></script>` before game script
6. Add `<script src="../shared/ui.js"></script>` after api.js (adds feedback button)
7. Add `HjernespilAPI.trackStart('XX')` in newGame()
8. Add `HjernespilAPI.trackComplete('XX')` on victory
9. Add entry to root index.html
10. Update README.md puzzle table
11. Ensure touch-only gameplay works
12. All text in Danish

### Close Button

Each game page has an X button in the top-right corner to return to the main page. Add as first child inside the container:

```html
<div class="game-container">
    <a href="../index.html" class="close-btn" aria-label="Luk">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
    </a>
    <!-- rest of content -->
</div>
```

Required CSS (adjust colors to match game theme):

```css
.game-container {
    position: relative;  /* Add this */
}

.close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    color: rgba(0, 0, 0, 0.5);
    text-decoration: none;
    transition: all 0.2s ease;
}

.close-btn:active {
    transform: scale(0.9);
    background: rgba(0, 0, 0, 0.2);
}
```

### Favicon

The favicon is at `/favicon.ico` in the root. Each game page must include an explicit link because GitHub Pages serves from `/Puzzles/`, not the root:

```html
<link rel="icon" href="../favicon.ico">
```

## Main Page (index.html)

The main page uses a modern gaming/app design with:

1. **Header**:
   - Title "Hjernespil" with gradient text effect
   - Share button (SVG icon) with glassmorphism style
2. **Subtitle**: "Træn din hjerne med sjove udfordringer"
3. **Game grid**: Square cards (2 columns on mobile, 3 on desktop)
   - Each card has: large icon, title, short description
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

## Backend API

**Base URL:** `https://puzzlesapi.azurewebsites.net`

### Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/win` | Record a win `{nickname, game}` |
| GET | `/api/leaderboard?game=all&top=10` | Get top players this month |
| GET | `/api/stats` | Get total wins this month |
| POST | `/api/event` | Record game event `{game, event}` (event: "start" or "complete") |
| GET | `/api/usage?game=all` | Get usage stats this month |
| GET | `/api/today` | Get today's starts and completions |
| POST | `/api/feedback` | Submit feedback `{game, rating, text?, nickname?}` |
| GET | `/api/feedback?game=XX&limit=50` | Get recent feedback |
| GET | `/api/feedback/stats` | Get feedback statistics |

### Game numbers
Games are identified by their folder number (01-14). Numbers are never reused if a game is removed.

| Number | Game |
|--------|------|
| 01 | Reversi |
| 02 | Telte og Træer |
| 03 | Sudoku |
| 04 | Nonogram |
| 05 | 2048 |
| 06 | Minestryger |
| 07 | Hukommelse |
| 08 | Kabale |
| 09 | Kalaha |
| 10 | Ordleg |
| 11 | Kryds og Bolle |
| 12 | Rørføring |
| 13 | 15-Puslespil |
| 14 | Kodeknækker |

### Shared API Client (shared/api.js)

All games must include the shared API client for tracking:

```html
<script src="../shared/api.js"></script>
<script src="script.js"></script>
```

#### Required Integration

Every game MUST call these two methods:

```javascript
// 1. In newGame() function - track when a new game starts
newGame() {
    // ... game initialization code ...
    HjernespilAPI.trackStart('XX');  // Replace XX with game number
}

// 2. In victory detection - track when player wins
if (playerWins) {
    HjernespilAPI.trackComplete('XX');  // Replace XX with game number
}
```

#### Complete Integration Example

```javascript
class MyGame {
    newGame() {
        // Reset game state
        this.board = this.generateBoard();
        this.moves = 0;
        this.gameOver = false;
        this.render();

        // Track game start
        HjernespilAPI.trackStart('15');
    }

    checkWin() {
        if (this.isSolved()) {
            this.gameOver = true;
            this.showVictory();

            // Track completion
            HjernespilAPI.trackComplete('15');
        }
    }
}
```

#### Optional: Leaderboard Integration

```javascript
// Record win to leaderboard (optional feature)
async function recordPlayerWin() {
    const nickname = HjernespilAPI.getNickname() || prompt('Dit navn:');
    if (HjernespilAPI.isValidNickname(nickname)) {
        HjernespilAPI.setNickname(nickname);
        const result = await HjernespilAPI.recordWin('01', nickname);
        if (result.success) {
            console.log('Win recorded!');
        }
    }
}

// Display leaderboard
async function showLeaderboard() {
    const data = await HjernespilAPI.getLeaderboard('01', 10);
    data.entries.forEach((entry, i) => {
        console.log(`${i+1}. ${entry.nickname}: ${entry.wins} wins`);
    });
}
```

#### All Available Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `trackStart(game)` | Track game start (fire-and-forget) | void |
| `trackComplete(game)` | Track game completion (fire-and-forget) | void |
| `trackEvent(game, event)` | Track custom event ("start" or "complete") | void |
| `recordWin(game, nickname)` | Record win to leaderboard | `Promise<{success, message?, error?}>` |
| `getLeaderboard(game?, top?)` | Get top players this month | `Promise<{period, entries[], totalWinsThisMonth}>` |
| `getTodayStats()` | Get today's activity | `Promise<{date, starts, completions}>` |
| `getUsageStats(game?)` | Get monthly usage stats | `Promise<{period, totalStarts, totalCompletions, perGame[]}>` |
| `getStats()` | Get total wins this month | `Promise<{period, totalWins}>` |
| `getNickname()` | Get saved nickname from localStorage | `string \| null` |
| `setNickname(name)` | Save nickname to localStorage | void |
| `isValidNickname(name)` | Validate nickname (2-20 chars) | boolean |
| `submitFeedback(game, {rating, text?, nickname?})` | Submit user feedback (1-5 rating) | `Promise<{success, message?, error?}>` |

#### Notes

- `trackStart` and `trackComplete` are fire-and-forget (don't await)
- Game numbers must be zero-padded strings: "01", "02", ... "14"
- Nickname must be 2-20 characters
- Rate limit: 1 win per game per minute per player

### Shared UI Components (shared/ui.js)

Injects common UI elements into game pages. Include after api.js:

```html
<script src="../shared/api.js"></script>
<script src="../shared/ui.js"></script>
<script src="script.js"></script>
```

#### What it provides

- **Feedback button**: Speech bubble icon in top-left corner
- **Feedback modal**: Star rating (1-5), optional comment, optional nickname
- Auto-detects game number from URL path
- Adapts colors for light (`.game-container`) and dark (`.container`) themes

#### Auto-initialization

The UI components initialize automatically when the DOM is ready. No manual setup required.

## Git Workflow

- Commit messages in Danish
- Push to `claude/main` branch (allows Claude to push directly without PR)
- Clear, descriptive commit messages
- **Update timestamp BEFORE each commit**: Update "Sidst opdateret" in index.html footer with current UTC time (format: "DD. month YYYY kl. HH:MM UTC", month in Danish). Do this before EVERY commit that changes frontend code.
