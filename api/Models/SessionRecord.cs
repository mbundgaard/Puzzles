namespace Puzzles.Models;

/// <summary>
/// Device information collected at session start.
/// </summary>
public class DeviceInfo
{
    public string? UserAgent { get; set; }
    public string? Language { get; set; }
    public string? Timezone { get; set; }
    public string? Screen { get; set; }
    public double? PixelRatio { get; set; }
    public bool? Pwa { get; set; }
    public int? Cores { get; set; }
    public double? Memory { get; set; }
    public bool? Touch { get; set; }
}

/// <summary>
/// A single event within a session.
/// </summary>
public class SessionEvent
{
    public string Event { get; set; } = string.Empty;  // newGame, win, lose
    public DateTime Time { get; set; }
}

/// <summary>
/// Request to start a new session.
/// </summary>
public class SessionStartRequest
{
    public string? SessionId { get; set; }
    public string? Game { get; set; }
    public string? Nickname { get; set; }
    public DeviceInfo? Device { get; set; }
}

/// <summary>
/// Request to add an event to a session.
/// </summary>
public class SessionUpdateRequest
{
    public string? SessionId { get; set; }
    public string? Event { get; set; }  // newGame, win, lose
}

/// <summary>
/// Request to end a session.
/// </summary>
public class SessionEndRequest
{
    public string? SessionId { get; set; }
}

/// <summary>
/// Internal session record for storage.
/// </summary>
public class SessionRecord
{
    public string SessionId { get; set; } = string.Empty;
    public string Game { get; set; } = string.Empty;
    public string? Nickname { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public DeviceInfo? Device { get; set; }
    public List<SessionEvent> Events { get; set; } = new();

    // Azure Table Storage keys
    public string PartitionKey => Game;
    public string RowKey => SessionId;
}
