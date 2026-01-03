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

        var result = await _chatGPTService.GenerateWordSearchAsync(difficulty);
        if (result == null)
        {
            return new ObjectResult(new { error = "Kunne ikke generere ordsøgning. Prøv igen." })
            {
                StatusCode = 503
            };
        }

        _logger.LogInformation("Word search generated with {Count} words (difficulty: {Difficulty})", result.Words.Count, difficulty);

        return new OkObjectResult(new WordSearchResponse
        {
            Words = result.Words
        });
    }

    private class WordSearchRequest
    {
        public string? Difficulty { get; set; }
    }

    private class WordSearchResponse
    {
        public List<string> Words { get; set; } = new();
    }
}
