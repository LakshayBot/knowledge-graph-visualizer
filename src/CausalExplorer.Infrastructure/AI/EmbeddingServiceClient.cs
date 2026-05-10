using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using CausalExplorer.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace CausalExplorer.Infrastructure.AI;

/// <summary>
/// Calls the Python AI service's embedding endpoint to produce dense vector representations.
/// </summary>
public sealed class EmbeddingServiceClient : IEmbeddingService
{
    private readonly HttpClient _http;
    private readonly ILogger<EmbeddingServiceClient> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>Initialises with the named <see cref="HttpClient"/> provided by DI.</summary>
    public EmbeddingServiceClient(HttpClient http, ILogger<EmbeddingServiceClient> logger)
    {
        _http   = http;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<float[]> GetEmbeddingAsync(string text, CancellationToken ct = default)
    {
        var correlationId = Guid.NewGuid().ToString();

        _logger.LogDebug(
            "Embedding request {CorrelationId} → POST /api/embeddings",
            correlationId);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/embeddings")
        {
            Content = JsonContent.Create(new { text }, options: JsonOptions)
        };
        request.Headers.Add("X-Correlation-ID", correlationId);

        var response = await _http.SendAsync(request, ct);

        _logger.LogDebug(
            "Embedding response {CorrelationId} ← {StatusCode}",
            correlationId, (int)response.StatusCode);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            throw new AIServiceException(
                $"Embedding service returned {(int)response.StatusCode}: {body}");
        }

        var result = await response.Content.ReadFromJsonAsync<EmbeddingResponse>(JsonOptions, ct)
            ?? throw new AIServiceException("Embedding service returned an empty response body.");

        return result.Embedding;
    }

    private sealed record EmbeddingResponse(float[] Embedding);
}
