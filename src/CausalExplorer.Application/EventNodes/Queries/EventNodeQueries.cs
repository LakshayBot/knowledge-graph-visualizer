using CausalExplorer.Application.Common.Models;
using CausalExplorer.Application.EventNodes.DTOs;
using CausalExplorer.Domain.Enums;
using MediatR;

namespace CausalExplorer.Application.EventNodes.Queries;

/// <summary>Query to retrieve a single event node by ID with edge counts.</summary>
public sealed record GetEventNodeByIdQuery(Guid Id) : IRequest<EventNodeDetailDto>;

/// <summary>Query to retrieve a paged list of event nodes with optional filters.</summary>
public sealed record GetEventNodesPagedQuery(
    EventDomain? Domain,
    Perspective? Perspective,
    DateTime? FromDate,
    DateTime? ToDate,
    int Page = 1,
    int PageSize = 20
) : IRequest<PagedResult<EventNodeSummaryDto>>;

/// <summary>Query to perform full-text search over event node titles and summaries.</summary>
public sealed record SearchEventNodesQuery(string SearchText, int Page = 1, int PageSize = 20)
    : IRequest<PagedResult<EventNodeSummaryDto>>;

/// <summary>Query to perform semantic vector search for similar event nodes.</summary>
public sealed record SearchSimilarEventNodesQuery(string Query, int TopK = 10)
    : IRequest<IReadOnlyList<EventNodeSummaryDto>>;
