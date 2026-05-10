namespace CausalExplorer.Application.Common.Exceptions;

/// <summary>
/// Thrown when the Python AI sidecar service returns an error or is unreachable.
/// </summary>
public sealed class AIServiceException : Exception
{
    /// <summary>Initialises a new <see cref="AIServiceException"/> with a descriptive message.</summary>
    public AIServiceException(string message) : base(message) { }

    /// <summary>
    /// Initialises a new <see cref="AIServiceException"/> with a message and an inner exception.
    /// </summary>
    public AIServiceException(string message, Exception innerException)
        : base(message, innerException) { }
}
