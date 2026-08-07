using CasualExplorer.Application.Auth.DTOs;
using MediatR;

namespace CasualExplorer.Application.Auth.Commands;

/// <summary>Command to register a new user account.</summary>
public sealed record RegisterCommand(
    string Email,
    string Username,
    string Password,
    string ConfirmPassword,
    string? TurnstileToken = null
) : IRequest<AuthResultDto>;

/// <summary>Command to authenticate a user and issue a token pair.</summary>
public sealed record LoginCommand(
    string Email,
    string Password,
    string? TurnstileToken = null
) : IRequest<AuthResultDto>;

/// <summary>Command to refresh an access token using a valid refresh token.</summary>
public sealed record RefreshTokenCommand(string RefreshToken) : IRequest<AuthResultDto>;

/// <summary>Command to revoke an existing refresh token.</summary>
public sealed record RevokeTokenCommand(string RefreshToken) : IRequest;

/// <summary>Command to update the current user's profile — username, email, and/or password.</summary>
public sealed record UpdateUserCommand(
    Guid UserId,
    string? Username = null,
    string? Email = null,
    string? CurrentPassword = null,
    string? NewPassword = null
) : IRequest<UserProfileDto>;
