namespace Puzzles.Storage;

public interface IVersionStorage
{
    /// <summary>
    /// Gets the latest known version.
    /// </summary>
    Task<int> GetLatestVersionAsync();

    /// <summary>
    /// Updates the latest version if the provided version is newer.
    /// Returns true if a newer version already exists (client should update).
    /// </summary>
    Task<bool> CheckAndUpdateVersionAsync(int clientVersion);
}
