using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Services;

namespace Puzzles.Functions;

public class WordSearchFunction
{
    private readonly ILogger<WordSearchFunction> _logger;
    private readonly IChatGPTService _chatGPTService;
    private static readonly Random Random = new();
    private const int GridSize = 12;
    private const string DanishLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ";

    // Valid directions: right, down, diagonal down-right, diagonal up-right
    private static readonly (int dx, int dy)[] Directions = new[]
    {
        (1, 0),   // right (horizontal)
        (0, 1),   // down (vertical)
        (1, 1),   // diagonal down-right
        (1, -1)   // diagonal up-right
    };

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public WordSearchFunction(ILogger<WordSearchFunction> logger, IChatGPTService chatGPTService)
    {
        _logger = logger;
        _chatGPTService = chatGPTService;
    }

    [Function("WordSearchGenerate")]
    public async Task<IActionResult> Generate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/27/generate")] HttpRequest req)
    {
        WordSearchRequest? request = null;

        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
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

        var difficulty = request?.Difficulty?.Trim() ?? "medium";

        // Try up to 3 times to generate a valid board
        for (int attempt = 0; attempt < 3; attempt++)
        {
            var wordResult = await _chatGPTService.GenerateWordSearchAsync(difficulty);
            if (wordResult == null)
            {
                continue;
            }

            var boardResult = GenerateBoard(wordResult.Words);
            if (boardResult != null)
            {
                _logger.LogInformation("Word search board generated with {Count} words (difficulty: {Difficulty})",
                    boardResult.Words.Count, difficulty);

                return new OkObjectResult(boardResult);
            }

            _logger.LogWarning("Failed to place all words, retrying... (attempt {Attempt})", attempt + 1);
        }

        return new ObjectResult(new { error = "Kunne ikke generere ordsøgning. Prøv igen." })
        {
            StatusCode = 503
        };
    }

    private WordSearchResponse? GenerateBoard(List<string> words)
    {
        var grid = new string[GridSize, GridSize];
        var wordPositions = new List<WordPosition>();

        // Initialize empty grid
        for (int y = 0; y < GridSize; y++)
        {
            for (int x = 0; x < GridSize; x++)
            {
                grid[x, y] = "";
            }
        }

        // Sort words by length (longest first for better placement)
        var sortedWords = words.OrderByDescending(w => w.Length).ToList();

        // Place each word
        foreach (var word in sortedWords)
        {
            var placed = PlaceWord(grid, word, wordPositions);
            if (!placed)
            {
                _logger.LogWarning("Could not place word: {Word}", word);
                return null; // Failed to place all words
            }
        }

        // Fill empty cells with random letters
        for (int y = 0; y < GridSize; y++)
        {
            for (int x = 0; x < GridSize; x++)
            {
                if (string.IsNullOrEmpty(grid[x, y]))
                {
                    grid[x, y] = DanishLetters[Random.Next(DanishLetters.Length)].ToString();
                }
            }
        }

        // Convert grid to 2D array for JSON
        var gridArray = new string[GridSize][];
        for (int y = 0; y < GridSize; y++)
        {
            gridArray[y] = new string[GridSize];
            for (int x = 0; x < GridSize; x++)
            {
                gridArray[y][x] = grid[x, y];
            }
        }

        return new WordSearchResponse
        {
            Grid = gridArray,
            Words = wordPositions
        };
    }

    private bool PlaceWord(string[,] grid, string word, List<WordPosition> wordPositions)
    {
        const int maxAttempts = 100;

        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            var (dx, dy) = Directions[Random.Next(Directions.Length)];

            // Calculate valid starting positions
            int minX = 0, maxX = GridSize - 1;
            int minY = 0, maxY = GridSize - 1;

            if (dx > 0) maxX = GridSize - word.Length;
            if (dy > 0) maxY = GridSize - word.Length;
            if (dy < 0) minY = word.Length - 1;

            if (minX > maxX || minY > maxY) continue;

            int startX = minX + Random.Next(maxX - minX + 1);
            int startY = minY + Random.Next(maxY - minY + 1);

            // Check if word fits
            bool canPlace = true;
            var positions = new List<(int x, int y, char letter)>();

            for (int i = 0; i < word.Length; i++)
            {
                int x = startX + i * dx;
                int y = startY + i * dy;
                char letter = word[i];

                if (!string.IsNullOrEmpty(grid[x, y]) && grid[x, y][0] != letter)
                {
                    canPlace = false;
                    break;
                }
                positions.Add((x, y, letter));
            }

            if (canPlace)
            {
                // Place the word
                foreach (var (x, y, letter) in positions)
                {
                    grid[x, y] = letter.ToString();
                }

                wordPositions.Add(new WordPosition
                {
                    Word = word,
                    StartX = startX,
                    StartY = startY,
                    EndX = startX + (word.Length - 1) * dx,
                    EndY = startY + (word.Length - 1) * dy
                });

                return true;
            }
        }

        return false;
    }

    private class WordSearchRequest
    {
        public string? Difficulty { get; set; }
    }

    private class WordSearchResponse
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
