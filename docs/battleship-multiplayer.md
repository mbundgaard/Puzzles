# Sænke Slagskibe - Multiplayer Battleship

Two-player battleship game where players compete on separate devices via the API.

## Game Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GAME FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   PLAYER 1 (Creator)              │         PLAYER 2 (Joiner)               │
│   ─────────────────               │         ──────────────────              │
│                                   │                                          │
│   1. Opens game                   │                                          │
│   2. Selects "Create Game"        │                                          │
│   3. Chooses point structure      │                                          │
│   4. POST /create                 │                                          │
│      └─> Receives gameId + token  │                                          │
│   5. Sees "Waiting for opponent"  │                                          │
│      └─> Polls /state every 3s    │         1. Opens game                    │
│                                   │         2. Selects "Join Game"           │
│                                   │         3. GET /open                     │
│                                   │            └─> Sees list of open games   │
│                                   │         4. Selects a game                │
│                                   │         5. POST /join                    │
│   6. Polling detects joiner       │            └─> Receives token + state    │
│      └─> Status: "placing"        │                                          │
│                                   │                                          │
│   ═══════════════════════════════════════════════════════════════════════   │
│                           SHIP PLACEMENT PHASE                               │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                   │                                          │
│   7. Places ships on board        │         6. Places ships on board         │
│   8. POST /ships                  │         7. POST /ships                   │
│      └─> Polls for opponent       │            └─> Polls for opponent        │
│                                   │                                          │
│   When both have placed ships:    │                                          │
│      └─> Status: "playing"        │                                          │
│                                   │                                          │
│   ═══════════════════════════════════════════════════════════════════════   │
│                              BATTLE PHASE                                    │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                   │                                          │
│   Creator goes first              │                                          │
│   9. POST /shoot {x, y}           │                                          │
│      └─> Returns hit/miss + state │                                          │
│                                   │         8. Polling detects turn          │
│                                   │         9. POST /shoot {x, y}            │
│                                   │            └─> Returns hit/miss + state  │
│   10. Polling detects turn        │                                          │
│   ... continues until all ships   │                                          │
│       of one player are sunk      │                                          │
│                                   │                                          │
│   ═══════════════════════════════════════════════════════════════════════   │
│                               GAME END                                       │
│   ═══════════════════════════════════════════════════════════════════════   │
│                                   │                                          │
│   Status: "ended"                 │                                          │
│   Winner receives points          │                                          │
│   Loser loses points              │                                          │
│   Both can see opponent's ships   │                                          │
│                                   │                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Point Structure

Players choose one of three point structures when creating a game:

| Option | Winner Gets | Loser Loses |
|--------|-------------|-------------|
| High Stakes | +5 points | -2 points |
| Medium Stakes | +4 points | -1 point |
| Low Stakes | +3 points | 0 points |

Points can go negative. If a player has 1 point and loses 2, they go to -1.

## Game Rules

### Board
- 10x10 grid (coordinates 0-9 for both X and Y)
- X = horizontal (columns), Y = vertical (rows)

### Ships
Standard battleship fleet:

| Ship | Length |
|------|--------|
| Carrier | 5 |
| Battleship | 4 |
| Cruiser | 3 |
| Submarine | 3 |
| Destroyer | 2 |

Ships are placed with:
- `x`, `y`: Starting position (top-left of ship)
- `length`: Number of cells
- `horizontal`: true = extends right, false = extends down

### Shooting
- Players alternate turns (creator goes first)
- Each turn: shoot one cell
- Hit = shot lands on a ship cell
- Miss = shot lands on water
- Game ends when all cells of all ships of one player are hit

## API Endpoints

Base URL: `https://puzzlesapi.azurewebsites.net`

### Create Game

Creates a new game and returns a player token.

```
POST /api/game/25/create
```

**Request:**
```json
{
  "creatorName": "Martin",
  "winnerPoints": 5,
  "loserPoints": 2
}
```

**Response:**
```json
{
  "gameId": "ABC123",
  "playerToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

### List Open Games

Returns games waiting for an opponent.

```
GET /api/game/25/open
```

**Response:**
```json
{
  "games": [
    {
      "gameId": "ABC123",
      "creatorName": "Martin",
      "winnerPoints": 5,
      "loserPoints": 2,
      "createdAt": "2026-01-10T20:00:00Z"
    }
  ]
}
```

Games older than 10 minutes are automatically filtered out.

### Join Game

Joins an open game and returns a player token.

```
POST /api/game/25/{gameId}/join
```

**Request:**
```json
{
  "joinerName": "Sara"
}
```

**Response:**
```json
{
  "playerToken": "660e8400-e29b-41d4-a716-446655440001",
  "state": { ... }
}
```

### Cancel Game

Cancels/ends a game. Can be called by either player.

```
POST /api/game/25/{gameId}/cancel
```

**Request:**
```json
{
  "playerToken": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "success": true
}
```

### Get Game State

Returns current game state. Used for polling.

```
GET /api/game/25/{gameId}/state?playerToken={token}
```

**Response:**
```json
{
  "gameId": "ABC123",
  "status": "playing",
  "creatorName": "Martin",
  "joinerName": "Sara",
  "winnerPoints": 5,
  "loserPoints": 2,
  "yourRole": "creator",
  "yourShips": [
    { "x": 0, "y": 0, "length": 5, "horizontal": true }
  ],
  "opponentShips": null,
  "yourShots": [
    { "x": 3, "y": 4, "hit": true },
    { "x": 5, "y": 2, "hit": false }
  ],
  "opponentShots": [
    { "x": 0, "y": 0, "hit": true }
  ],
  "currentTurn": "creator",
  "isYourTurn": true,
  "winner": null,
  "youWon": null
}
```

**Status values:**
- `open` - Waiting for opponent to join
- `placing` - Both players placing ships
- `playing` - Battle in progress
- `ended` - Game over

**Note:** `opponentShips` is only populated when `status` is `ended`.

### Place Ships

Submits ship placement.

```
POST /api/game/25/{gameId}/ships
```

**Request:**
```json
{
  "playerToken": "550e8400-e29b-41d4-a716-446655440000",
  "ships": [
    { "x": 0, "y": 0, "length": 5, "horizontal": true },
    { "x": 0, "y": 2, "length": 4, "horizontal": true },
    { "x": 0, "y": 4, "length": 3, "horizontal": true },
    { "x": 0, "y": 6, "length": 3, "horizontal": true },
    { "x": 0, "y": 8, "length": 2, "horizontal": true }
  ]
}
```

**Response:** Full game state (same as GET /state)

### Shoot

Makes a shot at the opponent's board.

```
POST /api/game/25/{gameId}/shoot
```

**Request:**
```json
{
  "playerToken": "550e8400-e29b-41d4-a716-446655440000",
  "x": 3,
  "y": 4
}
```

**Response:** Full game state (same as GET /state)

The shot result is included in `yourShots` array with the `hit` value.

## Polling Strategy

Since Azure Functions don't support WebSockets, clients must poll for updates.

**Recommended polling intervals:**
- Waiting for opponent: Every 3 seconds
- Waiting for opponent to place ships: Every 3 seconds
- Waiting for opponent's turn: Every 2 seconds

**What to check:**
- `status` changes (open → placing → playing → ended)
- `joinerName` appears (opponent joined)
- `currentTurn` changes (your turn)
- `winner` is set (game over)

## Player Authentication

Each player receives a unique `playerToken` (GUID) when they create or join a game.

- Creator token returned from `/create`
- Joiner token returned from `/join`

All subsequent requests require this token:
- POST requests: Include in request body
- GET requests: Include as query parameter

Invalid tokens return `401 Unauthorized`.

## Game Expiration

Open games (waiting for opponent) expire after 10 minutes.

- Expired games are filtered from `/open` list
- If creator's polling detects expiration, redirect to game menu

## Error Responses

All errors return JSON with an `error` field:

```json
{
  "error": "Game not found"
}
```

**Common errors:**
| Code | Error | Cause |
|------|-------|-------|
| 400 | Invalid JSON | Malformed request body |
| 400 | CreatorName is required | Missing required field |
| 400 | Game is not open for joining | Game already started |
| 400 | Ships already placed | Tried to place ships twice |
| 400 | It's not your turn | Shot attempted out of turn |
| 401 | Invalid player token | Wrong or missing token |
| 404 | Game not found | Invalid gameId |

## Database Schema

Games are stored in Azure Table Storage:

**Table:** `BattleshipGames`

| Column | Type | Description |
|--------|------|-------------|
| PartitionKey | string | "game25" (fixed) |
| RowKey | string | Game ID (6-char code) |
| Status | string | open/placing/playing/ended |
| CreatorName | string | Player 1 name |
| CreatorToken | string | Player 1 auth token |
| JoinerName | string | Player 2 name (null until joined) |
| JoinerToken | string | Player 2 auth token |
| WinnerPoints | int | Points for winner (3-5) |
| LoserPoints | int | Points lost by loser (0-2) |
| CreatorShips | string | JSON array of ships |
| JoinerShips | string | JSON array of ships |
| CreatorShots | string | JSON array of shots |
| JoinerShots | string | JSON array of shots |
| CurrentTurn | string | "creator" or "joiner" |
| Winner | string | "creator", "joiner", or null |
| CreatedAt | DateTime | Game creation timestamp |
