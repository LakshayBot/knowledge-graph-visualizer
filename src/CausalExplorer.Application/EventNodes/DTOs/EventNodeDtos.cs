using CausalExplorer.Domain.Enums;

namespace CausalExplorer.Application.EventNodes.DTOs;

/// <summary>
/// Full detail DTO for a single event node, including edge counts and confidence label.
/// </summary>
public sealed record EventNodeDetailDto(
    Guid Id,
    string Title,
    string Summary,
    DateTime EventDate,
    string Domain,
    decimal ConfidenceScore,
    string ConfidenceLevelLabel,
    decimal FreshnessScore,
    IReadOnlyList<string> Perspectives,
    IReadOnlyList<SourceDto> Sources,
    bool IsVerified,
    int IncomingEdgeCount,
    int OutgoingEdgeCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

/// <summary>
/// Lightweight summary DTO used in paged lists and graph node lists.
/// </summary>
public sealed record EventNodeSummaryDto(
    Guid Id,
    string Title,
    string Summary,
    DateTime EventDate,
    string Domain,
    decimal ConfidenceScore,
    string ConfidenceLevelLabel,
    bool IsVerified,
    DateTime CreatedAt);

/// <summary>
/// DTO representing a supporting source document.
/// </summary>
public sealed record SourceDto(
    string Url,
    string Title,
    DateTime PublishedDate,
    decimal ReliabilityScore,
    string SourceType);
