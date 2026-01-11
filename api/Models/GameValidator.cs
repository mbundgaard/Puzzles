namespace Puzzles.Models;

/// <summary>
/// Shared validation for game numbers.
/// Game numbers match folder structure.
/// </summary>
public static class GameValidator
{
    /// <summary>
    /// Validates and normalizes a game number.
    /// Accepts "1", "01", "  01  " etc. Returns normalized "01" format or null if invalid.
    /// Accepts any number 0-99.
    /// </summary>
    public static string? NormalizeGame(string? game)
    {
        if (string.IsNullOrWhiteSpace(game))
            return null;

        var trimmed = game.Trim();

        // Try parse as int to normalize to 2-digit format
        if (int.TryParse(trimmed, out var num) && num >= 0 && num <= 99)
        {
            return num.ToString("D2");
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
