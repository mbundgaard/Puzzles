# The Thinker

A collection of classic puzzles and brain games for the browser. All games are designed to work on mobile with touch-only input.

## Games

### 01 - [Reversi](01-reversi/)

Classic strategy board game against an AI opponent. You play as black, the AI plays as white. Capture your opponent's pieces by surrounding them horizontally, vertically, or diagonally. The player with the most pieces at the end wins.

**Features:**
- AI opponent using Minimax algorithm with alpha-beta pruning
- Configurable board sizes: 6×6, 8×8, or 10×10
- Animated piece flipping
- Valid move highlighting

### 02 - [Tents and Trees](02-tents-and-trees/)

Logic puzzle where you place tents on a grid. Each tent must be orthogonally adjacent (up/down/left/right) to exactly one tree, and each tree has exactly one paired tent. Tents cannot touch each other, not even diagonally. Use the row and column clues to determine where tents should be placed.

**Features:**
- Randomly generated 8×8 puzzles
- Two placement modes: Tent and Mark (to mark empty cells)
- Visual feedback for correct/exceeded clue counts
- Invalid placement highlighting

## Play Online

**[https://mbundgaard.github.io/Puzzles/](https://mbundgaard.github.io/Puzzles/)**

## Local Development

No build required:

```bash
npx serve .
```

## Structure

```
├── index.html              # Main page
├── icons/                  # App icons (various sizes)
├── 01-reversi/
└── 02-tents-and-trees/
```
