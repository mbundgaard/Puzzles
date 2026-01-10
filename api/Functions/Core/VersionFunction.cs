using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Models;
using Puzzles.Services;
using Puzzles.Storage;

namespace Puzzles.Functions.Core;

public class VersionFunction
{
    private readonly ILogger<VersionFunction> _logger;
    private readonly IVersionStorage _storage;
    private readonly IAdminAuthService _adminAuth;

    public VersionFunction(ILogger<VersionFunction> logger, IVersionStorage storage, IAdminAuthService adminAuth)
    {
        _logger = logger;
        _storage = storage;
        _adminAuth = adminAuth;
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

        // Force update for invalid or corrupted versions
        if (versionRequest == null || versionRequest.Version <= 0 || versionRequest.Version >= 1800000000)
        {
            _logger.LogInformation("Version check: client={ClientVersion}, forcing update (invalid/corrupted version)",
                versionRequest?.Version ?? 0);
            return new OkObjectResult(new { newVersionExists = true });
        }

        var newVersionExists = await _storage.CheckAndUpdateVersionAsync(versionRequest.Version);

        _logger.LogInformation("Version check: client={ClientVersion}, newVersionExists={NewVersionExists}",
            versionRequest.Version, newVersionExists);

        return new OkObjectResult(new { newVersionExists });
    }

    [Function("SetVersion")]
    public async Task<IActionResult> SetVersion(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "version/set")] HttpRequest req)
    {
        var authResult = _adminAuth.Authorize(req);
        if (authResult != null) return authResult;

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

        await _storage.SetVersionAsync(versionRequest.Version);

        _logger.LogInformation("Version set to {Version}", versionRequest.Version);

        return new OkObjectResult(new { success = true, version = versionRequest.Version });
    }
}
