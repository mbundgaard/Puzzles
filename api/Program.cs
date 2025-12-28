using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
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
builder.Services.AddSingleton<IFeedbackStorage>(new AzureTableFeedbackStorage(connectionString));

builder.Build().Run();
