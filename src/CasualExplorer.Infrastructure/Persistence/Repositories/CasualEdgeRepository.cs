using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Enums;
using CasualExplorer.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CasualExplorer.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core implementation of <see cref="ICasualEdgeRepository"/>.
/// </summary>
internal sealed class CasualEdgeRepository : ICasualEdgeRepository
{
    private readonly CasualExplorerDbContext _context;

    /// <summary>Initialises a new instance of <see cref="CasualEdgeRepository"/>.</summary>
    public CasualEdgeRepository(CasualExplorerDbContext context) => _context = context;

    /// <inheritdoc />
    public Task<CasualEdge?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _context.CasualEdges.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    /// <inheritdoc />
    public async Task<IReadOnlyList<CasualEdge>> GetByFromEventAsync(
        Guid fromEventId, CancellationToken cancellationToken = default) =>
        await _context.CasualEdges.AsNoTracking()
            .Where(e => e.FromEventId == fromEventId)
            .ToListAsync(cancellationToken);

    /// <inheritdoc />
    public async Task<IReadOnlyList<CasualEdge>> GetByToEventAsync(
        Guid toEventId, CancellationToken cancellationToken = default) =>
        await _context.CasualEdges.AsNoTracking()
            .Where(e => e.ToEventId == toEventId)
            .ToListAsync(cancellationToken);

    /// <inheritdoc />
    public async Task<IReadOnlyList<CasualEdge>> GetByEventIdAsync(
        Guid eventId,
        Perspective? perspective,
        CancellationToken cancellationToken = default)
    {
        var query = _context.CasualEdges.AsNoTracking()
            .Where(e => e.FromEventId == eventId || e.ToEventId == eventId);

        if (perspective.HasValue)
            query = query.Where(e => e.Perspective == perspective.Value);

        return await query.ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task AddAsync(CasualEdge edge, CancellationToken cancellationToken = default) =>
        await _context.CasualEdges.AddAsync(edge, cancellationToken);

    /// <inheritdoc />
    public async Task BulkAddAsync(IEnumerable<CasualEdge> edges, CancellationToken cancellationToken = default) =>
        await _context.CasualEdges.AddRangeAsync(edges, cancellationToken);

    /// <inheritdoc />
    public void Update(CasualEdge edge) => _context.CasualEdges.Update(edge);

    /// <inheritdoc />
    public void Delete(CasualEdge edge) => _context.CasualEdges.Remove(edge);
}
