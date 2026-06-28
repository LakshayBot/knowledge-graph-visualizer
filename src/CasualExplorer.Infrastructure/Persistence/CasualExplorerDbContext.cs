using CasualExplorer.Domain.Common;
using CasualExplorer.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Reflection;

namespace CasualExplorer.Infrastructure.Persistence;

/// <summary>
/// Interceptor that automatically stamps <see cref="BaseEntity.CreatedAt"/> and
/// <see cref="BaseEntity.UpdatedAt"/> on every save.
/// </summary>
internal sealed class AuditingInterceptor : SaveChangesInterceptor
{
    /// <inheritdoc />
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        StampAuditFields(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    /// <inheritdoc />
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        StampAuditFields(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void StampAuditFields(DbContext? context)
    {
        if (context is null) return;

        var now = DateTime.UtcNow;

        foreach (var entry in context.ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    // CreatedAt and UpdatedAt are set by BaseEntity constructor;
                    // this guard ensures they are never left at default.
                    if (entry.Entity.CreatedAt == default)
                        entry.Property(nameof(BaseEntity.CreatedAt)).CurrentValue = now;
                    if (entry.Entity.UpdatedAt == default)
                        entry.Property(nameof(BaseEntity.UpdatedAt)).CurrentValue = now;
                    break;

                case EntityState.Modified:
                    entry.Property(nameof(BaseEntity.UpdatedAt)).CurrentValue = now;
                    break;
            }
        }
    }
}

/// <summary>
/// Entity Framework Core database context for the CasualExplorer application.
/// Manages all SQL-persisted aggregate roots and applies entity configurations
/// discovered from the current assembly.
/// </summary>
public sealed class CasualExplorerDbContext : DbContext
{
    /// <summary>Gets the event nodes table.</summary>
    public DbSet<EventNode> EventNodes => Set<EventNode>();

    /// <summary>Gets the casual edges table.</summary>
    public DbSet<CasualEdge> CasualEdges => Set<CasualEdge>();

    /// <summary>Gets the casual chains table.</summary>
    public DbSet<CasualChain> CasualChains => Set<CasualChain>();

    /// <summary>Gets the users table.</summary>
    public DbSet<User> Users => Set<User>();

    /// <summary>Gets the user-saved-chains junction table.</summary>
    public DbSet<UserSavedChain> UserSavedChains => Set<UserSavedChain>();

    /// <summary>Gets the refresh tokens table.</summary>
    public DbSet<RefreshTokenRecord> RefreshTokens => Set<RefreshTokenRecord>();

    /// <summary>Gets the user API keys table.</summary>
    public DbSet<UserApiKey> UserApiKeys => Set<UserApiKey>();

    /// <summary>
    /// Initialises a new instance of <see cref="CasualExplorerDbContext"/>.
    /// </summary>
    public CasualExplorerDbContext(DbContextOptions<CasualExplorerDbContext> options)
        : base(options) { }

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        base.OnModelCreating(modelBuilder);
    }
}
