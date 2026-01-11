// ============================================================================
// Game 04: Quiz Mester (Quiz Master)
// ============================================================================

using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Services;
using Puzzles.Storage;

namespace Puzzles.Functions.Games;

public class Game04Function
{
    private readonly ILogger<Game04Function> _logger;
    private readonly IAIService _aiService;
    private readonly IQuizQuestionStorage _questionStorage;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public Game04Function(ILogger<Game04Function> logger, IAIService aiService, IQuizQuestionStorage questionStorage)
    {
        _logger = logger;
        _aiService = aiService;
        _questionStorage = questionStorage;
    }

    [Function("QuizGenerate")]
    public async Task<IActionResult> Generate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/04/generate")] HttpRequest req)
    {
        QuizRequest? request;

        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            request = JsonSerializer.Deserialize<QuizRequest>(body, JsonOptions);
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

        // Validate difficulty (1-5)
        var difficulty = request.Difficulty;
        if (difficulty < 1) difficulty = 1;
        if (difficulty > 5) difficulty = 5;

        // Validate count (1-20 questions)
        var count = request.Count;
        if (count < 1) count = 1;
        if (count > 20) count = 20;

        if (!_aiService.IsConfigured)
        {
            return new ObjectResult(new { error = "AI service not configured" }) { StatusCode = 503 };
        }

        // Derive audience from category ID (K = kids, A = adults)
        var isKids = request.CategoryId?.StartsWith("K", StringComparison.OrdinalIgnoreCase) == true;

        // Get user info for tracking asked questions
        var nickname = string.IsNullOrWhiteSpace(request.Nickname) ? "anonymous" : request.Nickname.Trim();
        var categoryId = request.CategoryId ?? "unknown";
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

        // Fetch previously asked questions for this user/category/date
        var excludeQuestions = await _questionStorage.GetAskedQuestionsAsync(today, nickname, categoryId);

        // Try up to 3 times to generate valid questions
        for (int attempt = 0; attempt < 3; attempt++)
        {
            var stopwatch = Stopwatch.StartNew();
            var questions = await GenerateQuestionsAsync(request.Language, request.Category, isKids, difficulty, count, excludeQuestions);
            stopwatch.Stop();
            var elapsedMs = stopwatch.ElapsedMilliseconds;

            if (questions != null && questions.Count == count)
            {
                _logger.LogInformation("Quiz generated: {CategoryId} {Category} ({Language}, {Audience}, {Difficulty}, {Count}), attempt {Attempt}, excluded {ExcludeCount} questions, user {Nickname}, {ElapsedMs}ms",
                    request.CategoryId, request.Category, request.Language, isKids ? "kids" : "adults", difficulty, count, attempt + 1, excludeQuestions.Count, nickname, elapsedMs);

                // Save the questions so they won't be asked again today
                var questionTexts = questions.Select(q => q.Question).ToList();
                _ = _questionStorage.SaveQuestionsAsync(today, nickname, categoryId, questionTexts, elapsedMs);

                return new OkObjectResult(new QuizResponse
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

    private async Task<List<QuizQuestion>?> GenerateQuestionsAsync(string language, string category, bool isKids, int difficulty, int count, List<string> excludeQuestions)
    {
        var outputLanguage = language.ToLower() switch
        {
            "da" => "Danish",
            "en" => "English",
            "fr" => "French",
            _ => "English"
        };

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

        // Difficulty guidance based on 1-5 scale
        var difficultyGuidance = (difficulty, isKids) switch
        {
            (1, true) => "VERY EASY - Basic facts any child would know, extremely simple questions.",
            (1, false) => "VERY EASY - Common knowledge that almost everyone knows, trivial facts.",
            (2, true) => "EASY - Simple facts children learn in early school years.",
            (2, false) => "EASY - Basic facts most people know, straightforward questions.",
            (3, true) => "MEDIUM - Requires some knowledge, accessible to attentive children.",
            (3, false) => "MEDIUM - Requires general knowledge, moderately challenging.",
            (4, true) => "HARD - Challenging for children, requires good knowledge of the topic.",
            (4, false) => "HARD - Requires specific knowledge, challenging questions.",
            (5, true) => "VERY HARD - Expert level for children, only those deeply interested in the topic would know.",
            (5, false) => "VERY HARD - Expert level, obscure facts, requires specialized knowledge.",
            _ => "MEDIUM - Requires general knowledge, moderately challenging."
        };

        // Build exclusion instruction if there are questions to exclude
        var exclusionInstruction = "";
        if (excludeQuestions.Count > 0)
        {
            var questionsToExclude = string.Join("\n", excludeQuestions.Take(50).Select(q => $"- {q}"));
            exclusionInstruction = $@"

IMPORTANT - DO NOT generate any questions similar to these previously asked questions:
{questionsToExclude}

Generate completely different questions on different aspects of the topic.";
        }

        var systemPrompt = $@"You are a quiz generator. Generate exactly {count} trivia questions about: {category}

IMPORTANT: Write all questions and answers in {outputLanguage}.

{audienceGuidance}

DIFFICULTY LEVEL: {difficulty}/5
{difficultyGuidance}{exclusionInstruction}

Rules:
1. Generate EXACTLY {count} questions
2. Each question has EXACTLY 4 answer options
3. Only ONE answer is correct
4. Place the correct answer at a RANDOM position (0-3) for each question
5. Wrong answers should be plausible but clearly incorrect
6. No trick questions or ambiguous answers
7. All facts must be accurate

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

        var userMessage = $"Generate {count} quiz questions about: {category}.";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = userMessage } },
            new AIRequestOptions { Model = "gpt-4.1", Temperature = 0.9 }
        );

        if (string.IsNullOrEmpty(response)) return null;

        try
        {
            var result = JsonSerializer.Deserialize<QuizAIResponse>(response, JsonOptions);

            if (result?.Questions == null || result.Questions.Count != count)
            {
                _logger.LogWarning("Invalid question count: expected {Expected}, got {Count}", count, result?.Questions?.Count ?? 0);
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

    private class QuizRequest
    {
        public string Language { get; set; } = "";
        public string? CategoryId { get; set; }
        public string Category { get; set; } = "";
        public int Difficulty { get; set; } = 3; // 1-5 (1=easiest, 5=hardest)
        public int Count { get; set; } = 4; // number of questions (1-4)
        public string? Nickname { get; set; }
    }

    private class QuizResponse
    {
        public required List<QuizQuestion> Questions { get; set; }
    }

    private class QuizAIResponse
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
