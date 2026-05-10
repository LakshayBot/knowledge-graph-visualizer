using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CausalExplorer.API.Filters;

/// <summary>
/// Action filter that enforces service-to-service API key authentication.
/// Used to restrict AI-sidecar–facing endpoints (e.g. event extraction callbacks).
/// The expected key is read from <c>ApiKey:ServiceKey</c> in configuration.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class ApiKeyAuthFilter : Attribute, IAuthorizationFilter
{
    private const string ApiKeyHeaderName = "X-Api-Key";

    /// <inheritdoc />
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var config = context.HttpContext.RequestServices
            .GetRequiredService<IConfiguration>();

        var expectedKey = config["ApiKey:ServiceKey"];

        if (string.IsNullOrWhiteSpace(expectedKey))
        {
            // No key configured → deny all service-to-service calls
            context.Result = new ObjectResult(new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title  = "API key not configured on server"
            })
            { StatusCode = StatusCodes.Status500InternalServerError };
            return;
        }

        if (!context.HttpContext.Request.Headers.TryGetValue(ApiKeyHeaderName, out var providedKey)
            || !string.Equals(providedKey, expectedKey, StringComparison.Ordinal))
        {
            context.Result = new ObjectResult(new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title  = "Invalid or missing API key"
            })
            { StatusCode = StatusCodes.Status401Unauthorized };
        }
    }
}
