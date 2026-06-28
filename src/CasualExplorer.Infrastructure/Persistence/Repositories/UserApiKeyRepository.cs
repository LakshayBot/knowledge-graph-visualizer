using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CasualExplorer.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core implementation of <see cref="IUserApiKeyRepository"/>.
/// </summary>
internal sealed class UserApiKeyRepository : IUserApiKeyRepository
{
    private readonly CasualExplorerDbContext _context;

    public UserApiKeyRepository(CasualExplorerDbContext context) => _context = context;

    /// <inheritdoc />
    public Task<UserApiKey?> GetByUserAndProviderAsync(Guid userId, string provider, CancellationToken ct = default)
        => _context.UserApiKeys
            .AsNoTracking()
            .FirstOrDefaultAsync(k => k.UserId == userId && k.Provider == provider.ToLowerInvariant().Trim(), ct);

    /// <inheritdoc />
    public async Task<List<UserApiKey>> GetAllByUserAsync(Guid userId, CancellationToken ct = default)
        => await _context.UserApiKeys
            .AsNoTracking()
            .Where(k => k.UserId == userId)
            .OrderBy(k => k.Provider)
            .ToListAsync(ct);

    /// <inheritdoc />
    public async Task AddAsync(UserApiKey key, CancellationToken ct = default)
        => await _context.UserApiKeys.AddAsync(key, ct);

    /// <inheritdoc />
    public void Update(UserApiKey key)
        => _context.UserApiKeys.Update(key);

    /// <inheritdoc />
    public void Delete(UserApiKey key)
        => _context.UserApiKeys.Remove(key);
}
