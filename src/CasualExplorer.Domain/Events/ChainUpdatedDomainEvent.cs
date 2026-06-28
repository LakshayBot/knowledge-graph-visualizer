using CasualExplorer.Domain.Common;

namespace CasualExplorer.Domain.Events;

/// <summary>
/// Domain event raised when a <see cref="Entities.CasualChain"/> is updated
/// (e.g. nodes or edges are added or removed).
/// </summary>
/// <param name="ChainId">The identifier of the updated casual chain.</param>
/// <param name="NodeCount">The updated total number of nodes in the chain.</param>
/// <param name="OccurredOn">The UTC time at which the event was raised.</param>
public sealed record ChainUpdatedDomainEvent(
    Guid ChainId,
    int NodeCount,
    DateTime OccurredOn) : IDomainEvent;
