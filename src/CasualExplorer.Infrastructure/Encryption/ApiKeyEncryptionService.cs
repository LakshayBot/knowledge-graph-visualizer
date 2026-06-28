using System.Text;
using CasualExplorer.Application.Common.Interfaces;
using Microsoft.AspNetCore.DataProtection;

namespace CasualExplorer.Infrastructure.Encryption;

/// <summary>
/// ASP.NET Core Data Protection-based implementation of <see cref="IApiKeyEncryptionService"/>.
/// Uses a dedicated purpose string for key isolation.
/// </summary>
internal sealed class ApiKeyEncryptionService : IApiKeyEncryptionService
{
    private readonly IDataProtector _protector;

    /// <summary>
    /// Initialises the service with a Data Protection provider.
    /// The purpose string ensures keys encrypted by this service cannot be
    /// decrypted by other protectors, even with access to the same key ring.
    /// </summary>
    public ApiKeyEncryptionService(IDataProtectionProvider provider)
    {
        _protector = provider.CreateProtector("CasualExplorer.UserApiKey.v1");
    }

    /// <inheritdoc />
    public string Encrypt(string plaintextKey)
    {
        if (string.IsNullOrWhiteSpace(plaintextKey))
            throw new ArgumentException("API key must not be empty.", nameof(plaintextKey));

        var plaintextBytes = Encoding.UTF8.GetBytes(plaintextKey);
        var protectedBytes = _protector.Protect(plaintextBytes);
        return Convert.ToBase64String(protectedBytes);
    }

    /// <inheritdoc />
    public string Decrypt(string encryptedBase64)
    {
        if (string.IsNullOrWhiteSpace(encryptedBase64))
            throw new ArgumentException("Encrypted key must not be empty.", nameof(encryptedBase64));

        var protectedBytes = Convert.FromBase64String(encryptedBase64);
        var plaintextBytes = _protector.Unprotect(protectedBytes);
        return Encoding.UTF8.GetString(plaintextBytes);
    }
}
