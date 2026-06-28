using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CasualExplorer.Infrastructure.Persistence.Configurations;

/// <summary>
/// EF Core entity type configuration for <see cref="RefreshTokenRecord"/>.
/// </summary>
internal sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshTokenRecord>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<RefreshTokenRecord> builder)
    {
        builder.ToTable("refresh_tokens");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(e => e.Token)
            .HasColumnName("token")
            .HasMaxLength(512)
            .IsRequired();

        builder.Property(e => e.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(e => e.ExpiresAt)
            .HasColumnName("expires_at")
            .IsRequired();

        builder.Property(e => e.IsRevoked)
            .HasColumnName("is_revoked")
            .IsRequired();

        builder.Property(e => e.CreatedByIp)
            .HasColumnName("created_by_ip")
            .HasMaxLength(45); // IPv6 max length

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired();

        builder.HasIndex(e => e.Token)
            .IsUnique()
            .HasDatabaseName("uq_refresh_tokens_token");

        builder.HasIndex(e => e.UserId)
            .HasDatabaseName("ix_refresh_tokens_user_id");
    }
}
