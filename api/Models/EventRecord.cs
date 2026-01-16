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

#region Date Range Stats Models

/// <summary>
/// Response model for date range statistics.
/// </summary>
public class StatsResponse
{
    public StatsPeriod Period { get; set; } = new();
    public StatsSummary Summary { get; set; } = new();
    public PreviousPeriodStats? PreviousPeriod { get; set; }
    public List<GameStatsWithName> PerGame { get; set; } = [];
    public List<DailyStats> DailyBreakdown { get; set; } = [];
    public List<PlayerStats> Players { get; set; } = [];
}

/// <summary>
/// Period information for stats request.
/// </summary>
public class StatsPeriod
{
    public string From { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
    public int Days { get; set; }
}

/// <summary>
/// Summary statistics for a period.
/// </summary>
public class StatsSummary
{
    public int TotalStarts { get; set; }
    public int TotalCompletions { get; set; }
    public double CompletionRate => TotalStarts > 0 ? Math.Round((double)TotalCompletions / TotalStarts * 100, 1) : 0;
}

/// <summary>
/// Previous period comparison statistics.
/// </summary>
public class PreviousPeriodStats
{
    public string From { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
    public int TotalStarts { get; set; }
    public int TotalCompletions { get; set; }
    public double StartsChange { get; set; }
    public double CompletionsChange { get; set; }
}

/// <summary>
/// Game stats including the game name.
/// </summary>
public class GameStatsWithName
{
    public string Game { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Starts { get; set; }
    public int Completions { get; set; }
    public double CompletionRate => Starts > 0 ? Math.Round((double)Completions / Starts * 100, 1) : 0;
}

/// <summary>
/// Daily breakdown statistics.
/// </summary>
public class DailyStats
{
    public string Date { get; set; } = string.Empty;
    public string DayOfWeek { get; set; } = string.Empty;
    public int Starts { get; set; }
    public int Completions { get; set; }
}

/// <summary>
/// Player statistics with per-game breakdown.
/// </summary>
public class PlayerStats
{
    public string Nickname { get; set; } = string.Empty;
    public int Starts { get; set; }
    public int Completions { get; set; }
    public List<PlayerGameStats> Games { get; set; } = [];
}

/// <summary>
/// Per-game stats for a player.
/// </summary>
public class PlayerGameStats
{
    public string Game { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Starts { get; set; }
    public int Completions { get; set; }
}

#endregion

/// <summary>
/// Static mapping of game numbers to names.
/// </summary>
public static class GameNames
{
    private static readonly Dictionary<string, string> Names = new()
    {
        { "01", "Reversi" },
        { "02", "Tents" },
        { "03", "Sudoku" },
        { "04", "Quiz Master" },
        { "05", "2048" },
        { "06", "Minesweeper" },
        { "07", "Memory" },
        { "08", "Solitaire" },
        { "09", "Kalaha" },
        { "10", "Word Game" },
        { "11", "Tic Tac Toe" },
        { "12", "Pipe Puzzle" },
        { "13", "Slide Puzzle" },
        { "14", "Mastermind" },
        { "17", "Peg Solitaire" },
        { "18", "Checkers" },
        { "19", "Nine Men's Morris" },
        { "21", "Connect Four" },
        { "22", "Tower of Hanoi" },
        { "23", "Snake" },
        { "24", "Tangram" },
        { "25", "Battleship" },
        { "26", "Guess the Animal" },
        { "27", "Word Search" },
        { "28", "Maze" },
        { "29", "Stitchwork" }
    };

    public static string GetName(string gameNumber) =>
        Names.TryGetValue(gameNumber, out var name) ? name : $"Game {gameNumber}";
}
