# Puslespil & Tankespil

En samling af klassiske puslespil og tankespil, der kan spilles i browseren.

## Puslespil

| # | Navn | Beskrivelse |
|---|------|-------------|
| 01 | [Reversi](01-reversi/) | Klassisk strategispil mod en AI-modstander. Erob brikker ved at omringe dem. Understøtter 6×6, 8×8 og 10×10 brætter. |
| 02 | [Telte og Træer](02-tents-and-trees/) | Logikpuslespil: placér telte ved siden af træer. Hvert telt hører til ét træ, og telte må ikke røre hinanden. |

## Spil Online

Besøg [live-siden](https://mbundgaard.github.io/Puzzles/) for at spille.

## Lokal Udvikling

Ingen build-trin nødvendigt. Åbn blot `index.html` i en browser eller brug en statisk fil-server:

```bash
npx serve .
```

## Struktur

```
├── index.html          # Hovedside med puslespil-oversigt
├── 01-reversi/         # Hvert puslespil i nummereret mappe
│   ├── index.html
│   ├── style.css
│   └── game.js
└── 02-tents-and-trees/
    ├── index.html
    ├── style.css
    └── script.js
```
