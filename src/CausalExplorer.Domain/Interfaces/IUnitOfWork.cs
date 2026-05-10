namespace CausalExplorer.Domain.Interfaces;

/// <summary>
/// Coordinates transactional consistency across one or more repositories within a
/// single business operation. Follows the Unit of Work pattern.
/// </summary>
public interface IUnitOfWork : IAsyncDisposable
{
    /// <summary>Gets the event-node repository scoped to this unit of work.</summary>
    IEventNodeRepository EventNodes { get; }

    /// <summary>Gets the causal-edge repository scoped to this unit of work.</summary>
    ICausalEdgeRepository CausalEdges { get; }

    /// <summary>Gets the causal-chain repository scoped to this unit of work.</summary>
    ICausalChainRepository CausalChains { get; }

    /// <summary>Gets the user repository scoped to this unit of work.</summary>
    IUserRepository Users { get; }

    /// <summary>
    /// Persists all tracked changes to the underlying data store as a single atomic operation.
    /// Domain events collected on aggregates are dispatched before the save completes.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The number of state entries written to the store.</returns>
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>Begins an explicit database transaction.</summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);

    /// <summary>Commits the current transaction.</summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);

    /// <summary>Rolls back the current transaction.</summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}
