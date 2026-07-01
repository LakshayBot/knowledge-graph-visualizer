namespace CasualExplorer.Application.Common.Exceptions;

/// <summary>
/// Exception thrown when authentication fails (wrong credentials, deactivated account).
/// Maps to HTTP 401 Unauthorized.
/// </summary>
public sealed class AuthenticationException : Exception
{
    public AuthenticationException(string message) : base(message) { }
}
