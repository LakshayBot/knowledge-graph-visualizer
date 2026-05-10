using CausalExplorer.Domain.Entities;

namespace CausalExplorer.Domain.Interfaces;

/// <summary>
/// Defines the contract for persistence operations on <see cref="UserSavedChain"/> associations.
/// </summary>
public interface IUserSavedChainRepository
{
    /// <summary>
    /// Returns all chains saved by the specified user, ordered by most-recently saved.
    /// </summary>
    /// <param name="userId">The identifier of the user.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<IReadOnlyList<UserSavedChain>> GetByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Returns the saved-chain entry for a specific user and chain combination, or
    /// <c>null</c> if the user has not saved that chain.
    /// </summary>
    /// <param name="userId">The identifier of the user.</param>
    /// <param name="chainId">The identifier of the chain.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<UserSavedChain?> GetAsync(
        Guid userId,
        Guid chainId,
        CancellationToken cancellationToken = default);

    /// <summary>Adds a new <see cref="UserSavedChain"/> association.</summary>
    Task AddAsync(UserSavedChain savedChain, CancellationToken cancellationToken = default);

    /// <summary>Removes a saved-chain association.</summary>
    void Delete(UserSavedChain savedChain);
}
