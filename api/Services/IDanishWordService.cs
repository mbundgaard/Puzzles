namespace Puzzles.Services;

/// <summary>
/// Service for validating Danish words.
/// </summary>
public interface IDanishWordService
{
    /// <summary>
    /// Checks if a word is a valid Danish word.
    /// </summary>
    /// <param name="word">The word to validate (case-insensitive)</param>
    /// <returns>True if the word is valid Danish</returns>
    bool IsValidWord(string word);

    /// <summary>
    /// Validates multiple words and returns only the valid ones.
    /// </summary>
    /// <param name="words">Words to validate</param>
    /// <returns>List of valid Danish words</returns>
    List<string> FilterValidWords(IEnumerable<string> words);

    /// <summary>
    /// Gets random valid Danish words for a given difficulty.
    /// </summary>
    /// <param name="count">Number of words to return</param>
    /// <param name="difficulty">Difficulty level: easy (3-5 chars), medium (4-7 chars), hard (6-10 chars)</param>
    /// <returns>List of random valid Danish words</returns>
    List<string> GetRandomWords(int count, string difficulty);

    /// <summary>
    /// Gets the total count of words in the dictionary.
    /// </summary>
    int WordCount { get; }
}
