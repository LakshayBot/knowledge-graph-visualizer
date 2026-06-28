namespace CasualExplorer.Domain.Entities;

/// <summary>
/// Represents the association between a <see cref="User"/> and a <see cref="CasualChain"/>
/// that the user has explicitly saved to their personal library.
/// </summary>
public sealed class UserSavedChain
{
    // ── Public properties ─────────────────────────────────────────────────────

    /// <summary>Gets the identifier of the user who saved the chain.</summary>
    public Guid UserId { get; private set; }

    /// <summary>Gets the identifier of the saved casual chain.</summary>
    public Guid ChainId { get; private set; }

    /// <summary>Gets the UTC timestamp at which the chain was saved.</summary>
    public DateTime SavedAt { get; private set; }

    /// <summary>
    /// Gets optional user-supplied notes attached to this saved chain.
    /// May be null if no notes have been added.
    /// </summary>
    public string? Notes { get; private set; }

    // ── Factory method ────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a new <see cref="UserSavedChain"/> association.
    /// </summary>
    /// <param name="userId">The identifier of the user saving the chain.</param>
    /// <param name="chainId">The identifier of the chain being saved.</param>
    /// <param name="notes">Optional personal notes (may be null).</param>
    /// <returns>A newly constructed <see cref="UserSavedChain"/>.</returns>
    public static UserSavedChain Create(Guid userId, Guid chainId, string? notes = null)
    {
        return new UserSavedChain
        {
            UserId  = userId,
            ChainId = chainId,
            SavedAt = DateTime.UtcNow,
            Notes   = notes?.Trim()
        };
    }

    // ── Behaviour ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Updates the personal notes for this saved chain.
    /// </summary>
    /// <param name="notes">New notes text. Pass null or whitespace to clear.</param>
    public void UpdateNotes(string? notes)
    {
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
    }

    // ── EF Core parameterless constructor ─────────────────────────────────────
    private UserSavedChain() { }
}
