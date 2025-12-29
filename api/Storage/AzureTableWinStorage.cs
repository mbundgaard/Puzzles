using Azure;
using Azure.Data.Tables;
using Puzzles.Models;

namespace Puzzles.Storage;

/// <summary>
/// Azure Table Storage entity for win records.
/// </summary>
public class WinEntity : ITableEntity
{
    public string PartitionKey { get; set; } = string.Empty; // yyyy-MM
    public string RowKey { get; set; } = string.Empty;       // game_nickname_ticks
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public string Nickname { get; set; } = string.Empty;
    public string Game { get; set; } = string.Empty;
    public int Points { get; set; } = 1;
    public DateTime RecordedAt { get; set; }
}

/// <summary>
/// Azure Table Storage implementation for win records.
/// </summary>
public class AzureTableWinStorage : IWinStorage
{
    private readonly TableClient _tableClient;
    private const string TableName = "Wins";

    public AzureTableWinStorage(string connectionString)
    {
        var serviceClient = new TableServiceClient(connectionString);
        _tableClient = serviceClient.GetTableClient(TableName);
        _tableClient.CreateIfNotExists();
    }

    public async Task<bool> RecordWinAsync(WinRecord record)
    {
        var entity = new WinEntity
        {
            PartitionKey = record.PartitionKey,
            RowKey = record.RowKey,
            Nickname = record.Nickname,
            Game = record.Game,
            Points = record.Points,
            RecordedAt = record.Timestamp
        };

        await _tableClient.AddEntityAsync(entity);
        return true;
    }

    public async Task<LeaderboardResponse> GetLeaderboardAsync(string? game, int top = 10)
    {
        // Query all wins (no partition key filter - get all time)
        string? filter = null;
        if (!string.IsNullOrEmpty(game))
        {
            filter = $"Game eq '{game}'";
        }

        var wins = new List<WinEntity>();
        await foreach (var entity in _tableClient.QueryAsync<WinEntity>(filter))
        {
            wins.Add(entity);
        }

        // Group by nickname and sum points (old records without Points get 1 point)
        var grouped = wins
            .GroupBy(w => w.Nickname.ToLowerInvariant())
            .Select(g => new
            {
                Nickname = g.First().Nickname,
                Points = g.Sum(w => w.Points > 0 ? w.Points : 1)
            })
            .OrderByDescending(x => x.Points)
            .Take(top)
            .Select((x, i) => new LeaderboardEntry
            {
                Rank = i + 1,
                Nickname = x.Nickname,
                Points = x.Points
            })
            .ToList();

        return new LeaderboardResponse
        {
            Period = "all-time",
            Game = game,
            TotalPoints = wins.Sum(w => w.Points > 0 ? w.Points : 1),
            Entries = grouped
        };
    }

    public async Task<bool> HasRecentWinAsync(string nickname, string game, TimeSpan window)
    {
        var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");
        var cutoff = DateTime.UtcNow - window;

        var filter = $"PartitionKey eq '{currentMonth}' and Game eq '{game}'";

        await foreach (var entity in _tableClient.QueryAsync<WinEntity>(filter))
        {
            if (entity.Nickname.Equals(nickname, StringComparison.OrdinalIgnoreCase) &&
                entity.RecordedAt > cutoff)
            {
                return true;
            }
        }

        return false;
    }

    public async Task<int> GetTotalPointsAsync()
    {
        var totalPoints = 0;
        await foreach (var entity in _tableClient.QueryAsync<WinEntity>(select: new[] { "Points" }))
        {
            // Old records without Points get 1 point
            totalPoints += entity.Points > 0 ? entity.Points : 1;
        }

        return totalPoints;
    }
}
