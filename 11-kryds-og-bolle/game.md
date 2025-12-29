# Kryds og Bolle (Tic-Tac-Toe)

## Official Rules

### Setup
- 3x3 grid
- Two players: X and O
- X traditionally goes first

### Gameplay
- Players alternate placing their mark in empty cells
- Marks cannot be moved or removed once placed

### Winning
- First player to get 3 marks in a row wins (horizontal, vertical, or diagonal)
- If all 9 cells are filled with no winner, it's a draw

### Game Theory
- Tic-Tac-Toe is a "solved game"
- With perfect play, the game always ends in a draw
- X (first player) has a slight advantage

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| 3x3 grid | Correct | |
| Win patterns | Correct | All 8 patterns (3 rows, 3 cols, 2 diagonals) |
| Turn-based play | Correct | Alternating turns |
| Win detection | Correct | Checks all patterns |
| Draw detection | Correct | Full board, no winner |
| Winning line highlight | Correct | Visual feedback |
| Score tracking | Correct | Player/AI/Draw counts |
| AI opponent | Correct | Three difficulty levels |
| Two-player mode | Missing | AI only |
| First player choice | Missing | Player always first |

### AI Difficulty Levels

| Level | Behavior |
|-------|----------|
| Easy | Random valid moves |
| Medium | 60% best move, 40% random |
| Hard | Minimax algorithm (perfect play) |

## Deviations from Standard Rules

1. **AI opponent only**: No option for two human players. This is an enhancement for single-player enjoyment.

2. **Player always first**: In traditional games, players may alternate who goes first. Here, the human player is always X and always moves first.

## Notes

The implementation is **fully compliant** with official Tic-Tac-Toe rules. The AI opponent is an enhancement that makes the game playable solo. On "Hard" difficulty, the AI plays perfectly and will never lose (best outcome for player is a draw).

## Sources

- [Tic-tac-toe - Wikipedia](https://en.wikipedia.org/wiki/Tic-tac-toe)
- [How to Play Tic-Tac-Toe - Official Game Rules](https://officialgamerules.org/game-rules/tic-tac-toe/)
