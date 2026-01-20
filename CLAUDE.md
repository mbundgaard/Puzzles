# Claude Development Guidelines

## ⚠️ FIRST: Check Open Issues

**Before doing anything else, fetch and list open issues:**

https://api.github.com/repos/mbundgaard/Puzzles/issues?state=open

**Group issues by type in this order:**
1. **General Feedback** - site/app feedback (game = null/empty)
2. **Game Suggestions** - new game ideas (game = "00")
3. **Game Feedback** - feedback about specific games (game = "01"-"99")

**Use this exact table format:**

```
General Feedback
┌─────┬────────────────────────────────────────────┐
│  #  │                   Title                    │
├─────┼────────────────────────────────────────────┤
│ 82  │ News page should support selected language │
└─────┴────────────────────────────────────────────┘
```

---

## ⚠️ ISSUE COMPLETION CHECKLIST (MUST follow every time)

When an issue is DONE, complete ALL steps in order:

**File changes (before commit):**
- [ ] **1. Changelog** - Add entry to `app/src/lib/components/ChangelogModal.svelte`
- [ ] **2. Translations** - Add changelog text to `app/src/lib/i18n/{da,en,fr}.json`
- [ ] **3. Registry** - If game changed, add `updated: 'YYYY-MM-DD'` in registry.ts
- [ ] **4. README** - If game changed, update the **Updated** column
- [ ] **5. Version** - Set `APP_VERSION` in `app/src/lib/version.ts` (`date +%s`)

**Deploy:**
- [ ] **6. Commit & push** - `git add -A && git commit && git push`
- [ ] **7. Set server version** - `/api/version/set?code=<key>` with same timestamp
- [ ] **8. Close issue** - `/api/issue/close?code=<key>` with comment

**Function key:** `echo -n "puzzles:PASSWORD" | openssl dgst -sha256 -binary | base64`

---

## Critical Rules

### Language Requirements

- **Communication with Claude must be in English**
- **Commit messages must be in English**
- **App supports 3 languages:** Danish (da), English (en), French (fr)
- Danish is the default language
- All UI text must be translated in all three languages
- Use translation keys, never hardcode text in components

### Touch-First Design (MUST follow)

All puzzles MUST work on mobile devices with touch-only input:

- **No right-click** - Provide visible toggle buttons for secondary actions
- **No keyboard dependencies** - All gameplay must be touch/tap only
- **No swipe gestures** - Use visible arrow buttons instead
- **No hover-only interactions** - Hover effects are supplementary only
- **Tap targets** - Interactive elements must be at least 44x44 pixels

### Admin API Authentication

Admin endpoints use Azure Functions authentication (pass `?code=<key>`). Protected endpoints:
- **issue/*** - All issue management endpoints
- **version/set** - Deploy version endpoint
- **usage**, **today**, **stats** - Usage statistics

### Closing Issues

**Do NOT use `Fixes #X` in commit messages.** Follow the ISSUE COMPLETION CHECKLIST above.

Changelog entry format in `ChangelogModal.svelte`:
```typescript
{ issue: 37, closedAt: '2025-12-31T14:30:00Z', submitter: 'Martin' },
```
- **submitter**: Check the GitHub issue - do NOT assume it's Martin

API calls:
```bash
# Close issue
curl -X POST "https://puzzlesapi.azurewebsites.net/api/issue/close?code=<key>" \
  -H "Content-Type: application/json" \
  -d '{"issueNumber": 9, "comment": "**Fixed:** Description"}'

# Set version
curl -X POST "https://puzzlesapi.azurewebsites.net/api/version/set?code=<key>" \
  -H "Content-Type: application/json" \
  -d '{"version": <timestamp>}'
```

---

## Project Overview

Browser-based puzzles and mind games built with SvelteKit. Deployed as a static site to GitHub Pages.

See `README.md` for the complete game list with numbers and point values.

---

## Detailed Documentation

| Document | Contents |
|----------|----------|
| [docs/adding-games.md](docs/adding-games.md) | Step-by-step guide to add a new game |
| [docs/app-structure.md](docs/app-structure.md) | Routes, components, layout, PWA, version system |
| [docs/api-reference.md](docs/api-reference.md) | All API endpoints, frontend functions, building the API |
| [docs/i18n.md](docs/i18n.md) | Translation system and usage |
| [docs/badges.md](docs/badges.md) | NEW/UPDATED badge system |
| [docs/ai-games.md](docs/ai-games.md) | AI-powered games and IAIService |
