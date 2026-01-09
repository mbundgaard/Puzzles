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

### Phase 0: Backup Classic Site

Before any changes, archive the current site. Keep root clean for config files only:

```
/Puzzles
├── .gitignore                  # Git config (includes www/)
├── .github/                    # GitHub workflows
├── CLAUDE.md                   # Claude instructions
├── README.md                   # Project documentation
├── LICENSE                     # License file
│
├── api/                        # Backend Azure Functions (existing)
├── classic/                    # Archived original site
│   ├── index.html
│   ├── shared/
│   ├── icons/
│   ├── 01-reversi/
│   └── ... (all 29 games)
│
├── app/                        # SvelteKit source (committed)
└── www/                        # Build output (NOT committed, local dev only)
```

The classic site remains accessible at `/Puzzles/classic/` as a fallback.

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

1. Move classic site to `/Puzzles/classic/`
2. Deploy new app to `/Puzzles/`
3. Add "Classic version" link in footer

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
    classicUrl: '/Puzzles/classic/01-reversi/'
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

## Folder Structure (Final)

```
/Puzzles
│
│ # Root: Config files only
├── .gitignore                    # Includes www/ (build output)
├── .github/
│   └── workflows/
│       ├── build-app.yml         # Build & deploy SvelteKit
│       └── deploy-api.yml        # Deploy Azure Functions
├── CLAUDE.md
├── README.md
├── LICENSE
│
│ # Backend
├── api/                          # Azure Functions (C#)
│   ├── Functions/
│   ├── Services/
│   └── Puzzles.csproj
│
│ # Classic site (archived)
├── classic/                      # Original vanilla site
│   ├── index.html
│   ├── manifest.json
│   ├── shared/
│   │   ├── api.js
│   │   ├── ui.js
│   │   └── changelog.js
│   ├── icons/
│   └── 01-reversi/ ... 29-*/
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
└── www/                          # Local dev only, built by GitHub Action
    └── (gitignored)
```

**Note:** The `www/` folder is for local development only. GitHub Actions builds and deploys directly - no build artifacts are committed to the repo.

---

## GitHub Action

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

      - name: Build
        working-directory: app
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: app/build

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

1. ✅ Create this implementation guide
2. ⬜ Archive classic site to `/classic/`
3. ⬜ Initialize SvelteKit project in `/app/`
4. ⬜ Set up i18n infrastructure
5. ⬜ Build app shell with language selector
6. ⬜ Migrate first game (Kryds og Bolle)
7. ⬜ Add English + French translations
8. ⬜ Test on real devices
9. ⬜ Continue game migrations
