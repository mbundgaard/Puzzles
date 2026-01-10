namespace Puzzles.Services;

/// <summary>
/// Service for managing GitHub issues.
/// </summary>
public interface IGitHubService
{
    /// <summary>
    /// Creates a GitHub issue for feedback.
    /// </summary>
    /// <param name="game">Game number: "00" = new game suggestion, "01"-"99" = game-specific, null = general feedback</param>
    /// <param name="rating">Optional rating 1-5</param>
    /// <param name="text">Optional feedback text (original)</param>
    /// <param name="nickname">Optional nickname</param>
    /// <param name="aiTitle">Optional AI-generated title</param>
    /// <param name="aiTranslation">Optional AI-translated text (English)</param>
    /// <returns>True if issue was created successfully</returns>
    Task<bool> CreateFeedbackIssueAsync(string? game, int? rating, string? text, string? nickname,
        string? aiTitle = null, string? aiTranslation = null);

    /// <summary>
    /// Creates a GitHub issue with the specified title, body, and optional label.
    /// </summary>
    /// <param name="title">Issue title</param>
    /// <param name="body">Issue body (markdown)</param>
    /// <param name="label">Optional label to apply</param>
    /// <returns>The created issue number, or null if creation failed</returns>
    Task<int?> CreateIssueAsync(string title, string body, string? label = null);

    /// <summary>
    /// Edits a GitHub issue's title, body, state, and/or label.
    /// </summary>
    /// <param name="issueNumber">The issue number to edit</param>
    /// <param name="title">New title (null to keep existing)</param>
    /// <param name="body">New body (null to keep existing)</param>
    /// <param name="state">New state: "open" or "closed" (null to keep existing)</param>
    /// <param name="label">Label to set (replaces existing labels, null to keep existing)</param>
    /// <returns>True if issue was edited successfully</returns>
    Task<bool> EditIssueAsync(int issueNumber, string? title, string? body, string? state = null, string? label = null);

    /// <summary>
    /// Closes a GitHub issue with a comment explaining the resolution.
    /// </summary>
    /// <param name="issueNumber">The issue number to close</param>
    /// <param name="comment">Comment explaining what was done to resolve the issue</param>
    /// <returns>True if issue was closed successfully</returns>
    Task<bool> CloseIssueAsync(int issueNumber, string comment);

    /// <summary>
    /// Deletes a GitHub issue. Note: This requires admin permissions and may not be available.
    /// </summary>
    /// <param name="issueNumber">The issue number to delete</param>
    /// <returns>True if issue was deleted successfully</returns>
    Task<bool> DeleteIssueAsync(int issueNumber);
}
