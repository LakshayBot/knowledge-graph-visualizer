namespace CasualExplorer.Application.Common.Exceptions;

/// <summary>
/// Thrown when the current user attempts an operation they are not authorised to perform.
/// </summary>
public sealed class ForbiddenAccessException : Exception
{
    /// <summary>Initialises a new <see cref="ForbiddenAccessException"/>.</summary>
    public ForbiddenAccessException()
        : base("You do not have permission to perform this action.") { }

    /// <summary>Initialises a new <see cref="ForbiddenAccessException"/> with a custom message.</summary>
    public ForbiddenAccessException(string message) : base(message) { }
}
