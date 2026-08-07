using MediatR;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace CasualExplorer.Application.Common.Behaviors;

/// <summary>
/// MediatR pipeline behavior that emits a warning log when a request handler
/// takes longer than 500 ms to complete.
/// </summary>
public sealed class PerformanceBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private const int SlowRequestThresholdMs = 500;

    private readonly ILogger<PerformanceBehavior<TRequest, TResponse>> _logger;

    /// <summary>Initialises a new instance with the provided logger.</summary>
    public PerformanceBehavior(ILogger<PerformanceBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        var response = await next();
        sw.Stop();

        if (sw.ElapsedMilliseconds > SlowRequestThresholdMs)
        {
            _logger.LogWarning(
                "Long-running request detected: {RequestName} took {ElapsedMs}ms (threshold: {ThresholdMs}ms). Request: {@Request}",
                typeof(TRequest).Name,
                sw.ElapsedMilliseconds,
                SlowRequestThresholdMs,
                Redact(request));
        }

        return response;
    }

    /// <summary>
    /// Deep-redacts sensitive properties (Turnstile tokens) from request logging.
    /// </summary>
    private static object Redact(object request)
    {
        const string redacted = "***";
        var type = request.GetType();
        var output = new Dictionary<string, object?>(StringComparer.Ordinal);

        foreach (var prop in type.GetProperties())
        {
            if (prop.Name.Contains("Turnstile", StringComparison.OrdinalIgnoreCase))
            {
                output[prop.Name] = redacted;
                continue;
            }

            var value = prop.GetValue(request);
            if (value is not null &&
                value is string s &&
                (s.Length > 64 || prop.Name.Contains("Token", StringComparison.OrdinalIgnoreCase) || prop.Name.Contains("Secret", StringComparison.OrdinalIgnoreCase)))
            {
                output[prop.Name] = redacted;
                continue;
            }

            output[prop.Name] = value;
        }

        return output;
    }
}
