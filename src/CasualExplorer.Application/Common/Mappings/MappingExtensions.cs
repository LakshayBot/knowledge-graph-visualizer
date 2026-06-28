using CasualExplorer.Application.CasualEdges.DTOs;
using CasualExplorer.Application.EventNodes.DTOs;
using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.ValueObjects;

namespace CasualExplorer.Application.Common.Mappings;

/// <summary>
/// Manual mapping extension methods from Domain entities to Application DTOs.
/// These replace AutoMapper profiles for types that need custom logic (e.g. edge counts).
/// </summary>
public static class MappingExtensions
{
    // ── EventNode ─────────────────────────────────────────────────────────────

    /// <summary>Maps an <see cref="EventNode"/> to an <see cref="EventNodeDetailDto"/>.</summary>
    public static EventNodeDetailDto ToDetailDto(
        this EventNode node,
        int incomingEdgeCount,
        int outgoingEdgeCount) =>
        new(
            Id:                 node.Id,
            Title:              node.Title,
            Summary:            node.Summary,
            EventDate:          node.EventDate,
            Domain:             node.Domain.ToString(),
            ConfidenceScore:    node.ConfidenceScore,
            ConfidenceLevelLabel: node.GetConfidenceLevel().Kind.ToString(),
            FreshnessScore:     node.FreshnessScore,
            Perspectives:       node.Perspectives.Select(p => p.ToString()).ToList(),
            Sources:            node.Sources.Select(s => s.ToDto()).ToList(),
            IsVerified:         node.IsVerified,
            IncomingEdgeCount:  incomingEdgeCount,
            OutgoingEdgeCount:  outgoingEdgeCount,
            CreatedAt:          node.CreatedAt,
            UpdatedAt:          node.UpdatedAt);

    /// <summary>Maps an <see cref="EventNode"/> to an <see cref="EventNodeSummaryDto"/>.</summary>
    public static EventNodeSummaryDto ToSummaryDto(this EventNode node) =>
        new(
            Id:                  node.Id,
            Title:               node.Title,
            Summary:             node.Summary,
            EventDate:           node.EventDate,
            Domain:              node.Domain.ToString(),
            ConfidenceScore:     node.ConfidenceScore,
            ConfidenceLevelLabel: node.GetConfidenceLevel().Kind.ToString(),
            IsVerified:          node.IsVerified,
            CreatedAt:           node.CreatedAt);

    // ── Source ────────────────────────────────────────────────────────────────

    /// <summary>Maps a <see cref="Source"/> value object to a <see cref="SourceDto"/>.</summary>
    public static SourceDto ToDto(this Source source) =>
        new(
            Url:              source.Url,
            Title:            source.Title,
            PublishedDate:    source.PublishedDate,
            ReliabilityScore: source.ReliabilityScore,
            SourceType:       source.SourceType.ToString());

    // ── CasualEdge ────────────────────────────────────────────────────────────

    /// <summary>Maps a <see cref="CasualEdge"/> to a <see cref="CasualEdgeDto"/>.</summary>
    public static CasualEdgeDto ToDto(this CasualEdge edge) =>
        new(
            Id:               edge.Id,
            FromEventId:      edge.FromEventId,
            ToEventId:        edge.ToEventId,
            Strength:         edge.Strength,
            EdgeStyle:        edge.Strength switch
            {
                > 0.65m => EdgeStyle.Solid,
                > 0.35m => EdgeStyle.Dashed,
                _        => EdgeStyle.Dotted
            },
            RelationshipType: edge.RelationshipType.ToString(),
            Perspective:      edge.Perspective.ToString(),
            Explanation:      edge.Explanation,
            IsContested:      edge.IsContested,
            Sources:          edge.Sources.Select(s => s.ToDto()).ToList(),
            CreatedAt:        edge.CreatedAt,
            UpdatedAt:        edge.UpdatedAt);
}
