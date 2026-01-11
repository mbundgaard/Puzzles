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
        var language = request?.Language?.Trim()?.ToLower() ?? "en";

        var outputLanguage = language switch
        {
            "da" => "Danish",
            "fr" => "French",
            _ => "English"
        };

        // Try up to 3 times to generate a valid board
        for (int attempt = 0; attempt < 3; attempt++)
        {
            var result = await GenerateWordSearchBoardAsync(difficulty, outputLanguage);
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

    private async Task<WordSearchBoardResult?> GenerateWordSearchBoardAsync(string difficulty, string outputLanguage)
    {
        var diff = string.IsNullOrWhiteSpace(difficulty) ? "medium" : difficulty.ToLower();

        var (minLen, maxLen) = diff switch
        {
            "easy" => (3, 5),
            "medium" => (5, 7),
            _ => (6, 10)
        };

        var systemPrompt = $@"Return exactly 8 {outputLanguage} nouns for a word search game.
Requirements:
- Each word must be {minLen}-{maxLen} letters long
- All uppercase letters
- Real {outputLanguage} words only
- No duplicates

Return ONLY a JSON array like: [""DOG"", ""CAT"", ""SUN"", ""CAR"", ""HOUSE"", ""FOOD"", ""BOAT"", ""SEA""]";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = $"Give me 8 {outputLanguage} words" } },
            new AIRequestOptions { Temperature = 0.7, Model = "gpt-4.1-mini" }
        );

        if (string.IsNullOrEmpty(response)) return null;

        _logger.LogWarning("AI response: {Response}", response);

        try
        {
            // Extract JSON array from response (AI might wrap it in markdown or text)
            var jsonStart = response.IndexOf('[');
            var jsonEnd = response.LastIndexOf(']');
            if (jsonStart == -1 || jsonEnd == -1 || jsonEnd <= jsonStart)
            {
                _logger.LogWarning("No JSON array found in response: {Response}", response);
                return null;
            }
            var jsonArray = response.Substring(jsonStart, jsonEnd - jsonStart + 1);

            // Handle escaped JSON (e.g., [\"WORD\"] -> ["WORD"])
            if (jsonArray.Contains("\\\""))
            {
                jsonArray = jsonArray.Replace("\\\"", "\"");
            }

            var words = JsonSerializer.Deserialize<List<string>>(jsonArray, JsonOptions);
            if (words == null || words.Count != 8)
            {
                _logger.LogWarning("Invalid word count: {Count}, expected 8", words?.Count ?? 0);
                return null;
            }

            // Normalize words and filter out any that are too long for the grid
            words = words
                .Select(w => w.ToUpper().Trim())
                .Where(w => w.Length <= 12 && w.Length >= 2)
                .ToList();

            if (words.Count < 8)
            {
                _logger.LogWarning("Not enough valid words after filtering: {Count}", words.Count);
                return null;
            }
            words = words.Take(8).ToList();

            // Build the grid programmatically
            var grid = new string[12][];
            for (int i = 0; i < 12; i++)
                grid[i] = new string[12];

            var wordPositions = new List<WordPosition>();
            var random = new Random();
            var directions = new[] { (1, 0), (0, 1), (1, 1), (1, -1) }; // right, down, diag-down, diag-up
            var dirNames = new[] { "right", "down", "diag-down", "diag-up" };

            foreach (var word in words)
            {
                bool placed = false;
                int attempts = 0;

                while (!placed && attempts < 100)
                {
                    attempts++;
                    var dirIdx = random.Next(directions.Length);
                    var (dx, dy) = directions[dirIdx];

                    // Calculate valid start positions
                    int maxX = dx == 0 ? 11 : 11 - (word.Length - 1);
                    int minY = dy == -1 ? word.Length - 1 : 0;
                    int maxY = dy == 1 ? 11 - (word.Length - 1) : 11;

                    if (maxX < 0 || maxY < minY) continue;

                    int startX = random.Next(0, maxX + 1);
                    int startY = random.Next(minY, maxY + 1);

                    // Check if word fits without conflicts
                    bool fits = true;
                    for (int i = 0; i < word.Length && fits; i++)
                    {
                        int gx = startX + i * dx;
                        int gy = startY + i * dy;
                        var existing = grid[gy][gx];
                        if (existing != null && existing != word[i].ToString())
                            fits = false;
                    }

                    if (fits)
                    {
                        // Place the word
                        for (int i = 0; i < word.Length; i++)
                        {
                            int gx = startX + i * dx;
                            int gy = startY + i * dy;
                            grid[gy][gx] = word[i].ToString();
                        }

                        wordPositions.Add(new WordPosition
                        {
                            Word = word,
                            StartX = startX,
                            StartY = startY,
                            EndX = startX + (word.Length - 1) * dx,
                            EndY = startY + (word.Length - 1) * dy
                        });
                        placed = true;
                    }
                }

                if (!placed)
                {
                    _logger.LogWarning("Could not place word: {Word}", word);
                    return null;
                }
            }

            // Fill empty cells with random letters (include Danish/French special chars for those languages)
            var letters = outputLanguage switch
            {
                "Danish" => "ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ",
                "French" => "ABCDEFGHIJKLMNOPQRSTUVWXYZÉÈÊËÀÂÙÛÔÎÏÇ",
                _ => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            };
            for (int y = 0; y < 12; y++)
            {
                for (int x = 0; x < 12; x++)
                {
                    if (grid[y][x] == null)
                        grid[y][x] = letters[random.Next(letters.Length)].ToString();
                }
            }

            _logger.LogInformation("Word search board generated with words: {Words} (difficulty: {Difficulty})",
                string.Join(", ", wordPositions.Select(w => w.Word)), diff);

            return new WordSearchBoardResult
            {
                Grid = grid,
                Words = wordPositions
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating word search board");
            return null;
        }
    }

    // Request/Response models

    private class WordSearchRequest
    {
        public string? Difficulty { get; set; }
        public string? Language { get; set; }
    }

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
