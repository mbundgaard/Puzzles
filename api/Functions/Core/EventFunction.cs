using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Models;
using Puzzles.Storage;

namespace Puzzles.Functions.Core;

public class EventFunction
{
    private readonly ILogger<EventFunction> _logger;
    private readonly IEventStorage _storage;

    public EventFunction(ILogger<EventFunction> logger, IEventStorage storage)
    {
        _logger = logger;
        _storage = storage;
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
        var starts = await _storage.GetTodayStartsAsync();
        var completions = await _storage.GetTodayCompletionsAsync();

        return new OkObjectResult(new
        {
            date = DateTime.UtcNow.ToString("yyyy-MM-dd"),
            starts,
            completions
        });
    }
}
