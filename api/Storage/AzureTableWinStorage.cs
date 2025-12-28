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
    public DateTime RecordedAt { get; set; }
}

/// <summary>
/// Azure Table Storage implementation for win records.
/// </summary>
public class AzureTableWinStorage : IWinStorage
{
    private readonly TableClient _tableClient;
    private const string TableName = "Wins";

    // Fun titles based on win count
    private static readonly Dictionary<int, string> Titles = new()
    {
        { 50, "Mester" },
        { 25, "Ekspert" },
        { 10, "Entusiast" },
        { 5, "Nybegynder" },
        { 1, "Debutant" }
    };

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
            RecordedAt = record.Timestamp
        };

        await _tableClient.AddEntityAsync(entity);
        return true;
    }

    public async Task<LeaderboardResponse> GetLeaderboardAsync(string? game, int top = 10)
    {
        var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");

        // Query all wins for this month
        var filter = $"PartitionKey eq '{currentMonth}'";
        if (!string.IsNullOrEmpty(game))
        {
            filter += $" and Game eq '{game}'";
        }

        var wins = new List<WinEntity>();
        await foreach (var entity in _tableClient.QueryAsync<WinEntity>(filter))
        {
            wins.Add(entity);
        }

        // Group by nickname and count
        var grouped = wins
            .GroupBy(w => w.Nickname.ToLowerInvariant())
            .Select(g => new
            {
                Nickname = g.First().Nickname,
                Wins = g.Count()
            })
            .OrderByDescending(x => x.Wins)
            .Take(top)
            .Select((x, i) => new LeaderboardEntry
            {
                Rank = i + 1,
                Nickname = x.Nickname,
                Wins = x.Wins,
                Title = GetTitle(x.Wins)
            })
            .ToList();

        return new LeaderboardResponse
        {
            Period = currentMonth,
            Game = game,
            TotalWinsThisMonth = wins.Count,
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

    public async Task<int> GetTotalWinsThisMonthAsync()
    {
        var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");
        var filter = $"PartitionKey eq '{currentMonth}'";

        var count = 0;
        await foreach (var _ in _tableClient.QueryAsync<WinEntity>(filter, select: new[] { "PartitionKey" }))
        {
            count++;
        }

        return count;
    }

    private static string? GetTitle(int wins)
    {
        foreach (var (threshold, title) in Titles.OrderByDescending(x => x.Key))
        {
            if (wins >= threshold)
                return title;
        }
        return null;
    }
}
