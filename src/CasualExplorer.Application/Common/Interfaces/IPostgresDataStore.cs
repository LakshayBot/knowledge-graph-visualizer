using CasualExplorer.Domain.Entities;

namespace CasualExplorer.Application.Common.Interfaces;

/// <summary>
/// Dual-write abstraction for persisting event nodes and casual edges
/// to the PostgreSQL relational store alongside Neo4j graph operations.
/// </summary>
public interface IPostgresDataStore
{
    /// <summary>Bulk-adds event nodes — duplicates silently skipped.</summary>
    Task BulkAddEventNodesAsync(IEnumerable<EventNode> nodes, CancellationToken ct = default);

    /// <summary>Bulk-adds casual edges — duplicates silently skipped.</summary>
    Task BulkAddCasualEdgesAsync(IEnumerable<CasualEdge> edges, CancellationToken ct = default);

    /// <summary>Maps node IDs to a chain for chain-scoped loading.</summary>
    Task AddChainNodeMappingsAsync(Guid chainId, IEnumerable<Guid> nodeIds, CancellationToken ct = default);

    /// <summary>Returns all node IDs mapped to a chain.</summary>
    Task<IReadOnlyList<Guid>> GetChainNodeIdsAsync(Guid chainId, CancellationToken ct = default);
}
