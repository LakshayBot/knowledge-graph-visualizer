using CausalExplorer.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CausalExplorer.Infrastructure.Persistence.Configurations;

/// <summary>
/// EF Core entity type configuration for <see cref="UserApiKey"/>.
/// </summary>
internal sealed class UserApiKeyConfiguration : IEntityTypeConfiguration<UserApiKey>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<UserApiKey> builder)
    {
        builder.ToTable("user_api_keys");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(e => e.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(e => e.Provider)
            .HasColumnName("provider")
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(e => e.KeyEncrypted)
            .HasColumnName("key_encrypted")
            .IsRequired();

        builder.Property(e => e.KeyPrefix)
            .HasColumnName("key_prefix")
            .HasMaxLength(12)
            .IsRequired();

        builder.Property(e => e.IsActive)
            .HasColumnName("is_active")
            .IsRequired();

        builder.Property(e => e.LastVerifiedAt)
            .HasColumnName("last_verified_at");

        builder.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(e => e.UpdatedAt).HasColumnName("updated_at").IsRequired();

        // One key per provider per user
        builder.HasIndex(e => new { e.UserId, e.Provider })
            .IsUnique()
            .HasDatabaseName("uq_user_api_keys_user_provider");

        // FK to users
        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade)
            .HasConstraintName("fk_user_api_keys_user");
    }
}
