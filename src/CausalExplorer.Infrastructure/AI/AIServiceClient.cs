using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CausalExplorer.Application.AI.Interfaces;
using CausalExplorer.Application.Common.Interfaces;
using CausalExplorer.Application.EventNodes.DTOs;
using Microsoft.Extensions.Logging;

namespace CausalExplorer.Infrastructure.AI;

/// <summary>
/// HTTP client adapter that calls the Python FastAPI AI sidecar to implement <see cref="IAIService"/>.
/// </summary>
public sealed class AIServiceClient : IAIService
{
    private readonly HttpClient _http;
    private readonly ILogger<AIServiceClient> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>Initialises the client with the named <see cref="HttpClient"/> injected by DI.</summary>
    public AIServiceClient(HttpClient http, ILogger<AIServiceClient> logger)
    {
        _http   = http;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ExtractedEventsResult> ExtractEventsFromTextAsync(
        string text,
        CancellationToken ct = default)
    {
        var payload  = new { text };
        var response = await PostAsync("/api/events/extract", payload, ct);

        var result = await DeserialiseAsync<ExtractEventsResponse>(response, ct);

        var events = result.Events.Select(e => new ExtractedEvent(
            e.Title, e.Summary,
            DateTime.Parse(e.EventDate),
            e.Domain)).ToList();

        return new ExtractedEventsResult(events, text);
    }

    /// <inheritdoc />
    public async Task<CausalLinkResult> GenerateCausalLinkAsync(
        Guid fromEventId,
        Guid toEventId,
        CancellationToken ct = default)
    {
        var payload  = new { from_event_id = fromEventId, to_event_id = toEventId };
        var response = await PostAsync("/api/causal/generate", payload, ct);

        var result = await DeserialiseAsync<CausalLinkResponse>(response, ct);
        return new CausalLinkResult(result.Explanation, (decimal)result.Strength, result.IsContested);
    }

    /// <inheritdoc />
    public async Task<ChainExpansionResult> ExpandChainNodeAsync(
        Guid nodeId,
        string perspective,
        CancellationToken ct = default)
    {
        var payload  = new { node_id = nodeId, perspective, already_loaded_ids = Array.Empty<Guid>() };
        var response = await PostAsync("/api/chain/expand", payload, ct);

        var result = await DeserialiseAsync<ChainExpansionResponse>(response, ct);

        var nodes = result.SuggestedNodes.Select(n =>
            new ExpansionNode(n.Title, n.Summary, n.RelationshipType, n.Direction)).ToList();

        return new ChainExpansionResult(nodes, perspective);
    }

    /// <inheritdoc />
    public async Task<List<EventNodeSummaryDto>> SearchSimilarEventsAsync(
        string query,
        int topK,
        CancellationToken ct = default)
    {
        var payload  = new { query, top_k = topK };
        var response = await PostAsync("/api/search/similar", payload, ct);

        var results = await DeserialiseAsync<List<SimilarEventResponse>>(response, ct);

        return results.Select(r => new EventNodeSummaryDto(
            r.EventId,
            r.Title,
            r.Summary,
            r.EventDate,
            r.Domain,
            r.ConfidenceScore,
            r.ConfidenceLevelLabel,
            r.IsVerified,
            r.CreatedAt)).ToList();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<HttpResponseMessage> PostAsync<T>(
        string endpoint,
        T payload,
        CancellationToken ct)
    {
        var correlationId = Guid.NewGuid().ToString();

        _logger.LogDebug(
            "AI service request {CorrelationId} → POST {Endpoint}",
            correlationId, endpoint);

        var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(payload, options: JsonOptions)
        };
        request.Headers.Add("X-Correlation-ID", correlationId);

        var response = await _http.SendAsync(request, ct);

        _logger.LogDebug(
            "AI service response {CorrelationId} ← {StatusCode}",
            correlationId, (int)response.StatusCode);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            throw new AIServiceException(
                $"AI service returned {(int)response.StatusCode} for {endpoint}: {body}");
        }

        return response;
    }

    private static async Task<T> DeserialiseAsync<T>(
        HttpResponseMessage response,
        CancellationToken ct)
    {
        var result = await response.Content.ReadFromJsonAsync<T>(JsonOptions, ct);
        return result ?? throw new AIServiceException("AI service returned an empty response body.");
    }

    // ── Response DTOs (private, not exposed outside this file) ────────────────

    private sealed record ExtractEventsResponse(List<ExtractedEventResponse> Events);

    private sealed record ExtractedEventResponse(
        string Title,
        string Summary,
        string EventDate,
        string Domain);

    private sealed record CausalLinkResponse(
        string Explanation,
        double Strength,
        bool IsContested);

    private sealed record ChainExpansionResponse(List<ExpansionNodeResponse> SuggestedNodes);

    private sealed record ExpansionNodeResponse(
        string Title,
        string Summary,
        string RelationshipType,
        string Direction);

    private sealed record SimilarEventResponse(
        Guid EventId,
        string Title,
        string Summary,
        string Domain,
        decimal ConfidenceScore,
        string ConfidenceLevelLabel,
        bool IsVerified,
        DateTime EventDate,
        DateTime CreatedAt);
}

/// <summary>
/// Exception thrown when the AI sidecar service returns a non-success response.
/// </summary>
public sealed class AIServiceException : Exception
{
    /// <summary>Initialises the exception with a descriptive message.</summary>
    public AIServiceException(string message) : base(message) { }

    /// <summary>Initialises the exception with a message and inner cause.</summary>
    public AIServiceException(string message, Exception inner) : base(message, inner) { }
}
