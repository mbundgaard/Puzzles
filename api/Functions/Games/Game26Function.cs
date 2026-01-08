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

        var result = await PickAnimalAsync(category, difficulty);
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

        var answer = await AskAboutAnimalAsync(askRequest.Animal, askRequest.Question);
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

        var hint = await GetHintAboutAnimalAsync(hintRequest.Animal, hintRequest.PreviousHints);
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

    private async Task<AnimalPickResult?> PickAnimalAsync(string? category, string difficulty)
    {
        var diff = string.IsNullOrWhiteSpace(difficulty) ? "hard" : difficulty.ToLower();

        var categoryPrompt = string.IsNullOrWhiteSpace(category)
            ? "Vælg en tilfældig kategori (f.eks. havdyr, fugle, pattedyr, insekter, krybdyr) og et dyr fra den kategori."
            : $"Vælg et tilfældigt dyr fra kategorien: {category}";

        var difficultyPrompt = diff switch
        {
            "easy" => "Vælg et MEGET ALMINDELIGT dyr som alle børn kender, f.eks. hund, kat, ko, hest, elefant, løve, giraf, zebra, kanin, and, høne, gris.",
            "medium" => "Vælg et dyr som de fleste kender, men undgå de mest oplagte som hund, kat, ko. Vælg f.eks. delfin, pingvin, flamingo, bæver, vaskebjørn, papegøje.",
            _ => "Vælg et MINDRE KENDT eller UVENTET dyr. Undgå almindelige dyr som hund, kat, ko, hest, elefant. Vælg f.eks. næbdyr, tapir, okapien, axolotl, capybara, fennekræv, pangolin, manati."
        };

        var systemPrompt = $@"Du hjælper med et gættespil om dyr. {categoryPrompt}

{difficultyPrompt}

Svar med JSON i dette format:
{{""animal"": ""navnet på dyret"", ""category"": ""kategorien""}}

Dyrenavnet skal være på dansk og i ental (f.eks. ""delfin"" ikke ""delfiner"").";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = "Vælg et dyr" } },
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

    private async Task<string?> AskAboutAnimalAsync(string animal, string question)
    {
        var systemPrompt = $@"Du spiller et gættespil. Dyret der skal gættes er: {animal}

Besvar brugerens ja/nej spørgsmål ærligt om dette dyr.
Svar KUN med JSON i dette format:
{{""answer"": ""Ja""}} eller {{""answer"": ""Nej""}} eller {{""answer"": ""Måske""}}

Svar ""Måske"" hvis spørgsmålet er uklart, tvetydigt, eller ikke kan besvares entydigt.";

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

    private async Task<string?> GetHintAboutAnimalAsync(string animal, List<string>? previousHints)
    {
        var previousHintsText = previousHints != null && previousHints.Count > 0
            ? $"\n\nTidligere hints (giv IKKE disse igen):\n- {string.Join("\n- ", previousHints)}"
            : "";

        var systemPrompt = $@"Du hjælper med et gættespil om dyr. Dyret der skal gættes er: {animal}

Giv ET kort, hjælpsomt hint om dyret på dansk. Hintet skal:
- Være 1 sætning (max 15 ord)
- Give nyttig information der kan hjælpe med at gætte dyret
- IKKE nævne dyrets navn eller dele af navnet
- Være faktuelt korrekt
{previousHintsText}

Svar KUN med JSON i dette format:
{{""hint"": ""Dit hint her""}}";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = "Giv et hint" } },
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
