using CasualExplorer.Domain.Common;

namespace CasualExplorer.Domain.Events;

/// <summary>
/// Domain event raised when a new <see cref="Entities.CasualEdge"/> is added to a casual graph.
/// </summary>
/// <param name="EdgeId">The identifier of the newly added edge.</param>
/// <param name="FromEventId">The identifier of the source event node.</param>
/// <param name="ToEventId">The identifier of the target event node.</param>
/// <param name="OccurredOn">The UTC time at which the event was raised.</param>
public sealed record CasualEdgeAddedDomainEvent(
    Guid EdgeId,
    Guid FromEventId,
    Guid ToEventId,
    DateTime OccurredOn) : IDomainEvent;
