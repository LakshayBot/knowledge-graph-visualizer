using CasualExplorer.Application.EventNodes.DTOs;
using CasualExplorer.Domain.Enums;
using MediatR;

namespace CasualExplorer.Application.EventNodes.Commands;

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
