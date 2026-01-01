using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Puzzles.Models;

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

    public async Task<FeedbackProcessingResult?> ProcessFeedbackAsync(string text, FeedbackType feedbackType)
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
            var systemPrompt = feedbackType switch
            {
                FeedbackType.NewGameSuggestion =>
                    "You process game suggestions for a puzzle games website. Given user feedback (possibly in Danish), respond with JSON containing: 1) 'title': a concise English title (max 50 chars) describing the suggested game, 2) 'translatedText': the full feedback translated to English. Keep the title descriptive but brief, like 'Maze game with fog of war' or 'Multiplayer word guessing game'.",
                FeedbackType.GeneralFeedback =>
                    "You process general feedback for a puzzle games website. Given feedback (possibly in Danish), respond with JSON containing: 1) 'title': a concise English title (max 50 chars) summarizing the feedback, 2) 'translatedText': the full feedback translated to English. This is about the website/app itself, not a specific game. Title examples: 'Add dark mode option', 'Improve loading speed', 'Request for notifications'.",
                _ =>
                    "You process user feedback for a puzzle games website. Given feedback (possibly in Danish), respond with JSON containing: 1) 'title': a concise English title (max 50 chars) summarizing the feedback, 2) 'translatedText': the full feedback translated to English. The title should capture the main point, like 'Request for movable pieces' or 'Bug: Timer not resetting'."
            };

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

    public async Task<AnimalPickResult?> PickAnimalAsync(string? category)
    {
        if (string.IsNullOrEmpty(_endpoint) || string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Azure OpenAI not configured, cannot pick animal");
            return null;
        }

        try
        {
            var categoryPrompt = string.IsNullOrWhiteSpace(category)
                ? "Vælg en tilfældig kategori (f.eks. havdyr, fugle, pattedyr, insekter, krybdyr) og et dyr fra den kategori."
                : $"Vælg et tilfældigt dyr fra kategorien: {category}";

            var systemPrompt = $@"Du hjælper med et gættespil om dyr. {categoryPrompt}

Svar med JSON i dette format:
{{""animal"": ""navnet på dyret"", ""category"": ""kategorien""}}

Vælg dyr som de fleste kender. Dyrenavnet skal være på dansk og i ental (f.eks. ""delfin"" ikke ""delfiner"").";

            var requestBody = new
            {
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = "Vælg et dyr" }
                },
                temperature = 0.9,
                response_format = new { type = "json_object" }
            };

            var response = await SendChatRequestAsync(requestBody);
            if (response == null) return null;

            var result = JsonSerializer.Deserialize<AnimalPickResult>(response, JsonOptions);
            if (result == null || string.IsNullOrEmpty(result.Animal))
            {
                _logger.LogWarning("Failed to parse animal pick response: {Content}", response);
                return null;
            }

            _logger.LogInformation("Animal picked: {Animal} ({Category})", result.Animal, result.Category);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error picking animal with Azure OpenAI");
            return null;
        }
    }

    public async Task<string?> AskAboutAnimalAsync(string animal, string question)
    {
        if (string.IsNullOrEmpty(_endpoint) || string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Azure OpenAI not configured, cannot answer question");
            return null;
        }

        if (string.IsNullOrWhiteSpace(animal) || string.IsNullOrWhiteSpace(question))
        {
            return null;
        }

        try
        {
            var systemPrompt = $@"Du spiller et gættespil. Dyret der skal gættes er: {animal}

Besvar brugerens ja/nej spørgsmål ærligt om dette dyr.
Svar KUN med JSON i dette format:
{{""answer"": ""Ja""}} eller {{""answer"": ""Nej""}} eller {{""answer"": ""Måske""}}

Svar ""Måske"" hvis spørgsmålet er uklart, tvetydigt, eller ikke kan besvares entydigt.";

            var requestBody = new
            {
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = question }
                },
                temperature = 0.1,
                response_format = new { type = "json_object" }
            };

            var response = await SendChatRequestAsync(requestBody);
            if (response == null) return null;

            var result = JsonSerializer.Deserialize<AnimalAnswerResult>(response, JsonOptions);
            if (result == null || string.IsNullOrEmpty(result.Answer))
            {
                _logger.LogWarning("Failed to parse animal answer response: {Content}", response);
                return null;
            }

            _logger.LogInformation("Animal question answered: {Question} -> {Answer}", question, result.Answer);
            return result.Answer;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error answering animal question with Azure OpenAI");
            return null;
        }
    }

    private async Task<string?> SendChatRequestAsync(object requestBody)
    {
        var json = JsonSerializer.Serialize(requestBody, JsonOptions);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var url = $"{_endpoint!.TrimEnd('/')}/openai/deployments/{_deploymentName}/chat/completions?api-version=2025-01-01-preview";

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

    private class AnimalAnswerResult
    {
        public string? Answer { get; set; }
    }
}
