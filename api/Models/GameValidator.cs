namespace Puzzles.Models;

/// <summary>
/// Shared validation for game numbers.
/// Game numbers match folder structure. Numbers are never reused if a game is removed.
/// </summary>
public static class GameValidator
{
    /// <summary>
    /// Explicit set of valid game numbers.
    /// Update this when adding/removing games.
    /// </summary>
    public static readonly HashSet<string> ValidGames =
    [
        "01", // Reversi
        "02", // Telte og Træer
        "03", // Sudoku
        "04", // Nonogram
        "05", // 2048
        "06", // Minestryger
        "07", // Hukommelse
        "08", // Kabale
        "09", // Kalaha
        "10", // Ordleg
        "11", // Kryds og Bolle
        "12", // Rørføring
        "13", // 15-Puslespil
        "14"  // Kodeknækker
    ];

    /// <summary>
    /// Validates and normalizes a game number.
    /// Accepts "1", "01", "  01  " etc. Returns normalized "01" format or null if invalid.
    /// </summary>
    public static string? NormalizeGame(string? game)
    {
        if (string.IsNullOrWhiteSpace(game))
            return null;

        var trimmed = game.Trim();

        // Try parse as int to normalize to 2-digit format
        if (int.TryParse(trimmed, out var num))
        {
            var normalized = num.ToString("D2");
            return ValidGames.Contains(normalized) ? normalized : null;
        }

        return null;
    }

    /// <summary>
    /// Checks if a game number is valid.
    /// </summary>
    public static bool IsValid(string? game)
    {
        return NormalizeGame(game) != null;
    }
}
