using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Enums;
using CasualExplorer.Domain.Interfaces;
using CasualExplorer.Infrastructure.Search;
using Microsoft.EntityFrameworkCore;

namespace CasualExplorer.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core implementation of <see cref="IEventNodeRepository"/>.
/// </summary>
internal sealed class EventNodeRepository : IEventNodeRepository
{
    private readonly CasualExplorerDbContext _context;

    /// <summary>Initialises a new instance of <see cref="EventNodeRepository"/>.</summary>
    public EventNodeRepository(CasualExplorerDbContext context) => _context = context;

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
        var keywords = SearchTextProcessor.GetKeywords(query);
        if (keywords.Count == 0)
            return [];

        var minMatches = SearchTextProcessor.GetMinimumMatchCount(keywords);
        var candidates = await _context.EventNodes
            .AsNoTracking()
            .OrderByDescending(e => e.CreatedAt)
            .Take(500)
            .ToListAsync(cancellationToken);

        return candidates
            .Select(node => new
            {
                Node = node,
                MatchCount = keywords.Count(keyword =>
                    node.Title.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
                    node.Summary.Contains(keyword, StringComparison.OrdinalIgnoreCase)),
                Score = SearchTextProcessor.Score(node.Title, node.Summary, keywords)
            })
            .Where(result => result.MatchCount >= minMatches)
            .OrderByDescending(result => result.Score)
            .ThenByDescending(result => result.Node.CreatedAt)
            .Take(50)
            .Select(result => result.Node)
            .ToList();
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
