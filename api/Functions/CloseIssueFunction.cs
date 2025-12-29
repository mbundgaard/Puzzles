using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Services;

namespace Puzzles.Functions;

public class CloseIssueFunction
{
    private readonly ILogger<CloseIssueFunction> _logger;
    private readonly IGitHubService _gitHubService;

    public CloseIssueFunction(ILogger<CloseIssueFunction> logger, IGitHubService gitHubService)
    {
        _logger = logger;
        _gitHubService = gitHubService;
    }

    public class CloseIssueRequest
    {
        public int IssueNumber { get; set; }
        public string Comment { get; set; } = string.Empty;
    }

    [Function("CloseIssue")]
    public async Task<IActionResult> CloseIssue(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "issue/close")] HttpRequest req)
    {
        CloseIssueRequest? request;
        try
        {
            request = await req.ReadFromJsonAsync<CloseIssueRequest>();
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
}
