using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Models;
using Puzzles.Storage;

namespace Puzzles.Functions;

public class SessionFunction
{
    private readonly ILogger<SessionFunction> _logger;
    private readonly ISessionStorage _storage;
    private static readonly HashSet<string> ValidEvents = new() { "newgame", "win", "lose" };

    public SessionFunction(ILogger<SessionFunction> logger, ISessionStorage storage)
    {
        _logger = logger;
        _storage = storage;
    }

    [Function("SessionStart")]
    public async Task<IActionResult> Start(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "session/start")] HttpRequest req)
    {
        SessionStartRequest? request;
        try
        {
            request = await req.ReadFromJsonAsync<SessionStartRequest>();
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        // Validate session ID (must be a valid GUID)
        if (string.IsNullOrWhiteSpace(request.SessionId) || !Guid.TryParse(request.SessionId, out _))
        {
            return new BadRequestObjectResult(new { error = "Valid sessionId (GUID) required" });
        }

        // Validate game number
        var game = GameValidator.NormalizeGame(request.Game);
        if (game == null)
        {
            return new BadRequestObjectResult(new { error = "Invalid game number" });
        }

        // Validate nickname if provided
        string? nickname = null;
        if (!string.IsNullOrWhiteSpace(request.Nickname))
        {
            nickname = request.Nickname.Trim();
            if (nickname.Length < 2 || nickname.Length > 20)
            {
                nickname = null;
            }
        }

        var session = new SessionRecord
        {
            SessionId = request.SessionId,
            Game = game,
            Nickname = nickname,
            StartTime = DateTime.UtcNow,
            Device = request.Device
        };

        try
        {
            await _storage.StartSessionAsync(session);
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 409)
        {
            // Session already exists - that's OK, client may be retrying
            _logger.LogWarning("Session {SessionId} already exists", request.SessionId);
            return new OkObjectResult(new { success = true, message = "Session already exists" });
        }

        _logger.LogInformation("Session started: {SessionId} for game {Game}", request.SessionId, game);

        return new OkObjectResult(new { success = true });
    }

    [Function("SessionUpdate")]
    public async Task<IActionResult> Update(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "session/update")] HttpRequest req)
    {
        SessionUpdateRequest? request;
        try
        {
            request = await req.ReadFromJsonAsync<SessionUpdateRequest>();
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        // Validate session ID
        if (string.IsNullOrWhiteSpace(request.SessionId) || !Guid.TryParse(request.SessionId, out _))
        {
            return new BadRequestObjectResult(new { error = "Valid sessionId (GUID) required" });
        }

        // Validate event type
        var eventType = request.Event?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(eventType) || !ValidEvents.Contains(eventType))
        {
            return new BadRequestObjectResult(new { error = "Event must be 'newGame', 'win', or 'lose'" });
        }

        // We need to find the session to get the game (partition key)
        // For now, we'll require game in the request or iterate partitions
        // Let's add game to the update request for efficiency

        // Actually, let's search for the session across all games
        // This is inefficient but works for now - could add game to request later

        // For efficiency, let's require game in the request
        return new BadRequestObjectResult(new { error = "Game number required - please include 'game' in request" });
    }

    [Function("SessionUpdateWithGame")]
    public async Task<IActionResult> UpdateWithGame(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "session/{game}/update")] HttpRequest req,
        string game)
    {
        SessionUpdateRequest? request;
        try
        {
            request = await req.ReadFromJsonAsync<SessionUpdateRequest>();
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        // Validate game number
        var normalizedGame = GameValidator.NormalizeGame(game);
        if (normalizedGame == null)
        {
            return new BadRequestObjectResult(new { error = "Invalid game number" });
        }

        // Validate session ID
        if (string.IsNullOrWhiteSpace(request.SessionId) || !Guid.TryParse(request.SessionId, out _))
        {
            return new BadRequestObjectResult(new { error = "Valid sessionId (GUID) required" });
        }

        // Validate event type
        var eventType = request.Event?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(eventType) || !ValidEvents.Contains(eventType))
        {
            return new BadRequestObjectResult(new { error = "Event must be 'newGame', 'win', or 'lose'" });
        }

        var sessionEvent = new SessionEvent
        {
            Event = eventType,
            Time = DateTime.UtcNow
        };

        try
        {
            await _storage.AddEventAsync(normalizedGame, request.SessionId, sessionEvent);
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 404)
        {
            return new NotFoundObjectResult(new { error = "Session not found" });
        }

        _logger.LogInformation("Event {Event} added to session {SessionId}", eventType, request.SessionId);

        return new OkObjectResult(new { success = true });
    }

    [Function("SessionEnd")]
    public async Task<IActionResult> End(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "session/{game}/end")] HttpRequest req,
        string game)
    {
        SessionEndRequest? request;
        try
        {
            request = await req.ReadFromJsonAsync<SessionEndRequest>();
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        // Validate game number
        var normalizedGame = GameValidator.NormalizeGame(game);
        if (normalizedGame == null)
        {
            return new BadRequestObjectResult(new { error = "Invalid game number" });
        }

        // Validate session ID
        if (string.IsNullOrWhiteSpace(request.SessionId) || !Guid.TryParse(request.SessionId, out _))
        {
            return new BadRequestObjectResult(new { error = "Valid sessionId (GUID) required" });
        }

        try
        {
            await _storage.EndSessionAsync(normalizedGame, request.SessionId, DateTime.UtcNow);
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 404)
        {
            return new NotFoundObjectResult(new { error = "Session not found" });
        }

        _logger.LogInformation("Session {SessionId} ended", request.SessionId);

        return new OkObjectResult(new { success = true });
    }
}
