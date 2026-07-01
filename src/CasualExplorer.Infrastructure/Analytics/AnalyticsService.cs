using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CasualExplorer.Application.Analytics.DTOs;
using CasualExplorer.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace CasualExplorer.Infrastructure.Analytics;

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
        [property: JsonPropertyName("provider")] string? Provider,
        [property: JsonPropertyName("domain")] string? Domain,
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

    // ── Traffic by category (from prompt content) ──

    private static readonly string[] AllCategories =
        ["Economics", "Geopolitics", "Technology", "Healthcare", "Climate", "Military", "Social", "Cultural", "Environmental", "General"];

    private static IReadOnlyList<TrafficCategoryDto> ComputeTrafficCategories(IReadOnlyList<PromptLogEntry> logs)
    {
        var total = logs.Count;

        var actual = logs
            .GroupBy(l => ExtractDomainFromPrompt(l.Prompt))
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

    /// <summary>
    /// Extract the most likely domain category from the prompt text using keyword matching.
    /// Each category has a weighted keyword list; the category with the most keyword hits wins.
    /// Falls back to "General" when no keywords match.
    /// </summary>
    private static string ExtractDomainFromPrompt(string prompt)
    {
        if (string.IsNullOrWhiteSpace(prompt)) return "General";

        var lower = prompt.ToLowerInvariant();

        // Weighted keyword sets — order matters for tie-breaking (first match wins on equal score)
        var categories = new Dictionary<string, (string[] Keywords, int Priority)>
        {
            ["Economics"]      = (new[] { "economy", "economic", "trade", "finance", "financial", "market", "gdp", "recession", "inflation", "tariff", "sanction", "currency", "banking", "fiscal", "monetary" }, 1),
            ["Geopolitics"]    = (new[] { "geopolitic", "diplomacy", "diplomatic", "treaty", "alliance", "nato", "united nations", "cold war", "foreign policy", "international relation", "sovereignty", "brexit", "regime", "coup", "embassy" }, 2),
            ["Military"]       = (new[] { "war", "military", "battle", "invasion", "conflict", "troop", "navy", "army", "air force", "nuclear weapon", "missile", "airstrike", "ceasefire", "surrender", "insurgency", "guerrilla" }, 3),
            ["Technology"]     = (new[] { "technology", "tech", "ai", "artificial intelligence", "software", "computer", "internet", "digital", "cyber", "algorithm", "data", "automation", "robot", "blockchain", "quantum", "semiconductor", "silicon" }, 4),
            ["Healthcare"]     = (new[] { "health", "healthcare", "medical", "disease", "pandemic", "vaccine", "covid", "virus", "hospital", "drug", "pharma", "epidemic", "public health", "cancer", "treatment", "clinical" }, 5),
            ["Climate"]        = (new[] { "climate", "environment", "global warming", "carbon", "emission", "pollution", "renewable energy", "fossil fuel", "sustainability", "biodiversity", "ecosystem", "deforestation", "drought", "flood", "hurricane" }, 6),
            ["Social"]         = (new[] { "society", "social", "civil rights", "protest", "movement", "demographic", "inequality", "poverty", "education", "welfare", "immigration", "refugee", "human rights", "feminism", "lgbt", "discrimination" }, 7),
            ["Cultural"]       = (new[] { "culture", "cultural", "art", "music", "film", "literature", "religion", "religious", "philosophy", "heritage", "tradition", "language", "media", "entertainment", "sport" }, 8),
            ["Environmental"]  = (new[] { "environmental", "ecology", "ecological", "conservation", "wildlife", "species", "habitat", "ocean", "marine", "forest", "arctic", "antarctic", "natural resource", "extinction" }, 9),
        };

        string? best = null;
        var bestScore = 0;
        var bestPriority = int.MaxValue;

        foreach (var (cat, (keywords, priority)) in categories)
        {
            var score = keywords.Count(k => lower.Contains(k));
            if (score > bestScore || (score == bestScore && priority < bestPriority))
            {
                bestScore    = score;
                bestPriority = priority;
                best         = cat;
            }
        }

        return bestScore > 0 ? best! : "General";
    }

    // ── Latency from duration_ms ──

    private static LatencyDto ComputeLatency(IReadOnlyList<PromptLogEntry> logs)
    {
        var durations = logs
            .Where(l => l.DurationMs.HasValue && l.DurationMs > 0)
            .Select(l => l.DurationMs!.Value)
            .OrderBy(d => d)
            .ToList();

        var avgMs = durations.Count > 0 ? (int)durations.Average() : 0;

        // Compute real uptime from error rate (not hardcoded)
        var total  = logs.Count;
        var errors = logs.Count(l => !string.IsNullOrEmpty(l.Error));
        var uptime = total > 0
            ? Math.Round((total - errors) * 100.0m / total, 2)
            : 100.00m;

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
