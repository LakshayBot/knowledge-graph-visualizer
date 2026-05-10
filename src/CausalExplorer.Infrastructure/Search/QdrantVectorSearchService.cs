using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CausalExplorer.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace CausalExplorer.Infrastructure.Search;

/// <summary>
/// Implements <see cref="IVectorSearchService"/> by talking directly to the
/// Qdrant REST API via <see cref="HttpClient"/>.
/// Collection name: <c>causal_events</c>.
/// </summary>
public sealed class QdrantVectorSearchService : IVectorSearchService
{
    private const string Collection = "causal_events";

    private readonly HttpClient _http;
    private readonly IEmbeddingService _embeddings;
    private readonly ILogger<QdrantVectorSearchService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>Initialises the service with its HTTP client and embedding service.</summary>
    public QdrantVectorSearchService(
        HttpClient http,
        IEmbeddingService embeddings,
        ILogger<QdrantVectorSearchService> logger)
    {
        _http       = http;
        _embeddings = embeddings;
        _logger     = logger;
    }

    /// <inheritdoc />
    public async Task UpsertEventEmbeddingAsync(
        Guid eventId,
        string text,
        CancellationToken ct = default)
    {
        var vector = await _embeddings.GetEmbeddingAsync(text, ct);

        var payload = new
        {
            points = new[]
            {
                new
                {
                    id      = eventId.ToString(),
                    vector,
                    payload = new { eventId = eventId.ToString(), text }
                }
            }
        };

        var response = await _http.PutAsJsonAsync(
            $"/collections/{Collection}/points",
            payload,
            JsonOptions,
            ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Qdrant upsert failed for event {EventId}: {Body}", eventId, body);
            response.EnsureSuccessStatusCode();
        }

        _logger.LogDebug("Qdrant upsert succeeded for event {EventId}", eventId);
    }

    /// <inheritdoc />
    public async Task<List<SimilarEventResult>> SearchSimilarAsync(
        string query,
        int topK,
        CancellationToken ct = default)
    {
        var vector = await _embeddings.GetEmbeddingAsync(query, ct);

        var searchPayload = new
        {
            vector,
            limit        = topK,
            with_payload = true
        };

        var response = await _http.PostAsJsonAsync(
            $"/collections/{Collection}/points/search",
            searchPayload,
            JsonOptions,
            ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Qdrant search failed: {Body}", body);
            response.EnsureSuccessStatusCode();
        }

        var result = await response.Content.ReadFromJsonAsync<QdrantSearchResponse>(JsonOptions, ct);

        return result?.Result
            .Where(r => r.Payload?.EventId is not null)
            .Select(r => new SimilarEventResult(
                Guid.Parse(r.Payload.EventId),
                r.Score))
            .ToList() ?? [];
    }

    /// <inheritdoc />
    public async Task DeleteEmbeddingAsync(Guid eventId, CancellationToken ct = default)
    {
        var payload = new { points = new[] { eventId.ToString() } };

        var response = await _http.PostAsJsonAsync(
            $"/collections/{Collection}/points/delete",
            payload,
            JsonOptions,
            ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Qdrant delete failed for event {EventId}: {Body}", eventId, body);
        }
    }

    // ── Response DTOs ─────────────────────────────────────────────────────────

    private sealed record QdrantSearchResponse(List<QdrantScoredPoint> Result);

    private sealed record QdrantScoredPoint(string Id, double Score, QdrantPayload Payload);

    private sealed record QdrantPayload([property: JsonPropertyName("event_id")] string EventId);
}
