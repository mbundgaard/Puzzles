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

        // Try up to 3 times to generate valid questions
        for (int attempt = 0; attempt < 3; attempt++)
        {
            var questions = await GenerateQuestionsAsync(request.Language, request.Category);
            if (questions != null && questions.Count == 12)
            {
                _logger.LogInformation("Quiz generated: {Category} ({Language}), attempt {Attempt}",
                    request.Category, request.Language, attempt + 1);

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

    private async Task<List<QuizQuestion>?> GenerateQuestionsAsync(string language, string category)
    {
        var outputLanguage = language.ToLower() switch
        {
            "da" => "Danish",
            "en" => "English",
            "fr" => "French",
            _ => "English"
        };

        var systemPrompt = $@"You are a quiz generator. Generate exactly 12 trivia questions about: {category}

IMPORTANT: Write all questions and answers in {outputLanguage}.

Rules:
1. Generate EXACTLY 12 questions
2. Questions 1-4: EASY (common knowledge, most people can answer)
3. Questions 5-8: MEDIUM (requires some knowledge)
4. Questions 9-12: HARD (specific knowledge, challenging)
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

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = $"Generate 12 quiz questions about: {category}" } },
            new AIRequestOptions { Temperature = 0.8 }
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
        public string Category { get; set; } = "";
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
