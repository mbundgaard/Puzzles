// ============================================================================
// Game 10: Ordleg (Word Guessing)
// ============================================================================

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Services;

namespace Puzzles.Functions.Games;

public class Game10Function
{
    private readonly ILogger<Game10Function> _logger;
    private readonly IAIService _aiService;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public Game10Function(ILogger<Game10Function> logger, IAIService aiService)
    {
        _logger = logger;
        _aiService = aiService;
    }

    [Function("Game10GetWord")]
    public async Task<IActionResult> GetWord(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/10/word")] HttpRequest req)
    {
        WordRequest? request = null;

        try
        {
            using var reader = new StreamReader(req.Body);
            var body = await reader.ReadToEndAsync();
            if (!string.IsNullOrWhiteSpace(body))
            {
                request = JsonSerializer.Deserialize<WordRequest>(body, JsonOptions);
            }
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (!_aiService.IsConfigured)
        {
            return new ObjectResult(new { error = "AI service not configured" }) { StatusCode = 503 };
        }

        var category = request?.Category?.Trim();
        var difficulty = request?.Difficulty?.Trim();
        var length = request?.Length;
        var language = request?.Language?.Trim()?.ToLower() ?? "en";

        // All 3 parameters are required
        if (string.IsNullOrWhiteSpace(category))
        {
            return new BadRequestObjectResult(new { error = "Category is required" });
        }

        if (string.IsNullOrWhiteSpace(difficulty))
        {
            return new BadRequestObjectResult(new { error = "Difficulty is required" });
        }

        if (!length.HasValue)
        {
            return new BadRequestObjectResult(new { error = "Length is required" });
        }

        if (length < 3 || length > 15)
        {
            return new BadRequestObjectResult(new { error = "Length must be between 3 and 15" });
        }

        var outputLanguage = language switch
        {
            "da" => "Danish",
            "fr" => "French",
            _ => "English"
        };

        var result = await GetRandomWordAsync(category, difficulty, length.Value, outputLanguage);
        if (result == null)
        {
            return new ObjectResult(new { error = "Kunne ikke generere ord. Prøv igen." })
            {
                StatusCode = 503
            };
        }

        _logger.LogInformation("Random word generated: {Word} (category: {Category}, difficulty: {Difficulty})",
            result.Word, result.Category ?? "any", difficulty);

        return new OkObjectResult(new WordResponse
        {
            Word = result.Word,
            Category = result.Category,
            Difficulty = difficulty
        });
    }

    // AI methods with prompts

    private async Task<WordResult?> GetRandomWordAsync(string category, string difficulty, int length, string outputLanguage)
    {
        var diff = difficulty.ToLower();

        // Difficulty prompt - how common/known the word should be
        var difficultyPrompt = diff switch
        {
            "easy" => $"The word should be EASY - a very common {outputLanguage} word that children know.",
            "hard" => $"The word should be HARD - a less common or unexpected {outputLanguage} word.",
            _ => $"The word should be MEDIUM - a common {outputLanguage} word."
        };

        var systemPrompt = $@"You help with a word guessing game.

Pick a random {outputLanguage} word from the category: {category}
The word MUST be EXACTLY {length} letters long.
{difficultyPrompt}

IMPORTANT: All output must be in {outputLanguage}.

Rules:
- The word MUST be a REAL {outputLanguage} noun in singular form
- The word may ONLY contain letters (no hyphens or special characters)
- All letters must be UPPERCASE

Respond with JSON in this format:
{{""word"": ""DOG"", ""category"": ""animals""}}";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = "Give me a word" } },
            new AIRequestOptions { Temperature = 0.9 }
        );

        if (string.IsNullOrEmpty(response)) return null;

        try
        {
            var result = JsonSerializer.Deserialize<WordResult>(response, JsonOptions);
            if (result == null || string.IsNullOrEmpty(result.Word))
            {
                _logger.LogWarning("Failed to parse word response: {Content}", response);
                return null;
            }

            // Ensure uppercase
            result.Word = result.Word.ToUpper();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing word response");
            return null;
        }
    }

    // Request/Response models

    private class WordRequest
    {
        public string? Language { get; set; }
        public string? Category { get; set; }
        public string? Difficulty { get; set; }
        public int? Length { get; set; }
    }

    private class WordResponse
    {
        public string Word { get; set; } = "";
        public string? Category { get; set; }
        public string? Difficulty { get; set; }
    }

    private class WordResult
    {
        public string Word { get; set; } = "";
        public string? Category { get; set; }
    }
}
