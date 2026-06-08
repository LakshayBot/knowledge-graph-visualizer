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
        _chainRepo.Update(chain);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // ── Map to response DTOs with persisted IDs ────────────────
        var newNodes = persistedNodes.Select((n, i) => new GraphNodeDto(
            n.Id, n.Title, n.Summary,
            chain.Domain.ToString(), n.ConfidenceScore, "Debated",
            X: (i + 1) * 200f, Y: 0f, IsExpanded: false, HasMoreNodes: true))
            .ToList();

        var newEdges = persistedEdges.Select(e => new GraphEdgeDto(
            e.Id, e.FromEventId, e.ToEventId,
            e.Strength,
            e.Strength switch { > 0.65m => "Solid", > 0.35m => "Dashed", _ => "Dotted" },
            e.RelationshipType.ToString(), e.Explanation, e.IsContested,
            e.Perspective.ToString()))
            .ToList();

        var metadata = new ChainMetadataDto(
            chain.Id, chain.Title, chain.Domain.ToString(),
            chain.NodeCount, chain.ViewCount, chain.LastUpdatedAt);

        return new CausalGraphDto(newNodes, newEdges, metadata);
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

/// <summary>Handles <see cref="GetChainScopedGraphQuery"/> — loads only nodes/edges belonging to a specific chain.</summary>
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

        // Get chain-scoped node IDs from junction table
        var chainNodeIds = await _pgStore.GetChainNodeIdsAsync(chain.Id, cancellationToken);

        if (chainNodeIds.Count == 0)
        {
            // Fallback: just return the root node
            var root = await _nodeRepo.GetByIdAsync(chain.RootEventId, cancellationToken);
            if (root is null)
                return new CausalGraphDto([], [], new ChainMetadataDto(
                    chain.Id, chain.Title, chain.Domain.ToString(),
                    chain.NodeCount, chain.ViewCount, chain.LastUpdatedAt));

            var rootNode = new GraphNodeDto(
                root.Id, root.Title, root.Summary, root.Domain.ToString(),
                root.ConfidenceScore, root.GetConfidenceLevel().Kind.ToString(),
                X: 0f, Y: 0f, IsExpanded: true, HasMoreNodes: true);

            return new CausalGraphDto([rootNode], [], new ChainMetadataDto(
                chain.Id, chain.Title, chain.Domain.ToString(),
                chain.NodeCount, chain.ViewCount, chain.LastUpdatedAt));
        }

        // Load all chain-scoped nodes from Neo4j
        var nodes = new Dictionary<Guid, EventNode>();
        foreach (var nodeId in chainNodeIds)
        {
            var node = await _nodeRepo.GetByIdAsync(nodeId, cancellationToken);
            if (node is not null)
                nodes[nodeId] = node;
        }

        // Load edges between chain-scoped nodes
        var nodeIdSet = new HashSet<Guid>(nodes.Keys);
        var edges = new List<Domain.Entities.CausalEdge>();
        foreach (var nodeId in nodes.Keys)
        {
            var nodeEdges = await _edgeRepo.GetByEventIdAsync(nodeId, request.Perspective, cancellationToken);
            foreach (var edge in nodeEdges)
            {
                // Only include edges where BOTH endpoints are in this chain
                if (nodeIdSet.Contains(edge.FromEventId) && nodeIdSet.Contains(edge.ToEventId))
                {
                    if (!edges.Any(e => e.Id == edge.Id))
                        edges.Add(edge);
                }
            }
        }

        // Build graph DTOs
        var graphNodes = new List<GraphNodeDto>();
        int i = 0;
        foreach (var node in nodes.Values)
        {
            var angle = i * (2 * Math.PI / Math.Max(nodes.Count, 1));
            var radius = i == 0 ? 0f : 300f;
            graphNodes.Add(new GraphNodeDto(
                node.Id, node.Title, node.Summary, node.Domain.ToString(),
                node.ConfidenceScore, node.GetConfidenceLevel().Kind.ToString(),
                X: (float)(radius * Math.Cos(angle)),
                Y: (float)(radius * Math.Sin(angle)),
                IsExpanded: true, HasMoreNodes: true));
            i++;
        }

        var graphEdges = edges.Select(e => new GraphEdgeDto(
            e.Id, e.FromEventId, e.ToEventId,
            e.Strength,
            e.Strength switch { > 0.65m => "Solid", > 0.35m => "Dashed", _ => "Dotted" },
            e.RelationshipType.ToString(), e.Explanation, e.IsContested,
            e.Perspective.ToString())).ToList();

        var metadata = new ChainMetadataDto(
            chain.Id, chain.Title, chain.Domain.ToString(),
            chain.NodeCount, chain.ViewCount, chain.LastUpdatedAt);

        return new CausalGraphDto(graphNodes, graphEdges, metadata);
    }
}
