using Puzzles.Models;

namespace Puzzles.Storage;

/// <summary>
/// Interface for win record storage.
/// Designed for easy swap between mock and Azure Table Storage.
/// </summary>
public interface IWinStorage
{
    /// <summary>
    /// Records a win.
    /// </summary>
    Task<bool> RecordWinAsync(WinRecord record);

    /// <summary>
    /// Gets the leaderboard for the current month.
    /// </summary>
    /// <param name="game">Optional game filter. Null = all games.</param>
    /// <param name="top">Number of top entries to return. Null = all players.</param>
    Task<LeaderboardResponse> GetLeaderboardAsync(string? game, int? top = null);

    /// <summary>
    /// Checks if a win was recorded recently (rate limiting).
    /// </summary>
    Task<bool> HasRecentWinAsync(string nickname, string game, TimeSpan window);

    /// <summary>
    /// Gets total points across all games (all time).
    /// </summary>
    Task<int> GetTotalPointsAsync();
}
