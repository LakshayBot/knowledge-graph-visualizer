using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CasualExplorer.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core implementation of <see cref="IUserSavedChainRepository"/>.
/// </summary>
internal sealed class UserSavedChainRepository : IUserSavedChainRepository
{
    private readonly CasualExplorerDbContext _context;

    /// <summary>Initialises a new instance of <see cref="UserSavedChainRepository"/>.</summary>
    public UserSavedChainRepository(CasualExplorerDbContext context) => _context = context;

    /// <inheritdoc />
    public async Task<IReadOnlyList<UserSavedChain>> GetByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default) =>
        await _context.UserSavedChains
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.SavedAt)
            .ToListAsync(cancellationToken);

    /// <inheritdoc />
    public Task<UserSavedChain?> GetAsync(
        Guid userId,
        Guid chainId,
        CancellationToken cancellationToken = default) =>
        _context.UserSavedChains
            .FirstOrDefaultAsync(s => s.UserId == userId && s.ChainId == chainId, cancellationToken);

    /// <inheritdoc />
    public async Task AddAsync(UserSavedChain savedChain, CancellationToken cancellationToken = default) =>
        await _context.UserSavedChains.AddAsync(savedChain, cancellationToken);

    /// <inheritdoc />
    public void Delete(UserSavedChain savedChain) => _context.UserSavedChains.Remove(savedChain);
}
