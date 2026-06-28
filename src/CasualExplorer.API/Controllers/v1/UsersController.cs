using Asp.Versioning;
using CasualExplorer.Application.Auth.Commands;
using CasualExplorer.Application.Auth.DTOs;
using CasualExplorer.Application.Auth.Queries;
using CasualExplorer.Application.CasualChains.Commands;
using CasualExplorer.Application.CasualChains.DTOs;
using CasualExplorer.Application.CasualChains.Queries;
using CasualExplorer.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CasualExplorer.API.Controllers.v1;

/// <summary>
/// User profile and saved-chain operations for the currently authenticated user.
/// </summary>
[ApiVersion("1.0")]
[Authorize]
[EnableRateLimiting(RateLimitPolicies.Authenticated)]
public sealed class UsersController : ApiControllerBase
{
    private readonly ICurrentUserService _currentUser;

    /// <summary>Initialises the controller.</summary>
    public UsersController(ICurrentUserService currentUser)
        => _currentUser = currentUser;

    /// <summary>
    /// Returns the profile of the currently authenticated user.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">The user's profile DTO.</response>
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCurrentUser(
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.UserId
            ?? throw new Application.Common.Exceptions.ForbiddenAccessException(
                "Authenticated user id could not be determined.");

        var result = await Sender.Send(new GetCurrentUserQuery(userId), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Returns all casual chains saved to the current user's personal library.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">List of saved chain DTOs, most recent first.</response>
    [HttpGet("me/chains")]
    [ProducesResponseType(typeof(IReadOnlyList<SavedChainDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMySavedChains(
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.UserId
            ?? throw new Application.Common.Exceptions.ForbiddenAccessException(
                "Authenticated user id could not be determined.");

        var result = await Sender.Send(
            new GetUserSavedChainsQuery(userId), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Updates the current user's profile. All fields are optional; only supplied values are changed.
    /// To change password, both CurrentPassword and NewPassword must be provided.
    /// </summary>
    /// <response code="200">Updated user profile DTO.</response>
    /// <response code="400">Validation failed.</response>
    /// <response code="403">Current password is incorrect.</response>
    [HttpPut("me")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateCurrentUser(
        [FromBody] UpdateUserCommand command,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.UserId
            ?? throw new Application.Common.Exceptions.ForbiddenAccessException(
                "Authenticated user id could not be determined.");

        var update = command with { UserId = userId };
        var result = await Sender.Send(update, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Removes a saved chain from the current user's history / personal library.
    /// </summary>
    /// <param name="chainId">The identifier of the saved chain to remove.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="204">Chain removed from history.</response>
    [HttpDelete("me/chains/{chainId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RemoveSavedChain(
        Guid chainId,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.UserId
            ?? throw new Application.Common.Exceptions.ForbiddenAccessException(
                "Authenticated user id could not be determined.");

        await Sender.Send(new RemoveSavedChainCommand(userId, chainId), cancellationToken);
        return NoContent();
    }
}
