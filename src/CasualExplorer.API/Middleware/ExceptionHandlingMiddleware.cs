using System.Text.Json;
using CasualExplorer.Application.Common.Exceptions;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace CasualExplorer.API.Middleware;

/// <summary>
/// Global exception-handling middleware. Converts application exceptions to
/// RFC 7807 <c>application/problem+json</c> responses and never leaks internal details.
/// </summary>
public sealed class ExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    /// <summary>Initialises the middleware.</summary>
    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    /// <summary>Processes the request, catching any unhandled exception.</summary>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var traceId   = context.TraceIdentifier;
        var timestamp = DateTime.UtcNow;

        int statusCode;
        string title;
        string detail;
        IDictionary<string, object?>? extensions = null;

        switch (exception)
        {
            case ValidationException ve:
                statusCode = StatusCodes.Status400BadRequest;
                title      = "Validation Failed";
                detail     = "One or more validation errors occurred.";
                extensions = new Dictionary<string, object?> { ["errors"] = ve.Errors };
                _logger.LogInformation("Validation failure on {Path}: {@Errors}",
                    context.Request.Path, ve.Errors);
                break;

            case NotFoundException nfe:
                statusCode = StatusCodes.Status404NotFound;
                title      = "Resource Not Found";
                detail     = nfe.Message;
                _logger.LogInformation("Not found: {Message}", nfe.Message);
                break;

            case ForbiddenAccessException fae:
                statusCode = StatusCodes.Status403Forbidden;
                title      = "Forbidden";
                detail     = fae.Message;
                _logger.LogInformation("Forbidden access: {Message}", fae.Message);
                break;

            case ConflictException ce:
                statusCode = StatusCodes.Status409Conflict;
                title      = "Conflict";
                detail     = ce.Message;
                _logger.LogInformation("Conflict: {Message}", ce.Message);
                break;

            case AIServiceException aise:
            // Extract the actual error message from the AI service.
            // The AI service returns a JSON body with a "detail" field, or plain text.
            var aiDetail = aise.Message;
            // Try to extract detail from JSON response body
            try
            {
                var startIdx = aise.Message.LastIndexOf(": ");
                if (startIdx > 0)
                {
                    var responseBody = aise.Message[(startIdx + 2)..];
                    if (responseBody.StartsWith('{'))
                    {
                        using var doc = JsonDocument.Parse(responseBody);
                        if (doc.RootElement.TryGetProperty("detail", out var detailProp))
                            aiDetail = detailProp.GetString() ?? aiDetail;
                    }
                }
            }
            catch { /* keep original message if parsing fails */ }

            if (aise.Message.Contains("400") || aise.Message.Contains("API key required") || aise.Message.Contains("requires an API key"))
            {
                // User-configurable issue (e.g. missing API key)
                statusCode = StatusCodes.Status400BadRequest;
                title      = "Configuration Required";
                detail     = aiDetail;
                _logger.LogWarning("AI service configuration error: {Message}", aise.Message);
            }
            else if (aise.Message.Contains("401") || aise.Message.Contains("Incorrect API key") || aise.Message.Contains("Invalid API key"))
            {
                statusCode = StatusCodes.Status401Unauthorized;
                title      = "Invalid API Key";
                detail     = aiDetail;
                _logger.LogWarning("AI service auth error: {Message}", aise.Message);
            }
            else if (aise.Message.Contains("429") || aise.Message.Contains("Rate limit"))
            {
                statusCode = StatusCodes.Status429TooManyRequests;
                title      = "Rate Limited";
                detail     = aiDetail;
                _logger.LogWarning("AI service rate limit: {Message}", aise.Message);
            }
            else
            {
                statusCode = StatusCodes.Status502BadGateway;
                title      = "AI Service Unavailable";
                detail     = "The AI service is temporarily unavailable. Please try again later.";
                _logger.LogError(exception,
                    "AI service error for {Method} {Path}",
                    context.Request.Method, context.Request.Path);
            }
            break;

            default:
                statusCode = StatusCodes.Status500InternalServerError;
                title      = "An Unexpected Error Occurred";
                detail     = "An internal server error occurred. Please contact support if this persists.";
                _logger.LogError(exception,
                    "Unhandled exception for {Method} {Path}",
                    context.Request.Method, context.Request.Path);
                break;
        }

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode  = statusCode;

        var problem = new Dictionary<string, object?>
        {
            ["type"]      = $"https://httpstatuses.com/{statusCode}",
            ["title"]     = title,
            ["status"]    = statusCode,
            ["detail"]    = detail,
            ["instance"]  = context.Request.Path.ToString(),
            ["traceId"]   = traceId,
            ["timestamp"] = timestamp
        };

        if (extensions is not null)
            foreach (var (key, value) in extensions)
                problem[key] = value;

        await context.Response.WriteAsync(
            JsonSerializer.Serialize(problem, _jsonOptions));
    }
}
