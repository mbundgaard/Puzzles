namespace Puzzles.Models;

public class CreateIssueRequest
{
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public string? Label { get; set; }  // "Game feedback", "General feedback", or "Suggest new game"
}
