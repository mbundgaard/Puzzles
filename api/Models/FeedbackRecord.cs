namespace Puzzles.Models;

/// <summary>
/// Represents user feedback for a game.
/// Designed to map to Azure Table Storage entity.
/// PartitionKey: {game} (e.g., "01", "02")
/// RowKey: {timestamp-ticks}
/// </summary>
public class FeedbackRecord
{
    public string Game { get; set; } = string.Empty;
    public int Rating { get; set; } // 1-5
    public string? Text { get; set; }
    public string? Nickname { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // For Azure Table Storage
    public string PartitionKey => Game;
    public string RowKey => $"{DateTime.MaxValue.Ticks - Timestamp.Ticks:D19}"; // Descending order
}

/// <summary>
/// Request model for submitting feedback.
/// </summary>
public class FeedbackRequest
{
    public string Game { get; set; } = string.Empty;
    public int Rating { get; set; } // 1-5
    public string? Text { get; set; }
    public string? Nickname { get; set; }
}

/// <summary>
/// Response model for feedback statistics per game.
/// </summary>
public class FeedbackStats
{
    public string Game { get; set; } = string.Empty;
    public int Count { get; set; }
    public double AverageRating { get; set; }
}

/// <summary>
/// Response model for all feedback statistics.
/// </summary>
public class FeedbackStatsResponse
{
    public int TotalFeedback { get; set; }
    public double OverallAverageRating { get; set; }
    public List<FeedbackStats> PerGame { get; set; } = [];
}
