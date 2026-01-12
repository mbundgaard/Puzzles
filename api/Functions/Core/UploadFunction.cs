using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Services;

namespace Puzzles.Functions.Core;

public class UploadFunction
{
    private readonly ILogger<UploadFunction> _logger;
    private readonly IBlobStorageService _blobStorageService;

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp"
    };

    private const int MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

    public UploadFunction(ILogger<UploadFunction> logger, IBlobStorageService blobStorageService)
    {
        _logger = logger;
        _blobStorageService = blobStorageService;
    }

    [Function("UploadImage")]
    public async Task<IActionResult> UploadImage(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "upload/image")] HttpRequest req)
    {
        if (!_blobStorageService.IsConfigured)
        {
            _logger.LogWarning("Blob storage not configured");
            return new StatusCodeResult(503); // Service Unavailable
        }

        // Check content type
        var contentType = req.ContentType?.Split(';')[0].Trim();
        if (string.IsNullOrEmpty(contentType) || !AllowedContentTypes.Contains(contentType))
        {
            return new BadRequestObjectResult(new { error = "Invalid content type. Allowed: PNG, JPEG, GIF, WebP" });
        }

        // Check content length
        if (req.ContentLength > MaxFileSizeBytes)
        {
            return new BadRequestObjectResult(new { error = "File too large. Maximum size: 5 MB" });
        }

        try
        {
            // Read the image data
            using var memoryStream = new MemoryStream();
            await req.Body.CopyToAsync(memoryStream);
            var imageBytes = memoryStream.ToArray();

            if (imageBytes.Length == 0)
            {
                return new BadRequestObjectResult(new { error = "No image data received" });
            }

            if (imageBytes.Length > MaxFileSizeBytes)
            {
                return new BadRequestObjectResult(new { error = "File too large. Maximum size: 5 MB" });
            }

            // Upload to blob storage
            var url = await _blobStorageService.UploadImageAsync(imageBytes, contentType);

            if (url == null)
            {
                return new StatusCodeResult(500);
            }

            _logger.LogInformation("Image uploaded successfully: {Url}", url);
            return new OkObjectResult(new { url });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading image");
            return new StatusCodeResult(500);
        }
    }
}
