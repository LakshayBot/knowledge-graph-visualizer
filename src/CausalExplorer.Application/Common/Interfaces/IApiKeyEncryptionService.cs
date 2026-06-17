namespace CausalExplorer.Application.Common.Interfaces;

/// <summary>
/// Contract for encrypting and decrypting user-provided API keys at rest.
/// </summary>
public interface IApiKeyEncryptionService
{
    /// <summary>Encrypts a plaintext API key and returns the Base64-encoded ciphertext.</summary>
    string Encrypt(string plaintextKey);

    /// <summary>Decrypts a Base64-encoded ciphertext and returns the original plaintext key.</summary>
    string Decrypt(string encryptedBase64);
}
