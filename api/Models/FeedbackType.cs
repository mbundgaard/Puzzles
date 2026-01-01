namespace Puzzles.Models;

/// <summary>
/// Type of feedback being submitted.
/// </summary>
public enum FeedbackType
{
    /// <summary>
    /// Feedback about a specific game (e.g., bug report, feature request for game 01-99).
    /// </summary>
    GameSpecific,

    /// <summary>
    /// Suggestion for a new game to add to the site.
    /// </summary>
    NewGameSuggestion,

    /// <summary>
    /// General feedback about the site/app itself (not about a specific game).
    /// </summary>
    GeneralFeedback
}
