using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Enums;

namespace CasualExplorer.Domain.Interfaces;

/// <summary>
/// Defines the contract for persistence operations on <see cref="CasualEdge"/> aggregates.
/// </summary>
public interface ICasualEdgeRepository
{
    /// <summary>
    /// Retrieves a <see cref="CasualEdge"/> by its unique identifier.
    /// </summary>
    /// <param name="id">The edge identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<CasualEdge?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns all edges originating from the specified event node.
    /// </summary>
    /// <param name="fromEventId">Source event node identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<CasualEdge>> GetByFromEventAsync(
        Guid fromEventId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns all edges targeting the specified event node.
    /// </summary>
    /// <param name="toEventId">Target event node identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<CasualEdge>> GetByToEventAsync(
        Guid toEventId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns all edges connected to the given event node, in either direction,
    /// optionally filtered by <paramref name="perspective"/>.
    /// </summary>
    /// <param name="eventId">The event node identifier.</param>
    /// <param name="perspective">Optional perspective filter.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<CasualEdge>> GetByEventIdAsync(
        Guid eventId,
        Perspective? perspective,
        CancellationToken cancellationToken = default);

    /// <summary>Adds a new <see cref="CasualEdge"/> to the repository.</summary>
    Task AddAsync(CasualEdge edge, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bulk-adds multiple <see cref="CasualEdge"/> instances in a single round-trip.
    /// Edges referencing non-existent node IDs are silently skipped.
    /// </summary>
    Task BulkAddAsync(IEnumerable<CasualEdge> edges, CancellationToken cancellationToken = default);

    /// <summary>Marks an existing <see cref="CasualEdge"/> as modified.</summary>
    void Update(CasualEdge edge);

    /// <summary>Removes a <see cref="CasualEdge"/> from the repository.</summary>
    void Delete(CasualEdge edge);
}
