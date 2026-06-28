namespace CasualExplorer.API.Middleware;

/// <summary>
/// Reads the <c>X-Correlation-ID</c> request header (or generates a new GUID),
/// stores it in <see cref="HttpContext.Items"/>, echoes it on the response header,
/// and enriches the Serilog log context with the value.
/// </summary>
public sealed class CorrelationIdMiddleware
{
    /// <summary>The HTTP header name used to propagate correlation IDs.</summary>
    public const string HeaderName = "X-Correlation-ID";

    /// <summary>The key used to store the correlation ID in <see cref="HttpContext.Items"/>.</summary>
    public const string ItemKey = "CorrelationId";

    private readonly RequestDelegate _next;

    /// <summary>Initialises the middleware.</summary>
    public CorrelationIdMiddleware(RequestDelegate next) => _next = next;

    /// <summary>Processes the request.</summary>
    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers.TryGetValue(HeaderName, out var existing)
                         && !string.IsNullOrWhiteSpace(existing)
            ? existing.ToString()
            : Guid.NewGuid().ToString();

        context.Items[ItemKey] = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        using (Serilog.Context.LogContext.PushProperty("CorrelationId", correlationId))
        {
            await _next(context);
        }
    }
}
