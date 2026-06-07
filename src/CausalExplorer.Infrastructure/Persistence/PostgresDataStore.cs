using CausalExplorer.Application.Common.Interfaces;
using CausalExplorer.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CausalExplorer.Infrastructure.Persistence;

/// <summary>
/// EF Core implementation of <see cref="IPostgresDataStore"/>.
/// Writes event nodes and causal edges to PostgreSQL, skipping duplicates.
/// Edges referencing nodes not yet in PostgreSQL are silently skipped (FK-safe).
/// </summary>
internal sealed class PostgresDataStore : IPostgresDataStore
{
    private readonly CausalExplorerDbContext _context;
    private readonly ILogger<PostgresDataStore> _logger;

    public PostgresDataStore(CausalExplorerDbContext context, ILogger<PostgresDataStore> logger)
    {
        _context = context;
        _logger  = logger;
    }

    public async Task BulkAddEventNodesAsync(IEnumerable<EventNode> nodes, CancellationToken ct = default)
    {
        var list = nodes.ToList();
        if (list.Count == 0) return;

        var ids = list.Select(n => n.Id).ToList();
        var existingIds = await _context.EventNodes
            .Where(n => ids.Contains(n.Id))
            .Select(n => n.Id)
            .ToListAsync(ct);

        var newNodes = list.Where(n => !existingIds.Contains(n.Id)).ToList();
        if (newNodes.Count == 0) return;

        await _context.EventNodes.AddRangeAsync(newNodes, ct);
        await _context.SaveChangesAsync(ct);
        _logger.LogDebug("Saved {Count} event nodes to PostgreSQL", newNodes.Count);
    }

    public async Task BulkAddCausalEdgesAsync(IEnumerable<CausalEdge> edges, CancellationToken ct = default)
    {
        var list = edges.ToList();
        if (list.Count == 0) return;

        // Check which endpoint node IDs exist in PostgreSQL
        var allNodeIds = new HashSet<Guid>();
        foreach (var e in list) { allNodeIds.Add(e.FromEventId); allNodeIds.Add(e.ToEventId); }
        var existingNodeIds = await _context.EventNodes
            .Where(n => allNodeIds.Contains(n.Id))
            .Select(n => n.Id)
            .ToListAsync(ct);
        var existingSet = new HashSet<Guid>(existingNodeIds);

        // Filter edges where both endpoints exist in PostgreSQL (FK-safe)
        var validEdges = list.Where(e => existingSet.Contains(e.FromEventId) && existingSet.Contains(e.ToEventId)).ToList();
        if (validEdges.Count == 0) return;

        var edgeIds = validEdges.Select(e => e.Id).ToList();
        var existingEdgeIds = await _context.CausalEdges
            .Where(e => edgeIds.Contains(e.Id))
            .Select(e => e.Id)
            .ToListAsync(ct);

        var newEdges = validEdges.Where(e => !existingEdgeIds.Contains(e.Id)).ToList();
        if (newEdges.Count == 0) return;

        await _context.CausalEdges.AddRangeAsync(newEdges, ct);
        await _context.SaveChangesAsync(ct);
        _logger.LogDebug("Saved {Count} causal edges to PostgreSQL", newEdges.Count);
    }

    public async Task AddChainNodeMappingsAsync(Guid chainId, IEnumerable<Guid> nodeIds, CancellationToken ct = default)
    {
        var ids = nodeIds.ToList();
        if (ids.Count == 0) return;

        var values = string.Join(",", ids.Select(id => $"('{chainId}', '{id}')"));
        var sql = $"INSERT INTO chain_nodes (chain_id, node_id) VALUES {values} ON CONFLICT (chain_id, node_id) DO NOTHING";
        await _context.Database.ExecuteSqlRawAsync(sql, ct);
        _logger.LogDebug("Added {Count} chain-node mappings for chain {ChainId}", ids.Count, chainId);
    }

    public async Task<IReadOnlyList<Guid>> GetChainNodeIdsAsync(Guid chainId, CancellationToken ct = default)
    {
        var result = await _context.Database
            .SqlQueryRaw<Guid>("SELECT node_id AS \"Value\" FROM chain_nodes WHERE chain_id = {0}", chainId)
            .ToListAsync(ct);
        return result;
    }
}
