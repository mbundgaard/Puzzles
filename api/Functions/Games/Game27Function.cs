// ============================================================================
// Game 27: Ordsøgning (Word Search)
// ============================================================================

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Services;

namespace Puzzles.Functions.Games;

public class Game27Function
{
    private readonly ILogger<Game27Function> _logger;
    private readonly IAIService _aiService;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public Game27Function(ILogger<Game27Function> logger, IAIService aiService)
    {
        _logger = logger;
        _aiService = aiService;
    }

    [Function("WordSearchGenerate")]
    public async Task<IActionResult> Generate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/27/generate")] HttpRequest req)
    {
        WordSearchRequest? request = null;

        try
        {
            using var reader = new StreamReader(req.Body);
            var body = await reader.ReadToEndAsync();
            if (!string.IsNullOrWhiteSpace(body))
            {
                request = JsonSerializer.Deserialize<WordSearchRequest>(body, JsonOptions);
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

        var difficulty = request?.Difficulty?.Trim() ?? "medium";

        // Try up to 3 times to generate a valid board
        for (int attempt = 0; attempt < 3; attempt++)
        {
            var result = await GenerateWordSearchBoardAsync(difficulty);
            if (result != null)
            {
                _logger.LogInformation("Word search board generated with {Count} words (difficulty: {Difficulty})",
                    result.Words.Count, difficulty);

                return new OkObjectResult(result);
            }

            _logger.LogWarning("Failed to generate word search board, retrying... (attempt {Attempt})", attempt + 1);
        }

        return new ObjectResult(new { error = "Kunne ikke generere ordsøgning. Prøv igen." })
        {
            StatusCode = 503
        };
    }

    private async Task<WordSearchBoardResult?> GenerateWordSearchBoardAsync(string difficulty)
    {
        var diff = string.IsNullOrWhiteSpace(difficulty) ? "medium" : difficulty.ToLower();

        var difficultyPrompt = diff switch
        {
            "easy" => "Brug 8 NEMME danske ord (3-5 bogstaver) som alle kender, f.eks. HUND, KAT, SOL, BIL, HUS.",
            "medium" => "Brug 8 MELLEM-SVÆRE danske ord (4-7 bogstaver), f.eks. CYKEL, SOMMER, STRAND, GUITAR.",
            _ => "Brug 8 SVÆRE danske ord (6-10 bogstaver), f.eks. ELEFANT, BIBLIOTEK, CHOKOLADE, REGNBUE."
        };

        var systemPrompt = $@"Du genererer et ordsøgningsspil (word search) på dansk.

{difficultyPrompt}

Regler:
- Gitteret skal være præcis 12x12 bogstaver
- Placer præcis 8 RIGTIGE danske ord i gitteret
- Ord kan placeres: vandret (venstre→højre), lodret (top→bund), diagonalt (↘ eller ↗)
- Det er OK hvis ord overlapper (deler bogstaver) - det gør spillet mere interessant!
- Fyld tomme felter med tilfældige danske bogstaver (A-Z, Æ, Ø, Å)
- ALLE ord SKAL være RIGTIGE danske navneord
- Alle bogstaver skal være STORE BOGSTAVER

Svar med JSON i dette format:
{{
  ""grid"": [
    [""A"",""B"",""C"",""D"",""E"",""F"",""G"",""H"",""I"",""J"",""K"",""L""],
    ... (12 rækker med 12 bogstaver hver)
  ],
  ""words"": [""ORD1"", ""ORD2"", ""ORD3"", ""ORD4"", ""ORD5"", ""ORD6"", ""ORD7"", ""ORD8""]
}}";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = "Generér et ordsøgningsspil" } },
            new AIRequestOptions { Temperature = 0.8 }
        );

        if (string.IsNullOrEmpty(response)) return null;

        try
        {
            var result = JsonSerializer.Deserialize<WordSearchBoardResult>(response, JsonOptions);
            if (result == null || result.Grid == null || result.Words == null)
            {
                _logger.LogWarning("Failed to parse word search board response: {Content}", response);
                return null;
            }

            // Validate grid size
            if (result.Grid.Length != 12 || result.Grid.Any(row => row.Length != 12))
            {
                _logger.LogWarning("Invalid grid size in word search board");
                return null;
            }

            // Validate word count
            if (result.Words.Count != 8)
            {
                _logger.LogWarning("Invalid word count: {Count}, expected 8", result.Words.Count);
                return null;
            }

            // Ensure all letters are uppercase
            for (int y = 0; y < 12; y++)
            {
                for (int x = 0; x < 12; x++)
                {
                    result.Grid[y][x] = result.Grid[y][x].ToUpper();
                }
            }

            result.Words = result.Words.Select(w => w.ToUpper()).ToList();

            _logger.LogInformation("Word search board generated with words: {Words} (difficulty: {Difficulty})",
                string.Join(", ", result.Words), diff);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing word search board response");
            return null;
        }
    }

    // Request/Response models

    private class WordSearchRequest
    {
        public string? Difficulty { get; set; }
    }

    private class WordSearchBoardResult
    {
        public string[][] Grid { get; set; } = Array.Empty<string[]>();
        public List<string> Words { get; set; } = new();
    }
}
