namespace CausalExplorer.Infrastructure.Persistence;

/// <summary>
/// Infrastructure-only persistence record for opaque refresh tokens.
/// Not a domain entity — lives only in the Infrastructure layer.
/// </summary>
public sealed class RefreshTokenRecord
{
    /// <summary>Gets or sets the surrogate primary key.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Gets or sets the opaque token string.</summary>
    public string Token { get; set; } = default!;

    /// <summary>Gets or sets the owner user identifier.</summary>
    public Guid UserId { get; set; }

    /// <summary>Gets or sets the UTC expiry timestamp.</summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>Gets or sets a value indicating whether this token has been revoked.</summary>
    public bool IsRevoked { get; set; }

    /// <summary>Gets or sets the IP address that created this token.</summary>
    public string? CreatedByIp { get; set; }

    /// <summary>Gets or sets the UTC creation timestamp.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
