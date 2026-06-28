using CasualExplorer.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CasualExplorer.Infrastructure.Persistence.Configurations;

/// <summary>
/// EF Core entity type configuration for <see cref="User"/>.
/// </summary>
internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(e => e.Email)
            .HasColumnName("email")
            .HasMaxLength(320)
            .IsRequired();

        builder.Property(e => e.Username)
            .HasColumnName("username")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(e => e.PasswordHash)
            .HasColumnName("password_hash")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(e => e.Role)
            .HasColumnName("role")
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(e => e.IsActive).HasColumnName("is_active").IsRequired();
        builder.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(e => e.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(e => e.LastLoginAt).HasColumnName("last_login_at");

        builder.HasIndex(e => e.Email).IsUnique().HasDatabaseName("uq_users_email");
        builder.HasIndex(e => e.Username).IsUnique().HasDatabaseName("uq_users_username");
    }
}
