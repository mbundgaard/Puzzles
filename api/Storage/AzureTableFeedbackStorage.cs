using Azure;
using Azure.Data.Tables;
using Puzzles.Models;

namespace Puzzles.Storage;

/// <summary>
/// Azure Table Storage entity for feedback.
/// </summary>
public class FeedbackEntity : ITableEntity
{
    public string PartitionKey { get; set; } = string.Empty; // game number
    public string RowKey { get; set; } = string.Empty;       // inverted ticks for descending order
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public string Game { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Text { get; set; }
    public string? Nickname { get; set; }
    public DateTime RecordedAt { get; set; }
}

/// <summary>
/// Azure Table Storage implementation for feedback.
/// </summary>
public class AzureTableFeedbackStorage : IFeedbackStorage
{
    private readonly TableClient _tableClient;
    private const string TableName = "Feedback";

    public AzureTableFeedbackStorage(string connectionString)
    {
        var serviceClient = new TableServiceClient(connectionString);
        _tableClient = serviceClient.GetTableClient(TableName);
        _tableClient.CreateIfNotExists();
    }

    public async Task RecordFeedbackAsync(FeedbackRecord record)
    {
        var entity = new FeedbackEntity
        {
            PartitionKey = record.PartitionKey,
            RowKey = record.RowKey,
            Game = record.Game,
            Rating = record.Rating,
            Text = record.Text,
            Nickname = record.Nickname,
            RecordedAt = record.Timestamp
        };

        await _tableClient.AddEntityAsync(entity);
    }

    public async Task<FeedbackStatsResponse> GetFeedbackStatsAsync()
    {
        var feedback = new List<FeedbackEntity>();
        await foreach (var entity in _tableClient.QueryAsync<FeedbackEntity>())
        {
            feedback.Add(entity);
        }

        var perGame = feedback
            .GroupBy(f => f.Game)
            .Select(g => new FeedbackStats
            {
                Game = g.Key,
                Count = g.Count(),
                AverageRating = Math.Round(g.Average(f => f.Rating), 1)
            })
            .OrderBy(g => g.Game)
            .ToList();

        var totalCount = feedback.Count;
        var overallAvg = totalCount > 0 ? Math.Round(feedback.Average(f => f.Rating), 1) : 0;

        return new FeedbackStatsResponse
        {
            TotalFeedback = totalCount,
            OverallAverageRating = overallAvg,
            PerGame = perGame
        };
    }

    public async Task<List<FeedbackRecord>> GetRecentFeedbackAsync(string? game = null, int limit = 50)
    {
        var feedback = new List<FeedbackRecord>();

        // Query with optional game filter
        var query = string.IsNullOrEmpty(game)
            ? _tableClient.QueryAsync<FeedbackEntity>()
            : _tableClient.QueryAsync<FeedbackEntity>($"PartitionKey eq '{game}'");

        await foreach (var entity in query)
        {
            feedback.Add(new FeedbackRecord
            {
                Game = entity.Game,
                Rating = entity.Rating,
                Text = entity.Text,
                Nickname = entity.Nickname,
                Timestamp = entity.RecordedAt
            });

            if (feedback.Count >= limit)
                break;
        }

        return feedback;
    }
}
