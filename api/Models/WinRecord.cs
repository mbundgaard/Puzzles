namespace Puzzles.Models;

/// <summary>
/// Represents a single win record.
/// Designed to map to Azure Table Storage entity.
/// PartitionKey: {year}-{month} (e.g., "2025-12")
/// RowKey: {game}_{nickname}_{timestamp-ticks}
/// </summary>
public class WinRecord
{
    public string Nickname { get; set; } = string.Empty;
    public string Game { get; set; } = string.Empty;
    public int Points { get; set; } = 1;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // For Azure Table Storage
    public string PartitionKey => $"{Timestamp:yyyy-MM}";
    public string RowKey => $"{Game}_{Nickname}_{Timestamp.Ticks}";
}

/// <summary>
/// Request model for recording a win.
/// </summary>
public class WinRequest
{
    public string Nickname { get; set; } = string.Empty;
    public string Game { get; set; } = string.Empty;
    public int Points { get; set; } = 1;
}

/// <summary>
/// Leaderboard entry for display.
/// </summary>
public class LeaderboardEntry
{
    public int Rank { get; set; }
    public string Nickname { get; set; } = string.Empty;
    public int Points { get; set; }
}

/// <summary>
/// Response model for leaderboard.
/// </summary>
public class LeaderboardResponse
{
    public string Period { get; set; } = string.Empty;
    public string? Game { get; set; }
    public int TotalPoints { get; set; }
    public List<LeaderboardEntry> Entries { get; set; } = [];
}
