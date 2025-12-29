# Kodeknækker (Mastermind)

## Official Rules

### Setup
- Secret code of 4 colored pegs
- 6-8 colors available (duplicates allowed)
- Code-breaker has 10-12 attempts to guess

### Feedback System
After each guess:
- **Black peg**: Correct color in correct position
- **White peg**: Correct color in wrong position
- **No peg**: Color not in the code

### Winning
- Guess the exact code (all 4 correct colors in correct positions)

### Two-Player Mode (Original)
- One player creates the code (codemaker)
- Other player guesses (codebreaker)
- Players switch roles and compare scores

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| 4-peg code | Correct | |
| 6 colors | Correct | Red, orange, green, cyan, purple, pink |
| Duplicates allowed | Correct | |
| 10 attempts | Correct | Standard range |
| Black hints (exact match) | Correct | |
| White hints (color only) | Correct | |
| Feedback algorithm | Correct | No double-counting |
| Secret reveal on game over | Correct | |
| Two-player mode | Missing | Single player only |
| Scoring system | Missing | No points tracked |
| No-duplicates option | Missing | Always allows duplicates |

## Deviations from Standard Rules

1. **Single player only**: The implementation is against a computer-generated code. The two-player codemaker/codebreaker role-switching is not available.

2. **No scoring**: Official Mastermind includes point scoring based on number of guesses used. Not implemented here.

3. **No difficulty options**: Cannot disable duplicate colors or change code length.

## Algorithm Verification

The feedback algorithm correctly:
1. First finds exact matches (black hints)
2. Marks matched positions to prevent double-counting
3. Then finds color-only matches (white hints)
4. This matches the official Mastermind scoring rules

## Sources

- [Mastermind Official Rules - Hasbro](https://instructions.hasbro.com/en-in/instruction/mastermind)
- [Mastermind - Wikipedia](https://en.wikipedia.org/wiki/Mastermind_(board_game))
- [Mastermind Rules - UltraBoardGames](https://www.ultraboardgames.com/mastermind/game-rules.php)
