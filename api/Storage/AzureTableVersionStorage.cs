using Azure;
using Azure.Data.Tables;

namespace Puzzles.Storage;

public class VersionEntity : ITableEntity
{
    public string PartitionKey { get; set; } = "version";
    public string RowKey { get; set; } = "latest";
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }

    public int Version { get; set; }
}

public class AzureTableVersionStorage : IVersionStorage
{
    private readonly TableClient _tableClient;
    private const string TableName = "Version";
    private const string PartitionKey = "version";
    private const string RowKey = "latest";

    public AzureTableVersionStorage(string connectionString)
    {
        var serviceClient = new TableServiceClient(connectionString);
        _tableClient = serviceClient.GetTableClient(TableName);
        _tableClient.CreateIfNotExists();
    }

    public async Task<int> GetLatestVersionAsync()
    {
        try
        {
            var response = await _tableClient.GetEntityAsync<VersionEntity>(PartitionKey, RowKey);
            return response.Value.Version;
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return 0;
        }
    }

    public async Task<bool> CheckAndUpdateVersionAsync(int clientVersion)
    {
        try
        {
            var response = await _tableClient.GetEntityAsync<VersionEntity>(PartitionKey, RowKey);
            var entity = response.Value;

            if (clientVersion > entity.Version)
            {
                // Client has newer version - update storage
                entity.Version = clientVersion;
                await _tableClient.UpdateEntityAsync(entity, entity.ETag, TableUpdateMode.Replace);
                return false; // No newer version exists
            }
            else if (clientVersion < entity.Version)
            {
                // Storage has newer version - client should update
                return true;
            }
            else
            {
                // Same version
                return false;
            }
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            // No version stored yet - store client's version
            var entity = new VersionEntity
            {
                PartitionKey = PartitionKey,
                RowKey = RowKey,
                Version = clientVersion
            };
            await _tableClient.AddEntityAsync(entity);
            return false;
        }
    }
}
