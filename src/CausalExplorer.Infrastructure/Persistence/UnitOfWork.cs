using CausalExplorer.Domain.Common;
using CausalExplorer.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore.Storage;

namespace CausalExplorer.Infrastructure.Persistence;

/// <summary>
/// EF Core implementation of <see cref="IUnitOfWork"/>.
/// Coordinates repository access and dispatches domain events on save.
/// </summary>
public sealed class UnitOfWork : IUnitOfWork
{
    private readonly CausalExplorerDbContext _context;
    private readonly IPublisher _publisher;
    private IDbContextTransaction? _transaction;

    /// <inheritdoc />
    public IEventNodeRepository EventNodes { get; }

    /// <inheritdoc />
    public ICausalEdgeRepository CausalEdges { get; }

    /// <inheritdoc />
    public ICausalChainRepository CausalChains { get; }

    /// <inheritdoc />
    public IUserRepository Users { get; }

    /// <summary>
    /// Initialises a new instance of <see cref="UnitOfWork"/>.
    /// </summary>
    public UnitOfWork(
        CausalExplorerDbContext context,
        IPublisher publisher,
        IEventNodeRepository eventNodes,
        ICausalEdgeRepository causalEdges,
        ICausalChainRepository causalChains,
        IUserRepository users)
    {
        _context    = context;
        _publisher  = publisher;
        EventNodes  = eventNodes;
        CausalEdges = causalEdges;
        CausalChains = causalChains;
        Users       = users;
    }

    /// <inheritdoc />
    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await DispatchDomainEventsAsync(cancellationToken);
        return await _context.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default) =>
        _transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

    /// <inheritdoc />
    public async Task CommitTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction is null)
            throw new InvalidOperationException("No active transaction to commit.");

        await _transaction.CommitAsync(cancellationToken);
        await _transaction.DisposeAsync();
        _transaction = null;
    }

    /// <inheritdoc />
    public async Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction is null)
            throw new InvalidOperationException("No active transaction to roll back.");

        await _transaction.RollbackAsync(cancellationToken);
        await _transaction.DisposeAsync();
        _transaction = null;
    }

    /// <inheritdoc />
    public async ValueTask DisposeAsync()
    {
        if (_transaction is not null)
            await _transaction.DisposeAsync();

        await _context.DisposeAsync();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task DispatchDomainEventsAsync(CancellationToken cancellationToken)
    {
        var aggregates = _context.ChangeTracker
            .Entries<BaseEntity>()
            .Select(e => e.Entity)
            .Where(e => e.DomainEvents.Count > 0)
            .ToList();

        var domainEvents = aggregates
            .SelectMany(a => a.DomainEvents)
            .ToList();

        aggregates.ForEach(a => a.ClearDomainEvents());

        foreach (var domainEvent in domainEvents)
            await _publisher.Publish(domainEvent, cancellationToken);
    }
}
