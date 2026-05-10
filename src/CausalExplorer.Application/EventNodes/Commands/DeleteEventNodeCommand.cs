using MediatR;

namespace CausalExplorer.Application.EventNodes.Commands;

/// <summary>Command to soft-delete an event node. Requires Moderator or Admin role.</summary>
public sealed record DeleteEventNodeCommand(Guid Id) : IRequest;
