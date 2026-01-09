# Claude Development Guidelines

## ⚠️ FIRST: Check Open Issues

**Before doing anything else, fetch and list open issues:**

https://api.github.com/repos/mbundgaard/Puzzles/issues?state=open

These are user feedback and bug reports waiting to be addressed.

**When listing issues, group them by type in this order:**
1. **General Feedback** - site/app feedback (game = null/empty)
2. **Game Suggestions** - new game ideas (game = "00")
3. **Game Feedback** - feedback about specific games (game = "01"-"99")

---

> **Note:** Also read `README.md` and `index.html` for project overview and game list.

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
11. Update README.md puzzle table (include Points column, set Created date to today)
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
   - **Badges**: Games can have badges to highlight them (see Badge System section below)
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

## README Game Tracking

The README.md contains a games table with these columns:

| Column | Description |
|--------|-------------|
| # | Game folder number (01-99) |
| Game | Link to game folder |
| Points | Points awarded for winning (e.g., "3" or "1/2/3" for difficulty levels) |
| Created | Date game was first added (YYYY-MM-DD format) |
| Updated | Date game was last significantly updated (YYYY-MM-DD format, empty if never updated) |
| Description | Brief description of the game |

### When to update dates

**IMPORTANT**: The README is the source of truth for badge automation. Always update these dates when making changes.

- **Created**: Set to today's date when adding a new game
- **Updated**: Set to today's date when making significant changes to an existing game:
  - Bug fixes that affect gameplay
  - New features or difficulty levels
  - UI/UX improvements
  - Do NOT update for minor fixes (typos, small style tweaks)

### Workflow for updating a game

When updating an existing game:
1. Make your changes to the game files
2. Update the **Updated** column in README.md to today's date
3. Update the `updated` field in `GAME_DATES` constant in index.html to today's date
4. Commit all changes together

**Note:** Badges are automatically calculated - no manual badge HTML needed!

## Badge System

Badges highlight new or recently updated games on the main page. **Badges are now dynamically calculated** via JavaScript based on game dates - no manual badge maintenance required!

### Badge types

| Badge | CSS Class | Color | Condition |
|-------|-----------|-------|-----------|
| NY | `game-badge` | Green | Game created within 7 days |
| OPDATERET | `game-badge updated` | Orange | Game updated within 7 days (and not new) |

### How dynamic badges work

1. Each game card has a `data-game` attribute with the game number (e.g., `data-game="28"`)
2. The `GAME_DATES` constant in index.html stores created/updated dates for each game
3. On page load, JavaScript calculates which badges to show based on current date
4. Badges are automatically injected as the first child of each qualifying game card

### Game card HTML structure

```html
<a href="28-labyrint/index.html" class="game-card maze" data-game="28">
    <!-- Badge injected here dynamically if applicable -->
    <div class="game-icon">🌀</div>
    <div class="game-info">
        <div class="game-name">Labyrint</div>
        <div class="game-desc">Find vej gennem tågen</div>
    </div>
    <div class="game-arrow">›</div>
</a>
```

### GAME_DATES constant

Located in index.html script section. Update when adding/updating games:

```javascript
const GAME_DATES = {
    '01': { created: '2025-12-28' },
    '10': { created: '2025-12-28', updated: '2025-12-31' },
    '24': { created: '2025-12-30', updated: '2026-01-06' },
    '28': { created: '2026-01-05' }
    // ... add new games here
};
```

### Badge logic (automated)

1. Check if game's **Created** date is within 7 days → show `NY` badge
2. If created more than 7 days ago, check **Updated** date
3. If **Updated** date is within 7 days → show `OPDATERET` badge
4. If neither condition met → no badge

### Adding a new game (badge-related steps)

1. Add `data-game="XX"` attribute to the game card in index.html
2. Add entry to `GAME_DATES` with today's date as created:
   ```javascript
   'XX': { created: '2026-01-07' }
   ```
3. Badge will automatically appear for 7 days

### Updating an existing game (badge-related steps)

1. Add/update the `updated` field in `GAME_DATES`:
   ```javascript
   'XX': { created: '2025-12-30', updated: '2026-01-07' }
   ```
2. Update the **Updated** column in README.md to match
3. OPDATERET badge will automatically appear for 7 days (if game is older than 7 days)

### Badge placement

- Games with badges should be placed at the **top** of the game grid
- Order: NY badges first, then OPDATERET badges, then regular games
- Badge positioning is handled by CSS (absolute positioning in top-right of card)

## AI-Powered Games

Some games use Azure OpenAI to generate content dynamically. These games display an AI badge on the main page.

### Games using AI

| Game | Endpoints | What AI Does |
|------|-----------|--------------|
| 10 - Ordleg | `/api/game/10/word` | Generates Danish words by category/difficulty |
| 26 - Gæt Dyret | `/api/game/26/pick`, `/ask`, `/hint` | Picks animals, answers yes/no questions, generates hints |
| 27 - Ordsøgning | `/api/game/27/generate` | Creates word search grids with hidden words |
| 29 - Maskeværk | `/api/game/29/generate` | Generates knitting patterns with descriptions |

### AI Badge

AI-powered games show a small badge icon on the main page (top-right of the game icon).

```html
<div class="game-icon">📝<span class="ai-indicator"><img src="icons/icons_433019.svg" alt="AI"></span></div>
```

The badge uses `icons/icons_433019.svg` (white "AI" icon on dark background).

### Adding a new AI-powered game

1. Create the game function in `api/Functions/Games/GameXXFunction.cs`
2. Inject `IAIService` via constructor
3. Use `_aiService.GenerateAsync()` for AI responses
4. Add the AI badge to the game card in index.html

### IAIService Interface

The backend uses a generic `IAIService` interface (`api/Services/IAIService.cs`) with `AzureOpenAIService` implementation. This allows easy provider swapping if needed.

```csharp
public interface IAIService
{
    bool IsConfigured { get; }
    Task<string?> GenerateAsync(string systemPrompt, IEnumerable<AIMessage> messages, AIRequestOptions? options = null);
}
```

## Backend API

**Base URL:** `https://puzzlesapi.azurewebsites.net`

### Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/win` | Record a win `{nickname, game, points}` (points: 1-5) |
| GET | `/api/leaderboard?game=all&top=10` | Get top players (current month) |
| GET | `/api/stats` | Get total points (all-time) |
| POST | `/api/event` | Record game event `{game, event}` (event: "start" or "complete") |
| GET | `/api/usage?game=all` | Get usage stats this month |
| GET | `/api/today` | Get today's starts and completions |
| POST | `/api/feedback` | Submit feedback `{game?, rating, text?, nickname?}` → creates GitHub issue |
| POST | `/api/issue/create` | Create issue `{title, body}` → `{issueNumber}` |
| POST | `/api/issue/edit` | Edit issue `{issueNumber, title?, body?, state?}` |
| POST | `/api/issue/close` | Close issue with comment `{issueNumber, comment}` |
| POST | `/api/issue/delete` | Delete issue `{issueNumber}` (requires admin) |
| POST | `/api/version` | Check version `{version}` → `{newVersionExists: bool}` |
| POST | `/api/session/{game}/{sessionId}/start` | Start session `{nickname?, device?, appVersion?}` |
| POST | `/api/session/{game}/{sessionId}/update` | Add event `{event}` (newGame, win, lose) |
| POST | `/api/session/{game}/{sessionId}/end` | End session |
| GET | `/api/session/{game}/{sessionId}` | Get session details |
| POST | `/api/game/10/word` | Get word for Ordleg `{length, difficulty, category}` |
| POST | `/api/game/26/pick` | Pick animal `{category?, difficulty?}` |
| POST | `/api/game/26/ask` | Ask about animal `{animal, question}` → yes/no/maybe |
| POST | `/api/game/26/hint` | Get hint `{animal, previousHints?}` |
| POST | `/api/game/27/generate` | Generate word search `{difficulty}` → grid + words |

### Feedback System

User feedback is submitted via the API and automatically creates GitHub issues. Feedback text is processed by Azure OpenAI (ChatGPT) to generate English titles and translations.

**Feedback types (determined by `game` value):**

| Game Value | Type | Issue Title |
|------------|------|-------------|
| `null` / `""` | General Feedback | `Feedback: {AI title}` |
| `"00"` | New Game Suggestion | `New Game: {AI title}` |
| `"01"`-`"99"` | Game-Specific | `{GameName}: {AI title}` |

If feedback contains Danish text, the AI translates it to English and includes the original in a collapsible section.

Issues appear at: https://github.com/mbundgaard/Puzzles/issues

### Closing Issues

When fixing an issue, **do NOT use `Fixes #X` in commit messages**. Follow this workflow:

1. **Fix the issue** in the code
2. **Add changelog entry** to `shared/changelog.js` (see Changelog section below)
3. **Commit and push** all changes
4. **Call the API** to close the issue with a descriptive comment:
```bash
curl -X POST https://puzzlesapi.azurewebsites.net/api/issue/close \
  -H "Content-Type: application/json" \
  -d '{"issueNumber": 9, "comment": "**Fixed:** Renamed game from Kodeknækker to Mastermind.\n\n- Updated title in game page\n- Updated main index.html\n- Updated README.md"}'
```

The comment supports full GitHub Markdown (bold, lists, code blocks, etc.).

### Changelog

The changelog is displayed in a modal on the main page. Entries are stored in `shared/changelog.js`.

A notification dot appears on the changelog button when new entries exist since the user's last view.

#### Adding a changelog entry

When closing an issue, add a new entry at the **TOP** of the `CHANGELOG_ENTRIES` array:

```javascript
const CHANGELOG_ENTRIES = [
    // Add new entries here (sorted by closedAt descending)
    { issue: 37, closedAt: '2025-12-31T14:30:00Z', submitter: 'Martin', text: 'Added GitHub link to changelog entries' },
    // ... existing entries
];
```

- **issue**: GitHub issue number (links to GitHub issue via icon)
- **closedAt**: ISO timestamp from GitHub's `closed_at` field (e.g., `2025-12-31T14:30:00Z`)
- **submitter**: Name of person who submitted the feedback/suggestion (check the GitHub issue - do NOT assume it's Martin)
- **text**: Short English description of what was fixed/added

The display date (e.g., "Dec 31") is derived automatically from the timestamp.

#### Comparing with GitHub

To find missing changelog entries, compare `data-issue` values in `shared/changelog.js` with closed issues on GitHub.

### Game numbers

Games are identified by their folder number (e.g., "01", "02"). The feedback API uses the game value to determine feedback type:

- **null / empty**: General site feedback (not about a specific game)
- **"00"**: New game suggestions (via "Foreslå Spil" on main page)
- **"01"-"99"**: Game-specific feedback

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
| `getLeaderboard(game?, top?)` | Get top players (current month) | `Promise<{period, entries[], totalPoints}>` |
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

### Daily Win Limits (Anti-Farming)

Some games have daily win limits to prevent point farming. Players can only earn points once per day per difficulty/puzzle.

#### Games with daily limits

| Game | Limit Type | Points |
|------|------------|--------|
| 12 Rørføring | Per difficulty (easy/medium/hard) | 1/2/3 |
| 24 Tangram | Per puzzle (6 puzzles) | 1/3/5 |

#### How it works

- Uses localStorage with date-based keys (e.g., `roerfoering-easy-won: "2025-12-30"`)
- After winning, the level/puzzle is marked as won for today
- Won items show a ✓ checkmark and are disabled (non-clickable)
- Resets automatically at midnight (new date = new key)

#### Implementation pattern

```javascript
getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

isWonToday(id) {
    return localStorage.getItem(`game-${id}-won`) === this.getTodayKey();
}

markWonToday(id) {
    localStorage.setItem(`game-${id}-won`, this.getTodayKey());
}
```

#### When to add daily limits

Consider adding daily limits to games that:
- Can be won quickly (< 1 minute)
- Have easy difficulty levels
- Show signs of farming in the Events table

### Version Check (Auto-Update)

The app automatically checks for updates and reloads when a newer version is available.

#### How it works

1. `APP_VERSION` (Unix timestamp UTC) is stored at the top of index.html script section
2. When user returns from a game or PWA resumes, client calls `POST /api/version`
3. If server has newer version → auto-reload → show toast "Opdateret til nyeste version ✓"
4. Refresh button (🔄) also checks: if same version, shows "Allerede opdateret ✓" without reload

#### API endpoint

```
POST /api/version
Body: { "version": 1767137931 }
Response: { "newVersionExists": true/false }
```

- If client version > stored: saves client version, returns `false`
- If client version < stored: returns `true` (client should reload)
- If equal: returns `false`

#### Footer timestamp

The footer "Sidst opdateret" is rendered from `APP_VERSION` using Danish locale:

```javascript
new Date(APP_VERSION * 1000).toLocaleString('da-DK', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
});
```

## Building the Azure Functions API

The `api/` folder contains a C# Azure Functions project (.NET 8.0, isolated worker model).

### First-time session setup

Install the .NET 8.0 SDK:

```bash
curl -sSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin --channel 8.0
export PATH="$HOME/.dotnet:$PATH"
```

### Building the project

```bash
rm -rf api/obj && dotnet build api/Puzzles.csproj -c Release
```

The `rm -rf api/obj` ensures a clean build and avoids stale generated project issues.

### Notes

- NuGet packages are committed to `api/packages/` for offline restore (nuget.org is not accessible from this environment)
- The `api/nuget.config` is configured to use only the local package cache
- Build warnings about version mismatches (NU1603) are expected and harmless

## Git Workflow

**IMPORTANT: Commit messages must be in English.**

- Push to `claude/main` branch (allows Claude to push directly without PR)
- Clear, descriptive commit messages
- **Update version before ANY commit**:
  1. Update `APP_VERSION` constant in index.html with current Unix timestamp (UTC). Use `date +%s` to get the timestamp.
  2. After pushing, call the API to set the server version:
     ```bash
     curl -X POST https://puzzlesapi.azurewebsites.net/api/version/set \
       -H "Content-Type: application/json" \
       -d '{"version": <TIMESTAMP>}'
     ```
  This ensures all clients will be notified of the new version and auto-reload.
