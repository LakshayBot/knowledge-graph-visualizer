using System.Security.Claims;
using CasualExplorer.Application.Common.Interfaces;

namespace CasualExplorer.API.Services;

/// <summary>
/// Reads the current user's identity from the ASP.NET Core <see cref="IHttpContextAccessor"/>.
/// Registered as a scoped service so it captures the correct <see cref="HttpContext"/> per request.
/// </summary>
internal sealed class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    /// <summary>Initialises the service with the HTTP context accessor.</summary>
    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        => _httpContextAccessor = httpContextAccessor;

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    /// <inheritdoc />
    public Guid? UserId
    {
        get
        {
            var value = User?.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? User?.FindFirstValue("sub");

            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    /// <inheritdoc />
    public bool IsAuthenticated => User?.Identity?.IsAuthenticated is true;

    /// <inheritdoc />
    public string? Role => User?.FindFirstValue(ClaimTypes.Role)
                        ?? User?.FindFirstValue("role");
}
