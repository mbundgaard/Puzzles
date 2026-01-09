# Native PWA Experience - Implementation Guide

## Overview

This document outlines how to transform Hjernespil into a more native-feeling Progressive Web App (PWA) with multi-language support. The migration will happen incrementally, one game at a time.

---

## Current State

- **Technology**: Vanilla HTML/CSS/JS
- **Structure**: 29 standalone game folders
- **Language**: Danish only (hardcoded in HTML/JS)
- **PWA Support**: Basic manifest.json, no service worker

---

## Migration Strategy

### Parallel Deployment Approach

During development, both sites run simultaneously:

| Site | URL | Status |
|------|-----|--------|
| **Classic** | `https://mbundgaard.github.io/Puzzles/app_classic/` | Live |
| **New App** | `https://mbundgaard.github.io/Puzzles/app/` | Development |

This allows:
- Users continue using the classic site at `/app_classic/`
- New app can be tested and iterated on at `/app/`
- Gradual migration without downtime
- Easy rollback if issues arise

### Phase 0: Set Up Parallel Structure

Classic site moved to `/app_classic/`, new SvelteKit app in `/app/`:

```
/Puzzles
├── .gitignore                  # Git config (includes www/)
├── .github/                    # GitHub workflows
├── CLAUDE.md                   # Claude instructions
├── README.md                   # Project documentation
├── LICENSE                     # License file
│
├── api/                        # Backend Azure Functions (existing)
│
│ # Classic site (moved to subfolder)
├── app_classic/                # Classic vanilla HTML/CSS/JS site
│   ├── index.html              # Classic main page
│   ├── manifest.json           # Classic PWA manifest
│   ├── shared/                 # Classic shared files
│   ├── icons/                  # Icons
│   ├── 01-reversi/             # Classic games
│   ├── 02-tents/
│   └── ... (all 29 games)
│
│ # New app source (committed)
├── app/                        # SvelteKit source
│   ├── src/
│   ├── static/
│   ├── package.json
│   └── svelte.config.js
│
└── www/                        # Build output (NOT committed, local dev only)
```

The classic site deploys directly via GitHub Pages. The new SvelteKit app will use GitHub Actions to build and deploy to `/Puzzles/app/`.

### Phase 1: Foundation

1. Set up SvelteKit project with i18n support
2. Create app shell (header, navigation, transitions)
3. Implement language selector
4. Build home page with game grid

### Phase 2: Game Migration (One at a Time)

Migrate games in order of complexity:

| Order | Game | Why |
|-------|------|-----|
| 1 | Kryds og Bolle (#11) | Simplest, minimal text |
| 2 | Hukommelse (#07) | Simple, tests animations |
| 3 | 2048 (#05) | Tests swipe gestures |
| 4 | Minestryger (#06) | Tests grid interactions |
| 5 | ... | Continue by complexity |

**For each game:**
1. Create translation file (`i18n/[lang].json`)
2. Port game logic to Svelte component
3. Test in all 3 languages
4. Update home page to show game
5. Mark as available in game registry

### Phase 3: PWA Features

After core games are migrated:
- Service worker with offline support
- Install prompt
- Push notifications (optional)

### Phase 4: Cutover

When the new app is ready for production:

1. **Move classic site to `/classic/` subfolder**
   ```bash
   # Create classic folder and move all game folders
   mkdir classic
   mv index.html manifest.json shared/ icons/ classic/
   mv 01-reversi/ 02-tents/ ... classic/  # All 29 game folders
   ```

2. **Update SvelteKit base path**
   ```javascript
   // svelte.config.js - change from /Puzzles/app to /Puzzles
   kit: {
     paths: {
       base: '/Puzzles'  // Was: '/Puzzles/app'
     }
   }
   ```

3. **Update GitHub Action to deploy to root**
   - Change artifact path to deploy new app at root level
   - Classic site now lives at `/Puzzles/classic/`

4. **Add "Classic version" link in new app footer**
   - Points to `/Puzzles/classic/`

**URLs after cutover:**

| Site | URL |
|------|-----|
| **New App** | `https://mbundgaard.github.io/Puzzles/` |
| **Classic** | `https://mbundgaard.github.io/Puzzles/classic/` |

---

## UI/Navigation Design

### Layout Overview

The new app uses a mobile-first design with bottom navigation:

```
┌─────────────────────────────┐
│ 🇩🇰 ▼    Hjernespil    🏆   │  ← Header: language selector + title + leaderboard
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🎮 Reversi          ›   │ │
│ ├─────────────────────────┤ │
│ │ 🏕️ Telte og Træer   ›   │ │  ← Game list (scrollable)
│ ├─────────────────────────┤ │
│ │ 🔢 Sudoku        NY ›   │ │  ← Badges shown inline
│ └─────────────────────────┘ │
│        ... scroll ...       │
├─────────────────────────────┤
│  🎮      💡       ⚙️        │  ← Bottom navigation
│ Spil   Foreslå   Indstil.   │
└─────────────────────────────┘
```

### Bottom Navigation

Three tabs in the bottom navigation bar:

| Tab | Icon | Label | Content |
|-----|------|-------|---------|
| Games | 🎮 | Spil | Game list (home) |
| Suggest | 💡 | Foreslå | Submit game idea |
| Settings | ⚙️ | Indstillinger | Language, info, changelog |

### Navigation Visibility

Bottom nav behavior varies by context:

**On home/settings pages**: Hide on scroll down, show on scroll up (like Instagram/Twitter)
**On game pages**: Always hidden for full-screen gameplay

```
Home (idle):       Home (scrolling):    Game page:
┌─────────────┐    ┌─────────────┐      ┌─────────────┐
│             │    │             │      │             │
│   Content   │    │   Content   │      │    Game     │
│             │    │             │      │ (full screen│
│             │    │   (more     │      │             │
├─────────────┤    │   space)    │      │       ✕     │
│ 🎮  💡  ⚙️  │    │             │      │             │
└─────────────┘    └─────────────┘      └─────────────┘
     visible):         hidden            always hidden
```

```svelte
<!-- Bottom nav with scroll detection -->
<script>
  let lastScrollY = 0;
  let navVisible = true;

  function handleScroll() {
    const currentY = window.scrollY;
    navVisible = currentY < lastScrollY || currentY < 50;
    lastScrollY = currentY;
  }
</script>

<svelte:window on:scroll={handleScroll} />

{#if !isGamePage}
  <nav class="bottom-nav" class:hidden={!navVisible}>
    <!-- tabs -->
  </nav>
{/if}
```

Games get full viewport height. The existing close button (✕) handles navigation back to the game list.

### Header Design

Simplified header with three elements:

```
┌─────────────────────────────────────┐
│  🇩🇰 ▼         Hjernespil        🏆  │
│  └─ Language    └─ Title    └─ Leaderboard
└─────────────────────────────────────┘
```

- **Language dropdown**: Flag + dropdown arrow, opens language selector
- **Title**: App name, centered
- **Leaderboard**: Quick access to scores

### Page Transitions

Native-feeling transitions between pages:

| Navigation | Transition |
|------------|------------|
| Home → Game | Slide in from right |
| Game → Home | Slide out to right |
| Tab switch | Fade/crossfade |
| Modal open | Slide up from bottom |

```svelte
<!-- Example using Svelte transitions -->
<script>
  import { fly, fade } from 'svelte/transition';
</script>

{#key currentPage}
  <div in:fly={{ x: 300, duration: 200 }} out:fly={{ x: -300, duration: 200 }}>
    <slot />
  </div>
{/key}
```

### Game List vs Grid

Using **list view** instead of grid for the game menu:

| Aspect | Grid (Classic) | List (New) |
|--------|----------------|------------|
| Scanning | Slower | Faster |
| Info density | Icon + title | Icon + title + description |
| Touch targets | Smaller | Full-width rows |
| Badges | Corner overlay | Inline |

### Dark Theme

Maintaining the dark theme from classic:

```css
:root {
  --bg-primary: #0f0f23;
  --bg-secondary: #1a1a2e;
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --accent-purple: #9333ea;
  --accent-cyan: #06b6d4;
  --accent-magenta: #ec4899;
}
```

---

## Internationalization (i18n)

### Supported Languages

| Code | Language | Status |
|------|----------|--------|
| `da` | Danish | Default (complete) |
| `en` | English | To be added |
| `fr` | French | To be added |

### Translation File Structure

Each game has its own translation folder:

```
/app/src/lib/games/
├── memory/
│   ├── Memory.svelte           # Game component
│   └── i18n/
│       ├── da.json             # Danish (default)
│       ├── en.json             # English
│       └── fr.json             # French
│
├── tictactoe/
│   ├── TicTacToe.svelte
│   └── i18n/
│       ├── da.json
│       ├── en.json
│       └── fr.json
```

### Translation File Format

```json
// games/memory/i18n/da.json
{
  "title": "Hukommelse",
  "newGame": "Nyt Spil",
  "moves": "Træk",
  "found": "Fundet",
  "victory": {
    "title": "Tillykke!",
    "message": "Du klarede det på {moves} træk"
  },
  "rules": {
    "title": "Regler",
    "goal": "Find alle par af kort",
    "howTo": "Tryk på to kort for at vende dem"
  }
}
```

```json
// games/memory/i18n/en.json
{
  "title": "Memory",
  "newGame": "New Game",
  "moves": "Moves",
  "found": "Found",
  "victory": {
    "title": "Congratulations!",
    "message": "You completed it in {moves} moves"
  },
  "rules": {
    "title": "Rules",
    "goal": "Find all matching pairs",
    "howTo": "Tap two cards to flip them"
  }
}
```

```json
// games/memory/i18n/fr.json
{
  "title": "Mémoire",
  "newGame": "Nouveau Jeu",
  "moves": "Coups",
  "found": "Trouvé",
  "victory": {
    "title": "Félicitations!",
    "message": "Vous avez réussi en {moves} coups"
  },
  "rules": {
    "title": "Règles",
    "goal": "Trouvez toutes les paires",
    "howTo": "Appuyez sur deux cartes pour les retourner"
  }
}
```

### Shared Translations

Common UI elements are in a shared file:

```
/app/src/lib/i18n/
├── da.json                     # Shared Danish
├── en.json                     # Shared English
├── fr.json                     # Shared French
└── index.ts                    # i18n logic
```

```json
// lib/i18n/da.json
{
  "app": {
    "title": "Hjernespil",
    "subtitle": "Træn din hjerne med sjove udfordringer",
    "back": "Tilbage",
    "settings": "Indstillinger",
    "language": "Sprog",
    "tryNewVersion": "Prøv ny version",
    "classicVersion": "Klassisk version"
  },
  "languages": {
    "da": "Dansk",
    "en": "English",
    "fr": "Français"
  }
}
```

### Language Selection Logic

```typescript
// lib/i18n/index.ts

// 1. Check URL parameter: ?lang=en
// 2. Check localStorage: localStorage.getItem('language')
// 3. Check browser language: navigator.language
// 4. Default to 'da'

export function getLanguage(): 'da' | 'en' | 'fr' {
  // URL param takes priority
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang && ['da', 'en', 'fr'].includes(urlLang)) {
    return urlLang as 'da' | 'en' | 'fr';
  }

  // Then localStorage
  const savedLang = localStorage.getItem('language');
  if (savedLang && ['da', 'en', 'fr'].includes(savedLang)) {
    return savedLang as 'da' | 'en' | 'fr';
  }

  // Then browser language
  const browserLang = navigator.language.split('-')[0];
  if (['da', 'en', 'fr'].includes(browserLang)) {
    return browserLang as 'da' | 'en' | 'fr';
  }

  return 'da';
}
```

### Fallback to Danish

If a translation is missing for a game:

```typescript
// lib/i18n/index.ts

export async function loadGameTranslations(
  gameId: string,
  lang: string
): Promise<Translations> {
  try {
    // Try requested language
    const translations = await import(`../games/${gameId}/i18n/${lang}.json`);
    return translations.default;
  } catch {
    // Fallback to Danish
    console.warn(`No ${lang} translation for ${gameId}, using Danish`);
    const fallback = await import(`../games/${gameId}/i18n/da.json`);
    return fallback.default;
  }
}
```

### Language Selector Component

Located in the header/settings:

```svelte
<!-- LanguageSelector.svelte -->
<script>
  import { language, setLanguage } from '$lib/i18n';

  const languages = [
    { code: 'da', flag: '🇩🇰', name: 'Dansk' },
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'fr', flag: '🇫🇷', name: 'Français' }
  ];
</script>

<div class="language-selector">
  {#each languages as lang}
    <button
      class:active={$language === lang.code}
      on:click={() => setLanguage(lang.code)}
    >
      <span class="flag">{lang.flag}</span>
      <span class="name">{lang.name}</span>
    </button>
  {/each}
</div>
```

### Game Availability Per Language

The game registry tracks which languages are available:

```typescript
// lib/games/registry.ts

export const games = [
  {
    id: 'memory',
    icon: '🧠',
    languages: ['da', 'en', 'fr'],  // All languages
    component: () => import('./memory/Memory.svelte')
  },
  {
    id: 'tictactoe',
    icon: '⭕',
    languages: ['da', 'en'],        // No French yet
    component: () => import('./tictactoe/TicTacToe.svelte')
  },
  {
    id: 'reversi',
    icon: '⚫',
    languages: ['da'],              // Danish only (not migrated)
    component: null,                // Links to classic version
    classicUrl: '/Puzzles/01-reversi/'  // During dev: at root
    // After cutover: '/Puzzles/classic/01-reversi/'
  }
];
```

### Home Page Game Grid

Shows language availability:

```svelte
{#each games as game}
  <a href="/spil/{game.id}" class="game-card">
    <span class="icon">{game.icon}</span>
    <span class="name">{$t(`games.${game.id}.title`)}</span>

    {#if !game.languages.includes($language)}
      <span class="badge">🇩🇰</span>  <!-- Shows Danish fallback -->
    {/if}
  </a>
{/each}
```

---

## Folder Structure

### During Development (Parallel Deployment)

Classic site in `/app_classic/`, new SvelteKit app in `/app/`:

```
/Puzzles
│
│ # Config files
├── .gitignore                    # Includes www/ (build output)
├── .github/
│   └── workflows/
│       ├── build-app.yml         # Build & deploy SvelteKit app (future)
│       └── deploy-api.yml        # Deploy Azure Functions
├── CLAUDE.md
├── README.md
├── LICENSE
│
│ # Backend
├── api/                          # Azure Functions (C#)
│
│ # Classic site (in subfolder)
├── app_classic/                  # Classic vanilla HTML/CSS/JS site
│   ├── index.html                # Classic main page
│   ├── manifest.json             # Classic PWA manifest
│   ├── shared/                   # Classic shared files
│   │   ├── api.js
│   │   ├── ui.js
│   │   └── changelog.js
│   ├── icons/                    # Icons
│   ├── 01-reversi/               # Classic games
│   ├── 02-tents/
│   └── ... (all 29 game folders)
│
│ # New app source (committed)
├── app/                          # SvelteKit source
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +layout.svelte    # App shell
│   │   │   ├── +page.svelte      # Home (game grid)
│   │   │   └── spil/
│   │   │       └── [game]/
│   │   │           └── +page.svelte
│   │   │
│   │   └── lib/
│   │       ├── i18n/             # Shared translations
│   │       │   ├── da.json
│   │       │   ├── en.json
│   │       │   ├── fr.json
│   │       │   └── index.ts
│   │       │
│   │       ├── components/       # Shared UI
│   │       │   ├── GameShell.svelte
│   │       │   ├── LanguageSelector.svelte
│   │       │   └── ...
│   │       │
│   │       └── games/            # Game modules
│   │           ├── registry.ts
│   │           ├── memory/
│   │           │   ├── Memory.svelte
│   │           │   └── i18n/
│   │           │       ├── da.json
│   │           │       ├── en.json
│   │           │       └── fr.json
│   │           ├── tictactoe/
│   │           └── ...
│   │
│   ├── static/
│   ├── package.json
│   └── svelte.config.js
│
│ # Build output (NOT committed)
└── www/                          # Local dev only
    └── (gitignored)
```

### After Cutover (Final State)

Classic archived to subfolder, new app at root:

```
/Puzzles
│
├── .gitignore
├── .github/
├── CLAUDE.md
├── README.md
├── LICENSE
│
├── api/                          # Backend (unchanged)
│
│ # Classic site (archived)
├── classic/                      # Moved from root
│   ├── index.html
│   ├── manifest.json
│   ├── shared/
│   └── 01-reversi/ ... 29-*/
│
│ # New app (now at root via GitHub Pages)
├── app/                          # SvelteKit source (unchanged)
│   └── ...
│
└── www/                          # Local dev only
```

**Note:** The `www/` folder is for local development only. GitHub Actions builds and deploys directly - no build artifacts are committed to the repo.

---

## GitHub Action

### During Development (Deploy to /app/ subfolder)

The action builds SvelteKit and merges it into the repo's `/app/` folder for deployment:

```yaml
name: Build & Deploy SvelteKit App

on:
  push:
    branches: [main]
    paths: ['app/**']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: app
        run: npm install

      - name: Build SvelteKit app
        working-directory: app
        run: npm run build

      - name: Prepare deployment
        run: |
          # Create deployment directory with entire repo
          mkdir -p deploy

          # Copy classic site (root files and game folders)
          cp -r index.html manifest.json shared/ icons/ deploy/
          cp -r 01-*/ 02-*/ 03-*/ ... deploy/  # All game folders

          # Copy built SvelteKit app to /app/ subfolder
          mkdir -p deploy/app
          cp -r app/build/* deploy/app/

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: deploy

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### SvelteKit Configuration (for /app/ base path)

```javascript
// app/svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html'
    }),
    paths: {
      base: '/Puzzles/app'  // Important: subfolder path
    }
  }
};
```

### After Cutover (Deploy to root)

When ready to make the new app primary, update:

1. **svelte.config.js**: Change base path from `/Puzzles/app` to `/Puzzles`
2. **GitHub Action**: Deploy SvelteKit build to root, classic to `/classic/` subfolder

**Note:** No build artifacts are committed. GitHub Actions builds fresh and deploys directly to GitHub Pages.

---

## Migration Checklist Per Game

When migrating each game:

- [ ] Create game folder in `app/src/lib/games/[name]/`
- [ ] Create Svelte component with game logic
- [ ] Create `i18n/da.json` with all Danish strings
- [ ] Create `i18n/en.json` with English translation
- [ ] Create `i18n/fr.json` with French translation
- [ ] Add game to `registry.ts`
- [ ] Test in all 3 languages
- [ ] Test touch interactions on mobile
- [ ] Test offline behavior
- [ ] Update progress tracker

---

## Progress Tracker

| # | Game | Migrated | DA | EN | FR |
|---|------|----------|----|----|-----|
| 01 | Reversi | ⬜ | ✅ | ⬜ | ⬜ |
| 02 | Telte og Træer | ⬜ | ✅ | ⬜ | ⬜ |
| 03 | Sudoku | ⬜ | ✅ | ⬜ | ⬜ |
| 04 | Nonogram | ⬜ | ✅ | ⬜ | ⬜ |
| 05 | 2048 | ⬜ | ✅ | ⬜ | ⬜ |
| 06 | Minestryger | ⬜ | ✅ | ⬜ | ⬜ |
| 07 | Hukommelse | ⬜ | ✅ | ⬜ | ⬜ |
| ... | ... | ... | ... | ... | ... |
| 11 | Kryds og Bolle | ✅ | ✅ | ✅ | ✅ |
| ... | ... | ... | ... | ... | ... |

---

## Recommended Framework: SvelteKit

### Why SvelteKit?

| Factor | SvelteKit | Next.js | Vanilla |
|--------|-----------|---------|---------|
| Bundle size | Smallest | Large | Medium |
| Transitions | Built-in | Manual | Manual |
| i18n | Easy | Plugin | Manual |
| PWA support | Excellent | Good | Manual |

### Key Dependencies

```json
{
  "devDependencies": {
    "@sveltejs/adapter-static": "^3.0.0",
    "@sveltejs/kit": "^2.0.0",
    "svelte": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

---

## Next Steps

### Development Phase (Parallel Deployment)

1. ✅ Create this implementation guide
2. ✅ Move current classic site into `/app_classic/` folder
3. ✅ Update all internal links to work from `/app_classic/` subfolder
4. ✅ Push and verify classic site works at `https://mbundgaard.github.io/Puzzles/app_classic/`
   - Added redirect at root (`/index.html`) → `/app_classic/`
5. ✅ Initialize SvelteKit project in `/app/` folder
   - Created package.json, svelte.config.js, vite.config.js
   - Set up app.html with PWA meta tags and app.css with global styles
6. ✅ Set up GitHub Action to deploy SvelteKit to `/app/` and classic to `/app_classic/`
   - Created `.github/workflows/build-app.yml`
7. ✅ Set up i18n infrastructure
   - Created shared translations (da.json, en.json, fr.json)
   - Implemented language store with URL param > localStorage > browser detection
8. ✅ Build app shell with language selector
   - Created LanguageSelector component with dropdown
   - Created +layout.svelte and +page.svelte with game grid
9. ✅ Migrate first game (Kryds og Bolle)
   - Created TicTacToe.svelte with full game logic
   - Created game-specific translations for all 3 languages
   - Added WinModal integration with leaderboard submission
10. ✅ Add English + French translations
    - Added API client (api.ts) with leaderboard and win recording functions
    - Added Leaderboard component with full i18n support
    - Added WinModal component with full i18n support
11. ✅ Build complete UI with 4-tab navigation
    - Bottom tab bar: Games, Leaderboard, Feedback, Settings
    - Animated background with gradient orbs (shared across all pages)
    - Gradient titles on all pages
    - Settings page with sections: Language, Share, Info
    - Feedback page with categories: General, Suggest new game, Game feedback
    - About modal with sections: Points, Feedback, AI
    - Changelog modal with GitHub issue links (matching classic version)
    - Share functionality: QR code modal, SMS sharing
12. ⬜ Test SvelteKit app at `https://mbundgaard.github.io/Puzzles/app/`
13. ⬜ Continue game migrations (paused - only game 11 requested)
14. ✅ Add cross-link between classic and new app
    - Settings page GitHub link points to repo

### Cutover Phase (When Ready)

15. ⬜ Move new app to root, archive classic to `/classic/`
16. ⬜ Update SvelteKit base path to `/Puzzles`
17. ⬜ Update GitHub Action to deploy new app at root
18. ⬜ Add "Classic version" link in new app footer
19. ⬜ Announce migration to users
