# Puzzles & Mind Games

A collection of classic puzzles and mind games, playable in the browser.

## Puzzles

| # | Name | Description |
|---|------|-------------|
| 01 | [Reversi](01-reversi/) | Classic strategy game against an AI opponent. Capture pieces by flanking. Supports 6×6, 8×8, and 10×10 boards. |
| 02 | [Tents and Trees](02-tents-and-trees/) | Logic puzzle: place tents next to trees. Each tent pairs with one tree, tents can't touch. Use row/column clues. |

## Play Online

Visit the [live site](https://mbundgaard.github.io/Puzzles/) to play.

## Local Development

No build step required. Simply open `index.html` in a browser or serve with any static file server:

```bash
npx serve .
```

## Structure

```
├── index.html          # Main puzzle index
├── 01-reversi/         # Each puzzle in numbered folder
│   ├── index.html
│   ├── style.css
│   └── game.js
└── 02-tents-and-trees/
    ├── index.html
    ├── style.css
    └── script.js
```
