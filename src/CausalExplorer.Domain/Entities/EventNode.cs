using CausalExplorer.Domain.Common;
using CausalExplorer.Domain.Enums;
using CausalExplorer.Domain.Events;
using CausalExplorer.Domain.ValueObjects;

namespace CausalExplorer.Domain.Entities;

/// <summary>
/// Represents a single event in the causal knowledge graph — a node that can be
/// linked to other nodes via <see cref="CausalEdge"/> relationships.
/// </summary>
public sealed class EventNode : BaseEntity
{
    private readonly List<Perspective> _perspectives = [];
    private readonly List<Source> _sources = [];

    // ── Private backing fields ────────────────────────────────────────────────

    private string _title = default!;
    private string _summary = default!;
    private decimal _confidenceScore;
    private decimal _freshnessScore;

    // ── Public properties ─────────────────────────────────────────────────────

    /// <summary>Gets the short descriptive title of the event.</summary>
    public string Title => _title;

    /// <summary>Gets the multi-sentence summary explaining what happened and why it matters.</summary>
    public string Summary => _summary;

    /// <summary>Gets the UTC date on which the real-world event occurred.</summary>
    public DateTime EventDate { get; private set; }

    /// <summary>Gets the high-level domain this event belongs to.</summary>
    public EventDomain Domain { get; private set; }

    /// <summary>
    /// Gets the raw confidence score (0–1). Use <see cref="GetConfidenceLevel"/> for
    /// the qualitative classification.
    /// </summary>
    public decimal ConfidenceScore => _confidenceScore;

    /// <summary>
    /// Gets the freshness score (0–1) reflecting how recently the event has been
    /// reviewed or updated.
    /// </summary>
    public decimal FreshnessScore => _freshnessScore;

    /// <summary>Gets the analytical perspectives from which this event has been characterised.</summary>
    public IReadOnlyList<Perspective> Perspectives => _perspectives.AsReadOnly();

    /// <summary>Gets the supporting source documents for this event.</summary>
    public IReadOnlyList<Source> Sources => _sources.AsReadOnly();

    /// <summary>
    /// Gets a value indicating whether this event node has been reviewed and
    /// verified by a moderator or administrator.
    /// </summary>
    public bool IsVerified { get; private set; }

    // ── Factory method ────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a new, unverified <see cref="EventNode"/> and raises an
    /// <see cref="EventNodeCreatedDomainEvent"/>.
    /// </summary>
    /// <param name="title">Short descriptive title. Must not be null or whitespace.</param>
    /// <param name="summary">Multi-sentence description of the event.</param>
    /// <param name="eventDate">UTC date on which the event occurred.</param>
    /// <param name="domain">High-level domain classification.</param>
    /// <param name="confidenceScore">Initial confidence score in [0, 1].</param>
    /// <param name="freshnessScore">Initial freshness score in [0, 1].</param>
    /// <returns>A newly constructed <see cref="EventNode"/>.</returns>
    /// <exception cref="ArgumentException">
    /// Thrown when <paramref name="title"/> or <paramref name="summary"/> is null or whitespace.
    /// </exception>
    /// <exception cref="ArgumentOutOfRangeException">
    /// Thrown when <paramref name="confidenceScore"/> or <paramref name="freshnessScore"/> is
    /// outside [0, 1].
    /// </exception>
    public static EventNode Create(
        string title,
        string summary,
        DateTime eventDate,
        EventDomain domain,
        decimal confidenceScore,
        decimal freshnessScore)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title must not be null or whitespace.", nameof(title));

        if (string.IsNullOrWhiteSpace(summary))
            throw new ArgumentException("Summary must not be null or whitespace.", nameof(summary));

        if (confidenceScore is < 0m or > 1m)
            throw new ArgumentOutOfRangeException(nameof(confidenceScore), "Must be between 0 and 1.");

        if (freshnessScore is < 0m or > 1m)
            throw new ArgumentOutOfRangeException(nameof(freshnessScore), "Must be between 0 and 1.");

        var node = new EventNode
        {
            _title          = title,
            _summary        = summary,
            EventDate       = eventDate.ToUniversalTime(),
            Domain          = domain,
            _confidenceScore = confidenceScore,
            _freshnessScore  = freshnessScore,
            IsVerified       = false
        };

        node.RaiseDomainEvent(new EventNodeCreatedDomainEvent(node.Id, title, DateTime.UtcNow));

        return node;
    }

    /// <summary>
    /// Reconstitutes an existing <see cref="EventNode"/> from persistent storage without
    /// raising domain events. Use this factory when hydrating from a graph or relational
    /// store rather than creating a brand-new aggregate.
    /// </summary>
    /// <param name="id">The persisted aggregate identifier.</param>
    /// <param name="title">Stored title.</param>
    /// <param name="summary">Stored summary.</param>
    /// <param name="eventDate">UTC date on which the real-world event occurred.</param>
    /// <param name="domain">Stored domain classification.</param>
    /// <param name="confidenceScore">Stored confidence score in [0, 1].</param>
    /// <param name="freshnessScore">Stored freshness score in [0, 1].</param>
    /// <param name="isVerified">Whether the node has been verified by a moderator.</param>
    /// <param name="createdAt">Original creation timestamp (UTC).</param>
    /// <param name="perspectives">Analytical perspectives already assigned to the node.</param>
    /// <returns>A fully-hydrated <see cref="EventNode"/> with no pending domain events.</returns>
    public static EventNode Reconstitute(
        Guid id,
        string title,
        string summary,
        DateTime eventDate,
        EventDomain domain,
        decimal confidenceScore,
        decimal freshnessScore,
        bool isVerified,
        DateTime createdAt,
        IEnumerable<Perspective>? perspectives = null)
    {
        var node = new EventNode(id, createdAt, createdAt)
        {
            _title           = title,
            _summary         = summary,
            EventDate        = eventDate.ToUniversalTime(),
            Domain           = domain,
            _confidenceScore = confidenceScore,
            _freshnessScore  = freshnessScore,
            IsVerified       = isVerified
        };

        if (perspectives is not null)
            foreach (var p in perspectives)
                node._perspectives.Add(p);

        return node;
    }

    // ── Behaviour ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the qualitative <see cref="ConfidenceLevel"/> for this node's current score.
    /// </summary>
    public ConfidenceLevel GetConfidenceLevel() =>
        ConfidenceLevel.FromScore(_confidenceScore);

    /// <summary>
    /// Updates the title and summary of this event node.
    /// </summary>
    /// <param name="title">New title. Must not be null or whitespace.</param>
    /// <param name="summary">New summary. Must not be null or whitespace.</param>
    public void UpdateDescription(string title, string summary)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title must not be null or whitespace.", nameof(title));

        if (string.IsNullOrWhiteSpace(summary))
            throw new ArgumentException("Summary must not be null or whitespace.", nameof(summary));

        _title   = title;
        _summary = summary;
        Touch();
    }

    /// <summary>
    /// Updates the confidence and freshness scores of this event node.
    /// </summary>
    /// <param name="confidenceScore">New confidence score in [0, 1].</param>
    /// <param name="freshnessScore">New freshness score in [0, 1].</param>
    public void UpdateScores(decimal confidenceScore, decimal freshnessScore)
    {
        if (confidenceScore is < 0m or > 1m)
            throw new ArgumentOutOfRangeException(nameof(confidenceScore), "Must be between 0 and 1.");

        if (freshnessScore is < 0m or > 1m)
            throw new ArgumentOutOfRangeException(nameof(freshnessScore), "Must be between 0 and 1.");

        _confidenceScore = confidenceScore;
        _freshnessScore  = freshnessScore;
        Touch();
    }

    /// <summary>
    /// Adds an analytical <see cref="Perspective"/> to this event node if not already present.
    /// </summary>
    /// <param name="perspective">The perspective to add.</param>
    public void AddPerspective(Perspective perspective)
    {
        if (!_perspectives.Contains(perspective))
        {
            _perspectives.Add(perspective);
            Touch();
        }
    }

    /// <summary>
    /// Attaches a supporting <see cref="Source"/> document to this event node.
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

    /// <summary>
    /// Marks this event node as verified and raises an
    /// <see cref="EventNodeVerifiedDomainEvent"/>.
    /// </summary>
    /// <param name="verifiedByUserId">The identifier of the user performing the verification.</param>
    /// <exception cref="InvalidOperationException">Thrown when the node is already verified.</exception>
    public void Verify(Guid verifiedByUserId)
    {
        if (IsVerified)
            throw new InvalidOperationException("EventNode is already verified.");

        IsVerified = true;
        Touch();

        RaiseDomainEvent(new EventNodeVerifiedDomainEvent(Id, verifiedByUserId, DateTime.UtcNow));
    }

    // ── EF Core parameterless constructor ─────────────────────────────────────
    private EventNode() { }

    /// <summary>
    /// Private constructor used by <see cref="Reconstitute"/> to set the persisted
    /// <paramref name="id"/> and audit timestamps via the base-class overload.
    /// </summary>
    private EventNode(Guid id, DateTime createdAt, DateTime updatedAt)
        : base(id, createdAt, updatedAt) { }
}
