# Nonogram (Picross)

## Official Rules

### Grid
Rectangular grid of cells to be filled or left empty.

### Clues
- Numbers beside each row and above each column indicate consecutive filled cells
- Each number represents a group of consecutive filled squares
- Groups must be separated by at least one empty space
- Example: "4 8 3" means groups of 4, 8, and 3 filled squares in that order

### Objective
Fill the grid correctly to reveal a hidden picture.

### Properties
- Official puzzles have exactly one solution
- Solvable by logic alone without guessing
- Completed puzzles reveal recognizable images

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Row/column clues | Correct | Groups calculated correctly |
| Fill cells | Correct | Toggle to fill |
| Mark empty cells | Correct | Mark mode available |
| Multiple sizes | Correct | 5x5, 8x8, 10x10 |
| Picture reveal | Missing | Random patterns only |
| Unique solution | Not guaranteed | Random generation |
| Line completion hint | Missing | No feedback when row/column complete |
| Error detection | Missing | No mistake highlighting |

## Deviations from Standard Rules

1. **Random patterns instead of pictures**: The solution is randomly generated (50% fill probability per cell), meaning:
   - No meaningful picture is revealed upon completion
   - This is a significant deviation from traditional nonograms

2. **No unique solution guarantee**: Random generation does not ensure puzzles have exactly one logical solution.

3. **No solvability verification**: Generated puzzles may require guessing to solve.

## Known Issues

- Major: Puzzles don't reveal recognizable images (core feature of nonograms)
- Generated puzzles may be unsolvable or have multiple solutions
- Some puzzles may be trivially easy or impossibly hard

## Recommendations

To match official nonogram standards:
- Use curated picture puzzles instead of random generation
- Implement a puzzle generator that verifies unique solutions
- Add pre-made puzzle packs with actual images

## Sources

- [Nonogram - Wikipedia](https://en.wikipedia.org/wiki/Nonogram)
- [Hanjie Star - Picross Rules](https://www.hanjie-star.com/en-us/how-to-solve-picross/picross-game-rules)
- [Puzzle-Nonograms.com](https://www.puzzle-nonograms.com/)
