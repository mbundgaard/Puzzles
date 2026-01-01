using System.Text.Json;
using Azure;
using Azure.Data.Tables;
using Puzzles.Models;

namespace Puzzles.Storage;

/// <summary>
/// Azure Table Storage entity for sessions.
/// </summary>
public class SessionEntity : ITableEntity
{
    public string PartitionKey { get; set; } = string.Empty; // game number
    public string RowKey { get; set; } = string.Empty;       // session GUID
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public string Game { get; set; } = string.Empty;
    public string? Nickname { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? DeviceJson { get; set; }   // JSON serialized DeviceInfo
    public string EventsJson { get; set; } = "[]";  // JSON serialized List<SessionEvent>
}

/// <summary>
/// Azure Table Storage implementation for sessions.
/// </summary>
public class AzureTableSessionStorage : ISessionStorage
{
    private readonly TableClient _tableClient;
    private const string TableName = "Sessions";
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public AzureTableSessionStorage(string connectionString)
    {
        var serviceClient = new TableServiceClient(connectionString);
        _tableClient = serviceClient.GetTableClient(TableName);
        _tableClient.CreateIfNotExists();
    }

    public async Task StartSessionAsync(SessionRecord session)
    {
        var entity = new SessionEntity
        {
            PartitionKey = session.PartitionKey,
            RowKey = session.RowKey,
            Game = session.Game,
            Nickname = session.Nickname,
            StartTime = session.StartTime,
            DeviceJson = session.Device != null
                ? JsonSerializer.Serialize(session.Device, JsonOptions)
                : null,
            EventsJson = "[]"
        };

        await _tableClient.AddEntityAsync(entity);
    }

    public async Task AddEventAsync(string game, string sessionId, SessionEvent sessionEvent)
    {
        // Get existing entity
        var response = await _tableClient.GetEntityAsync<SessionEntity>(game, sessionId);
        var entity = response.Value;

        // Parse existing events
        var events = JsonSerializer.Deserialize<List<SessionEvent>>(entity.EventsJson, JsonOptions)
            ?? new List<SessionEvent>();

        // Add new event
        events.Add(sessionEvent);

        // Update entity
        entity.EventsJson = JsonSerializer.Serialize(events, JsonOptions);

        await _tableClient.UpdateEntityAsync(entity, ETag.All, TableUpdateMode.Replace);
    }

    public async Task EndSessionAsync(string game, string sessionId, DateTime endTime)
    {
        // Get existing entity
        var response = await _tableClient.GetEntityAsync<SessionEntity>(game, sessionId);
        var entity = response.Value;

        // Set end time
        entity.EndTime = endTime;

        await _tableClient.UpdateEntityAsync(entity, ETag.All, TableUpdateMode.Replace);
    }

    public async Task<SessionRecord?> GetSessionAsync(string game, string sessionId)
    {
        try
        {
            var response = await _tableClient.GetEntityAsync<SessionEntity>(game, sessionId);
            var entity = response.Value;

            return new SessionRecord
            {
                SessionId = entity.RowKey,
                Game = entity.Game,
                Nickname = entity.Nickname,
                StartTime = entity.StartTime,
                EndTime = entity.EndTime,
                Device = !string.IsNullOrEmpty(entity.DeviceJson)
                    ? JsonSerializer.Deserialize<DeviceInfo>(entity.DeviceJson, JsonOptions)
                    : null,
                Events = JsonSerializer.Deserialize<List<SessionEvent>>(entity.EventsJson, JsonOptions)
                    ?? new List<SessionEvent>()
            };
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }
}
