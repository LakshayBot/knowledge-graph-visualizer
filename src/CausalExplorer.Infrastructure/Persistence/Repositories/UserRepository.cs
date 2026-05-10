using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CausalExplorer.Infrastructure.Persistence.Repositories;

/// <summary>
/// EF Core implementation of <see cref="IUserRepository"/>.
/// </summary>
internal sealed class UserRepository : IUserRepository
{
    private readonly CausalExplorerDbContext _context;

    /// <summary>Initialises a new instance of <see cref="UserRepository"/>.</summary>
    public UserRepository(CausalExplorerDbContext context) => _context = context;

    /// <inheritdoc />
    public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

    /// <inheritdoc />
    public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant().Trim(), cancellationToken);

    /// <inheritdoc />
    public Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default) =>
        _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == username.Trim(), cancellationToken);

    /// <inheritdoc />
    public Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken = default) =>
        _context.Users.AnyAsync(u => u.Email == email.ToLowerInvariant().Trim(), cancellationToken);

    /// <inheritdoc />
    public Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken = default) =>
        _context.Users.AnyAsync(u => u.Username == username.Trim(), cancellationToken);

    /// <inheritdoc />
    public async Task AddAsync(User user, CancellationToken cancellationToken = default) =>
        await _context.Users.AddAsync(user, cancellationToken);

    /// <inheritdoc />
    public void Update(User user) => _context.Users.Update(user);
}
