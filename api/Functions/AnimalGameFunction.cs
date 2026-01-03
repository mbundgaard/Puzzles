using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Puzzles.Models;
using Puzzles.Services;

namespace Puzzles.Functions;

public class AnimalGameFunction
{
    private readonly ILogger<AnimalGameFunction> _logger;
    private readonly IChatGPTService _chatGPTService;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public AnimalGameFunction(ILogger<AnimalGameFunction> logger, IChatGPTService chatGPTService)
    {
        _logger = logger;
        _chatGPTService = chatGPTService;
    }

    [Function("AnimalPick")]
    public async Task<IActionResult> Pick(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/26/pick")] HttpRequest req)
    {
        AnimalPickRequest? pickRequest = null;

        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            if (!string.IsNullOrWhiteSpace(body))
            {
                pickRequest = JsonSerializer.Deserialize<AnimalPickRequest>(body, JsonOptions);
            }
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        var category = pickRequest?.Category?.Trim();
        var difficulty = pickRequest?.Difficulty?.Trim();

        var result = await _chatGPTService.PickAnimalAsync(category, difficulty);
        if (result == null)
        {
            return new ObjectResult(new { error = "Kunne ikke vælge et dyr. Prøv igen." })
            {
                StatusCode = 503
            };
        }

        _logger.LogInformation("Animal picked: {Animal} ({Category}, {Difficulty})", result.Animal, result.Category, difficulty ?? "hard");

        return new OkObjectResult(new AnimalPickResponse
        {
            Animal = result.Animal,
            Category = result.Category
        });
    }

    [Function("AnimalAsk")]
    public async Task<IActionResult> Ask(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/26/ask")] HttpRequest req)
    {
        AnimalAskRequest? askRequest;

        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            askRequest = JsonSerializer.Deserialize<AnimalAskRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (askRequest == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        if (string.IsNullOrWhiteSpace(askRequest.Animal))
        {
            return new BadRequestObjectResult(new { error = "Animal is required" });
        }

        if (string.IsNullOrWhiteSpace(askRequest.Question))
        {
            return new BadRequestObjectResult(new { error = "Question is required" });
        }

        var answer = await _chatGPTService.AskAboutAnimalAsync(askRequest.Animal, askRequest.Question);
        if (answer == null)
        {
            return new ObjectResult(new { error = "Kunne ikke besvare spørgsmålet. Prøv igen." })
            {
                StatusCode = 503
            };
        }

        return new OkObjectResult(new AnimalAskResponse
        {
            Answer = answer
        });
    }

    [Function("AnimalHint")]
    public async Task<IActionResult> Hint(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "game/26/hint")] HttpRequest req)
    {
        AnimalHintRequest? hintRequest;

        try
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            var body = await reader.ReadToEndAsync();
            hintRequest = JsonSerializer.Deserialize<AnimalHintRequest>(body, JsonOptions);
        }
        catch
        {
            return new BadRequestObjectResult(new { error = "Invalid JSON" });
        }

        if (hintRequest == null)
        {
            return new BadRequestObjectResult(new { error = "Request body required" });
        }

        if (string.IsNullOrWhiteSpace(hintRequest.Animal))
        {
            return new BadRequestObjectResult(new { error = "Animal is required" });
        }

        var hint = await _chatGPTService.GetHintAboutAnimalAsync(hintRequest.Animal, hintRequest.PreviousHints);
        if (hint == null)
        {
            return new ObjectResult(new { error = "Kunne ikke generere hint. Prøv igen." })
            {
                StatusCode = 503
            };
        }

        _logger.LogInformation("Hint generated for {Animal}", hintRequest.Animal);

        return new OkObjectResult(new AnimalHintResponse
        {
            Hint = hint
        });
    }
}
