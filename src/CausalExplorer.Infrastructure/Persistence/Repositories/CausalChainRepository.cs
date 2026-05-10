using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Enums;
using CausalExplorer.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CausalExplorer.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core implementation of <see cref="ICausalChainRepository"/>.
/// </summary>
internal sealed class CausalChainRepository : ICausalChainRepository
{
    private readonly CausalExplorerDbContext _context;

    /// <summary>Initialises a new instance of <see cref="CausalChainRepository"/>.</summary>
    public CausalChainRepository(CausalExplorerDbContext context) => _context = context;

    /// <inheritdoc />
    public Task<CausalChain?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _context.CausalChains.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    /// <inheritdoc />
    public async Task<IReadOnlyList<CausalChain>> GetPagedAsync(
        EventDomain? domain,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _context.CausalChains.AsNoTracking();

        if (domain.HasValue)
            query = query.Where(c => c.Domain == domain.Value);

        return await query
            .OrderByDescending(c => c.LastUpdatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<CausalChain>> GetTrendingAsync(
        int count, CancellationToken cancellationToken = default) =>
        await _context.CausalChains.AsNoTracking()
            .OrderByDescending(c => c.ViewCount)
            .Take(count)
            .ToListAsync(cancellationToken);

    /// <inheritdoc />
    public async Task AddAsync(CausalChain chain, CancellationToken cancellationToken = default) =>
        await _context.CausalChains.AddAsync(chain, cancellationToken);

    /// <inheritdoc />
    public void Update(CausalChain chain) => _context.CausalChains.Update(chain);

    /// <inheritdoc />
    public void Delete(CausalChain chain) => _context.CausalChains.Remove(chain);
}
