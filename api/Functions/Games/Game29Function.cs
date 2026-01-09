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
        if (!_aiService.IsConfigured)
        {
            return new ObjectResult(new { error = "AI service not configured" }) { StatusCode = 503 };
        }

        // Try up to 3 times to generate a valid pattern
        for (int attempt = 0; attempt < 3; attempt++)
        {
            var result = await GeneratePatternAsync();
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

    private async Task<PatternResult?> GeneratePatternAsync()
    {
        var systemPrompt = @"Du genererer strikkemønstre til et puslespil.

Opret et mønster til et 10x6 gitter (10 kolonner, 6 rækker).
Hver celle skal have én af disse 4 værdier:
- KL = Ret maske i lys farve (knit light)
- KM = Ret maske i mørk farve (knit dark)
- PL = Vrang maske i lys farve (purl light)
- PM = Vrang maske i mørk farve (purl dark)

Mønsteret skal følge en logisk regel som brugeren kan forstå ud fra beskrivelsen.

Eksempler på mønstre:
- Skaktern: 2x2 blokke der skifter farve
- Striber: Rækker eller kolonner der skifter
- Ramme: Kant i én farve, midte i anden
- Diagonal: Skrå linjer
- Rib: Skiftevis ret og vrang
- Kombination af ovenstående

VIGTIGT:
- Beskrivelsen (recipe) skal være præcis nok til at brugeren kan udfylde hele gitteret
- Brug række 1-6 (ikke 0-5) og kolonne 1-10 (ikke 0-9) i beskrivelsen
- Vær specifik om hvornår der bruges ret/vrang og lys/mørk

Svar med JSON i dette format:
{
  ""name"": ""Mønstrets navn"",
  ""recipe"": ""Detaljeret dansk beskrivelse af mønsteret..."",
  ""solution"": [
    [""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM""],
    [""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL""],
    [""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM""],
    [""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL""],
    [""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM""],
    [""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL"",""KM"",""KL""]
  ]
}

Vær kreativ med mønsteret - lav noget interessant og varieret!";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = "Generér et strikkemønster" } },
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

    // Response model
    private class PatternResult
    {
        public string Name { get; set; } = "";
        public string Recipe { get; set; } = "";
        public string[][] Solution { get; set; } = Array.Empty<string[]>();
    }
}
