namespace CausalExplorer.Domain.Common;

/// <summary>
/// Abstract base class for all domain entities.
/// Provides identity, audit timestamps, and a domain-event collection.
/// </summary>
public abstract class BaseEntity
{
    private readonly List<IDomainEvent> _domainEvents = [];

    /// <summary>Gets the unique identifier of this entity.</summary>
    public Guid Id { get; private set; }

    /// <summary>Gets the UTC date and time at which this entity was created.</summary>
    public DateTime CreatedAt { get; private set; }

    /// <summary>Gets the UTC date and time at which this entity was last updated.</summary>
    public DateTime UpdatedAt { get; protected set; }

    /// <summary>Gets the collection of domain events raised by this entity.</summary>
    public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    /// <summary>
    /// Initialises a new entity with a new <see cref="Guid"/> and the current UTC timestamp.
    /// </summary>
    protected BaseEntity()
    {
        Id = Guid.NewGuid();
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Initialises an entity with an explicit <paramref name="id"/> — used when
    /// rehydrating from persistence.
    /// </summary>
    /// <param name="id">The persisted identifier.</param>
    protected BaseEntity(Guid id)
    {
        Id = id;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Initialises an entity with an explicit <paramref name="id"/> and audit timestamps —
    /// used when rehydrating from persistence with full fidelity.
    /// </summary>
    /// <param name="id">The persisted identifier.</param>
    /// <param name="createdAt">The original creation timestamp (UTC).</param>
    /// <param name="updatedAt">The last-updated timestamp (UTC).</param>
    protected BaseEntity(Guid id, DateTime createdAt, DateTime updatedAt)
    {
        Id        = id;
        CreatedAt = createdAt;
        UpdatedAt = updatedAt;
    }

    /// <summary>Raises a domain event by adding it to the internal event collection.</summary>
    /// <param name="domainEvent">The domain event to raise.</param>
    protected void RaiseDomainEvent(IDomainEvent domainEvent) =>
        _domainEvents.Add(domainEvent);

    /// <summary>Clears all pending domain events — typically called after they are dispatched.</summary>
    public void ClearDomainEvents() => _domainEvents.Clear();

    /// <summary>Updates the <see cref="UpdatedAt"/> timestamp to the current UTC time.</summary>
    protected void Touch() => UpdatedAt = DateTime.UtcNow;
}
