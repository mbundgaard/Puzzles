# Dam (Checkers / English Draughts)

## Official Rules (English/American Checkers)

### Setup
- 8x8 board with dark squares used
- 12 pieces per player on dark squares
- 3 rows of pieces per player, 2 empty rows in middle

### Movement Rules
- Regular pieces move diagonally forward only, one square at a time
- Captures are **mandatory** - if you can capture, you must
- Regular pieces cannot capture backwards
- Multiple captures in one turn are required if available

### King Rules
- Piece becomes a king upon reaching the opposite end
- Kings can move and capture diagonally in any direction
- Kings move one square at a time (no "flying kings")
- Turn ends upon promotion (no immediate king powers)

### Winning
- Capture all opponent pieces, OR
- Block opponent so they cannot move

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| 8x8 board | Correct | Dark squares only |
| 12 pieces per side | Correct | |
| Diagonal forward movement | Correct | For regular pieces |
| Mandatory captures | Correct | mustCapture enforced |
| Multi-jump | Correct | Must continue if possible |
| King promotion | Correct | At opposite end |
| King movement | Correct | All 4 diagonal directions |
| One square at a time | Correct | No flying kings |
| Promotion ends multi-jump | Correct | Turn ends on promotion |
| Win by capture | Correct | All pieces taken |
| Win by blocking | Correct | No valid moves |
| AI opponent | Correct | Minimax with alpha-beta |
| Difficulty levels | Correct | Easy, Medium, Hard |
| Draw detection | Missing | No 25-move rule |
| Two-player mode | Missing | AI only |

## Deviations from Standard Rules

1. **No draw detection**: The game doesn't implement draw rules such as:
   - 25 consecutive king-only moves without captures
   - Repetition of positions
   - Endgame draws (e.g., one king cannot beat another)

2. **AI opponent only**: No option for two human players.

## AI Implementation

The AI uses minimax with alpha-beta pruning:
- Easy: Depth 2
- Medium: Depth 4
- Hard: Depth 6

Position evaluation considers:
- Piece count (kings worth more)
- Piece advancement (closer to promotion = better)

## Sources

- [American Checkers Rules - Checkers.online](https://checkers.online/magazine/game/american-checkers-rules)
- [Checkers - Wikipedia](https://en.wikipedia.org/wiki/Checkers)
- [English Draughts Rules - LITE Games](https://info.lite.games/en/support/solutions/articles/60000691490-checkers-rules-english-draughts-)
