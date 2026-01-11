// ============================================================================
// Game 29: Maskeværk (Knitting Pattern Puzzle)
// ============================================================================

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Services;

namespace Puzzles.Functions.Games;

public class Game29Function
{
    private readonly ILogger<Game29Function> _logger;
    private readonly IAIService _aiService;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // Valid stitch values
    private static readonly HashSet<string> ValidStitches = new() { "KL", "KM", "PL", "PM" };

    public Game29Function(ILogger<Game29Function> logger, IAIService aiService)
    {
        _logger = logger;
        _aiService = aiService;
    }

    [Function("Game29Generate")]
    public async Task<IActionResult> Generate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/29/generate")] HttpRequest req)
    {
        PatternRequest? request = null;

        try
        {
            using var reader = new StreamReader(req.Body);
            var body = await reader.ReadToEndAsync();
            if (!string.IsNullOrWhiteSpace(body))
            {
                request = JsonSerializer.Deserialize<PatternRequest>(body, JsonOptions);
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

        var language = request?.Language?.Trim()?.ToLower() ?? "en";

        var outputLanguage = language switch
        {
            "da" => "Danish",
            "fr" => "French",
            _ => "English"
        };

        // Try up to 3 times to generate a valid pattern
        for (int attempt = 0; attempt < 3; attempt++)
        {
            var result = await GeneratePatternAsync(outputLanguage);
            if (result != null)
            {
                _logger.LogInformation("Knitting pattern generated: {Name}", result.Name);
                return new OkObjectResult(result);
            }

            _logger.LogWarning("Failed to generate knitting pattern, retrying... (attempt {Attempt})", attempt + 1);
        }

        return new ObjectResult(new { error = "Kunne ikke generere mønster. Prøv igen." })
        {
            StatusCode = 503
        };
    }

    private async Task<PatternResult?> GeneratePatternAsync(string outputLanguage)
    {
        var systemPrompt = $@"You generate knitting patterns for a puzzle game.

Create a pattern for a 10x6 grid (10 columns, 6 rows).
Each cell must have one of these 4 values:
- KL = Knit stitch in light color
- KM = Knit stitch in dark color
- PL = Purl stitch in light color
- PM = Purl stitch in dark color

The pattern must follow a logical rule that the user can understand from the description.

Examples of patterns:
- Checkerboard: 2x2 blocks alternating colors
- Stripes: Rows or columns alternating
- Frame: Border in one color, center in another
- Diagonal: Slanted lines
- Rib: Alternating knit and purl
- Combination of the above

IMPORTANT:
- The description (recipe) must be precise enough for the user to fill the entire grid
- Use rows 1-6 (not 0-5) and columns 1-10 (not 0-9) in the description
- Be specific about when to use knit/purl and light/dark
- IMPORTANT: The name and recipe must be in {outputLanguage}

Respond with JSON in this format:
{{
  ""name"": ""Checkerboard"",
  ""recipe"": ""Detailed description of the pattern..."",
  ""solution"": [
    [""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM""],
    [""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL""],
    [""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM""],
    [""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL""],
    [""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM""],
    [""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL""]
  ]
}}

Be creative with the pattern - make something interesting and varied!";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = "Generate a knitting pattern" } },
            new AIRequestOptions { Temperature = 0.9 }
        );

        if (string.IsNullOrEmpty(response)) return null;

        try
        {
            var result = JsonSerializer.Deserialize<PatternResult>(response, JsonOptions);
            if (result == null || result.Solution == null || string.IsNullOrEmpty(result.Name) || string.IsNullOrEmpty(result.Recipe))
            {
                _logger.LogWarning("Failed to parse pattern response: {Content}", response);
                return null;
            }

            // Validate grid size (6 rows, 10 columns)
            if (result.Solution.Length != 6)
            {
                _logger.LogWarning("Invalid row count: {Count}, expected 6", result.Solution.Length);
                return null;
            }

            for (int row = 0; row < 6; row++)
            {
                if (result.Solution[row].Length != 10)
                {
                    _logger.LogWarning("Invalid column count in row {Row}: {Count}, expected 10", row, result.Solution[row].Length);
                    return null;
                }

                // Validate each stitch value
                for (int col = 0; col < 10; col++)
                {
                    var stitch = result.Solution[row][col].ToUpper();
                    if (!ValidStitches.Contains(stitch))
                    {
                        _logger.LogWarning("Invalid stitch value at [{Row},{Col}]: {Value}", row, col, stitch);
                        return null;
                    }
                    result.Solution[row][col] = stitch;
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing pattern response");
            return null;
        }
    }

    // Request/Response models
    private class PatternRequest
    {
        public string? Language { get; set; }
    }

    private class PatternResult
    {
        public string Name { get; set; } = "";
        public string Recipe { get; set; } = "";
        public string[][] Solution { get; set; } = Array.Empty<string[]>();
    }
}
