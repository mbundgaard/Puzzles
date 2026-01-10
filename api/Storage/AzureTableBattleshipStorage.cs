using Azure;
using Azure.Data.Tables;
using Puzzles.Models;

namespace Puzzles.Storage;

/// <summary>
/// Azure Table Storage entity for Battleship games.
/// </summary>
public class BattleshipGameEntity : ITableEntity
{
    public string PartitionKey { get; set; } = "game25";
    public string RowKey { get; set; } = string.Empty; // GameId
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public string Status { get; set; } = BattleshipStatus.Open;

    public string CreatorName { get; set; } = string.Empty;
    public string CreatorToken { get; set; } = string.Empty;
    public string? JoinerName { get; set; }
    public string? JoinerToken { get; set; }

    public int WinnerPoints { get; set; }
    public int LoserPoints { get; set; }

    public string? CreatorShips { get; set; }
    public string? JoinerShips { get; set; }
    public string CreatorShots { get; set; } = "[]";
    public string JoinerShots { get; set; } = "[]";

    public string CurrentTurn { get; set; } = "creator";
    public string? Winner { get; set; }

    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Azure Table Storage implementation for Battleship games.
/// </summary>
public class AzureTableBattleshipStorage : IBattleshipStorage
{
    private readonly TableClient _tableClient;
    private const string TableName = "BattleshipGames";
    private const string PartitionKey = "game25";
    private static readonly TimeSpan ExpirationTime = TimeSpan.FromMinutes(10);

    public AzureTableBattleshipStorage(string connectionString)
    {
        var serviceClient = new TableServiceClient(connectionString);
        _tableClient = serviceClient.GetTableClient(TableName);
        _tableClient.CreateIfNotExists();
    }

    public async Task<BattleshipGame> CreateGameAsync(string creatorName, int winnerPoints, int loserPoints)
    {
        var gameId = GenerateGameId();
        var creatorToken = Guid.NewGuid().ToString();

        var entity = new BattleshipGameEntity
        {
            PartitionKey = PartitionKey,
            RowKey = gameId,
            Status = BattleshipStatus.Open,
            CreatorName = creatorName,
            CreatorToken = creatorToken,
            WinnerPoints = winnerPoints,
            LoserPoints = loserPoints,
            CreatedAt = DateTime.UtcNow
        };

        await _tableClient.AddEntityAsync(entity);

        return EntityToGame(entity);
    }

    public async Task<BattleshipGame?> GetGameAsync(string gameId)
    {
        try
        {
            var response = await _tableClient.GetEntityAsync<BattleshipGameEntity>(PartitionKey, gameId);
            return EntityToGame(response.Value);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }

    public async Task UpdateGameAsync(BattleshipGame game)
    {
        var entity = GameToEntity(game);
        await _tableClient.UpsertEntityAsync(entity, TableUpdateMode.Replace);
    }

    public async Task<List<BattleshipGame>> GetOpenGamesAsync()
    {
        var cutoff = DateTime.UtcNow - ExpirationTime;
        var games = new List<BattleshipGame>();

        await foreach (var entity in _tableClient.QueryAsync<BattleshipGameEntity>(
            e => e.PartitionKey == PartitionKey && e.Status == BattleshipStatus.Open))
        {
            // Filter out expired games
            if (entity.CreatedAt > cutoff)
            {
                games.Add(EntityToGame(entity));
            }
        }

        return games;
    }

    public async Task CleanupExpiredGamesAsync()
    {
        var cutoff = DateTime.UtcNow - ExpirationTime;

        await foreach (var entity in _tableClient.QueryAsync<BattleshipGameEntity>(
            e => e.PartitionKey == PartitionKey && e.Status == BattleshipStatus.Open))
        {
            if (entity.CreatedAt <= cutoff)
            {
                await _tableClient.DeleteEntityAsync(entity.PartitionKey, entity.RowKey);
            }
        }
    }

    private static string GenerateGameId()
    {
        // Generate a short, readable game code (6 characters)
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoiding confusing chars like 0, O, 1, I
        var random = new Random();
        return new string(Enumerable.Range(0, 6).Select(_ => chars[random.Next(chars.Length)]).ToArray());
    }

    private static BattleshipGame EntityToGame(BattleshipGameEntity entity)
    {
        return new BattleshipGame
        {
            GameId = entity.RowKey,
            Status = entity.Status,
            CreatorName = entity.CreatorName,
            CreatorToken = entity.CreatorToken,
            JoinerName = entity.JoinerName,
            JoinerToken = entity.JoinerToken,
            WinnerPoints = entity.WinnerPoints,
            LoserPoints = entity.LoserPoints,
            CreatorShips = entity.CreatorShips,
            JoinerShips = entity.JoinerShips,
            CreatorShots = entity.CreatorShots,
            JoinerShots = entity.JoinerShots,
            CurrentTurn = entity.CurrentTurn,
            Winner = entity.Winner,
            CreatedAt = entity.CreatedAt
        };
    }

    private static BattleshipGameEntity GameToEntity(BattleshipGame game)
    {
        return new BattleshipGameEntity
        {
            PartitionKey = PartitionKey,
            RowKey = game.GameId,
            Status = game.Status,
            CreatorName = game.CreatorName,
            CreatorToken = game.CreatorToken,
            JoinerName = game.JoinerName,
            JoinerToken = game.JoinerToken,
            WinnerPoints = game.WinnerPoints,
            LoserPoints = game.LoserPoints,
            CreatorShips = game.CreatorShips,
            JoinerShips = game.JoinerShips,
            CreatorShots = game.CreatorShots,
            JoinerShots = game.JoinerShots,
            CurrentTurn = game.CurrentTurn,
            Winner = game.Winner,
            CreatedAt = game.CreatedAt
        };
    }
}
