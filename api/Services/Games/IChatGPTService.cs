using Puzzles.Models;

namespace Puzzles.Services.Games;

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
/// Result from picking an animal.
/// </summary>
public class AnimalPickResult
{
    public string Animal { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
}

/// <summary>
/// Result from generating a word search puzzle.
/// </summary>
public class WordSearchResult
{
    public List<string> Words { get; set; } = new();
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
    /// <param name="feedbackType">The type of feedback being processed</param>
    /// <returns>Processed result with title and translation, or null if processing failed</returns>
    Task<FeedbackProcessingResult?> ProcessFeedbackAsync(string text, FeedbackType feedbackType);

    /// <summary>
    /// Picks a random animal for the guessing game.
    /// </summary>
    /// <param name="category">Optional category (e.g., "havdyr", "fugle")</param>
    /// <param name="difficulty">Difficulty level: "easy", "medium", or "hard" (defaults to "hard")</param>
    /// <returns>Animal name and category</returns>
    Task<AnimalPickResult?> PickAnimalAsync(string? category, string? difficulty = "hard");

    /// <summary>
    /// Answers a yes/no question about an animal.
    /// </summary>
    /// <param name="animal">The animal to answer about</param>
    /// <param name="question">The user's question</param>
    /// <returns>"Ja", "Nej", or "Måske"</returns>
    Task<string?> AskAboutAnimalAsync(string animal, string question);

    /// <summary>
    /// Generates words for a word search puzzle.
    /// </summary>
    /// <param name="difficulty">Difficulty level: "easy", "medium", or "hard"</param>
    /// <returns>List of 8 Danish words appropriate for the difficulty</returns>
    Task<WordSearchResult?> GenerateWordSearchAsync(string difficulty);

    /// <summary>
    /// Generates a hint about an animal for the guessing game.
    /// </summary>
    /// <param name="animal">The animal to give a hint about</param>
    /// <param name="previousHints">Previously given hints to avoid repetition</param>
    /// <returns>A helpful hint in Danish</returns>
    Task<string?> GetHintAboutAnimalAsync(string animal, List<string>? previousHints = null);
}
