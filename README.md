# Tænkeren

En samling af klassiske puslespil og tankespil til browseren. Alle spil er designet til at fungere på mobil med touch-only input.

## Spil

| # | Navn | Beskrivelse |
|---|------|-------------|
| 01 | [Reversi](01-reversi/) | Strategispil mod AI. Erobr brikker ved at omringe dem. |
| 02 | [Telte og Træer](02-tents-and-trees/) | Logikpuslespil. Placér telte ved træer uden de rører hinanden. |

## Spil Online

**[https://mbundgaard.github.io/Puzzles/](https://mbundgaard.github.io/Puzzles/)**

## Lokal Udvikling

Ingen build nødvendigt:

```bash
npx serve .
```

## Struktur

```
├── index.html              # Hovedside
├── apple-touch-icon.png    # App-ikon til iOS
├── 01-reversi/
└── 02-tents-and-trees/
```
