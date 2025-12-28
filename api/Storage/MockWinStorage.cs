using System.Collections.Concurrent;
using Puzzles.Models;

namespace Puzzles.Storage;

/// <summary>
/// In-memory mock storage for development.
/// Replace with AzureTableWinStorage for production.
/// </summary>
public class MockWinStorage : IWinStorage
{
    private static readonly ConcurrentBag<WinRecord> _wins = [];

    // Fun titles based on win count
    private static readonly Dictionary<int, string> _titles = new()
    {
        { 50, "Mester" },
        { 25, "Ekspert" },
        { 10, "Entusiast" },
        { 5, "Nybegynder" },
        { 1, "Debutant" }
    };

    public Task<bool> RecordWinAsync(WinRecord record)
    {
        _wins.Add(record);
        return Task.FromResult(true);
    }

    public Task<LeaderboardResponse> GetLeaderboardAsync(string? game, int top = 10)
    {
        var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");

        var monthWins = _wins
            .Where(w => w.PartitionKey == currentMonth)
            .Where(w => game == null || w.Game.Equals(game, StringComparison.OrdinalIgnoreCase))
            .ToList();

        var grouped = monthWins
            .GroupBy(w => w.Nickname.ToLowerInvariant())
            .Select(g => new
            {
                Nickname = g.First().Nickname, // Preserve original casing
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

        return Task.FromResult(new LeaderboardResponse
        {
            Period = currentMonth,
            Game = game,
            TotalWinsThisMonth = monthWins.Count,
            Entries = grouped
        });
    }

    public Task<bool> HasRecentWinAsync(string nickname, string game, TimeSpan window)
    {
        var cutoff = DateTime.UtcNow - window;
        var hasRecent = _wins.Any(w =>
            w.Nickname.Equals(nickname, StringComparison.OrdinalIgnoreCase) &&
            w.Game.Equals(game, StringComparison.OrdinalIgnoreCase) &&
            w.Timestamp > cutoff);

        return Task.FromResult(hasRecent);
    }

    public Task<int> GetTotalWinsThisMonthAsync()
    {
        var currentMonth = DateTime.UtcNow.ToString("yyyy-MM");
        var count = _wins.Count(w => w.PartitionKey == currentMonth);
        return Task.FromResult(count);
    }

    private static string? GetTitle(int wins)
    {
        foreach (var (threshold, title) in _titles.OrderByDescending(x => x.Key))
        {
            if (wins >= threshold)
                return title;
        }
        return null;
    }
}
