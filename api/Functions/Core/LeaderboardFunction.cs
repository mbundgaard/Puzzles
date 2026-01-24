using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Storage;

namespace Puzzles.Functions.Core;

public class LeaderboardFunction
{
    private readonly ILogger<LeaderboardFunction> _logger;
    private readonly IWinStorage _storage;

    public LeaderboardFunction(ILogger<LeaderboardFunction> logger, IWinStorage storage)
    {
        _logger = logger;
        _storage = storage;
    }

    [Function("GetLeaderboard")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "leaderboard")] HttpRequest req)
    {
        // Optional game filter
        var game = req.Query["game"].FirstOrDefault();
        if (game?.Equals("all", StringComparison.OrdinalIgnoreCase) == true)
        {
            game = null;
        }

        // Optional top count (default 0 = all players)
        var topParam = req.Query["top"].FirstOrDefault();
        int? top = null;
        if (int.TryParse(topParam, out var parsedTop) && parsedTop > 0)
        {
            top = parsedTop;
        }

        var leaderboard = await _storage.GetLeaderboardAsync(game, top);

        _logger.LogInformation("Leaderboard requested: game={Game}, top={Top}", game ?? "all", top);

        return new OkObjectResult(leaderboard);
    }

    [Function("GetTotalPoints")]
    public async Task<IActionResult> GetTotalPoints(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "points")] HttpRequest req)
    {
        var totalPoints = await _storage.GetTotalPointsAsync();

        return new OkObjectResult(new
        {
            period = "all-time",
            totalPoints
        });
    }
}
