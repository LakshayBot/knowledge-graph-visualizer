using CasualExplorer.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CasualExplorer.Infrastructure.Persistence.Configurations;

/// <summary>
/// EF Core entity type configuration for <see cref="UserSavedChain"/>.
/// </summary>
internal sealed class UserSavedChainConfiguration : IEntityTypeConfiguration<UserSavedChain>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<UserSavedChain> builder)
    {
        builder.ToTable("user_saved_chains");

        builder.HasKey(e => new { e.UserId, e.ChainId });

        builder.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(e => e.ChainId).HasColumnName("chain_id").IsRequired();
        builder.Property(e => e.SavedAt).HasColumnName("saved_at").IsRequired();

        builder.Property(e => e.Notes)
            .HasColumnName("notes")
            .HasMaxLength(1000);
    }
}
