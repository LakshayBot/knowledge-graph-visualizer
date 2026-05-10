namespace CausalExplorer.Application.Auth.DTOs;

/// <summary>Returned after a successful login or token refresh.</summary>
public sealed record AuthResultDto(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    Guid UserId,
    string Username,
    string Role);

/// <summary>Profile information for the current authenticated user.</summary>
public sealed record UserProfileDto(
    Guid Id,
    string Email,
    string Username,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? LastLoginAt);
