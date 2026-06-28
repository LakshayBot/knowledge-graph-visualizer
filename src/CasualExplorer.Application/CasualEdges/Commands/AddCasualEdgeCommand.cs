using CasualExplorer.Application.CasualEdges.DTOs;
using CasualExplorer.Application.EventNodes.DTOs;
using CasualExplorer.Domain.Enums;
using MediatR;

namespace CasualExplorer.Application.CasualEdges.Commands;

/// <summary>Command to add a directed casual edge between two event nodes.</summary>
public sealed record AddCasualEdgeCommand(
    Guid FromEventId,
    Guid ToEventId,
    CasualRelationshipType RelationshipType,
    Perspective Perspective,
    decimal Strength,
    string? Explanation,       // nullable — AI generates if omitted
    bool IsContested,
    IReadOnlyList<CreateEdgeSourceRequest> Sources
) : IRequest<CasualEdgeDto>;

/// <summary>Source data embedded in edge commands.</summary>
public sealed record CreateEdgeSourceRequest(
    string Url,
    string Title,
    DateTime PublishedDate,
    decimal ReliabilityScore,
    SourceType SourceType);
