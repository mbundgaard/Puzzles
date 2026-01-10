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
        var languageInstructions = language.ToLower() switch
        {
            "da" => "Skriv alle spørgsmål og svar på DANSK.",
            "en" => "Write all questions and answers in ENGLISH.",
            "fr" => "Écrivez toutes les questions et réponses en FRANÇAIS.",
            _ => "Write all questions and answers in ENGLISH."
        };

        var systemPrompt = $@"Du er en quiz-generator. Generer præcis 12 trivia-spørgsmål om emnet: {category}

{languageInstructions}

Regler:
1. Generer PRÆCIS 12 spørgsmål
2. Spørgsmål 1-4: NEMME (almindelig viden, de fleste kan svare)
3. Spørgsmål 5-8: MELLEM (kræver noget viden)
4. Spørgsmål 9-12: SVÆRE (specifik viden, udfordrende)
5. Hvert spørgsmål har PRÆCIS 4 svarmuligheder
6. Kun ÉT svar er korrekt
7. Placer det korrekte svar på en TILFÆLDIG position (0-3) for hvert spørgsmål
8. Forkerte svar skal være plausible men tydeligt forkerte
9. Ingen trick-spørgsmål eller tvetydige svar
10. Alle fakta skal være korrekte

Svar KUN med JSON i dette format:
{{
  ""questions"": [
    {{
      ""question"": ""Spørgsmålstekst her?"",
      ""options"": [""Svar A"", ""Svar B"", ""Svar C"", ""Svar D""],
      ""correct"": 2
    }}
  ]
}}

correct er index (0-3) på det rigtige svar i options-arrayet.";

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = $"Generer 12 quiz-spørgsmål om: {category}" } },
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
