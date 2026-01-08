using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Services;

namespace Puzzles.Functions;

public class DanishWordFunction
{
    private readonly ILogger<DanishWordFunction> _logger;
    private readonly IDanishWordService _wordService;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public DanishWordFunction(ILogger<DanishWordFunction> logger, IDanishWordService wordService)
    {
        _logger = logger;
        _wordService = wordService;
    }

    /// <summary>
    /// Validates a single Danish word.
    /// GET /api/danish/validate?word=HUND
    /// </summary>
    [Function("DanishWordValidate")]
    public IActionResult Validate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "danish/validate")] HttpRequest req)
    {
        var word = req.Query["word"].ToString();

        if (string.IsNullOrWhiteSpace(word))
        {
            return new BadRequestObjectResult(new { error = "Missing 'word' parameter" });
        }

        var isValid = _wordService.IsValidWord(word);

        _logger.LogInformation("Word validation: {Word} -> {IsValid}", word.ToUpper(), isValid);

        return new OkObjectResult(new
        {
            word = word.ToUpper(),
            valid = isValid
        });
    }

    /// <summary>
    /// Validates multiple Danish words.
    /// POST /api/danish/validate
    /// Body: { "words": ["HUND", "KAT", "INVALIDWORD"] }
    /// Returns: { "results": [{ "word": "HUND", "valid": true }, ...] }
    /// </summary>
    [Function("DanishWordValidateBatch")]
    public async Task<IActionResult> ValidateBatch(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "danish/validate")] HttpRequest req)
    {
        ValidateBatchRequest? request = null;

        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            if (!string.IsNullOrWhiteSpace(body))
            {
                request = JsonSerializer.Deserialize<ValidateBatchRequest>(body, JsonOptions);
            }
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request?.Words == null || request.Words.Count == 0)
        {
            return new BadRequestObjectResult(new { error = "Missing 'words' array" });
        }

        var results = request.Words.Select(w => new
        {
            word = w?.ToUpper() ?? "",
            valid = !string.IsNullOrWhiteSpace(w) && _wordService.IsValidWord(w)
        }).ToList();

        var validCount = results.Count(r => r.valid);
        _logger.LogInformation("Batch validation: {ValidCount}/{TotalCount} words valid", validCount, results.Count);

        return new OkObjectResult(new
        {
            results,
            validCount,
            totalCount = results.Count
        });
    }

    /// <summary>
    /// Gets random valid Danish words for a given difficulty.
    /// GET /api/danish/random?count=8&difficulty=medium
    /// </summary>
    [Function("DanishWordRandom")]
    public IActionResult GetRandom(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "danish/random")] HttpRequest req)
    {
        var countStr = req.Query["count"].ToString();
        var difficulty = req.Query["difficulty"].ToString();

        if (!int.TryParse(countStr, out var count) || count < 1 || count > 20)
        {
            count = 8;
        }

        if (string.IsNullOrWhiteSpace(difficulty))
        {
            difficulty = "medium";
        }

        var words = _wordService.GetRandomWords(count, difficulty);

        _logger.LogInformation("Random words generated: {Count} words ({Difficulty})", words.Count, difficulty);

        return new OkObjectResult(new
        {
            words,
            difficulty,
            count = words.Count
        });
    }

    /// <summary>
    /// Gets statistics about the word dictionary.
    /// GET /api/danish/stats
    /// </summary>
    [Function("DanishWordStats")]
    public IActionResult GetStats(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "danish/stats")] HttpRequest req)
    {
        return new OkObjectResult(new
        {
            totalWords = _wordService.WordCount,
            easyWords = _wordService.GetRandomWords(0, "easy").Count,
            mediumWords = _wordService.GetRandomWords(0, "medium").Count,
            hardWords = _wordService.GetRandomWords(0, "hard").Count
        });
    }

    private class ValidateBatchRequest
    {
        public List<string>? Words { get; set; }
    }
}
