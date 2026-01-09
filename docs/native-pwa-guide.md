# Native PWA Experience - Implementation Guide

## Overview

This document outlines how to transform Hjernespil into a more native-feeling Progressive Web App (PWA). Based on research into modern web frameworks and PWA best practices.

---

## Current State

- **Technology**: Vanilla HTML/CSS/JS
- **Structure**: 29 standalone game folders, each with index.html/style.css/script.js
- **PWA Support**: Basic manifest.json, no service worker
- **Navigation**: Full page reloads between games
- **Hosting**: Static files on GitHub Pages / Azure SWA

### Current Limitations

1. No page transitions (jarring navigation)
2. No offline caching (requires network)
3. No app shell (full reload on each page)
4. Large initial payloads per game

---

## Recommended Framework: SvelteKit

### Why SvelteKit?

| Factor | SvelteKit | Next.js | Vanilla + Enhancements |
|--------|-----------|---------|------------------------|
| Bundle size | Smallest (compiles away) | Large (React runtime) | Medium |
| Transitions | Built-in, smooth | Requires config | Manual (View Transitions API) |
| Learning curve | Easy from vanilla JS | Steeper (React) | None |
| PWA support | Excellent (vite-pwa) | Good (next-pwa) | Manual |
| Build required | Yes | Yes | No |

**Verdict**: SvelteKit provides the best balance of native feel, small bundles, and developer experience.

### Alternative: Enhance Vanilla

If avoiding a build step is critical, enhance the current site with:
- **View Transitions API** - Native browser transitions (Chrome 111+)
- **Workbox** - Service worker for offline support
- **Barba.js** - Smooth page transitions

---

## Key Features for Native Feel

### 1. Page Transitions

Native apps have smooth transitions between screens. Implement:

```
Home → Game: Slide in from right
Game → Home: Slide out to right
```

**SvelteKit approach**:
```svelte
{#key $page.url.pathname}
  <div in:fly={{ x: 100 }} out:fly={{ x: -100 }}>
    {@render children()}
  </div>
{/key}
```

### 2. App Shell Architecture

Load a minimal shell instantly, then hydrate content:

```
┌─────────────────────┐
│  Header (cached)    │  ← Instant
├─────────────────────┤
│                     │
│  Content (dynamic)  │  ← Loads after
│                     │
├─────────────────────┤
│  Nav bar (cached)   │  ← Instant
└─────────────────────┘
```

### 3. Service Worker & Offline

Cache strategy for instant loads:

| Resource | Strategy |
|----------|----------|
| App shell | Cache first |
| Game assets | Cache first |
| API calls | Network first, fallback to cache |
| Images | Stale while revalidate |

### 4. Touch Interactions

- **Haptic feedback** - Vibration on key actions (where supported)
- **Pull to refresh** - Native gesture support
- **Swipe navigation** - Back gesture on games
- **Active states** - Immediate visual feedback (no 300ms delay)

### 5. Bottom Navigation

Native apps use bottom nav, not hamburger menus:

```
┌─────────────────────────────────┐
│                                 │
│          Game Content           │
│                                 │
├─────────────────────────────────┤
│  🏠 Home  │  🏆 Score  │  ⚙️ More │
└─────────────────────────────────┘
```

### 6. Skeleton Loading

Show content placeholders while loading:

```
┌─────────────────┐
│ ████████████    │  ← Gray placeholder
│ ████████        │
│ ████████████████│
└─────────────────┘
```

---

## Implementation Approach

### Folder Structure

```
/Puzzles
├── app-src/              # SvelteKit source
│   ├── src/
│   │   ├── routes/
│   │   │   ├── +layout.svelte    # App shell + transitions
│   │   │   ├── +page.svelte      # Home page
│   │   │   └── spil/
│   │   │       └── [game]/       # Dynamic game routes
│   │   └── lib/
│   │       ├── components/       # Shared components
│   │       └── games/            # Game logic
│   └── static/
│
├── app/                  # Built output (auto-generated)
│
├── index.html            # Classic site (keep for now)
└── 01-reversi/           # Classic games (keep)
```

### Build & Deploy

1. **GitHub Action** triggers on push to `app-src/**`
2. Runs `npm install && npm run build`
3. Outputs static files to `/app/`
4. Commits built files to repo
5. Deployed alongside classic site

### Migration Strategy

**Phase 1**: Build new app shell with 3 pilot games
- Memory (simple, tests card animations)
- 2048 (tests swipe gestures)
- Tic-tac-toe (tests AI integration)

**Phase 2**: Add PWA features
- Service worker with Workbox
- Offline support
- Install prompt

**Phase 3**: Migrate remaining games
- Port games one by one
- Keep classic site as fallback

**Phase 4**: Replace main site
- Redirect `/Puzzles/` to `/Puzzles/app/`
- Archive classic version at `/Puzzles/classic/`

---

## Technical Specifications

### SvelteKit Configuration

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: '../app',
      assets: '../app',
      fallback: 'index.html'
    }),
    paths: {
      base: '/Puzzles/app'
    }
  }
};
```

### PWA Plugin

```javascript
// vite.config.js
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default {
  plugins: [
    SvelteKitPWA({
      strategies: 'generateSW',
      manifest: {
        name: 'Hjernespil',
        short_name: 'Hjernespil',
        theme_color: '#0f0f23',
        display: 'standalone'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ]
};
```

### Transition Animation

```svelte
<script>
  import { fly } from 'svelte/transition';
  import { page } from '$app/stores';
</script>

{#key $page.url.pathname}
  <main
    in:fly={{ y: 20, duration: 300, delay: 100 }}
    out:fly={{ y: -20, duration: 200 }}
  >
    <slot />
  </main>
{/key}
```

---

## Native Features Checklist

| Feature | Priority | Complexity |
|---------|----------|------------|
| Page transitions | High | Low |
| Service worker / offline | High | Medium |
| App shell architecture | High | Medium |
| Bottom navigation | Medium | Low |
| Pull to refresh | Medium | Medium |
| Haptic feedback | Low | Low |
| Splash screen | Low | Low |
| Share API integration | Low | Low |

---

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developer.chrome.com/docs/workbox/)
- [View Transitions API](https://developer.chrome.com/docs/web-platform/view-transitions/)
- [PWA Best Practices](https://web.dev/pwa-checklist/)

---

## Next Steps

1. Review this document
2. Decide on Phase 1 games
3. Initialize SvelteKit project
4. Implement app shell with transitions
5. Port first 3 games
6. Add PWA features
7. Test on real devices
8. Gather feedback
