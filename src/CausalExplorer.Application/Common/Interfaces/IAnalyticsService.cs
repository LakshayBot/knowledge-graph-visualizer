using CausalExplorer.Application.Analytics.DTOs;

namespace CausalExplorer.Application.Common.Interfaces;

/// <summary>
/// Provides aggregated analytics and metrics derived from AI service usage data.
/// </summary>
public interface IAnalyticsService
{
    /// <summary>Returns the full analytics overview payload.</summary>
    Task<AnalyticsOverviewDto> GetOverviewAsync(CancellationToken ct = default);
}
