# AI Enhancement Proposals

This document analyzes how each game could be enhanced with AI functionality through a dedicated API endpoint that connects to Claude or ChatGPT.

## Proposed API Structure

### Endpoint
```
POST /api/ai/{game}
```

### Request Types
1. **Hint Request** - Get a hint for the current game state
2. **Analysis Request** - Analyze the current position/state
3. **Question Request** - Ask a question about rules or strategy
4. **Solution Request** - Get a step-by-step solution

### Request Format
```json
{
  "type": "hint" | "analysis" | "question" | "solution",
  "gameState": { ... },  // Game-specific state object
  "question": "..."      // Optional: for question type
}
```

### Response Format
```json
{
  "response": "...",     // AI response text
  "suggestion": { ... }, // Optional: structured move/action suggestion
  "confidence": 0.95     // How confident the AI is (0-1)
}
```

---

## Game Analysis

### ⭐ Excellent AI Potential

#### 01 - Reversi
| Feature | Description |
|---------|-------------|
| **Move Suggestions** | Analyze board and suggest best move with explanation |
| **Position Evaluation** | Explain who's winning and why (corners, edges, mobility) |
| **Strategy Teaching** | Explain concepts like corner control, stable discs, mobility |
| **Q&A** | Answer questions like "Why was that a bad move?" |

**Game State:** 8x8 grid with pieces (0=empty, 1=black, 2=white), current player

**Example Prompt:**
```
Board state: [grid]. It's black's turn. What's the best move and why?
```

---

#### 03 - Sudoku
| Feature | Description |
|---------|-------------|
| **Hint System** | Point to a cell that can be solved, explain the technique |
| **Technique Explanation** | Teach naked singles, hidden pairs, X-wing, etc. |
| **Validation** | Check if current state is still solvable |
| **Step-by-Step** | Walk through solution explaining each step |

**Game State:** 9x9 grid with numbers (0=empty), original puzzle vs current state

**Example Prompt:**
```
Sudoku puzzle: [grid]. Give me a hint for one cell without giving the full solution. Explain the technique used.
```

---

#### 09 - Kalaha
| Feature | Description |
|---------|-------------|
| **Move Analysis** | Suggest best pit to choose, explain chain reactions |
| **Strategy Teaching** | Explain capturing, extra turns, endgame strategy |
| **Opponent Analysis** | Explain what the AI opponent is likely to do |
| **Position Evaluation** | Who's ahead and by how much? |

**Game State:** Array of 14 pits with stone counts, current player

**Example Prompt:**
```
Kalaha state: Player pits [6,6,6,6,6,6], store: 0. AI pits: [6,6,6,6,6,6], store: 0.
Player's turn. What's the best move and why?
```

---

#### 10 - Ordleg (Wordle)
| Feature | Description |
|---------|-------------|
| **Word Hints** | Give clues about the word without revealing it |
| **Letter Strategy** | Suggest which letters to try based on feedback |
| **Pattern Analysis** | "Words with A in position 2 and ending in T..." |
| **Definition Hint** | Give a subtle hint about word meaning |

**Game State:** Target word (hidden), guesses made, feedback colors

**Example Prompt:**
```
Ordleg: Guesses so far: HESTE (🟨⬜⬜🟩⬜), KASTE (🟨🟨⬜🟩🟩).
Give me a hint without revealing the word. What pattern should I look for?
```

---

#### 14 - Mastermind
| Feature | Description |
|---------|-------------|
| **Optimal Guessing** | Suggest next guess based on previous feedback |
| **Deduction Explanation** | Explain what we know and don't know |
| **Strategy Teaching** | Explain minimax strategy for code-breaking |
| **Probability Analysis** | How many possible codes remain? |

**Game State:** Previous guesses, feedback (correct position, wrong position)

**Example Prompt:**
```
Mastermind: Guess 1: RRGB → 1 black, 1 white. Guess 2: GBRY → 0 black, 2 white.
What should I guess next and why?
```

---

### ✅ Good AI Potential

#### 02 - Telte og Træer
| Feature | Description |
|---------|-------------|
| **Cell Hints** | Point to a cell that must be tent/grass |
| **Technique Teaching** | Explain deduction rules |
| **Constraint Analysis** | "This row needs 2 more tents, only 2 spots possible" |

**Game State:** Grid with trees, tents, grass; row/column counts

---

#### 04 - Nonogram
| Feature | Description |
|---------|-------------|
| **Line Hints** | Suggest which row/column to work on |
| **Technique Teaching** | Explain overlap method, edge logic |
| **Partial Solving** | Identify cells that are definitely filled/empty |

**Game State:** Grid state, row clues, column clues

---

#### 08 - Kabale (Solitaire)
| Feature | Description |
|---------|-------------|
| **Move Suggestions** | Suggest next move with priority explanation |
| **Strategy Tips** | When to move to foundation vs keep in tableau |
| **Stuck Detection** | Analyze if game is still winnable |

**Game State:** Tableau stacks, foundation piles, stock, waste

---

#### 12 - Rørføring (Pipe Puzzle)
| Feature | Description |
|---------|-------------|
| **Path Hints** | Suggest which cell to fill next |
| **Dead-End Detection** | Warn about moves that block solution |
| **Strategy** | Explain how to work backwards from end |

**Game State:** Grid with start, end, pipes placed

---

#### 13 - 15-Puslespil
| Feature | Description |
|---------|-------------|
| **Move Hints** | Suggest next move toward solution |
| **Algorithm Teaching** | Explain solving strategies (corners first, etc.) |
| **Move Count** | Estimate minimum moves remaining |

**Game State:** 4x4 grid with tile positions

---

#### 15 - Broer (Bridges)
| Feature | Description |
|---------|-------------|
| **Bridge Hints** | Suggest which islands to connect |
| **Constraint Explanation** | "Island 3 must connect here because..." |
| **Validation** | Check if current state is still solvable |

**Game State:** Island positions and values, bridges placed

---

#### 16 - Lys Op (Light Up)
| Feature | Description |
|---------|-------------|
| **Placement Hints** | Suggest where to place a light |
| **Constraint Logic** | Explain deductions from numbered cells |
| **Conflict Detection** | Identify cells that can't have lights |

**Game State:** Grid with walls, numbers, lights placed

---

#### 18 - Dam (Checkers)
| Feature | Description |
|---------|-------------|
| **Move Analysis** | Suggest best move, explain captures |
| **Position Evaluation** | Who's ahead? Material count |
| **Strategy Teaching** | King advancement, forced captures |

**Game State:** Board position, pieces and kings

---

#### 19 - Mølle (Nine Men's Morris)
| Feature | Description |
|---------|-------------|
| **Move Suggestions** | Best placement/movement |
| **Mill Threats** | Point out mill opportunities |
| **Strategy Teaching** | Opening principles, double mills |

**Game State:** Board positions, game phase, pieces remaining

---

#### 20 - Slitherlink
| Feature | Description |
|---------|-------------|
| **Edge Hints** | Suggest which edge to draw/cross |
| **Pattern Recognition** | Teach common patterns (0s, 3s in corners) |
| **Loop Validation** | Check if current path can form valid loop |

**Game State:** Grid with numbers, edges drawn

---

#### 21 - Fire på Stribe (Connect Four)
| Feature | Description |
|---------|-------------|
| **Move Analysis** | Suggest best column, explain threats |
| **Win/Block Detection** | Identify winning moves or blocks needed |
| **Strategy Teaching** | Center control, threat creation |

**Game State:** 7x6 grid with pieces

---

### ⚠️ Limited AI Potential

#### 05 - 2048
| Feature | Description |
|---------|-------------|
| **Direction Suggestion** | Suggest swipe direction |
| **Strategy Tips** | Keep high tiles in corner, maintain order |
| **State Evaluation** | Is current position good/bad? |

**Limitation:** Real-time nature, simple strategy

---

#### 06 - Minestryger (Minesweeper)
| Feature | Description |
|---------|-------------|
| **Safe Cell Hints** | Point to cells that are definitely safe |
| **Probability Analysis** | Which cells are safest when uncertain? |

**Limitation:** Often requires guessing, probability-based

---

#### 17 - Pind (Peg Solitaire)
| Feature | Description |
|---------|-------------|
| **Move Hints** | Suggest next jump |
| **Solution Path** | Show sequence to solve |

**Limitation:** Mostly mechanical once you know the solution

---

#### 22 - Tårnet i Hanoi
| Feature | Description |
|---------|-------------|
| **Next Move** | Tell which disk to move where |
| **Algorithm Explanation** | Explain recursive solution |

**Limitation:** Single algorithm, not much strategy variation

---

### ❌ Not Suitable for AI

#### 07 - Hukommelse (Memory)
**Reason:** AI can't help with human memory. Would defeat the purpose of the game.

**Alternative:** Statistics about average attempts, optimal strategy explanation.

---

#### 11 - Kryds og Bolle (Tic-Tac-Toe)
**Reason:** Game already has AI opponent. Optimal strategy is simple and well-known.

**Alternative:** Explain why the game always ends in draw with perfect play.

---

#### 23 - Slange (Snake)
**Reason:** Real-time action game. AI can't help with reflexes/timing.

**Alternative:** Post-game analysis, strategy tips for efficient path planning.

---

## Implementation Priority

### Phase 1 - High Impact, Lower Complexity
1. **Ordleg** - Natural language hints fit perfectly
2. **Mastermind** - Clear logical deduction
3. **Sudoku** - Well-defined solving techniques

### Phase 2 - Strategy Games
4. **Reversi** - Rich strategic depth
5. **Kalaha** - Interesting move analysis
6. **Fire på Stribe** - Clear threat analysis

### Phase 3 - Logic Puzzles
7. **Telte og Træer**
8. **Nonogram**
9. **Broer**
10. **Lys Op**
11. **Slitherlink**

### Phase 4 - Other Games
12. **Kabale**
13. **15-Puslespil**
14. **Dam**
15. **Mølle**
16. **Rørføring**

---

## UI Integration

### Hint Button
Add a 💡 button to supported games that opens AI assistant:

```html
<button class="ai-hint-btn" id="ai-hint">💡</button>
```

### AI Chat Modal
```html
<div class="ai-modal">
  <div class="ai-messages" id="ai-messages"></div>
  <input type="text" id="ai-input" placeholder="Stil et spørgsmål...">
  <button id="ai-send">Send</button>
</div>
```

### Quick Actions
- **"Giv mig et hint"** - Get contextual hint
- **"Forklar min position"** - Analyze current state
- **"Hvad gjorde jeg forkert?"** - Review last move

---

## Cost Considerations

| Model | Cost per 1K tokens | Use Case |
|-------|-------------------|----------|
| GPT-4o-mini | ~$0.00015 | Quick hints |
| Claude 3 Haiku | ~$0.00025 | Explanations |
| GPT-4o | ~$0.005 | Complex analysis |
| Claude 3.5 Sonnet | ~$0.003 | Strategy teaching |

**Recommendation:** Use smaller/faster models for hints, larger models for detailed explanations.

### Rate Limiting
- Max 10 AI requests per game session
- Max 50 AI requests per user per day
- Cache common questions/positions

---

## Example API Implementation

```csharp
[Function("AI")]
public async Task<IActionResult> AI(
    [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "ai/{game}")]
    HttpRequest req, string game)
{
    var request = await req.ReadFromJsonAsync<AIRequest>();

    var prompt = BuildPrompt(game, request);
    var response = await _openAI.Complete(prompt);

    return new OkObjectResult(new {
        response = response.Text,
        suggestion = ParseSuggestion(response),
        confidence = response.Confidence
    });
}
```

---

## Summary

| Game | AI Potential | Primary Feature |
|------|-------------|-----------------|
| Reversi | ⭐⭐⭐⭐⭐ | Move analysis & strategy |
| Telte og Træer | ⭐⭐⭐⭐ | Deduction hints |
| Sudoku | ⭐⭐⭐⭐⭐ | Technique teaching |
| Nonogram | ⭐⭐⭐⭐ | Line analysis |
| 2048 | ⭐⭐ | Direction tips |
| Minestryger | ⭐⭐ | Probability hints |
| Hukommelse | ❌ | Not suitable |
| Kabale | ⭐⭐⭐ | Move suggestions |
| Kalaha | ⭐⭐⭐⭐⭐ | Strategic analysis |
| Ordleg | ⭐⭐⭐⭐⭐ | Word hints |
| Kryds og Bolle | ❌ | Not suitable |
| Rørføring | ⭐⭐⭐ | Path hints |
| 15-Puslespil | ⭐⭐⭐ | Move sequence |
| Mastermind | ⭐⭐⭐⭐⭐ | Deduction logic |
| Broer | ⭐⭐⭐⭐ | Constraint hints |
| Lys Op | ⭐⭐⭐⭐ | Placement logic |
| Pind | ⭐⭐ | Solution path |
| Dam | ⭐⭐⭐ | Move analysis |
| Mølle | ⭐⭐⭐ | Strategy tips |
| Slitherlink | ⭐⭐⭐⭐ | Pattern hints |
| Fire på Stribe | ⭐⭐⭐⭐ | Threat analysis |
| Tårnet i Hanoi | ⭐⭐ | Algorithm teaching |
| Slange | ❌ | Not suitable |

**Top 5 candidates for AI enhancement:**
1. 🥇 Ordleg - Perfect for natural language hints
2. 🥈 Sudoku - Rich technique teaching potential
3. 🥉 Mastermind - Clear logical deduction
4. 4️⃣ Reversi - Deep strategic analysis
5. 5️⃣ Kalaha - Interesting move optimization

---

## 🏆 Best Candidate: Ordleg

### Why Ordleg is the Best Choice

**Ordleg** (the Danish Wordle clone) is the ideal first candidate for AI enhancement because:

1. **Natural Language Fit** - Word games are inherently linguistic, making AI responses feel natural
2. **Rich Hint Potential** - Many ways to hint without spoiling (synonyms, categories, letter patterns)
3. **Low Complexity** - Simple game state (guesses + feedback colors) is easy to serialize
4. **High User Value** - Players often get stuck and would appreciate intelligent hints
5. **Safe Experimentation** - Hints don't break the game; players can still solve themselves

### How It Enhances the Experience

| Without AI | With AI |
|------------|---------|
| Stuck? Give up or guess randomly | "The word is related to nature..." |
| No learning | "Words with Ø often end in -ØR or -ØG" |
| Frustrating losses | "You were close! The pattern A_E_E often means..." |
| Static experience | Personalized hints based on skill level |

### User Interaction Examples

**Player:** "Jeg sidder fast, giv mig et hint"
**AI:** "Ordet har noget med dyr at gøre. Tænk på noget der flyver."

**Player:** "Hvad betyder de gule bogstaver?"
**AI:** "De gule bogstaver (E og S) er i ordet, men på forkert plads. Prøv at flytte dem til andre positioner."

**Player:** "Er der et mønster jeg bør kende?"
**AI:** "Baseret på dine gæt: Du ved at ordet har E (ikke position 2) og S (ikke position 4). Ord der starter med S og har E i midten er værd at prøve."

### Implementation Direction

#### API Approach
- Create endpoint `POST /api/ai/ordleg` that accepts game state (guesses, feedback, category)
- Send game context to Claude/GPT with instructions to never reveal the word directly
- Return natural language hints in Danish

#### Hint Strategy Levels
Progress from subtle to more helpful based on how stuck the player is:

1. **Category hints** - "Tænk på noget i naturen"
2. **Semantic hints** - "Det ligner noget der kan flyve"
3. **Letter patterns** - "Mange ord med Ø ender på -ØR"
4. **Position hints** - "Prøv at sætte E i position 3"
5. **Strong hints** - "Det rimer på 'BJØRN'"

#### UI Integration
- Add a 💡 button next to the feedback button
- Show AI response in a modal or toast message
- Limit to 3 hints per game to maintain challenge

#### Key Considerations
- **Cost control:** Use smaller models (GPT-4o-mini, Haiku) for simple hints
- **Rate limiting:** Max hints per game and per day
- **Language:** All responses must be in Danish
- **Safety:** Never reveal the word directly, even if asked
