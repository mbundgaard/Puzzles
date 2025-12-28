# Hjernespil

A collection of browser-based puzzles and brain games. All games are touch-friendly and work great on mobile devices.

This is a family project made just for fun!

## Games

| # | Game | Description |
|---|------|-------------|
| 01 | [Reversi](01-reversi/) | Classic strategy game - capture opponent pieces by surrounding them |
| 02 | [Telte og Træer](02-tents-and-trees/) | Logic puzzle - place tents next to trees without touching |
| 03 | [Sudoku](03-sudoku/) | Fill the grid so each row, column, and box contains 1-9 |
| 04 | [Nonogram](04-nonogram/) | Reveal the hidden picture using number clues |
| 05 | [2048](05-2048/) | Slide and merge tiles to reach 2048 |
| 06 | [Minestryger](06-minesweeper/) | Find all safe cells without hitting a mine |
| 07 | [Hukommelse](07-memory/) | Match pairs of cards by remembering their positions |
| 08 | [Kabale](08-solitaire/) | Classic card game - move all cards to the foundations |
| 09 | [Kalaha](09-kalaha/) | Ancient strategy game - capture more stones than the AI |
| 10 | [Ordleg](10-ordleg/) | Guess the 5-letter Danish word in 6 tries |
| 11 | [Kryds og Bolle](11-kryds-og-bolle/) | Tic-tac-toe against an AI opponent |
| 12 | [Rørføring](12-roerfoering/) | Rotate pipes to connect start to end |
| 13 | [15-Puslespil](13-femten-puslespil/) | Slide tiles to arrange numbers 1-15 in order |
| 14 | [Kodeknækker](14-kodeknaekker/) | Mastermind - crack the secret color code |

## Play Online

**[https://mbundgaard.github.io/Puzzles/](https://mbundgaard.github.io/Puzzles/)**

## API

The games connect to a simple backend API for usage tracking and leaderboards:

- **Base URL:** `https://puzzlesapi.azurewebsites.net`
- Tracks game starts and completions
- Monthly leaderboards for wins
- Built with Azure Functions and Table Storage

See [CLAUDE.md](CLAUDE.md) for full API documentation.

## Structure

```
├── index.html              # Main page
├── shared/
│   └── api.js              # Shared API client
├── api/                    # Azure Functions backend
├── icons/                  # App icons
└── XX-game-name/           # Game folders (01-14)
    ├── index.html
    ├── style.css
    └── script.js
```
