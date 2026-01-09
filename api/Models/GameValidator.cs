namespace Puzzles.Models;

/// <summary>
/// Shared validation for game numbers.
/// Game numbers match folder structure. Numbers are never reused if a game is removed.
/// </summary>
public static class GameValidator
{
    /// <summary>
    /// Game names by number. Keep in sync with site-index.json.
    /// </summary>
    private static readonly Dictionary<string, string> GameNames = new()
    {
        ["00"] = "Game Suggestion",
        ["01"] = "Reversi",
        ["05"] = "2048",
        ["06"] = "Minestryger",
        ["07"] = "Hukommelse",
        ["08"] = "Kabale",
        ["09"] = "Kalaha",
        ["10"] = "Ordleg",
        ["11"] = "Kryds og Bolle",
        ["12"] = "Rørføring",
        ["13"] = "Skubbepuslespil",
        ["14"] = "Mastermind",
        ["17"] = "Pind",
        ["18"] = "Dam",
        ["19"] = "Mølle",
        ["20"] = "Slitherlink",
        ["21"] = "Fire på Stribe",
        ["22"] = "Tårnet i Hanoi",
        ["23"] = "Slange",
        ["24"] = "Tangram",
        ["25"] = "Sænke Slagskibe"
    };

    /// <summary>
    /// Gets the game name for a normalized game number.
    /// </summary>
    public static string? GetGameName(string? normalizedGame)
    {
        if (normalizedGame == null) return null;
        return GameNames.TryGetValue(normalizedGame, out var name) ? name : null;
    }

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
