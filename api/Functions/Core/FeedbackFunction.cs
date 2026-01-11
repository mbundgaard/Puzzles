using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Models;
using Puzzles.Services;

namespace Puzzles.Functions.Core;

public class FeedbackFunction
{
    private readonly ILogger<FeedbackFunction> _logger;
    private readonly IGitHubService _gitHubService;
    private readonly IAIService _aiService;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public FeedbackFunction(ILogger<FeedbackFunction> logger, IGitHubService gitHubService, IAIService aiService)
    {
        _logger = logger;
        _gitHubService = gitHubService;
        _aiService = aiService;
    }

    [Function("SubmitFeedback")]
    public async Task<IActionResult> SubmitFeedback(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "feedback")] HttpRequest req)
    {
        FeedbackRequest? feedbackRequest;
        try
        {
            // Explicitly read as UTF-8 to handle Danish characters (æøå)
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            feedbackRequest = JsonSerializer.Deserialize<FeedbackRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (feedbackRequest == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        // Normalize game number (null/empty = general feedback, "00" = new game suggestion)
        var game = GameValidator.NormalizeGame(feedbackRequest.Game);
        // If game is provided but invalid, reject it
        if (!string.IsNullOrWhiteSpace(feedbackRequest.Game) && game == null)
        {
            return new BadRequestObjectResult(new { error = "Invalid game number" });
        }

        // Get game name from request (caller provides it)
        var gameName = feedbackRequest.GameName?.Trim();

        // Validate text length if provided
        var text = feedbackRequest.Text?.Trim();
        if (text != null && text.Length > 500)
        {
            return new BadRequestObjectResult(new { error = "Feedback text too long (max 500 characters)" });
        }

        // Validate nickname if provided
        var nickname = feedbackRequest.Nickname?.Trim();
        if (nickname != null && (nickname.Length < 2 || nickname.Length > 20))
        {
            nickname = null; // Ignore invalid nickname
        }

        // Determine feedback type based on game value
        var feedbackType = game switch
        {
            "00" => FeedbackType.NewGameSuggestion,
            null => FeedbackType.GeneralFeedback,
            _ => FeedbackType.GameSpecific
        };

        // Process feedback with AI (translate and generate title)
        string? aiTitle = null;
        string? aiTranslation = null;

        if (!string.IsNullOrWhiteSpace(text) && _aiService.IsConfigured)
        {
            var result = await ProcessFeedbackWithAIAsync(text, feedbackType);
            if (result != null)
            {
                aiTitle = result.Title;
                aiTranslation = result.TranslatedText;
            }
        }

        // Create GitHub issue (fire-and-forget, don't block response)
        _ = _gitHubService.CreateFeedbackIssueAsync(game, gameName, text, nickname, aiTitle, aiTranslation);

        _logger.LogInformation("Feedback submitted: game={Game}, aiProcessed={AiProcessed}",
            game, aiTitle != null);

        return new OkObjectResult(new { success = true, message = "Tak for din feedback!" });
    }

    // AI methods with prompts
    
    private async Task<FeedbackProcessingResult?> ProcessFeedbackWithAIAsync(string text, FeedbackType feedbackType)
    {
        var systemPrompt = feedbackType switch
        {
            FeedbackType.NewGameSuggestion =>
                "You process game suggestions for a puzzle games website. Given user feedback (possibly in Danish), respond with JSON containing: 1) 'title': a concise English title (max 50 chars) describing the suggested game, 2) 'translatedText': the full feedback translated to English. Keep the title descriptive but brief, like 'Maze game with fog of war' or 'Multiplayer word guessing game'.",
            FeedbackType.GeneralFeedback =>
                "You process general feedback for a puzzle games website. Given feedback (possibly in Danish), respond with JSON containing: 1) 'title': a concise English title (max 50 chars) summarizing the feedback, 2) 'translatedText': the full feedback translated to English. This is about the website/app itself, not a specific game. Title examples: 'Add dark mode option', 'Improve loading speed', 'Request for notifications'.",
            _ =>
                "You process user feedback for a puzzle games website. Given feedback (possibly in Danish), respond with JSON containing: 1) 'title': a concise English title (max 50 chars) summarizing the feedback, 2) 'translatedText': the full feedback translated to English. The title should capture the main point, like 'Request for movable pieces' or 'Bug: Timer not resetting'."
        };

        var response = await _aiService.GenerateAsync(
            systemPrompt,
            new[] { new AIMessage { Role = "user", Content = text } },
            new AIRequestOptions { Temperature = 0.3 }
        );

        if (string.IsNullOrEmpty(response))
        {
            return null;
        }

        try
        {
            var result = JsonSerializer.Deserialize<FeedbackProcessingResult>(response, JsonOptions);
            if (result == null || string.IsNullOrEmpty(result.Title))
            {
                _logger.LogWarning("Failed to parse AI response: {Content}", response);
                return null;
            }

            _logger.LogInformation("Feedback processed: '{Title}'", result.Title);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing AI response");
            return null;
        }
    }

}
