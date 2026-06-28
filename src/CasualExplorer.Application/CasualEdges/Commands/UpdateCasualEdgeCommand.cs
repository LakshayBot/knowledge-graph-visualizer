using CasualExplorer.Application.CasualEdges.DTOs;
using MediatR;

namespace CasualExplorer.Application.CasualEdges.Commands;

/// <summary>Command to update the explanation, strength, or contested status of a casual edge.</summary>
public sealed record UpdateCasualEdgeCommand(
    Guid Id,
    string? Explanation,
    decimal? Strength,
    bool? IsContested
) : IRequest<CasualEdgeDto>;
