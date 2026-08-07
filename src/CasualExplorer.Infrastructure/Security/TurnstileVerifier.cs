using System.Text.Json;
using CasualExplorer.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CasualExplorer.Infrastructure.Security;

/// <summary>
/// Server-side Cloudflare Turnstile verification.
/// Browser → user's backend → siteverify (never from the browser directly).
/// </summary>
public sealed class TurnstileVerifier : ITurnstileVerifier
{
    private const string SiteVerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    private const int MaxTokenLength = 2048;

    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<TurnstileVerifier> _logger;

    public TurnstileVerifier(
        HttpClient http,
        IConfiguration config,
        IHttpContextAccessor httpContextAccessor,
        ILogger<TurnstileVerifier> logger)
    {
        _http                = http;
        _config              = config;
        _httpContextAccessor = httpContextAccessor;
        _logger              = logger;
    }

    public async Task<bool> VerifyAsync(string expectedAction, string? token, CancellationToken ct = default)
    {
        var secret = _config["Turnstile:Secret"]?.Trim() ?? "";

        // Not configured → protection disabled (local/dev environments).
        if (string.IsNullOrEmpty(secret))
        {
            _logger.LogDebug("Turnstile verification skipped: Turnstile:Secret not configured.");
            return true;
        }

        if (string.IsNullOrEmpty(token) || token.Length > MaxTokenLength)
        {
            _logger.LogWarning("Turnstile verification failed: missing or oversized token for action {Action}.", expectedAction);
            return false;
        }

        var allowedHostnames = (_config["Turnstile:Hostnames"] ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (allowedHostnames.Length == 0)
        {
            _logger.LogWarning("Turnstile verification failed: Turnstile:Hostnames is empty.");
            return false;
        }

        var form = new Dictionary<string, string>
        {
            ["secret"]   = secret,
            ["response"] = token,
        };

        var remoteIp = ResolveClientIp();
        if (!string.IsNullOrEmpty(remoteIp))
            form["remoteip"] = remoteIp;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, SiteVerifyUrl)
            {
                Content = new FormUrlEncodedContent(form),
            };

            using var response = await _http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Turnstile siteverify returned HTTP {Status}.", (int)response.StatusCode);
                return false;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

            var root = doc.RootElement;
            var success = root.TryGetProperty("success", out var s) && s.GetBoolean();
            var action = root.TryGetProperty("action", out var a) ? a.GetString() : null;
            var hostname = root.TryGetProperty("hostname", out var h) ? h.GetString() : null;

            if (!success)
            {
                _logger.LogWarning(
                    "Turnstile siteverify rejected token for action {Action} (error-codes: {Codes}).",
                    expectedAction, string.Join(",", root.TryGetProperty("error-codes", out var c) ? c.EnumerateArray().Select(e => e.GetString()) : []));
                return false;
            }

            if (!string.Equals(action, expectedAction, StringComparison.Ordinal))
            {
                _logger.LogWarning("Turnstile action mismatch: expected {Expected}, got {Actual}.", expectedAction, action);
                return false;
            }

            if (string.IsNullOrEmpty(hostname) || !allowedHostnames.Contains(hostname, StringComparer.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Turnstile hostname mismatch: {Hostname} not in allowlist.", hostname);
                return false;
            }

            _logger.LogInformation("Turnstile verification passed for action {Action} from {Hostname}.", expectedAction, hostname);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Turnstile siteverify request failed for action {Action}; failing closed.", expectedAction);
            return false;
        }
    }

    private string? ResolveClientIp()
    {
        var context = _httpContextAccessor.HttpContext;
        if (context is null) return null;

        // Respect the reverse-proxy forwarded header (Caddy/Cloudflare) first.
        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
            return forwarded.Split(',')[0].Trim();

        return context.Connection.RemoteIpAddress?.ToString();
    }
}
