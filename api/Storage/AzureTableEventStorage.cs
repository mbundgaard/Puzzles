using Azure;
using Azure.Data.Tables;
using Puzzles.Models;

namespace Puzzles.Storage;

/// <summary>
/// Azure Table Storage entity for game events.
/// </summary>
public class EventEntity : ITableEntity
{
    public string PartitionKey { get; set; } = string.Empty; // yyyy-MM
    public string RowKey { get; set; } = string.Empty;       // game_event_ticks
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public string Game { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;    // "Start" or "Complete"
    public DateTime RecordedAt { get; set; }
    public string? Nickname { get; set; }
}

/// <summary>
/// Azure Table Storage implementation for game events.
/// </summary>
public class AzureTableEventStorage : IEventStorage
{
    private readonly TableClient _tableClient;
    private const string TableName = "Events";

    public AzureTableEventStorage(string connectionString)
    {
        var serviceClient = new TableServiceClient(connectionString);
        _tableClient = serviceClient.GetTableClient(TableName);
        _tableClient.CreateIfNotExists();
    }

    public async Task RecordEventAsync(EventRecord record)
    {
        var entity = new EventEntity
        {
            PartitionKey = record.PartitionKey,
            RowKey = record.RowKey,
            Game = record.Game,
            EventType = record.EventType.ToString(),
            RecordedAt = record.Timestamp,
            Nickname = record.Nickname
        };

        await _tableClient.AddEntityAsync(entity);
    }

    public async Task<UsageStatsResponse> GetUsageStatsAsync(string? game = null)
    {
        var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");

        var filter = $"PartitionKey eq '{currentMonth}'";
        if (!string.IsNullOrEmpty(game))
        {
            filter += $" and Game eq '{game}'";
        }

        var events = new List<EventEntity>();
        await foreach (var entity in _tableClient.QueryAsync<EventEntity>(filter))
        {
            events.Add(entity);
        }

        var perGame = events
            .GroupBy(e => e.Game)
            .Select(g => new GameStats
            {
                Game = g.Key,
                Starts = g.Count(e => e.EventType == "Start"),
                Completions = g.Count(e => e.EventType == "Complete")
            })
            .OrderBy(g => g.Game)
            .ToList();

        return new UsageStatsResponse
        {
            Period = currentMonth,
            TotalStarts = perGame.Sum(g => g.Starts),
            TotalCompletions = perGame.Sum(g => g.Completions),
            PerGame = perGame
        };
    }

    public async Task<int> GetTodayStartsAsync()
    {
        var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");
        var today = DateTime.UtcNow.Date;

        var filter = $"PartitionKey eq '{currentMonth}' and EventType eq 'Start'";

        var count = 0;
        await foreach (var entity in _tableClient.QueryAsync<EventEntity>(filter))
        {
            if (entity.RecordedAt.Date == today)
            {
                count++;
            }
        }

        return count;
    }

    public async Task<int> GetTodayCompletionsAsync()
    {
        var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");
        var today = DateTime.UtcNow.Date;

        var filter = $"PartitionKey eq '{currentMonth}' and EventType eq 'Complete'";

        var count = 0;
        await foreach (var entity in _tableClient.QueryAsync<EventEntity>(filter))
        {
            if (entity.RecordedAt.Date == today)
            {
                count++;
            }
        }

        return count;
    }
}
