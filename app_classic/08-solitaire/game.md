# Klondike Solitaire

## Official Rules

### Setup
- 28 cards dealt into 7 tableau piles (1, 2, 3, 4, 5, 6, 7 cards)
- Top card of each pile is face-up; rest are face-down
- Remaining 24 cards form the stock pile
- 4 empty foundation piles

### Tableau Rules
- Cards placed on cards one rank higher of opposite color (e.g., red 5 on black 6)
- Multiple face-up cards can be moved as a unit
- When face-down card is exposed, it's turned face-up
- Empty columns can only be filled with Kings

### Foundation Rules
- Start with Ace, build up in sequence (A, 2, 3... K)
- Must be same suit throughout
- Any foundation can start with any suit's Ace

### Stock/Waste
- Draw 3 cards at a time (classic) or 1 card (variant)
- Only top card of waste is playable
- Limited redeals (varies by ruleset)

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| 7 tableau piles | Correct | Correct card distribution |
| Face-up top cards | Correct | Rest face-down |
| 4 foundation piles | Correct | |
| Build A through K | Correct | |
| Opposite color on tableau | Correct | |
| Descending rank | Correct | |
| Move multiple cards | Correct | As a unit |
| Flip exposed cards | Correct | |
| Kings fill empty columns | Correct | |
| Stock to waste | Correct | |
| Recycle waste | Correct | Unlimited |
| Move from foundation | Correct | Can move cards back |
| Draw count | Variant | Draw 1 (not classic 3) |
| Redeal limit | Variant | Unlimited redeals |
| Scoring | Missing | No point system |
| Undo | Missing | No undo feature |

## Deviations from Standard Rules

1. **Draw 1 instead of Draw 3**: The implementation draws 1 card at a time instead of the classic 3-card draw. This is a valid and popular variant.

2. **Unlimited redeals**: Can cycle through the stock indefinitely. Classic rules often limit to 2-3 redeals.

3. **Fixed foundation suit positions**: Each foundation slot accepts a specific suit based on position, rather than any foundation accepting any Ace. This is a minor deviation.

4. **Themed suits**: Uses emoji suits (flower, wave, fire, clover) instead of standard Hearts, Spades, Diamonds, Clubs. Functionally equivalent.

5. **No scoring**: Classic Klondike often includes points for moves and time bonuses.

## Sources

- [Klondike - Bicycle Cards](https://bicyclecards.com/how-to-play/klondike)
- [Klondike Solitaire - Wikipedia](https://en.wikipedia.org/wiki/Klondike_(solitaire))
- [BVS Solitaire - Klondike Rules](https://www.bvssolitaire.com/rules/klondike.htm)
