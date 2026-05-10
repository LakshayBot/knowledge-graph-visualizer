using CausalExplorer.Domain.Common;

namespace CausalExplorer.Domain.Events;

/// <summary>
/// Domain event raised when a new <see cref="Entities.EventNode"/> is created.
/// </summary>
/// <param name="EventNodeId">The identifier of the newly created event node.</param>
/// <param name="Title">The title of the new event node.</param>
/// <param name="OccurredOn">The UTC time at which the event was raised.</param>
public sealed record EventNodeCreatedDomainEvent(
    Guid EventNodeId,
    string Title,
    DateTime OccurredOn) : IDomainEvent;
