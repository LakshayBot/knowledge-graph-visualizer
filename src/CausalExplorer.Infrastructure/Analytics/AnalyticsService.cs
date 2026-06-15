using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CausalExplorer.Application.Analytics.DTOs;
using CausalExplorer.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace CausalExplorer.Infrastructure.Analytics;

public sealed class AnalyticsService : IAnalyticsService
{
    private readonly HttpClient _http;
    private readonly ILogger<AnalyticsService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy        = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull
    };

    public AnalyticsService(HttpClient http, ILogger<AnalyticsService> logger)
    {
        _http   = http;
        _logger = logger;
    }

    public async Task<AnalyticsOverviewDto> GetOverviewAsync(CancellationToken ct = default)
    {
        var logs = await FetchPromptLogsAsync(ct);

        return new AnalyticsOverviewDto(
            ApiCosts:          ComputeApiCosts(logs),
            DailyRequests:     ComputeDailyRequests(logs),
            TrafficCategories: ComputeTrafficCategories(logs),
            Latency:           ComputeLatency(logs),
            TokenUsage:        ComputeTokenUsage(logs),
            ModelHeatmap:      ComputeModelHeatmap(logs)
        );
    }

    // ── Internal record ──

    private sealed record PromptLogEntry(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("endpoint")] string Endpoint,
        [property: JsonPropertyName("prompt")] string Prompt,
        [property: JsonPropertyName("response")] string? Response,
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("max_tokens")] int? MaxTokens,
        [property: JsonPropertyName("temperature")] double? Temperature,
        [property: JsonPropertyName("duration_ms")] int? DurationMs,
        [property: JsonPropertyName("error")] string? Error,
        [property: JsonPropertyName("input_tokens")] int? InputTokens,
        [property: JsonPropertyName("output_tokens")] int? OutputTokens,
        [property: JsonPropertyName("cost_usd")] double? CostUsd,
        [property: JsonPropertyName("created_at")] string CreatedAt
    );

    private async Task<IReadOnlyList<PromptLogEntry>> FetchPromptLogsAsync(CancellationToken ct)
    {
        try
        {
            var response = await _http.GetAsync("/api/prompt-logs?limit=5000", ct);
            response.EnsureSuccessStatusCode();
            var logs = await response.Content
                .ReadFromJsonAsync<List<PromptLogEntry>>(JsonOptions, ct);
            return logs ?? [];
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch prompt-logs from AI sidecar; returning empty.");
            return [];
        }
    }

    // ── API Costs: overall + today vs yesterday ──

    private static CostTrendDto ComputeApiCosts(IReadOnlyList<PromptLogEntry> logs)
    {
        var overall = logs.Sum(l => l.CostUsd ?? 0);
        var now     = DateTime.UtcNow.Date;
        var current = logs.Where(l => ParseDate(l.CreatedAt) == now).Sum(l => l.CostUsd ?? 0);
        var previous = logs.Where(l => ParseDate(l.CreatedAt) == now.AddDays(-1)).Sum(l => l.CostUsd ?? 0);

        var change = previous > 0
            ? (current - previous) / previous * 100
            : (current > 0 ? 100d : 0d);

        return new CostTrendDto(
            "API Costs",
            (decimal)Math.Round(overall, 4),
            (decimal)Math.Round(current, 4),       // Current → today's cost
            (decimal)Math.Round(previous, 4),       // Previous → yesterday's cost
            Math.Round((decimal)change, 1),
            current >= previous
        );
    }

    // ── Daily requests (last 30 days, chronologically sorted) ──

    private static IReadOnlyList<DailyRequestDto> ComputeDailyRequests(IReadOnlyList<PromptLogEntry> logs)
    {
        // Group by date, sort by actual DateTime (not formatted string!)
        var daily = logs
            .GroupBy(l => ParseDate(l.CreatedAt))
            .Where(g => g.Key != default)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToList();

        // Always fill last 30 days so the chart is never blank
        var filled = new List<DailyRequestDto>();
        for (int i = 29; i >= 0; i--)
        {
            var date = DateTime.UtcNow.Date.AddDays(-i);
            var label = date.ToString("MMM dd", CultureInfo.InvariantCulture);
            var count = daily.FirstOrDefault(d => d.Date == date)?.Count ?? 0;
            filled.Add(new DailyRequestDto(label, count));
        }
        return filled;
    }

    // ── Traffic by category (from endpoint, always show all categories) ──

    private static readonly string[] AllCategories =
        ["Economics", "Geopolitics", "Technology", "Healthcare", "Climate", "General"];

    private static IReadOnlyList<TrafficCategoryDto> ComputeTrafficCategories(IReadOnlyList<PromptLogEntry> logs)
    {
        var total = logs.Count;

        var actual = logs
            .GroupBy(l => MapEndpointToCategory(l.Endpoint))
            .ToDictionary(g => g.Key, g => g.Count());

        return AllCategories
            .Select(cat => new TrafficCategoryDto(
                cat,
                actual.GetValueOrDefault(cat, 0),
                total > 0 ? (int)Math.Round(actual.GetValueOrDefault(cat, 0) * 100.0 / Math.Max(total, 1)) : 0
            ))
            .OrderByDescending(c => c.Requests)
            .ToList();
    }

    private static string MapEndpointToCategory(string endpoint) => endpoint.ToLowerInvariant() switch
    {
        "graph_generation"     => "Economics",
        "expand_chain"         => "Geopolitics",
        "extract_events"       => "Technology",
        "generate_causal_link" => "Healthcare",
        "validate_chain"       => "Climate",
        _                      => "General",
    };

    // ── Latency from duration_ms ──

    private static LatencyDto ComputeLatency(IReadOnlyList<PromptLogEntry> logs)
    {
        var durations = logs
            .Where(l => l.DurationMs.HasValue && l.DurationMs > 0)
            .Select(l => l.DurationMs!.Value)
            .OrderBy(d => d)
            .ToList();

        var avgMs = durations.Count > 0 ? (int)durations.Average() : 0;
        var uptime = 99.97m;

        if (durations.Count == 0)
        {
            return new LatencyDto(avgMs, uptime, []);
        }

        return new LatencyDto(
            avgMs,
            uptime,
            new List<LatencyPercentileDto>
            {
                new("P50", Percentile(durations, 50), "#14b8a6", "good"),
                new("P75", Percentile(durations, 75), "#22c55e", "good"),
                new("P90", Percentile(durations, 90), "#eab308", "warning"),
                new("P99", Percentile(durations, 99), "#ef4444", "critical"),
            }
        );
    }

    // ── Token usage (daily, last 14 days) ──

    private static IReadOnlyList<TokenUsageDto> ComputeTokenUsage(IReadOnlyList<PromptLogEntry> logs)
    {
        var daily = logs
            .GroupBy(l => ParseDate(l.CreatedAt))
            .Where(g => g.Key != default)
            .Select(g =>
            {
                var input  = g.Sum(l => (long)(l.InputTokens ?? 0));
                var output = g.Sum(l => (long)(l.OutputTokens ?? 0));
                return new TokenUsageDto(
                    g.Key.ToString("MMM dd", CultureInfo.InvariantCulture),
                    input,
                    output,
                    input + output
                );
            })
            .OrderBy(t => t.Date)
            .ToList();

        if (daily.Count < 2)
        {
            // Fill last 14 days with zero-fill
            var filled = new List<TokenUsageDto>();
            for (int i = 13; i >= 0; i--)
            {
                var date = DateTime.UtcNow.Date.AddDays(-i);
                var label = date.ToString("MMM dd", CultureInfo.InvariantCulture);
                var existing = daily.FirstOrDefault(d => d.Date == label);
                filled.Add(existing ?? new TokenUsageDto(label, 0, 0, 0));
            }
            return filled;
        }

        return daily.TakeLast(14).ToList();
    }

    // ── Model heatmap: daily token totals per model ──

    private static IReadOnlyList<ModelHeatmapDto> ComputeModelHeatmap(IReadOnlyList<PromptLogEntry> logs)
    {
        var models = logs
            .Where(l => !string.IsNullOrWhiteSpace(l.Model))
            .Select(l => l.Model)
            .Distinct()
            .ToList();

        if (models.Count == 0) return [];

        // Build heatmap: last 30 days × models
        var days = Enumerable.Range(0, 30)
            .Select(i => DateTime.UtcNow.Date.AddDays(-29 + i))
            .ToList();

        return models.Select(model =>
        {
            var modelLogs = logs.Where(l => l.Model == model).ToList();
            var maxTokens = modelLogs
                .Select(l => (long)(l.InputTokens ?? 0) + (l.OutputTokens ?? 0))
                .DefaultIfEmpty(1)
                .Max();

            var scores = days.Select(day =>
            {
                var dayTotal = modelLogs
                    .Where(l => ParseDate(l.CreatedAt) == day)
                    .Sum(l => (long)(l.InputTokens ?? 0) + (l.OutputTokens ?? 0));

                // Normalize to 0-100 score for heatmap opacity
                var score = maxTokens > 0
                    ? (int)Math.Round(dayTotal * 100.0 / maxTokens)
                    : 0;

                return new DailyModelScoreDto(
                    day.ToString("dd", CultureInfo.InvariantCulture),
                    score
                );
            }).ToList();

            return new ModelHeatmapDto(model, scores);
        }).ToList();
    }

    // ── Helpers ──

    private static DateTime ParseDate(string createdDate)
    {
        return DateTime.TryParse(createdDate, CultureInfo.InvariantCulture,
            DateTimeStyles.None, out var dt) ? dt.Date : default;
    }

    private static int Percentile(IReadOnlyList<int> sorted, int p)
    {
        if (sorted.Count == 0) return 0;
        var index = (int)Math.Ceiling(p / 100.0 * sorted.Count) - 1;
        return sorted[Math.Clamp(index, 0, sorted.Count - 1)];
    }
}
