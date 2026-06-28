using MediatR;

namespace CasualExplorer.Domain.Common;

/// <summary>
/// Marker interface for domain events raised within the domain model.
/// All domain events should implement this interface.
/// Extends <see cref="INotification"/> so events can be dispatched via MediatR's IPublisher.
/// </summary>
public interface IDomainEvent : INotification
{
    /// <summary>Gets the UTC date and time the domain event occurred.</summary>
    DateTime OccurredOn { get; }
}
