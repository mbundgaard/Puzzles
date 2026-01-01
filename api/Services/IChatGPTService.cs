namespace Puzzles.Services;

/// <summary>
/// Result from processing feedback with ChatGPT.
/// </summary>
public class FeedbackProcessingResult
{
    /// <summary>
    /// AI-generated concise title in English.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// English translation of the feedback text.
    /// </summary>
    public string TranslatedText { get; set; } = string.Empty;
}

/// <summary>
/// Service for processing text with Azure OpenAI (ChatGPT).
/// </summary>
public interface IChatGPTService
{
    /// <summary>
    /// Processes feedback text: translates to English and generates a concise title.
    /// </summary>
    /// <param name="text">Original feedback text (possibly in Danish)</param>
    /// <param name="isGameSuggestion">True if this is a new game suggestion (game 00)</param>
    /// <returns>Processed result with title and translation, or null if processing failed</returns>
    Task<FeedbackProcessingResult?> ProcessFeedbackAsync(string text, bool isGameSuggestion);
}
