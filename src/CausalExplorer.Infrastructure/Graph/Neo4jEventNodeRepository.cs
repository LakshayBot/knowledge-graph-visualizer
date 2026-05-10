using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Enums;
using CausalExplorer.Domain.Interfaces;
using CausalExplorer.Domain.ValueObjects;
using Neo4j.Driver;

namespace CausalExplorer.Infrastructure.Graph;

/// <summary>
/// Neo4j Cypher implementation of <see cref="IEventNodeRepository"/>.
/// All event node data is stored as graph nodes with label <c>EventNode</c>.
/// </summary>
internal sealed class Neo4jEventNodeRepository : IEventNodeRepository
{
    private readonly Neo4jContext _neo4j;

    /// <summary>Initialises the repository with the shared Neo4j context.</summary>
    public Neo4jEventNodeRepository(Neo4jContext neo4j) => _neo4j = neo4j;

    // ── Queries ───────────────────────────────────────────────────────────────

    /// <inheritdoc />
    public async Task<EventNode?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetSession();
        var result = await session.RunAsync(
            "MATCH (n:EventNode {id: $id}) RETURN n",
            new { id = id.ToString() });

        var records = await result.ToListAsync();
        var record = records.FirstOrDefault();
        return record is null ? null : MapNode(record["n"].As<INode>());
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<EventNode>> GetPagedAsync(
        EventDomain? domain,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetSession();

        var cypher = domain.HasValue
            ? "MATCH (n:EventNode {domain: $domain}) RETURN n ORDER BY n.eventDate DESC SKIP $skip LIMIT $limit"
            : "MATCH (n:EventNode) RETURN n ORDER BY n.eventDate DESC SKIP $skip LIMIT $limit";

        var parameters = new Dictionary<string, object?>
        {
            ["domain"] = domain?.ToString(),
            ["skip"]   = (pageNumber - 1) * pageSize,
            ["limit"]  = pageSize
        };

        var result = await session.RunAsync(cypher, parameters);
        var records = await result.ToListAsync();
        return records.Select(r => MapNode(r["n"].As<INode>())).ToList();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<EventNode>> SearchAsync(
        string query,
        CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetSession();

        // Split into individual keywords (>3 chars) so natural-language queries
        // like "why are asian regions facing extreme heat" still find nodes whose
        // titles/summaries contain words like "heat", "asian", "extreme".
        var keywords = query
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => w.ToLowerInvariant())
            .Where(w => w.Length > 3)
            .Distinct()
            .ToList();

        // Fall back to treating the whole query as one keyword if nothing qualifies.
        if (keywords.Count == 0)
            keywords = [query.ToLowerInvariant()];

        var result = await session.RunAsync(
            @"MATCH (n:EventNode)
              WHERE ANY(kw IN $keywords WHERE
                    toLower(n.title)   CONTAINS kw
                 OR toLower(n.summary) CONTAINS kw)
              RETURN n
              ORDER BY n.createdAt DESC
              LIMIT 50",
            new { keywords });

        var records = await result.ToListAsync();
        return records.Select(r => MapNode(r["n"].As<INode>())).ToList();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<EventNode>> GetUnverifiedAsync(
        CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetSession();
        var result = await session.RunAsync(
            "MATCH (n:EventNode {isVerified: false}) RETURN n ORDER BY n.createdAt ASC");

        var records = await result.ToListAsync();
        return records.Select(r => MapNode(r["n"].As<INode>())).ToList();
    }

    /// <inheritdoc />
    public async Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetSession();
        var result = await session.RunAsync(
            "MATCH (n:EventNode {id: $id}) RETURN count(n) > 0 AS exists",
            new { id = id.ToString() });

        var record = await result.SingleAsync();
        return record["exists"].As<bool>();
    }

    // ── Writes ────────────────────────────────────────────────────────────────

    /// <inheritdoc />
    public async Task AddAsync(EventNode eventNode, CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetWriteSession();
        await session.RunAsync(
            @"CREATE (n:EventNode {
                id:              $id,
                title:           $title,
                summary:         $summary,
                eventDate:       $eventDate,
                domain:          $domain,
                confidenceScore: $confidenceScore,
                freshnessScore:  $freshnessScore,
                isVerified:      $isVerified,
                perspectives:    $perspectives,
                createdAt:       $createdAt,
                updatedAt:       $updatedAt
              })",
            new
            {
                id              = eventNode.Id.ToString(),
                title           = eventNode.Title,
                summary         = eventNode.Summary,
                eventDate       = eventNode.EventDate.ToString("O"),
                domain          = eventNode.Domain.ToString(),
                confidenceScore = (double)eventNode.ConfidenceScore,
                freshnessScore  = (double)eventNode.FreshnessScore,
                isVerified      = eventNode.IsVerified,
                perspectives    = eventNode.Perspectives.Select(p => p.ToString()).ToArray(),
                createdAt       = eventNode.CreatedAt.ToString("O"),
                updatedAt       = eventNode.UpdatedAt.ToString("O")
            });
    }

    /// <inheritdoc />
    public async Task BulkAddAsync(IEnumerable<EventNode> eventNodes, CancellationToken cancellationToken = default)
    {
        var list = eventNodes.ToList();
        if (list.Count == 0) return;

        await using var session = _neo4j.GetWriteSession();

        var parameters = list.Select(n => new Dictionary<string, object>
        {
            ["id"]              = n.Id.ToString(),
            ["title"]           = n.Title,
            ["summary"]         = n.Summary,
            ["eventDate"]       = n.EventDate.ToString("O"),
            ["domain"]          = n.Domain.ToString(),
            ["confidenceScore"] = (double)n.ConfidenceScore,
            ["freshnessScore"]  = (double)n.FreshnessScore,
            ["isVerified"]      = n.IsVerified,
            ["perspectives"]    = n.Perspectives.Select(p => p.ToString()).ToArray(),
            ["createdAt"]       = n.CreatedAt.ToString("O"),
            ["updatedAt"]       = n.UpdatedAt.ToString("O"),
        }).ToList();

        await session.RunAsync(
            @"UNWIND $nodes AS node
              MERGE (n:EventNode {id: node.id})
              ON CREATE SET
                n.title           = node.title,
                n.summary         = node.summary,
                n.eventDate       = node.eventDate,
                n.domain          = node.domain,
                n.confidenceScore = node.confidenceScore,
                n.freshnessScore  = node.freshnessScore,
                n.isVerified      = node.isVerified,
                n.perspectives    = node.perspectives,
                n.createdAt       = node.createdAt,
                n.updatedAt       = node.updatedAt",
            new { nodes = parameters });
    }

    /// <inheritdoc />
    public async Task UpdateAsync(EventNode eventNode, CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetWriteSession();
        await session.RunAsync(
            @"MATCH (n:EventNode {id: $id})
              SET n.title           = $title,
                  n.summary         = $summary,
                  n.eventDate       = $eventDate,
                  n.domain          = $domain,
                  n.confidenceScore = $confidenceScore,
                  n.freshnessScore  = $freshnessScore,
                  n.isVerified      = $isVerified,
                  n.perspectives    = $perspectives,
                  n.updatedAt       = $updatedAt",
            new
            {
                id              = eventNode.Id.ToString(),
                title           = eventNode.Title,
                summary         = eventNode.Summary,
                eventDate       = eventNode.EventDate.ToString("O"),
                domain          = eventNode.Domain.ToString(),
                confidenceScore = (double)eventNode.ConfidenceScore,
                freshnessScore  = (double)eventNode.FreshnessScore,
                isVerified      = eventNode.IsVerified,
                perspectives    = eventNode.Perspectives.Select(p => p.ToString()).ToArray(),
                updatedAt       = eventNode.UpdatedAt.ToString("O")
            });
    }

    /// <inheritdoc />
    public async Task DeleteAsync(EventNode eventNode, CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetWriteSession();
        await session.RunAsync(
            "MATCH (n:EventNode {id: $id}) DETACH DELETE n",
            new { id = eventNode.Id.ToString() });
    }

    // ── Graph-specific helpers ─────────────────────────────────────────────────

    /// <summary>
    /// Returns an initial set of 3–5 nodes rooted at <paramref name="rootId"/>,
    /// traversing up to 2 hops of CAUSED relationships.
    /// Requires the APOC library to be installed in Neo4j.
    /// </summary>
    public async Task<IReadOnlyList<EventNode>> GetInitialChainNodesAsync(
        Guid rootId,
        CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetSession();
        var result = await session.RunAsync(
            @"MATCH (root:EventNode {id: $rootId})
              CALL apoc.path.subgraphNodes(root, {
                  maxLevel: 2,
                  relationshipFilter: 'CAUSED>'
              })
              YIELD node
              RETURN node
              ORDER BY node.confidenceScore DESC
              LIMIT 5",
            new { rootId = rootId.ToString() });

        var records = await result.ToListAsync();
        return records.Select(r => MapNode(r["node"].As<INode>())).ToList();
    }

    /// <summary>
    /// Returns all nodes in a causal chain up to <paramref name="depth"/> hops from root,
    /// optionally filtered by perspective.
    /// </summary>
    public async Task<IReadOnlyList<EventNode>> GetChainWithDepthAsync(
        Guid rootId,
        int depth,
        string? perspective,
        CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetSession();

        var cypher = perspective is null
            ? @"MATCH path = (root:EventNode {id: $rootId})-[:CAUSED*1..$depth]->(effect:EventNode)
                RETURN nodes(path) AS nodes"
            : @"MATCH path = (root:EventNode {id: $rootId})-[:CAUSED*1..$depth]->(effect:EventNode)
                WHERE ANY(p IN effect.perspectives WHERE p = $perspective)
                RETURN nodes(path) AS nodes";

        var result = await session.RunAsync(cypher,
            new { rootId = rootId.ToString(), depth, perspective });

        var nodes = new HashSet<Guid>();
        var eventNodes = new List<EventNode>();

        await result.ForEachAsync(record =>
        {
            var nodeList = record["nodes"].As<List<INode>>();
            foreach (var n in nodeList)
            {
                var mapped = MapNode(n);
                if (nodes.Add(mapped.Id))
                    eventNodes.Add(mapped);
            }
        });

        return eventNodes;
    }

    /// <summary>
    /// Lazy-loads additional neighbours of <paramref name="nodeId"/>,
    /// excluding nodes whose IDs are in <paramref name="alreadyLoadedIds"/>.
    /// </summary>
    public async Task<IReadOnlyList<EventNode>> ExpandNodeAsync(
        Guid nodeId,
        IEnumerable<Guid> alreadyLoadedIds,
        CancellationToken cancellationToken = default)
    {
        await using var session = _neo4j.GetSession();
        var result = await session.RunAsync(
            @"MATCH (node:EventNode {id: $nodeId})-[:CAUSED]->(effect:EventNode)
              WHERE NOT effect.id IN $alreadyLoadedIds
              RETURN effect
              LIMIT 5",
            new
            {
                nodeId           = nodeId.ToString(),
                alreadyLoadedIds = alreadyLoadedIds.Select(id => id.ToString()).ToArray()
            });

        var records = await result.ToListAsync();
        return records.Select(r => MapNode(r["effect"].As<INode>())).ToList();
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static EventNode MapNode(INode node)
    {
        var id              = Guid.Parse(node["id"].As<string>());
        var title           = node["title"].As<string>();
        var summary         = node["summary"].As<string>();
        var eventDate       = DateTime.Parse(node["eventDate"].As<string>());
        var domainRaw       = NormaliseDomainString(node["domain"].As<string>());
        var domain          = Enum.Parse<EventDomain>(domainRaw, ignoreCase: true);
        var confidenceScore = node.Properties.TryGetValue("confidenceScore", out var cs)
            ? (decimal)cs.As<double>() : 0.5m;
        var freshnessScore  = node.Properties.TryGetValue("freshnessScore", out var fs)
            ? (decimal)fs.As<double>() : 0.5m;
        var isVerified      = node.Properties.TryGetValue("isVerified", out var iv)
            && iv.As<bool>();
        var createdAt       = node.Properties.TryGetValue("createdAt", out var ca)
            ? DateTime.Parse(ca.As<string>()).ToUniversalTime()
            : DateTime.UtcNow;

        // Build perspective list from seed data (may be stored as list or single string).
        var perspectives = new List<Perspective>();
        if (node.Properties.TryGetValue("perspectives", out var persp))
        {
            IEnumerable<string> perspStrings = persp switch
            {
                List<object> list => list.Select(p => p.ToString()!),
                string s          => s.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
                _                 => Array.Empty<string>()
            };
            foreach (var s in perspStrings)
                if (Enum.TryParse<Perspective>(s, out var p))
                    perspectives.Add(p);
        }
        else if (node.Properties.TryGetValue("perspective", out var singlePersp))
        {
            if (Enum.TryParse<Perspective>(singlePersp.As<string>(), out var p))
                perspectives.Add(p);
        }

        return EventNode.Reconstitute(
            id, title, summary, eventDate, domain,
            confidenceScore, freshnessScore, isVerified, createdAt, perspectives);
    }

    /// <summary>
    /// Normalises legacy/abbreviated domain strings stored in Neo4j seed data to
    /// match the current <see cref="EventDomain"/> enum names.
    /// e.g. "Economic" → "Economics", "Technological" → "Technology"
    /// </summary>
    private static string NormaliseDomainString(string raw) => raw switch
    {
        "Economic"     => nameof(EventDomain.Economics),
        "Technological"=> nameof(EventDomain.Technology),
        "Geopolitical" => nameof(EventDomain.Geopolitics),
        "Societal"     => nameof(EventDomain.Social),
        _              => raw
    };
}
