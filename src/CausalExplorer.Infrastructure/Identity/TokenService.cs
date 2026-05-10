using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CausalExplorer.Application.Common.Interfaces;
using CausalExplorer.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace CausalExplorer.Infrastructure.Identity;

/// <summary>
/// JWT-based implementation of <see cref="ITokenService"/>.
/// Access tokens are signed HS256 JWTs with a 15-minute expiry.
/// Refresh tokens are 64-byte cryptographically-random base64 strings stored
/// out-of-band in the database (see <see cref="RefreshTokenStore"/>).
/// </summary>
public sealed class TokenService : ITokenService
{
    private readonly string _secret;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly RefreshTokenStore _refreshTokenStore;

    /// <summary>
    /// Initialises the service from application configuration.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// Thrown when any required JWT configuration value is missing or the secret is shorter than 32 characters.
    /// </exception>
    public TokenService(IConfiguration configuration, RefreshTokenStore refreshTokenStore)
    {
        _secret   = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is not configured.");
        _issuer   = configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException("Jwt:Issuer is not configured.");
        _audience = configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException("Jwt:Audience is not configured.");

        if (_secret.Length < 32)
            throw new InvalidOperationException("Jwt:Secret must be at least 32 characters long.");

        _refreshTokenStore = refreshTokenStore;
    }

    /// <inheritdoc />
    public string GenerateAccessToken(User user)
    {
        var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role,               user.Role.ToString()),
            new Claim("username",                    user.Username)
        };

        var token = new JwtSecurityToken(
            issuer:             _issuer,
            audience:           _audience,
            claims:             claims,
            notBefore:          DateTime.UtcNow,
            expires:            DateTime.UtcNow.AddMinutes(15),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <inheritdoc />
    public string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    /// <inheritdoc />
    public bool ValidateRefreshToken(string refreshToken) =>
        _refreshTokenStore.IsValid(refreshToken);
}
