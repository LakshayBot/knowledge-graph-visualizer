using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CasualExplorer.API.Controllers.v1;

/// <summary>
/// Lists available LLM providers and their models.
/// No authentication required — this is public metadata.
/// </summary>
[ApiVersion("1.0")]
[AllowAnonymous]
public sealed class ProvidersController : ApiControllerBase
{
    /// <summary>
    /// Returns the list of available AI providers and their supported models.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<ProviderDto>), StatusCodes.Status200OK)]
    public IActionResult GetProviders()
    {
        // Return the provider catalog — this is static metadata, no API call needed.
        // The frontend uses this to populate the provider/model dropdown.
        var providers = new List<ProviderDto>
        {
            new("grok",    "Grok (xAI)",        "xAI's Grok models — fast, cost-efficient casual reasoning.", true, new[]
            {
                new ModelDto("grok-3-mini", "Grok 3 Mini", 4000),
                new ModelDto("grok-3",      "Grok 3",      8000),
            }),
            new("openai",  "OpenAI",             "GPT-4o, GPT-4o-mini, o3-mini — industry-leading reasoning.", true, new[]
            {
                new ModelDto("gpt-4o",      "GPT-4o",      4096),
                new ModelDto("gpt-4o-mini", "GPT-4o Mini", 4096),
                new ModelDto("gpt-4-turbo", "GPT-4 Turbo", 4096),
                new ModelDto("o3-mini",     "o3 Mini",     4096),
            }),
            new("claude",  "Anthropic Claude",   "Claude models — nuanced, long-context reasoning.", true, new[]
            {
                new ModelDto("claude-opus-4-8",   "Claude Opus 4.8",   4096),
                new ModelDto("claude-sonnet-4-6", "Claude Sonnet 4.6", 4096),
                new ModelDto("claude-haiku-4-5",  "Claude Haiku 4.5",  4096),
            }),
            new("gemini",  "Google Gemini",       "Google's Gemini models — multimodal, strong reasoning.", true, new[]
            {
                new ModelDto("gemini-2.5-pro",   "Gemini 2.5 Pro",   4096),
                new ModelDto("gemini-2.5-flash", "Gemini 2.5 Flash", 4096),
            }),
            new("copilot", "GitHub Copilot",      "GitHub Copilot — code-aware reasoning (requires Copilot subscription).", true, new[]
            {
                new ModelDto("copilot-gpt-5", "Copilot GPT-5", 4096),
            }),
            new("ollama",  "Ollama (Local)",       "Run models locally — free, private, no API key needed.", false, new[]
            {
                new ModelDto("llama3.2", "Llama 3.2", 4096),
                new ModelDto("mistral",  "Mistral",   4096),
                new ModelDto("qwen2.5",  "Qwen 2.5",  4096),
            }),
        };
        return Ok(providers);
    }
}

/// <summary>DTO for a provider summary returned to the frontend.</summary>
public sealed record ProviderDto(
    string Name,
    string DisplayName,
    string Description,
    bool RequiresKey,
    ModelDto[] Models
);

/// <summary>DTO for a model summary returned to the frontend.</summary>
public sealed record ModelDto(
    string Name,
    string DisplayName,
    int MaxTokens
);
