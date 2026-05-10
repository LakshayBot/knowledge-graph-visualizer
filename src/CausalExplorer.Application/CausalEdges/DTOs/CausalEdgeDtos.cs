using CausalExplorer.Application.EventNodes.DTOs;

namespace CausalExplorer.Application.CausalEdges.DTOs;

/// <summary>Derived visual edge style based on causal strength.</summary>
public enum EdgeStyle { Solid, Dashed, Dotted }

/// <summary>Full DTO for a causal edge.</summary>
public sealed record CausalEdgeDto(
    Guid Id,
    Guid FromEventId,
    Guid ToEventId,
    decimal Strength,
    EdgeStyle EdgeStyle,
    string RelationshipType,
    string Perspective,
    string Explanation,
    bool IsContested,
    IReadOnlyList<SourceDto> Sources,
    DateTime CreatedAt,
    DateTime UpdatedAt);

/// <summary>
/// Edge DTO bundled with summary info for the connected node,
/// used in directional edge list queries.
/// </summary>
public sealed record EdgeWithNodeDto(
    CausalEdgeDto Edge,
    EventNodeSummaryDto ConnectedNode);
