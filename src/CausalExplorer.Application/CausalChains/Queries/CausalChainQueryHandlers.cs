using System.Text.Json;
using CausalExplorer.Application.CausalChains.DTOs;
using CausalExplorer.Application.Common.Exceptions;
using CausalExplorer.Application.Common.Interfaces;
using CausalExplorer.Application.Common.Mappings;
using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Enums;
using CausalExplorer.Domain.Interfaces;
using MediatR;

namespace CausalExplorer.Application.CausalChains.Queries;

/// <summary>Handles <see cref="GetCausalChainQuery"/>.</summary>
public sealed class GetCausalChainQueryHandler : IRequestHandler<GetCausalChainQuery, CausalGraphDto>
{
    private readonly ICausalChainRepository _chainRepo;
    private readonly IEventNodeRepository _nodeRepo;
    private readonly ICausalEdgeRepository _edgeRepo;

    /// <summary>Initialises the handler.</summary>
    public GetCausalChainQueryHandler(
        ICausalChainRepository chainRepo,
        IEventNodeRepository nodeRepo,
        ICausalEdgeRepository edgeRepo)
    {
        _chainRepo = chainRepo;
        _nodeRepo  = nodeRepo;
        _edgeRepo  = edgeRepo;
    }

    /// <inheritdoc />
    public async Task<CausalGraphDto> Handle(
        GetCausalChainQuery request,
        CancellationToken cancellationToken)
    {
        var depth = Math.Clamp(request.Depth, 1, 6);

        var chain = await _chainRepo.GetByIdAsync(request.ChainId, cancellationToken)
            ?? throw new NotFoundException(nameof(CausalChain), request.ChainId);

        var visitedNodes = new Dictionary<Guid, EventNode>();
        var visitedEdges = new List<Domain.Entities.CausalEdge>();

        await BfsAsync(chain.RootEventId, depth, visitedNodes, visitedEdges,
            request.Perspective, cancellationToken);

        var graphNodes = BuildGraphNodes(visitedNodes);
        var graphEdges = visitedEdges.Select(BuildGraphEdge).ToList();

        var metadata = new ChainMetadataDto(
            chain.Id, chain.Title, chain.Domain.ToString(),
            chain.NodeCount, chain.ViewCount, chain.LastUpdatedAt);

        return new CausalGraphDto(graphNodes, graphEdges, metadata);
    }

    private async Task BfsAsync(
        Guid rootId,
        int depth,
        Dictionary<Guid, EventNode> visited,
        List<Domain.Entities.CausalEdge> edges,
        Domain.Enums.Perspective? perspective,
        CancellationToken ct)
    {
        var queue = new Queue<(Guid Id, int Level)>();
        queue.Enqueue((rootId, 0));

        while (queue.Count > 0)
        {
            var (nodeId, level) = queue.Dequeue();
            if (visited.ContainsKey(nodeId) || level > depth) continue;

            var node = await _nodeRepo.GetByIdAsync(nodeId, ct);
            if (node is null) continue;

            visited[nodeId] = node;

            if (level >= depth) continue;

            var nodeEdges = await _edgeRepo.GetByEventIdAsync(nodeId, perspective, ct);
            foreach (var edge in nodeEdges)
            {
                if (!edges.Any(e => e.Id == edge.Id))
                    edges.Add(edge);

                var nextId = edge.FromEventId == nodeId ? edge.ToEventId : edge.FromEventId;
                if (!visited.ContainsKey(nextId))
                    queue.Enqueue((nextId, level + 1));
            }
        }
    }

    private static List<GraphNodeDto> BuildGraphNodes(Dictionary<Guid, EventNode> nodes)
    {
        var list = new List<GraphNodeDto>();
        int i = 0;
        foreach (var node in nodes.Values)
        {
            // Simple radial layout placeholder — real layout computed by frontend
            var angle = i * (2 * Math.PI / Math.Max(nodes.Count, 1));
            var radius = i == 0 ? 0f : 300f;
            list.Add(new GraphNodeDto(
                node.Id, node.Title, node.Summary, node.Domain.ToString(),
                node.ConfidenceScore,
                node.GetConfidenceLevel().Kind.ToString(),
                X: (float)(radius * Math.Cos(angle)),
                Y: (float)(radius * Math.Sin(angle)),
                IsExpanded: true,
                HasMoreNodes: false));
            i++;
        }
        return list;
    }

    private static GraphEdgeDto BuildGraphEdge(Domain.Entities.CausalEdge edge) =>
        new(edge.Id, edge.FromEventId, edge.ToEventId,
            edge.Strength,
            edge.Strength switch { > 0.65m => "Solid", > 0.35m => "Dashed", _ => "Dotted" },
            edge.RelationshipType.ToString(),
            edge.Explanation,
            edge.IsContested,
            edge.Perspective.ToString());
}

/// <summary>Handles <see cref="ExpandChainNodeQuery"/>.</summary>
public sealed class ExpandChainNodeQueryHandler : IRequestHandler<ExpandChainNodeQuery, CausalGraphDto>
{
    private readonly IAIService _aiService;
    private readonly ICausalChainRepository _chainRepo;
    private readonly IEventNodeRepository _nodeRepo;
    private readonly ICausalEdgeRepository _edgeRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPostgresDataStore _pgStore;

    /// <summary>Initialises the handler.</summary>
    public ExpandChainNodeQueryHandler(
        IAIService aiService,
        ICausalChainRepository chainRepo,
        IEventNodeRepository nodeRepo,
        ICausalEdgeRepository edgeRepo,
        IUnitOfWork unitOfWork,
        IPostgresDataStore pgStore)
    {
        _aiService   = aiService;
        _chainRepo   = chainRepo;
        _nodeRepo    = nodeRepo;
        _edgeRepo    = edgeRepo;
        _unitOfWork  = unitOfWork;
        _pgStore     = pgStore;
    }

    /// <inheritdoc />
    public async Task<CausalGraphDto> Handle(
        ExpandChainNodeQuery request,
        CancellationToken cancellationToken)
    {
        var chain = await _chainRepo.GetByIdAsync(request.ChainId, cancellationToken)
            ?? throw new NotFoundException(nameof(CausalChain), request.ChainId);

        // Look up the node being expanded. If it's an AI-generated node (not persisted),
        // we won't find it in the DB — fall back to using the chain title (user's original question).
        var dbNode = await _nodeRepo.GetByIdAsync(request.NodeId, cancellationToken);
        var title   = chain.Title;                         // user's original question
        var summary = dbNode?.Summary ?? chain.Title;      // DB node context or fallback to question

        var expansion = await _aiService.ExpandChainNodeAsync(
            request.NodeId, title, summary, request.Perspective, cancellationToken);

        if (expansion.SuggestedNodes.Count == 0)
            return new CausalGraphDto([], [], new ChainMetadataDto(
                chain.Id, chain.Title, chain.Domain.ToString(),
                chain.NodeCount, chain.ViewCount, chain.LastUpdatedAt));

        // ── Persist AI-generated event nodes to Neo4j ───────────────
        var perspective = Enum.TryParse<Perspective>(request.Perspective, ignoreCase: true, out var p)
            ? p : Perspective.Mainstream;

        var persistedNodes = new List<EventNode>();
        foreach (var n in expansion.SuggestedNodes)
        {
            var eventNode = EventNode.Create(
                n.Title, n.Summary, DateTime.UtcNow, chain.Domain, 0.5m, 0.5m);
            persistedNodes.Add(eventNode);
        }
        await _nodeRepo.BulkAddAsync(persistedNodes, cancellationToken);

        // ── Dual-write to PostgreSQL ──────────────────────────────
        await _pgStore.BulkAddEventNodesAsync(persistedNodes, cancellationToken);

        // ── Write chain-node mappings for all new nodes ───────────
        var newNodeIds = persistedNodes.Select(n => n.Id).ToList();
        await _pgStore.AddChainNodeMappingsAsync(chain.Id, newNodeIds, cancellationToken);

        // ── Persist causal edges to Neo4j ──────────────────────────
        var persistedEdges = new List<CausalEdge>();
        for (int i = 0; i < expansion.SuggestedNodes.Count; i++)
        {
            var suggestion = expansion.SuggestedNodes[i];
            var newNodeId  = persistedNodes[i].Id;
            var isIncoming = suggestion.Direction?.Equals("incoming", StringComparison.OrdinalIgnoreCase) == true;
            var fromId = isIncoming ? newNodeId : request.NodeId;
            var toId   = isIncoming ? request.NodeId : newNodeId;
            var relType = MapRelationshipType(suggestion.RelationshipType);

            var edge = CausalEdge.Create(fromId, toId, relType, 0.5m, perspective,
                suggestion.Summary ?? "AI-generated suggestion", isContested: false);
            persistedEdges.Add(edge);
        }
        await _edgeRepo.BulkAddAsync(persistedEdges, cancellationToken);

        // ── Dual-write edges to PostgreSQL ────────────────────────
        await _pgStore.BulkAddCausalEdgesAsync(persistedEdges, cancellationToken);

        // ── Update chain metadata ──────────────────────────────────
        foreach (var _ in persistedNodes)
            chain.IncrementNodeCount();

        // ── Build and save complete graph snapshot to PostgreSQL ────
        // Include the root node + all existing chain nodes, not just new ones
        var allNodeIds = await _pgStore.GetChainNodeIdsAsync(chain.Id, cancellationToken);
        var allNodes = new List<EventNode>();
        foreach (var nid in allNodeIds)
        {
            var node = await _nodeRepo.GetByIdAsync(nid, cancellationToken);
            if (node is not null) allNodes.Add(node);
        }
        UpdateGraphSnapshot(chain, allNodes, persistedEdges);
        _chainRepo.Update(chain);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // ── Map to response DTOs — include root and persisted nodes ──
        // First add the root if it's not already in the list
        var rootNode = dbNode ?? await _nodeRepo.GetByIdAsync(chain.RootEventId, cancellationToken);
        if (rootNode is not null && !persistedNodes.Any(n => n.Id == rootNode.Id))
        {
            allNodes.Insert(0, rootNode);
        }

        var responseNodes = allNodes.Select((n, i) => new GraphNodeDto(
            n.Id, n.Title, n.Summary,
            n.Domain.ToString(), n.ConfidenceScore, n.GetConfidenceLevel().Kind.ToString(),
            X: (i + 1) * 200f, Y: 0f, IsExpanded: i == 0, HasMoreNodes: true))
            .ToList();

        var responseEdges = persistedEdges.Select(e => new GraphEdgeDto(
            e.Id, e.FromEventId, e.ToEventId,
            e.Strength,
            e.Strength switch { > 0.65m => "Solid", > 0.35m => "Dashed", _ => "Dotted" },
            e.RelationshipType.ToString(), e.Explanation, e.IsContested,
            e.Perspective.ToString()))
            .ToList();

        var metadata = new ChainMetadataDto(
            chain.Id, chain.Title, chain.Domain.ToString(),
            chain.NodeCount, chain.ViewCount, chain.LastUpdatedAt);

        return new CausalGraphDto(responseNodes, responseEdges, metadata);
    }

    private static CausalRelationshipType MapRelationshipType(string? type) => type?.ToUpperInvariant() switch
    {
        "CAUSES"         => CausalRelationshipType.DirectlyCaused,
        "CONTRIBUTES_TO" => CausalRelationshipType.ContributedTo,
        "ENABLES"        => CausalRelationshipType.EnabledConditionsFor,
        "PREVENTS"       => CausalRelationshipType.Contested,
        "CORRELATED"     => CausalRelationshipType.Correlated,
        _                => CausalRelationshipType.ContributedTo
    };

    private static void UpdateGraphSnapshot(
        CausalChain chain,
        IReadOnlyList<EventNode> allNodes,
        IReadOnlyList<Domain.Entities.CausalEdge> newEdges)
    {
        // Load existing edges from the current snapshot, merge with new edges
        using var existingDoc = string.IsNullOrWhiteSpace(chain.GraphSnapshot)
            ? JsonDocument.Parse("{\"nodes\":[],\"edges\":[]}")
            : JsonDocument.Parse(chain.GraphSnapshot!);

        var existingEdges = new List<(string id, string fromId, string toId, double strength, string explanation, string perspective, bool isContested, string relType)>();
        if (existingDoc.RootElement.TryGetProperty("edges", out var ee))
        {
            foreach (var e in ee.EnumerateArray())
            {
                existingEdges.Add((
                    e.GetProperty("id").GetString()!,
                    e.GetProperty("fromId").GetString()!,
                    e.GetProperty("toId").GetString()!,
                    e.GetProperty("strength").GetDouble(),
                    e.TryGetProperty("explanation", out var x) ? x.GetString() ?? "" : "",
                    e.TryGetProperty("perspective", out var ep) ? ep.GetString() ?? "" : "",
                    e.TryGetProperty("isContested", out var ic) && ic.GetBoolean(),
                    e.TryGetProperty("relationshipType", out var rt) ? rt.GetString() ?? "" : ""
                ));
            }
        }

        // Deduplicate — new edges override existing ones with same ID
        var seen = new HashSet<string>(existingEdges.Select(e => e.id));
        var mergedEdges = new List<(string id, string from, string to, double str, string expl, string persp, bool cont, string rt)>();
        mergedEdges.AddRange(existingEdges);

        foreach (var e in newEdges)
        {
            if (!seen.Contains(e.Id.ToString()))
            {
                mergedEdges.Add((
                    e.Id.ToString(), e.FromEventId.ToString(), e.ToEventId.ToString(),
                    (double)e.Strength, e.Explanation ?? "", e.Perspective.ToString(),
                    e.IsContested, e.RelationshipType.ToString()
                ));
                seen.Add(e.Id.ToString());
            }
        }

        // Build fresh snapshot from all nodes + merged edges
        using var ms = new System.IO.MemoryStream();
        using var writer = new Utf8JsonWriter(ms, new JsonWriterOptions { Indented = false });

        writer.WriteStartObject();

        writer.WriteStartArray("nodes");
        foreach (var n in allNodes)
        {
            writer.WriteStartObject();
            writer.WriteString("id", n.Id.ToString());
            writer.WriteString("title", n.Title);
            writer.WriteString("summary", n.Summary ?? "");
            writer.WriteString("eventDate", n.EventDate.ToString("O"));
            writer.WriteString("domain", n.Domain.ToString());
            writer.WriteNumber("confidenceScore", n.ConfidenceScore);
            writer.WriteEndObject();
        }
        writer.WriteEndArray();

        writer.WriteStartArray("edges");
        foreach (var (id, from, to, str, expl, persp, cont, rt) in mergedEdges)
        {
            writer.WriteStartObject();
            writer.WriteString("id", id);
            writer.WriteString("fromId", from);
            writer.WriteString("toId", to);
            writer.WriteNumber("strength", str);
            writer.WriteString("explanation", expl);
            writer.WriteString("perspective", persp);
            writer.WriteBoolean("isContested", cont);
            writer.WriteString("relationshipType", rt);
            writer.WriteEndObject();
        }
        writer.WriteEndArray();

        writer.WriteEndObject();
        writer.Flush();

        chain.SetGraphSnapshot(System.Text.Encoding.UTF8.GetString(ms.ToArray()));
    }
}

/// <summary>Handles <see cref="GetInitialChainQuery"/>.</summary>
public sealed class GetInitialChainQueryHandler : IRequestHandler<GetInitialChainQuery, CausalGraphDto>
{
    private readonly IEventNodeRepository _nodeRepo;
    private readonly ICausalChainRepository _chainRepo;
    private readonly ICausalEdgeRepository _edgeRepo;
    private readonly IUnitOfWork _unitOfWork;

    /// <summary>Initialises the handler.</summary>
    public GetInitialChainQueryHandler(
        IEventNodeRepository nodeRepo,
        ICausalChainRepository chainRepo,
        ICausalEdgeRepository edgeRepo,
        IUnitOfWork unitOfWork)
    {
        _nodeRepo    = nodeRepo;
        _chainRepo   = chainRepo;
        _edgeRepo    = edgeRepo;
        _unitOfWork = unitOfWork;
    }

    /// <inheritdoc />
    public async Task<CausalGraphDto> Handle(
        GetInitialChainQuery request,
        CancellationToken cancellationToken)
    {
        var chain = await _chainRepo.GetByIdAsync(request.ChainId, cancellationToken)
            ?? throw new NotFoundException(nameof(CausalChain), request.ChainId);

        chain.RecordView();
        _chainRepo.Update(chain);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var root = await _nodeRepo.GetByIdAsync(chain.RootEventId, cancellationToken)
            ?? throw new NotFoundException(nameof(EventNode), chain.RootEventId);

        var edges = await _edgeRepo.GetByEventIdAsync(
            chain.RootEventId, request.Perspective, cancellationToken);

        // Take at most 5 most significant edges (highest strength)
        var topEdges = edges.OrderByDescending(e => e.Strength).Take(5).ToList();

        var nodes = new Dictionary<Guid, EventNode> { [root.Id] = root };
        foreach (var edge in topEdges)
        {
            var otherId = edge.FromEventId == chain.RootEventId ? edge.ToEventId : edge.FromEventId;
            if (!nodes.ContainsKey(otherId))
            {
                var other = await _nodeRepo.GetByIdAsync(otherId, cancellationToken);
                if (other is not null) nodes[otherId] = other;
            }
        }

        var graphNodes = nodes.Values.Select((n, i) => new GraphNodeDto(
            n.Id, n.Title, n.Summary, n.Domain.ToString(),
            n.ConfidenceScore, n.GetConfidenceLevel().Kind.ToString(),
            X: i * 250f, Y: 0f, IsExpanded: true, HasMoreNodes: false)).ToList();

        var graphEdges = topEdges.Select(e => new GraphEdgeDto(
            e.Id, e.FromEventId, e.ToEventId,
            e.Strength,
            e.Strength switch { > 0.65m => "Solid", > 0.35m => "Dashed", _ => "Dotted" },
            e.RelationshipType.ToString(), e.Explanation, e.IsContested,
            e.Perspective.ToString())).ToList();

        var metadata = new ChainMetadataDto(
            Guid.Empty, $"Chain for {root.Title}", root.Domain.ToString(),
            nodes.Count, 0, DateTime.UtcNow);

        return new CausalGraphDto(graphNodes, graphEdges, metadata);
    }
}

/// <summary>Handles <see cref="GetUserSavedChainsQuery"/>.</summary>
public sealed class GetUserSavedChainsQueryHandler
    : IRequestHandler<GetUserSavedChainsQuery, IReadOnlyList<SavedChainDto>>
{
    private readonly IUserSavedChainRepository _savedChainRepo;
    private readonly ICausalChainRepository _chainRepo;

    /// <summary>Initialises the handler.</summary>
    public GetUserSavedChainsQueryHandler(
        IUserSavedChainRepository savedChainRepo,
        ICausalChainRepository chainRepo)
    {
        _savedChainRepo = savedChainRepo;
        _chainRepo      = chainRepo;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<SavedChainDto>> Handle(
        GetUserSavedChainsQuery request,
        CancellationToken cancellationToken)
    {
        var savedEntries = await _savedChainRepo.GetByUserIdAsync(request.UserId, cancellationToken);

        var result = new List<SavedChainDto>(savedEntries.Count);
        foreach (var entry in savedEntries)
        {
            var chain = await _chainRepo.GetByIdAsync(entry.ChainId, cancellationToken);
            if (chain is null) continue;

            result.Add(new SavedChainDto(
                entry.ChainId,
                chain.Title,
                chain.Domain.ToString(),
                chain.NodeCount,
                entry.SavedAt,
                entry.Notes));
        }

        return result;
    }
}

/// <summary>Handles <see cref="GetChainScopedGraphQuery"/> — reads the complete graph from PostgreSQL snapshot, bypassing Neo4j entirely.</summary>
public sealed class GetChainScopedGraphQueryHandler
    : IRequestHandler<GetChainScopedGraphQuery, CausalGraphDto>
{
    private readonly ICausalChainRepository _chainRepo;
    private readonly IEventNodeRepository _nodeRepo;
    private readonly ICausalEdgeRepository _edgeRepo;
    private readonly IPostgresDataStore _pgStore;

    public GetChainScopedGraphQueryHandler(
        ICausalChainRepository chainRepo,
        IEventNodeRepository nodeRepo,
        ICausalEdgeRepository edgeRepo,
        IPostgresDataStore pgStore)
    {
        _chainRepo = chainRepo;
        _nodeRepo  = nodeRepo;
        _edgeRepo  = edgeRepo;
        _pgStore   = pgStore;
    }

    public async Task<CausalGraphDto> Handle(
        GetChainScopedGraphQuery request,
        CancellationToken cancellationToken)
    {
        var chain = await _chainRepo.GetByIdAsync(request.ChainId, cancellationToken)
            ?? throw new NotFoundException(nameof(CausalChain), request.ChainId);

        var metadata = new ChainMetadataDto(
            chain.Id, chain.Title, chain.Domain.ToString(),
            chain.NodeCount, chain.ViewCount, chain.LastUpdatedAt);

        // Load chain-scoped node IDs from junction table
        var chainNodeIds = await _pgStore.GetChainNodeIdsAsync(chain.Id, cancellationToken);

        // Rebuild snapshot if null or incomplete (root missing)
        var rootIdStr = chain.RootEventId.ToString();
        var needsRebuild = string.IsNullOrWhiteSpace(chain.GraphSnapshot)
            || !chain.GraphSnapshot!.Contains(rootIdStr);

        if (needsRebuild && chainNodeIds.Count > 0)
        {
            var allNodes = new List<EventNode>();
            foreach (var nid in chainNodeIds)
            {
                var node = await _nodeRepo.GetByIdAsync(nid, cancellationToken);
                if (node is not null) allNodes.Add(node);
            }

            var nodeIdSet = new HashSet<Guid>(allNodes.Select(n => n.Id));
            var allEdges = new List<Domain.Entities.CausalEdge>();
            foreach (var nid in chainNodeIds)
            {
                var edgeList = await _edgeRepo.GetByEventIdAsync(nid, null, cancellationToken);
                foreach (var e in edgeList)
                {
                    if (nodeIdSet.Contains(e.FromEventId) && nodeIdSet.Contains(e.ToEventId)
                        && !allEdges.Any(ex => ex.Id == e.Id))
                        allEdges.Add(e);
                }
            }

            UpdateGraphSnapshotFromNodes(chain, allNodes, allEdges);
            _chainRepo.Update(chain);
        }

        if (string.IsNullOrWhiteSpace(chain.GraphSnapshot))
            return new CausalGraphDto([], [], metadata);

        using var doc = JsonDocument.Parse(chain.GraphSnapshot);
        var rootEl = doc.RootElement;

        var nodes = new List<GraphNodeDto>();
        if (rootEl.TryGetProperty("nodes", out var nodesArr))
        {
            int i = 0;
            foreach (var n in nodesArr.EnumerateArray())
            {
                var angle = i * (2 * Math.PI / Math.Max(nodesArr.GetArrayLength(), 1));
                var radius = i == 0 ? 0f : 300f;
                nodes.Add(new GraphNodeDto(
                    Guid.Parse(n.GetProperty("id").GetString()!),
                    n.GetProperty("title").GetString() ?? "",
                    n.TryGetProperty("summary", out var s) ? s.GetString() ?? "" : "",
                    n.TryGetProperty("domain", out var d) ? d.GetString() ?? "" : "",
                    n.TryGetProperty("confidenceScore", out var cs) ? (decimal)cs.GetDouble() : 0.5m,
                    "Debated",
                    X: (float)(radius * Math.Cos(angle)),
                    Y: (float)(radius * Math.Sin(angle)),
                    IsExpanded: true, HasMoreNodes: true));
                i++;
            }
        }

        var edges = new List<GraphEdgeDto>();
        if (rootEl.TryGetProperty("edges", out var edgesArr))
        {
            foreach (var e in edgesArr.EnumerateArray())
            {
                edges.Add(new GraphEdgeDto(
                    Guid.Parse(e.GetProperty("id").GetString()!),
                    Guid.Parse(e.GetProperty("fromId").GetString()!),
                    Guid.Parse(e.GetProperty("toId").GetString()!),
                    (decimal)e.GetProperty("strength").GetDouble(),
                    e.TryGetProperty("strength", out var st) && st.GetDouble() > 0.65 ? "Solid" : "Dashed",
                    e.TryGetProperty("relationshipType", out var rt) ? rt.GetString() ?? "RELATES_TO" : "RELATES_TO",
                    e.TryGetProperty("explanation", out var ex) ? ex.GetString() ?? "" : "",
                    e.TryGetProperty("isContested", out var ic) && ic.GetBoolean(),
                    e.TryGetProperty("perspective", out var ep) ? ep.GetString() ?? "" : ""));
            }
        }

        return new CausalGraphDto(nodes, edges, metadata);
    }

    private static void UpdateGraphSnapshotFromNodes(
        CausalChain chain,
        IReadOnlyList<EventNode> allNodes,
        IReadOnlyList<Domain.Entities.CausalEdge> allEdges)
    {
        using var ms = new System.IO.MemoryStream();
        using var w = new Utf8JsonWriter(ms, new JsonWriterOptions { Indented = false });
        w.WriteStartObject();
        w.WriteStartArray("nodes");
        foreach (var n in allNodes)
        {
            w.WriteStartObject();
            w.WriteString("id", n.Id.ToString());
            w.WriteString("title", n.Title);
            w.WriteString("summary", n.Summary ?? "");
            w.WriteString("eventDate", n.EventDate.ToString("O"));
            w.WriteString("domain", n.Domain.ToString());
            w.WriteNumber("confidenceScore", n.ConfidenceScore);
            w.WriteEndObject();
        }
        w.WriteEndArray();
        w.WriteStartArray("edges");
        foreach (var e in allEdges)
        {
            w.WriteStartObject();
            w.WriteString("id", e.Id.ToString());
            w.WriteString("fromId", e.FromEventId.ToString());
            w.WriteString("toId", e.ToEventId.ToString());
            w.WriteNumber("strength", e.Strength);
            w.WriteString("explanation", e.Explanation ?? "");
            w.WriteString("perspective", e.Perspective.ToString());
            w.WriteBoolean("isContested", e.IsContested);
            w.WriteString("relationshipType", e.RelationshipType.ToString());
            w.WriteEndObject();
        }
        w.WriteEndArray();
        w.WriteEndObject();
        w.Flush();
        chain.SetGraphSnapshot(System.Text.Encoding.UTF8.GetString(ms.ToArray()));
    }
}
