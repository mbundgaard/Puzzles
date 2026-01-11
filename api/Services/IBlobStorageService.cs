namespace Puzzles.Services;

/// <summary>
/// Service for uploading files to Azure Blob Storage.
/// </summary>
public interface IBlobStorageService
{
    /// <summary>
    /// Whether the service is configured with valid connection string and container.
    /// </summary>
    bool IsConfigured { get; }

    /// <summary>
    /// Uploads an image and returns the public URL.
    /// </summary>
    /// <param name="imageBytes">The image data</param>
    /// <param name="contentType">The MIME type (e.g., "image/png")</param>
    /// <returns>The public URL of the uploaded image, or null if upload failed</returns>
    Task<string?> UploadImageAsync(byte[] imageBytes, string contentType);
}
