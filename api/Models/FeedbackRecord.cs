namespace Puzzles.Models;

/// <summary>
/// Request model for submitting feedback.
/// Game values:
/// - "00": New game suggestion
/// - "01"-"99": Game-specific feedback
/// - null/empty: General site feedback
/// </summary>
public class FeedbackRequest
{
    public string? Game { get; set; }
    public int? Rating { get; set; } // 1-5, optional
    public string? Text { get; set; }
    public string? Nickname { get; set; }
}
