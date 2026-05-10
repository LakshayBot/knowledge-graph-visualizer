using MediatR;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace CausalExplorer.Application.Common.Behaviors;

/// <summary>
/// MediatR pipeline behavior that logs the start, completion time, and any failures
/// for every request passing through the pipeline.
/// </summary>
public sealed class LoggingBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    /// <summary>Initialises a new instance with the provided logger.</summary>
    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;

        _logger.LogInformation("Handling {RequestName}", requestName);

        var sw = Stopwatch.StartNew();
        try
        {
            var response = await next();
            sw.Stop();
            _logger.LogInformation(
                "Handled {RequestName} in {ElapsedMs}ms", requestName, sw.ElapsedMilliseconds);
            return response;
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex,
                "Request {RequestName} failed after {ElapsedMs}ms",
                requestName, sw.ElapsedMilliseconds);
            throw;
        }
    }
}
