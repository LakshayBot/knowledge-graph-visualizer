using CasualExplorer.Application.CasualEdges.DTOs;
using CasualExplorer.Application.Common.Exceptions;
using CasualExplorer.Application.Common.Mappings;
using CasualExplorer.Domain.Interfaces;
using MediatR;

namespace CasualExplorer.Application.CasualEdges.Commands;

/// <summary>Handles <see cref="UpdateCasualEdgeCommand"/>.</summary>
public sealed class UpdateCasualEdgeCommandHandler : IRequestHandler<UpdateCasualEdgeCommand, CasualEdgeDto>
{
    private readonly ICasualEdgeRepository _edgeRepo;
    private readonly IUnitOfWork _unitOfWork;

    /// <summary>Initialises the handler.</summary>
    public UpdateCasualEdgeCommandHandler(ICasualEdgeRepository edgeRepo, IUnitOfWork unitOfWork)
    {
        _edgeRepo   = edgeRepo;
        _unitOfWork = unitOfWork;
    }

    /// <inheritdoc />
    public async Task<CasualEdgeDto> Handle(
        UpdateCasualEdgeCommand request,
        CancellationToken cancellationToken)
    {
        var edge = await _edgeRepo.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.CasualEdge), request.Id);

        if (!string.IsNullOrWhiteSpace(request.Explanation))
            edge.UpdateExplanation(request.Explanation);

        if (request.Strength.HasValue)
            edge.UpdateStrength(request.Strength.Value);

        if (request.IsContested.HasValue)
            edge.SetContested(request.IsContested.Value);

        _edgeRepo.Update(edge);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return edge.ToDto();
    }
}
