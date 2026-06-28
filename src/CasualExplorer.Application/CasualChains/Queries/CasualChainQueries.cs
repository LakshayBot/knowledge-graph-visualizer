using CasualExplorer.Application.CasualChains.DTOs;
using CasualExplorer.Domain.Enums;
using MediatR;

namespace CasualExplorer.Application.CasualChains.Queries;

/// <summary>Retrieves the full graph structure for a casual chain, optionally filtered by perspective and depth.</summary>
public sealed record GetCasualChainQuery(
    Guid ChainId,
    Perspective? Perspective = null,
    int Depth = 3
) : IRequest<CasualGraphDto>;

/// <summary>Expands a node within a chain to suggest new connected nodes via the AI service.</summary>
public sealed record ExpandChainNodeQuery(
    Guid ChainId,
    Guid NodeId,
    string Perspective
) : IRequest<CasualGraphDto>;

/// <summary>Returns 3-5 most relevant cause/effect nodes for a first-render of an event's chain.</summary>
public sealed record GetInitialChainQuery(
    Guid ChainId,
    Perspective? Perspective = null
) : IRequest<CasualGraphDto>;

/// <summary>Returns a user's saved chains with metadata.</summary>
public sealed record GetUserSavedChainsQuery(Guid UserId) : IRequest<IReadOnlyList<SavedChainDto>>;

/// <summary>Returns only the nodes and edges scoped to a specific chain (via chain_nodes junction table).</summary>
public sealed record GetChainScopedGraphQuery(
    Guid ChainId,
    Perspective? Perspective = null
) : IRequest<CasualGraphDto>;
