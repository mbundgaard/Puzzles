namespace Puzzles.Models;

/// <summary>
/// Event types for tracking game usage.
/// </summary>
public enum GameEventType
{
    Start,
    Complete
}

/// <summary>
/// Represents a game event (start or complete).
/// Designed to map to Azure Table Storage entity.
/// PartitionKey: {year}-{month} (e.g., "2025-12")
/// RowKey: {game}_{event}_{timestamp-ticks}
/// </summary>
public class EventRecord
{
    public string Game { get; set; } = string.Empty;
    public GameEventType EventType { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? Nickname { get; set; }

    // For Azure Table Storage
    public string PartitionKey => $"{Timestamp:yyyy-MM}";
    public string RowKey => $"{Game}_{EventType}_{Timestamp.Ticks}";
}

/// <summary>
/// Request model for recording an event.
/// </summary>
public class EventRequest
{
    public string Game { get; set; } = string.Empty;
    public string Event { get; set; } = string.Empty; // "start" or "complete"
    public string? Nickname { get; set; }
}

/// <summary>
/// Stats for a single game.
/// </summary>
public class GameStats
{
    public string Game { get; set; } = string.Empty;
    public int Starts { get; set; }
    public int Completions { get; set; }
    public double CompletionRate => Starts > 0 ? Math.Round((double)Completions / Starts * 100, 1) : 0;
}

/// <summary>
/// Response model for usage statistics.
/// </summary>
public class UsageStatsResponse
{
    public string Period { get; set; } = string.Empty;
    public int TotalStarts { get; set; }
    public int TotalCompletions { get; set; }
    public double OverallCompletionRate => TotalStarts > 0 ? Math.Round((double)TotalCompletions / TotalStarts * 100, 1) : 0;
    public List<GameStats> PerGame { get; set; } = [];
}
