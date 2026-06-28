using CasualExplorer.Application.CasualEdges.DTOs;
using CasualExplorer.Application.Common.Exceptions;
using CasualExplorer.Application.Common.Interfaces;
using CasualExplorer.Application.Common.Mappings;
using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Interfaces;
using CasualExplorer.Domain.ValueObjects;
using MediatR;

namespace CasualExplorer.Application.CasualEdges.Commands;

/// <summary>Handles <see cref="AddCasualEdgeCommand"/>.</summary>
public sealed class AddCasualEdgeCommandHandler : IRequestHandler<AddCasualEdgeCommand, CasualEdgeDto>
{
    private readonly ICasualEdgeRepository _edgeRepo;
    private readonly IEventNodeRepository _nodeRepo;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAIService _aiService;

    /// <summary>Initialises the handler.</summary>
    public AddCasualEdgeCommandHandler(
        ICasualEdgeRepository edgeRepo,
        IEventNodeRepository nodeRepo,
        IUnitOfWork unitOfWork,
        IAIService aiService)
    {
        _edgeRepo  = edgeRepo;
        _nodeRepo  = nodeRepo;
        _unitOfWork = unitOfWork;
        _aiService  = aiService;
    }

    /// <inheritdoc />
    public async Task<CasualEdgeDto> Handle(
        AddCasualEdgeCommand request,
        CancellationToken cancellationToken)
    {
        if (request.FromEventId == request.ToEventId)
            throw new ConflictException("A casual edge cannot create a self-loop.");

        var fromExists = await _nodeRepo.ExistsAsync(request.FromEventId, cancellationToken);
        if (!fromExists)
            throw new NotFoundException(nameof(EventNode), request.FromEventId);

        var toExists = await _nodeRepo.ExistsAsync(request.ToEventId, cancellationToken);
        if (!toExists)
            throw new NotFoundException(nameof(EventNode), request.ToEventId);

        // Check for duplicate edge in same perspective
        var existing = await _edgeRepo.GetByFromEventAsync(request.FromEventId, cancellationToken);
        var duplicate = existing.Any(e =>
            e.ToEventId == request.ToEventId &&
            e.Perspective == request.Perspective &&
            e.RelationshipType == request.RelationshipType);

        if (duplicate)
            throw new ConflictException(
                "A casual edge with the same relationship type and perspective already exists between these nodes.");

        // Auto-generate explanation via AI if not provided
        string explanation;
        if (!string.IsNullOrWhiteSpace(request.Explanation))
        {
            explanation = request.Explanation;
        }
        else
        {
            var linkResult = await _aiService.GenerateCasualLinkAsync(
                request.FromEventId, request.ToEventId, cancellationToken);
            explanation = linkResult.Explanation;
        }

        var edge = CasualEdge.Create(
            request.FromEventId,
            request.ToEventId,
            request.RelationshipType,
            request.Strength,
            request.Perspective,
            explanation,
            request.IsContested);

        foreach (var s in request.Sources)
        {
            var source = Source.Create(s.Url, s.Title, s.PublishedDate, s.ReliabilityScore, s.SourceType);
            edge.AddSource(source);
        }

        await _edgeRepo.AddAsync(edge, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return edge.ToDto();
    }
}
