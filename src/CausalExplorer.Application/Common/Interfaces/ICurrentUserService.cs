namespace CausalExplorer.Application.Common.Interfaces;

/// <summary>
/// Exposes information about the currently-authenticated user derived from the HTTP context.
/// </summary>
public interface ICurrentUserService
{
    /// <summary>Gets the unique identifier of the current user, or <c>null</c> if unauthenticated.</summary>
    Guid? UserId { get; }

    /// <summary>Gets a value indicating whether the current request is authenticated.</summary>
    bool IsAuthenticated { get; }

    /// <summary>Gets the role claim of the current user, or <c>null</c> if unauthenticated.</summary>
    string? Role { get; }
}
