using CasualExplorer.Domain.Common;
using CasualExplorer.Domain.Enums;
using CasualExplorer.Domain.Events;
using CasualExplorer.Domain.ValueObjects;

namespace CasualExplorer.Domain.Entities;

/// <summary>
/// Represents a directed casual relationship (edge) between two <see cref="EventNode"/> instances
/// in the casual knowledge graph.
/// </summary>
public sealed class CasualEdge : BaseEntity
{
    private readonly List<Source> _sources = [];

    // ── Public properties ─────────────────────────────────────────────────────

    /// <summary>Gets the identifier of the source (cause) event node.</summary>
    public Guid FromEventId { get; private set; }

    /// <summary>Gets the identifier of the target (effect) event node.</summary>
    public Guid ToEventId { get; private set; }

    /// <summary>Gets the type of casual relationship this edge represents.</summary>
    public CasualRelationshipType RelationshipType { get; private set; }

    /// <summary>
    /// Gets the strength of the casual relationship, expressed as a decimal in [0, 1].
    /// A higher value indicates a stronger, more direct casual link.
    /// </summary>
    public decimal Strength { get; private set; }

    /// <summary>Gets the analytical perspective from which this edge was derived.</summary>
    public Perspective Perspective { get; private set; }

    /// <summary>Gets the human-readable explanation of why this casual link exists.</summary>
    public string Explanation { get; private set; } = default!;

    /// <summary>
    /// Gets a value indicating whether the casual relationship represented by this edge
    /// is contested by credible alternative interpretations.
    /// </summary>
    public bool IsContested { get; private set; }

    /// <summary>Gets the source documents supporting this casual relationship.</summary>
    public IReadOnlyList<Source> Sources => _sources.AsReadOnly();

    // ── Factory method ────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a new <see cref="CasualEdge"/> and raises a
    /// <see cref="CasualEdgeAddedDomainEvent"/>.
    /// </summary>
    /// <param name="fromEventId">Source event node identifier.</param>
    /// <param name="toEventId">Target event node identifier. Must differ from <paramref name="fromEventId"/>.</param>
    /// <param name="relationshipType">The type of casual relationship.</param>
    /// <param name="strength">Strength of the relationship in [0, 1].</param>
    /// <param name="perspective">The analytical perspective of the relationship.</param>
    /// <param name="explanation">Human-readable justification. Must not be null or whitespace.</param>
    /// <param name="isContested">Whether the relationship is actively contested.</param>
    /// <returns>A newly constructed <see cref="CasualEdge"/>.</returns>
    /// <exception cref="ArgumentException">
    /// Thrown when <paramref name="fromEventId"/> equals <paramref name="toEventId"/>,
    /// or when <paramref name="explanation"/> is null or whitespace.
    /// </exception>
    /// <exception cref="ArgumentOutOfRangeException">
    /// Thrown when <paramref name="strength"/> is outside [0, 1].
    /// </exception>
    public static CasualEdge Create(
        Guid fromEventId,
        Guid toEventId,
        CasualRelationshipType relationshipType,
        decimal strength,
        Perspective perspective,
        string explanation,
        bool isContested = false)
    {
        if (fromEventId == toEventId)
            throw new ArgumentException("A casual edge cannot point from an event to itself.");

        if (strength is < 0m or > 1m)
            throw new ArgumentOutOfRangeException(nameof(strength), "Must be between 0 and 1.");

        if (string.IsNullOrWhiteSpace(explanation))
            throw new ArgumentException("Explanation must not be null or whitespace.", nameof(explanation));

        var edge = new CasualEdge
        {
            FromEventId      = fromEventId,
            ToEventId        = toEventId,
            RelationshipType = relationshipType,
            Strength         = strength,
            Perspective      = perspective,
            Explanation      = explanation,
            IsContested      = isContested
        };

        edge.RaiseDomainEvent(
            new CasualEdgeAddedDomainEvent(edge.Id, fromEventId, toEventId, DateTime.UtcNow));

        return edge;
    }

    // ── Behaviour ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Updates the explanation text for this casual relationship.
    /// </summary>
    /// <param name="explanation">New explanation. Must not be null or whitespace.</param>
    public void UpdateExplanation(string explanation)
    {
        if (string.IsNullOrWhiteSpace(explanation))
            throw new ArgumentException("Explanation must not be null or whitespace.", nameof(explanation));

        Explanation = explanation;
        Touch();
    }

    /// <summary>
    /// Marks this edge as contested or clears the contested flag.
    /// </summary>
    /// <param name="isContested">The new contested status.</param>
    public void SetContested(bool isContested)
    {
        IsContested = isContested;
        Touch();
    }

    /// <summary>
    /// Updates the strength of this casual relationship.
    /// </summary>
    /// <param name="strength">New strength value in [0, 1].</param>
    public void UpdateStrength(decimal strength)
    {
        if (strength is < 0m or > 1m)
            throw new ArgumentOutOfRangeException(nameof(strength), "Must be between 0 and 1.");

        Strength = strength;
        Touch();
    }

    /// <summary>
    /// Attaches a supporting <see cref="Source"/> document to this edge.
    /// </summary>
    /// <param name="source">The source to attach. Must not be null.</param>
    public void AddSource(Source source)
    {
        ArgumentNullException.ThrowIfNull(source);

        if (!_sources.Contains(source))
        {
            _sources.Add(source);
            Touch();
        }
    }

    // ── EF Core parameterless constructor ─────────────────────────────────────
    private CasualEdge() { }
}
