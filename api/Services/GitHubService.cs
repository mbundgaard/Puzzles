using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Puzzles.Models;

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

    public async Task<bool> CreateFeedbackIssueAsync(string? game, int? rating, string? text, string? nickname,
        string? aiTitle = null, string? aiTranslation = null)
    {
        if (string.IsNullOrEmpty(_token))
        {
            _logger.LogWarning("GitHub token not configured, skipping issue creation");
            return false;
        }

        try
        {
            // null/empty = general feedback, "00" = new game suggestion, other = game-specific
            var isGameSuggestion = game == "00";
            var isGeneralFeedback = string.IsNullOrEmpty(game);
            var gameName = GameValidator.GetGameName(game);

            // Build title - use AI-generated title if available
            string title;
            if (!string.IsNullOrEmpty(aiTitle))
            {
                if (isGameSuggestion)
                {
                    title = $"New Game: {aiTitle}";
                }
                else if (isGeneralFeedback)
                {
                    title = $"Feedback: {aiTitle}";
                }
                else if (gameName != null)
                {
                    title = $"{gameName}: {aiTitle}";
                }
                else
                {
                    title = aiTitle;
                }
            }
            else if (isGameSuggestion)
            {
                title = "New Game Suggestion";
            }
            else if (isGeneralFeedback)
            {
                title = "General Feedback";
            }
            else
            {
                title = gameName != null ? $"Feedback: {gameName}" : $"Feedback: Game {game}";
            }

            // Build body
            var body = new StringBuilder();

            if (isGameSuggestion)
            {
                body.AppendLine("## Game Suggestion");
            }
            else if (isGeneralFeedback)
            {
                body.AppendLine("## General Feedback");
            }
            else
            {
                body.AppendLine($"## Feedback for Game {game}");
            }
            body.AppendLine();

            // Show rating if provided (for game-specific feedback only)
            if (!isGameSuggestion && !isGeneralFeedback && rating.HasValue)
            {
                body.AppendLine($"**Rating:** {new string('⭐', rating.Value)} ({rating.Value}/5)");
                body.AppendLine();
            }

            // Show AI translation if available, otherwise original text
            if (!string.IsNullOrWhiteSpace(aiTranslation))
            {
                body.AppendLine(aiTranslation);
                body.AppendLine();

                // Also include original text for reference
                if (!string.IsNullOrWhiteSpace(text) && text != aiTranslation)
                {
                    body.AppendLine("<details>");
                    body.AppendLine("<summary>Original (Danish)</summary>");
                    body.AppendLine();
                    body.AppendLine(text);
                    body.AppendLine("</details>");
                    body.AppendLine();
                }
            }
            else if (!string.IsNullOrWhiteSpace(text))
            {
                body.AppendLine(text);
                body.AppendLine();
            }
            else if (isGameSuggestion || isGeneralFeedback)
            {
                body.AppendLine("(No description)");
                body.AppendLine();
            }

            if (!string.IsNullOrWhiteSpace(nickname))
            {
                body.AppendLine($"**From:** {nickname}");
            }

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

    public async Task<int?> CreateIssueAsync(string title, string body)
    {
        if (string.IsNullOrEmpty(_token))
        {
            _logger.LogWarning("GitHub token not configured, skipping issue creation");
            return null;
        }

        try
        {
            var payload = new { title, body };
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var url = $"https://api.github.com/repos/{_owner}/{_repo}/issues";
            var response = await _httpClient.PostAsync(url, content);

            if (response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(responseBody);
                var issueNumber = doc.RootElement.GetProperty("number").GetInt32();
                _logger.LogInformation("GitHub issue {Issue} created: {Title}", issueNumber, title);
                return issueNumber;
            }

            var errorBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to create GitHub issue: {Status} - {Body}",
                response.StatusCode, errorBody);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating GitHub issue");
            return null;
        }
    }

    public async Task<bool> EditIssueAsync(int issueNumber, string? title, string? body, string? state = null)
    {
        if (string.IsNullOrEmpty(_token))
        {
            _logger.LogWarning("GitHub token not configured, skipping issue edit");
            return false;
        }

        if (title == null && body == null && state == null)
        {
            _logger.LogWarning("No changes provided for issue {Issue}", issueNumber);
            return false;
        }

        try
        {
            var payload = new Dictionary<string, string>();
            if (title != null) payload["title"] = title;
            if (body != null) payload["body"] = body;
            if (state != null) payload["state"] = state;

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var url = $"https://api.github.com/repos/{_owner}/{_repo}/issues/{issueNumber}";
            var response = await _httpClient.PatchAsync(url, content);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("GitHub issue {Issue} edited", issueNumber);
                return true;
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to edit issue {Issue}: {Status} - {Body}",
                issueNumber, response.StatusCode, responseBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error editing GitHub issue {Issue}", issueNumber);
            return false;
        }
    }

    public async Task<bool> DeleteIssueAsync(int issueNumber)
    {
        if (string.IsNullOrEmpty(_token))
        {
            _logger.LogWarning("GitHub token not configured, skipping issue delete");
            return false;
        }

        try
        {
            var url = $"https://api.github.com/repos/{_owner}/{_repo}/issues/{issueNumber}";
            var response = await _httpClient.DeleteAsync(url);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("GitHub issue {Issue} deleted", issueNumber);
                return true;
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to delete issue {Issue}: {Status} - {Body}",
                issueNumber, response.StatusCode, responseBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting GitHub issue {Issue}", issueNumber);
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
