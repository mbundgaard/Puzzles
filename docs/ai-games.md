# AI-Powered Games

Some games use Azure OpenAI to generate content dynamically. These games display an AI badge on the home page.

## Games Using AI

| Game | Model | Endpoints | What AI Does |
|------|-------|-----------|--------------|
| 04 - Quiz Mester | `gpt-4.1` | `/api/game/04/generate` | Generates trivia questions (factual accuracy critical) |
| 10 - Ordleg | `gpt-4.1-mini` | `/api/game/10/word` | Generates Danish words by category/difficulty |
| 26 - Gæt Dyret | `gpt-4.1-mini` | `/api/game/26/pick`, `/ask`, `/hint` | Picks animals, answers yes/no questions, generates hints |
| 27 - Ordsøgning | `gpt-4.1-mini` | `/api/game/27/generate` | Creates word search grids with hidden words |
| 29 - Maskeværk | `gpt-4.1-mini` | `/api/game/29/generate` | Generates knitting patterns with descriptions |

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
    Task<string?> GenerateAsync(string systemPrompt, AIMessage[] messages, AIRequestOptions? options = null);
}

public class AIRequestOptions
{
    public string Model { get; set; } = "gpt-4.1-mini";  // Azure OpenAI deployment name
    public double Temperature { get; set; } = 0.7;
    public bool JsonResponse { get; set; } = true;
}
```

## Model Selection

The model is specified per-request via `AIRequestOptions.Model`. This allows using cheaper models for simple tasks and more capable models where quality matters.

- **Default:** `gpt-4.1-mini` - Fast and cost-effective for most tasks
- **Quality-critical:** `gpt-4.1` - Better factual accuracy (used for Quiz Master)

Azure OpenAI deployments required: `gpt-4.1`, `gpt-4.1-mini`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource endpoint URL |
| `AZURE_OPENAI_KEY` | API key for Azure OpenAI |
