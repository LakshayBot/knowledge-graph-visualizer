using MediatR;

namespace CasualExplorer.Application.CasualEdges.Commands;

/// <summary>
/// Command to soft-delete a casual edge.
/// Permitted for the contributing user or Moderator/Admin roles.
/// </summary>
public sealed record RemoveCasualEdgeCommand(Guid Id) : IRequest;
