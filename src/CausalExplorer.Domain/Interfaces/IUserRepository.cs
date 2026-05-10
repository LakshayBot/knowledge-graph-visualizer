using CausalExplorer.Domain.Entities;

namespace CausalExplorer.Domain.Interfaces;

/// <summary>
/// Defines the contract for persistence operations on <see cref="User"/> aggregates.
/// </summary>
public interface IUserRepository
{
    /// <summary>
    /// Retrieves a <see cref="User"/> by their unique identifier.
    /// </summary>
    /// <param name="id">The user identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a <see cref="User"/> by their email address (case-insensitive).
    /// </summary>
    /// <param name="email">The email address to search for.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a <see cref="User"/> by their username (case-insensitive).
    /// </summary>
    /// <param name="username">The username to search for.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>
    /// Determines whether a user with the specified email already exists.
    /// </summary>
    /// <param name="email">The email to check.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>
    /// Determines whether a user with the specified username already exists.
    /// </summary>
    /// <param name="username">The username to check.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>Adds a new <see cref="User"/> to the repository.</summary>
    Task AddAsync(User user, CancellationToken cancellationToken = default);

    /// <summary>Marks an existing <see cref="User"/> as modified.</summary>
    void Update(User user);
}
