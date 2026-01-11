using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Puzzles.Services;

/// <summary>
/// Azure OpenAI implementation of the AI service.
/// </summary>
public class AzureOpenAIService : IAIService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AzureOpenAIService> _logger;
    private readonly string? _endpoint;
    private readonly string? _apiKey;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public bool IsConfigured => !string.IsNullOrEmpty(_endpoint) && !string.IsNullOrEmpty(_apiKey);

    public AzureOpenAIService(HttpClient httpClient, ILogger<AzureOpenAIService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _endpoint = Environment.GetEnvironmentVariable("AZURE_OPENAI_ENDPOINT");
        _apiKey = Environment.GetEnvironmentVariable("AZURE_OPENAI_KEY");
    }

    public async Task<string?> GenerateAsync(string systemMessage, AIMessage[] messages, AIRequestOptions? options = null)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("Azure OpenAI not configured");
            return null;
        }

        options ??= new AIRequestOptions();

        try
        {
            // Build messages array with system message first
            var allMessages = new List<object>
            {
                new { role = "system", content = systemMessage }
            };

            foreach (var msg in messages)
            {
                allMessages.Add(new { role = msg.Role, content = msg.Content });
            }

            // Build request body
            object requestBody;
            if (options.JsonResponse)
            {
                requestBody = new
                {
                    messages = allMessages,
                    temperature = options.Temperature,
                    response_format = new { type = "json_object" }
                };
            }
            else
            {
                requestBody = new
                {
                    messages = allMessages,
                    temperature = options.Temperature
                };
            }

            var json = JsonSerializer.Serialize(requestBody, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var url = $"{_endpoint!.TrimEnd('/')}/openai/deployments/{options.Model}/chat/completions?api-version=2025-01-01-preview";

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

            return chatResponse?.Choices?.FirstOrDefault()?.Message?.Content;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling Azure OpenAI");
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
