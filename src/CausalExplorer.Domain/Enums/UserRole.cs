namespace CausalExplorer.Domain.Enums;

/// <summary>
/// Represents the access role assigned to a platform user.
/// </summary>
public enum UserRole
{
    /// <summary>Unauthenticated visitor with read-only access.</summary>
    Guest = 0,

    /// <summary>Authenticated user who can save chains and submit suggestions.</summary>
    User = 1,

    /// <summary>Trusted user who can create and edit event nodes and edges.</summary>
    Contributor = 2,

    /// <summary>User who can review, approve, or reject contributor submissions.</summary>
    Moderator = 3,

    /// <summary>Full platform administrator with unrestricted access.</summary>
    Admin = 4
}
