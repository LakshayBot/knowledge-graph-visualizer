using CasualExplorer.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CasualExplorer.Infrastructure.Persistence.Configurations;

/// <summary>
/// EF Core entity type configuration for <see cref="CasualChain"/>.
/// </summary>
internal sealed class CasualChainConfiguration : IEntityTypeConfiguration<CasualChain>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<CasualChain> builder)
    {
        builder.ToTable("casual_chains");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(e => e.RootEventId).HasColumnName("root_event_id").IsRequired();

        builder.Property(e => e.Title)
            .HasColumnName("title")
            .HasMaxLength(300)
            .IsRequired();

        builder.Property(e => e.Domain)
            .HasColumnName("domain")
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(e => e.NodeCount).HasColumnName("node_count").IsRequired();
        builder.Property(e => e.ViewCount).HasColumnName("view_count").IsRequired();
        builder.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(e => e.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(e => e.LastUpdatedAt).HasColumnName("last_updated_at").IsRequired();
        builder.Property(e => e.GraphSnapshot).HasColumnName("graph_snapshot").HasColumnType("jsonb");

        builder.HasIndex(e => e.Domain).HasDatabaseName("ix_casual_chains_domain");
        builder.HasIndex(e => e.ViewCount).HasDatabaseName("ix_casual_chains_view_count");
    }
}
