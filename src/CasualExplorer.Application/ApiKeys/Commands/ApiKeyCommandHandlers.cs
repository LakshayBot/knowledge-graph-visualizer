using CasualExplorer.Application.ApiKeys.Commands;
using CasualExplorer.Application.ApiKeys.DTOs;
using CasualExplorer.Application.Common.Exceptions;
using CasualExplorer.Application.Common.Interfaces;
using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CasualExplorer.Application.ApiKeys.Commands;

/// <summary>
/// Handlers for API key management commands and queries.
/// </summary>
internal sealed class ApiKeyCommandHandlers :
    IRequestHandler<SetApiKeyCommand, ApiKeyStatusDto>,
    IRequestHandler<RemoveApiKeyCommand>,
    IRequestHandler<GetApiKeysQuery, ApiKeyListDto>
{
    private readonly IUserApiKeyRepository _repo;
    private readonly IApiKeyEncryptionService _encryption;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<ApiKeyCommandHandlers> _logger;

    // Valid provider names
    private static readonly HashSet<string> ValidProviders = new(StringComparer.OrdinalIgnoreCase)
    {
        "grok", "openai", "claude", "gemini", "copilot", "ollama"
    };

    // Providers that are not yet available (Coming Soon)
    private static readonly HashSet<string> ComingSoonProviders = new(StringComparer.OrdinalIgnoreCase)
    {
        "openai", "claude", "gemini", "copilot"
    };

    // Provider display names
    private static readonly Dictionary<string, string> ProviderDisplayNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["grok"]    = "Grok (xAI)",
        ["openai"]  = "OpenAI",
        ["claude"]  = "Anthropic Claude",
        ["gemini"]  = "Google Gemini",
        ["copilot"] = "GitHub Copilot",
        ["ollama"]  = "Ollama (Local)",
    };

    public ApiKeyCommandHandlers(
        IUserApiKeyRepository repo,
        IApiKeyEncryptionService encryption,
        IUnitOfWork unitOfWork,
        ILogger<ApiKeyCommandHandlers> logger)
    {
        _repo        = repo;
        _encryption  = encryption;
        _unitOfWork  = unitOfWork;
        _logger      = logger;
    }

    /// <summary>
    /// Sets (adds or updates) an API key for a provider.
    /// The key is encrypted before storage.
    /// </summary>
    public async Task<ApiKeyStatusDto> Handle(SetApiKeyCommand request, CancellationToken ct)
    {
        var provider = request.Provider.ToLowerInvariant().Trim();

        if (!ValidProviders.Contains(provider))
            throw new ValidationException([
                new FluentValidation.Results.ValidationFailure(
                    nameof(request.Provider),
                    $"Unsupported provider: {provider}. Supported: {string.Join(", ", ValidProviders)}")
            ]);

        if (ComingSoonProviders.Contains(provider))
            throw new ValidationException([
                new FluentValidation.Results.ValidationFailure(
                    nameof(request.Provider),
                    $"{ProviderDisplayNames.GetValueOrDefault(provider, provider)} is coming soon — API keys are not yet accepted for this provider.")
            ]);

        if (string.IsNullOrWhiteSpace(request.ApiKey))
            throw new ValidationException([
                new FluentValidation.Results.ValidationFailure(
                    nameof(request.ApiKey),
                    "API key must not be empty.")
            ]);

        // Trim and validate basic format
        var key = request.ApiKey.Trim();
        var keyPrefix = key.Length <= 12 ? key : key[..8] + "...";

        // Encrypt the key
        var encrypted = _encryption.Encrypt(key);

        // Upsert: check if user already has a key for this provider
        var existing = await _repo.GetByUserAndProviderAsync(request.UserId, provider, ct);

        if (existing is not null)
        {
            existing.UpdateKey(encrypted, keyPrefix);
            _repo.Update(existing);
            _logger.LogInformation("User {UserId} updated API key for {Provider}", request.UserId, provider);
        }
        else
        {
            var newKey = UserApiKey.Create(request.UserId, provider, encrypted, keyPrefix);
            await _repo.AddAsync(newKey, ct);
            _logger.LogInformation("User {UserId} added API key for {Provider}", request.UserId, provider);
        }

        await _unitOfWork.SaveChangesAsync(ct);

        return new ApiKeyStatusDto(
            Provider: provider,
            ProviderDisplayName: ProviderDisplayNames.GetValueOrDefault(provider, provider),
            HasKey: true,
            KeyPrefix: keyPrefix,
            IsActive: true,
            IsComingSoon: false,
            LastVerifiedAt: existing?.LastVerifiedAt
        );
    }

    /// <summary>
    /// Removes the API key for a provider.
    /// </summary>
    public async Task Handle(RemoveApiKeyCommand request, CancellationToken ct)
    {
        var provider = request.Provider.ToLowerInvariant().Trim();
        var existing = await _repo.GetByUserAndProviderAsync(request.UserId, provider, ct);

        if (existing is not null)
        {
            _repo.Delete(existing);
            _logger.LogInformation("User {UserId} removed API key for {Provider}", request.UserId, provider);
            await _unitOfWork.SaveChangesAsync(ct);
        }
    }

    /// <summary>
    /// Gets all API keys for the current user.
    /// </summary>
    public async Task<ApiKeyListDto> Handle(GetApiKeysQuery request, CancellationToken ct)
    {
        var keys = await _repo.GetAllByUserAsync(request.UserId, ct);

        var statuses = ValidProviders.Select(p =>
        {
            var key = keys.FirstOrDefault(k => k.Provider.Equals(p, StringComparison.OrdinalIgnoreCase));
            return new ApiKeyStatusDto(
                Provider: p,
                ProviderDisplayName: ProviderDisplayNames.GetValueOrDefault(p, p),
                HasKey: key is not null && key.IsActive,
                KeyPrefix: key?.KeyPrefix,
                IsActive: key?.IsActive ?? false,
                IsComingSoon: ComingSoonProviders.Contains(p),
                LastVerifiedAt: key?.LastVerifiedAt
            );
        }).ToList();

        return new ApiKeyListDto(statuses);
    }
}
