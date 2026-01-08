namespace Puzzles.Models;

/// <summary>
/// Result from AI processing of feedback text.
/// </summary>
public class FeedbackProcessingResult
{
    public string Title { get; set; } = "";
    public string TranslatedText { get; set; } = "";
}
