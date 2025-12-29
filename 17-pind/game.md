# Pind (Peg Solitaire)

## Official Rules

### Board Types
- **English board**: 33 holes, cross-shaped
- **European board**: 37 holes, more rounded shape

### Setup
All holes filled with pegs except the center hole.

### Gameplay
- Jump one peg over an adjacent peg to an empty hole
- The jumped peg is removed from the board
- Moves are orthogonal only (horizontal or vertical, no diagonals)

### Objective
Remove all pegs except one, ideally ending with the final peg in the center hole.

### Important Note
The European board starting from center cannot be solved to end with a single peg in the center (proven mathematically).

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| English board (33 holes) | Correct | Cross shape |
| European board (37 holes) | Correct | Rounded shape |
| Center start empty | Correct | |
| Orthogonal jumps only | Correct | No diagonal moves |
| Peg removal | Correct | Jumped peg removed |
| Undo functionality | Correct | Can undo moves |
| Move counter | Correct | |
| Peg counter | Correct | |
| Perfect win detection | Correct | 1 peg in center |
| Near win detection | Correct | 1 peg not in center |
| Game over detection | Correct | No valid moves |
| Board selection | Correct | Can switch boards |

## Deviations from Standard Rules

**None** - The implementation correctly follows all official Peg Solitaire rules.

### Minor Improvement Suggestion

The European board cannot be solved to a single center peg when starting with center empty. The game could warn players about this mathematical limitation.

## Victory Conditions

| Outcome | Condition |
|---------|-----------|
| Perfect | 1 peg remaining in center |
| Near win | 1 peg remaining, not in center |
| Game over | Multiple pegs, no valid moves |

## Sources

- [Peg Solitaire - Wikipedia](https://en.wikipedia.org/wiki/Peg_solitaire)
- [PegSolitaire.org](https://pegsolitaire.org/)
- [Solitaire Paradise - Peg Solitaire](https://www.solitaireparadise.com/games_list/peg-solitaire.html)
