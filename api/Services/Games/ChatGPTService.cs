using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Puzzles.Models;

namespace Puzzles.Services.Games;

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

    public async Task<AnimalPickResult?> PickAnimalAsync(string? category, string? difficulty = "hard")
    {
        if (string.IsNullOrEmpty(_endpoint) || string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Azure OpenAI not configured, cannot pick animal");
            return null;
        }

        // Default to hard if not specified
        var diff = string.IsNullOrWhiteSpace(difficulty) ? "hard" : difficulty.ToLower();

        try
        {
            var categoryPrompt = string.IsNullOrWhiteSpace(category)
                ? "Vælg en tilfældig kategori (f.eks. havdyr, fugle, pattedyr, insekter, krybdyr) og et dyr fra den kategori."
                : $"Vælg et tilfældigt dyr fra kategorien: {category}";

            var difficultyPrompt = diff switch
            {
                "easy" => "Vælg et MEGET ALMINDELIGT dyr som alle børn kender, f.eks. hund, kat, ko, hest, elefant, løve, giraf, zebra, kanin, and, høne, gris.",
                "medium" => "Vælg et dyr som de fleste kender, men undgå de mest oplagte som hund, kat, ko. Vælg f.eks. delfin, pingvin, flamingo, bæver, vaskebjørn, papegøje.",
                _ => "Vælg et MINDRE KENDT eller UVENTET dyr. Undgå almindelige dyr som hund, kat, ko, hest, elefant. Vælg f.eks. næbdyr, tapir, okapien, axolotl, capybara, fennekræv, pangolin, manati."
            };

            var systemPrompt = $@"Du hjælper med et gættespil om dyr. {categoryPrompt}

{difficultyPrompt}

Svar med JSON i dette format:
{{""animal"": ""navnet på dyret"", ""category"": ""kategorien""}}

Dyrenavnet skal være på dansk og i ental (f.eks. ""delfin"" ikke ""delfiner"").";

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

            _logger.LogInformation("Animal picked: {Animal} ({Category}, difficulty: {Difficulty})", result.Animal, result.Category, diff);
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

    public async Task<WordSearchResult?> GenerateWordSearchAsync(string difficulty)
    {
        if (string.IsNullOrEmpty(_endpoint) || string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Azure OpenAI not configured, cannot generate word search");
            return null;
        }

        var diff = string.IsNullOrWhiteSpace(difficulty) ? "medium" : difficulty.ToLower();

        try
        {
            var difficultyPrompt = diff switch
            {
                "easy" => @"Vælg 8 MEGET NEMME danske ord (3-5 bogstaver).
Vælg KUN fra disse kategorier med RIGTIGE ord:
- Dyr: HUND, KAT, FUGL, FISK, RÆVE, BJØRN, ØRNE, UGLE, REJE, KRAB
- Mad: ÆBLE, PÆRE, BROD, KAGE, SUPPE, MÆLK, SMØR, PØLSE
- Natur: SOL, MÅNE, SKOV, HAVE, REGN, VIND, SNES, ROSE
- Ting: BIL, HUS, BOLD, STOL, BORD, LAMPE, DUKKE, KLODS",
                "medium" => @"Vælg 8 MELLEM-SVÆRE danske ord (4-7 bogstaver).
Vælg KUN fra disse kategorier med RIGTIGE ord:
- Dyr: HESTE, GRISE, ROTTER, SLANGE, HAJER, HVALER, PINDSVIN, FRØER
- Mad: BANAN, CITRON, TOMAT, SALAT, BROCCOLI, RUGBRØD, YOGHURT
- Natur: SOMMER, VINTER, BLOMST, STRAND, BJERGE, FLODER, SKYER
- Ting: CYKEL, GUITAR, KAMERA, MOBIL, COMPUTER, SPEJL, VINDUE",
                _ => @"Vælg 8 SVÆRE danske ord (6-10 bogstaver).
Vælg KUN fra disse kategorier med RIGTIGE ord:
- Dyr: ELEFANT, GIRAF, PINGVIN, FLODHEST, NÆSEHORN, KROKODILLE, PAPEGØJE
- Mad: JORDBÆR, APPELSIN, KARTOFFEL, CHOKOLADE, PANDEKAGE, MORGENMAD
- Natur: REGNBUE, VULKAN, SOLSKIN, TORDENVEJR, NORDLYS, VANDLØB
- Ting: BIBLIOTEK, GUITAR, HELICOPTER, TASTATUR, FJERNSYN, HÅNDKLÆDE"
            };

            var systemPrompt = $@"Du genererer ord til et ordsøgningsspil (word search) på dansk.

{difficultyPrompt}

VIGTIGT - STRENGE KRAV:
- Præcis 8 ord
- ALLE ord SKAL være RIGTIGE danske ord der findes i ordbogen
- Brug NAVNEORD i ental eller flertal (aldrig bøjede verber eller adjektiver)
- INGEN forkortede eller opdigtede ord
- Kun bogstaverne A-Z og Æ, Ø, Å
- Ingen gentagelser
- Alle ord skal være i STORE BOGSTAVER

Eksempler på FORKERTE ord (brug IKKE): blader (hedder blade), æbletr (ufuldstændigt), løben (bøjet verbum)
Eksempler på KORREKTE ord: BLADE, ÆBLER, LØBER

Svar med JSON i dette format:
{{""words"": [""ORD1"", ""ORD2"", ""ORD3"", ""ORD4"", ""ORD5"", ""ORD6"", ""ORD7"", ""ORD8""]}}";

            var requestBody = new
            {
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = "Generér 8 ord til ordsøgning" }
                },
                temperature = 0.7,
                response_format = new { type = "json_object" }
            };

            var response = await SendChatRequestAsync(requestBody);
            if (response == null) return null;

            var result = JsonSerializer.Deserialize<WordSearchResult>(response, JsonOptions);
            if (result == null || result.Words == null || result.Words.Count != 8)
            {
                _logger.LogWarning("Failed to parse word search response or wrong word count: {Content}", response);
                return null;
            }

            // Ensure all words are uppercase and validate
            result.Words = result.Words.Select(w => w.ToUpper().Trim()).ToList();

            // Validate words: must be 3-12 chars, only valid Danish letters, no truncated words
            var validLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ";
            foreach (var word in result.Words)
            {
                if (word.Length < 3 || word.Length > 12)
                {
                    _logger.LogWarning("Word '{Word}' has invalid length", word);
                    return null;
                }
                if (word.Any(c => !validLetters.Contains(c)))
                {
                    _logger.LogWarning("Word '{Word}' contains invalid characters", word);
                    return null;
                }
            }

            _logger.LogInformation("Word search generated: {Words} (difficulty: {Difficulty})", string.Join(", ", result.Words), diff);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating word search with Azure OpenAI");
            return null;
        }
    }

    public async Task<string?> GetHintAboutAnimalAsync(string animal, List<string>? previousHints = null)
    {
        if (string.IsNullOrEmpty(_endpoint) || string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Azure OpenAI not configured, cannot generate hint");
            return null;
        }

        if (string.IsNullOrWhiteSpace(animal))
        {
            return null;
        }

        try
        {
            var previousHintsText = previousHints != null && previousHints.Count > 0
                ? $"\n\nTidligere hints (giv IKKE disse igen):\n- {string.Join("\n- ", previousHints)}"
                : "";

            var systemPrompt = $@"Du hjælper med et gættespil om dyr. Dyret der skal gættes er: {animal}

Giv ET kort, hjælpsomt hint om dyret på dansk. Hintet skal:
- Være 1 sætning (max 15 ord)
- Give nyttig information der kan hjælpe med at gætte dyret
- IKKE nævne dyrets navn eller dele af navnet
- Være faktuelt korrekt
{previousHintsText}

Svar KUN med JSON i dette format:
{{""hint"": ""Dit hint her""}}";

            var requestBody = new
            {
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = "Giv et hint" }
                },
                temperature = 0.7,
                response_format = new { type = "json_object" }
            };

            var response = await SendChatRequestAsync(requestBody);
            if (response == null) return null;

            var result = JsonSerializer.Deserialize<HintResult>(response, JsonOptions);
            if (result == null || string.IsNullOrEmpty(result.Hint))
            {
                _logger.LogWarning("Failed to parse hint response: {Content}", response);
                return null;
            }

            _logger.LogInformation("Hint generated for {Animal}: {Hint}", animal, result.Hint);
            return result.Hint;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating hint with Azure OpenAI");
            return null;
        }
    }

    private class HintResult
    {
        public string? Hint { get; set; }
    }
}
