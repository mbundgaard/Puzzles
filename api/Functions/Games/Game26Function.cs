// ============================================================================
// Game 26: Gæt Dyret (Guess the Animal)
// ============================================================================

using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Services;

namespace Puzzles.Functions.Games;

public class Game26Function
{
    private readonly ILogger<Game26Function> _logger;
    private readonly IAIService _aiService;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public Game26Function(ILogger<Game26Function> logger, IAIService aiService)
    {
        _logger = logger;
        _aiService = aiService;
    }

    [Function("AnimalPick")]
    public async Task<IActionResult> Pick(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/26/pick")] HttpRequest req)
    {
        AnimalPickRequest? pickRequest = null;

        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            if (!string.IsNullOrWhiteSpace(body))
            {
                pickRequest = JsonSerializer.Deserialize<AnimalPickRequest>(body, JsonOptions);
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

        var category = pickRequest?.Category?.Trim();
        var difficulty = pickRequest?.Difficulty?.Trim() ?? "hard";
        var language = pickRequest?.Language?.Trim()?.ToLower() ?? "en";

        var outputLanguage = language switch
        {
            "da" => "Danish",
            "fr" => "French",
            _ => "English"
        };

        var result = await PickAnimalAsync(category, difficulty, outputLanguage);
        if (result == null)
        {
            return new ObjectResult(new { error = "Kunne ikke vælge et dyr. Prøv igen." })
            {
                StatusCode = 503
            };
        }

        _logger.LogInformation("Animal picked: {Animal} ({Category}, {Difficulty})", result.Animal, result.Category, difficulty);

        return new OkObjectResult(new AnimalPickResponse
        {
            Animal = result.Animal,
            Category = result.Category
        });
    }

    [Function("AnimalAsk")]
    public async Task<IActionResult> Ask(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/26/ask")] HttpRequest req)
    {
        AnimalAskRequest? askRequest;

        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            askRequest = JsonSerializer.Deserialize<AnimalAskRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (askRequest == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        if (string.IsNullOrWhiteSpace(askRequest.Animal))
        {
            return new BadRequestObjectResult(new { error = "Animal is required" });
        }

        if (string.IsNullOrWhiteSpace(askRequest.Question))
        {
            return new BadRequestObjectResult(new { error = "Question is required" });
        }

        if (!_aiService.IsConfigured)
        {
            return new ObjectResult(new { error = "AI service not configured" }) { StatusCode = 503 };
        }

        var language = askRequest.Language?.Trim()?.ToLower() ?? "en";

        var outputLanguage = language switch
        {
            "da" => "Danish",
            "fr" => "French",
            _ => "English"
        };

        var answer = await AskAboutAnimalAsync(askRequest.Animal, askRequest.Question, outputLanguage);
        if (answer == null)
        {
            return new ObjectResult(new { error = "Kunne ikke besvare spørgsmålet. Prøv igen." })
            {
                StatusCode = 503
            };
        }

        return new OkObjectResult(new AnimalAskResponse
        {
            Answer = answer
        });
    }

    [Function("AnimalHint")]
    public async Task<IActionResult> Hint(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/26/hint")] HttpRequest req)
    {
        AnimalHintRequest? hintRequest;

        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            hintRequest = JsonSerializer.Deserialize<AnimalHintRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (hintRequest == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        if (string.IsNullOrWhiteSpace(hintRequest.Animal))
        {
            return new BadRequestObjectResult(new { error = "Animal is required" });
        }

        if (!_aiService.IsConfigured)
        {
            return new ObjectResult(new { error = "AI service not configured" }) { StatusCode = 503 };
        }

        var language = hintRequest.Language?.Trim()?.ToLower() ?? "en";

        var outputLanguage = language switch
        {
            "da" => "Danish",
            "fr" => "French",
            _ => "English"
        };

        var hint = await GetHintAboutAnimalAsync(hintRequest.Animal, hintRequest.PreviousHints, outputLanguage);
        if (hint == null)
        {
            return new ObjectResult(new { error = "Kunne ikke generere hint. Prøv igen." })
            {
                StatusCode = 503
            };
        }

        _logger.LogInformation("Hint generated for {Animal}", hintRequest.Animal);

        return new OkObjectResult(new AnimalHintResponse
        {
            Hint = hint
        });
    }

    // AI methods with prompts

    private async Task<AnimalPickResult?> PickAnimalAsync(string? category, string difficulty, string outputLanguage)
    {
        var diff = string.IsNullOrWhiteSpace(difficulty) ? "hard" : difficulty.ToLower();

        var categoryPrompt = string.IsNullOrWhiteSpace(category)
            ? "Pick a random category (e.g. sea animals, birds, mammals, insects, reptiles) and an animal from that category."
            : $"Pick a random animal from the category: {category}";

        var difficultyPrompt = diff switch
        {
            "easy" => "Pick a VERY COMMON animal that all children know, e.g. dog, cat, cow, horse, elephant, lion, giraffe, zebra, rabbit, duck, chicken, pig.",
            "medium" => "Pick an animal that most people know, but avoid the most obvious ones like dog, cat, cow. Pick e.g. dolphin, penguin, flamingo, beaver, raccoon, parrot.",
            _ => "Pick a LESS KNOWN or UNEXPECTED animal. Avoid common animals like dog, cat, cow, horse, elephant. Pick e.g. platypus, tapir, okapi, axolotl, capybara, fennec fox, pangolin, manatee."
        };

        var systemPrompt = $@"You help with an animal guessing game.

{categoryPrompt}

{difficultyPrompt}

IMPORTANT: All text output must be in {outputLanguage}.

Respond with JSON in this format:
{{""animal"": ""dolphin"", ""category"": ""sea animals""}}

The animal name must be singular (e.g. ""dolphin"" not ""dolphins"").";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = "Pick an animal" } },
            new AIRequestOptions { Temperature = 0.9 }
        );

        if (string.IsNullOrEmpty(response)) return null;

        try
        {
            var result = JsonSerializer.Deserialize<AnimalPickResult>(response, JsonOptions);
            if (result == null || string.IsNullOrEmpty(result.Animal))
            {
                _logger.LogWarning("Failed to parse animal pick response: {Content}", response);
                return null;
            }
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing animal pick response");
            return null;
        }
    }

    private async Task<string?> AskAboutAnimalAsync(string animal, string question, string outputLanguage)
    {
        var systemPrompt = $@"You are playing a guessing game. The animal to guess is: {animal}

Answer the user's yes/no question honestly about this animal.
Respond ONLY with JSON in this format:
{{""answer"": ""Yes""}} or {{""answer"": ""No""}} or {{""answer"": ""Maybe""}}

Answer ""Maybe"" if the question is unclear, ambiguous, or cannot be answered definitively.
IMPORTANT: The answer must be in {outputLanguage}.";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = question } },
            new AIRequestOptions { Temperature = 0.1 }
        );

        if (string.IsNullOrEmpty(response)) return null;

        try
        {
            var result = JsonSerializer.Deserialize<AnimalAnswerResult>(response, JsonOptions);
            if (result == null || string.IsNullOrEmpty(result.Answer))
            {
                _logger.LogWarning("Failed to parse animal answer response: {Content}", response);
                return null;
            }
            _logger.LogInformation("Animal question answered: {Question} -> {Answer}", question, result.Answer);
            return result.Answer;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing animal answer response");
            return null;
        }
    }

    private async Task<string?> GetHintAboutAnimalAsync(string animal, List<string>? previousHints, string outputLanguage)
    {
        var previousHintsText = previousHints != null && previousHints.Count > 0
            ? $"\n\nPrevious hints (do NOT repeat these):\n- {string.Join("\n- ", previousHints)}"
            : "";

        var systemPrompt = $@"You help with an animal guessing game. The animal to guess is: {animal}

Give ONE short, helpful hint about the animal. The hint must:
- Be 1 sentence (max 15 words)
- Give useful information that can help guess the animal
- NOT mention the animal's name or parts of the name
- Be factually correct
{previousHintsText}

IMPORTANT: The hint must be in {outputLanguage}.

Respond ONLY with JSON in this format:
{{""hint"": ""This animal lives in the ocean""}}";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = "Give a hint" } },
            new AIRequestOptions { Temperature = 0.7 }
        );

        if (string.IsNullOrEmpty(response)) return null;

        try
        {
            var result = JsonSerializer.Deserialize<HintResult>(response, JsonOptions);
            if (result == null || string.IsNullOrEmpty(result.Hint))
            {
                _logger.LogWarning("Failed to parse hint response: {Content}", response);
                return null;
            }
            return result.Hint;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing hint response");
            return null;
        }
    }

    // Request/Response models

    private class AnimalPickRequest
    {
        public string? Category { get; set; }
        public string? Difficulty { get; set; }
        public string? Language { get; set; }
    }

    private class AnimalPickResponse
    {
        public required string Animal { get; set; }
        public required string Category { get; set; }
    }

    private class AnimalPickResult
    {
        public string Animal { get; set; } = "";
        public string Category { get; set; } = "";
    }

    private class AnimalAskRequest
    {
        public required string Animal { get; set; }
        public required string Question { get; set; }
        public string? Language { get; set; }
    }

    private class AnimalAskResponse
    {
        public required string Answer { get; set; }
    }

    private class AnimalAnswerResult
    {
        public string? Answer { get; set; }
    }

    private class AnimalHintRequest
    {
        public required string Animal { get; set; }
        public List<string>? PreviousHints { get; set; }
        public string? Language { get; set; }
    }

    private class AnimalHintResponse
    {
        public required string Hint { get; set; }
    }

    private class HintResult
    {
        public string? Hint { get; set; }
    }
}
