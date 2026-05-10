using CausalExplorer.Application.CausalEdges.DTOs;
using CausalExplorer.Application.Common.Exceptions;
using CausalExplorer.Application.Common.Mappings;
using CausalExplorer.Domain.Interfaces;
using MediatR;

namespace CausalExplorer.Application.CausalEdges.Commands;

/// <summary>Handles <see cref="UpdateCausalEdgeCommand"/>.</summary>
public sealed class UpdateCausalEdgeCommandHandler : IRequestHandler<UpdateCausalEdgeCommand, CausalEdgeDto>
{
    private readonly ICausalEdgeRepository _edgeRepo;
    private readonly IUnitOfWork _unitOfWork;

    /// <summary>Initialises the handler.</summary>
    public UpdateCausalEdgeCommandHandler(ICausalEdgeRepository edgeRepo, IUnitOfWork unitOfWork)
    {
        _edgeRepo   = edgeRepo;
        _unitOfWork = unitOfWork;
    }

    /// <inheritdoc />
    public async Task<CausalEdgeDto> Handle(
        UpdateCausalEdgeCommand request,
        CancellationToken cancellationToken)
    {
        var edge = await _edgeRepo.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.CausalEdge), request.Id);

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
