using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Models;
using Puzzles.Storage;

namespace Puzzles.Functions.Core;

public class WinFunction
{
    private readonly ILogger<WinFunction> _logger;
    private readonly IWinStorage _storage;

    public WinFunction(ILogger<WinFunction> logger, IWinStorage storage)
    {
        _logger = logger;
        _storage = storage;
    }

    [Function("RecordWin")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "win")] HttpRequest req)
    {
        WinRequest? winRequest;
        try
        {
            winRequest = await req.ReadFromJsonAsync<WinRequest>();
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (winRequest == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        // Validate nickname
        var nickname = winRequest.Nickname?.Trim();
        if (string.IsNullOrEmpty(nickname) || nickname.Length < 2 || nickname.Length > 20)
        {
            return new BadRequestObjectResult(new { error = "Nickname must be 2-20 characters" });
        }

        // Validate and normalize game number
        var game = GameValidator.NormalizeGame(winRequest.Game);
        if (game == null)
        {
            return new BadRequestObjectResult(new { error = "Invalid game number" });
        }

        // Validate points (1-5)
        var points = winRequest.Points;
        if (points < 1 || points > 5)
        {
            return new BadRequestObjectResult(new { error = "Points must be between 1 and 5" });
        }

        var record = new WinRecord
        {
            Nickname = nickname,
            Game = game,
            Points = points,
            Timestamp = DateTime.UtcNow
        };

        await _storage.RecordWinAsync(record);

        _logger.LogInformation("Win recorded: {Nickname} won game {Game}", nickname, game);

        return new OkObjectResult(new
        {
            success = true,
            message = "Tillykke! Din sejr er registreret."
        });
    }
}
