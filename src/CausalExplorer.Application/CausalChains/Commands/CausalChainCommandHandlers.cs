using CausalExplorer.Application.CausalChains.DTOs;
using CausalExplorer.Application.Common.Exceptions;
using CausalExplorer.Application.Common.Interfaces;
using CausalExplorer.Domain.Common;
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
    private readonly IPostgresDataStore _pgStore;

    /// <summary>Initialises the handler.</summary>
    public CreateCausalChainCommandHandler(
        ICausalChainRepository chainRepo,
        IEventNodeRepository nodeRepo,
        IUnitOfWork unitOfWork,
        IPostgresDataStore pgStore)
    {
        _chainRepo  = chainRepo;
        _nodeRepo   = nodeRepo;
        _unitOfWork = unitOfWork;
        _pgStore    = pgStore;
    }

    /// <inheritdoc />
    public async Task<CausalChainSummaryDto> Handle(
        CreateCausalChainCommand request,
        CancellationToken cancellationToken)
    {
        // Auto-create the root event node if it doesn't exist yet
        if (!await _nodeRepo.ExistsAsync(request.RootEventId, cancellationToken))
        {
            var eventNode = EventNode.Create(
                request.Title, $"Root event for '{request.Title}'", DateTime.UtcNow, request.Domain, 0.5m, 0.5m);
            // Use reflection to set the specific ID (consistent with existing patterns)
            typeof(BaseEntity).GetProperty("Id")?.SetValue(eventNode, request.RootEventId);
            await _nodeRepo.AddAsync(eventNode, cancellationToken);
        }

        var chain = CausalChain.Create(request.RootEventId, request.Title, request.Domain);

        await _chainRepo.AddAsync(chain, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Map root node to chain for chain-scoped loading
        await _pgStore.AddChainNodeMappingsAsync(chain.Id, new[] { request.RootEventId }, cancellationToken);

        // Initialize empty graph snapshot
        chain.SetGraphSnapshot("{\"nodes\":[],\"edges\":[]}");
        _chainRepo.Update(chain);
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

/// <summary>Handles <see cref="RemoveSavedChainCommand"/>.</summary>
public sealed class RemoveSavedChainCommandHandler : IRequestHandler<RemoveSavedChainCommand>
{
    private readonly IUserSavedChainRepository _savedChainRepo;
    private readonly IUnitOfWork _unitOfWork;

    public RemoveSavedChainCommandHandler(
        IUserSavedChainRepository savedChainRepo,
        IUnitOfWork unitOfWork)
    {
        _savedChainRepo = savedChainRepo;
        _unitOfWork     = unitOfWork;
    }

    public async Task Handle(RemoveSavedChainCommand request, CancellationToken cancellationToken)
    {
        var saved = await _savedChainRepo.GetAsync(request.UserId, request.ChainId, cancellationToken);
        if (saved is null) return;

        _savedChainRepo.Delete(saved);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
