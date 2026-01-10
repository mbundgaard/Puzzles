// Azure Functions API for Hjernespil
// Auto-deployed via GitHub Actions (CI/CD test)
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Puzzles.Services;
using Puzzles.Storage;

var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();

builder.Services
    .AddApplicationInsightsTelemetryWorkerService()
    .ConfigureFunctionsApplicationInsights();

// Register Azure Table Storage
var connectionString = Environment.GetEnvironmentVariable("AzureWebJobsStorage")
    ?? throw new InvalidOperationException("AzureWebJobsStorage connection string not configured");

builder.Services.AddSingleton<IWinStorage>(new AzureTableWinStorage(connectionString));
builder.Services.AddSingleton<IEventStorage>(new AzureTableEventStorage(connectionString));
builder.Services.AddSingleton<IVersionStorage>(new AzureTableVersionStorage(connectionString));
builder.Services.AddSingleton<ISessionStorage>(new AzureTableSessionStorage(connectionString));
builder.Services.AddSingleton<IBattleshipStorage>(new AzureTableBattleshipStorage(connectionString));

// Register GitHub service for feedback issues
builder.Services.AddHttpClient<IGitHubService, GitHubService>();

// Register AI service (Azure OpenAI)
builder.Services.AddHttpClient<IAIService, AzureOpenAIService>();

builder.Build().Run();
