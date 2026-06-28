using CasualExplorer.Application.EventNodes.DTOs;
using MediatR;

namespace CasualExplorer.Application.EventNodes.Commands;

/// <summary>
/// Command to mark an event node as verified. Requires Moderator or Admin role.
/// </summary>
public sealed record VerifyEventNodeCommand(Guid Id, Guid VerifiedByUserId)
    : IRequest<EventNodeDetailDto>;
