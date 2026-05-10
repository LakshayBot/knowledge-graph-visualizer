using CausalExplorer.Application.CausalEdges.DTOs;
using CausalExplorer.Domain.Enums;
using MediatR;

namespace CausalExplorer.Application.CausalEdges.Queries;

/// <summary>Direction filter for edge queries.</summary>
public enum EdgeDirection { Incoming, Outgoing, Both }

/// <summary>Returns all edges between two specific event nodes across all perspectives.</summary>
public sealed record GetEdgesBetweenNodesQuery(Guid NodeAId, Guid NodeBId)
    : IRequest<IReadOnlyList<CausalEdgeDto>>;

/// <summary>Returns all edges connected to a given node, optionally filtered by direction.</summary>
public sealed record GetEdgesForNodeQuery(
    Guid NodeId,
    EdgeDirection Direction = EdgeDirection.Both,
    Perspective? Perspective = null
) : IRequest<IReadOnlyList<EdgeWithNodeDto>>;
