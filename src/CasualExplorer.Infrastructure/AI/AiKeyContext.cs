using CasualExplorer.Application.Common.Interfaces;

namespace CasualExplorer.Infrastructure.AI;

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
