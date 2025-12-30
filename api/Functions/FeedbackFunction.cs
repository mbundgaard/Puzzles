using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Models;
using Puzzles.Services;

namespace Puzzles.Functions;

public class FeedbackFunction
{
    private readonly ILogger<FeedbackFunction> _logger;
    private readonly IGitHubService _gitHubService;

    public FeedbackFunction(ILogger<FeedbackFunction> logger, IGitHubService gitHubService)
    {
        _logger = logger;
        _gitHubService = gitHubService;
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
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            feedbackRequest = JsonSerializer.Deserialize<FeedbackRequest>(body, options);
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

        // Validate rating if provided (1-5)
        if (feedbackRequest.Rating.HasValue && (feedbackRequest.Rating < 1 || feedbackRequest.Rating > 5))
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

        // Create GitHub issue (fire-and-forget, don't block response)
        _ = _gitHubService.CreateFeedbackIssueAsync(game, feedbackRequest.Rating, text, nickname);

        _logger.LogInformation("Feedback submitted: game={Game}, rating={Rating}", game, feedbackRequest.Rating?.ToString() ?? "none");

        return new OkObjectResult(new { success = true, message = "Tak for din feedback!" });
    }
}
