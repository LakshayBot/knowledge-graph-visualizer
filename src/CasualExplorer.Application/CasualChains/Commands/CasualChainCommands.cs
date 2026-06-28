using CasualExplorer.Application.CasualChains.DTOs;
using CasualExplorer.Domain.Enums;
using MediatR;

namespace CasualExplorer.Application.CasualChains.Commands;

/// <summary>Command to create a new named casual chain rooted at a given event node.</summary>
public sealed record CreateCasualChainCommand(
    string Title,
    Guid RootEventId,
    EventDomain Domain
) : IRequest<CasualChainSummaryDto>;

/// <summary>Command to save a casual chain to a user's personal library.</summary>
public sealed record SaveChainCommand(
    Guid UserId,
    Guid ChainId,
    string? Notes
) : IRequest<SavedChainDto>;

/// <summary>Command to remove a saved chain from a user's history.</summary>
public sealed record RemoveSavedChainCommand(
    Guid UserId,
    Guid ChainId
) : IRequest;
