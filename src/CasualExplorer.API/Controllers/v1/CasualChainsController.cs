using Asp.Versioning;
using CasualExplorer.Application.CasualChains.Commands;
using CasualExplorer.Application.CasualChains.DTOs;
using CasualExplorer.Application.CasualChains.Queries;
using CasualExplorer.Application.Common.Interfaces;
using CasualExplorer.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CasualExplorer.API.Controllers.v1;

/// <summary>
/// Operations for browsing, creating, expanding, and saving casual chains.
/// </summary>
[ApiVersion("1.0")]
[EnableRateLimiting(RateLimitPolicies.Authenticated)]
public sealed class CasualChainsController : ApiControllerBase
{
    private readonly ICurrentUserService _currentUser;

    /// <summary>Initialises the controller.</summary>
    public CasualChainsController(ICurrentUserService currentUser)
        => _currentUser = currentUser;

    /// <summary>
    /// Returns the full graph structure for a casual chain, optionally filtered by
    /// perspective and traversal depth.
    /// </summary>
    /// <param name="id">Chain GUID.</param>
    /// <param name="perspective">Perspective filter (optional).</param>
    /// <param name="depth">Maximum hop depth from root (default 3).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">Full graph DTO with nodes, edges, and chain metadata.</response>
    /// <response code="404">Chain not found.</response>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Anonymous)]
    [ProducesResponseType(typeof(CasualGraphDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCasualChain(
        Guid id,
        [FromQuery] Perspective? perspective = null,
        [FromQuery] int depth                = 3,
        CancellationToken cancellationToken  = default)
    {
        depth = Math.Clamp(depth, 1, 10);
        var result = await Sender.Send(
            new GetCasualChainQuery(id, perspective, depth), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Returns 3–5 most relevant initial nodes for a first-render of the chain
    /// (shallow, quick load).
    /// </summary>
    /// <param name="id">Chain GUID (used to resolve root event).</param>
    /// <param name="perspective">Perspective filter (optional).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">Compact initial graph DTO.</response>
    /// <response code="404">Chain not found.</response>
    [HttpGet("{id:guid}/initial")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Anonymous)]
    [ProducesResponseType(typeof(CasualGraphDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetInitialChain(
        Guid id,
        [FromQuery] Perspective? perspective = null,
        CancellationToken cancellationToken  = default)
    {
        var result = await Sender.Send(
            new GetInitialChainQuery(id, perspective), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Returns only the nodes and edges scoped to a specific chain (via chain_nodes junction table).
    /// Prevents cross-chain graph leakage when re-opening saved chains.
    /// </summary>
    /// <param name="id">Chain GUID.</param>
    /// <param name="perspective">Perspective filter (optional).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">Chain-scoped graph DTO.</response>
    /// <response code="404">Chain not found.</response>
    [HttpGet("{id:guid}/scoped")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Anonymous)]
    [ProducesResponseType(typeof(CasualGraphDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetChainScopedGraph(
        Guid id,
        [FromQuery] Perspective? perspective = null,
        CancellationToken cancellationToken = default)
    {
        var result = await Sender.Send(
            new GetChainScopedGraphQuery(id, perspective), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Creates a new named casual chain rooted at a given event node.
    /// Requires an authenticated user.
    /// </summary>
    /// <param name="command">Chain creation payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="201">Chain created. Returns chain summary DTO.</response>
    /// <response code="400">Validation error or root event not found.</response>
    [HttpPost]
    [Authorize(Policy = "RequireUser")]
    [ProducesResponseType(typeof(CasualChainSummaryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateCasualChain(
        [FromBody] CreateCasualChainCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await Sender.Send(command, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Expands a specific node within a chain by calling the AI service to suggest
    /// new connected nodes. This is an expensive AI operation — rate-limited to
    /// 10 requests/minute per user.
    /// </summary>
    /// <param name="chainId">The chain GUID.</param>
    /// <param name="nodeId">The node to expand.</param>
    /// <param name="perspective">Perspective to apply to the expansion (default: Economic).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">New nodes and edges to merge into the existing graph.</response>
    /// <response code="404">Chain or node not found.</response>
    /// <response code="429">Rate limit exceeded (AI endpoint).</response>
    /// <response code="502">AI service temporarily unavailable.</response>
    [HttpPost("{chainId:guid}/expand/{nodeId:guid}")]
    [Authorize]
    [EnableRateLimiting(RateLimitPolicies.AiExpensive)]
    [ProducesResponseType(typeof(CasualGraphDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> ExpandChainNode(
        Guid chainId,
        Guid nodeId,
        [FromQuery] string perspective      = "Economic",
        CancellationToken cancellationToken = default)
    {
        var result = await Sender.Send(
            new ExpandChainNodeQuery(chainId, nodeId, perspective), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Saves a casual chain to the current user's personal library.
    /// Requires an authenticated user.
    /// </summary>
    /// <param name="chainId">The chain GUID to save.</param>
    /// <param name="request">Optional notes to attach to the saved chain.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">Saved chain entry DTO.</response>
    /// <response code="404">Chain not found.</response>
    [HttpPost("{chainId:guid}/save")]
    [Authorize(Policy = "RequireUser")]
    [ProducesResponseType(typeof(SavedChainDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SaveChain(
        Guid chainId,
        [FromBody] SaveChainRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.UserId
            ?? throw new Application.Common.Exceptions.ForbiddenAccessException(
                "Authenticated user id could not be determined.");

        var result = await Sender.Send(
            new SaveChainCommand(userId, chainId, request.Notes), cancellationToken);
        return Ok(result);
    }
}

/// <summary>Request body for the save-chain endpoint.</summary>
public sealed record SaveChainRequest(string? Notes);
