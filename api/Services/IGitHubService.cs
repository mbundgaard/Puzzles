namespace Puzzles.Services;

/// <summary>
/// Service for managing GitHub issues.
/// </summary>
public interface IGitHubService
{
    /// <summary>
    /// Creates a GitHub issue for feedback.
    /// </summary>
    /// <param name="game">Game number (e.g., "01", "00" for suggestions)</param>
    /// <param name="rating">Optional rating 1-5</param>
    /// <param name="text">Optional feedback text (original)</param>
    /// <param name="nickname">Optional nickname</param>
    /// <param name="aiTitle">Optional AI-generated title</param>
    /// <param name="aiTranslation">Optional AI-translated text (English)</param>
    /// <returns>True if issue was created successfully</returns>
    Task<bool> CreateFeedbackIssueAsync(string game, int? rating, string? text, string? nickname,
        string? aiTitle = null, string? aiTranslation = null);

    /// <summary>
    /// Closes a GitHub issue with a comment explaining the resolution.
    /// </summary>
    /// <param name="issueNumber">The issue number to close</param>
    /// <param name="comment">Comment explaining what was done to resolve the issue</param>
    /// <returns>True if issue was closed successfully</returns>
    Task<bool> CloseIssueAsync(int issueNumber, string comment);
}
