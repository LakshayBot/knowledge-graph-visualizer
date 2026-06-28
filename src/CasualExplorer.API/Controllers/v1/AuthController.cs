using Asp.Versioning;
using CasualExplorer.Application.Auth.Commands;
using CasualExplorer.Application.Auth.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CasualExplorer.API.Controllers.v1;

/// <summary>
/// Handles user registration, login, token refresh, and token revocation.
/// </summary>
[ApiVersion("1.0")]
[EnableRateLimiting(RateLimitPolicies.Anonymous)]
public sealed class AuthController : ApiControllerBase
{
    /// <summary>
    /// Registers a new user account and returns an initial token pair.
    /// </summary>
    /// <param name="command">Registration details.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="201">User registered. Returns access and refresh tokens.</response>
    /// <response code="400">Validation error or email already in use.</response>
    /// <response code="409">Email already registered.</response>
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResultDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await Sender.Send(command, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Authenticates a user and returns a JWT access token plus refresh token.
    /// </summary>
    /// <param name="command">Login credentials.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">Login successful. Returns token pair.</response>
    /// <response code="400">Invalid credentials.</response>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login(
        [FromBody] LoginCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await Sender.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Exchanges a valid refresh token for a new access/refresh token pair.
    /// </summary>
    /// <param name="command">The current refresh token.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">New token pair issued.</response>
    /// <response code="400">Refresh token invalid or expired.</response>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Refresh(
        [FromBody] RefreshTokenCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await Sender.Send(command, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Revokes a refresh token, preventing future use. Requires an authenticated session.
    /// </summary>
    /// <param name="command">The refresh token to revoke.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="204">Token revoked successfully.</response>
    /// <response code="400">Token not found or already revoked.</response>
    [HttpPost("revoke")]
    [Authorize]
    [EnableRateLimiting(RateLimitPolicies.Authenticated)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Revoke(
        [FromBody] RevokeTokenCommand command,
        CancellationToken cancellationToken = default)
    {
        await Sender.Send(command, cancellationToken);
        return NoContent();
    }
}
