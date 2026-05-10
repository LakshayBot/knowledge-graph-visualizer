using CausalExplorer.Application.CausalEdges.DTOs;
using MediatR;

namespace CausalExplorer.Application.CausalEdges.Commands;

/// <summary>Command to update the explanation, strength, or contested status of a causal edge.</summary>
public sealed record UpdateCausalEdgeCommand(
    Guid Id,
    string? Explanation,
    decimal? Strength,
    bool? IsContested
) : IRequest<CausalEdgeDto>;
