using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Puzzles.Services;

/// <summary>
/// GitHub API service for creating issues from feedback.
/// </summary>
public class GitHubService : IGitHubService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GitHubService> _logger;
    private readonly string? _token;
    private readonly string _owner;
    private readonly string _repo;

    public GitHubService(HttpClient httpClient, ILogger<GitHubService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _token = Environment.GetEnvironmentVariable("GITHUB_TOKEN");
        _owner = Environment.GetEnvironmentVariable("GITHUB_OWNER") ?? "mbundgaard";
        _repo = Environment.GetEnvironmentVariable("GITHUB_REPO") ?? "Puzzles";

        if (!string.IsNullOrEmpty(_token))
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _token);
            _httpClient.DefaultRequestHeaders.UserAgent.Add(
                new ProductInfoHeaderValue("Puzzles-Feedback", "1.0"));
            _httpClient.DefaultRequestHeaders.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        }
    }

    public async Task<bool> CreateFeedbackIssueAsync(string game, int? rating, string? text, string? nickname)
    {
        if (string.IsNullOrEmpty(_token))
        {
            _logger.LogWarning("GitHub token not configured, skipping issue creation");
            return false;
        }

        try
        {
            var isGameSuggestion = game == "00";

            // Build title
            string title;
            if (isGameSuggestion)
            {
                title = "New Game Suggestion";
            }
            else
            {
                title = $"Feedback: Game {game}";
            }

            // Build body
            var body = new StringBuilder();

            if (isGameSuggestion)
            {
                body.AppendLine("## Game Suggestion");
                body.AppendLine();
                body.AppendLine(text ?? "(No description)");
            }
            else
            {
                body.AppendLine($"## Feedback for Game {game}");
                body.AppendLine();

                if (rating.HasValue)
                {
                    body.AppendLine($"**Rating:** {new string('⭐', rating.Value)} ({rating.Value}/5)");
                    body.AppendLine();
                }

                if (!string.IsNullOrWhiteSpace(text))
                {
                    body.AppendLine("**Comment:**");
                    body.AppendLine(text);
                    body.AppendLine();
                }
            }

            if (!string.IsNullOrWhiteSpace(nickname))
            {
                body.AppendLine($"**From:** {nickname}");
            }

            body.AppendLine();
            body.AppendLine("---");
            body.AppendLine("*Auto-generated from feedback form*");

            var payload = new
            {
                title,
                body = body.ToString()
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var url = $"https://api.github.com/repos/{_owner}/{_repo}/issues";
            var response = await _httpClient.PostAsync(url, content);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("GitHub issue created for game {Game}", game);
                return true;
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to create GitHub issue: {Status} - {Body}",
                response.StatusCode, responseBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating GitHub issue for game {Game}", game);
            return false;
        }
    }

    public async Task<bool> CloseIssueAsync(int issueNumber, string comment)
    {
        if (string.IsNullOrEmpty(_token))
        {
            _logger.LogWarning("GitHub token not configured, skipping issue close");
            return false;
        }

        try
        {
            // First, add the comment
            var commentPayload = new { body = comment };
            var commentJson = JsonSerializer.Serialize(commentPayload);
            var commentContent = new StringContent(commentJson, Encoding.UTF8, "application/json");

            var commentUrl = $"https://api.github.com/repos/{_owner}/{_repo}/issues/{issueNumber}/comments";
            var commentResponse = await _httpClient.PostAsync(commentUrl, commentContent);

            if (!commentResponse.IsSuccessStatusCode)
            {
                var responseBody = await commentResponse.Content.ReadAsStringAsync();
                _logger.LogError("Failed to add comment to issue {Issue}: {Status} - {Body}",
                    issueNumber, commentResponse.StatusCode, responseBody);
                return false;
            }

            // Then, close the issue
            var closePayload = new { state = "closed" };
            var closeJson = JsonSerializer.Serialize(closePayload);
            var closeContent = new StringContent(closeJson, Encoding.UTF8, "application/json");

            var closeUrl = $"https://api.github.com/repos/{_owner}/{_repo}/issues/{issueNumber}";
            var closeResponse = await _httpClient.PatchAsync(closeUrl, closeContent);

            if (closeResponse.IsSuccessStatusCode)
            {
                _logger.LogInformation("GitHub issue {Issue} closed with comment", issueNumber);
                return true;
            }

            var closeResponseBody = await closeResponse.Content.ReadAsStringAsync();
            _logger.LogError("Failed to close issue {Issue}: {Status} - {Body}",
                issueNumber, closeResponse.StatusCode, closeResponseBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error closing GitHub issue {Issue}", issueNumber);
            return false;
        }
    }
}
