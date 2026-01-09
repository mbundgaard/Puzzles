# Memory (Concentration)

## Official Rules

### Setup
- Cards laid face-down in a grid pattern
- Each card has a matching pair somewhere in the grid

### Gameplay
- Players flip two cards per turn
- If cards match, they are removed from play (player keeps the pair)
- If cards don't match, both are turned back face-down
- In multiplayer: matching pair grants another turn; turn passes on mismatch

### Winning
- Multiplayer: Player with most pairs wins
- Solo: Clear the board, track moves (fewer is better)

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Face-down cards | Correct | Grid layout |
| Flip two cards | Correct | Per turn |
| Match detection | Correct | Same emoji = match |
| Remove matched pairs | Correct | Cards get 'matched' class |
| Non-match flip back | Correct | 1 second delay |
| Move counter | Correct | Each pair of flips = 1 move |
| Win detection | Correct | All pairs matched |
| Board locking | Correct | Prevents clicking during animation |
| Multiplayer mode | Missing | Single player only |
| Extra turn on match | N/A | No turns in solo mode |
| Grid size options | Correct | Configurable |

## Deviations from Standard Rules

1. **Single player only**: No multiplayer mode with turn-taking. The implementation is designed for solo play.

2. **Emoji symbols**: Uses emoji pairs instead of traditional playing cards. This is a thematic choice that doesn't affect gameplay.

3. **No scoring variants**: Only tracks move count. Traditional versions may use different scoring systems.

## Notes

The core matching mechanic is correctly implemented. The single-player focus is appropriate for a mobile puzzle game.

## Sources

- [Concentration - Wikipedia](https://en.wikipedia.org/wiki/Concentration_(card_game))
- [Memory Game Rules - UltraBoardGames](https://www.ultraboardgames.com/memory/game-rules.php)
- [Concentration - Bicycle Cards](https://bicyclecards.com/how-to-play/concentration/)
