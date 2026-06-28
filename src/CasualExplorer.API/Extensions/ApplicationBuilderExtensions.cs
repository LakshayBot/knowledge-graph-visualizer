using System.Text.Json;
using CasualExplorer.API.Middleware;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Serilog;

namespace CasualExplorer.API.Extensions;

/// <summary>
/// Extension methods to configure the ASP.NET Core middleware pipeline
/// in the correct, documented order.
/// </summary>
public static class ApplicationBuilderExtensions
{
    /// <summary>
    /// Registers all middleware in the prescribed order:
    /// correlation ID → exception handling → Serilog → HTTPS redirect → CORS →
    /// rate limiting → auth → authorization → response compression → controllers.
    /// </summary>
    public static WebApplication UseApiPipeline(this WebApplication app)
    {
        // Correlation IDs must be first so every log statement carries the ID
        app.UseMiddleware<CorrelationIdMiddleware>();

        // Global exception handler converts exceptions → RFC 7807 problem responses
        app.UseMiddleware<ExceptionHandlingMiddleware>();

        app.UseSerilogRequestLogging(opts =>
        {
            opts.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
            {
                diagnosticContext.Set("RequestHost",   httpContext.Request.Host.Value ?? string.Empty);
                diagnosticContext.Set("RequestScheme", httpContext.Request.Scheme);
                if (httpContext.Items.TryGetValue(CorrelationIdMiddleware.ItemKey, out var cid))
                    diagnosticContext.Set("CorrelationId", cid?.ToString() ?? string.Empty);
            };
        });

        app.UseHttpsRedirection();
        app.UseResponseCompression();
        app.UseCors("AllowFrontend");
        app.UseRateLimiter();
        app.UseAuthentication();
        app.UseAuthorization();

        // Resolve per-user API keys for BYOK flow (must run after auth, before controllers)
        app.UseMiddleware<AiKeyResolutionMiddleware>();

        return app;
    }

    /// <summary>
    /// Registers Swagger UI (always enabled — this is not a public-facing production deployment).
    /// </summary>
    public static WebApplication UseSwaggerIfDevelopment(this WebApplication app)
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "CasualExplorer API v1");
            c.RoutePrefix        = "swagger";
            c.DisplayRequestDuration();
            c.EnableDeepLinking();
        });

        return app;
    }

    /// <summary>
    /// Maps the detailed <c>/health</c> endpoint that reports per-service status,
    /// plus a <c>/health/live</c> liveness probe and a <c>/health/ready</c> readiness probe.
    /// </summary>
    public static WebApplication MapHealthEndpoints(this WebApplication app)
    {
        app.MapHealthChecks("/health", new HealthCheckOptions
        {
            ResponseWriter = WriteDetailedHealthReport
        });

        app.MapHealthChecks("/health/live", new HealthCheckOptions
        {
            Predicate = _ => false // only confirms the process is running
        });

        app.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains("db")
        });

        return app;
    }

    private static Task WriteDetailedHealthReport(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";

        var result = new
        {
            status    = report.Status.ToString(),
            duration  = report.TotalDuration,
            timestamp = DateTime.UtcNow,
            checks    = report.Entries.Select(e => new
            {
                name        = e.Key,
                status      = e.Value.Status.ToString(),
                duration    = e.Value.Duration,
                description = e.Value.Description,
                exception   = e.Value.Exception?.Message,
                tags        = e.Value.Tags
            })
        };

        return context.Response.WriteAsync(
            JsonSerializer.Serialize(result, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented        = true
            }));
    }
}
