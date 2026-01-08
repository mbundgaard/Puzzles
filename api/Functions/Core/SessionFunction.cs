using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Models;
using Puzzles.Storage;

namespace Puzzles.Functions.Core;

public class SessionFunction
{
    private readonly ILogger<SessionFunction> _logger;
    private readonly ISessionStorage _storage;

    public SessionFunction(ILogger<SessionFunction> logger, ISessionStorage storage)
    {
        _logger = logger;
        _storage = storage;
    }

    [Function("SessionStart")]
    public async Task<IActionResult> Start(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "session/{game}/{sessionId}/start")] HttpRequest req,
        string game,
        string sessionId)
    {
        // Validate game number
        var normalizedGame = GameValidator.NormalizeGame(game);
        if (normalizedGame == null)
        {
            return new BadRequestObjectResult(new { error = "Invalid game number" });
        }

        // Validate session ID (must be a valid GUID)
        if (!Guid.TryParse(sessionId, out _))
        {
            return new BadRequestObjectResult(new { error = "Invalid sessionId (must be GUID)" });
        }

        SessionStartRequest? request;
        try
        {
            request = await req.ReadFromJsonAsync<SessionStartRequest>();
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        // Validate nickname if provided
        string? nickname = null;
        if (!string.IsNullOrWhiteSpace(request?.Nickname))
        {
            nickname = request.Nickname.Trim();
            if (nickname.Length < 2 || nickname.Length > 20)
            {
                nickname = null;
            }
        }

        // Convert Unix timestamp to DateTime if provided
        DateTime? appVersion = null;
        if (request?.AppVersion != null && request.AppVersion > 0 && request.AppVersion < 1800000000)
        {
            appVersion = DateTimeOffset.FromUnixTimeSeconds(request.AppVersion.Value).UtcDateTime;
        }

        var session = new SessionRecord
        {
            SessionId = sessionId,
            Game = normalizedGame,
            Nickname = nickname,
            StartTime = DateTime.UtcNow,
            Device = request?.Device,
            AppVersion = appVersion
        };

        try
        {
            await _storage.StartSessionAsync(session);
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 409)
        {
            _logger.LogWarning("Session {SessionId} already exists", sessionId);
            return new OkObjectResult(new { success = true, message = "Session already exists" });
        }

        _logger.LogInformation("Session started: {SessionId} for game {Game}", sessionId, normalizedGame);

        return new OkObjectResult(new { success = true });
    }

    [Function("SessionUpdate")]
    public async Task<IActionResult> Update(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "session/{game}/{sessionId}/update")] HttpRequest req,
        string game,
        string sessionId)
    {
        // Validate game number
        var normalizedGame = GameValidator.NormalizeGame(game);
        if (normalizedGame == null)
        {
            return new BadRequestObjectResult(new { error = "Invalid game number" });
        }

        // Validate session ID
        if (!Guid.TryParse(sessionId, out _))
        {
            return new BadRequestObjectResult(new { error = "Invalid sessionId (must be GUID)" });
        }

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

        // Normalize event type
        var eventType = request.Event?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(eventType))
        {
            return new BadRequestObjectResult(new { error = "Event is required" });
        }

        var sessionEvent = new SessionEvent
        {
            Event = eventType,
            Time = DateTime.UtcNow
        };

        try
        {
            await _storage.AddEventAsync(normalizedGame, sessionId, sessionEvent);
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 404)
        {
            return new NotFoundObjectResult(new { error = "Session not found" });
        }

        _logger.LogInformation("Event {Event} added to session {SessionId}", eventType, sessionId);

        return new OkObjectResult(new { success = true });
    }

    [Function("SessionEnd")]
    public async Task<IActionResult> End(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "session/{game}/{sessionId}/end")] HttpRequest req,
        string game,
        string sessionId)
    {
        // Validate game number
        var normalizedGame = GameValidator.NormalizeGame(game);
        if (normalizedGame == null)
        {
            return new BadRequestObjectResult(new { error = "Invalid game number" });
        }

        // Validate session ID
        if (!Guid.TryParse(sessionId, out _))
        {
            return new BadRequestObjectResult(new { error = "Invalid sessionId (must be GUID)" });
        }

        try
        {
            await _storage.EndSessionAsync(normalizedGame, sessionId, DateTime.UtcNow);
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 404)
        {
            return new NotFoundObjectResult(new { error = "Session not found" });
        }

        _logger.LogInformation("Session {SessionId} ended", sessionId);

        return new OkObjectResult(new { success = true });
    }

    [Function("SessionGet")]
    public async Task<IActionResult> Get(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "session/{game}/{sessionId}")] HttpRequest req,
        string game,
        string sessionId)
    {
        // Validate game number
        var normalizedGame = GameValidator.NormalizeGame(game);
        if (normalizedGame == null)
        {
            return new BadRequestObjectResult(new { error = "Invalid game number" });
        }

        // Validate session ID
        if (!Guid.TryParse(sessionId, out _))
        {
            return new BadRequestObjectResult(new { error = "Invalid sessionId (must be GUID)" });
        }

        var session = await _storage.GetSessionAsync(normalizedGame, sessionId);

        if (session == null)
        {
            return new NotFoundObjectResult(new { error = "Session not found" });
        }

        _logger.LogInformation("Session {SessionId} retrieved", sessionId);

        return new OkObjectResult(session);
    }
}
