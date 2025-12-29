namespace Puzzles.Services;

/// <summary>
/// Service for creating GitHub issues from feedback.
/// </summary>
public interface IGitHubService
{
    /// <summary>
    /// Creates a GitHub issue for feedback.
    /// </summary>
    /// <param name="game">Game number (e.g., "01", "00" for suggestions)</param>
    /// <param name="rating">Optional rating 1-5</param>
    /// <param name="text">Optional feedback text</param>
    /// <param name="nickname">Optional nickname</param>
    /// <returns>True if issue was created successfully</returns>
    Task<bool> CreateFeedbackIssueAsync(string game, int? rating, string? text, string? nickname);
}
