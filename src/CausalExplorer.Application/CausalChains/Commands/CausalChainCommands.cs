using CausalExplorer.Application.CausalChains.DTOs;
using CausalExplorer.Domain.Enums;
using MediatR;

namespace CausalExplorer.Application.CausalChains.Commands;

/// <summary>Command to create a new named causal chain rooted at a given event node.</summary>
public sealed record CreateCausalChainCommand(
    string Title,
    Guid RootEventId,
    EventDomain Domain
) : IRequest<CausalChainSummaryDto>;

/// <summary>Command to save a causal chain to a user's personal library.</summary>
public sealed record SaveChainCommand(
    Guid UserId,
    Guid ChainId,
    string? Notes
) : IRequest<SavedChainDto>;
