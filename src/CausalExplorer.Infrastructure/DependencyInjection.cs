using CausalExplorer.Application.Common.Interfaces;
using CausalExplorer.Domain.Interfaces;
using CausalExplorer.Infrastructure.AI;
using CausalExplorer.Infrastructure.Cache;
using CausalExplorer.Infrastructure.Graph;
using CausalExplorer.Infrastructure.Identity;
using CausalExplorer.Infrastructure.Persistence;
using CausalExplorer.Infrastructure.Persistence.Repositories;
using CausalExplorer.Infrastructure.Search;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using Neo4j.Driver;
using StackExchange.Redis;

namespace CausalExplorer.Infrastructure;

/// <summary>
/// Provides an extension method to register all Infrastructure-layer services
/// with the dependency injection container.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Registers EF Core, Neo4j, Redis, AI HTTP clients, vector search, JWT auth,
    /// and all repository / service implementations.
    /// </summary>
    /// <param name="services">The service collection to configure.</param>
    /// <param name="configuration">Application configuration.</param>
    /// <returns>The configured <see cref="IServiceCollection"/>.</returns>
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddPersistence(configuration)
            .AddNeo4j(configuration)
            .AddRedis(configuration)
            .AddAiService(configuration)
            .AddVectorSearch(configuration)
            .AddIdentityServices(configuration);

        return services;
    }

    // ── EF Core + repositories ────────────────────────────────────────────────

    private static IServiceCollection AddPersistence(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Connection string 'DefaultConnection' is not configured.");

        services.AddSingleton<AuditingInterceptor>();

        services.AddDbContext<CausalExplorerDbContext>((sp, options) =>
            options
                .UseNpgsql(
                    connectionString,
                    npgsql => npgsql.MigrationsAssembly(
                        typeof(CausalExplorerDbContext).Assembly.FullName))
                .AddInterceptors(sp.GetRequiredService<AuditingInterceptor>()));

        // EF Core repositories (used when the Neo4j toggle is off, or for User/Chain writes)
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ICausalChainRepository, CausalChainRepository>();
        services.AddScoped<IUserSavedChainRepository, UserSavedChainRepository>();

        services.AddScoped<RefreshTokenStore>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }

    // ── Neo4j ─────────────────────────────────────────────────────────────────

    private static IServiceCollection AddNeo4j(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var uri      = configuration["Neo4j:Uri"]      ?? "bolt://localhost:7687";
        var user     = configuration["Neo4j:Username"] ?? "neo4j";
        var password = configuration["Neo4j:Password"] ?? "password";

        services.AddSingleton<IDriver>(_ =>
            GraphDatabase.Driver(uri, AuthTokens.Basic(user, password)));

        services.AddSingleton<Neo4jContext>();

        // Graph repositories (replace EF Core stubs for EventNode and CausalEdge)
        services.AddScoped<IEventNodeRepository, Neo4jEventNodeRepository>();
        services.AddScoped<ICausalEdgeRepository, Neo4jCausalEdgeRepository>();

        return services;
    }

    // ── Redis ─────────────────────────────────────────────────────────────────

    private static IServiceCollection AddRedis(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Redis")
            ?? configuration["Redis:ConnectionString"]
            ?? "localhost:6379";

        services.AddSingleton<IConnectionMultiplexer>(
            _ => ConnectionMultiplexer.Connect(connectionString));

        services.AddSingleton<RedisCacheService>();

        return services;
    }

    // ── AI HTTP clients ───────────────────────────────────────────────────────

    private static IServiceCollection AddAiService(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var baseUrl = configuration["AIService:BaseUrl"] ?? "http://localhost:8000";

        services.AddHttpClient<AIServiceClient>(client =>
        {
            client.BaseAddress = new Uri(baseUrl);
            client.Timeout     = TimeSpan.FromSeconds(30);
        })
        .AddStandardResilienceHandler(options =>
        {
            options.Retry.MaxRetryAttempts = 3;
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(30);
        });

        services.AddHttpClient<EmbeddingServiceClient>(client =>
        {
            client.BaseAddress = new Uri(baseUrl);
            client.Timeout     = TimeSpan.FromSeconds(30);
        })
        .AddStandardResilienceHandler(options =>
        {
            options.Retry.MaxRetryAttempts = 3;
        });

        // Knowledge-graph generator — short timeout per HTTP call; client polls via job pattern.
        services.AddHttpClient<KnowledgeGraphGeneratorClient>(client =>
        {
            client.BaseAddress = new Uri(baseUrl);
            client.Timeout     = TimeSpan.FromSeconds(30);
        });

        services.AddScoped<IAIService, AIServiceClient>();
        // EmbeddingServiceClient is already registered as a typed HttpClient above
        // (which wires the configured HttpClient with BaseAddress).
        // We expose it via the interface by forwarding through the typed-client factory.
        services.AddTransient<IEmbeddingService>(sp =>
            sp.GetRequiredService<EmbeddingServiceClient>());
        services.AddTransient<IKnowledgeGraphGenerator>(sp =>
            sp.GetRequiredService<KnowledgeGraphGeneratorClient>());

        return services;
    }

    // ── Qdrant vector search ──────────────────────────────────────────────────

    private static IServiceCollection AddVectorSearch(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var qdrantUrl = configuration["VectorSearch:QdrantUrl"] ?? "http://localhost:6333";

        services.AddHttpClient<QdrantVectorSearchService>(client =>
        {
            client.BaseAddress = new Uri(qdrantUrl);
            client.Timeout     = TimeSpan.FromSeconds(30);
        })
        .AddStandardResilienceHandler();

        // Forward the typed HttpClient registration to the interface.
        // Using AddTransient so the typed-client factory (which owns the HttpClient lifecycle) is respected.
        services.AddTransient<IVectorSearchService>(sp =>
            sp.GetRequiredService<QdrantVectorSearchService>());

        return services;
    }

    // ── Identity / token ──────────────────────────────────────────────────────

    private static IServiceCollection AddIdentityServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddScoped<TokenService>();
        services.AddScoped<ITokenService, TokenService>();

        return services;
    }
}
