using CasualExplorer.Application.Analytics.DTOs;

namespace CasualExplorer.Application.Common.Interfaces;

/// <summary>
/// Provides aggregated analytics and metrics derived from AI service usage data.
/// </summary>
public interface IAnalyticsService
{
    /// <summary>
    /// Returns the analytics overview dashboard payload scoped to a single user.
    /// When <paramref name="userId"/> is null, only logs without an owner are included.
    /// </summary>
    Task<AnalyticsOverviewDto> GetOverviewAsync(Guid? userId, CancellationToken ct = default);
}
