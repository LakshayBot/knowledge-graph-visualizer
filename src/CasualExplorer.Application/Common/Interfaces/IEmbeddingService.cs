namespace CasualExplorer.Application.Common.Interfaces;

/// <summary>
/// Contract for computing dense vector embeddings from text.
/// </summary>
public interface IEmbeddingService
{
    /// <summary>
    /// Returns a float-array embedding vector for the given <paramref name="text"/>.
    /// </summary>
    /// <param name="text">The input text to embed.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>A float array representing the semantic embedding.</returns>
    Task<float[]> GetEmbeddingAsync(string text, CancellationToken ct = default);
}
