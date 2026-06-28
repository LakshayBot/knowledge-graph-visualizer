namespace CasualExplorer.Application.ApiKeys.DTOs;

/// <summary>Status of a single user API key for one provider.</summary>
public sealed record ApiKeyStatusDto(
    string Provider,
    string ProviderDisplayName,
    bool HasKey,
    string? KeyPrefix,
    bool IsActive,
    DateTime? LastVerifiedAt
);

/// <summary>Request to set (add or update) an API key for a provider.</summary>
public sealed record SetApiKeyRequest(string Provider, string ApiKey);

/// <summary>Summary of all API keys for the current user.</summary>
public sealed record ApiKeyListDto(List<ApiKeyStatusDto> Keys);
