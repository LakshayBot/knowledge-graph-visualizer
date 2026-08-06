using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CasualExplorer.Application.AI.Interfaces;
using CasualExplorer.Application.Common.Exceptions;
using CasualExplorer.Application.Common.Interfaces;
using CasualExplorer.Application.EventNodes.DTOs;
using Microsoft.Extensions.Logging;

namespace CasualExplorer.Infrastructure.AI;

/// <summary>
/// HTTP client adapter that calls the Python FastAPI AI sidecar to implement <see cref="IAIService"/>.
/// Forwards per-user API keys and provider/model selection via custom headers.
/// </summary>
public sealed class AIServiceClient : IAIService
{
    private readonly HttpClient _http;
    private readonly ILogger<AIServiceClient> _logger;
    private readonly IAiKeyContext _aiKeyContext;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy        = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>Initialises the client with the named <see cref="HttpClient"/> injected by DI.</summary>
    public AIServiceClient(HttpClient http, ILogger<AIServiceClient> logger, IAiKeyContext aiKeyContext)
    {
        _http         = http;
        _logger       = logger;
        _aiKeyContext = aiKeyContext;
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
    public async Task<CasualLinkResult> GenerateCasualLinkAsync(
        Guid fromEventId,
        Guid toEventId,
        CancellationToken ct = default)
    {
        var payload  = new { from_event_id = fromEventId, to_event_id = toEventId };
        var response = await PostAsync("/api/casual/generate", payload, ct);

        var result = await DeserialiseAsync<CasualLinkResponse>(response, ct);
        return new CasualLinkResult(result.Explanation, (decimal)result.Strength, result.IsContested);
    }

    /// <inheritdoc />
    public async Task<ChainExpansionResult> ExpandChainNodeAsync(
        Guid nodeId,
        string nodeTitle,
        string nodeSummary,
        string perspective,
        CancellationToken ct = default)
    {
        var payload  = new { node_id = nodeId, node_title = nodeTitle, node_summary = nodeSummary, perspective, already_loaded_ids = Array.Empty<Guid>() };
        var response = await PostAsync("/api/chain/expand", payload, ct);

        var result = await DeserialiseAsync<ChainExpansionResponse>(response, ct);

        var nodes = (result.SuggestedNodes ?? [])
            .Select(n => new ExpansionNode(n.Title, n.Summary, n.RelationshipType, n.Direction))
            .ToList();

        return new ChainExpansionResult(nodes, perspective, result.Provider ?? "", result.Model ?? "");
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

        // Forward per-user BYOK headers when configured
        if (_aiKeyContext.HasPerUserKey)
        {
            request.Headers.Add("X-User-Api-Key", _aiKeyContext.ApiKey);
        }
        if (!string.IsNullOrEmpty(_aiKeyContext.Provider))
        {
            request.Headers.Add("X-Provider", _aiKeyContext.Provider);
        }
        if (!string.IsNullOrEmpty(_aiKeyContext.Model))
        {
            request.Headers.Add("X-Model", _aiKeyContext.Model);
        }
        if (_aiKeyContext.UserId.HasValue)
        {
            request.Headers.Add("X-User-Id", _aiKeyContext.UserId.Value.ToString());
        }

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

    private sealed record CasualLinkResponse(
        string Explanation,
        double Strength,
        bool IsContested);

    private sealed record ChainExpansionResponse(
        List<ExpansionNodeResponse> SuggestedNodes,
        string Provider = "",
        string Model = "");

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

