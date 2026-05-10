using Asp.Versioning;
using CausalExplorer.Application.Auth.DTOs;
using CausalExplorer.Application.Auth.Queries;
using CausalExplorer.Application.CausalChains.DTOs;
using CausalExplorer.Application.CausalChains.Queries;
using CausalExplorer.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CausalExplorer.API.Controllers.v1;

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
    /// Returns all causal chains saved to the current user's personal library.
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
}
