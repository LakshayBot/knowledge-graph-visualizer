using CasualExplorer.Application.Common.Exceptions;
using CasualExplorer.Application.Common.Interfaces;
using CasualExplorer.Application.Common.Mappings;
using CasualExplorer.Application.EventNodes.DTOs;
using CasualExplorer.Domain.Enums;
using CasualExplorer.Domain.Interfaces;
using CasualExplorer.Domain.ValueObjects;
using MediatR;

namespace CasualExplorer.Application.EventNodes.Commands;

/// <summary>Handles <see cref="UpdateEventNodeCommand"/>.</summary>
public sealed class UpdateEventNodeCommandHandler
    : IRequestHandler<UpdateEventNodeCommand, EventNodeDetailDto>
{
    private readonly IEventNodeRepository _eventNodeRepo;
    private readonly ICasualEdgeRepository _edgeRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IVectorSearchService _vectorSearch;

    /// <summary>Initialises the handler.</summary>
    public UpdateEventNodeCommandHandler(
        IEventNodeRepository eventNodeRepo,
        ICasualEdgeRepository edgeRepo,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IVectorSearchService vectorSearch)
    {
        _eventNodeRepo = eventNodeRepo;
        _edgeRepo      = edgeRepo;
        _unitOfWork    = unitOfWork;
        _currentUser   = currentUser;
        _vectorSearch  = vectorSearch;
    }

    /// <inheritdoc />
    public async Task<EventNodeDetailDto> Handle(
        UpdateEventNodeCommand request,
        CancellationToken cancellationToken)
    {
        var node = await _eventNodeRepo.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.EventNode), request.Id);

        var role = _currentUser.Role ?? string.Empty;
        if (role is not ("Moderator" or "Admin"))
            throw new ForbiddenAccessException("Only moderators and admins can update event nodes.");

        node.UpdateDescription(request.Title, request.Summary);
        node.UpdateScores(request.ConfidenceScore, request.FreshnessScore);

        foreach (var p in request.Perspectives)
        {
            if (Enum.TryParse<Perspective>(p, ignoreCase: true, out var perspective))
                node.AddPerspective(perspective);
        }

        await _eventNodeRepo.UpdateAsync(node, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _ = _vectorSearch.UpsertEventEmbeddingAsync(
            node.Id, $"{node.Title} {node.Summary}", CancellationToken.None);

        var incoming = await _edgeRepo.GetByToEventAsync(node.Id, cancellationToken);
        var outgoing = await _edgeRepo.GetByFromEventAsync(node.Id, cancellationToken);

        return node.ToDetailDto(incoming.Count, outgoing.Count);
    }
}
