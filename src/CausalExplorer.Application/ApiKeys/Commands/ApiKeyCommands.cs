using CausalExplorer.Application.ApiKeys.DTOs;
using MediatR;

namespace CausalExplorer.Application.ApiKeys.Commands;

/// <summary>Sets (adds or updates) an API key for a specific provider.</summary>
public sealed record SetApiKeyCommand(
    Guid UserId,
    string Provider,
    string ApiKey
) : IRequest<ApiKeyStatusDto>;

/// <summary>Removes the API key for a specific provider.</summary>
public sealed record RemoveApiKeyCommand(
    Guid UserId,
    string Provider
) : IRequest;

/// <summary>Gets all API keys for the current user.</summary>
public sealed record GetApiKeysQuery(Guid UserId) : IRequest<ApiKeyListDto>;
