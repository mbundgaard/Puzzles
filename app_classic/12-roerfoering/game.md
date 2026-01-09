# Rørføring (Pipe Puzzle)

## Official Rules (Pipes/Net Puzzle)

### Standard Pipes Puzzle
1. Grid of tiles with pipe segments
2. Each tile can be rotated
3. Goal: Rotate tiles so ALL pipes connect to form a single network
4. Start and end points must be connected
5. No closed loops allowed
6. All tiles must be part of the connected network
7. Each puzzle has a unique solution

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Grid of pipe tiles | Correct | |
| Rotation mechanic | Correct | Tap to rotate 90° |
| Start point | Correct | Top-left corner |
| End point | Correct | Bottom-right corner |
| Connection checking | Partial | Only checks start-to-end |
| All tiles connected | Missing | Not required |
| Closed loop detection | Missing | Not validated |
| Unique solution | Not guaranteed | Random scrambling |
| Variable grid sizes | Correct | Based on difficulty |

## Deviations from Standard Rules

### Simplified Implementation

This is a **simplified version** of the Pipes puzzle:

1. **Path-only, not network**: Only generates a single path from start to end, not a full network of interconnected pipes.

2. **Empty cells allowed**: Standard Pipes puzzles fill the entire grid. This implementation only has pipe tiles along the generated path.

3. **No "all tiles connected" requirement**: Victory condition only checks if start reaches end, not if all tiles form one network.

4. **No loop detection**: Closed loops are not checked for or prevented.

5. **Multiple solutions possible**: The scrambling method may allow multiple valid orientations.

## Game Type Clarification

The implementation is closer to a "connect the dots with rotating pipes" game rather than a true Pipes/FreeNet puzzle. This makes it simpler but deviates from the classic puzzle format.

## Sources

- [Pipes (puzzle) - Wikipedia](https://en.wikipedia.org/wiki/Pipes_(puzzle))
- [Puzzle-Pipes.com](https://www.puzzle-pipes.com/)
- [Net Puzzle - Simon Tatham's Puzzles](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/net.html)
