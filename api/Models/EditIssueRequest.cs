namespace Puzzles.Models;

public class EditIssueRequest
{
    public int IssueNumber { get; set; }
    public string? Title { get; set; }
    public string? Body { get; set; }
    public string? State { get; set; }  // "open" or "closed"
    public string? Label { get; set; }  // "Game feedback", "General feedback", or "Suggest new game"
}
