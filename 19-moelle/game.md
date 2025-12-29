# Mølle (Nine Men's Morris)

## Official Rules

### Setup
- Board with 24 points arranged in 3 concentric squares
- Squares connected by lines at midpoints
- Each player has 9 pieces
- Board starts empty

### Three Phases

#### Phase 1 - Placement
- Players alternate placing one piece at a time on any empty point
- When a "mill" (3 pieces in a row along a line) is formed, remove one opponent's piece
- Cannot remove a piece in a mill if non-mill pieces are available

#### Phase 2 - Movement
- After all 18 pieces are placed, players move pieces to adjacent connected points
- Mills can still be formed and opponent pieces captured
- A mill can be "broken" and re-formed to capture again

#### Phase 3 - Flying (Optional Rule)
- When reduced to 3 pieces, a player may "fly" (move to any empty point)

### Winning
- Reduce opponent to 2 pieces, OR
- Block opponent so they cannot move

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| 24-point board | Correct | 3 concentric squares |
| Correct adjacency | Correct | All connections defined |
| 9 pieces per player | Correct | |
| Phase 1 (placement) | Correct | |
| Phase 2 (movement) | Correct | To adjacent points |
| Phase 3 (flying) | Correct | At 3 pieces |
| Mill detection | Correct | All 16 mills defined |
| Capture on mill | Correct | |
| Protect mill pieces | Correct | Remove non-mill first |
| All-in-mill exception | Correct | Can remove any when all in mills |
| Win: < 3 pieces | Correct | After placement phase |
| Win: no moves | Correct | |
| AI opponent | Correct | Minimax |
| Difficulty levels | Correct | Easy, Medium, Hard |
| Phase indicator | Partial | Shows 1 and 2, not 3 |
| Draw detection | Missing | No repetition check |

## Deviations from Standard Rules

1. **No draw by repetition**: The game doesn't detect repeated board positions (threefold repetition draw).

2. **Phase 3 not indicated**: When a player is flying (3 pieces), the UI doesn't explicitly show this.

3. **AI opponent only**: No two-player mode.

## Mill Positions

The game correctly defines all 16 possible mills:
- 6 horizontal mills (2 per ring)
- 6 vertical mills (2 per ring)
- 4 connecting mills (midpoint lines)

## Sources

- [Nine Men's Morris - Wikipedia](https://en.wikipedia.org/wiki/Nine_men's_morris)
- [Nine Men's Morris Rules - Masters of Games](https://www.mastersofgames.com/rules/morris-rules.htm)
- [Nine Men's Morris - Britannica](https://www.britannica.com/topic/Nine-Mens-Morris)
