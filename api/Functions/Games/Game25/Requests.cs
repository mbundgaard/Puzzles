namespace Puzzles.Functions.Games.Game25;

public class CreateGameRequest
{
    public string CreatorName { get; set; } = string.Empty;
    public int WinnerPoints { get; set; }
    public int LoserPoints { get; set; }
}

public class JoinGameRequest
{
    public string JoinerName { get; set; } = string.Empty;
}

public class CancelGameRequest
{
    public string PlayerToken { get; set; } = string.Empty;
}

public class PlaceShipsRequest
{
    public string PlayerToken { get; set; } = string.Empty;
    public int[][] Ships { get; set; } = []; // [[row,col], ...] sorted
}

public class ShootRequest
{
    public string PlayerToken { get; set; } = string.Empty;
    public int Row { get; set; }
    public int Col { get; set; }
}
