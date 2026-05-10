using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Enums;
using CausalExplorer.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CausalExplorer.Infrastructure.Persistence.Configurations;

/// <summary>
/// EF Core entity type configuration for <see cref="EventNode"/>.
/// </summary>
internal sealed class EventNodeConfiguration : IEntityTypeConfiguration<EventNode>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<EventNode> builder)
    {
        builder.ToTable("event_nodes");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(e => e.Title)
            .HasColumnName("title")
            .HasMaxLength(300)
            .IsRequired();

        builder.Property(e => e.Summary)
            .HasColumnName("summary")
            .HasMaxLength(5000)
            .IsRequired();

        builder.Property(e => e.EventDate)
            .HasColumnName("event_date")
            .IsRequired();

        builder.Property(e => e.Domain)
            .HasColumnName("domain")
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(e => e.ConfidenceScore)
            .HasColumnName("confidence_score")
            .HasPrecision(5, 4)
            .IsRequired();

        builder.Property(e => e.FreshnessScore)
            .HasColumnName("freshness_score")
            .HasPrecision(5, 4)
            .IsRequired();

        builder.Property(e => e.IsVerified)
            .HasColumnName("is_verified")
            .IsRequired();

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.Property(e => e.UpdatedAt)
            .HasColumnName("updated_at")
            .IsRequired();

        // Perspectives — persisted as a comma-separated string of enum names,
        // mapped via the private _perspectives backing field.
        builder
            .Property<List<Perspective>>("_perspectives")
            .HasColumnName("perspectives")
            .HasConversion(
                v => string.Join(',', v.Select(p => p.ToString())),
                v => v.Length == 0
                    ? new List<Perspective>()
                    : v.Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => Enum.Parse<Perspective>(s))
                        .ToList())
            .UsePropertyAccessMode(PropertyAccessMode.Field)
            .HasMaxLength(500);

        // Sources — owned entity collection stored as JSON
        builder.OwnsMany(e => e.Sources, sourceBuilder =>
        {
            sourceBuilder.ToJson("sources");

            sourceBuilder.Property(s => s.Url).HasColumnName("url").HasMaxLength(2048).IsRequired();
            sourceBuilder.Property(s => s.Title).HasColumnName("title").HasMaxLength(500).IsRequired();
            sourceBuilder.Property(s => s.PublishedDate).HasColumnName("published_date").IsRequired();
            sourceBuilder.Property(s => s.ReliabilityScore).HasColumnName("reliability_score").HasPrecision(5, 4);
            sourceBuilder.Property(s => s.SourceType).HasColumnName("source_type").HasConversion<string>().HasMaxLength(50);
        });

        builder.HasIndex(e => e.Domain).HasDatabaseName("ix_event_nodes_domain");
        builder.HasIndex(e => e.EventDate).HasDatabaseName("ix_event_nodes_event_date");
        builder.HasIndex(e => e.IsVerified).HasDatabaseName("ix_event_nodes_is_verified");
    }
}
