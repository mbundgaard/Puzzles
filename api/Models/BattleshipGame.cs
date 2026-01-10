namespace Puzzles.Models;

/// <summary>
/// Represents a multiplayer Battleship game.
/// PartitionKey: "game25" (fixed)
/// RowKey: Game ID (short code like "ABC123")
/// </summary>
public class BattleshipGame
{
    public string GameId { get; set; } = string.Empty;
    public string Status { get; set; } = BattleshipStatus.Open; // open, placing, playing, ended

    public string CreatorName { get; set; } = string.Empty;
    public string CreatorToken { get; set; } = string.Empty;
    public string? JoinerName { get; set; }
    public string? JoinerToken { get; set; }

    public int WinnerPoints { get; set; } // 3, 4, or 5
    public int LoserPoints { get; set; }  // 0, 1, or 2 (applied as negative)

    public string? CreatorShips { get; set; } // JSON array of coordinates: [[row,col], ...]
    public string? JoinerShips { get; set; }
    public string CreatorShots { get; set; } = "[]"; // JSON array of coordinates with hit: [[row,col,hit], ...]
    public string JoinerShots { get; set; } = "[]";

    public string CurrentTurn { get; set; } = "creator"; // "creator" or "joiner"
    public string? Winner { get; set; } // "creator", "joiner", or null

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // For Azure Table Storage
    public string PartitionKey => "game25";
    public string RowKey => GameId;
}

/// <summary>
/// Game status constants.
/// </summary>
public static class BattleshipStatus
{
    public const string Open = "open";
    public const string Placing = "placing";
    public const string Playing = "playing";
    public const string Ended = "ended";
}

