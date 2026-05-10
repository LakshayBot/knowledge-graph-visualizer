using CausalExplorer.Application.CausalEdges.DTOs;
using CausalExplorer.Application.EventNodes.DTOs;
using CausalExplorer.Domain.Enums;
using MediatR;

namespace CausalExplorer.Application.CausalEdges.Commands;

/// <summary>Command to add a directed causal edge between two event nodes.</summary>
public sealed record AddCausalEdgeCommand(
    Guid FromEventId,
    Guid ToEventId,
    CausalRelationshipType RelationshipType,
    Perspective Perspective,
    decimal Strength,
    string? Explanation,       // nullable — AI generates if omitted
    bool IsContested,
    IReadOnlyList<CreateEdgeSourceRequest> Sources
) : IRequest<CausalEdgeDto>;

/// <summary>Source data embedded in edge commands.</summary>
public sealed record CreateEdgeSourceRequest(
    string Url,
    string Title,
    DateTime PublishedDate,
    decimal ReliabilityScore,
    SourceType SourceType);
