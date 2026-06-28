using CasualExplorer.Application.EventNodes.DTOs;

namespace CasualExplorer.Application.CasualEdges.DTOs;

/// <summary>Derived visual edge style based on casual strength.</summary>
public enum EdgeStyle { Solid, Dashed, Dotted }

/// <summary>Full DTO for a casual edge.</summary>
public sealed record CasualEdgeDto(
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
    CasualEdgeDto Edge,
    EventNodeSummaryDto ConnectedNode);
