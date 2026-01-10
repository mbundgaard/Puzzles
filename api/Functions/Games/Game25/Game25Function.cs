// ============================================================================
// Game 25: Sænke Slagskibe (Battleship) - Multiplayer
// ============================================================================

using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Models;
using Puzzles.Storage;

namespace Puzzles.Functions.Games.Game25;

public class Game25Function
{
    private readonly ILogger<Game25Function> _logger;
    private readonly IBattleshipStorage _storage;
    private readonly IWinStorage _winStorage;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public Game25Function(ILogger<Game25Function> logger, IBattleshipStorage storage, IWinStorage winStorage)
    {
        _logger = logger;
        _storage = storage;
        _winStorage = winStorage;
    }

    [Function("BattleshipCreate")]
    public async Task<IActionResult> Create(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/25/create")] HttpRequest req)
    {
        CreateGameRequest? request;
        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            request = JsonSerializer.Deserialize<CreateGameRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null || string.IsNullOrWhiteSpace(request.CreatorName))
        {
            return new BadRequestObjectResult(new { error = "CreatorName is required" });
        }

        if (request.WinnerPoints < 3 || request.WinnerPoints > 5)
        {
            return new BadRequestObjectResult(new { error = "WinnerPoints must be 3, 4, or 5" });
        }

        if (request.LoserPoints < 0 || request.LoserPoints > 2)
        {
            return new BadRequestObjectResult(new { error = "LoserPoints must be 0, 1, or 2" });
        }

        var game = await _storage.CreateGameAsync(request.CreatorName, request.WinnerPoints, request.LoserPoints);

        _logger.LogInformation("Game created: {GameId} by {Creator}", game.GameId, request.CreatorName);

        return new OkObjectResult(new CreateGameResponse
        {
            GameId = game.GameId,
            PlayerToken = game.CreatorToken
        });
    }

    [Function("BattleshipOpen")]
    public async Task<IActionResult> Open(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "game/25/open")] HttpRequest req)
    {
        var games = await _storage.GetOpenGamesAsync();

        var openGames = games.Select(g => new OpenGameInfo
        {
            GameId = g.GameId,
            CreatorName = g.CreatorName,
            WinnerPoints = g.WinnerPoints,
            LoserPoints = g.LoserPoints,
            CreatedAt = g.CreatedAt
        }).ToList();

        return new OkObjectResult(new { games = openGames });
    }

    [Function("BattleshipJoin")]
    public async Task<IActionResult> Join(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/25/{gameId}/join")] HttpRequest req,
        string gameId)
    {
        JoinGameRequest? request;
        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            request = JsonSerializer.Deserialize<JoinGameRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null || string.IsNullOrWhiteSpace(request.JoinerName))
        {
            return new BadRequestObjectResult(new { error = "JoinerName is required" });
        }

        var game = await _storage.GetGameAsync(gameId);
        if (game == null)
        {
            return new NotFoundObjectResult(new { error = "Game not found" });
        }

        if (game.Status != BattleshipStatus.Open)
        {
            return new BadRequestObjectResult(new { error = "Game is not open for joining" });
        }

        game.JoinerName = request.JoinerName;
        game.JoinerToken = Guid.NewGuid().ToString();
        game.Status = BattleshipStatus.Placing;

        await _storage.UpdateGameAsync(game);

        _logger.LogInformation("Game joined: {GameId} by {Joiner}", gameId, request.JoinerName);

        return new OkObjectResult(new JoinGameResponse
        {
            PlayerToken = game.JoinerToken,
            State = BuildGameState(game, "joiner")
        });
    }

    [Function("BattleshipCancel")]
    public async Task<IActionResult> Cancel(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/25/{gameId}/cancel")] HttpRequest req,
        string gameId)
    {
        CancelGameRequest? request;
        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            request = JsonSerializer.Deserialize<CancelGameRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null || string.IsNullOrWhiteSpace(request.PlayerToken))
        {
            return new BadRequestObjectResult(new { error = "PlayerToken is required" });
        }

        var game = await _storage.GetGameAsync(gameId);
        if (game == null)
        {
            return new NotFoundObjectResult(new { error = "Game not found" });
        }

        var role = GetPlayerRole(game, request.PlayerToken);
        if (role == null)
        {
            return new UnauthorizedObjectResult(new { error = "Invalid player token" });
        }

        game.Status = BattleshipStatus.Ended;
        await _storage.UpdateGameAsync(game);

        _logger.LogInformation("Game cancelled: {GameId} by {Role}", gameId, role);

        return new OkObjectResult(new { success = true });
    }

    [Function("BattleshipState")]
    public async Task<IActionResult> State(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "game/25/{gameId}/state")] HttpRequest req,
        string gameId)
    {
        var playerToken = req.Query["playerToken"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(playerToken))
        {
            return new BadRequestObjectResult(new { error = "playerToken query parameter is required" });
        }

        var game = await _storage.GetGameAsync(gameId);
        if (game == null)
        {
            return new NotFoundObjectResult(new { error = "Game not found" });
        }

        var role = GetPlayerRole(game, playerToken);
        if (role == null)
        {
            return new UnauthorizedObjectResult(new { error = "Invalid player token" });
        }

        return new OkObjectResult(BuildGameState(game, role));
    }

    [Function("BattleshipShips")]
    public async Task<IActionResult> Ships(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/25/{gameId}/ships")] HttpRequest req,
        string gameId)
    {
        PlaceShipsRequest? request;
        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            request = JsonSerializer.Deserialize<PlaceShipsRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null || string.IsNullOrWhiteSpace(request.PlayerToken))
        {
            return new BadRequestObjectResult(new { error = "PlayerToken is required" });
        }

        if (request.Ships == null || request.Ships.Count == 0)
        {
            return new BadRequestObjectResult(new { error = "Ships are required" });
        }

        var game = await _storage.GetGameAsync(gameId);
        if (game == null)
        {
            return new NotFoundObjectResult(new { error = "Game not found" });
        }

        if (game.Status != BattleshipStatus.Placing)
        {
            return new BadRequestObjectResult(new { error = "Game is not in placing phase" });
        }

        var role = GetPlayerRole(game, request.PlayerToken);
        if (role == null)
        {
            return new UnauthorizedObjectResult(new { error = "Invalid player token" });
        }

        var shipsJson = JsonSerializer.Serialize(request.Ships);

        if (role == "creator")
        {
            if (game.CreatorShips != null)
            {
                return new BadRequestObjectResult(new { error = "Ships already placed" });
            }
            game.CreatorShips = shipsJson;
        }
        else
        {
            if (game.JoinerShips != null)
            {
                return new BadRequestObjectResult(new { error = "Ships already placed" });
            }
            game.JoinerShips = shipsJson;
        }

        // Check if both players have placed ships
        if (game.CreatorShips != null && game.JoinerShips != null)
        {
            game.Status = BattleshipStatus.Playing;
            game.CurrentTurn = "creator"; // Creator goes first
        }

        await _storage.UpdateGameAsync(game);

        _logger.LogInformation("Ships placed: {GameId} by {Role}", gameId, role);

        return new OkObjectResult(BuildGameState(game, role));
    }

    [Function("BattleshipShoot")]
    public async Task<IActionResult> Shoot(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/25/{gameId}/shoot")] HttpRequest req,
        string gameId)
    {
        ShootRequest? request;
        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            request = JsonSerializer.Deserialize<ShootRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null || string.IsNullOrWhiteSpace(request.PlayerToken))
        {
            return new BadRequestObjectResult(new { error = "PlayerToken is required" });
        }

        var game = await _storage.GetGameAsync(gameId);
        if (game == null)
        {
            return new NotFoundObjectResult(new { error = "Game not found" });
        }

        if (game.Status != BattleshipStatus.Playing)
        {
            return new BadRequestObjectResult(new { error = "Game is not in playing phase" });
        }

        var role = GetPlayerRole(game, request.PlayerToken);
        if (role == null)
        {
            return new UnauthorizedObjectResult(new { error = "Invalid player token" });
        }

        if (game.CurrentTurn != role)
        {
            return new BadRequestObjectResult(new { error = "It's not your turn" });
        }

        // Get opponent's ships
        var opponentShipsJson = role == "creator" ? game.JoinerShips : game.CreatorShips;
        var opponentShips = JsonSerializer.Deserialize<List<Ship>>(opponentShipsJson!, JsonOptions) ?? [];

        // Check if hit
        var isHit = CheckHit(request.X, request.Y, opponentShips);

        // Add shot to player's shots
        var shotsJson = role == "creator" ? game.CreatorShots : game.JoinerShots;
        var shots = JsonSerializer.Deserialize<List<Shot>>(shotsJson, JsonOptions) ?? [];
        shots.Add(new Shot { X = request.X, Y = request.Y, Hit = isHit });

        if (role == "creator")
        {
            game.CreatorShots = JsonSerializer.Serialize(shots);
        }
        else
        {
            game.JoinerShots = JsonSerializer.Serialize(shots);
        }

        // Check if game is over (all opponent ships sunk)
        var allSunk = CheckAllShipsSunk(opponentShips, shots);
        if (allSunk)
        {
            game.Status = BattleshipStatus.Ended;
            game.Winner = role;

            // Record win/loss points
            await RecordGameResultAsync(game);

            _logger.LogInformation("Game ended: {GameId}, winner: {Winner}", gameId, role);
        }
        else
        {
            // Switch turns
            game.CurrentTurn = role == "creator" ? "joiner" : "creator";
        }

        await _storage.UpdateGameAsync(game);

        return new OkObjectResult(BuildGameState(game, role));
    }

    // Helper methods

    private static string? GetPlayerRole(BattleshipGame game, string playerToken)
    {
        if (game.CreatorToken == playerToken) return "creator";
        if (game.JoinerToken == playerToken) return "joiner";
        return null;
    }

    private static bool CheckHit(int x, int y, List<Ship> ships)
    {
        foreach (var ship in ships)
        {
            for (var i = 0; i < ship.Length; i++)
            {
                var shipX = ship.Horizontal ? ship.X + i : ship.X;
                var shipY = ship.Horizontal ? ship.Y : ship.Y + i;
                if (shipX == x && shipY == y) return true;
            }
        }
        return false;
    }

    private static bool CheckAllShipsSunk(List<Ship> ships, List<Shot> shots)
    {
        foreach (var ship in ships)
        {
            for (var i = 0; i < ship.Length; i++)
            {
                var shipX = ship.Horizontal ? ship.X + i : ship.X;
                var shipY = ship.Horizontal ? ship.Y : ship.Y + i;

                var isHit = shots.Any(s => s.X == shipX && s.Y == shipY && s.Hit);
                if (!isHit) return false;
            }
        }
        return true;
    }

    private async Task RecordGameResultAsync(BattleshipGame game)
    {
        if (game.Winner == null) return;

        var winnerName = game.Winner == "creator" ? game.CreatorName : game.JoinerName!;
        var loserName = game.Winner == "creator" ? game.JoinerName! : game.CreatorName;

        // Record winner points
        await _winStorage.RecordWinAsync(new WinRecord
        {
            Nickname = winnerName,
            Game = "25",
            Points = game.WinnerPoints,
            Timestamp = DateTime.UtcNow
        });

        // Record loser points (negative)
        if (game.LoserPoints > 0)
        {
            await _winStorage.RecordWinAsync(new WinRecord
            {
                Nickname = loserName,
                Game = "25",
                Points = -game.LoserPoints,
                Timestamp = DateTime.UtcNow
            });
        }
    }

    private static GameState BuildGameState(BattleshipGame game, string role)
    {
        var yourShipsJson = role == "creator" ? game.CreatorShips : game.JoinerShips;
        var opponentShipsJson = role == "creator" ? game.JoinerShips : game.CreatorShips;
        var yourShotsJson = role == "creator" ? game.CreatorShots : game.JoinerShots;
        var opponentShotsJson = role == "creator" ? game.JoinerShots : game.CreatorShots;

        List<Ship>? yourShips = null;
        List<Ship>? opponentShips = null;

        if (!string.IsNullOrEmpty(yourShipsJson))
        {
            yourShips = JsonSerializer.Deserialize<List<Ship>>(yourShipsJson, JsonOptions);
        }

        // Only reveal opponent ships when game is ended
        if (game.Status == BattleshipStatus.Ended && !string.IsNullOrEmpty(opponentShipsJson))
        {
            opponentShips = JsonSerializer.Deserialize<List<Ship>>(opponentShipsJson, JsonOptions);
        }

        var yourShots = JsonSerializer.Deserialize<List<Shot>>(yourShotsJson, JsonOptions) ?? [];
        var opponentShots = JsonSerializer.Deserialize<List<Shot>>(opponentShotsJson, JsonOptions) ?? [];

        return new GameState
        {
            GameId = game.GameId,
            Status = game.Status,
            CreatorName = game.CreatorName,
            JoinerName = game.JoinerName,
            WinnerPoints = game.WinnerPoints,
            LoserPoints = game.LoserPoints,
            YourRole = role,
            YourShips = yourShips,
            OpponentShips = opponentShips,
            YourShots = yourShots,
            OpponentShots = opponentShots,
            CurrentTurn = game.CurrentTurn,
            IsYourTurn = game.CurrentTurn == role,
            Winner = game.Winner,
            YouWon = game.Winner != null ? game.Winner == role : null
        };
    }
}
