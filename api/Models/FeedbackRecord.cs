namespace Puzzles.Models;

/// <summary>
/// Request model for submitting feedback.
/// </summary>
public class FeedbackRequest
{
    public string Game { get; set; } = string.Empty;
    public int? Rating { get; set; } // 1-5, optional
    public string? Text { get; set; }
    public string? Nickname { get; set; }
    /// <summary>
    /// Feedback type for game "00": "suggestion" (new game) or "feedback" (general site feedback).
    /// Null/empty for game-specific feedback (games 01-99).
    /// </summary>
    public string? Type { get; set; }
}
