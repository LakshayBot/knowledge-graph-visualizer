using CausalExplorer.Application.Common.DTOs;

namespace CausalExplorer.Application.Common.Interfaces;

/// <summary>
/// Contract for the AI service that generates a causal knowledge graph for a given topic
/// by fetching real-world data (Wikipedia) and running LLM extraction + edge inference.
/// </summary>
public interface IKnowledgeGraphGenerator
{
    /// <summary>
    /// Generates a causal knowledge graph for the specified topic.
    /// Results are cached in the AI sidecar for 1 hour.
    /// </summary>
    /// <param name="topic">Natural-language topic or question (e.g. "Asian heat waves 2023").</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>
    /// A <see cref="GeneratedGraphDto"/> containing extracted event nodes, inferred causal
    /// edges, and source URLs from Wikipedia.
    /// </returns>
    Task<GeneratedGraphDto> GenerateAsync(string topic, CancellationToken ct = default);
}
