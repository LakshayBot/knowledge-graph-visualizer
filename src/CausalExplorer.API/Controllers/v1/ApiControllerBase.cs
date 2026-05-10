using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace CausalExplorer.API.Controllers.v1;

/// <summary>
/// Abstract base controller shared by all versioned API controllers.
/// Provides the common route template, <see cref="ISender"/> injection,
/// and baseline <see cref="ProducesResponseTypeAttribute"/> declarations.
/// </summary>
[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[Produces("application/json")]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public abstract class ApiControllerBase : ControllerBase
{
    private ISender? _sender;

    /// <summary>MediatR sender, resolved from DI on first access.</summary>
    protected ISender Sender =>
        _sender ??= HttpContext.RequestServices.GetRequiredService<ISender>();
}
