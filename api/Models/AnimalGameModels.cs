namespace Puzzles.Models;

/// <summary>
/// Request model for picking an animal.
/// </summary>
public class AnimalPickRequest
{
    /// <summary>
    /// Optional category (e.g., "havdyr", "fugle", "pattedyr").
    /// If null, a random category/animal is chosen.
    /// </summary>
    public string? Category { get; set; }
}

/// <summary>
/// Response model for picked animal.
/// </summary>
public class AnimalPickResponse
{
    public required string Animal { get; set; }
    public required string Category { get; set; }
}

/// <summary>
/// Request model for asking a question about an animal.
/// </summary>
public class AnimalAskRequest
{
    public required string Animal { get; set; }
    public required string Question { get; set; }
}

/// <summary>
/// Response model for animal question answer.
/// </summary>
public class AnimalAskResponse
{
    /// <summary>
    /// Answer: "Ja", "Nej", or "Måske"
    /// </summary>
    public required string Answer { get; set; }
}
