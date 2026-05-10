namespace CausalExplorer.Application.Common.Exceptions;

/// <summary>
/// Thrown when a requested entity cannot be found in the persistence store.
/// </summary>
public sealed class NotFoundException : Exception
{
    /// <summary>
    /// Initialises a new <see cref="NotFoundException"/> for the specified entity.
    /// </summary>
    /// <param name="entityName">The name of the entity type that was not found.</param>
    /// <param name="key">The key value that was used in the lookup.</param>
    public NotFoundException(string entityName, object key)
        : base($"{entityName} with key '{key}' was not found.") { }
}
