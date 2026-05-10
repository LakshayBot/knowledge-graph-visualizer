namespace CausalExplorer.API.Tests;

/// <summary>
/// Marks the collection that shares a single <see cref="CustomWebApplicationFactory"/>
/// across all integration test classes.
/// </summary>
[CollectionDefinition(Name)]
public sealed class IntegrationTestCollection : ICollectionFixture<CustomWebApplicationFactory>
{
    /// <summary>The collection name used in <see cref="CollectionAttribute"/>.</summary>
    public const string Name = "Integration";
}
