# Tents and Trees

## Official Rules

### Objective
Place tents on a grid such that each tree has exactly one tent adjacent to it.

### Rules
1. **One-to-one pairing**: Each tree has exactly one tent horizontally or vertically adjacent (not diagonally)
2. **No adjacent tents**: Tents cannot be adjacent to each other (horizontally, vertically, or diagonally)
3. **Row/column clues**: Numbers on edges indicate exactly how many tents in that row/column
4. **Equal count**: The number of tents equals the number of trees
5. **Logic only**: All puzzles should be solvable through logic alone

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Tree-tent pairing | Correct | One tent per tree, orthogonally adjacent |
| No adjacent tents | Correct | Validates all 8 directions |
| Row/column clues | Correct | Numbers displayed and validated |
| Equal tent/tree count | Correct | Validated on win |
| Grid size | Limited | Fixed 8x8 only |
| Difficulty levels | Missing | No size/difficulty options |
| Unique solution | Not guaranteed | Random generation |

## Deviations from Standard Rules

1. **Fixed grid size**: Only 8x8 puzzles. Standard puzzles range from 5x5 to 20x20+.

2. **Random generation**: Puzzles are randomly generated without guaranteeing a unique solution. Official puzzles always have exactly one solution solvable by logic.

3. **No difficulty selection**: Cannot choose puzzle complexity.

## Known Issues

- Generated puzzles may have multiple valid solutions
- Some generated puzzles may be trivially easy or require guessing

## Sources

- [Puzzle-Tents.com](https://www.puzzle-tents.com/)
- [BrainBashers - Tents Help](https://www.brainbashers.com/tentshelp.asp)
- [Keep It Simple Puzzles - Tents Guide](https://www.keepitsimplepuzzles.com/how-to-solve-a-tents-and-trees-puzzle/)
