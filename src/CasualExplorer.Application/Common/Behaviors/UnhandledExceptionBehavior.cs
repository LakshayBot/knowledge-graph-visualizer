using MediatR;
using Microsoft.Extensions.Logging;

namespace CasualExplorer.Application.Common.Behaviors;

/// <summary>
/// MediatR pipeline behavior that catches any unhandled exceptions from downstream handlers,
/// logs them, and re-throws so they propagate to the global exception handler.
/// </summary>
public sealed class UnhandledExceptionBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<UnhandledExceptionBehavior<TRequest, TResponse>> _logger;

    /// <summary>Initialises a new instance with the provided logger.</summary>
    public UnhandledExceptionBehavior(ILogger<UnhandledExceptionBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        try
        {
            return await next();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Unhandled exception for request {RequestName}: {@Request}",
                typeof(TRequest).Name,
                request);
            throw;
        }
    }
}
