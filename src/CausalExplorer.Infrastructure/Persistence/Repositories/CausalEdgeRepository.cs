using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Enums;
using CausalExplorer.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CausalExplorer.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core implementation of <see cref="ICausalEdgeRepository"/>.
/// </summary>
internal sealed class CausalEdgeRepository : ICausalEdgeRepository
{
    private readonly CausalExplorerDbContext _context;

    /// <summary>Initialises a new instance of <see cref="CausalEdgeRepository"/>.</summary>
    public CausalEdgeRepository(CausalExplorerDbContext context) => _context = context;

    /// <inheritdoc />
    public Task<CausalEdge?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _context.CausalEdges.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    /// <inheritdoc />
    public async Task<IReadOnlyList<CausalEdge>> GetByFromEventAsync(
        Guid fromEventId, CancellationToken cancellationToken = default) =>
        await _context.CausalEdges.AsNoTracking()
            .Where(e => e.FromEventId == fromEventId)
            .ToListAsync(cancellationToken);

    /// <inheritdoc />
    public async Task<IReadOnlyList<CausalEdge>> GetByToEventAsync(
        Guid toEventId, CancellationToken cancellationToken = default) =>
        await _context.CausalEdges.AsNoTracking()
            .Where(e => e.ToEventId == toEventId)
            .ToListAsync(cancellationToken);

    /// <inheritdoc />
    public async Task<IReadOnlyList<CausalEdge>> GetByEventIdAsync(
        Guid eventId,
        Perspective? perspective,
        CancellationToken cancellationToken = default)
    {
        var query = _context.CausalEdges.AsNoTracking()
            .Where(e => e.FromEventId == eventId || e.ToEventId == eventId);

        if (perspective.HasValue)
            query = query.Where(e => e.Perspective == perspective.Value);

        return await query.ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task AddAsync(CausalEdge edge, CancellationToken cancellationToken = default) =>
        await _context.CausalEdges.AddAsync(edge, cancellationToken);

    /// <inheritdoc />
    public async Task BulkAddAsync(IEnumerable<CausalEdge> edges, CancellationToken cancellationToken = default) =>
        await _context.CausalEdges.AddRangeAsync(edges, cancellationToken);

    /// <inheritdoc />
    public void Update(CausalEdge edge) => _context.CausalEdges.Update(edge);

    /// <inheritdoc />
    public void Delete(CausalEdge edge) => _context.CausalEdges.Remove(edge);
}
