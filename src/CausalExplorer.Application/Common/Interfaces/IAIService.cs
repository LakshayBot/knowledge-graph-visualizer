using CausalExplorer.Application.AI.Interfaces;
using CausalExplorer.Application.EventNodes.DTOs;

namespace CausalExplorer.Application.Common.Interfaces;

/// <summary>
/// Contract for the Python AI sidecar service that performs NLP and causal reasoning tasks.
/// </summary>
public interface IAIService
{
    /// <summary>
    /// Extracts structured event nodes from raw unstructured text.
    /// </summary>
    Task<ExtractedEventsResult> ExtractEventsFromTextAsync(string text, CancellationToken ct = default);

    /// <summary>
    /// Generates an AI-authored causal explanation linking two events.
    /// </summary>
    Task<CausalLinkResult> GenerateCausalLinkAsync(Guid fromEventId, Guid toEventId, CancellationToken ct = default);

    /// <summary>
    /// Suggests new nodes and edges to expand a chain at a given node from a particular perspective.
    /// </summary>
    Task<ChainExpansionResult> ExpandChainNodeAsync(Guid nodeId, string perspective, CancellationToken ct = default);

    /// <summary>
    /// Searches for semantically similar events to the given free-text <paramref name="query"/>.
    /// </summary>
    Task<List<EventNodeSummaryDto>> SearchSimilarEventsAsync(string query, int topK, CancellationToken ct = default);
}
