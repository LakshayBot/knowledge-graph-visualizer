using CausalExplorer.Application.Auth.DTOs;
using CausalExplorer.Application.Common.Exceptions;
using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Interfaces;
using MediatR;

namespace CausalExplorer.Application.Auth.Queries;

/// <summary>Handles <see cref="GetCurrentUserQuery"/>.</summary>
public sealed class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, UserProfileDto>
{
    private readonly IUserRepository _userRepo;

    /// <summary>Initialises the handler.</summary>
    public GetCurrentUserQueryHandler(IUserRepository userRepo)
    {
        _userRepo = userRepo;
    }

    /// <inheritdoc />
    public async Task<UserProfileDto> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var user = await _userRepo.GetByIdAsync(request.UserId, cancellationToken)
            ?? throw new NotFoundException(nameof(User), request.UserId);

        return new UserProfileDto(
            user.Id,
            user.Email,
            user.Username,
            user.Role.ToString(),
            user.IsActive,
            user.CreatedAt,
            user.LastLoginAt);
    }
}
