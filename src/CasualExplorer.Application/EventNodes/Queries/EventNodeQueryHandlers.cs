using CasualExplorer.Application.Common.Exceptions;
using CasualExplorer.Application.Common.Interfaces;
using CasualExplorer.Application.Common.Mappings;
using CasualExplorer.Application.Common.Models;
using CasualExplorer.Application.Common.Options;
using CasualExplorer.Application.EventNodes.DTOs;
using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Enums;
using CasualExplorer.Domain.Interfaces;
using CasualExplorer.Domain.ValueObjects;
using MediatR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CasualExplorer.Application.EventNodes.Queries;

/// <summary>Handles <see cref="GetEventNodeByIdQuery"/>.</summary>
public sealed class GetEventNodeByIdQueryHandler
    : IRequestHandler<GetEventNodeByIdQuery, EventNodeDetailDto>
{
    private readonly IEventNodeRepository _eventNodeRepo;
    private readonly ICasualEdgeRepository _edgeRepo;

    /// <summary>Initialises the handler.</summary>
    public GetEventNodeByIdQueryHandler(
        IEventNodeRepository eventNodeRepo,
        ICasualEdgeRepository edgeRepo)
    {
        _eventNodeRepo = eventNodeRepo;
        _edgeRepo      = edgeRepo;
    }

    /// <inheritdoc />
    public async Task<EventNodeDetailDto> Handle(
        GetEventNodeByIdQuery request,
        CancellationToken cancellationToken)
    {
        var node = await _eventNodeRepo.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Domain.Entities.EventNode), request.Id);

        var incoming = await _edgeRepo.GetByToEventAsync(node.Id, cancellationToken);
        var outgoing = await _edgeRepo.GetByFromEventAsync(node.Id, cancellationToken);

        return node.ToDetailDto(incoming.Count, outgoing.Count);
    }
}

/// <summary>Handles <see cref="GetEventNodesPagedQuery"/>.</summary>
public sealed class GetEventNodesPagedQueryHandler
    : IRequestHandler<GetEventNodesPagedQuery, PagedResult<EventNodeSummaryDto>>
{
    private readonly IEventNodeRepository _eventNodeRepo;

    /// <summary>Initialises the handler.</summary>
    public GetEventNodesPagedQueryHandler(IEventNodeRepository eventNodeRepo)
    {
        _eventNodeRepo = eventNodeRepo;
    }

    /// <inheritdoc />
    public async Task<PagedResult<EventNodeSummaryDto>> Handle(
        GetEventNodesPagedQuery request,
        CancellationToken cancellationToken)
    {
        var nodes = await _eventNodeRepo.GetPagedAsync(
            request.Domain, request.Page, request.PageSize, cancellationToken);

        // Apply in-memory date filters (repository returns all within domain)
        var filtered = nodes.AsEnumerable();
        if (request.FromDate.HasValue)
            filtered = filtered.Where(n => n.EventDate >= request.FromDate.Value);
        if (request.ToDate.HasValue)
            filtered = filtered.Where(n => n.EventDate <= request.ToDate.Value);
        if (request.Perspective.HasValue)
            filtered = filtered.Where(n => n.Perspectives.Contains(request.Perspective.Value));

        var list = filtered.Select(n => n.ToSummaryDto()).ToList();

        return new PagedResult<EventNodeSummaryDto>(list, list.Count, request.Page, request.PageSize);
    }
}

/// <summary>
/// Handles <see cref="SearchEventNodesQuery"/> with a three-phase strategy:
/// <list type="number">
///   <item>Keyword search in Neo4j.</item>
///   <item>Semantic vector search via Qdrant (fallback when keyword returns nothing).</item>
///   <item>
///     On-demand knowledge-graph generation via Wikipedia + LLM (fallback when semantic
///     scores are all below <c>VectorSearch:RelevanceThreshold</c>, default 0.70).
///     Generated nodes are immediately persisted to Neo4j and Qdrant so future queries
///     are served from the database.
///   </item>
/// </list>
/// </summary>
public sealed class SearchEventNodesQueryHandler
    : IRequestHandler<SearchEventNodesQuery, PagedResult<EventNodeSummaryDto>>
{
    private readonly IEventNodeRepository      _eventNodeRepo;
    private readonly ICasualEdgeRepository     _edgeRepo;
    private readonly IVectorSearchService      _vectorSearch;
    private readonly IKnowledgeGraphGenerator  _graphGenerator;
    private readonly ILogger<SearchEventNodesQueryHandler> _logger;
    private readonly double                    _relevanceThreshold;

    /// <summary>Initialises the handler.</summary>
    public SearchEventNodesQueryHandler(
        IEventNodeRepository     eventNodeRepo,
        ICasualEdgeRepository    edgeRepo,
        IVectorSearchService     vectorSearch,
        IKnowledgeGraphGenerator graphGenerator,
        IOptions<SearchOptions>  searchOptions,
        ILogger<SearchEventNodesQueryHandler> logger)
    {
        _eventNodeRepo      = eventNodeRepo;
        _edgeRepo           = edgeRepo;
        _vectorSearch       = vectorSearch;
        _graphGenerator     = graphGenerator;
        _logger             = logger;
        _relevanceThreshold = searchOptions.Value.RelevanceThreshold;
    }

    /// <inheritdoc />
    public async Task<PagedResult<EventNodeSummaryDto>> Handle(
        SearchEventNodesQuery request,
        CancellationToken cancellationToken)
    {
        // ── Phase 1: keyword search ────────────────────────────────────────────
        var nodes = await _eventNodeRepo.SearchAsync(request.SearchText, cancellationToken);

        if (nodes.Count > 0)
        {
            return BuildPagedResult(nodes, request, wasAutoGenerated: false, sources: []);
        }

        // ── Phase 2: semantic vector search ────────────────────────────────────
        var similar = await _vectorSearch.SearchSimilarAsync(
            request.SearchText, topK: 20, cancellationToken);

        bool allBelowThreshold = similar.Count == 0
            || similar.All(s => s.Score < _relevanceThreshold);

        if (!allBelowThreshold)
        {
            var semanticNodes = new List<EventNode>();
            foreach (var hit in similar)
            {
                var node = await _eventNodeRepo.GetByIdAsync(hit.EventId, cancellationToken);
                if (node is not null)
                    semanticNodes.Add(node);
            }
            return BuildPagedResult(semanticNodes, request, wasAutoGenerated: false, sources: []);
        }

        // ── Phase 3: auto-generate knowledge graph ─────────────────────────────
        _logger.LogInformation(
            "Search '{Query}': no relevant results found (best score={Score:F3}). " +
            "Triggering knowledge-graph generation.",
            request.SearchText,
            similar.Count > 0 ? similar.Max(s => s.Score) : 0.0);

        try
        {
            var graph = await _graphGenerator.GenerateAsync(request.SearchText, cancellationToken);

            if (graph.Events.Count == 0)
            {
                _logger.LogWarning("Knowledge-graph generation returned 0 events for '{Query}'.", request.SearchText);
                return PagedResult<EventNodeSummaryDto>.Empty(request.Page, request.PageSize);
            }

            // Persist generated nodes (skip if already cached / already in DB)
            var persistedNodes = new List<EventNode>();
            foreach (var dto in graph.Events)
            {
                var id = Guid.Parse(dto.Id);

                // Skip if already in DB (cache hit from sidecar means IDs are stable)
                if (await _eventNodeRepo.ExistsAsync(id, cancellationToken))
                {
                    var existing = await _eventNodeRepo.GetByIdAsync(id, cancellationToken);
                    if (existing is not null) persistedNodes.Add(existing);
                    continue;
                }

                var domain     = NormaliseDomain(dto.Domain);
                var eventDate  = DateTime.TryParse(dto.EventDate, out var d)
                    ? DateTime.SpecifyKind(d, DateTimeKind.Utc)
                    : DateTime.UtcNow;

                var node = EventNode.Create(
                    title:           dto.Title,
                    summary:         dto.Summary,
                    eventDate:       eventDate,
                    domain:          domain,
                    confidenceScore: (decimal)Math.Round(dto.ConfidenceScore, 4),
                    freshnessScore:  (decimal)Math.Round(dto.FreshnessScore,  4));

                // Add Wikipedia source
                if (!string.IsNullOrWhiteSpace(dto.SourceUrl))
                {
                    node.AddSource(Source.Create(
                        url:              dto.SourceUrl,
                        title:            dto.SourceTitle,
                        publishedDate:    eventDate,
                        reliabilityScore: 0.8m,
                        sourceType:       Domain.Enums.SourceType.News));
                }

                // Override the auto-generated UUID with the one assigned by the AI sidecar
                // so edges can reference it by the same stable ID.
                SetId(node, id);

                persistedNodes.Add(node);
            }

            // Bulk-write nodes in one round-trip
            await _eventNodeRepo.BulkAddAsync(persistedNodes, cancellationToken);
            _logger.LogInformation("Persisted {Count} auto-generated EventNodes.", persistedNodes.Count);

            // Upsert Qdrant embeddings (fire-and-forget per node to avoid blocking)
            foreach (var node in persistedNodes)
            {
                var text = $"{node.Title}. {node.Summary}";
                _ = _vectorSearch.UpsertEventEmbeddingAsync(node.Id, text, CancellationToken.None);
            }

            // Persist generated edges
            if (graph.Edges.Count > 0)
            {
                var edges = new List<CasualEdge>();
                var idMap  = persistedNodes.ToDictionary(n => n.Id.ToString(), n => n.Id);

                foreach (var edgeDto in graph.Edges)
                {
                    if (!idMap.TryGetValue(edgeDto.FromEventId, out var fromId)) continue;
                    if (!idMap.TryGetValue(edgeDto.ToEventId,   out var toId))   continue;
                    if (fromId == toId) continue;

                    try
                    {
                        var edge = CasualEdge.Create(
                            fromEventId:      fromId,
                            toEventId:        toId,
                            relationshipType: NormaliseRelationshipType(edgeDto.RelationshipType),
                            strength:         (decimal)Math.Round(edgeDto.Strength, 4),
                            perspective:      NormalisePerspective(edgeDto.Perspective),
                            explanation:      edgeDto.Explanation,
                            isContested:      edgeDto.IsContested);

                        edges.Add(edge);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Skipped invalid generated edge: {From}→{To}",
                            edgeDto.FromEventId, edgeDto.ToEventId);
                    }
                }

                if (edges.Count > 0)
                {
                    await _edgeRepo.BulkAddAsync(edges, cancellationToken);
                    _logger.LogInformation("Persisted {Count} auto-generated CasualEdges.", edges.Count);
                }
            }

            return BuildPagedResult(
                persistedNodes,
                request,
                wasAutoGenerated: true,
                sources: graph.SourceUrls);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Knowledge-graph generation failed for query '{Query}'.", request.SearchText);
            // Return empty rather than 500 — the DB simply has no data for this topic yet.
            return PagedResult<EventNodeSummaryDto>.Empty(request.Page, request.PageSize);
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static PagedResult<EventNodeSummaryDto> BuildPagedResult(
        IEnumerable<EventNode> nodes,
        SearchEventNodesQuery  request,
        bool                   wasAutoGenerated,
        IReadOnlyList<string>  sources)
    {
        var list = nodes
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(n => n.ToSummaryDto())
            .ToList();

        return new PagedResult<EventNodeSummaryDto>(list, list.Count, request.Page, request.PageSize)
        {
            WasAutoGenerated     = wasAutoGenerated,
            GeneratedFromSources = sources,
        };
    }

    private static EventDomain NormaliseDomain(string raw) => raw.Trim() switch
    {
        "Geopolitics"   => EventDomain.Geopolitics,
        "Economics"     => EventDomain.Economics,
        "Technology"    => EventDomain.Technology,
        "Social"        => EventDomain.Social,
        "Environmental" => EventDomain.Environmental,
        "Military"      => EventDomain.Military,
        "Cultural"      => EventDomain.Cultural,
        _               => EventDomain.Geopolitics,
    };

    private static CasualRelationshipType NormaliseRelationshipType(string raw) => raw.Trim() switch
    {
        "DirectlyCaused"        => CasualRelationshipType.DirectlyCaused,
        "EnabledConditionsFor"  => CasualRelationshipType.EnabledConditionsFor,
        "ContributedTo"         => CasualRelationshipType.ContributedTo,
        "Contested"             => CasualRelationshipType.Contested,
        "Correlated"            => CasualRelationshipType.Correlated,
        _                       => CasualRelationshipType.ContributedTo,
    };

    private static Perspective NormalisePerspective(string raw) => raw.Trim() switch
    {
        "Mainstream"  => Perspective.Mainstream,
        "Geopolitical" => Perspective.Geopolitical,
        "Structural"  => Perspective.Structural,
        "Economic"    => Perspective.Economic,
        "Revisionist" => Perspective.Revisionist,
        _             => Perspective.Mainstream,
    };

    /// <summary>
    /// Overrides the auto-generated <see cref="Domain.Common.BaseEntity.Id"/> on the node
    /// with the stable UUID assigned by the AI sidecar, so edges can reference it correctly.
    /// </summary>
    private static void SetId(EventNode node, Guid id)
    {
        var prop = typeof(Domain.Common.BaseEntity)
            .GetProperty("Id",
                System.Reflection.BindingFlags.Instance |
                System.Reflection.BindingFlags.Public);
        prop?.SetValue(node, id);
    }
}

/// <summary>Handles <see cref="SearchSimilarEventNodesQuery"/>.</summary>
public sealed class SearchSimilarEventNodesQueryHandler
    : IRequestHandler<SearchSimilarEventNodesQuery, IReadOnlyList<EventNodeSummaryDto>>
{
    private readonly IVectorSearchService _vectorSearch;
    private readonly IEventNodeRepository _eventNodeRepo;

    /// <summary>Initialises the handler.</summary>
    public SearchSimilarEventNodesQueryHandler(
        IVectorSearchService vectorSearch,
        IEventNodeRepository eventNodeRepo)
    {
        _vectorSearch  = vectorSearch;
        _eventNodeRepo = eventNodeRepo;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<EventNodeSummaryDto>> Handle(
        SearchSimilarEventNodesQuery request,
        CancellationToken cancellationToken)
    {
        var results = await _vectorSearch.SearchSimilarAsync(request.Query, request.TopK, cancellationToken);

        var dtos = new List<EventNodeSummaryDto>();
        foreach (var result in results)
        {
            var node = await _eventNodeRepo.GetByIdAsync(result.EventId, cancellationToken);
            if (node is not null)
                dtos.Add(node.ToSummaryDto());
        }

        return dtos;
    }
}
