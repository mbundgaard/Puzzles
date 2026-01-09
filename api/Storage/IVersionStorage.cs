namespace Puzzles.Storage;

public interface IVersionStorage
{
    /// <summary>
    /// Gets the latest known version.
    /// </summary>
    Task<int> GetLatestVersionAsync();

    /// <summary>
    /// Checks if the client version is older than the server version.
    /// Returns true if server has a newer version (client should update).
    /// </summary>
    Task<bool> CheckAndUpdateVersionAsync(int clientVersion);

    /// <summary>
    /// Sets the version directly (for deployment use).
    /// </summary>
    Task SetVersionAsync(int version);
}
