using CausalExplorer.Application.CausalChains.DTOs;
using CausalExplorer.Domain.Enums;
using MediatR;

namespace CausalExplorer.Application.CausalChains.Queries;

/// <summary>Retrieves the full graph structure for a causal chain, optionally filtered by perspective and depth.</summary>
public sealed record GetCausalChainQuery(
    Guid ChainId,
    Perspective? Perspective = null,
    int Depth = 3
) : IRequest<CausalGraphDto>;

/// <summary>Expands a node within a chain to suggest new connected nodes via the AI service.</summary>
public sealed record ExpandChainNodeQuery(
    Guid ChainId,
    Guid NodeId,
    string Perspective
) : IRequest<CausalGraphDto>;

/// <summary>Returns 3-5 most relevant cause/effect nodes for a first-render of an event's chain.</summary>
public sealed record GetInitialChainQuery(
    Guid ChainId,
    Perspective? Perspective = null
) : IRequest<CausalGraphDto>;

/// <summary>Returns a user's saved chains with metadata.</summary>
public sealed record GetUserSavedChainsQuery(Guid UserId) : IRequest<IReadOnlyList<SavedChainDto>>;

/// <summary>Returns only the nodes and edges scoped to a specific chain (via chain_nodes junction table).</summary>
public sealed record GetChainScopedGraphQuery(
    Guid ChainId,
    Perspective? Perspective = null
) : IRequest<CausalGraphDto>;
