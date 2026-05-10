using CausalExplorer.Application.CausalChains.DTOs;
using CausalExplorer.Application.Common.Exceptions;
using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Interfaces;
using MediatR;

namespace CausalExplorer.Application.CausalChains.Commands;

/// <summary>Handles <see cref="CreateCausalChainCommand"/>.</summary>
public sealed class CreateCausalChainCommandHandler
    : IRequestHandler<CreateCausalChainCommand, CausalChainSummaryDto>
{
    private readonly ICausalChainRepository _chainRepo;
    private readonly IEventNodeRepository _nodeRepo;
    private readonly IUnitOfWork _unitOfWork;

    /// <summary>Initialises the handler.</summary>
    public CreateCausalChainCommandHandler(
        ICausalChainRepository chainRepo,
        IEventNodeRepository nodeRepo,
        IUnitOfWork unitOfWork)
    {
        _chainRepo  = chainRepo;
        _nodeRepo   = nodeRepo;
        _unitOfWork = unitOfWork;
    }

    /// <inheritdoc />
    public async Task<CausalChainSummaryDto> Handle(
        CreateCausalChainCommand request,
        CancellationToken cancellationToken)
    {
        var rootExists = await _nodeRepo.ExistsAsync(request.RootEventId, cancellationToken);
        if (!rootExists)
            throw new NotFoundException(nameof(EventNode), request.RootEventId);

        var chain = CausalChain.Create(request.RootEventId, request.Title, request.Domain);

        await _chainRepo.AddAsync(chain, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new CausalChainSummaryDto(
            chain.Id,
            chain.RootEventId,
            chain.Title,
            chain.Domain.ToString(),
            chain.NodeCount,
            chain.ViewCount,
            chain.CreatedAt,
            chain.LastUpdatedAt);
    }
}

/// <summary>Handles <see cref="SaveChainCommand"/>.</summary>
public sealed class SaveChainCommandHandler : IRequestHandler<SaveChainCommand, SavedChainDto>
{
    private readonly ICausalChainRepository _chainRepo;
    private readonly IUserSavedChainRepository _savedChainRepo;
    private readonly IUnitOfWork _unitOfWork;

    /// <summary>Initialises the handler.</summary>
    public SaveChainCommandHandler(
        ICausalChainRepository chainRepo,
        IUserSavedChainRepository savedChainRepo,
        IUnitOfWork unitOfWork)
    {
        _chainRepo      = chainRepo;
        _savedChainRepo = savedChainRepo;
        _unitOfWork     = unitOfWork;
    }

    /// <inheritdoc />
    public async Task<SavedChainDto> Handle(SaveChainCommand request, CancellationToken cancellationToken)
    {
        var chain = await _chainRepo.GetByIdAsync(request.ChainId, cancellationToken)
            ?? throw new NotFoundException(nameof(CausalChain), request.ChainId);

        var saved = UserSavedChain.Create(request.UserId, request.ChainId, request.Notes);
        await _savedChainRepo.AddAsync(saved, cancellationToken);

        chain.RecordView();
        _chainRepo.Update(chain);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new SavedChainDto(
            saved.ChainId,
            chain.Title,
            chain.Domain.ToString(),
            chain.NodeCount,
            saved.SavedAt,
            saved.Notes);
    }
}
