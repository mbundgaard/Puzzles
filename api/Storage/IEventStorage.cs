using Puzzles.Models;

namespace Puzzles.Storage;

/// <summary>
/// Interface for game event storage (anonymous usage tracking).
/// Designed for easy swap between mock and Azure Table Storage.
/// </summary>
public interface IEventStorage
{
    /// <summary>
    /// Records a game event (start or complete).
    /// </summary>
    Task RecordEventAsync(EventRecord record);

    /// <summary>
    /// Gets usage statistics for the current month.
    /// </summary>
    /// <param name="game">Optional game filter. Null = all games.</param>
    Task<UsageStatsResponse> GetUsageStatsAsync(string? game = null);

    /// <summary>
    /// Gets total starts today (for display on main page).
    /// </summary>
    Task<int> GetTodayStartsAsync();

    /// <summary>
    /// Gets total completions today.
    /// </summary>
    Task<int> GetTodayCompletionsAsync();

    /// <summary>
    /// Gets statistics for a date range.
    /// </summary>
    /// <param name="from">Start date (inclusive)</param>
    /// <param name="to">End date (inclusive)</param>
    Task<StatsResponse> GetStatsAsync(DateTime from, DateTime to);
}
