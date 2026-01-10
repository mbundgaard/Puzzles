# Adding a New Game

This guide walks through all the steps required to add a new game to the puzzle collection.

## Step 1: Create Game Folder

Create a new folder in `app/src/lib/games/[game-name]/` with:

```
app/src/lib/games/[game-name]/
├── [GameName].svelte      # Main game component
└── i18n/
    ├── da.json            # Danish translations
    ├── en.json            # English translations
    └── fr.json            # French translations
```

## Step 2: Create Game Component

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

## Step 3: Add Game Translations

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

## Step 4: Add to App Translations

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

## Step 5: Register in Game Registry

Add the game to `app/src/lib/games/registry.ts`.

## Step 6: Update README

Update the games table in README.md with the new game (include Points column, set Created date to today).

**Note:** If the point value for a game is changed, update the Points column in README.md to match.

## Required Game Features

Every game MUST have:

1. Clear title (translated in all languages)
2. "New Game" button (translated)
3. Rules/instructions (translated)
4. Back navigation (handled by GameShell component)
5. Victory detection and celebration
6. API tracking (trackStart/trackComplete)
7. Win modal with leaderboard (points: 1-5)
8. Game-specific translations in `i18n/` subfolder

## API Integration

Every game MUST track starts and completions:

```typescript
import { trackStart, trackComplete } from '$lib/api';

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

## Daily Win Limits (Anti-Farming)

Some games have daily win limits to prevent point farming. Consider adding daily limits to games that:
- Can be won quickly (< 1 minute)
- Have easy difficulty levels
- Show signs of farming in the Events table

### Implementation Pattern

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

### Games with Daily Limits

| Game | Limit Type | Points |
|------|------------|--------|
| 12 Rørføring | Per difficulty (easy/medium/hard) | 1/2/3 |
| 24 Tangram | Per puzzle (6 puzzles) | 1/3/5 |
