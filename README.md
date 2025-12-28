# Hjernespil

A collection of browser-based puzzles and brain games. All games are touch-friendly and work great on mobile devices.

This is a family project made just for fun - built 100% with [Claude Code](https://claude.com/product/claude-code)!

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
- Helps improve the games

### Statistics & Tracking
- Anonymous tracking of game starts and completions
- Monthly leaderboard for wins
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
└── XX-game-name/           # Game folders (01-14)
    ├── index.html          # Game page
    ├── style.css           # Game-specific styles
    └── script.js           # Game logic
```

## API

Backend API for tracking and leaderboards:

**Base URL:** `https://puzzlesapi.azurewebsites.net`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/event` | Record game start/completion |
| POST | `/api/feedback` | Submit feedback |
| POST | `/api/win` | Record win to leaderboard |
| GET | `/api/leaderboard` | Get top players |
| GET | `/api/usage` | Get usage statistics |
| GET | `/api/today` | Get today's activity |
| GET | `/api/feedback/stats` | Get feedback statistics |

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
