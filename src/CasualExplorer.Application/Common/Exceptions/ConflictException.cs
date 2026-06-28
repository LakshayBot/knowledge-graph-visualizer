namespace CasualExplorer.Application.Common.Exceptions;

/// <summary>
/// Thrown when an operation would create a duplicate or conflicting record.
/// </summary>
public sealed class ConflictException : Exception
{
    /// <summary>Initialises a new <see cref="ConflictException"/> with a descriptive message.</summary>
    public ConflictException(string message) : base(message) { }
}
