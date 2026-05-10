using CausalExplorer.Domain.Common;
using CausalExplorer.Domain.Enums;

namespace CausalExplorer.Domain.ValueObjects;

/// <summary>
/// Value object representing a single supporting source for an event node or causal edge.
/// </summary>
public sealed class Source : BaseValueObject
{
    /// <summary>Gets the fully-qualified URL of the source document.</summary>
    public string Url { get; }

    /// <summary>Gets the human-readable title of the source document.</summary>
    public string Title { get; }

    /// <summary>Gets the UTC date on which the source was originally published.</summary>
    public DateTime PublishedDate { get; }

    /// <summary>
    /// Gets the reliability score of the source, on a scale of 0 (unreliable) to 1 (highly reliable).
    /// </summary>
    public decimal ReliabilityScore { get; }

    /// <summary>Gets the type classification of the source.</summary>
    public SourceType SourceType { get; }

    private Source(
        string url,
        string title,
        DateTime publishedDate,
        decimal reliabilityScore,
        SourceType sourceType)
    {
        Url = url;
        Title = title;
        PublishedDate = publishedDate;
        ReliabilityScore = reliabilityScore;
        SourceType = sourceType;
    }

    /// <summary>
    /// Creates a new <see cref="Source"/> value object after validating inputs.
    /// </summary>
    /// <param name="url">The URL of the source. Must be a valid absolute URI.</param>
    /// <param name="title">The title of the source. Must not be null or whitespace.</param>
    /// <param name="publishedDate">The publication date (UTC).</param>
    /// <param name="reliabilityScore">A decimal in the range [0, 1].</param>
    /// <param name="sourceType">The type of the source.</param>
    /// <returns>A new <see cref="Source"/> instance.</returns>
    /// <exception cref="ArgumentException">
    /// Thrown when <paramref name="url"/> is not a valid absolute URI,
    /// <paramref name="title"/> is null or whitespace, or
    /// <paramref name="reliabilityScore"/> is outside [0, 1].
    /// </exception>
    public static Source Create(
        string url,
        string title,
        DateTime publishedDate,
        decimal reliabilityScore,
        SourceType sourceType)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out _))
            throw new ArgumentException("Source URL must be a valid absolute URI.", nameof(url));

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Source title must not be null or whitespace.", nameof(title));

        if (reliabilityScore is < 0m or > 1m)
            throw new ArgumentOutOfRangeException(
                nameof(reliabilityScore), "Reliability score must be between 0 and 1.");

        return new Source(url, title, publishedDate.ToUniversalTime(), reliabilityScore, sourceType);
    }

    /// <inheritdoc />
    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Url.ToLowerInvariant();
        yield return PublishedDate;
        yield return SourceType;
    }

    /// <inheritdoc />
    public override string ToString() => $"[{SourceType}] {Title} ({Url})";
}
