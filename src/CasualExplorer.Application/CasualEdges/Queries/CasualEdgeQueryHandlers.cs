using CasualExplorer.Application.CasualEdges.DTOs;
using CasualExplorer.Application.Common.Mappings;
using CasualExplorer.Domain.Interfaces;
using MediatR;

namespace CasualExplorer.Application.CasualEdges.Queries;

/// <summary>Handles <see cref="GetEdgesBetweenNodesQuery"/>.</summary>
public sealed class GetEdgesBetweenNodesQueryHandler
    : IRequestHandler<GetEdgesBetweenNodesQuery, IReadOnlyList<CasualEdgeDto>>
{
    private readonly ICasualEdgeRepository _edgeRepo;

    /// <summary>Initialises the handler.</summary>
    public GetEdgesBetweenNodesQueryHandler(ICasualEdgeRepository edgeRepo)
    {
        _edgeRepo = edgeRepo;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<CasualEdgeDto>> Handle(
        GetEdgesBetweenNodesQuery request,
        CancellationToken cancellationToken)
    {
        var fromA = await _edgeRepo.GetByFromEventAsync(request.NodeAId, cancellationToken);
        var fromB = await _edgeRepo.GetByFromEventAsync(request.NodeBId, cancellationToken);

        var aToB = fromA.Where(e => e.ToEventId == request.NodeBId);
        var bToA = fromB.Where(e => e.ToEventId == request.NodeAId);

        return aToB.Concat(bToA).Select(e => e.ToDto()).ToList();
    }
}

/// <summary>Handles <see cref="GetEdgesForNodeQuery"/>.</summary>
public sealed class GetEdgesForNodeQueryHandler
    : IRequestHandler<GetEdgesForNodeQuery, IReadOnlyList<EdgeWithNodeDto>>
{
    private readonly ICasualEdgeRepository _edgeRepo;
    private readonly IEventNodeRepository _nodeRepo;

    /// <summary>Initialises the handler.</summary>
    public GetEdgesForNodeQueryHandler(
        ICasualEdgeRepository edgeRepo,
        IEventNodeRepository nodeRepo)
    {
        _edgeRepo = edgeRepo;
        _nodeRepo = nodeRepo;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<EdgeWithNodeDto>> Handle(
        GetEdgesForNodeQuery request,
        CancellationToken cancellationToken)
    {
        var all = await _edgeRepo.GetByEventIdAsync(
            request.NodeId, request.Perspective, cancellationToken);

        var filtered = request.Direction switch
        {
            EdgeDirection.Incoming => all.Where(e => e.ToEventId   == request.NodeId),
            EdgeDirection.Outgoing => all.Where(e => e.FromEventId == request.NodeId),
            _                      => all.AsEnumerable()
        };

        var result = new List<EdgeWithNodeDto>();
        foreach (var edge in filtered)
        {
            var connectedId = edge.FromEventId == request.NodeId
                ? edge.ToEventId
                : edge.FromEventId;

            var connectedNode = await _nodeRepo.GetByIdAsync(connectedId, cancellationToken);
            if (connectedNode is not null)
                result.Add(new EdgeWithNodeDto(edge.ToDto(), connectedNode.ToSummaryDto()));
        }

        return result;
    }
}
