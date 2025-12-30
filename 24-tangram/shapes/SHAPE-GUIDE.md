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
- **points**: Array of [x, y] coordinates defining the polygon vertices, clockwise order
- **width**: Bounding box width (should match the actual shape width)
- **height**: Bounding box height (should match the actual shape height)

### pieces
Each piece needs:
- **id**: Unique within the shape (e.g., "p1", "p2")
- **color**: Hex color code - use distinct, vibrant colors
- **points**: Array of [x, y] coordinates defining the piece polygon

## Coordinate System

- Origin (0, 0) is top-left
- X increases to the right
- Y increases downward
- Use integer values for cleaner rendering

## Shape Size

**Target size: 200x200 units** (can be rectangular, e.g., 200x150)

This size works well because:
- Large enough for comfortable touch interaction on mobile
- Fits nicely in the play area with padding
- Pieces are easy to grab and manipulate

Keep shapes between **150-250 units** in each dimension. Smaller shapes make pieces too fiddly; larger shapes may not fit well on mobile screens.

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

## Example: T-Shape

```json
{
  "id": "t-shape",
  "name": "T-Figur",
  "description": "Saml fire dele til et T",
  "difficulty": "medium",
  "points": 3,
  "targetShape": {
    "points": [[0,0], [200,0], [200,67], [133,67], [133,200], [67,200], [67,67], [0,67]],
    "width": 200,
    "height": 200
  },
  "pieces": [
    {
      "id": "p1",
      "color": "#ef4444",
      "points": [[0,0], [67,0], [67,67]]
    },
    {
      "id": "p2",
      "color": "#22c55e",
      "points": [[0,0], [0,67], [67,67]]
    },
    {
      "id": "p3",
      "color": "#3b82f6",
      "points": [[0,0], [67,0], [67,200], [0,200]]
    },
    {
      "id": "p4",
      "color": "#f59e0b",
      "points": [[0,0], [67,0], [67,67], [0,67]]
    }
  ]
}
```

## Shape Ideas

Here are some classic tangram-style shapes to create:
- Arrow pointing right/up
- House silhouette
- Heart shape
- Star (5-pointed)
- Cross / Plus sign
- Diamond
- Parallelogram
- Boat
- Cat silhouette
- Number shapes (1, 4, 7)
- Letters (F, L, T, Z)

## Adding a New Shape

1. Create a new `.json` file in the `shapes/` folder
2. Add the filename to the `puzzleFiles` array in `script.js`:
   ```javascript
   this.puzzleFiles = ['t-puslespil.json', 'your-new-shape.json'];
   ```
3. Test that pieces can cover the target exactly
