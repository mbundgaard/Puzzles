using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Models;
using Puzzles.Services;
using Puzzles.Storage;

namespace Puzzles.Functions.Core;

public class EventFunction
{
    private readonly ILogger<EventFunction> _logger;
    private readonly IEventStorage _storage;
    private readonly IAdminAuthService _adminAuth;

    public EventFunction(ILogger<EventFunction> logger, IEventStorage storage, IAdminAuthService adminAuth)
    {
        _logger = logger;
        _storage = storage;
        _adminAuth = adminAuth;
    }

    [Function("RecordEvent")]
    public async Task<IActionResult> RecordEvent(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "event")] HttpRequest req)
    {
        EventRequest? eventRequest;
        try
        {
            eventRequest = await req.ReadFromJsonAsync<EventRequest>();
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (eventRequest == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        // Validate and normalize game number
        var game = GameValidator.NormalizeGame(eventRequest.Game);
        if (game == null)
        {
            return new BadRequestObjectResult(new { error = "Invalid game number" });
        }

        // Validate event type
        var eventType = eventRequest.Event?.Trim().ToLowerInvariant();
        if (eventType != "start" && eventType != "complete")
        {
            return new BadRequestObjectResult(new { error = "Event must be 'start' or 'complete'" });
        }

        // Validate nickname if provided (2-20 chars)
        string? nickname = null;
        if (!string.IsNullOrWhiteSpace(eventRequest.Nickname))
        {
            nickname = eventRequest.Nickname.Trim();
            if (nickname.Length < 2 || nickname.Length > 20)
            {
                nickname = null; // Ignore invalid nickname
            }
        }

        var record = new EventRecord
        {
            Game = game,
            EventType = eventType == "start" ? GameEventType.Start : GameEventType.Complete,
            Timestamp = DateTime.UtcNow,
            Nickname = nickname
        };

        await _storage.RecordEventAsync(record);

        _logger.LogInformation("Event recorded: {Event} for game {Game} by {Nickname}", eventType, game, nickname ?? "anonymous");

        return new OkObjectResult(new { success = true });
    }

    [Function("GetUsageStats")]
    public async Task<IActionResult> GetUsageStats(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "usage")] HttpRequest req)
    {
        var authResult = _adminAuth.Authorize(req);
        if (authResult != null) return authResult;

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

        var stats = await _storage.GetUsageStatsAsync(game);

        _logger.LogInformation("Usage stats requested: game={Game}", game ?? "all");

        return new OkObjectResult(stats);
    }

    [Function("GetTodayStats")]
    public async Task<IActionResult> GetTodayStats(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "today")] HttpRequest req)
    {
        var authResult = _adminAuth.Authorize(req);
        if (authResult != null) return authResult;

        var starts = await _storage.GetTodayStartsAsync();
        var completions = await _storage.GetTodayCompletionsAsync();

        return new OkObjectResult(new
        {
            date = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            starts,
            completions
        });
    }

    [Function("GetStats")]
    public async Task<IActionResult> GetStats(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "stats")] HttpRequest req)
    {
        var authResult = _adminAuth.Authorize(req);
        if (authResult != null) return authResult;

        // Parse 'from' parameter (required)
        var fromParam = req.Query["from"].FirstOrDefault();
        if (string.IsNullOrEmpty(fromParam) || !DateTime.TryParse(fromParam, out var from))
        {
            return new BadRequestObjectResult(new { error = "Invalid or missing 'from' parameter. Use yyyy-MM-dd format." });
        }

        // Parse 'to' parameter (required)
        var toParam = req.Query["to"].FirstOrDefault();
        if (string.IsNullOrEmpty(toParam) || !DateTime.TryParse(toParam, out var to))
        {
            return new BadRequestObjectResult(new { error = "Invalid or missing 'to' parameter. Use yyyy-MM-dd format." });
        }

        // Validate date range
        if (from > to)
        {
            return new BadRequestObjectResult(new { error = "'from' date must be before or equal to 'to' date." });
        }

        // Limit range to 366 days to prevent excessive queries
        if ((to - from).Days > 366)
        {
            return new BadRequestObjectResult(new { error = "Date range cannot exceed 366 days." });
        }

        var stats = await _storage.GetStatsAsync(from, to);

        _logger.LogInformation("Stats requested: from={From}, to={To}", fromParam, toParam);

        return new OkObjectResult(stats);
    }
}
