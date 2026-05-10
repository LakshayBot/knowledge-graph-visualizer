using CausalExplorer.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CausalExplorer.Infrastructure.Persistence.Configurations;

/// <summary>
/// EF Core entity type configuration for <see cref="CausalEdge"/>.
/// </summary>
internal sealed class CausalEdgeConfiguration : IEntityTypeConfiguration<CausalEdge>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<CausalEdge> builder)
    {
        builder.ToTable("causal_edges");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id).HasColumnName("id").ValueGeneratedNever();
        builder.Property(e => e.FromEventId).HasColumnName("from_event_id").IsRequired();
        builder.Property(e => e.ToEventId).HasColumnName("to_event_id").IsRequired();

        builder.Property(e => e.RelationshipType)
            .HasColumnName("relationship_type")
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(e => e.Strength)
            .HasColumnName("strength")
            .HasPrecision(5, 4)
            .IsRequired();

        builder.Property(e => e.Perspective)
            .HasColumnName("perspective")
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(e => e.Explanation)
            .HasColumnName("explanation")
            .HasMaxLength(2000)
            .IsRequired();

        builder.Property(e => e.IsContested)
            .HasColumnName("is_contested")
            .IsRequired();

        builder.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(e => e.UpdatedAt).HasColumnName("updated_at").IsRequired();

        builder.OwnsMany(e => e.Sources, sourceBuilder =>
        {
            sourceBuilder.ToJson("sources");
            sourceBuilder.Property(s => s.Url).HasColumnName("url").HasMaxLength(2048).IsRequired();
            sourceBuilder.Property(s => s.Title).HasColumnName("title").HasMaxLength(500).IsRequired();
            sourceBuilder.Property(s => s.PublishedDate).HasColumnName("published_date").IsRequired();
            sourceBuilder.Property(s => s.ReliabilityScore).HasColumnName("reliability_score").HasPrecision(5, 4);
            sourceBuilder.Property(s => s.SourceType).HasColumnName("source_type").HasConversion<string>().HasMaxLength(50);
        });

        builder.HasIndex(e => e.FromEventId).HasDatabaseName("ix_causal_edges_from_event_id");
        builder.HasIndex(e => e.ToEventId).HasDatabaseName("ix_causal_edges_to_event_id");
        builder.HasIndex(e => new { e.FromEventId, e.ToEventId }).HasDatabaseName("ix_causal_edges_from_to");
    }
}
