using CasualExplorer.Domain.Entities;

namespace CasualExplorer.Application.Common.Interfaces;

/// <summary>
/// Generates and validates JWT tokens for user authentication.
/// </summary>
public interface ITokenService
{
    /// <summary>Generates a signed JWT access token for the given <paramref name="user"/>.</summary>
    string GenerateAccessToken(User user);

    /// <summary>Generates a cryptographically-random opaque refresh token string.</summary>
    string GenerateRefreshToken();

    /// <summary>
    /// Validates that <paramref name="refreshToken"/> is a currently-valid, un-revoked token.
    /// </summary>
    /// <returns><c>true</c> if valid; otherwise <c>false</c>.</returns>
    bool ValidateRefreshToken(string refreshToken);
}
