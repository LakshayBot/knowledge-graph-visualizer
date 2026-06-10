using CausalExplorer.Domain.Common;
using CausalExplorer.Domain.Enums;
using CausalExplorer.Domain.Events;

namespace CausalExplorer.Domain.Entities;

/// <summary>
/// Represents a named, curated sequence of causally linked events — a navigable
/// path through the causal knowledge graph rooted at a single event.
/// </summary>
public sealed class CausalChain : BaseEntity
{
    // ── Public properties ─────────────────────────────────────────────────────

    /// <summary>Gets the identifier of the root (originating) event node.</summary>
    public Guid RootEventId { get; private set; }

    /// <summary>Gets the human-readable title of this causal chain.</summary>
    public string Title { get; private set; } = default!;

    /// <summary>Gets the primary domain this chain operates within.</summary>
    public EventDomain Domain { get; private set; }

    /// <summary>Gets the UTC timestamp of the most recent modification to this chain.</summary>
    public DateTime LastUpdatedAt { get; private set; }

    /// <summary>Gets the total number of event nodes in this chain.</summary>
    public int NodeCount { get; private set; }

    /// <summary>Gets the cumulative number of times this chain has been viewed.</summary>
    public int ViewCount { get; private set; }

    /// <summary>Gets the complete graph snapshot (all nodes + edges) stored as JSONB for chain-scoped loading.</summary>
    public string? GraphSnapshot { get; private set; }

    // ── Factory method ────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a new <see cref="CausalChain"/> with an initial node count of 1
    /// (the root event).
    /// </summary>
    /// <param name="rootEventId">The identifier of the root event node.</param>
    /// <param name="title">The chain title. Must not be null or whitespace.</param>
    /// <param name="domain">The primary domain of this chain.</param>
    /// <returns>A newly constructed <see cref="CausalChain"/>.</returns>
    /// <exception cref="ArgumentException">
    /// Thrown when <paramref name="title"/> is null or whitespace.
    /// </exception>
    public static CausalChain Create(Guid rootEventId, string title, EventDomain domain)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title must not be null or whitespace.", nameof(title));

        var chain = new CausalChain
        {
            RootEventId   = rootEventId,
            Title         = title,
            Domain        = domain,
            LastUpdatedAt = DateTime.UtcNow,
            NodeCount     = 1,
            ViewCount     = 0
        };

        return chain;
    }

    // ── Behaviour ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Increments the node count and raises a <see cref="ChainUpdatedDomainEvent"/>.
    /// </summary>
    public void IncrementNodeCount()
    {
        NodeCount++;
        LastUpdatedAt = DateTime.UtcNow;
        Touch();

        RaiseDomainEvent(new ChainUpdatedDomainEvent(Id, NodeCount, DateTime.UtcNow));
    }

    /// <summary>
    /// Decrements the node count (minimum 1 — the root node always remains)
    /// and raises a <see cref="ChainUpdatedDomainEvent"/>.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// Thrown when the chain already contains only the root node.
    /// </exception>
    public void DecrementNodeCount()
    {
        if (NodeCount <= 1)
            throw new InvalidOperationException(
                "Cannot remove the root node from a causal chain.");

        NodeCount--;
        LastUpdatedAt = DateTime.UtcNow;
        Touch();

        RaiseDomainEvent(new ChainUpdatedDomainEvent(Id, NodeCount, DateTime.UtcNow));
    }

    /// <summary>
    /// Records a view of this causal chain by incrementing the view counter.
    /// </summary>
    public void RecordView()
    {
        ViewCount++;
        Touch();
    }

    /// <summary>
    /// Updates the title of this causal chain.
    /// </summary>
    /// <param name="title">New title. Must not be null or whitespace.</param>
    public void Rename(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title must not be null or whitespace.", nameof(title));

        Title         = title;
        LastUpdatedAt = DateTime.UtcNow;
        Touch();
    }

    /// <summary>
    /// Stores a complete graph snapshot for chain-scoped loading, avoiding cross-chain Neo4j leakage.
    /// </summary>
    public void SetGraphSnapshot(string? snapshot)
    {
        GraphSnapshot = snapshot;
        LastUpdatedAt = DateTime.UtcNow;
        Touch();
    }

    // ── EF Core parameterless constructor ─────────────────────────────────────
    private CausalChain() { }
}
