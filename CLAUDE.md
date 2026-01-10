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

> **Note:** Also read `README.md` for project overview and game list.

## Project Overview

This is a collection of browser-based puzzles and mind games built with SvelteKit. The app supports multiple languages (Danish, English, French) and is deployed as a static site to GitHub Pages.

## Requirements

### Language

**Communication with Claude must be in English.** All conversation, questions, and responses should be in English.

**Commit messages must be in English.**

**The app supports three languages:** Danish (da), English (en), and French (fr).

- Danish is the default language
- All UI text must be translated in all three languages
- Translations are stored in JSON files (see i18n section below)
- Use translation keys, never hardcode text in components

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

### Each Game Should Have

1. Clear title (translated in all languages)
2. "New Game" button (translated)
3. Rules/instructions (translated)
4. Back navigation (handled by GameShell component)
5. Victory detection and celebration
6. API tracking (trackStart/trackComplete)
7. Win modal with leaderboard (points: 1-5)
8. Game-specific translations in `i18n/` subfolder

## Internationalization (i18n)

### Translation Files

Translations are stored in two locations:

1. **App translations** (`app/src/lib/i18n/`)
   - `da.json` - Danish (default)
   - `en.json` - English
   - `fr.json` - French
   - Contains: app shell text, settings, game titles/descriptions

2. **Game translations** (`app/src/lib/games/[game]/i18n/`)
   - Each game has its own folder with da.json, en.json, fr.json
   - Contains: in-game text, rules, status messages

### Using Translations

```svelte
<script lang="ts">
  import { t, translate, type Translations } from '$lib/i18n';

  let translations = $state<Translations>({});
  t.subscribe((value) => { translations = value; });

  function tr(key: string): string {
    return translate(translations, key);
  }
</script>

<h1>{tr('settings.title')}</h1>
```

### Adding New Translation Keys

1. Add the key to ALL three language files (da.json, en.json, fr.json)
2. Use nested keys for organization: `"settings.title"`, `"games.01-reversi.title"`
3. Danish is the fallback - if a key is missing in en/fr, Danish is used

## Adding a New Game

### Step 1: Create Game Folder

Create a new folder in `app/src/lib/games/[game-name]/` with:

```
app/src/lib/games/[game-name]/
├── [GameName].svelte      # Main game component
└── i18n/
    ├── da.json            # Danish translations
    ├── en.json            # English translations
    └── fr.json            # French translations
```

### Step 2: Create Game Component

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  // Game state using Svelte 5 runes
  let board = $state([]);
  let gameOver = $state(false);

  function newGame() {
    // Reset game state
    board = [];
    gameOver = false;

    // Track game start
    // TODO: Add API tracking
  }

  function checkWin() {
    if (/* win condition */) {
      gameOver = true;
      // Track completion
      // TODO: Add API tracking and win modal
    }
  }

  onMount(() => {
    newGame();
  });
</script>

<div class="game-container">
  <!-- Game UI here -->
</div>

<style>
  /* Game-specific styles */
</style>
```

### Step 3: Add Game Translations

Each game has its own translations in its `i18n/` folder:

```json
// i18n/en.json
{
  "title": "Game Name",
  "newGame": "New Game",
  "rules": "Game rules here...",
  "win": "You won!"
}
```

### Step 4: Add to App Translations

Add game title and description to `app/src/lib/i18n/[lang].json`:

```json
{
  "games": {
    "XX-game-name": {
      "title": "Game Name",
      "description": "Short description for home page"
    }
  }
}
```

### Step 5: Register in Game Registry

Add the game to `app/src/lib/games/registry.ts`.

### Step 6: Update README

Update the games table in README.md with the new game (include Points column, set Created date to today).

**Note:** If the point value for a game is changed, update the Points column in README.md to match.

## App Structure

### Routes (`app/src/routes/`)

| Route | Description |
|-------|-------------|
| `/` | Home page with game grid |
| `/spil/[game]` | Dynamic game page |
| `/leaderboard` | Leaderboard page |
| `/feedback` | Feedback submission page |
| `/settings` | Settings (language, about, changelog) |

### Layout (`+layout.svelte`)

The root layout provides:
- Animated background (pulsing gradient orbs)
- Header that hides on scroll down, shows on scroll up
- Bottom tab bar navigation (also hides/shows on scroll)
- Language initialization from localStorage

### Home Page (`+page.svelte`)

- **Header**: Title "Hjernespil" / "Brain Games" with gradient text
- **Game grid**: Cards with icon, title, description
  - Glassmorphism background
  - Sorted by most recent activity
  - Badges for new/updated games (auto-calculated)
- **Modals**: QR share, About, Changelog

### Components (`app/src/lib/components/`)

| Component | Description |
|-----------|-------------|
| `Header.svelte` | Home page header with title and action buttons |
| `PageHeader.svelte` | Reusable header for subpages |
| `BottomTabBar.svelte` | Navigation tabs (Games, Leaderboard, Feedback, Settings) |
| `GameCard.svelte` | Game card for home grid |
| `AboutModal.svelte` | About the app modal |
| `ChangelogModal.svelte` | What's new modal |
| `ShareQRModal.svelte` | QR code sharing modal |
| `UpdateBanner.svelte` | PWA update notification banner |

### PWA Support

The app is configured as a Progressive Web App using `@vite-pwa/sveltekit`:

- **Service Worker** - Generated by Workbox, precaches all static assets
- **Manifest** - Generated by vite-pwa plugin (configured in `vite.config.js`)
- **Icons** - `app/static/icons/` - App icons for various sizes
- **Meta tags** - iOS/Android PWA meta tags in `app.html`

#### Auto-Update Mechanism

When a new version is deployed:
1. Service worker detects changes (compares precache manifest)
2. New service worker downloads and enters "waiting" state
3. `UpdateBanner` component shows "New version available" banner
4. User taps "Update" → page reloads with new version

This works for both:
- **PWA users** (installed app) - SW checks on each visit/navigation
- **Web users** (browser) - Same mechanism, SW runs independently

#### Key Files

| File | Description |
|------|-------------|
| `vite.config.js` | PWA plugin configuration (manifest, workbox settings) |
| `UpdateBanner.svelte` | Bottom banner shown when update available |

#### Testing Updates Locally

Updates only work in production builds. To test:
1. `npm run build && npm run preview`
2. Make a code change and rebuild
3. Refresh the preview - banner should appear

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
3. Commit all changes together

**Note:** Badges are automatically calculated - no manual badge HTML needed!

## Badge System

Badges highlight new or recently updated games on the home page. Badges are dynamically calculated based on game dates in the registry.

### Badge Types

| Badge | Color | Condition |
|-------|-------|-----------|
| NY / NEW / NOUVEAU | Green | Game created within 7 days |
| OPDATERET / UPDATED / MIS À JOUR | Orange | Game updated within 7 days (and not new) |

### How It Works

1. Game registry contains `created` and `updated` dates for each game
2. On render, badges are calculated based on current date
3. Games are auto-sorted: newest/updated first

### Badge Logic

1. Check if game's **Created** date is within 7 days → show NEW badge
2. If created more than 7 days ago, check **Updated** date
3. If **Updated** date is within 7 days → show UPDATED badge
4. If neither condition met → no badge

### Adding a New Game (Badge Steps)

1. Set `created` date to today in the game registry
2. Badge will automatically appear for 7 days

### Updating an Existing Game (Badge Steps)

1. Update the `updated` field in the game registry
2. Update the **Updated** column in README.md to match
3. UPDATED badge will automatically appear for 7 days (if game is older than 7 days)

## AI-Powered Games

Some games use Azure OpenAI to generate content dynamically. These games display an AI badge on the home page.

### Games Using AI

| Game | Endpoints | What AI Does |
|------|-----------|--------------|
| 10 - Ordleg | `/api/game/10/word` | Generates Danish words by category/difficulty |
| 26 - Gæt Dyret | `/api/game/26/pick`, `/ask`, `/hint` | Picks animals, answers yes/no questions, generates hints |
| 27 - Ordsøgning | `/api/game/27/generate` | Creates word search grids with hidden words |
| 29 - Maskeværk | `/api/game/29/generate` | Generates knitting patterns with descriptions |

### Adding a New AI-Powered Game

1. Create the game function in `api/Functions/Games/GameXXFunction.cs`
2. Inject `IAIService` via constructor
3. Use `_aiService.GenerateAsync()` for AI responses
4. Mark the game as AI-powered in the game registry

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
2. **Add changelog entry** to `app/src/lib/components/ChangelogModal.svelte` (see Changelog section below)
3. **Commit and push** all changes
4. **Call the API** to close the issue with a descriptive comment:
```bash
curl -X POST https://puzzlesapi.azurewebsites.net/api/issue/close \
  -H "Content-Type: application/json" \
  -d '{"issueNumber": 9, "comment": "**Fixed:** Renamed game from Kodeknækker to Mastermind.\n\n- Updated title in game page\n- Updated main index.html\n- Updated README.md"}'
```

The comment supports full GitHub Markdown (bold, lists, code blocks, etc.).

### Changelog

The changelog is displayed in a modal accessible from the Settings page. Entries are stored in `app/src/lib/components/ChangelogModal.svelte`.

#### Adding a Changelog Entry

When closing an issue, add a new entry at the **TOP** of the `changelogEntries` array in `ChangelogModal.svelte`:

```typescript
const changelogEntries = [
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

To find missing changelog entries, compare issue numbers in `ChangelogModal.svelte` with closed issues on GitHub.

### Game numbers

Games are identified by their folder number (e.g., "01", "02"). The feedback API uses the game value to determine feedback type:

- **null / empty**: General site feedback (not about a specific game)
- **"00"**: New game suggestions (via "Foreslå Spil" on main page)
- **"01"-"99"**: Game-specific feedback

See `README.md` for the complete list of games with their numbers and point values.

### API Integration

API calls are made using fetch from game components. The API base URL and helper functions are in `app/src/lib/api.ts`.

#### Required Integration

Every game MUST track starts and completions:

```typescript
// In newGame function
async function newGame() {
    // Reset game state
    board = [];
    gameOver = false;

    // Track game start
    await trackStart('XX');  // Replace XX with game number
}

// In victory detection
if (playerWins) {
    await trackComplete('XX');
    // Show win modal
}
```

#### API Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `trackStart(game)` | Track game start | `Promise<void>` |
| `trackComplete(game)` | Track game completion | `Promise<void>` |
| `recordWin(game, nickname, points)` | Record win to leaderboard (points: 1-5) | `Promise<{success, message?, error?}>` |
| `getLeaderboard(game?, top?)` | Get top players (current month) | `Promise<{period, entries[], totalPoints}>` |
| `submitFeedback(game, {text?, nickname?})` | Submit user feedback | `Promise<{success, message?, error?}>` |

#### Notes

- Game numbers must be zero-padded strings (e.g., "01", "02")
- Nickname must be 2-20 characters
- Nickname is stored in localStorage and shared across the app

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

### Version Check (Legacy)

The API has a version check endpoint, but the app now uses **service worker-based updates** instead (see PWA Support section above).

```
POST /api/version
Body: { "version": 1767137931 }
Response: { "newVersionExists": true/false }
```

This endpoint is kept for backwards compatibility but is no longer used by the app.

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

- Push to `main` branch
- Clear, descriptive commit messages
- GitHub Actions automatically builds and deploys the app on push to main
