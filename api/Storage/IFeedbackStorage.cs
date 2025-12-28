using Puzzles.Models;

namespace Puzzles.Storage;

/// <summary>
/// Interface for game feedback storage.
/// Designed for easy swap between mock and Azure Table Storage.
/// </summary>
public interface IFeedbackStorage
{
    /// <summary>
    /// Records user feedback for a game.
    /// </summary>
    Task RecordFeedbackAsync(FeedbackRecord record);

    /// <summary>
    /// Gets feedback statistics for all games.
    /// </summary>
    Task<FeedbackStatsResponse> GetFeedbackStatsAsync();

    /// <summary>
    /// Gets recent feedback entries.
    /// </summary>
    /// <param name="game">Optional game filter. Null = all games.</param>
    /// <param name="limit">Maximum number of entries to return.</param>
    Task<List<FeedbackRecord>> GetRecentFeedbackAsync(string? game = null, int limit = 50);
}
