using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Enums;

namespace CausalExplorer.Domain.Interfaces;

/// <summary>
/// Defines the contract for persistence operations on <see cref="CausalChain"/> aggregates.
/// </summary>
public interface ICausalChainRepository
{
    /// <summary>
    /// Retrieves a <see cref="CausalChain"/> by its unique identifier.
    /// </summary>
    /// <param name="id">The chain identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<CausalChain?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns a paged list of causal chains, optionally filtered by domain.
    /// </summary>
    /// <param name="domain">Optional domain filter.</param>
    /// <param name="pageNumber">1-based page index.</param>
    /// <param name="pageSize">Maximum number of results per page.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<CausalChain>> GetPagedAsync(
        EventDomain? domain,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the most-viewed causal chains, limited to <paramref name="count"/> results.
    /// </summary>
    /// <param name="count">Maximum number of trending chains to return.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<CausalChain>> GetTrendingAsync(
        int count,
        CancellationToken cancellationToken = default);

    /// <summary>Adds a new <see cref="CausalChain"/> to the repository.</summary>
    Task AddAsync(CausalChain chain, CancellationToken cancellationToken = default);

    /// <summary>Marks an existing <see cref="CausalChain"/> as modified.</summary>
    void Update(CausalChain chain);

    /// <summary>Removes a <see cref="CausalChain"/> from the repository.</summary>
    void Delete(CausalChain chain);
}
