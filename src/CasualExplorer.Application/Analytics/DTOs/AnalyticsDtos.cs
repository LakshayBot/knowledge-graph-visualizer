namespace CasualExplorer.Application.Analytics.DTOs;

/// <summary>Root analytics overview response.</summary>
public sealed record AnalyticsOverviewDto(
    CostTrendDto ApiCosts,
    IReadOnlyList<DailyRequestDto> DailyRequests,
    IReadOnlyList<TrafficCategoryDto> TrafficCategories,
    LatencyDto Latency,
    IReadOnlyList<TokenUsageDto> TokenUsage,
    IReadOnlyList<ModelHeatmapDto> ModelHeatmap,
    IReadOnlyList<ModelLatencyDto> ModelLatencies,
    IReadOnlyList<ModelTokenUsageDto> ModelTokenUsage
);

/// <summary>Cost trend with overall total + today vs yesterday comparison.</summary>
public sealed record CostTrendDto(
    string Label,
    decimal Overall,
    decimal Today,
    decimal Yesterday,
    decimal ChangePercent,
    bool IsPositive
);

/// <summary>Daily request count.</summary>
public sealed record DailyRequestDto(
    string Date,
    int Requests
);

/// <summary>Traffic by category (derived from endpoint).</summary>
public sealed record TrafficCategoryDto(
    string Category,
    int Requests,
    int Percentage
);

/// <summary>System latency metrics.</summary>
public sealed record LatencyDto(
    int AvgMs,
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

/// <summary>Per-model daily heatmap data.</summary>
public sealed record ModelHeatmapDto(
    string Model,
    IReadOnlyList<DailyModelScoreDto> DailyScores
);

/// <summary>Single day score for a model heatmap cell.</summary>
public sealed record DailyModelScoreDto(
    string Day,
    int Score
);

/// <summary>Per-model latency breakdown.</summary>
public sealed record ModelLatencyDto(
    string Model,
    int AvgMs,
    decimal UptimePercent,
    IReadOnlyList<LatencyPercentileDto> Percentiles
);

/// <summary>Per-model token usage over time.</summary>
public sealed record ModelTokenUsageDto(
    string Model,
    IReadOnlyList<TokenUsageDto> DailyUsage
);
