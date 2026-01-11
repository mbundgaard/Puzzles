using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Logging;

namespace Puzzles.Services;

/// <summary>
/// Azure Blob Storage service for uploading feedback images.
/// </summary>
public class AzureBlobStorageService : IBlobStorageService
{
    private readonly ILogger<AzureBlobStorageService> _logger;
    private readonly BlobContainerClient? _containerClient;
    private const string ContainerName = "feedback-images";

    public bool IsConfigured => _containerClient != null;

    public AzureBlobStorageService(ILogger<AzureBlobStorageService> logger)
    {
        _logger = logger;

        var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage");
        if (string.IsNullOrEmpty(connectionString))
        {
            _logger.LogWarning("AzureWebJobsStorage not configured, blob storage disabled");
            return;
        }

        try
        {
            var blobServiceClient = new BlobServiceClient(connectionString);
            _containerClient = blobServiceClient.GetBlobContainerClient(ContainerName);

            // Ensure container exists with public access
            _containerClient.CreateIfNotExists(PublicAccessType.Blob);
            _logger.LogInformation("Blob storage configured with container: {Container}", ContainerName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize blob storage");
            _containerClient = null;
        }
    }

    public async Task<string?> UploadImageAsync(byte[] imageBytes, string contentType)
    {
        if (_containerClient == null)
        {
            _logger.LogWarning("Blob storage not configured, cannot upload image");
            return null;
        }

        try
        {
            // Generate unique filename with timestamp and GUID
            var extension = GetExtensionFromContentType(contentType);
            var blobName = $"{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}{extension}";

            var blobClient = _containerClient.GetBlobClient(blobName);

            using var stream = new MemoryStream(imageBytes);
            await blobClient.UploadAsync(stream, new BlobHttpHeaders { ContentType = contentType });

            var url = blobClient.Uri.ToString();
            _logger.LogInformation("Image uploaded: {Url}", url);

            return url;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload image");
            return null;
        }
    }

    private static string GetExtensionFromContentType(string contentType)
    {
        return contentType.ToLowerInvariant() switch
        {
            "image/png" => ".png",
            "image/jpeg" => ".jpg",
            "image/gif" => ".gif",
            "image/webp" => ".webp",
            _ => ".bin"
        };
    }
}
