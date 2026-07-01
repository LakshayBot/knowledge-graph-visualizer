using CasualExplorer.Application.Common.Interfaces;
using CasualExplorer.Domain.Interfaces;
using CasualExplorer.Infrastructure.AI;
using CasualExplorer.Infrastructure.Analytics;
using CasualExplorer.Infrastructure.Cache;
using CasualExplorer.Infrastructure.Encryption;
using CasualExplorer.Infrastructure.Graph;
using CasualExplorer.Infrastructure.Identity;
using CasualExplorer.Infrastructure.Persistence;
using CasualExplorer.Infrastructure.Persistence.Repositories;
using CasualExplorer.Infrastructure.Search;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using Neo4j.Driver;
using StackExchange.Redis;

namespace CasualExplorer.Infrastructure;

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
            .AddEncryption(configuration)
            .AddAiKeyContext()
            .AddAiService(configuration)
            .AddAnalyticsService(configuration)
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

        services.AddDbContext<CasualExplorerDbContext>((sp, options) =>
            options
                .UseNpgsql(
                    connectionString,
                    npgsql => npgsql.MigrationsAssembly(
                        typeof(CasualExplorerDbContext).Assembly.FullName))
                .AddInterceptors(sp.GetRequiredService<AuditingInterceptor>()));

        // EF Core repositories (used when the Neo4j toggle is off, or for User/Chain writes)
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ICasualChainRepository, CasualChainRepository>();
        services.AddScoped<IUserSavedChainRepository, UserSavedChainRepository>();
        services.AddScoped<IUserApiKeyRepository, UserApiKeyRepository>();

        services.AddScoped<RefreshTokenStore>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IPostgresDataStore, PostgresDataStore>();

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

        // Graph repositories (replace EF Core stubs for EventNode and CasualEdge)
        services.AddScoped<IEventNodeRepository, Neo4jEventNodeRepository>();
        services.AddScoped<ICasualEdgeRepository, Neo4jCasualEdgeRepository>();

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
            client.Timeout     = TimeSpan.FromMinutes(10);
        })
        .AddStandardResilienceHandler(options =>
        {
            options.Retry.MaxRetryAttempts = 1;
            options.AttemptTimeout.Timeout  = TimeSpan.FromMinutes(8);
            options.TotalRequestTimeout.Timeout = TimeSpan.FromMinutes(10);
            options.CircuitBreaker.SamplingDuration = TimeSpan.FromMinutes(20);
        });

        services.AddHttpClient<EmbeddingServiceClient>(client =>
        {
            client.BaseAddress = new Uri(baseUrl);
            client.Timeout     = TimeSpan.FromMinutes(2);
        })
        .AddStandardResilienceHandler(options =>
        {
            options.Retry.MaxRetryAttempts = 2;
            options.TotalRequestTimeout.Timeout = TimeSpan.FromMinutes(1);
        });

        // Knowledge-graph generator — long timeout for Grok generation; client polls via job pattern.
        services.AddHttpClient<KnowledgeGraphGeneratorClient>(client =>
        {
            client.BaseAddress = new Uri(baseUrl);
            client.Timeout     = TimeSpan.FromMinutes(5);
        });

        services.AddScoped<IAIService>(sp => sp.GetRequiredService<AIServiceClient>());
        // EmbeddingServiceClient is already registered as a typed HttpClient above
        // (which wires the configured HttpClient with BaseAddress).
        // We expose it via the interface by forwarding through the typed-client factory.
        services.AddTransient<IEmbeddingService>(sp =>
            sp.GetRequiredService<EmbeddingServiceClient>());
        services.AddTransient<IKnowledgeGraphGenerator>(sp =>
            sp.GetRequiredService<KnowledgeGraphGeneratorClient>());

        return services;
    }

    // ── Analytics service ────────────────────────────────────────────────────

    private static IServiceCollection AddAnalyticsService(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var baseUrl = configuration["AIService:BaseUrl"] ?? "http://localhost:8000";

        services.AddHttpClient<AnalyticsService>(client =>
        {
            client.BaseAddress = new Uri(baseUrl);
            client.Timeout     = TimeSpan.FromSeconds(30);
        });

        services.AddScoped<IAnalyticsService>(sp =>
            sp.GetRequiredService<AnalyticsService>());

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

    // ── Encryption ────────────────────────────────────────────────────────────

    private static IServiceCollection AddEncryption(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var keyRingPath = configuration.GetValue<string>("DataProtection:KeyRingPath");
        services.AddDataProtection()
            .SetApplicationName("CasualExplorer")
            .PersistKeysToFileSystem(string.IsNullOrEmpty(keyRingPath)
                ? new DirectoryInfo(Path.Combine(Directory.GetCurrentDirectory(), "keys"))
                : new DirectoryInfo(keyRingPath));

        services.AddScoped<IApiKeyEncryptionService, ApiKeyEncryptionService>();

        return services;
    }

    // ── AI Key Context (scoped per-request) ───────────────────────────────────

    private static IServiceCollection AddAiKeyContext(
        this IServiceCollection services)
    {
        services.AddScoped<IAiKeyContext, AiKeyContext>();
        return services;
    }
}
