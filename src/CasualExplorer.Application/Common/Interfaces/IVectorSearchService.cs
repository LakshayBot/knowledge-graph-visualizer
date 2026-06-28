namespace CasualExplorer.Application.Common.Interfaces;

/// <summary>
/// Represents a single result returned by a vector similarity search.
/// </summary>
public sealed record SimilarEventResult(Guid EventId, double Score);

/// <summary>
/// Contract for the vector embedding store used for semantic similarity search.
/// </summary>
public interface IVectorSearchService
{
    /// <summary>Upserts the embedding for an event, using its text representation.</summary>
    Task UpsertEventEmbeddingAsync(Guid eventId, string text, CancellationToken ct = default);

    /// <summary>Returns the top-K events most semantically similar to <paramref name="query"/>.</summary>
    Task<List<SimilarEventResult>> SearchSimilarAsync(string query, int topK, CancellationToken ct = default);

    /// <summary>Removes the embedding for the given event.</summary>
    Task DeleteEmbeddingAsync(Guid eventId, CancellationToken ct = default);
}
