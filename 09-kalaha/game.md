# Kalaha (Mancala)

## Official Rules (Standard Kalah)

### Setup
- Board with 6 pits (houses) on each side
- Large store (Kalah) at each end
- Each pit starts with 4 stones

### Standard Gameplay (Single-lap sowing)
1. Pick up all stones from one of your pits
2. Sow counter-clockwise, dropping one stone per pit
3. Include your own store but skip opponent's store
4. **Extra Turn**: If last stone lands in your store, take another turn
5. **Capture**: If last stone lands in an empty pit on your side, capture that stone AND all stones in the opposite pit

### Game End
- Game ends when one side is empty
- Remaining stones go to that player's opponent
- Most stones wins

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| 6 pits per side | Correct | |
| Stores at ends | Correct | |
| 4 stones per pit | Correct | |
| Skip opponent's store | Correct | |
| Extra turn rule | Correct | Land in own store |
| Capture rule | Correct | Empty pit on own side |
| Game end | Correct | Collects remaining stones |
| Sowing method | **Variant** | Uses relay/chain sowing |

## Deviations from Standard Rules

### Major Deviation: Relay Sowing

The implementation uses **relay sowing** (also called "Seed On" or chain sowing) instead of standard single-lap sowing:

**Standard Kalah**:
- Pick up stones, distribute one per pit, turn ends where last stone lands

**This Implementation**:
- If last stone lands in a non-empty pit (that now has >1 stone), pick up ALL stones from that pit and continue sowing
- Turn only ends when landing in an empty pit OR a store

This is a significant strategic difference. Relay sowing is from a different Mancala variant tradition and creates longer, more cascading turns.

## Known Issues

- The game description may confuse players expecting standard Kalah rules
- No option to switch between sowing variants

## Sources

- [Kalah - Wikipedia](https://en.wikipedia.org/wiki/Kalah)
- [Kalah - Gambiter](https://gambiter.com/mancala/Kalah.html)
- [Masters of Games - Mancala Rules](https://www.mastersofgames.com/rules/mancala-rules.htm)
