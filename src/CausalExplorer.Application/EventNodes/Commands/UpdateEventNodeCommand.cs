using CausalExplorer.Application.EventNodes.DTOs;
using CausalExplorer.Domain.Enums;
using MediatR;

namespace CausalExplorer.Application.EventNodes.Commands;

/// <summary>Command to update the mutable fields of an existing event node.</summary>
public sealed record UpdateEventNodeCommand(
    Guid Id,
    string Title,
    string Summary,
    decimal ConfidenceScore,
    decimal FreshnessScore,
    IReadOnlyList<string> Perspectives,
    IReadOnlyList<CreateSourceRequest> Sources
) : IRequest<EventNodeDetailDto>;
