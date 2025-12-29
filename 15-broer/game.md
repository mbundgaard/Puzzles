# Broer (Hashiwokakero / Bridges)

## Official Rules

### Setup
- Grid with numbered circles (islands) containing values 1-8
- Numbers indicate how many bridges must connect to that island

### Bridge Rules
1. Bridges must be straight lines (horizontal or vertical only)
2. Maximum of 2 bridges between any pair of islands
3. Bridges cannot cross other bridges
4. Bridges cannot cross islands

### Objective
Connect all islands with bridges such that:
- Each island has exactly the number of bridges indicated
- All islands form one connected group

### Properties
- Official puzzles have exactly one solution
- Solvable by logic alone

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Numbered islands (1-8) | Correct | |
| Straight bridges only | Correct | Horizontal/vertical |
| Max 2 bridges | Correct | Toggle: 0 → 1 → 2 → 0 |
| No crossing bridges | Correct | Validated |
| No crossing islands | Correct | Validated |
| Connectivity check | Correct | BFS algorithm |
| Win condition | Correct | Correct counts + connected |
| Variable grid sizes | Correct | 5x5, 7x7, 9x9 |
| Unique solution | Not guaranteed | Random generation |
| Undo feature | Missing | Cannot undo bridge placement |

## Deviations from Standard Rules

1. **No unique solution guarantee**: The puzzle generator creates valid puzzles but doesn't verify they have exactly one solution. Official Nikoli puzzles always have a unique solution.

2. **Random generation quality**: Sometimes falls back to simpler puzzles if generation fails.

3. **No undo**: Players cannot undo bridge placements, which can be frustrating.

## Puzzle Generation

The generator:
1. Places islands on a grid
2. Creates a valid solution connecting them
3. Scrambles the solution
4. Does not verify uniqueness

## Sources

- [Hashiwokakero - Wikipedia](https://en.wikipedia.org/wiki/Hashiwokakero)
- [Hashi Rules - Conceptis Puzzles](https://www.conceptispuzzles.com/index.aspx?uri=puzzle/hashi/rules)
- [Puzzle-Bridges.com](https://www.puzzle-bridges.com/)
