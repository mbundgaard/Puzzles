using Puzzles.Models;

namespace Puzzles.Storage;

/// <summary>
/// Storage interface for Battleship multiplayer games.
/// </summary>
public interface IBattleshipStorage
{
    /// <summary>
    /// Creates a new game and returns the game ID.
    /// </summary>
    Task<BattleshipGame> CreateGameAsync(string creatorName, int winnerPoints, int loserPoints);

    /// <summary>
    /// Gets a game by ID.
    /// </summary>
    Task<BattleshipGame?> GetGameAsync(string gameId);

    /// <summary>
    /// Updates a game.
    /// </summary>
    Task UpdateGameAsync(BattleshipGame game);

    /// <summary>
    /// Gets all open games (status = open, not expired).
    /// </summary>
    Task<List<BattleshipGame>> GetOpenGamesAsync();

    /// <summary>
    /// Deletes expired open games (older than 10 minutes).
    /// </summary>
    Task CleanupExpiredGamesAsync();
}
