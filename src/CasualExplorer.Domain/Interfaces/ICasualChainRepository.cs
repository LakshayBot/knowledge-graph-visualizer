using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Enums;

namespace CasualExplorer.Domain.Interfaces;

/// <summary>
/// Defines the contract for persistence operations on <see cref="CasualChain"/> aggregates.
/// </summary>
public interface ICasualChainRepository
{
    /// <summary>
    /// Retrieves a <see cref="CasualChain"/> by its unique identifier.
    /// </summary>
    /// <param name="id">The chain identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<CasualChain?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns a paged list of casual chains, optionally filtered by domain.
    /// </summary>
    /// <param name="domain">Optional domain filter.</param>
    /// <param name="pageNumber">1-based page index.</param>
    /// <param name="pageSize">Maximum number of results per page.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<CasualChain>> GetPagedAsync(
        EventDomain? domain,
        int pageNumber,
        int pageSize,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the most-viewed casual chains, limited to <paramref name="count"/> results.
    /// </summary>
    /// <param name="count">Maximum number of trending chains to return.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<CasualChain>> GetTrendingAsync(
        int count,
        CancellationToken cancellationToken = default);

    /// <summary>Adds a new <see cref="CasualChain"/> to the repository.</summary>
    Task AddAsync(CasualChain chain, CancellationToken cancellationToken = default);

    /// <summary>Marks an existing <see cref="CasualChain"/> as modified.</summary>
    void Update(CasualChain chain);

    /// <summary>Removes a <see cref="CasualChain"/> from the repository.</summary>
    void Delete(CasualChain chain);
}
