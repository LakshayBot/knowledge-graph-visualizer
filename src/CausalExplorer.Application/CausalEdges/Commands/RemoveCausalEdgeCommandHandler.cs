using CausalExplorer.Application.Common.Exceptions;
using CausalExplorer.Domain.Interfaces;
using MediatR;

namespace CausalExplorer.Application.CausalEdges.Commands;

/// <summary>Handles <see cref="RemoveCausalEdgeCommand"/>.</summary>
public sealed class RemoveCausalEdgeCommandHandler : IRequestHandler<RemoveCausalEdgeCommand>
{
    private readonly ICausalEdgeRepository _edgeRepo;
    private readonly IUnitOfWork _unitOfWork;

    /// <summary>Initialises the handler.</summary>
    public RemoveCausalEdgeCommandHandler(ICausalEdgeRepository edgeRepo, IUnitOfWork unitOfWork)
    {
        _edgeRepo   = edgeRepo;
        _unitOfWork = unitOfWork;
    }

    /// <inheritdoc />
    public async Task Handle(RemoveCausalEdgeCommand request, CancellationToken cancellationToken)
    {
        var edge = await _edgeRepo.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.CausalEdge), request.Id);

        _edgeRepo.Delete(edge);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
