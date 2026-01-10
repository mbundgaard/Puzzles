namespace Puzzles.Functions.Games.Game25;

public class CreateGameResponse
{
    public string GameId { get; set; } = string.Empty;
    public string PlayerToken { get; set; } = string.Empty;
}

public class JoinGameResponse
{
    public string PlayerToken { get; set; } = string.Empty;
    public GameState State { get; set; } = null!;
}

public class OpenGameInfo
{
    public string GameId { get; set; } = string.Empty;
    public string CreatorName { get; set; } = string.Empty;
    public int WinnerPoints { get; set; }
    public int LoserPoints { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GameState
{
    public string GameId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string CreatorName { get; set; } = string.Empty;
    public string? JoinerName { get; set; }
    public int WinnerPoints { get; set; }
    public int LoserPoints { get; set; }
    public string YourRole { get; set; } = string.Empty;
    public int[][]? YourShips { get; set; } // [[row,col], ...] sorted
    public int[][]? OpponentShips { get; set; } // Only revealed when game ended
    public int[][] YourShots { get; set; } = []; // [[row,col,hit], ...] sorted
    public int[][] OpponentShots { get; set; } = []; // [[row,col,hit], ...] sorted
    public string CurrentTurn { get; set; } = string.Empty;
    public bool IsYourTurn { get; set; }
    public string? Winner { get; set; }
    public bool? YouWon { get; set; }
}
