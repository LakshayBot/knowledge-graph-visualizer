namespace CasualExplorer.Application.Common.Interfaces;

/// <summary>
/// Verifies Cloudflare Turnstile tokens server-side against
/// <c>https://challenges.cloudflare.com/turnstile/v0/siteverify</c>.
/// When <c>Turnstile:Secret</c> is not configured the verifier is disabled
/// (returns true) so local environments without the secret keep working.
/// </summary>
public interface ITurnstileVerifier
{
    /// <summary>
    /// Validates a Turnstile response token for the given surface action.
    /// Requires <c>success == true</c>, an exact <c>action</c> match, and a
    /// hostname present in the <c>Turnstile:Hostnames</c> allowlist.
    /// </summary>
    Task<bool> VerifyAsync(string expectedAction, string? token, CancellationToken ct = default);
}
