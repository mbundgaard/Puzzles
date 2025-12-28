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

// Register storage - swap Mock* for AzureTable* in production
builder.Services.AddSingleton<IWinStorage, MockWinStorage>();
builder.Services.AddSingleton<IEventStorage, MockEventStorage>();

builder.Build().Run();
