using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CausalExplorer.Application.Common.DTOs;
using CausalExplorer.Application.Common.Exceptions;
using CausalExplorer.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace CausalExplorer.Infrastructure.AI;

/// <summary>
/// Calls the Python AI sidecar's <c>POST /api/graph/generate</c> endpoint to produce
/// a Wikipedia-sourced, LLM-extracted causal knowledge graph for a given topic.
/// Uses an async job pattern: submits the job and polls <c>GET /api/graph/jobs/{id}</c>
/// until the result is ready, so the HTTP call never times out due to slow LLM inference.
/// Forwards per-user BYOK headers when configured via <see cref="IAiKeyContext"/>.
/// </summary>
public sealed class KnowledgeGraphGeneratorClient : IKnowledgeGraphGenerator
{
    private readonly HttpClient _http;
    private readonly ILogger<KnowledgeGraphGeneratorClient> _logger;
    private readonly IAiKeyContext _aiKeyContext;

    private static readonly TimeSpan PollInterval  = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan MaxWait        = TimeSpan.FromMinutes(15);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>Initialises the client with the typed <see cref="HttpClient"/> provided by DI.</summary>
    public KnowledgeGraphGeneratorClient(
        HttpClient http,
        ILogger<KnowledgeGraphGeneratorClient> logger,
        IAiKeyContext aiKeyContext)
    {
        _http         = http;
        _logger       = logger;
        _aiKeyContext = aiKeyContext;
    }

    /// <inheritdoc />
    public async Task<GeneratedGraphDto> GenerateAsync(string topic, CancellationToken ct = default)
    {
        _logger.LogInformation("KnowledgeGraphGenerator: submitting job for topic '{Topic}'", topic);

        var request = new { topic, max_articles = 3 };

        // ── Step 1: submit job ─────────────────────────────────────────────────
        HttpResponseMessage submitResponse;
        try
        {
            var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/api/graph/generate")
            {
                Content = JsonContent.Create(request, options: JsonOptions)
            };

            // Forward per-user BYOK headers
            if (_aiKeyContext.HasPerUserKey)
                httpRequest.Headers.Add("X-User-Api-Key", _aiKeyContext.ApiKey);
            if (!string.IsNullOrEmpty(_aiKeyContext.Provider))
                httpRequest.Headers.Add("X-Provider", _aiKeyContext.Provider);
            if (!string.IsNullOrEmpty(_aiKeyContext.Model))
                httpRequest.Headers.Add("X-Model", _aiKeyContext.Model);
            if (_aiKeyContext.UserId.HasValue)
                httpRequest.Headers.Add("X-User-Id", _aiKeyContext.UserId.Value.ToString());

            submitResponse = await _http.SendAsync(httpRequest, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "KnowledgeGraphGenerator: job submission HTTP call failed for topic '{Topic}'", topic);
            throw;
        }

        if (!submitResponse.IsSuccessStatusCode)
        {
            var body = await submitResponse.Content.ReadAsStringAsync(ct);
            _logger.LogError(
                "KnowledgeGraphGenerator: sidecar returned {Status} on submit for topic '{Topic}': {Body}",
                (int)submitResponse.StatusCode, topic, body);
            throw new AIServiceException(
                $"AI service returned {(int)submitResponse.StatusCode} for /api/graph/generate: {body}");
        }

        var submitted = await submitResponse.Content.ReadFromJsonAsync<RawJobSubmittedResponse>(JsonOptions, ct)
            ?? throw new AIServiceException("AI service returned empty job submission response for /api/graph/generate");

        _logger.LogInformation(
            "KnowledgeGraphGenerator: job {JobId} submitted (status={Status}) for topic '{Topic}'",
            submitted.JobId, submitted.Status, topic);

        // If the sidecar returned a cache hit it already marks status=done — skip polling loop.
        if (submitted.Status == "done")
        {
            // Poll once to get the result.
            return await PollUntilDoneAsync(submitted.JobId, topic, ct);
        }

        // ── Step 2: poll until done ────────────────────────────────────────────
        return await PollUntilDoneAsync(submitted.JobId, topic, ct);
    }

    private async Task<GeneratedGraphDto> PollUntilDoneAsync(
        string jobId,
        string topic,
        CancellationToken ct)
    {
        var deadline = DateTimeOffset.UtcNow.Add(MaxWait);

        while (DateTimeOffset.UtcNow < deadline)
        {
            ct.ThrowIfCancellationRequested();

            var pollResponse = await _http.GetAsync($"/api/graph/jobs/{jobId}", ct);

            if (!pollResponse.IsSuccessStatusCode)
            {
                var errBody = await pollResponse.Content.ReadAsStringAsync(ct);
                _logger.LogWarning(
                    "KnowledgeGraphGenerator: job poll returned {Status}: {Body}",
                    (int)pollResponse.StatusCode, errBody);
                await Task.Delay(PollInterval, ct);
                continue;
            }

            var status = await pollResponse.Content.ReadFromJsonAsync<RawJobStatusResponse>(JsonOptions, ct);
            if (status is null)
            {
                await Task.Delay(PollInterval, ct);
                continue;
            }

            _logger.LogDebug("KnowledgeGraphGenerator: job {JobId} status={Status}", jobId, status.Status);

            switch (status.Status)
            {
                case "done" when status.Result is not null:
                    _logger.LogInformation(
                        "KnowledgeGraphGenerator: job {JobId} done — {Events} events, {Edges} edges (cached={Cache})",
                        jobId, status.Result.Events.Count, status.Result.Edges.Count, status.Result.FromCache);
                    return MapToDto(status.Result);

                case "error":
                    throw new AIServiceException(
                        $"AI service graph generation failed: {status.Error ?? "unknown error"}");

                default:
                    // pending or running — wait and retry
                    await Task.Delay(PollInterval, ct);
                    break;
            }
        }

        throw new AIServiceException(
            $"AI service graph generation job {jobId} did not complete within {MaxWait.TotalMinutes} minutes.");
    }

    private static GeneratedGraphDto MapToDto(RawGenerateGraphResponse raw)
    {
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

    private sealed record RawJobSubmittedResponse(
        [property: JsonPropertyName("job_id")] string JobId,
        [property: JsonPropertyName("status")] string Status);

    private sealed record RawJobStatusResponse(
        [property: JsonPropertyName("job_id")] string JobId,
        [property: JsonPropertyName("status")] string Status,
        [property: JsonPropertyName("result")] RawGenerateGraphResponse? Result,
        [property: JsonPropertyName("error")]  string? Error);

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
