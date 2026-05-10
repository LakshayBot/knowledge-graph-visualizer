using CausalExplorer.Domain.Common;
using CausalExplorer.Domain.Enums;

namespace CausalExplorer.Domain.Entities;

/// <summary>
/// Represents a registered platform user, including authentication credentials
/// and role assignment.
/// </summary>
public sealed class User : BaseEntity
{
    // ── Public properties ─────────────────────────────────────────────────────

    /// <summary>Gets the user's email address (unique per platform).</summary>
    public string Email { get; private set; } = default!;

    /// <summary>Gets the user's public display name (unique per platform).</summary>
    public string Username { get; private set; } = default!;

    /// <summary>Gets the BCrypt-hashed password credential. Never expose in responses.</summary>
    public string PasswordHash { get; private set; } = default!;

    /// <summary>Gets the role assigned to this user, governing access permissions.</summary>
    public UserRole Role { get; private set; }

    /// <summary>Gets the UTC timestamp of the most recent successful login, if any.</summary>
    public DateTime? LastLoginAt { get; private set; }

    /// <summary>Gets a value indicating whether this user account is active.</summary>
    public bool IsActive { get; private set; }

    // ── Factory method ────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a new, active <see cref="User"/> with the <see cref="UserRole.User"/> role.
    /// </summary>
    /// <param name="email">A valid email address.</param>
    /// <param name="username">A non-whitespace display name.</param>
    /// <param name="passwordHash">Pre-hashed password credential.</param>
    /// <returns>A newly constructed <see cref="User"/>.</returns>
    /// <exception cref="ArgumentException">
    /// Thrown when any argument is null or whitespace.
    /// </exception>
    public static User Create(string email, string username, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email must not be null or whitespace.", nameof(email));

        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("Username must not be null or whitespace.", nameof(username));

        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new ArgumentException("Password hash must not be null or whitespace.", nameof(passwordHash));

        return new User
        {
            Email        = email.ToLowerInvariant().Trim(),
            Username     = username.Trim(),
            PasswordHash = passwordHash,
            Role         = UserRole.User,
            IsActive     = true
        };
    }

    // ── Behaviour ─────────────────────────────────────────────────────────────

    /// <summary>Records a successful login by updating <see cref="LastLoginAt"/>.</summary>
    public void RecordLogin()
    {
        LastLoginAt = DateTime.UtcNow;
        Touch();
    }

    /// <summary>Promotes or demotes the user to the specified <paramref name="role"/>.</summary>
    /// <param name="role">The new role to assign.</param>
    public void AssignRole(UserRole role)
    {
        Role = role;
        Touch();
    }

    /// <summary>Deactivates this user account, preventing authentication.</summary>
    /// <exception cref="InvalidOperationException">Thrown when the account is already inactive.</exception>
    public void Deactivate()
    {
        if (!IsActive)
            throw new InvalidOperationException("User account is already inactive.");

        IsActive = false;
        Touch();
    }

    /// <summary>Reactivates a previously deactivated account.</summary>
    /// <exception cref="InvalidOperationException">Thrown when the account is already active.</exception>
    public void Reactivate()
    {
        if (IsActive)
            throw new InvalidOperationException("User account is already active.");

        IsActive = true;
        Touch();
    }

    /// <summary>Updates the password hash, e.g. after a password-reset flow.</summary>
    /// <param name="newPasswordHash">The new BCrypt hash.</param>
    public void UpdatePasswordHash(string newPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(newPasswordHash))
            throw new ArgumentException("Password hash must not be null or whitespace.", nameof(newPasswordHash));

        PasswordHash = newPasswordHash;
        Touch();
    }

    // ── EF Core parameterless constructor ─────────────────────────────────────
    private User() { }
}
