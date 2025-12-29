namespace Puzzles.Models;

/// <summary>
/// Request model for submitting feedback.
/// </summary>
public class FeedbackRequest
{
    public string Game { get; set; } = string.Empty;
    public int Rating { get; set; } // 1-5
    public string? Text { get; set; }
    public string? Nickname { get; set; }
}
