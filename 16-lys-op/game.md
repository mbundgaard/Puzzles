# Lys Op (Light Up / Akari)

## Official Rules

### Grid
- Rectangular grid with black cells (walls) and white cells
- Some black cells have numbers (0-4)

### Objective
Place light bulbs so every white cell is illuminated.

### Rules
1. **Illumination**: A bulb lights all cells in its row and column until blocked by a wall
2. **No mutual illumination**: No two bulbs can shine on each other (no bulbs in same row/column without a wall between)
3. **Numbered walls**: Numbers indicate exactly how many bulbs must be orthogonally adjacent (not diagonal)
4. **Unnumbered walls**: No constraint on adjacent bulbs

### Properties
- Official puzzles have exactly one solution
- Solvable by logic alone without guessing

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Grid layout | Correct | Walls and empty cells |
| Numbered walls (0-4) | Correct | |
| Bulb placement | Correct | Toggle mode |
| Illumination logic | Correct | Rays in 4 directions |
| Conflict detection | Correct | Bulbs seeing each other |
| Number satisfaction | Correct | Orthogonal count only |
| Win condition | Correct | All lit + no conflicts + numbers satisfied |
| Mark mode | Correct | Mark cells as "no bulb" |
| Visual feedback | Correct | Lit cells, conflicts, satisfied numbers |
| Unique solution | Not guaranteed | Random generation |
| Solvability | Not guaranteed | Random puzzles may be unsolvable |

## Deviations from Standard Rules

### Major Issue: Random Puzzle Generation

The implementation uses random generation, which causes several problems:

1. **No solution guarantee**: Random wall and number placement may create unsolvable puzzles.

2. **Impossible numbers**: A wall might be assigned a number higher than the count of adjacent empty cells.

3. **Multiple solutions**: Generated puzzles are not tested for uniqueness.

4. **Not logic-solvable**: Puzzles may require guessing rather than deduction.

### Comparison with Official Puzzles

| Aspect | Official Akari | This Implementation |
|--------|----------------|---------------------|
| Solvable | Always | Not guaranteed |
| Unique solution | Always | Not guaranteed |
| Logic only | Yes | May require guessing |
| Crafted design | Hand-designed | Random |

## Recommendations

To match official puzzle standards:
- Implement a solver to verify puzzles are solvable
- Check for unique solutions
- Reject impossible number assignments
- Consider using curated puzzle sets

## Sources

- [Light Up - Wikipedia](https://en.wikipedia.org/wiki/Light_Up_(puzzle))
- [Akari - Nikoli Official](https://www.nikoli.co.jp/en/puzzles/akari/)
- [Puzzle-Light-Up.com](https://www.puzzle-light-up.com/)
