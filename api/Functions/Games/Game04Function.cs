// ============================================================================
// Game 04: Quiz Mester (Quiz Master)
// ============================================================================

using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Services;

namespace Puzzles.Functions.Games;

public class Game04Function
{
    private readonly ILogger<Game04Function> _logger;
    private readonly IAIService _aiService;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public Game04Function(ILogger<Game04Function> logger, IAIService aiService)
    {
        _logger = logger;
        _aiService = aiService;
    }

    [Function("QuizGenerate")]
    public async Task<IActionResult> Generate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/04/generate")] HttpRequest req)
    {
        QuizGenerateRequest? request;

        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            request = JsonSerializer.Deserialize<QuizGenerateRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        if (string.IsNullOrWhiteSpace(request.Category))
        {
            return new BadRequestObjectResult(new { error = "Category is required" });
        }

        if (string.IsNullOrWhiteSpace(request.Language))
        {
            return new BadRequestObjectResult(new { error = "Language is required" });
        }

        if (!_aiService.IsConfigured)
        {
            return new ObjectResult(new { error = "AI service not configured" }) { StatusCode = 503 };
        }

        // Derive audience from category ID (K = kids, A = adults)
        var isKids = request.CategoryId?.StartsWith("K", StringComparison.OrdinalIgnoreCase) == true;

        // Try up to 3 times to generate valid questions
        for (int attempt = 0; attempt < 3; attempt++)
        {
            var questions = await GenerateQuestionsAsync(request.Language, request.Category, isKids, request.Seed);
            if (questions != null && questions.Count == 12)
            {
                _logger.LogInformation("Quiz generated: {CategoryId} {Category} ({Language}, {Audience}), attempt {Attempt}",
                    request.CategoryId, request.Category, request.Language, isKids ? "kids" : "adults", attempt + 1);

                return new OkObjectResult(new QuizGenerateResponse
                {
                    Questions = questions
                });
            }

            _logger.LogWarning("Quiz generation attempt {Attempt} failed for {Category}", attempt + 1, request.Category);
        }

        return new ObjectResult(new { error = "Could not generate quiz. Please try again." })
        {
            StatusCode = 503
        };
    }

    // Focus areas to ensure variety - rotated based on seed
    private static readonly string[] FocusAreas = new[]
    {
        "people and personalities",
        "dates and timelines",
        "places and locations",
        "events and milestones",
        "numbers and statistics",
        "origins and history",
        "innovations and changes",
        "comparisons and records",
        "culture and traditions",
        "technical details"
    };

    private async Task<List<QuizQuestion>?> GenerateQuestionsAsync(string language, string category, bool isKids, int? seed)
    {
        var outputLanguage = language.ToLower() switch
        {
            "da" => "Danish",
            "en" => "English",
            "fr" => "French",
            _ => "English"
        };

        // Use seed to select different focus areas for variety
        var actualSeed = seed ?? Random.Shared.Next();
        var focus1 = FocusAreas[actualSeed % FocusAreas.Length];
        var focus2 = FocusAreas[(actualSeed / 10) % FocusAreas.Length];
        var focus3 = FocusAreas[(actualSeed / 100) % FocusAreas.Length];

        var audienceGuidance = isKids
            ? @"TARGET AUDIENCE: CHILDREN (ages 8-12)
- Use simple, clear language appropriate for children
- Focus on fun, engaging facts that kids find interesting
- Avoid complex vocabulary, abstract concepts, or adult themes
- Questions should be educational but entertaining
- Use concrete examples kids can relate to"
            : @"TARGET AUDIENCE: ADULTS
- Questions can include complex topics and vocabulary
- Include historical dates, technical details, and nuanced facts
- Challenge players with deeper knowledge";

        var systemPrompt = $@"You are a quiz generator. Generate exactly 12 trivia questions about: {category}

IMPORTANT: Write all questions and answers in {outputLanguage}.

{audienceGuidance}

For variety, this quiz (session {actualSeed}) should include some questions about: {focus1}, {focus2}, {focus3}

Rules:
1. Generate EXACTLY 12 questions
2. Questions 1-4: EASY - basic facts{(isKids ? " that children would learn in school" : " that most people know")}
3. Questions 5-8: MEDIUM - requires some knowledge but still accessible{(isKids ? " to children" : "")}
4. Questions 9-12: HARD - {(isKids ? "challenging for children but still age-appropriate" : "specific knowledge, challenging, can be obscure")}
5. Each question has EXACTLY 4 answer options
6. Only ONE answer is correct
7. Place the correct answer at a RANDOM position (0-3) for each question
8. Wrong answers should be plausible but clearly incorrect
9. No trick questions or ambiguous answers
10. All facts must be accurate

Respond ONLY with JSON in this format:
{{
  ""questions"": [
    {{
      ""question"": ""Question text here?"",
      ""options"": [""Answer A"", ""Answer B"", ""Answer C"", ""Answer D""],
      ""correct"": 2
    }}
  ]
}}

correct is the index (0-3) of the correct answer in the options array.";

        var userMessage = $"Generate 12 quiz questions about: {category}. Session ID: {actualSeed}.";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = userMessage } },
            new AIRequestOptions { Temperature = 0.9 }
        );

        if (string.IsNullOrEmpty(response)) return null;

        try
        {
            var result = JsonSerializer.Deserialize<QuizGenerateResult>(response, JsonOptions);

            if (result?.Questions == null || result.Questions.Count != 12)
            {
                _logger.LogWarning("Invalid question count: {Count}", result?.Questions?.Count ?? 0);
                return null;
            }

            // Validate each question
            foreach (var q in result.Questions)
            {
                if (string.IsNullOrWhiteSpace(q.Question) ||
                    q.Options == null ||
                    q.Options.Count != 4 ||
                    q.Correct < 0 ||
                    q.Correct > 3)
                {
                    _logger.LogWarning("Invalid question format detected");
                    return null;
                }
            }

            return result.Questions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing quiz response: {Response}", response);
            return null;
        }
    }

    // Request/Response models

    private class QuizGenerateRequest
    {
        public string Language { get; set; } = "";
        public string? CategoryId { get; set; }
        public string Category { get; set; } = "";
        public int? Seed { get; set; }
    }

    private class QuizGenerateResponse
    {
        public required List<QuizQuestion> Questions { get; set; }
    }

    private class QuizGenerateResult
    {
        public List<QuizQuestion>? Questions { get; set; }
    }

    private class QuizQuestion
    {
        public string Question { get; set; } = "";
        public List<string> Options { get; set; } = new();
        public int Correct { get; set; }
    }
}
