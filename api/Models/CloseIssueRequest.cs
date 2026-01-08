using System.Text.Json.Serialization;

namespace Puzzles.Models;

public class CloseIssueRequest
{
    [JsonPropertyName("issueNumber")]
    public int IssueNumber { get; set; }

    [JsonPropertyName("comment")]
    public string Comment { get; set; } = string.Empty;
}
