namespace CasualExplorer.Application.CasualChains.DTOs;

/// <summary>
/// DTO for a graph node as consumed by the frontend renderer.
/// Includes layout coordinates and expansion state.
/// </summary>
public sealed record GraphNodeDto(
    Guid Id,
    string Title,
    string Summary,
    string Domain,
    decimal ConfidenceScore,
    string ConfidenceLevelLabel,
    float X,
    float Y,
    bool IsExpanded,
    bool HasMoreNodes);

/// <summary>
/// DTO for a graph edge as consumed by the frontend renderer.
/// </summary>
public sealed record GraphEdgeDto(
    Guid Id,
    Guid FromId,
    Guid ToId,
    decimal Strength,
    string EdgeStyle,
    string RelationshipType,
    string Explanation,
    bool IsContested,
    string Perspective);

/// <summary>Metadata for a rendered casual chain.</summary>
public sealed record ChainMetadataDto(
    Guid ChainId,
    string Title,
    string Domain,
    int NodeCount,
    int ViewCount,
    DateTime LastUpdatedAt,
    string? Provider = null,
    string? Model = null);

/// <summary>
/// Full graph DTO consumed by the frontend graph renderer.
/// </summary>
public sealed record CasualGraphDto(
    IReadOnlyList<GraphNodeDto> Nodes,
    IReadOnlyList<GraphEdgeDto> Edges,
    ChainMetadataDto ChainMetadata);

/// <summary>Summary DTO for a user's saved chain entry.</summary>
public sealed record SavedChainDto(
    Guid ChainId,
    string ChainTitle,
    string Domain,
    int NodeCount,
    DateTime SavedAt,
    string? Notes);

/// <summary>Summary DTO for a casual chain (listing / trending).</summary>
public sealed record CasualChainSummaryDto(
    Guid Id,
    Guid RootEventId,
    string Title,
    string Domain,
    int NodeCount,
    int ViewCount,
    DateTime CreatedAt,
    DateTime LastUpdatedAt);
