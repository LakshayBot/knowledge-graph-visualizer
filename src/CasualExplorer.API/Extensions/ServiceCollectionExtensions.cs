using System.Text;
using System.Threading.RateLimiting;
using Asp.Versioning;
using CasualExplorer.Application.Common.Interfaces;
using CasualExplorer.Infrastructure.Persistence;
using CasualExplorer.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace CasualExplorer.API.Extensions;

/// <summary>
/// Extension methods for configuring all API-layer services on <see cref="IServiceCollection"/>.
/// </summary>
public static class ServiceCollectionExtensions
{
    // ── Rate-limiter policy names ─────────────────────────────────────────────
    internal const string AnonPolicy          = "anonymous";
    internal const string AuthPolicy          = "authenticated";
    internal const string AiPolicy            = "ai-expensive";

    /// <summary>Adds JWT bearer authentication with issuer/audience/lifetime/signing key validation.</summary>
    public static IServiceCollection AddJwtBearerAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var secret   = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is not configured.");
        var issuer   = configuration["Jwt:Issuer"]   ?? "casual-explorer";
        var audience = configuration["Jwt:Audience"] ?? "casual-explorer-clients";

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer           = true,
                    ValidateAudience         = true,
                    ValidateLifetime         = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer              = issuer,
                    ValidAudience            = audience,
                    IssuerSigningKey         = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(secret)),
                    ClockSkew                = TimeSpan.FromSeconds(30)
                };
            });

        return services;
    }

    /// <summary>Adds named authorization policies.</summary>
    public static IServiceCollection AddAuthorizationPolicies(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.AddPolicy("RequireUser", policy =>
                policy.RequireAuthenticatedUser());

            options.AddPolicy("RequireContributor", policy =>
                policy.RequireAuthenticatedUser()
                      .RequireRole("Contributor", "Moderator", "Admin"));

            options.AddPolicy("RequireModeratorOrAdmin", policy =>
                policy.RequireAuthenticatedUser()
                      .RequireRole("Moderator", "Admin"));
        });

        return services;
    }

    /// <summary>Adds API versioning defaulting to v1.</summary>
    public static IServiceCollection AddApiVersioningSupport(this IServiceCollection services)
    {
        services
            .AddApiVersioning(options =>
            {
                options.DefaultApiVersion             = new ApiVersion(1, 0);
                options.AssumeDefaultVersionWhenUnspecified = true;
                options.ReportApiVersions             = true;
                options.ApiVersionReader              = ApiVersionReader.Combine(
                    new UrlSegmentApiVersionReader(),
                    new HeaderApiVersionReader("X-Api-Version"));
            })
            .AddApiExplorer(options =>
            {
                options.GroupNameFormat           = "'v'VVV";
                options.SubstituteApiVersionInUrl = true;
            });

        return services;
    }

    /// <summary>
    /// Adds fixed-window rate limiters:
    /// anonymous (IP-based), authenticated (UserId-based), and AI-endpoint (UserId-based).
    /// </summary>
    public static IServiceCollection AddRateLimitingPolicies(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var anonLimit  = configuration.GetValue("RateLimiting:AnonymousRequestsPerMinute",  20);
        var authLimit  = configuration.GetValue("RateLimiting:AuthenticatedRequestsPerMinute", 100);
        var aiLimit    = configuration.GetValue("RateLimiting:AIRequestsPerMinute",          10);

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // Anonymous – keyed by remote IP
            options.AddPolicy(AnonPolicy, context =>
            {
                var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetFixedWindowLimiter(ip, _ =>
                    new FixedWindowRateLimiterOptions
                    {
                        PermitLimit          = anonLimit,
                        Window               = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit           = 0
                    });
            });

            // Authenticated – keyed by UserId claim, falls back to IP
            options.AddPolicy(AuthPolicy, context =>
            {
                var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? context.User.FindFirst("sub")?.Value
                          ?? context.Connection.RemoteIpAddress?.ToString()
                          ?? "unknown";

                return RateLimitPartition.GetFixedWindowLimiter($"auth:{userId}", _ =>
                    new FixedWindowRateLimiterOptions
                    {
                        PermitLimit          = authLimit,
                        Window               = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit           = 0
                    });
            });

            // AI endpoints – tighter limit per user
            options.AddPolicy(AiPolicy, context =>
            {
                var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? context.User.FindFirst("sub")?.Value
                          ?? context.Connection.RemoteIpAddress?.ToString()
                          ?? "unknown";

                return RateLimitPartition.GetFixedWindowLimiter($"ai:{userId}", _ =>
                    new FixedWindowRateLimiterOptions
                    {
                        PermitLimit          = aiLimit,
                        Window               = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit           = 0
                    });
            });
        });

        return services;
    }

    /// <summary>Adds CORS policy allowing configured origins.</summary>
    public static IServiceCollection AddCorsPolicies(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                   ?? ["http://localhost:3000"];

        services.AddCors(options =>
            options.AddPolicy("AllowFrontend", policy =>
                policy.WithOrigins(origins)
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials()));

        return services;
    }

    /// <summary>Adds Swagger with JWT bearer security definition, grouped by API version.</summary>
    public static IServiceCollection AddSwaggerDocumentation(this IServiceCollection services)
    {
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title       = "CasualExplorer API",
                Version     = "v1",
                Description = """
                    AI-powered casual event graph REST API.

                    **Authentication**: All protected endpoints require a JWT Bearer token.
                    Obtain a token via `POST /api/v1/auth/login` and include it as:
                    `Authorization: Bearer <token>`

                    **Rate limits**:
                    - Anonymous: 20 req/min per IP
                    - Authenticated: 100 req/min per user
                    - AI endpoints (expand, generate): 10 req/min per user
                    """,
                Contact = new OpenApiContact
                {
                    Name = "CasualExplorer Team"
                }
            });

            // Include XML comments from API project
            var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
            var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
            if (File.Exists(xmlPath))
                options.IncludeXmlComments(xmlPath);

            // JWT bearer security
            var jwtScheme = new OpenApiSecurityScheme
            {
                Name         = "Authorization",
                Description  = "Enter: **Bearer {token}**",
                In           = ParameterLocation.Header,
                Type         = SecuritySchemeType.Http,
                Scheme       = "bearer",
                BearerFormat = "JWT",
                Reference    = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id   = JwtBearerDefaults.AuthenticationScheme
                }
            };

            options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, jwtScheme);
            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                { jwtScheme, Array.Empty<string>() }
            });

            options.EnableAnnotations();
        });

        return services;
    }

    /// <summary>
    /// Adds health checks: EF Core (Postgres), Neo4j (custom), Redis (custom), AI service (HTTP ping).
    /// </summary>
    public static IServiceCollection AddPlatformHealthChecks(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var aiBaseUrl  = configuration["AIService:BaseUrl"]         ?? "http://localhost:8000";
        var redisConn  = configuration.GetConnectionString("Redis")  ?? "localhost:6379";
        var neo4jUrl   = configuration["Neo4j:BoltUrl"]             ?? "bolt://localhost:7687";

        services.AddHealthChecks()
            .AddDbContextCheck<CasualExplorerDbContext>(
                name: "postgres",
                failureStatus: HealthStatus.Unhealthy,
                tags: ["db", "postgres"])
            .AddRedis(redisConn, name: "redis",
                failureStatus: HealthStatus.Degraded,
                tags: ["cache", "redis"])
            .AddUrlGroup(
                uri: new Uri($"{aiBaseUrl}/health"),
                name: "ai-service",
                failureStatus: HealthStatus.Degraded,
                tags: ["ai"]);

        return services;
    }

    /// <summary>Registers <see cref="ICurrentUserService"/> as a scoped HTTP-context–aware service.</summary>
    public static IServiceCollection AddCurrentUserService(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        return services;
    }
}
