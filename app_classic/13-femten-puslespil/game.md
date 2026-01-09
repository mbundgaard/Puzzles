# 15-Puzzle (Sliding Puzzle)

## Official Rules

### Setup
- 4x4 grid with 15 numbered tiles (1-15) and one empty space
- Tiles are scrambled from the solved position

### Gameplay
- Slide tiles adjacent to the empty space into the empty position
- Tiles cannot be lifted, only slid
- Only horizontal and vertical moves allowed

### Objective
Arrange tiles in numerical order (1-15), left to right, top to bottom, with empty space in bottom-right corner.

### Solvability
- Only half of all possible starting configurations are solvable
- Depends on the number of "inversions" in the initial state
- Well-designed puzzles ensure solvability

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| 4x4 grid | Correct | 15 tiles + 1 empty |
| Numbered tiles | Correct | 1-15 |
| Sliding mechanic | Correct | Adjacent to empty only |
| Win condition | Correct | 1-15 in order, empty at end |
| Solvability | Correct | Shuffle uses valid moves |
| Move counter | Correct | Tracks moves made |
| Timer | Correct | Tracks solve time |
| Movable tile highlight | Correct | Visual feedback |
| Correct position highlight | Correct | Shows tiles in place |

## Deviations from Standard Rules

**None** - The implementation correctly follows all official 15-puzzle rules.

### Shuffle Method

The implementation uses a smart shuffle approach:
- Makes 100 random valid moves from the solved state
- This guarantees the puzzle is always solvable
- Avoids the "unsolvable configuration" problem

## Potential Enhancements

- Different grid sizes (3x3, 5x5)
- Image mode (picture instead of numbers)
- Move limit challenges

## Sources

- [15 Puzzle - Wikipedia](https://en.wikipedia.org/wiki/15_puzzle)
- [Sliding Puzzle - Wikipedia](https://en.wikipedia.org/wiki/Sliding_puzzle)
- [How to Play Sliding Puzzle - TicTacToeFree](https://tictactoefree.com/sliding-puzzle/rules)
