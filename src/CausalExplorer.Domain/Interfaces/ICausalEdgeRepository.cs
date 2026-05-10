using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Enums;

namespace CausalExplorer.Domain.Interfaces;

/// <summary>
/// Defines the contract for persistence operations on <see cref="CausalEdge"/> aggregates.
/// </summary>
public interface ICausalEdgeRepository
{
    /// <summary>
    /// Retrieves a <see cref="CausalEdge"/> by its unique identifier.
    /// </summary>
    /// <param name="id">The edge identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<CausalEdge?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns all edges originating from the specified event node.
    /// </summary>
    /// <param name="fromEventId">Source event node identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<CausalEdge>> GetByFromEventAsync(
        Guid fromEventId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns all edges targeting the specified event node.
    /// </summary>
    /// <param name="toEventId">Target event node identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<CausalEdge>> GetByToEventAsync(
        Guid toEventId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns all edges connected to the given event node, in either direction,
    /// optionally filtered by <paramref name="perspective"/>.
    /// </summary>
    /// <param name="eventId">The event node identifier.</param>
    /// <param name="perspective">Optional perspective filter.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<CausalEdge>> GetByEventIdAsync(
        Guid eventId,
        Perspective? perspective,
        CancellationToken cancellationToken = default);

    /// <summary>Adds a new <see cref="CausalEdge"/> to the repository.</summary>
    Task AddAsync(CausalEdge edge, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bulk-adds multiple <see cref="CausalEdge"/> instances in a single round-trip.
    /// Edges referencing non-existent node IDs are silently skipped.
    /// </summary>
    Task BulkAddAsync(IEnumerable<CausalEdge> edges, CancellationToken cancellationToken = default);

    /// <summary>Marks an existing <see cref="CausalEdge"/> as modified.</summary>
    void Update(CausalEdge edge);

    /// <summary>Removes a <see cref="CausalEdge"/> from the repository.</summary>
    void Delete(CausalEdge edge);
}
