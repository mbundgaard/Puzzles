using System.Collections.Concurrent;
using Puzzles.Models;

namespace Puzzles.Storage;

/// <summary>
/// In-memory mock storage for game events.
/// Replace with AzureTableEventStorage for production.
/// </summary>
public class MockEventStorage : IEventStorage
{
    private static readonly ConcurrentBag<EventRecord> _events = [];

    public Task RecordEventAsync(EventRecord record)
    {
        _events.Add(record);
        return Task.CompletedTask;
    }

    public Task<UsageStatsResponse> GetUsageStatsAsync(string? game = null)
    {
        var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");

        var monthEvents = _events
            .Where(e => e.PartitionKey == currentMonth)
            .Where(e => game == null || e.Game == game)
            .ToList();

        var perGame = monthEvents
            .GroupBy(e => e.Game)
            .Select(g => new GameStats
            {
                Game = g.Key,
                Starts = g.Count(e => e.EventType == GameEventType.Start),
                Completions = g.Count(e => e.EventType == GameEventType.Complete)
            })
            .OrderBy(g => g.Game)
            .ToList();

        return Task.FromResult(new UsageStatsResponse
        {
            Period = currentMonth,
            TotalStarts = perGame.Sum(g => g.Starts),
            TotalCompletions = perGame.Sum(g => g.Completions),
            PerGame = perGame
        });
    }

    public Task<int> GetTodayStartsAsync()
    {
        var today = DateTime.UtcNow.Date;
        var count = _events.Count(e =>
            e.EventType == GameEventType.Start &&
            e.Timestamp.Date == today);
        return Task.FromResult(count);
    }

    public Task<int> GetTodayCompletionsAsync()
    {
        var today = DateTime.UtcNow.Date;
        var count = _events.Count(e =>
            e.EventType == GameEventType.Complete &&
            e.Timestamp.Date == today);
        return Task.FromResult(count);
    }
}
