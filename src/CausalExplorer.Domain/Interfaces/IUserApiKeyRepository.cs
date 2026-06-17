using CausalExplorer.Domain.Entities;

namespace CausalExplorer.Domain.Interfaces;

/// <summary>
/// Repository contract for persisting and retrieving user-provided API keys.
/// </summary>
public interface IUserApiKeyRepository
{
    /// <summary>Gets the active API key for a user and provider, or null if none.</summary>
    Task<UserApiKey?> GetByUserAndProviderAsync(Guid userId, string provider, CancellationToken ct = default);

    /// <summary>Gets all API keys (active or not) for a given user.</summary>
    Task<List<UserApiKey>> GetAllByUserAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Adds a new API key record.</summary>
    Task AddAsync(UserApiKey key, CancellationToken ct = default);

    /// <summary>Updates an existing API key record.</summary>
    void Update(UserApiKey key);

    /// <summary>Removes an API key record.</summary>
    void Delete(UserApiKey key);
}
