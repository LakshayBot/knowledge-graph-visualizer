using CasualExplorer.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CasualExplorer.Infrastructure.Identity;

/// <summary>
/// Repository for persisting and validating opaque refresh tokens via EF Core.
/// </summary>
public sealed class RefreshTokenStore
{
    private readonly CasualExplorerDbContext _context;

    /// <summary>Initialises a new instance with the shared database context.</summary>
    public RefreshTokenStore(CasualExplorerDbContext context) => _context = context;

    /// <summary>
    /// Stores a new refresh token record for the given user.
    /// </summary>
    /// <param name="userId">The user the token belongs to.</param>
    /// <param name="token">The opaque refresh token string.</param>
    /// <param name="createdByIp">Optional IP address of the originating request.</param>
    /// <param name="ct">Cancellation token.</param>
    public async Task StoreAsync(
        Guid userId,
        string token,
        string? createdByIp = null,
        CancellationToken ct = default)
    {
        var record = new RefreshTokenRecord
        {
            UserId      = userId,
            Token       = token,
            ExpiresAt   = DateTime.UtcNow.AddDays(30),
            IsRevoked   = false,
            CreatedByIp = createdByIp
        };

        _context.RefreshTokens.Add(record);
        await _context.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Returns <c>true</c> if the token exists, is not expired, and has not been revoked.
    /// </summary>
    public bool IsValid(string token)
    {
        var record = _context.RefreshTokens
            .AsNoTracking()
            .SingleOrDefault(r => r.Token == token);

        return record is not null
            && !record.IsRevoked
            && record.ExpiresAt > DateTime.UtcNow;
    }

    /// <summary>Revokes a specific refresh token, preventing further use.</summary>
    /// <param name="token">The token to revoke.</param>
    /// <param name="ct">Cancellation token.</param>
    public async Task RevokeAsync(string token, CancellationToken ct = default)
    {
        var record = await _context.RefreshTokens
            .SingleOrDefaultAsync(r => r.Token == token, ct);

        if (record is not null)
        {
            record.IsRevoked = true;
            await _context.SaveChangesAsync(ct);
        }
    }

    /// <summary>Revokes all refresh tokens belonging to a user (e.g. on logout from all devices).</summary>
    /// <param name="userId">The user whose tokens to revoke.</param>
    /// <param name="ct">Cancellation token.</param>
    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var tokens = await _context.RefreshTokens
            .Where(r => r.UserId == userId && !r.IsRevoked)
            .ToListAsync(ct);

        foreach (var t in tokens)
            t.IsRevoked = true;

        await _context.SaveChangesAsync(ct);
    }
}
