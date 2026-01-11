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
- Ord kan placeres i 4 retninger: right (vandret), down (lodret), diag-down (diagonal ↘), diag-up (diagonal ↗)
- Det er OK hvis ord overlapper (deler bogstaver) - det gør spillet mere interessant!
- Fyld tomme felter med tilfældige danske bogstaver (A-Z, Æ, Ø, Å)
- ALLE ord SKAL være RIGTIGE danske navneord
- Alle bogstaver skal være STORE BOGSTAVER
- x er kolonne (0-11 fra venstre), y er række (0-11 fra top)

Svar med JSON i dette format:
{{
  ""grid"": [
    [""A"",""B"",""C"",""D"",""E"",""F"",""G"",""H"",""I"",""J"",""K"",""L""],
    ... (12 rækker med 12 bogstaver hver)
  ],
  ""words"": [
    {{ ""word"": ""HUND"", ""x"": 0, ""y"": 2, ""dir"": ""right"" }},
    {{ ""word"": ""KAT"", ""x"": 5, ""y"": 1, ""dir"": ""down"" }},
    ... (8 ord total med deres positioner)
  ]
}}";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = "Generér et ordsøgningsspil" } },
            new AIRequestOptions { Temperature = 0.8 }
        );

        if (string.IsNullOrEmpty(response)) return null;

        try
        {
            var aiResult = JsonSerializer.Deserialize<AIWordSearchResponse>(response, JsonOptions);
            if (aiResult == null || aiResult.Grid == null || aiResult.Words == null)
            {
                _logger.LogWarning("Failed to parse word search board response: {Content}", response);
                return null;
            }

            // Validate grid size
            if (aiResult.Grid.Length != 12 || aiResult.Grid.Any(row => row.Length != 12))
            {
                _logger.LogWarning("Invalid grid size in word search board");
                return null;
            }

            // Validate word count
            if (aiResult.Words.Count != 8)
            {
                _logger.LogWarning("Invalid word count: {Count}, expected 8", aiResult.Words.Count);
                return null;
            }

            // Ensure all grid letters are uppercase
            for (int y = 0; y < 12; y++)
            {
                for (int x = 0; x < 12; x++)
                {
                    aiResult.Grid[y][x] = aiResult.Grid[y][x].ToUpper();
                }
            }

            // Convert AI response to result with validated positions
            var result = new WordSearchBoardResult
            {
                Grid = aiResult.Grid,
                Words = new List<WordPosition>()
            };

            foreach (var wordInfo in aiResult.Words)
            {
                var word = wordInfo.Word.ToUpper();
                var (dx, dy) = GetDirection(wordInfo.Dir);

                // Calculate end position
                var endX = wordInfo.X + (word.Length - 1) * dx;
                var endY = wordInfo.Y + (word.Length - 1) * dy;

                // Validate bounds
                if (wordInfo.X < 0 || wordInfo.X >= 12 || wordInfo.Y < 0 || wordInfo.Y >= 12 ||
                    endX < 0 || endX >= 12 || endY < 0 || endY >= 12)
                {
                    _logger.LogWarning("Word {Word} is out of bounds: start({X},{Y}) end({EndX},{EndY})",
                        word, wordInfo.X, wordInfo.Y, endX, endY);
                    return null;
                }

                // Validate word is actually in grid at specified position
                bool valid = true;
                for (int i = 0; i < word.Length; i++)
                {
                    var gx = wordInfo.X + i * dx;
                    var gy = wordInfo.Y + i * dy;
                    if (aiResult.Grid[gy][gx] != word[i].ToString())
                    {
                        _logger.LogWarning("Word {Word} not found at position ({X},{Y}) dir={Dir}. Expected '{Expected}' at ({GX},{GY}) but found '{Found}'",
                            word, wordInfo.X, wordInfo.Y, wordInfo.Dir, word[i], gx, gy, aiResult.Grid[gy][gx]);
                        valid = false;
                        break;
                    }
                }

                if (!valid) return null;

                result.Words.Add(new WordPosition
                {
                    Word = word,
                    StartX = wordInfo.X,
                    StartY = wordInfo.Y,
                    EndX = endX,
                    EndY = endY
                });
            }

            _logger.LogInformation("Word search board generated with words: {Words} (difficulty: {Difficulty})",
                string.Join(", ", result.Words.Select(w => w.Word)), diff);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing word search board response");
            return null;
        }
    }

    private static (int dx, int dy) GetDirection(string dir)
    {
        return dir?.ToLower() switch
        {
            "right" => (1, 0),
            "down" => (0, 1),
            "diag-down" => (1, 1),
            "diag-up" => (1, -1),
            _ => (1, 0) // default to right
        };
    }

    // Request/Response models

    private class WordSearchRequest
    {
        public string? Difficulty { get; set; }
    }

    // AI response format (what ChatGPT returns)
    private class AIWordSearchResponse
    {
        public string[][] Grid { get; set; } = Array.Empty<string[]>();
        public List<AIWordInfo> Words { get; set; } = new();
    }

    private class AIWordInfo
    {
        public string Word { get; set; } = "";
        public int X { get; set; }
        public int Y { get; set; }
        public string Dir { get; set; } = "right";
    }

    // Result format (what we send to frontend)
    private class WordSearchBoardResult
    {
        public string[][] Grid { get; set; } = Array.Empty<string[]>();
        public List<WordPosition> Words { get; set; } = new();
    }

    private class WordPosition
    {
        public string Word { get; set; } = "";
        public int StartX { get; set; }
        public int StartY { get; set; }
        public int EndX { get; set; }
        public int EndY { get; set; }
    }
}
