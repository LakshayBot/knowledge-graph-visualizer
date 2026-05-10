using CausalExplorer.Application.Auth.DTOs;
using MediatR;

namespace CausalExplorer.Application.Auth.Queries;

/// <summary>Returns the profile of the currently authenticated user.</summary>
public sealed record GetCurrentUserQuery(Guid UserId) : IRequest<UserProfileDto>;
