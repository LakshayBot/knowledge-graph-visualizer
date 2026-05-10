using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Enums;
using CausalExplorer.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CausalExplorer.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core implementation of <see cref="IEventNodeRepository"/>.
/// </summary>
internal sealed class EventNodeRepository : IEventNodeRepository
{
    private readonly CausalExplorerDbContext _context;

    /// <summary>Initialises a new instance of <see cref="EventNodeRepository"/>.</summary>
    public EventNodeRepository(CausalExplorerDbContext context) => _context = context;

    /// <inheritdoc />
    public Task<EventNode?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _context.EventNodes
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

    /// <inheritdoc />
    public async Task<IReadOnlyList<EventNode>> GetPagedAsync(
        EventDomain? domain,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _context.EventNodes.AsNoTracking();

        if (domain.HasValue)
            query = query.Where(e => e.Domain == domain.Value);

        return await query
            .OrderByDescending(e => e.EventDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<EventNode>> SearchAsync(
        string query,
        CancellationToken cancellationToken = default)
    {
        var lower = query.ToLowerInvariant();

        return await _context.EventNodes
            .AsNoTracking()
            .Where(e => EF.Functions.ILike(e.Title, $"%{lower}%")
                     || EF.Functions.ILike(e.Summary, $"%{lower}%"))
            .OrderByDescending(e => e.CreatedAt)
            .Take(50)
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<EventNode>> GetUnverifiedAsync(
        CancellationToken cancellationToken = default) =>
        await _context.EventNodes
            .AsNoTracking()
            .Where(e => !e.IsVerified)
            .OrderBy(e => e.CreatedAt)
            .ToListAsync(cancellationToken);

    /// <inheritdoc />
    public async Task AddAsync(EventNode eventNode, CancellationToken cancellationToken = default) =>
        await _context.EventNodes.AddAsync(eventNode, cancellationToken);

    /// <inheritdoc />
    public async Task BulkAddAsync(IEnumerable<EventNode> eventNodes, CancellationToken cancellationToken = default) =>
        await _context.EventNodes.AddRangeAsync(eventNodes, cancellationToken);

    /// <inheritdoc />
    public Task UpdateAsync(EventNode eventNode, CancellationToken cancellationToken = default)
    {
        _context.EventNodes.Update(eventNode);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task DeleteAsync(EventNode eventNode, CancellationToken cancellationToken = default)
    {
        _context.EventNodes.Remove(eventNode);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default) =>
        _context.EventNodes.AnyAsync(e => e.Id == id, cancellationToken);
}
