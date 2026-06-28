using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Enums;
using CasualExplorer.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CasualExplorer.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core implementation of <see cref="ICasualChainRepository"/>.
/// </summary>
internal sealed class CasualChainRepository : ICasualChainRepository
{
    private readonly CasualExplorerDbContext _context;

    /// <summary>Initialises a new instance of <see cref="CasualChainRepository"/>.</summary>
    public CasualChainRepository(CasualExplorerDbContext context) => _context = context;

    /// <inheritdoc />
    public Task<CasualChain?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _context.CasualChains.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    /// <inheritdoc />
    public async Task<IReadOnlyList<CasualChain>> GetPagedAsync(
        EventDomain? domain,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _context.CasualChains.AsNoTracking();

        if (domain.HasValue)
            query = query.Where(c => c.Domain == domain.Value);

        return await query
            .OrderByDescending(c => c.LastUpdatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<CasualChain>> GetTrendingAsync(
        int count, CancellationToken cancellationToken = default) =>
        await _context.CasualChains.AsNoTracking()
            .OrderByDescending(c => c.ViewCount)
            .Take(count)
            .ToListAsync(cancellationToken);

    /// <inheritdoc />
    public async Task AddAsync(CasualChain chain, CancellationToken cancellationToken = default) =>
        await _context.CasualChains.AddAsync(chain, cancellationToken);

    /// <inheritdoc />
    public void Update(CasualChain chain) => _context.CasualChains.Update(chain);

    /// <inheritdoc />
    public void Delete(CasualChain chain) => _context.CasualChains.Remove(chain);
}
