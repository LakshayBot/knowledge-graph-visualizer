using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Enums;

namespace CasualExplorer.Domain.Interfaces;

/// <summary>
/// Defines the contract for persistence operations on <see cref="EventNode"/> aggregates.
/// </summary>
public interface IEventNodeRepository
{
    /// <summary>
    /// Retrieves an <see cref="EventNode"/> by its unique identifier.
    /// </summary>
    /// <param name="id">The event node identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The matching node, or <c>null</c> if not found.</returns>
    Task<EventNode?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns a paged list of event nodes, optionally filtered by domain.
    /// </summary>
    /// <param name="domain">Optional domain filter.</param>
    /// <param name="pageNumber">1-based page index.</param>
    /// <param name="pageSize">Maximum number of results per page.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<EventNode>> GetPagedAsync(
        EventDomain? domain,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Searches event nodes whose title or summary contains the given <paramref name="query"/> term.
    /// </summary>
    /// <param name="query">Full-text search term.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<EventNode>> SearchAsync(
        string query,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns all event nodes that have not yet been verified.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<EventNode>> GetUnverifiedAsync(CancellationToken cancellationToken = default);

    /// <summary>Adds a new <see cref="EventNode"/> to the repository.</summary>
    Task AddAsync(EventNode eventNode, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bulk-adds multiple <see cref="EventNode"/> instances in a single round-trip.
    /// Uses MERGE so duplicate IDs are safely ignored.
    /// </summary>
    Task BulkAddAsync(IEnumerable<EventNode> eventNodes, CancellationToken cancellationToken = default);

    /// <summary>Marks an existing <see cref="EventNode"/> as modified.</summary>
    Task UpdateAsync(EventNode eventNode, CancellationToken cancellationToken = default);

    /// <summary>Removes an <see cref="EventNode"/> from the repository.</summary>
    Task DeleteAsync(EventNode eventNode, CancellationToken cancellationToken = default);

    /// <summary>Determines whether an event node with the given <paramref name="id"/> exists.</summary>
    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);
}
