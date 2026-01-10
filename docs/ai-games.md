# AI-Powered Games

Some games use Azure OpenAI to generate content dynamically. These games display an AI badge on the home page.

## Games Using AI

| Game | Endpoints | What AI Does |
|------|-----------|--------------|
| 04 - Quiz Mester | `/api/game/04/generate` | Generates trivia questions across 3 difficulty levels |
| 10 - Ordleg | `/api/game/10/word` | Generates Danish words by category/difficulty |
| 26 - Gæt Dyret | `/api/game/26/pick`, `/ask`, `/hint` | Picks animals, answers yes/no questions, generates hints |
| 27 - Ordsøgning | `/api/game/27/generate` | Creates word search grids with hidden words |
| 29 - Maskeværk | `/api/game/29/generate` | Generates knitting patterns with descriptions |

## Adding a New AI-Powered Game

1. Create the game function in `api/Functions/Games/GameXXFunction.cs`
2. Inject `IAIService` via constructor
3. Use `_aiService.GenerateAsync()` for AI responses
4. Mark the game as AI-powered in the game registry

## IAIService Interface

The backend uses a generic `IAIService` interface (`api/Services/IAIService.cs`) with `AzureOpenAIService` implementation. This allows easy provider swapping if needed.

```csharp
public interface IAIService
{
    bool IsConfigured { get; }
    Task<string?> GenerateAsync(string systemPrompt, IEnumerable<AIMessage> messages, AIRequestOptions? options = null);
}
```
