namespace CausalExplorer.Infrastructure.AI;

/// <summary>
/// Contract for a scoped context that carries the current user's resolved AI provider
/// configuration (provider name, model, and decrypted API key) through a single request.
/// </summary>
public interface IAiKeyContext
{
    /// <summary>Gets the resolved provider name for the current request (e.g. "openai", "grok").</summary>
    string? Provider { get; }

    /// <summary>Gets the resolved model name for the current request (e.g. "gpt-4o-mini").</summary>
    string? Model { get; }

    /// <summary>Gets the decrypted API key for the current request, if BYOK is active.</summary>
    string? ApiKey { get; }

    /// <summary>Gets the current user's identifier, if authenticated.</summary>
    Guid? UserId { get; }

    /// <summary>Gets a value indicating whether a per-user key (BYOK) is active for this request.</summary>
    bool HasPerUserKey { get; }

    /// <summary>
    /// Sets the resolved AI configuration for the current request.
    /// Called by the key-resolution pipeline behaviour or by controllers directly.
    /// </summary>
    void Configure(string? provider, string? model, string? apiKey, Guid? userId);

    /// <summary>Clears any per-request key, reverting to server defaults.</summary>
    void Clear();
}

/// <summary>
/// Scoped implementation of <see cref="IAiKeyContext"/>.
/// Registered as Scoped so each HTTP request gets its own instance.
/// </summary>
internal sealed class AiKeyContext : IAiKeyContext
{
    public string? Provider { get; private set; }
    public string? Model { get; private set; }
    public string? ApiKey { get; private set; }
    public Guid? UserId { get; private set; }
    public bool HasPerUserKey => !string.IsNullOrEmpty(ApiKey);

    public void Configure(string? provider, string? model, string? apiKey, Guid? userId)
    {
        Provider = provider;
        Model    = model;
        ApiKey   = apiKey;
        UserId   = userId;
    }

    public void Clear()
    {
        Provider = null;
        Model    = null;
        ApiKey   = null;
        UserId   = null;
    }
}
