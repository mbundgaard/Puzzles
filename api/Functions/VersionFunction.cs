using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Storage;

namespace Puzzles.Functions;

public class VersionFunction
{
    private readonly ILogger<VersionFunction> _logger;
    private readonly IVersionStorage _storage;

    public VersionFunction(ILogger<VersionFunction> logger, IVersionStorage storage)
    {
        _logger = logger;
        _storage = storage;
    }

    public class VersionRequest
    {
        public int Version { get; set; }
    }

    [Function("CheckVersion")]
    public async Task<IActionResult> CheckVersion(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "version")] HttpRequest req)
    {
        VersionRequest? versionRequest;
        try
        {
            versionRequest = await req.ReadFromJsonAsync<VersionRequest>();
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (versionRequest == null || versionRequest.Version <= 0)
        {
            return new BadRequestObjectResult(new { error = "Valid version number required" });
        }

        var newVersionExists = await _storage.CheckAndUpdateVersionAsync(versionRequest.Version);

        _logger.LogInformation("Version check: client={ClientVersion}, newVersionExists={NewVersionExists}",
            versionRequest.Version, newVersionExists);

        return new OkObjectResult(new { newVersionExists });
    }
}
