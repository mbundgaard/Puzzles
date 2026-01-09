# Tangram Shape Definition Guide

This guide explains how to create new shapes for the Tangram game.

## How the Game Works

1. A **target shape** is displayed as an outline
2. The player drags and rotates **pieces** to cover the target
3. Tap a piece to rotate it 45° (8 possible orientations)
4. Win condition: 95%+ of the target shape is covered by pieces
5. Pieces can overlap - only coverage of the target matters

## JSON Structure

```json
{
  "id": "unique-id",
  "name": "Display Name",
  "description": "Short Danish description",
  "difficulty": "easy|medium|hard",
  "points": 2,
  "targetShape": {
    "points": [[x1,y1], [x2,y2], ...],
    "width": 200,
    "height": 200
  },
  "pieces": [
    {
      "id": "p1",
      "description": "Optional description",
      "color": "#ef4444",
      "points": [[x1,y1], [x2,y2], ...]
    }
  ]
}
```

## Field Descriptions

### Root Fields
- **id**: Unique identifier, lowercase with hyphens (e.g., "t-shape", "arrow")
- **name**: Display name shown in puzzle selector (Danish)
- **description**: Short description (Danish, max ~30 chars)
- **difficulty**: "easy", "medium", or "hard"
- **points**: Points awarded on completion (2=easy, 3=medium, 4=hard)

### targetShape
- **points**: Array of [x, y] coordinates defining the polygon vertices
- **width**: Bounding box width
- **height**: Bounding box height

**The target shape can be any polygon** - squares, rectangles, T-shapes, arrows, stars, letters, or any other closed shape. It does not need to be a square.

### pieces
Each piece needs:
- **id**: Unique within the shape (e.g., "p1", "p2")
- **description**: Optional text describing the piece
- **color**: Hex color code - use distinct, vibrant colors
- **points**: Array of [x, y] coordinates defining the piece polygon

## Coordinate System

- Origin (0, 0) is top-left
- X increases to the right
- Y increases downward
- Use integer values for cleaner rendering

### Key Concept: Solution-Based Coordinates

**Piece coordinates are defined as they appear in the solved puzzle.**

When designing a puzzle:
1. Draw the complete solution with all pieces in place
2. Read off each piece's vertex coordinates from the solution
3. The game will scatter the pieces at start; the player must reassemble them

This makes puzzle creation straightforward - just trace the solution!

## Shape Size

**Target size: ~200x200 units** (can be any aspect ratio)

This size works well because:
- Large enough for comfortable touch interaction on mobile
- Fits nicely in the play area with padding
- Pieces are easy to grab and manipulate

Keep shapes between **150-250 units** in each dimension.

## Design Rules

### Critical: Pieces Must Exactly Fill Target
The total area of all pieces must equal the target shape area exactly. The pieces should tile perfectly to cover the target with no gaps or overlaps when solved correctly.

### Good Piece Colors
Use these distinct, vibrant colors:
- Red: `#ef4444`
- Green: `#22c55e`
- Blue: `#3b82f6`
- Orange: `#f59e0b`
- Purple: `#a855f7`
- Cyan: `#06b6d4`
- Pink: `#ec4899`

### Difficulty Guidelines
- **Easy** (2 pts): 3-4 simple pieces, obvious solution
- **Medium** (3 pts): 4-5 pieces, some rotation required
- **Hard** (4 pts): 5+ pieces, multiple rotations, non-obvious fit

## Example: Fem Dele (Five Pieces)

This puzzle has 5 pieces that fill a 200x200 square. Here's the solution layout:

```
    0       75      125 150     200
    +--------+-------+---+-------+
  0 |   P1   |      P2   |       |
    |  (red) +---+-------+ P5    |
 50 |        |   |       |(purple)
    +        |   +-------+       |
 75 +--------+   |               |
    |            |               |
    |     P4     |               |
125 |   (blue)   +---------------+
    |            |               |
150 +---+--------+               |
    |P3 |                        |
    |(cy|                        |
200 +---+------------------------+
    0  50
```

Key intersection points:
- (75, 75) - where P1, P2, and P4 meet
- (125, 125) - where P2, P4, and P5 meet
- (150, 0) - top edge where P1 and P2 meet
- (200, 50) - right edge where P2 and P5 meet

```json
{
  "id": "fem-dele",
  "name": "Fem Dele",
  "description": "Saml fem dele til en firkant",
  "difficulty": "hard",
  "points": 4,
  "targetShape": {
    "points": [[0,0], [200,0], [200,200], [0,200]],
    "width": 200,
    "height": 200
  },
  "pieces": [
    {
      "id": "p1",
      "description": "Left quadrilateral",
      "color": "#ef4444",
      "points": [[0,0], [150,0], [75,75], [0,150]]
    },
    {
      "id": "p2",
      "description": "Top-right pentagon",
      "color": "#22c55e",
      "points": [[75,75], [150,0], [200,0], [200,50], [125,125]]
    },
    {
      "id": "p3",
      "description": "Bottom-left square",
      "color": "#06b6d4",
      "points": [[0,150], [50,150], [50,200], [0,200]]
    },
    {
      "id": "p4",
      "description": "Central hexagon",
      "color": "#3b82f6",
      "points": [[0,150], [75,75], [125,125], [200,200], [50,200], [50,150]]
    },
    {
      "id": "p5",
      "description": "Right triangle",
      "color": "#a855f7",
      "points": [[125,125], [200,50], [200,200]]
    }
  ]
}
```

Notice how each piece's coordinates match its position in the solved puzzle:
- P1 starts at (0,0) because it's in the top-left corner
- P3 is at (0,150) to (50,200) because it's the small square in the bottom-left
- P5 fills the right side from (125,125) to (200,200)

## Target Shape Examples

The target doesn't have to be a square. Here are some ideas:

**T-Shape:**
```json
"points": [[0,0], [200,0], [200,67], [133,67], [133,200], [67,200], [67,67], [0,67]]
```

**Arrow pointing right:**
```json
"points": [[0,50], [150,50], [150,0], [200,100], [150,200], [150,150], [0,150]]
```

**House silhouette:**
```json
"points": [[100,0], [200,80], [200,200], [0,200], [0,80]]
```

## Adding a New Shape

1. Create a new `.json` file in the `shapes/` folder
2. Add the filename to the `puzzleFiles` array in `script.js`:
   ```javascript
   this.puzzleFiles = ['t-puslespil.json', 'fem-dele.json', 'your-new-shape.json'];
   ```
3. Test that pieces can cover the target exactly
