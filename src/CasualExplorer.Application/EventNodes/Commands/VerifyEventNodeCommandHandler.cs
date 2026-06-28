using CasualExplorer.Application.Common.Exceptions;
using CasualExplorer.Application.Common.Interfaces;
using CasualExplorer.Application.Common.Mappings;
using CasualExplorer.Application.EventNodes.DTOs;
using CasualExplorer.Domain.Interfaces;
using MediatR;

namespace CasualExplorer.Application.EventNodes.Commands;

/// <summary>Handles <see cref="VerifyEventNodeCommand"/>.</summary>
public sealed class VerifyEventNodeCommandHandler
    : IRequestHandler<VerifyEventNodeCommand, EventNodeDetailDto>
{
    private readonly IEventNodeRepository _eventNodeRepo;
    private readonly ICasualEdgeRepository _edgeRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;

    /// <summary>Initialises the handler.</summary>
    public VerifyEventNodeCommandHandler(
        IEventNodeRepository eventNodeRepo,
        ICasualEdgeRepository edgeRepo,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser)
    {
        _eventNodeRepo = eventNodeRepo;
        _edgeRepo      = edgeRepo;
        _unitOfWork    = unitOfWork;
        _currentUser   = currentUser;
    }

    /// <inheritdoc />
    public async Task<EventNodeDetailDto> Handle(
        VerifyEventNodeCommand request,
        CancellationToken cancellationToken)
    {
        var role = _currentUser.Role ?? string.Empty;
        if (role is not ("Moderator" or "Admin"))
            throw new ForbiddenAccessException("Only moderators and admins can verify event nodes.");

        var node = await _eventNodeRepo.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.EventNode), request.Id);

        node.Verify(request.VerifiedByUserId);

        await _eventNodeRepo.UpdateAsync(node, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var incoming = await _edgeRepo.GetByToEventAsync(node.Id, cancellationToken);
        var outgoing = await _edgeRepo.GetByFromEventAsync(node.Id, cancellationToken);

        return node.ToDetailDto(incoming.Count, outgoing.Count);
    }
}
