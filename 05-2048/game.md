# 2048

## Official Rules

### Setup
- 4x4 grid
- Game starts with 2 tiles (value 2 or 4)
- New tiles appear with 90% chance of 2, 10% chance of 4

### Gameplay
- Swipe/arrow keys move all tiles in that direction
- Tiles slide as far as possible until stopped by another tile or edge
- Two tiles of the same value merge into one tile with the combined value
- A merged tile cannot merge again in the same move
- After each valid move, a new tile appears in a random empty space

### Winning
- Create a tile with value 2048 (game can continue after)
- Game over when no empty spaces and no adjacent tiles can merge

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| 4x4 grid | Correct | |
| Start with 2 tiles | Correct | |
| 90/10 probability | Correct | 2s appear 90%, 4s appear 10% |
| Tiles slide to edge | Correct | |
| Same-value merge | Correct | |
| No double-merge | Correct | Merged tiles can't merge again same turn |
| Score tracking | Correct | Increases by merged value |
| Best score | Correct | Persisted in localStorage |
| Win at 2048 | Correct | |
| Continue after win | Correct | |
| Game over detection | Correct | |
| Swipe controls | Correct | Touch-friendly |
| Keyboard controls | Correct | Arrow keys |

## Deviations from Standard Rules

**None** - The implementation is fully compliant with official 2048 rules.

## Sources

- [Play 2048 Official](https://play2048.co/)
- [2048 - Wikipedia](https://en.wikipedia.org/wiki/2048_(video_game))
- [How to Play 2048 - HubPages](https://levelskip.com/puzzle/How-to-play-2048)
