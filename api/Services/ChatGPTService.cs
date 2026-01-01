using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace Puzzles.Services;

/// <summary>
/// Azure OpenAI (ChatGPT) service for processing feedback text.
/// </summary>
public class ChatGPTService : IChatGPTService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ChatGPTService> _logger;
    private readonly string? _endpoint;
    private readonly string? _apiKey;
    private readonly string _deploymentName;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public ChatGPTService(HttpClient httpClient, ILogger<ChatGPTService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT");
        _apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY");
        _deploymentName = Environment.GetEnvironmentVariable("AZURE_OPENAI_DEPLOYMENT") ?? "gpt-4o-mini";
    }

    public async Task<FeedbackProcessingResult?> ProcessFeedbackAsync(string text, string game, string? feedbackType)
    {
        if (string.IsNullOrEmpty(_endpoint) || string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Azure OpenAI not configured, skipping feedback processing");
            return null;
        }

        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        try
        {
            // Determine the appropriate prompt based on game and feedback type
            string systemPrompt;
            if (game == "00" && feedbackType == "suggestion")
            {
                // New game suggestion
                systemPrompt = "You process game suggestions for a puzzle games website. Given user feedback (possibly in Danish), respond with JSON containing: 1) 'title': a concise English title (max 50 chars) describing the suggested game, 2) 'translatedText': the full feedback translated to English. Keep the title descriptive but brief, like 'Maze game with fog of war' or 'Multiplayer word guessing game'.";
            }
            else if (game == "00" && feedbackType == "feedback")
            {
                // General site feedback (not about a specific game)
                systemPrompt = "You process general feedback for a puzzle games website. Given feedback (possibly in Danish), respond with JSON containing: 1) 'title': a concise English title (max 50 chars) summarizing the feedback, 2) 'translatedText': the full feedback translated to English. This is about the website/app itself, not a specific game. Title examples: 'Add dark mode option', 'Improve loading speed', 'Request for notifications'.";
            }
            else
            {
                // Game-specific feedback
                systemPrompt = "You process user feedback for a puzzle games website. Given feedback (possibly in Danish), respond with JSON containing: 1) 'title': a concise English title (max 50 chars) summarizing the feedback, 2) 'translatedText': the full feedback translated to English. The title should capture the main point, like 'Request for movable pieces' or 'Bug: Timer not resetting'.";
            }

            var requestBody = new
            {
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = text }
                },
                temperature = 0.3,
                response_format = new { type = "json_object" }
            };

            var json = JsonSerializer.Serialize(requestBody, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var url = $"{_endpoint.TrimEnd('/')}/openai/deployments/{_deploymentName}/chat/completions?api-version=2025-01-01-preview";

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Content = content;
            request.Headers.Add("api-key", _apiKey);

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogError("Azure OpenAI request failed: {Status} - {Body}", response.StatusCode, errorBody);
                return null;
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            var chatResponse = JsonSerializer.Deserialize<ChatCompletionResponse>(responseBody, JsonOptions);

            var messageContent = chatResponse?.Choices?.FirstOrDefault()?.Message?.Content;
            if (string.IsNullOrEmpty(messageContent))
            {
                _logger.LogWarning("Empty response from Azure OpenAI");
                return null;
            }

            var result = JsonSerializer.Deserialize<FeedbackProcessingResult>(messageContent, JsonOptions);
            if (result == null || string.IsNullOrEmpty(result.Title))
            {
                _logger.LogWarning("Failed to parse Azure OpenAI response: {Content}", messageContent);
                return null;
            }

            _logger.LogInformation("Feedback processed: '{Title}'", result.Title);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing feedback with Azure OpenAI");
            return null;
        }
    }

    // Response models for Azure OpenAI
    private class ChatCompletionResponse
    {
        public List<ChatChoice>? Choices { get; set; }
    }

    private class ChatChoice
    {
        public ChatMessage? Message { get; set; }
    }

    private class ChatMessage
    {
        public string? Content { get; set; }
    }
}
