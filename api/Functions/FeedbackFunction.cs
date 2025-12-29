using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Models;
using Puzzles.Services;
using Puzzles.Storage;

namespace Puzzles.Functions;

public class FeedbackFunction
{
    private readonly ILogger<FeedbackFunction> _logger;
    private readonly IFeedbackStorage _storage;
    private readonly IGitHubService _gitHubService;

    public FeedbackFunction(ILogger<FeedbackFunction> logger, IFeedbackStorage storage, IGitHubService gitHubService)
    {
        _logger = logger;
        _storage = storage;
        _gitHubService = gitHubService;
    }

    [Function("SubmitFeedback")]
    public async Task<IActionResult> SubmitFeedback(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "feedback")] HttpRequest req)
    {
        FeedbackRequest? feedbackRequest;
        try
        {
            feedbackRequest = await req.ReadFromJsonAsync<FeedbackRequest>();
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (feedbackRequest == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        // Validate and normalize game number
        var game = GameValidator.NormalizeGame(feedbackRequest.Game);
        if (game == null)
        {
            return new BadRequestObjectResult(new { error = "Invalid game number" });
        }

        // Validate rating (1-5)
        if (feedbackRequest.Rating < 1 || feedbackRequest.Rating > 5)
        {
            return new BadRequestObjectResult(new { error = "Rating must be between 1 and 5" });
        }

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

        var record = new FeedbackRecord
        {
            Game = game,
            Rating = feedbackRequest.Rating,
            Text = string.IsNullOrEmpty(text) ? null : text,
            Nickname = nickname,
            Timestamp = DateTime.UtcNow
        };

        await _storage.RecordFeedbackAsync(record);

        // Create GitHub issue (fire-and-forget, don't block response)
        _ = _gitHubService.CreateFeedbackIssueAsync(game, feedbackRequest.Rating, text, nickname);

        _logger.LogInformation("Feedback recorded: game={Game}, rating={Rating}", game, feedbackRequest.Rating);

        return new OkObjectResult(new { success = true, message = "Tak for din feedback!" });
    }

    [Function("GetFeedbackStats")]
    public async Task<IActionResult> GetFeedbackStats(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "feedback/stats")] HttpRequest req)
    {
        var stats = await _storage.GetFeedbackStatsAsync();

        _logger.LogInformation("Feedback stats requested");

        return new OkObjectResult(stats);
    }

    [Function("GetRecentFeedback")]
    public async Task<IActionResult> GetRecentFeedback(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "feedback")] HttpRequest req)
    {
        // Optional game filter
        var gameParam = req.Query["game"].FirstOrDefault();
        string? game = null;

        if (!string.IsNullOrEmpty(gameParam) && gameParam != "all")
        {
            game = GameValidator.NormalizeGame(gameParam);
            if (game == null)
            {
                return new BadRequestObjectResult(new { error = "Invalid game number" });
            }
        }

        // Optional limit
        var limitParam = req.Query["limit"].FirstOrDefault();
        var limit = 50;
        if (int.TryParse(limitParam, out var parsedLimit) && parsedLimit > 0 && parsedLimit <= 100)
        {
            limit = parsedLimit;
        }

        var feedback = await _storage.GetRecentFeedbackAsync(game, limit);

        return new OkObjectResult(new
        {
            count = feedback.Count,
            entries = feedback.Select(f => new
            {
                game = f.Game,
                rating = f.Rating,
                text = f.Text,
                nickname = f.Nickname,
                timestamp = f.Timestamp
            })
        });
    }
}
