using CausalExplorer.Application.Common.Interfaces;
using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Enums;
using CausalExplorer.Domain.Interfaces;
using CausalExplorer.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StackExchange.Redis;

namespace CausalExplorer.API.Tests;

/// <summary>
/// <see cref="WebApplicationFactory{TProgram}"/> that replaces external infrastructure
/// dependencies (Postgres, Neo4j, Redis) with in-memory / mock equivalents so that
/// integration tests can run without any live services.
/// </summary>
public sealed class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    // Expose mocks so individual tests can configure behaviour.

    /// <summary>Mock for the event node repository (backed by Neo4j in production).</summary>
    public Mock<IEventNodeRepository> EventNodeRepositoryMock { get; } = new();

    /// <summary>Mock for the causal edge repository.</summary>
    public Mock<ICausalEdgeRepository> CausalEdgeRepositoryMock { get; } = new();

    /// <summary>Mock for the user repository.</summary>
    public Mock<IUserRepository> UserRepositoryMock { get; } = new();

    /// <summary>Mock for the vector search service (Qdrant).</summary>
    public Mock<IVectorSearchService> VectorSearchMock { get; } = new();

    /// <summary>Mock for the AI service.</summary>
    public Mock<IAIService> AIServiceMock { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            // ── Replace Postgres with an in-memory EF Core provider ──────────
            RemoveDescriptor<DbContextOptions<CausalExplorerDbContext>>(services);
            services.AddDbContext<CausalExplorerDbContext>(opts =>
                opts.UseInMemoryDatabase("IntegrationTestDb"));

            // ── Replace Neo4j-backed repositories with mocks ─────────────────
            RemoveDescriptor<IEventNodeRepository>(services);
            services.AddScoped<IEventNodeRepository>(_ => EventNodeRepositoryMock.Object);

            RemoveDescriptor<ICausalEdgeRepository>(services);
            services.AddScoped<ICausalEdgeRepository>(_ => CausalEdgeRepositoryMock.Object);

            // ── Replace User repository with mock ────────────────────────────
            RemoveDescriptor<IUserRepository>(services);
            services.AddScoped<IUserRepository>(_ => UserRepositoryMock.Object);

            // ── Replace vector search with mock ──────────────────────────────
            RemoveDescriptor<IVectorSearchService>(services);
            services.AddScoped<IVectorSearchService>(_ => VectorSearchMock.Object);

            // ── Replace Redis with a no-op mock ───────────────────────────────
            RemoveDescriptor<IConnectionMultiplexer>(services);
            var redisMock = new Mock<IConnectionMultiplexer>();
            var dbMock    = new Mock<IDatabase>();
            redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object?>()))
                     .Returns(dbMock.Object);
            services.AddSingleton<IConnectionMultiplexer>(_ => redisMock.Object);

            // ── Replace AI service with a mock ───────────────────────────────
            RemoveDescriptor<IAIService>(services);
            services.AddScoped<IAIService>(_ => AIServiceMock.Object);
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>Creates an <see cref="HttpClient"/> that does not follow redirects.</summary>
    public HttpClient CreateApiClient()
        => CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

    /// <summary>
    /// Builds a seeded <see cref="EventNode"/> list and wires up
    /// <see cref="EventNodeRepositoryMock"/> to return it for any query.
    /// Also wires <see cref="VectorSearchMock"/> to return empty (keyword match sufficient).
    /// </summary>
    /// <param name="nodes">Nodes to return from search/list operations.</param>
    public void SetupEventNodes(IReadOnlyList<EventNode> nodes)
    {
        EventNodeRepositoryMock
            .Setup(r => r.SearchAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(nodes);

        EventNodeRepositoryMock
            .Setup(r => r.GetPagedAsync(
                It.IsAny<EventDomain?>(),
                It.IsAny<int>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(nodes);

        // Vector search returns empty so keyword path is used.
        VectorSearchMock
            .Setup(v => v.SearchSimilarAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<SimilarEventResult>());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static void RemoveDescriptor<T>(IServiceCollection services)
    {
        var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(T));
        if (descriptor is not null)
            services.Remove(descriptor);
    }
}
