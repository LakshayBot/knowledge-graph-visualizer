using CasualExplorer.Application.Common.Exceptions;
using CasualExplorer.Application.Common.Interfaces;
using CasualExplorer.Domain.Interfaces;
using MediatR;

namespace CasualExplorer.Application.EventNodes.Commands;

/// <summary>Handles <see cref="DeleteEventNodeCommand"/>.</summary>
public sealed class DeleteEventNodeCommandHandler : IRequestHandler<DeleteEventNodeCommand>
{
    private readonly IEventNodeRepository _eventNodeRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IVectorSearchService _vectorSearch;

    /// <summary>Initialises the handler.</summary>
    public DeleteEventNodeCommandHandler(
        IEventNodeRepository eventNodeRepo,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IVectorSearchService vectorSearch)
    {
        _eventNodeRepo = eventNodeRepo;
        _unitOfWork    = unitOfWork;
        _currentUser   = currentUser;
        _vectorSearch  = vectorSearch;
    }

    /// <inheritdoc />
    public async Task Handle(DeleteEventNodeCommand request, CancellationToken cancellationToken)
    {
        var role = _currentUser.Role ?? string.Empty;
        if (role is not ("Moderator" or "Admin"))
            throw new ForbiddenAccessException("Only moderators and admins can delete event nodes.");

        var node = await _eventNodeRepo.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.EventNode), request.Id);

        await _eventNodeRepo.DeleteAsync(node, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _ = _vectorSearch.DeleteEmbeddingAsync(node.Id, CancellationToken.None);
    }
}
