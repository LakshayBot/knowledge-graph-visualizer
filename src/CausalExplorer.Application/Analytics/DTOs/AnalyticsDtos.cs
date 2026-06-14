namespace CausalExplorer.Application.Analytics.DTOs;

/// <summary>Root analytics overview response.</summary>
public sealed record AnalyticsOverviewDto(
    CostTrendDto ApiCosts,
    CostTrendDto InfrastructureCosts,
    IReadOnlyList<MonthlyRequestDto> MonthlyRequests,
    IReadOnlyList<TrafficLocationDto> TrafficLocations,
    LatencyDto Latency,
    IReadOnlyList<TokenUsageDto> TokenUsage,
    IReadOnlyList<ModelPerformanceDto> ModelPerformance
);

/// <summary>Cost trend with current vs previous period.</summary>
public sealed record CostTrendDto(
    string Label,
    decimal Current,
    decimal Previous,
    decimal ChangePercent,
    bool IsPositive
);

/// <summary>Monthly request count.</summary>
public sealed record MonthlyRequestDto(
    string Month,
    int Requests
);

/// <summary>Traffic by geographic location.</summary>
public sealed record TrafficLocationDto(
    string Country,
    string Flag,
    int Requests,
    int Percentage
);

/// <summary>Latency percentiles.</summary>
public sealed record LatencyDto(
    decimal TotalCost,
    decimal UptimePercent,
    IReadOnlyList<LatencyPercentileDto> Percentiles
);

/// <summary>Single latency percentile value.</summary>
public sealed record LatencyPercentileDto(
    string Label,
    int ValueMs,
    string Color,
    string Status
);

/// <summary>Daily token usage.</summary>
public sealed record TokenUsageDto(
    string Date,
    long Input,
    long Output,
    long Total
);

/// <summary>Per-model performance metrics.</summary>
public sealed record ModelPerformanceDto(
    string Model,
    IReadOnlyList<MonthlyModelScoreDto> MonthlyScores
);

/// <summary>Single month score for a model.</summary>
public sealed record MonthlyModelScoreDto(
    string Month,
    int Score
);
