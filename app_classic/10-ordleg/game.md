# Ordleg (Wordle-style Danish Word Game)

## Official Wordle Rules

### Gameplay
1. Guess a 5-letter word within 6 attempts
2. After each guess, tiles change color:
   - **Green**: Letter is correct and in correct position
   - **Yellow**: Letter is in word but wrong position
   - **Gray**: Letter is not in the word

### Standard Features
- Only valid dictionary words can be guessed
- One puzzle per day (same word for everyone)
- Streak tracking for consecutive wins

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| 5-letter words | Correct | Danish words |
| 6 guesses maximum | Correct | |
| Color feedback | Correct | Green, yellow, gray |
| Two-pass algorithm | Correct | Exact matches first, then present |
| Keyboard updates | Correct | Shows letter states |
| Win/loss detection | Correct | |
| Danish keyboard | Correct | Includes æ, ø, å |
| Word validation | Missing | Any 5 letters accepted |
| Daily puzzle | Missing | Random word each game |
| Streak tracking | Missing | |
| Statistics | Missing | No guess distribution |
| Hard mode | Missing | |
| Share feature | Missing | No emoji result grid |

## Deviations from Standard Rules

1. **No word validation**: Players can enter any 5 letters, even if not a valid Danish word. Official Wordle rejects invalid words.

2. **Random instead of daily**: Each game uses a random word. Official Wordle has one puzzle per day that everyone shares.

3. **No statistics**: Doesn't track win percentage, guess distribution, or streaks.

4. **Limited word list**: Uses approximately 500 Danish 5-letter words.

## Known Issues

- Players can "guess" non-words (e.g., "aaaaa")
- No shared experience of a daily puzzle
- No way to compare results with friends

## Sources

- [How to Play Wordle - Official Rules](https://officialgamerules.org/game-rules/wordle/)
- [What is Wordle - Tom's Guide](https://www.tomsguide.com/news/what-is-wordle)
