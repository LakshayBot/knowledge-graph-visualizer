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
/// </summary>
[ApiVersion("1.0")]
[Authorize]
[EnableRateLimiting(RateLimitPolicies.Authenticated)]
public sealed class AnalyticsController : ApiControllerBase
{
    private readonly IAnalyticsService _analytics;

    /// <summary>Initialises the controller.</summary>
    public AnalyticsController(IAnalyticsService analytics)
        => _analytics = analytics;

    /// <summary>Returns the full analytics overview dashboard payload.</summary>
    [HttpGet("overview")]
    [ProducesResponseType(typeof(AnalyticsOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverview(
        CancellationToken cancellationToken = default)
    {
        var result = await _analytics.GetOverviewAsync(cancellationToken);
        return Ok(result);
    }
}
