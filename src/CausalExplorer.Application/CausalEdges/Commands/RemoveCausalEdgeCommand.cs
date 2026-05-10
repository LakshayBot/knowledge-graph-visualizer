using MediatR;

namespace CausalExplorer.Application.CausalEdges.Commands;

/// <summary>
/// Command to soft-delete a causal edge.
/// Permitted for the contributing user or Moderator/Admin roles.
/// </summary>
public sealed record RemoveCausalEdgeCommand(Guid Id) : IRequest;
