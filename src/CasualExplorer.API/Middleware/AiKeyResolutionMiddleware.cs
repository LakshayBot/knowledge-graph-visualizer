using System.Security.Claims;
using CasualExplorer.Application.Common.Interfaces;
using CasualExplorer.Domain.Interfaces;

namespace CasualExplorer.API.Middleware;

/// <summary>
/// Middleware that runs after authentication and populates <see cref="IAiKeyContext"/>
/// with the current user's decrypted API key for the requested provider.
/// This enables the BYOK flow: user's key → IAiKeyContext → AIServiceClient → Python AI service.
/// </summary>
public sealed class AiKeyResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AiKeyResolutionMiddleware> _logger;

    public AiKeyResolutionMiddleware(RequestDelegate next, ILogger<AiKeyResolutionMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only resolve for authenticated users on AI-related endpoints
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var aiKeyContext = context.RequestServices.GetService<IAiKeyContext>();
            if (aiKeyContext is not null)
            {
                var userId = GetUserId(context.User);
                if (userId.HasValue)
                {
                    aiKeyContext.Configure(
                        provider: null,   // will be set from request body/headers downstream
                        model: null,
                        apiKey: null,     // resolved on-demand when needed
                        userId: userId.Value
                    );

                    // Read provider from request headers (sent by frontend ProviderModelSelector)
                    var provider = context.Request.Headers["X-Provider"].FirstOrDefault();
                    var model    = context.Request.Headers["X-Model"].FirstOrDefault();

                    if (!string.IsNullOrEmpty(provider))
                    {
                        // Look up and decrypt the user's key for this provider
                        var repo = context.RequestServices.GetService<IUserApiKeyRepository>();
                        var encrypt = context.RequestServices.GetService<IApiKeyEncryptionService>();

                        if (repo is not null && encrypt is not null)
                        {
                            var key = await repo.GetByUserAndProviderAsync(userId.Value, provider);
                            if (key is not null && key.IsActive)
                            {
                                try
                                {
                                    var decrypted = encrypt.Decrypt(key.KeyEncrypted);
                                    aiKeyContext.Configure(provider, model, decrypted, userId.Value);
                                    _logger.LogDebug(
                                        "BYOK key resolved for user {UserId}, provider {Provider}",
                                        userId.Value, provider);
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogWarning(ex,
                                        "BYOK key decryption failed for user {UserId}, provider {Provider}",
                                        userId.Value, provider);
                                }
                            }
                            else
                            {
                                _logger.LogDebug(
                                    "No BYOK key found for user {UserId}, provider {Provider}",
                                    userId.Value, provider);
                                aiKeyContext.Configure(provider, model, null, userId.Value);
                            }
                        }
                    }
                }
            }
        }

        await _next(context);
    }

    private static Guid? GetUserId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? user.FindFirstValue("sub");
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
