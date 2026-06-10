using CausalExplorer.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CausalExplorer.Infrastructure.Persistence.Configurations;

/// <summary>
/// EF Core entity type configuration for <see cref="CausalChain"/>.
/// </summary>
internal sealed class CausalChainConfiguration : IEntityTypeConfiguration<CausalChain>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<CausalChain> builder)
    {
        builder.ToTable("causal_chains");

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

        builder.HasIndex(e => e.Domain).HasDatabaseName("ix_causal_chains_domain");
        builder.HasIndex(e => e.ViewCount).HasDatabaseName("ix_causal_chains_view_count");
    }
}
