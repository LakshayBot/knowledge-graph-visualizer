using CasualExplorer.Application.Common.Exceptions;
using CasualExplorer.Domain.Interfaces;
using MediatR;

namespace CasualExplorer.Application.CasualEdges.Commands;

/// <summary>Handles <see cref="RemoveCasualEdgeCommand"/>.</summary>
public sealed class RemoveCasualEdgeCommandHandler : IRequestHandler<RemoveCasualEdgeCommand>
{
    private readonly ICasualEdgeRepository _edgeRepo;
    private readonly IUnitOfWork _unitOfWork;

    /// <summary>Initialises the handler.</summary>
    public RemoveCasualEdgeCommandHandler(ICasualEdgeRepository edgeRepo, IUnitOfWork unitOfWork)
    {
        _edgeRepo   = edgeRepo;
        _unitOfWork = unitOfWork;
    }

    /// <inheritdoc />
    public async Task Handle(RemoveCasualEdgeCommand request, CancellationToken cancellationToken)
    {
        var edge = await _edgeRepo.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.CasualEdge), request.Id);

        _edgeRepo.Delete(edge);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
