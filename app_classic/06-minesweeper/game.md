# Minesweeper

## Official Rules

### Setup
- Grid with hidden mines
- Standard difficulties: Beginner (9x9, 10 mines), Intermediate (16x16, 40 mines), Expert (30x16, 99 mines)

### Gameplay
- Left-click to reveal a cell
- Right-click to flag/unflag a cell as a mine
- Numbers show count of adjacent mines (including diagonals)
- Clicking a cell with 0 adjacent mines auto-reveals all adjacent cells
- First click is always safe (guaranteed not to be a mine)

### Special Features
- **Chording**: Clicking a revealed number when all adjacent mines are flagged auto-reveals remaining adjacent cells
- **Mine counter**: Shows total mines minus flagged cells

### Winning/Losing
- Win: Reveal all non-mine cells
- Lose: Click on a mine

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Grid with mines | Correct | |
| Numbers (adjacent count) | Correct | All 8 directions |
| First click safety | Correct | Mine placement excludes first click |
| Auto-reveal (0 cells) | Correct | Recursive reveal |
| Flagging | Correct | Toggle on tap/click |
| Mine counter | Correct | Updates with flags |
| Win detection | Correct | All non-mines revealed |
| Lose on mine | Correct | Shows all mines |
| Chording | Missing | Not implemented |
| Question mark state | Missing | Only flag/unflag |
| Timer | Missing | No speedrun timer |

### Difficulty Levels (Implementation vs Standard)

| Difficulty | Implementation | Standard Windows |
|------------|----------------|------------------|
| Easy | 8x8, 10 mines | 9x9, 10 mines |
| Medium | 10x10, 20 mines | 16x16, 40 mines |
| Hard | 12x12, 35 mines | 30x16, 99 mines |

## Deviations from Standard Rules

1. **Smaller grids**: Medium and Hard use smaller grids than classic Minesweeper (intentional for mobile-friendly play).

2. **No chording**: The technique of clicking a number to auto-reveal safe neighbors when all adjacent mines are flagged is not implemented.

3. **No timer**: Classic Minesweeper includes a timer for speedrunning.

4. **Limited first-click protection**: Only the exact clicked cell is protected. Some versions protect the entire 3x3 area.

## Sources

- [Minesweeper Game - How to Play](https://minesweepergame.com/strategy/how-to-play-minesweeper.php)
- [Minesweeper - Wikipedia](https://en.wikipedia.org/wiki/Minesweeper_(video_game))
- [1000 Mines - How to Play](https://www.1000mines.com/how-to-play)
