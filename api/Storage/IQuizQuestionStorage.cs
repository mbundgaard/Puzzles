namespace Puzzles.Storage;

/// <summary>
/// Storage interface for tracking quiz questions asked to users.
/// Used to prevent asking the same questions twice in the same day.
/// </summary>
public interface IQuizQuestionStorage
{
    /// <summary>
    /// Saves questions that were asked to a user.
    /// </summary>
    /// <param name="date">The date (yyyy-MM-dd format)</param>
    /// <param name="nickname">The user's nickname (or "anonymous" if not set)</param>
    /// <param name="categoryId">The category ID (e.g., "K1", "A3")</param>
    /// <param name="questions">The question texts to save</param>
    /// <param name="elapsedMs">AI response time in milliseconds</param>
    Task SaveQuestionsAsync(string date, string nickname, string categoryId, IEnumerable<string> questions, long elapsedMs);

    /// <summary>
    /// Gets questions that were previously asked to a user today.
    /// </summary>
    /// <param name="date">The date (yyyy-MM-dd format)</param>
    /// <param name="nickname">The user's nickname (or "anonymous" if not set)</param>
    /// <param name="categoryId">The category ID (e.g., "K1", "A3")</param>
    /// <returns>List of previously asked question texts</returns>
    Task<List<string>> GetAskedQuestionsAsync(string date, string nickname, string categoryId);
}
