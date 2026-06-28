using Asp.Versioning;
using CasualExplorer.Application.Common.Interfaces;
using CasualExplorer.Application.EventNodes.Commands;
using CasualExplorer.Application.EventNodes.DTOs;
using CasualExplorer.Application.EventNodes.Queries;
using CasualExplorer.Application.Common.Models;
using CasualExplorer.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CasualExplorer.API.Controllers.v1;

/// <summary>
/// CRUD and search operations for event node resources in the knowledge graph.
/// </summary>
[ApiVersion("1.0")]
[EnableRateLimiting(RateLimitPolicies.Authenticated)]
public sealed class EventNodesController : ApiControllerBase
{
    private readonly ICurrentUserService _currentUser;

    /// <summary>Initialises the controller.</summary>
    public EventNodesController(ICurrentUserService currentUser)
        => _currentUser = currentUser;

    /// <summary>Returns a paged list of event nodes, with optional filters.</summary>
    /// <param name="domain">Filter by event domain (optional).</param>
    /// <param name="perspective">Filter by perspective (optional).</param>
    /// <param name="dateFrom">Filter events on or after this date (optional).</param>
    /// <param name="dateTo">Filter events on or before this date (optional).</param>
    /// <param name="page">1-based page number (default 1).</param>
    /// <param name="pageSize">Items per page, max 100 (default 20).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">Paged list of event nodes.</response>
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Anonymous)]
    [ProducesResponseType(typeof(PagedResult<EventNodeSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEventNodes(
        [FromQuery] EventDomain? domain,
        [FromQuery] Perspective? perspective,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        var result = await Sender.Send(
            new GetEventNodesPagedQuery(domain, perspective, dateFrom, dateTo, page, pageSize),
            cancellationToken);
        return Ok(result);
    }

    /// <summary>Returns a single event node by its unique identifier.</summary>
    /// <param name="id">The event node GUID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">The requested event node with edge counts.</response>
    /// <response code="404">Event node not found.</response>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Anonymous)]
    [ProducesResponseType(typeof(EventNodeDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEventNodeById(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var result = await Sender.Send(new GetEventNodeByIdQuery(id), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Full-text search over event node titles and summaries.
    /// </summary>
    /// <param name="q">Search term (min 2 characters).</param>
    /// <param name="page">Page number (default 1).</param>
    /// <param name="pageSize">Results per page (default 20).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">Matching event nodes.</response>
    /// <response code="400">Search term is missing or too short.</response>
    [HttpGet("search")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Anonymous)]
    [ProducesResponseType(typeof(PagedResult<EventNodeSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search(
        [FromQuery] string q,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return BadRequest(new { error = "Search term must be at least 2 characters." });

        pageSize = Math.Clamp(pageSize, 1, 100);
        var result = await Sender.Send(
            new SearchEventNodesQuery(q, page, pageSize), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Semantic (vector) search over event nodes using natural-language queries.
    /// Uses embeddings + Qdrant to find conceptually similar events even when
    /// exact keywords do not match.
    /// </summary>
    /// <param name="q">Natural-language query (e.g. "why did the US impose tariffs on China").</param>
    /// <param name="topK">Maximum number of results to return (default 10, max 50).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">Semantically similar event nodes ranked by relevance.</response>
    /// <response code="400">Query is missing or too short.</response>
    [HttpGet("semantic-search")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Anonymous)]
    [ProducesResponseType(typeof(IReadOnlyList<EventNodeSummaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SemanticSearch(
        [FromQuery] string q,
        [FromQuery] int topK = 10,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return BadRequest(new { error = "Query must be at least 2 characters." });

        topK = Math.Clamp(topK, 1, 50);
        var result = await Sender.Send(new SearchSimilarEventNodesQuery(q, topK), cancellationToken);
        return Ok(result);
    }
    /// <param name="command">Event node creation payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="201">Event node created. Location header points to the new resource.</response>
    /// <response code="400">Validation error.</response>
    /// <response code="403">Insufficient role.</response>
    [HttpPost]
    [Authorize(Policy = "RequireContributor")]
    [ProducesResponseType(typeof(EventNodeDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateEventNode(
        [FromBody] CreateEventNodeCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await Sender.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetEventNodeById), new { id = result.Id }, result);
    }

    /// <summary>
    /// Updates the mutable fields of an existing event node.
    /// Requires Contributor, Moderator, or Admin role.
    /// </summary>
    /// <param name="id">The event node GUID.</param>
    /// <param name="command">Update payload.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">Updated event node.</response>
    /// <response code="400">Validation error.</response>
    /// <response code="403">Insufficient role.</response>
    /// <response code="404">Event node not found.</response>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "RequireContributor")]
    [ProducesResponseType(typeof(EventNodeDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateEventNode(
        Guid id,
        [FromBody] UpdateEventNodeCommand command,
        CancellationToken cancellationToken = default)
    {
        if (id != command.Id)
            return BadRequest(new { error = "Route id and body id must match." });

        var result = await Sender.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Permanently deletes an event node and detaches all its graph edges.
    /// Requires Moderator or Admin role.
    /// </summary>
    /// <param name="id">The event node GUID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="204">Deleted successfully.</response>
    /// <response code="403">Insufficient role.</response>
    /// <response code="404">Event node not found.</response>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "RequireModeratorOrAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteEventNode(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await Sender.Send(new DeleteEventNodeCommand(id), cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Marks an event node as verified by a moderator or admin.
    /// Requires Moderator or Admin role.
    /// </summary>
    /// <param name="id">The event node GUID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">Verified event node detail.</response>
    /// <response code="403">Insufficient role.</response>
    /// <response code="404">Event node not found.</response>
    [HttpPost("{id:guid}/verify")]
    [Authorize(Policy = "RequireModeratorOrAdmin")]
    [ProducesResponseType(typeof(EventNodeDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> VerifyEventNode(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.UserId
            ?? throw new Application.Common.Exceptions.ForbiddenAccessException(
                "Authenticated user id could not be determined.");

        var result = await Sender.Send(
            new VerifyEventNodeCommand(id, userId), cancellationToken);
        return Ok(result);
    }
}
