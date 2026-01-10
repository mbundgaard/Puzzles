# Quiz Game Design Document

A Millionaire-style quiz game with AI-generated questions.

## Game Overview

| Property | Value |
|----------|-------|
| Game Number | 04 |
| Danish Name | Quiz Mester |
| English Name | Quiz Master |
| French Name | Maître du Quiz |
| Points | 2 / 4 / 7 |
| AI-Powered | Yes |
| Daily Limit | None |

## Game Mechanics

### Structure

- **12 questions total**, divided into 3 levels
- **4 questions per level**, escalating difficulty
- **Checkpoint system** - completing a level banks points

| Level | Questions | Difficulty | Points Banked |
|-------|-----------|------------|---------------|
| 1 | Q1-Q4 | Easy | 2 |
| 2 | Q5-Q8 | Medium | 4 |
| 3 | Q9-Q12 | Hard | 7 |

### Gameplay Flow

1. Player starts game
2. Player sees 4 random categories (from pool of 50)
3. Player selects a category
4. API generates 12 questions for that category
5. Player answers questions one by one
6. After each level: checkpoint reached, points banked
7. Wrong answer: game over, player keeps banked points
8. Complete all 12: player earns 7 points

### Win/Loss Conditions

- **Wrong answer** → Game over, earn banked points (0, 2, or 4)
- **Complete Level 1** → 2 points banked
- **Complete Level 2** → 4 points banked
- **Complete Level 3** → 7 points earned (game won)

### Walk Away Feature

After completing a level, player can choose to:
- **Continue** → Risk current points for higher reward
- **Walk away** → Bank current points and end game

Walk away available:
- After Q4 (Level 1 complete) → Bank 2 points
- After Q8 (Level 2 complete) → Bank 4 points

This adds strategy: "Do I risk my 4 points for a shot at 7?"

## Backend API

### Endpoint

**`POST /api/game/XX/generate`**

### Request

```json
{
  "language": "da",
  "category": "Dansk historie"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| language | string | Yes | "da", "en", or "fr" |
| category | string | Yes | Category name in the specified language |

### Response

```json
{
  "questions": [
    {
      "question": "Hvornår blev Danmark befriet efter 2. verdenskrig?",
      "options": ["1943", "1944", "1945", "1946"],
      "correct": 2
    },
    {
      "question": "Hvilken dansk konge grundlagde København?",
      "options": ["Valdemar den Store", "Absalon", "Christian IV", "Frederik III"],
      "correct": 1
    }
    // ... 10 more questions
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| questions | array | Array of 12 question objects |
| questions[].question | string | The question text |
| questions[].options | string[] | 4 answer options |
| questions[].correct | number | Index (0-3) of correct answer |

### AI Prompt Requirements

The system prompt should instruct the AI to:

1. Generate exactly 12 questions in the given category
2. Difficulty progression:
   - Q1-Q4: Easy (common knowledge, straightforward)
   - Q5-Q8: Medium (requires some knowledge)
   - Q9-Q12: Hard (specific, challenging)
3. Each question has exactly 4 plausible options
4. Correct answer placed at random position (0-3)
5. All text in the requested language
6. Questions should be factually accurate
7. Wrong options should be plausible but clearly wrong
8. No trick questions or ambiguous answers

### Error Responses

| Status | Reason |
|--------|--------|
| 400 | Missing or invalid language/category |
| 503 | AI service not configured |
| 500 | AI generation failed after retries |

## Frontend

### Categories

Each language has its own pool of 50 categories stored in the game's i18n files.

Categories should include:
- **Localized topics** (relevant to that language's audience)
- **Universal topics** (work for everyone)

#### Example: Danish Categories (i18n/da.json)

```json
{
  "categories": [
    "Dansk historie",
    "Danske opfindelser",
    "H.C. Andersen",
    "Danske film og TV",
    "Danske sportsstjerner",
    "København",
    "Verdensgeografi",
    "Dyreriget",
    "Videnskab",
    "Rumfart",
    "Musik",
    "Film og Hollywood",
    "Sport",
    "Mad og drikke",
    "Kunst",
    "Litteratur",
    "Naturen",
    "Havet",
    "Teknologi",
    "Berømte personer",
    "Verdenshistorie",
    "Antikken",
    "Middelalderen",
    "2. verdenskrig",
    "Den kolde krig",
    "Europa",
    "USA",
    "Asien",
    "Afrika",
    "Sydamerika",
    "Australien",
    "Musik fra 80'erne",
    "Klassisk musik",
    "Matematik",
    "Fysik",
    "Kemi",
    "Biologi",
    "Geografi",
    "Hovedstæder",
    "Flag",
    "Sprog",
    "Religion",
    "Filosofi",
    "Opfindelser",
    "Transport",
    "Biler",
    "Fly og luftfart",
    "Computere",
    "Internettet",
    "Spil og gaming"
  ]
}
```

#### Category Selection

Each game session:
1. Load all 50 categories for current language
2. Randomly select 4 categories
3. Display to player as buttons
4. Player taps to select one
5. Selected category sent to API

### UI Components

#### Start Screen
- Game title
- 4 category buttons (randomly selected)
- "New categories" button to reshuffle

#### Question Screen
- Current level indicator (Level 1/2/3)
- Question number (1-12)
- Points at stake / Points banked
- Question text
- 4 answer buttons (A, B, C, D)
- Visual "money ladder" showing all 12 questions

#### Level Complete Screen
- Celebration animation
- Points banked message
- "Continue" button → next level
- "Walk away" button → bank points (optional feature)

#### Game Over Screen (Wrong Answer)
- Show correct answer
- Points earned (banked amount)
- "New Game" button

#### Victory Screen
- Celebration animation
- 7 points earned
- Leaderboard
- "Play Again" button

### Visual Design

#### Money Ladder (Millionaire-style)
```
┌─────────────────────────┐
│ Q12  ████████████  7 pt │ ← Hard
│ Q11  ████████████       │
│ Q10  ████████████       │
│ Q9   ████████████       │
├─────────────────────────┤
│ Q8   ████████████  4 pt │ ← Medium (checkpoint)
│ Q7   ████████████       │
│ Q6   ████████████       │
│ Q5   ████████████       │
├─────────────────────────┤
│ Q4   ████████████  2 pt │ ← Easy (checkpoint)
│ Q3   ████████████       │
│ Q2   ████████████       │
│ Q1   ██████▓▓▓▓▓▓  ← YOU│
└─────────────────────────┘
```

#### Answer Feedback
- Correct: Green highlight, brief pause, move to next
- Wrong: Red highlight, show correct in green, game over

#### Millionaire Visual Effects (No Sound)
- **Money ladder glow** - Current question row glows/pulses
- **Point counter animation** - Numbers tick up when points banked
- **Gold/money colors** - Use gold (#FFD700), amber accents for checkpoint rows
- **Celebration particles** - Gold sparkles on level complete
- **Dramatic reveal** - Brief delay before showing if answer is correct
- **Checkpoint fanfare** - Visual burst when reaching a checkpoint (no audio)

### Touch-First Design

- Large answer buttons (min 44x44px, ideally larger)
- Clear tap feedback
- No keyboard required
- No swipe gestures
- Scroll-free question view (fit on screen)

## Implementation Checklist

### Backend
- [ ] Create `api/Functions/Games/GameXXFunction.cs`
- [ ] Inject `IAIService`
- [ ] Implement `/api/game/XX/generate` endpoint
- [ ] Craft AI system prompt for question generation
- [ ] Add validation for response format
- [ ] Add retry logic (up to 3 attempts)

### Frontend
- [ ] Create `app/src/lib/games/quiz/` folder
- [ ] Create `Quiz.svelte` component
- [ ] Create `i18n/da.json` with 50 Danish categories
- [ ] Create `i18n/en.json` with 50 English categories
- [ ] Create `i18n/fr.json` with 50 French categories
- [ ] Implement category selection screen
- [ ] Implement question display
- [ ] Implement answer selection and feedback
- [ ] Implement checkpoint/level transitions
- [ ] Implement game over screen
- [ ] Implement victory screen with win modal
- [ ] Add to game registry
- [ ] Add game title/description to app i18n files

### Translations
- [ ] Game title in all 3 languages
- [ ] Game description in all 3 languages
- [ ] UI strings (rules, buttons, messages) in all 3 languages
- [ ] 50 categories per language

### Testing
- [ ] Test all 3 difficulty levels
- [ ] Test checkpoint system
- [ ] Test wrong answer → game over flow
- [ ] Test full completion → victory
- [ ] Test category selection
- [ ] Test all 3 languages
- [ ] Test on mobile (touch)

## Timer (Anti-Cheating)

A timer prevents players from googling answers.

### Options

| Type | Duration | Pros | Cons |
|------|----------|------|------|
| Per question | 15-20 sec | Constant pressure | Stressful, accessibility concern |
| Per level | 60-90 sec | More relaxed, still prevents googling | Less dramatic |
| Per game | 4-5 min | Most relaxed | Could google early questions |

### Recommendation: Per question timer

- **15 seconds for Easy** (Q1-Q4)
- **20 seconds for Medium** (Q5-Q8)
- **25 seconds for Hard** (Q9-Q12)

Slightly more time for harder questions since they require more thought.

**Timer expires = wrong answer** (game over, keep banked points)

### UI
- Visual countdown bar/circle
- Color change when low (green → yellow → red)
- No audio (keep it accessible)

## Decisions Summary

| Question | Decision |
|----------|----------|
| Game number | 04 |
| Game name | Quiz Mester / Quiz Master / Maître du Quiz |
| Points | 2 / 4 / 7 |
| Questions | 12 (4 per level) |
| Timer | Per question: 15s / 20s / 25s |
| Walk away | Yes, after Q4 and Q8 |
| Sound effects | No |
| Visual effects | Yes, Millionaire-style (gold, glow, particles) |
| Categories | 50 per language, 4 random shown |
| Daily limit | None |
