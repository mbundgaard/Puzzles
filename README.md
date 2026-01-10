# Brain Games

A collection of browser-based puzzles and brain games. All games are touch-friendly and work great on mobile devices.

This is a family project made just for fun - built with [Claude Code](https://claude.com/product/claude-code)!

**Play now:** [mbundgaard.github.io/Puzzles/](https://mbundgaard.github.io/Puzzles/)

## Games

| # | Game | Points | Created | Updated | Description |
|---|------|--------|---------|---------|-------------|
| 01 | Reversi | 3 | 2025-12-28 | | Classic strategy game - capture opponent pieces by surrounding them |
| 02 | Telte og Træer | 3 | 2025-12-28 | 2026-01-10 | Logic puzzle - place tents next to trees without touching |
| 03 | Sudoku | 3 | 2025-12-28 | 2026-01-10 | Fill the grid so each row, column, and box contains 1-9 |
| 05 | 2048 | 3 | 2025-12-28 | 2026-01-10 | Slide and merge tiles to reach 2048 |
| 06 | Minestryger | 3 | 2025-12-28 | | Find all safe cells without hitting a mine |
| 07 | Hukommelse | 3 | 2025-12-28 | | Match pairs of cards by remembering their positions |
| 08 | Kabale | 3 | 2025-12-28 | | Classic card game - move all cards to the foundations |
| 09 | Kalaha | 3 | 2025-12-28 | | Ancient strategy game - capture more stones than the AI |
| 10 | Ordleg | 1/3/5 | 2025-12-28 | 2026-01-08 | Guess the 5-letter Danish word in 6 tries |
| 11 | Kryds og Bolle | 1 | 2025-12-28 | | Tic-tac-toe against an AI opponent |
| 12 | Rørføring | 1/2/3 | 2025-12-28 | 2025-12-30 | Place pipes to connect start to end |
| 13 | Skubbepuslespil | 3 | 2025-12-28 | | Slide tiles to arrange numbers 1-15 in order |
| 14 | Mastermind | 3 | 2025-12-28 | | Crack the secret color code |
| 17 | Pind | 3 | 2025-12-29 | | Peg solitaire - leave only one peg standing |
| 18 | Dam | 3 | 2025-12-29 | | Checkers against AI with forced captures |
| 19 | Mølle | 3 | 2025-12-29 | | Nine Men's Morris - form mills to capture pieces |
| 21 | Fire på Stribe | 3 | 2025-12-29 | | Connect four in a row against AI |
| 22 | Tårnet i Hanoi | 3 | 2025-12-30 | | Move all disks to the rightmost peg |
| 23 | Slange | 2/3/4 | 2025-12-30 | | Classic snake game with win condition |
| 24 | Tangram | 1/3/5 | 2025-12-30 | 2026-01-06 | Drag and rotate pieces to cover the shape |
| 25 | Sænke Slagskibe | 3/4/5 | 2025-12-31 | 2026-01-10 | Multiplayer battleship - play against a friend! |
| 26 | Gæt Dyret | 1/3/5 | 2026-01-02 | 2026-01-03 | Guess the animal by asking yes/no questions |
| 27 | Ordsøgning | 1/3/5 | 2026-01-03 | 2026-01-10 | Find hidden words in the grid - AI generated puzzles |
| 28 | Labyrint | 3 | 2026-01-05 | | Navigate through a maze with fog of war |
| 29 | Maskeværk | 3 | 2026-01-09 | | Read the AI-generated knitting pattern and fill the grid correctly |

## Features

### Progressive Web App (PWA)
- Install as an app on phone or tablet
- Works offline (after first visit)
- Add to home screen on iOS and Android
- Auto-update detection with prompt banner

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
- **SvelteKit 2** - Modern web framework with static site generation
- **Svelte 5** - Reactive UI with runes
- **TypeScript** - Type-safe code
- **Multi-language** - Danish, English, and French (i18n)
- **Poppins font** - Modern, readable typography
- **Dark theme** - Dark background (#0f0f23) with colorful accents
- **Glassmorphism** - Modern UI with blur and transparency
- **Responsive design** - Mobile-first, adapts to all screen sizes

### Backend
- **Azure Functions** - Serverless API endpoints
- **Azure Table Storage** - Simple, scalable database
- **Azure OpenAI** - AI-generated content for some games (10, 26, 27)
- **C# .NET 8** - Modern, type-safe code

### Hosting
- **GitHub Pages** - Free, reliable frontend hosting
- **Azure** - Backend API hosting

## Project Structure

```
├── app/                        # SvelteKit frontend
│   ├── src/
│   │   ├── routes/             # Pages (home, settings, games, etc.)
│   │   ├── lib/
│   │   │   ├── components/     # Shared UI components
│   │   │   ├── games/          # Game components (each with own i18n/)
│   │   │   ├── i18n/           # App translations (da, en, fr)
│   │   │   └── stores/         # Svelte stores
│   │   ├── app.html            # HTML template
│   │   └── app.css             # Global styles
│   ├── static/                 # Static assets (icons, manifest)
│   ├── svelte.config.js        # SvelteKit config (static adapter)
│   └── package.json
├── api/                        # Azure Functions backend
│   ├── Functions/
│   │   ├── Core/               # Core endpoints (feedback, leaderboard, etc.)
│   │   └── Games/              # Game-specific endpoints (AI-powered games)
│   ├── Models/                 # Data models
│   ├── Services/               # Services (IAIService, IGitHubService, etc.)
│   ├── Storage/                # Azure Table Storage implementations
│   └── Program.cs              # DI and startup
└── docs/                       # Documentation
```

## API

Backend API for tracking and leaderboards.

**Base URL:** `https://puzzlesapi.azurewebsites.net`

See [CLAUDE.md](CLAUDE.md) for complete API documentation and development guidelines.

## Development

### Getting Started

```bash
cd app
npm install
npm run dev
```

### Building for Production

```bash
npm run build
npm run preview  # Test the build locally
```

### Adding a New Game

1. Create game folder in `app/src/lib/games/[game-name]/`
2. Add game component and game-specific translations (`i18n/da.json`, etc.)
3. Add game title/description to app translations (`app/src/lib/i18n/`)
4. Register game in `app/src/lib/games/registry.ts`
5. Follow guidelines in [CLAUDE.md](CLAUDE.md)

## Built with Claude Code

This project is built with [Claude Code](https://claude.com/product/claude-code) - Anthropic's AI assistant for software development. Everything from game logic, UI design, API endpoints to deployment was created through conversations with Claude.

**Fun fact:** The concept and first version was built entirely on a mobile phone using only the Claude app and the GitHub app. The conversation started with: *"I'm wondering if I can build an app using my phone"* - and here we are!

## License

MIT License - use it however you like!
