namespace Puzzles.Services;

/// <summary>
/// A message in an AI conversation.
/// </summary>
public class AIMessage
{
    /// <summary>
    /// The role of the message sender ("user" or "assistant").
    /// </summary>
    public string Role { get; set; } = "";

    /// <summary>
    /// The content of the message.
    /// </summary>
    public string Content { get; set; } = "";
}

/// <summary>
/// Options for AI generation requests.
/// </summary>
public class AIRequestOptions
{
    /// <summary>
    /// Temperature for response randomness (0.0 = deterministic, 1.0 = creative).
    /// </summary>
    public double Temperature { get; set; } = 0.7;

    /// <summary>
    /// Whether to request JSON-formatted response.
    /// </summary>
    public bool JsonResponse { get; set; } = true;
}

/// <summary>
/// Generic AI service interface for LLM interactions.
/// This abstraction allows swapping LLM providers (OpenAI, Claude, etc.) without changing business logic.
/// </summary>
public interface IAIService
{
    /// <summary>
    /// Generates a response from the AI.
    /// </summary>
    /// <param name="systemMessage">The system message that sets context and instructions</param>
    /// <param name="messages">The conversation messages (user and assistant turns)</param>
    /// <param name="options">Optional request options (temperature, json mode, etc.)</param>
    /// <returns>The AI's response text, or null if the request failed</returns>
    Task<string?> GenerateAsync(string systemMessage, AIMessage[] messages, AIRequestOptions? options = null);

    /// <summary>
    /// Whether the AI service is configured and available.
    /// </summary>
    bool IsConfigured { get; }
}
