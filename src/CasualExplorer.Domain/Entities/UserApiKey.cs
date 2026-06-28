using CasualExplorer.Domain.Common;

namespace CasualExplorer.Domain.Entities;

/// <summary>
/// Stores an encrypted API key that a user has provided for an LLM provider.
/// One key per provider per user.
/// </summary>
public sealed class UserApiKey : BaseEntity
{
    /// <summary>Gets the owning user's identifier.</summary>
    public Guid UserId { get; private set; }

    /// <summary>Gets the provider machine name (e.g. "grok", "openai", "claude").</summary>
    public string Provider { get; private set; } = default!;

    /// <summary>Gets the AES-256 encrypted API key value, Base64-encoded.</summary>
    public string KeyEncrypted { get; private set; } = default!;

    /// <summary>Gets the first 8–12 cleartext characters for display (e.g. "xai-abc1...").</summary>
    public string KeyPrefix { get; private set; } = default!;

    /// <summary>Gets a value indicating whether this key is active.</summary>
    public bool IsActive { get; private set; }

    /// <summary>Gets the UTC timestamp when the key was last verified against the provider's API.</summary>
    public DateTime? LastVerifiedAt { get; private set; }

    /// <summary>Gets the owning user navigation property.</summary>
    public User User { get; private set; } = null!;

    // ── Factory ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a new <see cref="UserApiKey"/> with the given parameters.
    /// </summary>
    public static UserApiKey Create(Guid userId, string provider, string encryptedKey, string keyPrefix)
    {
        if (string.IsNullOrWhiteSpace(provider))
            throw new ArgumentException("Provider must not be empty.", nameof(provider));

        if (string.IsNullOrWhiteSpace(encryptedKey))
            throw new ArgumentException("Encrypted key must not be empty.", nameof(encryptedKey));

        return new UserApiKey
        {
            UserId       = userId,
            Provider     = provider.ToLowerInvariant().Trim(),
            KeyEncrypted = encryptedKey,
            KeyPrefix    = keyPrefix,
            IsActive     = true
        };
    }

    // ── Behaviour ────────────────────────────────────────────────────────────

    /// <summary>Marks the key as verified at the current UTC time.</summary>
    public void MarkVerified()
    {
        LastVerifiedAt = DateTime.UtcNow;
        Touch();
    }

    /// <summary>Deactivates this key, preventing its use in future requests.</summary>
    public void Deactivate()
    {
        IsActive = false;
        Touch();
    }

    /// <summary>Updates the encrypted key value and resets verification status.</summary>
    public void UpdateKey(string newEncryptedKey, string newKeyPrefix)
    {
        KeyEncrypted    = newEncryptedKey;
        KeyPrefix       = newKeyPrefix;
        LastVerifiedAt  = null;
        IsActive        = true;
        Touch();
    }

    // ── EF Core constructor ──────────────────────────────────────────────────
    private UserApiKey() { }
}
