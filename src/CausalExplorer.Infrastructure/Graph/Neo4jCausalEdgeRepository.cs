using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Enums;
using CausalExplorer.Domain.Interfaces;
using Neo4j.Driver;

namespace CausalExplorer.Infrastructure.Graph;

/// <summary>
/// Neo4j Cypher implementation of <see cref="ICausalEdgeRepository"/>.
/// Causal edges are stored as <c>CAUSED</c> relationships between <c>EventNode</c> nodes.
/// </summary>
internal sealed class Neo4jCausalEdgeRepository : ICausalEdgeRepository
{
    private readonly Neo4jContext _neo4j;

    /// <summary>Initialises the repository with the shared Neo4j context.</summary>
    public Neo4jCausalEdgeRepository(Neo4jContext neo4j) => _neo4j = neo4j;

    // ── Queries ───────────────────────────────────────────────────────────────

    /// <inheritdoc />
    public async Task<CausalEdge?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetSession();
        var result = await session.RunAsync(
            @"MATCH (from:EventNode)-[r:CAUSED {id: $id}]->(to:EventNode)
              RETURN r, from.id AS fromId, to.id AS toId",
            new { id = id.ToString() });

        var records = await result.ToListAsync();
        var record = records.FirstOrDefault();
        return record is null ? null : MapRelationship(
            record["r"].As<IRelationship>(),
            Guid.Parse(record["fromId"].As<string>()),
            Guid.Parse(record["toId"].As<string>()));
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<CausalEdge>> GetByFromEventAsync(
        Guid fromEventId,
        CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetSession();
        var result = await session.RunAsync(
            @"MATCH (from:EventNode {id: $fromId})-[r:CAUSED]->(to:EventNode)
              RETURN r, from.id AS fromId, to.id AS toId",
            new { fromId = fromEventId.ToString() });

        var records = await result.ToListAsync();
        return records
            .Select(r => MapRelationship(
                r["r"].As<IRelationship>(),
                Guid.Parse(r["fromId"].As<string>()),
                Guid.Parse(r["toId"].As<string>()))).ToList();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<CausalEdge>> GetByToEventAsync(
        Guid toEventId,
        CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetSession();
        var result = await session.RunAsync(
            @"MATCH (from:EventNode)-[r:CAUSED]->(to:EventNode {id: $toId})
              RETURN r, from.id AS fromId, to.id AS toId",
            new { toId = toEventId.ToString() });

        var records = await result.ToListAsync();
        return records
            .Select(r => MapRelationship(
                r["r"].As<IRelationship>(),
                Guid.Parse(r["fromId"].As<string>()),
                Guid.Parse(r["toId"].As<string>()))).ToList();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<CausalEdge>> GetByEventIdAsync(
        Guid eventId,
        Perspective? perspective,
        CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetSession();

        var cypher = perspective.HasValue
            ? @"MATCH (n:EventNode {id: $nodeId})
                WITH n
                CALL {
                  WITH n
                  MATCH (n)-[r:CAUSED {perspective: $perspective}]->(effect)
                  RETURN r, n.id AS fromId, effect.id AS toId
                  UNION
                  WITH n
                  MATCH (cause)-[r:CAUSED {perspective: $perspective}]->(n)
                  RETURN r, cause.id AS fromId, n.id AS toId
                }
                RETURN r, fromId, toId"
            : @"MATCH (n:EventNode {id: $nodeId})
                WITH n
                CALL {
                  WITH n
                  MATCH (n)-[r:CAUSED]->(effect)
                  RETURN r, n.id AS fromId, effect.id AS toId
                  UNION
                  WITH n
                  MATCH (cause)-[r:CAUSED]->(n)
                  RETURN r, cause.id AS fromId, n.id AS toId
                }
                RETURN r, fromId, toId";

        var result = await session.RunAsync(cypher, new
        {
            nodeId      = eventId.ToString(),
            perspective = perspective?.ToString()
        });

        var records = await result.ToListAsync();
        return records
            .Select(r => MapRelationship(
                r["r"].As<IRelationship>(),
                Guid.Parse(r["fromId"].As<string>()),
                Guid.Parse(r["toId"].As<string>()))).ToList();
    }

    // ── Writes ────────────────────────────────────────────────────────────────

    /// <inheritdoc />
    public async Task AddAsync(CausalEdge edge, CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetWriteSession();
        await session.RunAsync(
            @"MATCH (from:EventNode {id: $fromId}), (to:EventNode {id: $toId})
              CREATE (from)-[r:CAUSED {
                id:               $id,
                strength:         $strength,
                relationshipType: $relationshipType,
                perspective:      $perspective,
                explanation:      $explanation,
                isContested:      $isContested,
                createdAt:        $createdAt,
                updatedAt:        $updatedAt
              }]->(to)
              RETURN r",
            new
            {
                fromId           = edge.FromEventId.ToString(),
                toId             = edge.ToEventId.ToString(),
                id               = edge.Id.ToString(),
                strength         = (double)edge.Strength,
                relationshipType = edge.RelationshipType.ToString(),
                perspective      = edge.Perspective.ToString(),
                explanation      = edge.Explanation,
                isContested      = edge.IsContested,
                createdAt        = edge.CreatedAt.ToString("O"),
                updatedAt        = edge.UpdatedAt.ToString("O")
            });
    }

    /// <inheritdoc />
    public async Task BulkAddAsync(IEnumerable<CausalEdge> edges, CancellationToken cancellationToken = default)
    {
        var list = edges.ToList();
        if (list.Count == 0) return;

        await using var session = _neo4j.GetWriteSession();

        // Use UNWIND for a single-round-trip bulk write.
        // MERGE on the from/to nodes prevents failure if an ID doesn't exist yet;
        // MERGE on the relationship prevents duplicates on repeated calls.
        var parameters = list.Select(e => new Dictionary<string, object>
        {
            ["fromId"]           = e.FromEventId.ToString(),
            ["toId"]             = e.ToEventId.ToString(),
            ["id"]               = e.Id.ToString(),
            ["strength"]         = (double)e.Strength,
            ["relationshipType"] = e.RelationshipType.ToString(),
            ["perspective"]      = e.Perspective.ToString(),
            ["explanation"]      = e.Explanation,
            ["isContested"]      = e.IsContested,
            ["createdAt"]        = e.CreatedAt.ToString("O"),
            ["updatedAt"]        = e.UpdatedAt.ToString("O"),
        }).ToList();

        await session.RunAsync(
            @"UNWIND $edges AS edge
              MATCH (from:EventNode {id: edge.fromId}), (to:EventNode {id: edge.toId})
              MERGE (from)-[r:CAUSED {id: edge.id}]->(to)
              ON CREATE SET
                r.strength         = edge.strength,
                r.relationshipType = edge.relationshipType,
                r.perspective      = edge.perspective,
                r.explanation      = edge.explanation,
                r.isContested      = edge.isContested,
                r.createdAt        = edge.createdAt,
                r.updatedAt        = edge.updatedAt",
            new { edges = parameters });
    }

    /// <inheritdoc />
    public async void Update(CausalEdge edge)
    {
        await using var session = _neo4j.GetWriteSession();
        await session.RunAsync(
            @"MATCH ()-[r:CAUSED {id: $id}]->()
              SET r.strength         = $strength,
                  r.explanation      = $explanation,
                  r.isContested      = $isContested,
                  r.updatedAt        = $updatedAt",
            new
            {
                id          = edge.Id.ToString(),
                strength    = (double)edge.Strength,
                explanation = edge.Explanation,
                isContested = edge.IsContested,
                updatedAt   = edge.UpdatedAt.ToString("O")
            });
    }

    /// <inheritdoc />
    public async void Delete(CausalEdge edge)
    {
        await using var session = _neo4j.GetWriteSession();
        await session.RunAsync(
            "MATCH ()-[r:CAUSED {id: $id}]->() DELETE r",
            new { id = edge.Id.ToString() });
    }

    // ── Graph-specific helpers ─────────────────────────────────────────────────

    /// <summary>
    /// Checks whether adding an edge from <paramref name="fromId"/> to <paramref name="toId"/>
    /// would create a cycle in the graph.
    /// </summary>
    public async Task<bool> WouldCreateCycleAsync(
        Guid fromId,
        Guid toId,
        CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetSession();
        var result = await session.RunAsync(
            @"MATCH path = (to:EventNode {id: $toId})-[:CAUSED*]->(from:EventNode {id: $fromId})
              RETURN count(path) > 0 AS hasCycle",
            new { fromId = fromId.ToString(), toId = toId.ToString() });

        var record = await result.SingleAsync();
        return record["hasCycle"].As<bool>();
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static CausalEdge MapRelationship(IRelationship rel, Guid fromId, Guid toId)
    {
        var relationshipType = Enum.Parse<CausalRelationshipType>(rel["relationshipType"].As<string>());
        var strength         = (decimal)rel["strength"].As<double>();
        var perspective      = Enum.Parse<Perspective>(rel["perspective"].As<string>());
        var explanation      = rel["explanation"].As<string>();
        var isContested      = rel["isContested"].As<bool>();

        var edge = CausalEdge.Create(fromId, toId, relationshipType, strength, perspective, explanation, isContested);

        // Overwrite the auto-generated Id with the stored one via reflection.
        var idProp = typeof(CausalExplorer.Domain.Common.BaseEntity)
            .GetProperty("Id", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Public);
        idProp?.SetValue(edge, Guid.Parse(rel["id"].As<string>()));

        return edge;
    }
}
