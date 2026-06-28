using System.Security.Claims;
using Asp.Versioning;
using CasualExplorer.API.Extensions;
using CasualExplorer.Application.ApiKeys.Commands;
using CasualExplorer.Application.ApiKeys.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CasualExplorer.API.Controllers.v1;

/// <summary>
/// Manages per-user API keys for LLM providers (BYOK).
/// </summary>
[ApiVersion("1.0")]
[Authorize]
[EnableRateLimiting(RateLimitPolicies.Authenticated)]
public sealed class ApiKeysController : ApiControllerBase
{
    /// <summary>
    /// Returns the API key status for all supported providers for the current user.
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(ApiKeyListDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyKeys(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await Sender.Send(new GetApiKeysQuery(userId.Value), ct);
        return Ok(result);
    }

    /// <summary>
    /// Sets (adds or updates) the API key for a specific provider.
    /// The key is encrypted at rest and never returned in responses.
    /// </summary>
    [HttpPut("me")]
    [ProducesResponseType(typeof(ApiKeyStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetMyKey([FromBody] SetApiKeyRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await Sender.Send(
            new SetApiKeyCommand(userId.Value, request.Provider, request.ApiKey), ct);
        return Ok(result);
    }

    /// <summary>
    /// Removes the API key for a specific provider.
    /// </summary>
    [HttpDelete("me/{provider}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RemoveMyKey(string provider, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        await Sender.Send(new RemoveApiKeyCommand(userId.Value, provider), ct);
        return NoContent();
    }

    private Guid? GetUserId()
    {
        var value = User?.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? User?.FindFirstValue("sub");
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
