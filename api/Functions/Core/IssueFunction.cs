using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Models;
using Puzzles.Services;

namespace Puzzles.Functions.Core;

public class IssueFunction
{
    private readonly ILogger<IssueFunction> _logger;
    private readonly IGitHubService _gitHubService;
    private readonly IAdminAuthService _adminAuth;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public IssueFunction(ILogger<IssueFunction> logger, IGitHubService gitHubService, IAdminAuthService adminAuth)
    {
        _logger = logger;
        _gitHubService = gitHubService;
        _adminAuth = adminAuth;
    }

    [Function("CreateIssue")]
    public async Task<IActionResult> CreateIssue(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "issue/create")] HttpRequest req)
    {
        var authResult = _adminAuth.Authorize(req);
        if (authResult != null) return authResult;

        CreateIssueRequest? request;
        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            request = JsonSerializer.Deserialize<CreateIssueRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return new BadRequestObjectResult(new { error = "Title is required" });
        }

        if (string.IsNullOrWhiteSpace(request.Body))
        {
            return new BadRequestObjectResult(new { error = "Body is required" });
        }

        var issueNumber = await _gitHubService.CreateIssueAsync(request.Title.Trim(), request.Body.Trim());

        if (issueNumber.HasValue)
        {
            _logger.LogInformation("Issue {Issue} created", issueNumber.Value);
            return new OkObjectResult(new { success = true, issueNumber = issueNumber.Value, message = $"Issue #{issueNumber.Value} created" });
        }

        return new ObjectResult(new { error = "Failed to create issue" }) { StatusCode = 500 };
    }

    [Function("EditIssue")]
    public async Task<IActionResult> EditIssue(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "issue/edit")] HttpRequest req)
    {
        var authResult = _adminAuth.Authorize(req);
        if (authResult != null) return authResult;

        EditIssueRequest? request;
        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            request = JsonSerializer.Deserialize<EditIssueRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        if (request.IssueNumber <= 0)
        {
            return new BadRequestObjectResult(new { error = "Invalid issue number" });
        }

        if (string.IsNullOrWhiteSpace(request.Title) && string.IsNullOrWhiteSpace(request.Body) && string.IsNullOrWhiteSpace(request.State))
        {
            return new BadRequestObjectResult(new { error = "At least one of title, body, or state is required" });
        }

        if (!string.IsNullOrWhiteSpace(request.State) && request.State != "open" && request.State != "closed")
        {
            return new BadRequestObjectResult(new { error = "State must be 'open' or 'closed'" });
        }

        var success = await _gitHubService.EditIssueAsync(
            request.IssueNumber,
            request.Title?.Trim(),
            request.Body?.Trim(),
            request.State?.Trim());

        if (success)
        {
            _logger.LogInformation("Issue {Issue} edited", request.IssueNumber);
            return new OkObjectResult(new { success = true, message = $"Issue #{request.IssueNumber} edited" });
        }

        return new ObjectResult(new { error = "Failed to edit issue" }) { StatusCode = 500 };
    }

    [Function("CloseIssue")]
    public async Task<IActionResult> CloseIssue(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "issue/close")] HttpRequest req)
    {
        var authResult = _adminAuth.Authorize(req);
        if (authResult != null) return authResult;

        CloseIssueRequest? request;
        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            request = JsonSerializer.Deserialize<CloseIssueRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        if (request.IssueNumber <= 0)
        {
            return new BadRequestObjectResult(new { error = "Invalid issue number" });
        }

        if (string.IsNullOrWhiteSpace(request.Comment))
        {
            return new BadRequestObjectResult(new { error = "Comment is required" });
        }

        var success = await _gitHubService.CloseIssueAsync(request.IssueNumber, request.Comment.Trim());

        if (success)
        {
            _logger.LogInformation("Issue {Issue} closed", request.IssueNumber);
            return new OkObjectResult(new { success = true, message = $"Issue #{request.IssueNumber} closed" });
        }

        return new ObjectResult(new { error = "Failed to close issue" }) { StatusCode = 500 };
    }

    [Function("DeleteIssue")]
    public async Task<IActionResult> DeleteIssue(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "issue/delete")] HttpRequest req)
    {
        var authResult = _adminAuth.Authorize(req);
        if (authResult != null) return authResult;

        DeleteIssueRequest? request;
        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            request = JsonSerializer.Deserialize<DeleteIssueRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (request == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        if (request.IssueNumber <= 0)
        {
            return new BadRequestObjectResult(new { error = "Invalid issue number" });
        }

        var success = await _gitHubService.DeleteIssueAsync(request.IssueNumber);

        if (success)
        {
            _logger.LogInformation("Issue {Issue} deleted", request.IssueNumber);
            return new OkObjectResult(new { success = true, message = $"Issue #{request.IssueNumber} deleted" });
        }

        return new ObjectResult(new { error = "Failed to delete issue. Note: GitHub may not allow issue deletion." }) { StatusCode = 500 };
    }
}
