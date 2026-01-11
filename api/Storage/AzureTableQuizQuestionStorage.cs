using System.Text.Json;
using Azure;
using Azure.Data.Tables;

namespace Puzzles.Storage;

/// <summary>
/// Azure Table Storage entity for quiz questions asked to users.
/// Stores all questions from a single quiz session as a JSON array.
/// </summary>
public class QuizQuestionEntity : ITableEntity
{
    public string PartitionKey { get; set; } = string.Empty; // date_nickname_categoryId
    public string RowKey { get; set; } = string.Empty;       // timestamp ticks
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public string QuestionsJson { get; set; } = string.Empty; // JSON array of question texts
    public long ElapsedMs { get; set; } // AI response time in milliseconds
}

/// <summary>
/// Azure Table Storage implementation for tracking quiz questions.
/// </summary>
public class AzureTableQuizQuestionStorage : IQuizQuestionStorage
{
    private readonly TableClient _tableClient;
    private const string TableName = "QuizQuestions";

    public AzureTableQuizQuestionStorage(string connectionString)
    {
        var serviceClient = new TableServiceClient(connectionString);
        _tableClient = serviceClient.GetTableClient(TableName);
        _tableClient.CreateIfNotExists();
    }

    public async Task SaveQuestionsAsync(string date, string nickname, string categoryId, IEnumerable<string> questions, long elapsedMs)
    {
        var partitionKey = BuildPartitionKey(date, nickname, categoryId);
        var rowKey = DateTime.UtcNow.Ticks.ToString();

        var entity = new QuizQuestionEntity
        {
            PartitionKey = partitionKey,
            RowKey = rowKey,
            QuestionsJson = JsonSerializer.Serialize(questions.ToList()),
            ElapsedMs = elapsedMs
        };

        try
        {
            await _tableClient.AddEntityAsync(entity);
        }
        catch
        {
            // Ignore errors
        }
    }

    public async Task<List<string>> GetAskedQuestionsAsync(string date, string nickname, string categoryId)
    {
        var partitionKey = BuildPartitionKey(date, nickname, categoryId);
        var filter = $"PartitionKey eq '{partitionKey}'";

        var allQuestions = new List<string>();
        await foreach (var entity in _tableClient.QueryAsync<QuizQuestionEntity>(filter))
        {
            try
            {
                var questions = JsonSerializer.Deserialize<List<string>>(entity.QuestionsJson);
                if (questions != null)
                {
                    allQuestions.AddRange(questions);
                }
            }
            catch
            {
                // Ignore malformed JSON
            }
        }

        return allQuestions;
    }

    private static string BuildPartitionKey(string date, string nickname, string categoryId)
    {
        // Sanitize nickname for use in partition key (remove special chars)
        var safeNickname = SanitizeForPartitionKey(nickname);
        return $"{date}_{safeNickname}_{categoryId}";
    }

    private static string SanitizeForPartitionKey(string value)
    {
        // Remove characters not allowed in partition keys: / \ # ?
        return string.Concat(value.Where(c => c != '/' && c != '\\' && c != '#' && c != '?'))
            .ToLowerInvariant();
    }
}
