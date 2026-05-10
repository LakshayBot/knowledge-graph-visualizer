using CausalExplorer.Application.EventNodes.DTOs;
using CausalExplorer.Domain.Enums;
using MediatR;

namespace CausalExplorer.Application.EventNodes.Commands;

/// <summary>Command to create a new event node in the knowledge graph.</summary>
public sealed record CreateEventNodeCommand(
    string Title,
    string Summary,
    DateTime EventDate,
    EventDomain Domain,
    decimal ConfidenceScore,
    decimal FreshnessScore,
    IReadOnlyList<string> Perspectives,
    IReadOnlyList<CreateSourceRequest> Sources
) : IRequest<EventNodeDetailDto>;

/// <summary>Embedded source data submitted with a create or update command.</summary>
public sealed record CreateSourceRequest(
    string Url,
    string Title,
    DateTime PublishedDate,
    decimal ReliabilityScore,
    SourceType SourceType);
