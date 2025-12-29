# Claude Development Guidelines

> **Note:** Also read `README.md` for project overview and game list, and `index.html` for the current UI structure.

## Open Issues

At the start of each session, check for open GitHub issues:

```bash
curl -s "https://api.github.com/repos/mbundgaard/Puzzles/issues?state=open" | jq -r '.[] | "- #\(.number): \(.title)"'
```

These are user feedback and bug reports that may need attention.

## Project Overview

This is a collection of browser-based puzzles and mind games. Each puzzle is a standalone HTML/CSS/JS application in its own numbered folder.

## Requirements

### Language

**Communication with Claude must be in English.** All conversation, questions, and responses should be in English.

**Commit messages must be in English.**

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
- **No swipe gestures**: Avoid swipe-based controls as they conflict with page scrolling and browser gestures. Use visible arrow buttons instead for directional input.

### Styling Guidelines

- Modern gaming/app aesthetic with dark theme
- Glassmorphism effects (blur, transparency, subtle borders)
- Responsive design for mobile and desktop
- Color palette: Dark backgrounds (#0f0f23), purple/magenta/cyan accents, white text
- Poppins font for modern feel
- Animated elements and smooth transitions
- Clear visual feedback for interactions (scale on tap, color accents)

### Each Puzzle Should Have

1. Clear title
2. "Nyt Spil" button (New Game)
3. Rules/instructions section in Danish
4. Close button (X) in top-right corner to return to main page
5. Feedback button (⭐) in top-left corner (auto-added by shared/ui.js)
6. Victory detection and celebration
7. Favicon link: `<link rel="icon" href="../icons/Ampeross-Qetto-2-Games.ico">`
8. API tracking (trackStart/trackComplete)
9. Win modal with leaderboard (via `HjernespilUI.showWinModal(points)` - points: 1-5)

## Adding a New Puzzle

1. Create folder `XX-puzzle-name/` with next available number
2. Implement with index.html, style.css, script.js
3. Add `<link rel="icon" href="../icons/Ampeross-Qetto-2-Games.ico">` in `<head>`
4. Add close button as first child of container (see below)
5. Add `<script src="../shared/api.js"></script>` before game script
6. Add `<script src="../shared/ui.js"></script>` after api.js (adds feedback button + win modal)
7. Add `HjernespilAPI.trackStart('XX')` in newGame()
8. Add `HjernespilAPI.trackComplete('XX')` on victory
9. Add `HjernespilUI.showWinModal(points)` after trackComplete (points: 1-5)
10. Add entry to root index.html
11. Update README.md puzzle table (include Points column)
12. Update site-index.json with new game entry
13. Ensure touch-only gameplay works
14. All text in Danish

**Note:** If the point value for a game is changed, update the Points column in README.md to match.

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

The favicon is in the `icons/` folder. Each game page must include an explicit link:

```html
<link rel="icon" href="../icons/Ampeross-Qetto-2-Games.ico">
```

## Main Page (index.html)

The main page uses a modern gaming/app design with:

1. **Header**:
   - Title "Hjernespil" with gradient text effect
   - Icon buttons: refresh, SMS share, QR share, leaderboard, info
2. **Subtitle**: "Træn din hjerne med sjove udfordringer"
3. **Game grid**: Square cards (2 columns on mobile, 3 on desktop)
   - Each card has: large icon, title, short description
   - Glassmorphism background with colored accent line on tap
   - Play indicator appears on active state
   - Unique accent color per game
   - "Foreslå Spil" card at end (+ icon, dashed border) - submits to feedback API with game "00"
4. **Footer**: GitHub link and last updated timestamp
5. **Animated background**: Pulsing gradient orbs in purple/magenta/cyan
6. **Modals**:
   - QR modal: Share link with QR code
   - Leaderboard modal: Top players with points
   - Info modal: About, points system, tips (shows on first visit, saved to localStorage)
   - Suggest modal: Text input for game suggestions
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
| POST | `/api/win` | Record a win `{nickname, game, points}` (points: 1-5) |
| GET | `/api/leaderboard?game=all&top=10` | Get top players (all-time points) |
| GET | `/api/stats` | Get total points (all-time) |
| POST | `/api/event` | Record game event `{game, event}` (event: "start" or "complete") |
| GET | `/api/usage?game=all` | Get usage stats this month |
| GET | `/api/today` | Get today's starts and completions |
| POST | `/api/feedback` | Submit feedback `{game, rating, text?, nickname?}` → creates GitHub issue |

### Feedback System

User feedback is submitted via the API and automatically creates GitHub issues:

- **Regular feedback** (games 01-99): Creates issue titled `[GameName] ⭐⭐⭐ Feedback`
- **Game suggestions** (game 00): Creates issue titled `Spilforslag: [suggestion text]`

Issues appear at: https://github.com/mbundgaard/Puzzles/issues

When fixing issues from feedback, reference the issue number in the commit message (e.g., `Fixes #5`) to auto-close it.

### Game numbers

Games are identified by their folder number (e.g., "01", "02"). The API accepts any game number from 00-99 (normalized to 2-digit format).

- **"00"**: Reserved for game suggestions (via "Foreslå Spil" on main page)
- **"01"-"99"**: Game folders

See `README.md` for the complete list of games with their numbers and point values.

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
        console.log(`${i+1}. ${entry.nickname}: ${entry.points} points`);
    });
}
```

#### All Available Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `trackStart(game)` | Track game start (fire-and-forget) | void |
| `trackComplete(game)` | Track game completion (fire-and-forget) | void |
| `trackEvent(game, event)` | Track custom event ("start" or "complete") | void |
| `recordWin(game, nickname, points)` | Record win to leaderboard (points: 1-5) | `Promise<{success, message?, error?}>` |
| `getLeaderboard(game?, top?)` | Get top players (all-time) | `Promise<{period, entries[], totalPoints}>` |
| `getTodayStats()` | Get today's activity | `Promise<{date, starts, completions}>` |
| `getUsageStats(game?)` | Get monthly usage stats | `Promise<{period, totalStarts, totalCompletions, perGame[]}>` |
| `getStats()` | Get total points (all-time) | `Promise<{period, totalPoints}>` |
| `getNickname()` | Get saved nickname from localStorage | `string \| null` |
| `setNickname(name)` | Save nickname to localStorage | void |
| `isValidNickname(name)` | Validate nickname (2-20 chars) | boolean |
| `submitFeedback(game, {rating, text?, nickname?})` | Submit user feedback (1-5 rating) | `Promise<{success, message?, error?}>` |

#### Notes

- `trackStart` and `trackComplete` are fire-and-forget (don't await)
- Game numbers must be zero-padded strings (e.g., "01", "02")
- Nickname must be 2-20 characters

### Shared UI Components (shared/ui.js)

Injects common UI elements into game pages. Include after api.js:

```html
<script src="../shared/api.js"></script>
<script src="../shared/ui.js"></script>
<script src="script.js"></script>
```

#### What it provides

- **Feedback button**: Star icon in top-left corner
- **Feedback modal**: Star rating (1-5), optional comment, nickname (pre-filled from localStorage, saved on submit)
- **Win modal**: Points display with nickname input for leaderboard (pre-filled from localStorage, saved on submit)
- Auto-detects game number from URL path
- Adapts colors for light (`.game-container`) and dark (`.container`) themes
- Nickname is shared across feedback and win modals via localStorage

#### Auto-initialization

The feedback button initializes automatically when the DOM is ready. No manual setup required.

#### Win Modal with Leaderboard

To show the win modal after a player wins:

```javascript
// In victory detection
if (playerWins) {
    HjernespilAPI.trackComplete('12');
    HjernespilUI.showWinModal(3);  // Shows points awarded + nickname input
}
```

The win modal:
- Displays "Tillykke!" (Congratulations)
- Shows points awarded (e.g., "+3 point")
- Nickname input for leaderboard submission
- Pre-fills nickname from localStorage if previously saved
- Submits score via `HjernespilAPI.recordWin(game, nickname, points)`

#### Available Methods

| Method | Description |
|--------|-------------|
| `HjernespilUI.showWinModal(points)` | Show win modal with points (1-5), auto-detects game number |
| `HjernespilUI.showWinModal(points, 'XX')` | Show win modal for specific game number |
| `HjernespilUI.getGameNumber()` | Get current game number from URL |

## Git Workflow

**IMPORTANT: Commit messages must be in English.**

- Push to `claude/main` branch (allows Claude to push directly without PR)
- Clear, descriptive commit messages
- **Update timestamp BEFORE each commit**: Update "Sidst opdateret" in index.html footer with current Danish local time (format: "DD. month YYYY kl. HH:MM", month in Danish). Denmark uses CET (UTC+1) in winter and CEST (UTC+2) in summer. Do this before EVERY commit.
