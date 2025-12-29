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

    private static readonly Dictionary<string, string> GameNames = new()
    {
        ["00"] = "Forslag",
        ["01"] = "Reversi",
        ["02"] = "Telte og Træer",
        ["03"] = "Sudoku",
        ["04"] = "Nonogram",
        ["05"] = "2048",
        ["06"] = "Minestryger",
        ["07"] = "Hukommelse",
        ["08"] = "Kabale",
        ["09"] = "Kalaha",
        ["10"] = "Ordleg",
        ["11"] = "Kryds og Bolle",
        ["12"] = "Rørføring",
        ["13"] = "15-Puslespil",
        ["14"] = "Kodeknækker",
        ["15"] = "Skakspring",
        ["16"] = "Futoshiki",
        ["17"] = "Lyskryds",
        ["18"] = "Killer Sudoku",
        ["19"] = "Rangering"
    };

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

    public async Task<bool> CreateFeedbackIssueAsync(string game, int rating, string? text, string? nickname)
    {
        if (string.IsNullOrEmpty(_token))
        {
            _logger.LogWarning("GitHub token not configured, skipping issue creation");
            return false;
        }

        try
        {
            var gameName = GameNames.GetValueOrDefault(game, $"Spil {game}");
            var isGameSuggestion = game == "00";

            // Build title
            string title;
            if (isGameSuggestion)
            {
                title = $"Spilforslag: {text?.Split('\n').FirstOrDefault()?.Trim() ?? "Ny idé"}";
                if (title.Length > 80)
                    title = title[..77] + "...";
            }
            else
            {
                var stars = new string('⭐', rating);
                title = $"[{gameName}] {stars} Feedback";
            }

            // Build body
            var body = new StringBuilder();

            if (isGameSuggestion)
            {
                body.AppendLine("## Spilforslag");
                body.AppendLine();
                body.AppendLine(text ?? "(Ingen beskrivelse)");
            }
            else
            {
                body.AppendLine($"## Feedback for {gameName}");
                body.AppendLine();
                body.AppendLine($"**Bedømmelse:** {new string('⭐', rating)} ({rating}/5)");
                body.AppendLine();

                if (!string.IsNullOrWhiteSpace(text))
                {
                    body.AppendLine("**Kommentar:**");
                    body.AppendLine(text);
                    body.AppendLine();
                }
            }

            if (!string.IsNullOrWhiteSpace(nickname))
            {
                body.AppendLine($"**Fra:** {nickname}");
            }

            body.AppendLine();
            body.AppendLine("---");
            body.AppendLine("*Automatisk oprettet fra feedback-formular*");

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
}
