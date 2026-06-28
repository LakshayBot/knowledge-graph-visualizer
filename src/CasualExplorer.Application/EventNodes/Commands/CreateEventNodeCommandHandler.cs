using CasualExplorer.Application.Common.Exceptions;
using CasualExplorer.Application.Common.Interfaces;
using CasualExplorer.Application.Common.Mappings;
using CasualExplorer.Application.EventNodes.DTOs;
using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Interfaces;
using CasualExplorer.Domain.ValueObjects;
using MediatR;

namespace CasualExplorer.Application.EventNodes.Commands;

/// <summary>
/// Handles <see cref="CreateEventNodeCommand"/>: validates, persists, and triggers
/// vector embedding upsert via <see cref="IVectorSearchService"/>.
/// </summary>
public sealed class CreateEventNodeCommandHandler
    : IRequestHandler<CreateEventNodeCommand, EventNodeDetailDto>
{
    private readonly IEventNodeRepository _eventNodeRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IVectorSearchService _vectorSearch;

    /// <summary>Initialises the handler with required dependencies.</summary>
    public CreateEventNodeCommandHandler(
        IEventNodeRepository eventNodeRepo,
        IUnitOfWork unitOfWork,
        IVectorSearchService vectorSearch)
    {
        _eventNodeRepo = eventNodeRepo;
        _unitOfWork    = unitOfWork;
        _vectorSearch  = vectorSearch;
    }

    /// <inheritdoc />
    public async Task<EventNodeDetailDto> Handle(
        CreateEventNodeCommand request,
        CancellationToken cancellationToken)
    {
        var node = EventNode.Create(
            request.Title,
            request.Summary,
            request.EventDate,
            request.Domain,
            request.ConfidenceScore,
            request.FreshnessScore);

        foreach (var p in request.Perspectives)
        {
            if (Enum.TryParse<CasualExplorer.Domain.Enums.Perspective>(p, ignoreCase: true, out var perspective))
                node.AddPerspective(perspective);
        }

        foreach (var s in request.Sources)
        {
            var source = Source.Create(s.Url, s.Title, s.PublishedDate, s.ReliabilityScore, s.SourceType);
            node.AddSource(source);
        }

        await _eventNodeRepo.AddAsync(node, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Fire-and-forget: upsert vector embedding (non-blocking to avoid coupling)
        _ = _vectorSearch.UpsertEventEmbeddingAsync(
            node.Id, $"{node.Title} {node.Summary}", CancellationToken.None);

        return node.ToDetailDto(incomingEdgeCount: 0, outgoingEdgeCount: 0);
    }
}
