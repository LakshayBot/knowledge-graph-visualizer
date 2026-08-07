using Asp.Versioning;
using CasualExplorer.Application.Analytics.DTOs;
using CasualExplorer.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CasualExplorer.API.Controllers.v1;

/// <summary>
/// Provides aggregated usage metrics, cost trends, and performance analytics
/// derived from AI service prompt logs and operational data.
/// All aggregates are scoped to the authenticated user — a user only ever sees
/// metrics from their own account.
/// </summary>
[ApiVersion("1.0")]
[Authorize]
[EnableRateLimiting(RateLimitPolicies.Authenticated)]
public sealed class AnalyticsController : ApiControllerBase
{
    private readonly IAnalyticsService _analytics;
    private readonly ICurrentUserService _currentUser;

    /// <summary>Initialises the controller.</summary>
    public AnalyticsController(IAnalyticsService analytics, ICurrentUserService currentUser)
    {
        _analytics   = analytics;
        _currentUser = currentUser;
    }

    /// <summary>Returns the full analytics overview dashboard payload for the current user.</summary>
    [HttpGet("overview")]
    [ProducesResponseType(typeof(AnalyticsOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverview(
        CancellationToken cancellationToken = default)
    {
        var result = await _analytics.GetOverviewAsync(_currentUser.UserId, cancellationToken);
        return Ok(result);
    }
}
