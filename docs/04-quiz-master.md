# 04 - Quiz Master

AI-generated trivia quiz game with difficulty selection.

## Game Overview

| Property | Value |
|----------|-------|
| Game Number | 04 |
| Danish Name | Quiz Mester |
| English Name | Quiz Master |
| French Name | Maître du Quiz |
| Points | 1 / 3 / 5 (based on difficulty) |
| AI Model | `gpt-4.1` |
| Daily Limit | None (questions tracked to avoid repeats) |

## Game Flow

1. **Select Audience**: Kids (ages 8-12) or Adults
2. **Select Category**: 4 daily categories shown (from pool of 26/50)
3. **Select Difficulty**: Easy (1pt), Medium (3pt), or Hard (5pt)
4. **Answer Questions**: 4 questions, 20 seconds each
5. **Win/Lose**: Answer all 4 correctly = earn points, miss any = 0 points

## Difficulty Levels

| Level | API Difficulty | Points | Description |
|-------|----------------|--------|-------------|
| Easy | 2 | 1 | Basic facts, straightforward |
| Medium | 3 | 3 | Requires general knowledge |
| Hard | 4 | 5 | Specific, challenging facts |

## Categories

Categories are stored in `i18n/{lang}.json` with IDs:
- **Kids**: K01-K26 (26 categories per language)
- **Adults**: A01-A50 (50 categories per language)

4 random categories are shown per day (seeded by date + audience mode).

## Question Tracking

Questions are tracked per user/category/day in Azure Table Storage to avoid repeats:
- **Table**: `QuizQuestions`
- **Partition Key**: `{date}_{nickname}_{categoryId}`
- **Data**: JSON array of question texts + AI response time (ElapsedMs)

## API Endpoint

### Generate Quiz

**`POST /api/game/04/generate`**

**Request:**
```json
{
  "language": "da",
  "categoryId": "K01",
  "category": "Dyreriget",
  "difficulty": 3,
  "count": 4,
  "nickname": "player1"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| language | string | Yes | "da", "en", or "fr" |
| categoryId | string | Yes | Category ID (K=kids, A=adults prefix) |
| category | string | Yes | Category name for AI prompt |
| difficulty | int | No | 1-5, default: 3 |
| count | int | No | 1-20 questions, default: 4 |
| nickname | string | No | For tracking asked questions |

**Response:**
```json
{
  "questions": [
    {
      "question": "What is the largest mammal?",
      "options": ["Elephant", "Blue whale", "Giraffe", "Hippo"],
      "correct": 1
    }
  ]
}
```

**Error Responses:**

| Status | Reason |
|--------|--------|
| 400 | Missing or invalid language/category |
| 503 | AI service not configured or generation failed |

## Frontend Components

### Files

```
app/src/lib/games/04-quiz-master/
├── QuizMaster.svelte    # Main game component
└── i18n/
    ├── da.json          # Danish (26 kids + 50 adult categories)
    ├── en.json          # English
    └── fr.json          # French
```

### Game States

| State | Description |
|-------|-------------|
| select | Audience → Category → Difficulty selection |
| playing | Answering questions with timer |
| won | Completed all questions |
| lost | Wrong answer or timeout |

### Timer

- 20 seconds per question
- Visual countdown bar with color changes (green → yellow → red)
- Timeout = wrong answer (game over)
