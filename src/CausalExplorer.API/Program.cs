using CausalExplorer.Application;
using CausalExplorer.Infrastructure;
using CausalExplorer.API.Extensions;
using Serilog;

// Ensure Npgsql reads/writes timestamp with time zone as UTC (required by BYOK key encryption + PostgreSQL)
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// ── Bootstrap Serilog early so startup errors are captured ────────────────────
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {CorrelationId} {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        "logs/causalexplorer-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 14)
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting CausalExplorer API");

    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog ───────────────────────────────────────────────────────────────
    builder.Host.UseSerilog((ctx, services, cfg) =>
        cfg.ReadFrom.Configuration(ctx.Configuration)
           .ReadFrom.Services(services)
           .Enrich.FromLogContext()
           .Enrich.WithMachineName()
           .WriteTo.Console(outputTemplate:
               "[{Timestamp:HH:mm:ss} {Level:u3}] {CorrelationId} {Message:lj}{NewLine}{Exception}")
           .WriteTo.File(
               "logs/causalexplorer-.log",
               rollingInterval: RollingInterval.Day,
               retainedFileCountLimit: 14));

    // ── Domain → Application → Infrastructure ─────────────────────────────────
    builder.Services.AddApplication(builder.Configuration);
    builder.Services.AddInfrastructure(builder.Configuration);

    // ── HTTP context + current-user service ───────────────────────────────────
    builder.Services.AddCurrentUserService();

    // ── Auth ─────────────────────────────────────────────────────────────────
    builder.Services.AddJwtBearerAuthentication(builder.Configuration);
    builder.Services.AddAuthorizationPolicies();

    // ── API versioning ────────────────────────────────────────────────────────
    builder.Services.AddApiVersioningSupport();

    // ── Rate limiting ─────────────────────────────────────────────────────────
    builder.Services.AddRateLimitingPolicies(builder.Configuration);

    // ── CORS ──────────────────────────────────────────────────────────────────
    builder.Services.AddCorsPolicies(builder.Configuration);

    // ── Response compression ──────────────────────────────────────────────────
    builder.Services.AddResponseCompression(opts =>
    {
        opts.EnableForHttps = true;
    });

    // ── MVC + JSON ────────────────────────────────────────────────────────────
    builder.Services
        .AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy =
                System.Text.Json.JsonNamingPolicy.CamelCase;
            options.JsonSerializerOptions.Converters.Add(
                new System.Text.Json.Serialization.JsonStringEnumConverter());
        });

    builder.Services.AddEndpointsApiExplorer();

    // ── Swagger ───────────────────────────────────────────────────────────────
    builder.Services.AddSwaggerDocumentation();

    // ── Health checks ─────────────────────────────────────────────────────────
    builder.Services.AddPlatformHealthChecks(builder.Configuration);

    // ─────────────────────────────────────────────────────────────────────────
    var app = builder.Build();
    // ─────────────────────────────────────────────────────────────────────────

    // Middleware pipeline (order matters)
    app.UseApiPipeline();

    // Swagger UI
    app.UseSwaggerIfDevelopment();

    // Controllers
    app.MapControllers();

    // Health endpoints
    app.MapHealthEndpoints();

    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "CausalExplorer API terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// Needed for integration tests
public partial class Program { }
