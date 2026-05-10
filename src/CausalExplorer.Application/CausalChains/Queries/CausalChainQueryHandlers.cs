using CausalExplorer.Application.CausalChains.DTOs;
using CausalExplorer.Application.Common.Exceptions;
using CausalExplorer.Application.Common.Interfaces;
using CausalExplorer.Application.Common.Mappings;
using CausalExplorer.Domain.Entities;
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

    /// <summary>Initialises the handler.</summary>
    public ExpandChainNodeQueryHandler(
        IAIService aiService,
        ICausalChainRepository chainRepo,
        IEventNodeRepository nodeRepo)
    {
        _aiService = aiService;
        _chainRepo = chainRepo;
        _nodeRepo  = nodeRepo;
    }

    /// <inheritdoc />
    public async Task<CausalGraphDto> Handle(
        ExpandChainNodeQuery request,
        CancellationToken cancellationToken)
    {
        var chain = await _chainRepo.GetByIdAsync(request.ChainId, cancellationToken)
            ?? throw new NotFoundException(nameof(CausalChain), request.ChainId);

        var expansion = await _aiService.ExpandChainNodeAsync(
            request.NodeId, request.Perspective, cancellationToken);

        // Map AI suggestions to lightweight graph DTOs (not persisted yet — frontend decides)
        var newNodes = expansion.SuggestedNodes
            .Select((n, i) => new GraphNodeDto(
                Guid.NewGuid(), n.Title, n.Summary,
                chain.Domain.ToString(), 0.5m, "Debated",
                X: (i + 1) * 200f, Y: 0f, IsExpanded: false, HasMoreNodes: true))
            .ToList();

        var newEdges = newNodes
            .Select(n => new GraphEdgeDto(
                Guid.NewGuid(), request.NodeId, n.Id,
                0.5m, "Dashed", "Causes", "AI-generated suggestion",
                IsContested: false, request.Perspective))
            .ToList();

        var metadata = new ChainMetadataDto(
            chain.Id, chain.Title, chain.Domain.ToString(),
            chain.NodeCount, chain.ViewCount, chain.LastUpdatedAt);

        return new CausalGraphDto(newNodes, newEdges, metadata);
    }
}

/// <summary>Handles <see cref="GetInitialChainQuery"/>.</summary>
public sealed class GetInitialChainQueryHandler : IRequestHandler<GetInitialChainQuery, CausalGraphDto>
{
    private readonly IEventNodeRepository _nodeRepo;
    private readonly ICausalEdgeRepository _edgeRepo;

    /// <summary>Initialises the handler.</summary>
    public GetInitialChainQueryHandler(
        IEventNodeRepository nodeRepo,
        ICausalEdgeRepository edgeRepo)
    {
        _nodeRepo = nodeRepo;
        _edgeRepo = edgeRepo;
    }

    /// <inheritdoc />
    public async Task<CausalGraphDto> Handle(
        GetInitialChainQuery request,
        CancellationToken cancellationToken)
    {
        var root = await _nodeRepo.GetByIdAsync(request.EventId, cancellationToken)
            ?? throw new NotFoundException(nameof(EventNode), request.EventId);

        var edges = await _edgeRepo.GetByEventIdAsync(
            request.EventId, request.Perspective, cancellationToken);

        // Take at most 5 most significant edges (highest strength)
        var topEdges = edges.OrderByDescending(e => e.Strength).Take(5).ToList();

        var nodes = new Dictionary<Guid, EventNode> { [root.Id] = root };
        foreach (var edge in topEdges)
        {
            var otherId = edge.FromEventId == request.EventId ? edge.ToEventId : edge.FromEventId;
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
