# Backend API Reference

**Base URL:** `https://puzzlesapi.azurewebsites.net`

## Core Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/win` | Record a win `{nickname, game, points}` (points: 1-5) |
| GET | `/api/leaderboard?game=all&top=10` | Get top players (current month) |
| GET | `/api/stats` | Get total points (all-time) |
| POST | `/api/event` | Record game event `{game, event}` (event: "start" or "complete") |
| GET | `/api/usage?game=all` | Get usage stats this month |
| GET | `/api/today` | Get today's starts and completions |

## Feedback & Issues

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/feedback` | Submit feedback `{game?, rating, text?, nickname?}` → creates GitHub issue |
| POST | `/api/issue/create` | Create issue `{title, body}` → `{issueNumber}` |
| POST | `/api/issue/edit` | Edit issue `{issueNumber, title?, body?, state?}` |
| POST | `/api/issue/close` | Close issue with comment `{issueNumber, comment}` |
| POST | `/api/issue/delete` | Delete issue `{issueNumber}` (requires admin) |

## Version Management

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/version` | Check version `{version}` → `{newVersionExists: bool}` |
| POST | `/api/version/set` | Set server version `{version}` → `{success, version}` |

## Session Tracking

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/session/{game}/{sessionId}/start` | Start session `{nickname?, device?, appVersion?}` |
| POST | `/api/session/{game}/{sessionId}/update` | Add event `{event}` (newGame, win, lose) |
| POST | `/api/session/{game}/{sessionId}/end` | End session |
| GET | `/api/session/{game}/{sessionId}` | Get session details |

## Game-Specific Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/game/10/word` | Get word for Ordleg `{length, difficulty, category}` |
| POST | `/api/game/26/pick` | Pick animal `{category?, difficulty?}` |
| POST | `/api/game/26/ask` | Ask about animal `{animal, question}` → yes/no/maybe |
| POST | `/api/game/26/hint` | Get hint `{animal, previousHints?}` |
| POST | `/api/game/27/generate` | Generate word search `{difficulty}` → grid + words |

## API Functions (Frontend)

API calls are made using fetch from game components. The API base URL and helper functions are in `app/src/lib/api.ts`.

| Function | Description | Returns |
|----------|-------------|---------|
| `trackStart(game)` | Track game start | `Promise<void>` |
| `trackComplete(game)` | Track game completion | `Promise<void>` |
| `recordWin(game, nickname, points)` | Record win to leaderboard (points: 1-5) | `Promise<{success, message?, error?}>` |
| `getLeaderboard(game?, top?)` | Get top players (current month) | `Promise<{period, entries[], totalPoints}>` |
| `submitFeedback(game, {text?, nickname?})` | Submit user feedback | `Promise<{success, message?, error?}>` |

## Notes

- Game numbers must be zero-padded strings (e.g., "01", "02")
- Nickname must be 2-20 characters
- Nickname is stored in localStorage and shared across the app

## Feedback System

User feedback is submitted via the API and automatically creates GitHub issues. Feedback text is processed by Azure OpenAI (ChatGPT) to generate English titles and translations.

**Feedback types (determined by `game` value):**

| Game Value | Type | Issue Title |
|------------|------|-------------|
| `null` / `""` | General Feedback | `Feedback: {AI title}` |
| `"00"` | New Game Suggestion | `New Game: {AI title}` |
| `"01"`-`"99"` | Game-Specific | `{GameName}: {AI title}` |

If feedback contains Danish text, the AI translates it to English and includes the original in a collapsible section.

Issues appear at: https://github.com/mbundgaard/Puzzles/issues

## Building the Azure Functions API

The `api/` folder contains a C# Azure Functions project (.NET 8.0, isolated worker model).

### First-time Session Setup

Install the .NET 8.0 SDK:

```bash
curl -sSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin --channel 8.0
export PATH="$HOME/.dotnet:$PATH"
```

### Building the Project

```bash
rm -rf api/obj && dotnet build api/Puzzles.csproj -c Release
```

The `rm -rf api/obj` ensures a clean build and avoids stale generated project issues.

### Notes

- NuGet packages are committed to `api/packages/` for offline restore (nuget.org is not accessible from this environment)
- The `api/nuget.config` is configured to use only the local package cache
- Build warnings about version mismatches (NU1603) are expected and harmless
