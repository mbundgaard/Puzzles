using Puzzles.Models;

namespace Puzzles.Storage;

/// <summary>
/// Interface for session storage operations.
/// </summary>
public interface ISessionStorage
{
    /// <summary>
    /// Creates a new session record.
    /// </summary>
    Task StartSessionAsync(SessionRecord session);

    /// <summary>
    /// Adds an event to an existing session.
    /// </summary>
    Task AddEventAsync(string game, string sessionId, SessionEvent sessionEvent);

    /// <summary>
    /// Ends a session by setting the end time.
    /// </summary>
    Task EndSessionAsync(string game, string sessionId, DateTime endTime);

    /// <summary>
    /// Gets a session by game and session ID.
    /// </summary>
    Task<SessionRecord?> GetSessionAsync(string game, string sessionId);
}
