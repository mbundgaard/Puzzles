# Reversi (Othello)

## Official Rules

### Setup
- 8x8 board (64 squares)
- 4 pieces placed in center: White on d4/e5, Black on d5/e4 (diagonal pattern)
- Black always plays first

### Gameplay
- Players take turns placing discs on the board
- A valid move must "sandwich" one or more opponent discs between the new disc and an existing disc of the same color
- Sandwiching can be horizontal, vertical, or diagonal
- All sandwiched discs are flipped to the player's color
- If no valid move is available, the turn passes to the opponent
- Players cannot voluntarily pass if a valid move exists

### Winning
- Game ends when the board is full or neither player can move
- Player with the most discs wins
- Equal discs = draw

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| 8x8 board | Extended | Supports 6x6, 8x8, 10x10 |
| Initial setup | Correct | Diagonal pattern in center |
| First player | Correct | Black plays first |
| Move validation | Correct | All 8 directions checked |
| Disc flipping | Correct | All sandwiched discs flip |
| Pass rule | Correct | Auto-pass when no moves |
| Win detection | Correct | Counts discs correctly |
| Two-player mode | Missing | AI opponent only |

## Deviations from Standard Rules

1. **Extended board sizes**: The implementation allows 6x6 and 10x10 boards in addition to the standard 8x8. This is an enhancement, not a rules violation.

2. **AI opponent only**: The game is single-player against an AI using minimax with alpha-beta pruning. No human vs human option.

## Sources

- [Reversi Rules - BitFlap](https://bitflap.app/vspocket/articles/reversi-rules-complete-guide/)
- [Reversi - Wikipedia](https://en.wikipedia.org/wiki/Reversi)
- [Masters of Games - Reversi Rules](https://www.mastersofgames.com/rules/reversi-othello-rules.htm)
