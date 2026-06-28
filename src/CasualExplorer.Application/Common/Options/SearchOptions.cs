namespace CasualExplorer.Application.Common.Options;

/// <summary>
/// Configuration options for vector similarity search behaviour.
/// Bind from <c>VectorSearch</c> section in appsettings.
/// </summary>
public sealed class SearchOptions
{
    /// <summary>Gets or sets the cosine similarity threshold below which results are considered
    /// insufficiently relevant, triggering on-demand knowledge-graph generation.</summary>
    public double RelevanceThreshold { get; set; } = 0.70;
}
