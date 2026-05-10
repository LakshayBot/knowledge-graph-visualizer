using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CausalExplorer.Application.Common.DTOs;
using CausalExplorer.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace CausalExplorer.Infrastructure.AI;

/// <summary>
/// Calls the Python AI sidecar's <c>POST /api/graph/generate</c> endpoint to produce
/// a Wikipedia-sourced, LLM-extracted causal knowledge graph for a given topic.
/// </summary>
public sealed class KnowledgeGraphGeneratorClient : IKnowledgeGraphGenerator
{
    private readonly HttpClient _http;
    private readonly ILogger<KnowledgeGraphGeneratorClient> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>Initialises the client with the typed <see cref="HttpClient"/> provided by DI.</summary>
    public KnowledgeGraphGeneratorClient(
        HttpClient http,
        ILogger<KnowledgeGraphGeneratorClient> logger)
    {
        _http   = http;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<GeneratedGraphDto> GenerateAsync(string topic, CancellationToken ct = default)
    {
        _logger.LogInformation("KnowledgeGraphGenerator: generating graph for topic '{Topic}'", topic);

        var request = new { topic, max_articles = 3 };

        HttpResponseMessage response;
        try
        {
            response = await _http.PostAsJsonAsync("/api/graph/generate", request, JsonOptions, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "KnowledgeGraphGenerator: HTTP call failed for topic '{Topic}'", topic);
            throw;
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError(
                "KnowledgeGraphGenerator: sidecar returned {Status} for topic '{Topic}': {Body}",
                (int)response.StatusCode, topic, body);
            throw new InvalidOperationException(
                $"AI service graph generation failed ({(int)response.StatusCode}): {body}");
        }

        var raw = await response.Content.ReadFromJsonAsync<RawGenerateGraphResponse>(JsonOptions, ct)
            ?? throw new InvalidOperationException("AI service returned an empty graph response.");

        _logger.LogInformation(
            "KnowledgeGraphGenerator: received {Events} events, {Edges} edges for topic '{Topic}' (cached={Cache})",
            raw.Events.Count, raw.Edges.Count, topic, raw.FromCache);

        var events = raw.Events.Select(e => new GeneratedEventDto(
            Id:              e.Id,
            Title:           e.Title,
            Summary:         e.Summary,
            EventDate:       e.EventDate,
            Domain:          e.Domain,
            ConfidenceScore: e.ConfidenceScore,
            FreshnessScore:  e.FreshnessScore,
            SourceUrl:       e.SourceUrl,
            SourceTitle:     e.SourceTitle)).ToList();

        var edges = raw.Edges.Select(ed => new GeneratedEdgeDto(
            FromEventId:      ed.FromEventId,
            ToEventId:        ed.ToEventId,
            RelationshipType: ed.RelationshipType,
            Strength:         ed.Strength,
            Perspective:      ed.Perspective,
            Explanation:      ed.Explanation,
            IsContested:      ed.IsContested)).ToList();

        return new GeneratedGraphDto(
            Topic:      raw.Topic,
            Events:     events,
            Edges:      edges,
            SourceUrls: raw.SourceUrls,
            FromCache:  raw.FromCache);
    }

    // ── Raw JSON DTOs (snake_case from Python) ────────────────────────────────

    private sealed record RawGenerateGraphResponse(
        [property: JsonPropertyName("topic")]       string Topic,
        [property: JsonPropertyName("events")]      List<RawEvent> Events,
        [property: JsonPropertyName("edges")]       List<RawEdge>  Edges,
        [property: JsonPropertyName("source_urls")] List<string>   SourceUrls,
        [property: JsonPropertyName("from_cache")]  bool           FromCache);

    private sealed record RawEvent(
        [property: JsonPropertyName("id")]               string Id,
        [property: JsonPropertyName("title")]            string Title,
        [property: JsonPropertyName("summary")]          string Summary,
        [property: JsonPropertyName("event_date")]       string EventDate,
        [property: JsonPropertyName("domain")]           string Domain,
        [property: JsonPropertyName("confidence_score")] double ConfidenceScore,
        [property: JsonPropertyName("freshness_score")]  double FreshnessScore,
        [property: JsonPropertyName("source_url")]       string SourceUrl,
        [property: JsonPropertyName("source_title")]     string SourceTitle);

    private sealed record RawEdge(
        [property: JsonPropertyName("from_event_id")]     string FromEventId,
        [property: JsonPropertyName("to_event_id")]       string ToEventId,
        [property: JsonPropertyName("relationship_type")] string RelationshipType,
        [property: JsonPropertyName("strength")]          double Strength,
        [property: JsonPropertyName("perspective")]        string Perspective,
        [property: JsonPropertyName("explanation")]        string Explanation,
        [property: JsonPropertyName("is_contested")]       bool   IsContested);
}
