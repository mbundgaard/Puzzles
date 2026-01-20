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

Admin endpoints use Azure Functions authentication. Protected endpoints:
- **issue/*** - All issue management endpoints
- **version/set** - Deploy version endpoint
- **usage**, **today**, **stats** - Usage statistics

**Getting the function key:**

When you need to call an admin endpoint, ask the user for the admin password, then derive the function key:

```bash
echo -n "puzzles:PASSWORD" | openssl dgst -sha256 -binary | base64
```

Replace `PASSWORD` with the actual password. Use the output as the `code` query parameter.

### Closing Issues (MUST follow)

**Do NOT use `Fixes #X` in commit messages.** Follow this workflow:

1. Fix the issue in the code
2. Add changelog entry to `app/src/lib/components/ChangelogModal.svelte`
3. Commit and push all changes
4. Call the API to close the issue (include API key):

```bash
curl -X POST "https://puzzlesapi.azurewebsites.net/api/issue/close?code=<function_key>" \
  -H "Content-Type: application/json" \
  -d '{"issueNumber": 9, "comment": "**Fixed:** Description of what was fixed."}'
```

### Changelog Entries (MUST follow)

Add new entries at the **TOP** of `changelogEntries` array in `ChangelogModal.svelte`:

```typescript
{ issue: 37, closedAt: '2025-12-31T14:30:00Z', submitter: 'Martin', text: 'Description of fix' },
```

- **issue**: GitHub issue number
- **closedAt**: ISO timestamp from GitHub's `closed_at` field
- **submitter**: Check the GitHub issue - do NOT assume it's Martin
- **text**: Short English description

### Deploy Workflow (MUST follow)

When ready to commit and deploy:

1. **Update version timestamp** in `app/src/lib/version.ts`:
   ```typescript
   export const APP_VERSION = <current_unix_timestamp>;
   ```
   Get timestamp with: `date +%s`

2. **Commit and push** all changes to main

3. **Update server version** by calling the API (include API key):
   ```bash
   curl -X POST "https://puzzlesapi.azurewebsites.net/api/version/set?code=<function_key>" \
     -H "Content-Type: application/json" \
     -d '{"version": <same_timestamp>}'
   ```

### Updating Existing Games

When making significant changes to a game:

1. Update the `updated` field in the game registry
2. Update the **Updated** column in README.md to today's date
3. Commit all changes together

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
