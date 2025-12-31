# Hjernespil

A collection of browser-based puzzles and brain games. All games are touch-friendly and work great on mobile devices.

This is a family project made just for fun - built 100% with [Claude Code](https://claude.com/product/claude-code)!

## Games

| # | Game | Points | Created | Updated | Description |
|---|------|--------|---------|---------|-------------|
| 01 | [Reversi](01-reversi/) | 3 | 2025-12-28 | | Classic strategy game - capture opponent pieces by surrounding them |
| 02 | [Telte og Træer](02-tents-and-trees/) | 3 | 2025-12-28 | | Logic puzzle - place tents next to trees without touching |
| 03 | [Sudoku](03-sudoku/) | 3 | 2025-12-28 | | Fill the grid so each row, column, and box contains 1-9 |
| 04 | [Nonogram](04-nonogram/) | 3 | 2025-12-28 | | Reveal the hidden picture using number clues |
| 05 | [2048](05-2048/) | 3 | 2025-12-28 | | Slide and merge tiles to reach 2048 |
| 06 | [Minestryger](06-minesweeper/) | 3 | 2025-12-28 | | Find all safe cells without hitting a mine |
| 07 | [Hukommelse](07-memory/) | 3 | 2025-12-28 | | Match pairs of cards by remembering their positions |
| 08 | [Kabale](08-solitaire/) | 3 | 2025-12-28 | | Classic card game - move all cards to the foundations |
| 09 | [Kalaha](09-kalaha/) | 3 | 2025-12-28 | | Ancient strategy game - capture more stones than the AI |
| 10 | [Ordleg](10-ordleg/) | 1/3/5 | 2025-12-28 | 2025-12-31 | Guess the 5-letter Danish word in 6 tries |
| 11 | [Kryds og Bolle](11-kryds-og-bolle/) | 1 | 2025-12-28 | | Tic-tac-toe against an AI opponent |
| 12 | [Rørføring](12-roerfoering/) | 1/2/3 | 2025-12-28 | 2025-12-30 | Place pipes to connect start to end |
| 13 | [15-Puslespil](13-femten-puslespil/) | 3 | 2025-12-28 | | Slide tiles to arrange numbers 1-15 in order |
| 14 | [Mastermind](14-kodeknaekker/) | 3 | 2025-12-28 | | Crack the secret color code |
| 15 | [Broer](15-broer/) | 3 | 2025-12-29 | | Connect islands with the correct number of bridges |
| 16 | [Lys Op](16-lys-op/) | 3 | 2025-12-29 | | Place light bulbs to illuminate all cells |
| 17 | [Pind](17-pind/) | 3 | 2025-12-29 | | Peg solitaire - leave only one peg standing |
| 18 | [Dam](18-dam/) | 3 | 2025-12-29 | | Checkers against AI with forced captures |
| 19 | [Mølle](19-moelle/) | 3 | 2025-12-29 | | Nine Men's Morris - form mills to capture pieces |
| 20 | [Slitherlink](20-slitherlink/) | 3 | 2025-12-29 | | Draw a loop following number clues |
| 21 | [Fire på Stribe](21-fire-paa-stribe/) | 3 | 2025-12-29 | | Connect four in a row against AI |
| 22 | [Tårnet i Hanoi](22-hanoi/) | 3 | 2025-12-30 | | Move all disks to the rightmost peg |
| 23 | [Slange](23-slange/) | 2/3/4 | 2025-12-30 | | Classic snake game with win condition |
| 24 | [Tangram](24-tangram/) | 1/3/5 | 2025-12-30 | | Drag and rotate pieces to cover the shape |
| 25 | [Sænke Slagskibe](25-saenke-slagskibe/) | 2 | 2025-12-31 | 2025-12-31 | Find hidden ships on the grid - like a newspaper puzzle |

## Features

### Progressive Web App (PWA)
- Install as an app on phone or tablet
- Works offline (after first visit)
- Add to home screen on iOS and Android

### Touch-First Design
- Designed for mobile first, also works on desktop
- Large tap targets (min 44x44 pixels)
- No right-click or keyboard required
- Visual feedback on touch

### Feedback System
- Rate each game with stars (1-5)
- Optional comment and nickname
- "Foreslå Spil" card to suggest new games
- Helps improve the games

### First Visit Info
- Info modal shows automatically on first visit
- Explains points system and features
- Saved to localStorage so it only shows once

### Statistics & Tracking
- Anonymous tracking of game starts and completions
- Monthly leaderboard with points (1-5 points per win depending on game/difficulty)
- API for fetching statistics

## Technology

### Frontend
- **HTML/CSS/JavaScript** - Vanilla, no frameworks
- **Poppins font** - Modern, readable typography
- **Dark theme** - Dark background (#0f0f23) with colorful accents
- **Glassmorphism** - Modern UI with blur and transparency
- **Responsive design** - Adapts to all screen sizes

### Backend
- **Azure Functions** - Serverless API endpoints
- **Azure Table Storage** - Simple, scalable database
- **C# .NET 8** - Modern, type-safe code

### Hosting
- **GitHub Pages** - Free, reliable frontend hosting
- **Azure** - Backend API hosting

## Project Structure

```
├── index.html              # Main page with game overview
├── manifest.json           # PWA manifest
├── shared/
│   ├── api.js              # Shared API client (HjernespilAPI)
│   └── ui.js               # Shared UI components (feedback button)
├── api/                    # Azure Functions backend
│   ├── Functions/          # HTTP endpoints
│   ├── Models/             # Data models
│   ├── Storage/            # Azure Table Storage implementations
│   └── Program.cs          # DI and startup
├── icons/                  # App icons (16px to 512px)
└── XX-game-name/           # Game folders (01-22)
    ├── index.html          # Game page
    ├── style.css           # Game-specific styles
    └── script.js           # Game logic
```

## API

Backend API for tracking and leaderboards.

**Base URL:** `https://puzzlesapi.azurewebsites.net`

See [CLAUDE.md](CLAUDE.md) for complete API documentation and development guidelines.

## Development

### Adding a New Game

1. Create folder `XX-game-name/` with next available number
2. Implement with `index.html`, `style.css`, `script.js`
3. Include `shared/api.js` and `shared/ui.js`
4. Add to main page `index.html`
5. Follow guidelines in [CLAUDE.md](CLAUDE.md)

## Built with Claude Code

This entire project was built 100% with [Claude Code](https://claude.com/product/claude-code) - Anthropic's AI assistant for software development. Everything from game logic, UI design, API endpoints to deployment was created through conversations with Claude.

**Fun fact:** The concept and first version was built entirely on a mobile phone using the Claude app and the GitHub app. The conversation started with: *"I'm wondering if I can build an app using my phone only"* - and here we are!

## License

MIT License - use it however you like!
