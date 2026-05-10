using Asp.Versioning;
using CausalExplorer.Application.CausalEdges.Commands;
using CausalExplorer.Application.CausalEdges.DTOs;
using CausalExplorer.Application.CausalEdges.Queries;
using CausalExplorer.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CausalExplorer.API.Controllers.v1;

/// <summary>
/// Operations for creating, querying, updating, and removing directed causal edges
/// between event nodes in the knowledge graph.
/// </summary>
[ApiVersion("1.0")]
[EnableRateLimiting(RateLimitPolicies.Authenticated)]
public sealed class CausalEdgesController : ApiControllerBase
{
    /// <summary>
    /// Returns all edges connected to a given node, optionally filtered by direction and perspective.
    /// </summary>
    /// <param name="nodeId">The event node GUID.</param>
    /// <param name="direction">Edge direction filter: Incoming, Outgoing, or Both (default).</param>
    /// <param name="perspective">Perspective filter (optional).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">List of edges with connected node summaries.</response>
    [HttpGet("node/{nodeId:guid}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Anonymous)]
    [ProducesResponseType(typeof(IReadOnlyList<EdgeWithNodeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEdgesForNode(
        Guid nodeId,
        [FromQuery] EdgeDirection direction  = EdgeDirection.Both,
        [FromQuery] Perspective? perspective = null,
        CancellationToken cancellationToken  = default)
    {
        var result = await Sender.Send(
            new GetEdgesForNodeQuery(nodeId, direction, perspective), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Returns all edges between two specific event nodes.
    /// </summary>
    /// <param name="fromId">Source event node GUID.</param>
    /// <param name="toId">Target event node GUID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">List of causal edges between the two nodes.</response>
    [HttpGet("between/{fromId:guid}/{toId:guid}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Anonymous)]
    [ProducesResponseType(typeof(IReadOnlyList<CausalEdgeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEdgesBetweenNodes(
        Guid fromId,
        Guid toId,
        CancellationToken cancellationToken = default)
    {
        var result = await Sender.Send(
            new GetEdgesBetweenNodesQuery(fromId, toId), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Adds a new directed causal edge between two event nodes.
    /// Requires Contributor, Moderator, or Admin role.
    /// </summary>
    /// <param name="command">Edge creation payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="201">Edge created. Returns the new causal edge DTO.</response>
    /// <response code="400">Validation error or cycle detected.</response>
    /// <response code="403">Insufficient role.</response>
    [HttpPost]
    [Authorize(Policy = "RequireContributor")]
    [ProducesResponseType(typeof(CausalEdgeDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> AddCausalEdge(
        [FromBody] AddCausalEdgeCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await Sender.Send(command, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Updates explanation, strength, or contested status of an existing causal edge.
    /// Requires Contributor, Moderator, or Admin role.
    /// </summary>
    /// <param name="id">The causal edge GUID.</param>
    /// <param name="command">Update payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">Updated causal edge DTO.</response>
    /// <response code="400">Validation error.</response>
    /// <response code="403">Insufficient role.</response>
    /// <response code="404">Edge not found.</response>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireContributor")]
    [ProducesResponseType(typeof(CausalEdgeDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCausalEdge(
        Guid id,
        [FromBody] UpdateCausalEdgeCommand command,
        CancellationToken cancellationToken = default)
    {
        if (id != command.Id)
            return BadRequest(new { error = "Route id and body id must match." });

        var result = await Sender.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Removes a causal edge from the graph.
    /// Requires Contributor, Moderator, or Admin role.
    /// </summary>
    /// <param name="id">The causal edge GUID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="204">Edge removed successfully.</response>
    /// <response code="403">Insufficient role.</response>
    /// <response code="404">Edge not found.</response>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "RequireContributor")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveCausalEdge(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await Sender.Send(new RemoveCausalEdgeCommand(id), cancellationToken);
        return NoContent();
    }
}
