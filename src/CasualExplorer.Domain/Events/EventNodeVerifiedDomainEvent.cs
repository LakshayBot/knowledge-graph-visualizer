using CasualExplorer.Domain.Common;

namespace CasualExplorer.Domain.Events;

/// <summary>
/// Domain event raised when an <see cref="Entities.EventNode"/> transitions to a verified state.
/// </summary>
/// <param name="EventNodeId">The identifier of the verified event node.</param>
/// <param name="VerifiedByUserId">The identifier of the moderator or admin who performed the verification.</param>
/// <param name="OccurredOn">The UTC time at which the event was raised.</param>
public sealed record EventNodeVerifiedDomainEvent(
    Guid EventNodeId,
    Guid VerifiedByUserId,
    DateTime OccurredOn) : IDomainEvent;
