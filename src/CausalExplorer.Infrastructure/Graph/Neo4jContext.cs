using Neo4j.Driver;

namespace CausalExplorer.Infrastructure.Graph;

/// <summary>
/// Wraps the Neo4j <see cref="IDriver"/> singleton and provides factory methods
/// for read and write sessions.
/// </summary>
public sealed class Neo4jContext : IAsyncDisposable
{
    private readonly IDriver _driver;

    /// <summary>
    /// Initialises a new instance of <see cref="Neo4jContext"/> with the given driver.
    /// </summary>
    public Neo4jContext(IDriver driver) => _driver = driver;

    /// <summary>Opens an async session for read operations.</summary>
    public IAsyncSession GetSession() =>
        _driver.AsyncSession(o => o.WithDefaultAccessMode(AccessMode.Read));

    /// <summary>Opens an async session for write operations.</summary>
    public IAsyncSession GetWriteSession() =>
        _driver.AsyncSession(o => o.WithDefaultAccessMode(AccessMode.Write));

    /// <summary>
    /// Performs a lightweight connectivity health check against the Neo4j server.
    /// </summary>
    /// <returns><c>true</c> if the server is reachable; otherwise <c>false</c>.</returns>
    public async Task<bool> IsHealthyAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await _driver.VerifyConnectivityAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <inheritdoc />
    public async ValueTask DisposeAsync() => await _driver.DisposeAsync();
}
