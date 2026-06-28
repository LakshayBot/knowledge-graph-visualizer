namespace CasualExplorer.Application.AI.Interfaces;

/// <summary>
/// Represents a single event extracted from raw text by the AI service.
/// </summary>
public sealed record ExtractedEvent(
    string Title,
    string Summary,
    DateTime EventDate,
    string Domain);

/// <summary>
/// Result returned from <c>IAIService.ExtractEventsFromTextAsync</c>.
/// </summary>
public sealed record ExtractedEventsResult(
    IReadOnlyList<ExtractedEvent> Events,
    string RawText);

/// <summary>
/// Result returned from <c>IAIService.GenerateCasualLinkAsync</c>.
/// </summary>
public sealed record CasualLinkResult(
    string Explanation,
    decimal Strength,
    bool IsContested);

/// <summary>
/// A single suggested node or edge returned from a chain expansion.
/// </summary>
public sealed record ExpansionNode(
    string Title,
    string Summary,
    string RelationshipType,
    string Direction);   // "cause" | "effect"

/// <summary>
/// Result returned from <c>IAIService.ExpandChainNodeAsync</c>.
/// </summary>
public sealed record ChainExpansionResult(
    IReadOnlyList<ExpansionNode> SuggestedNodes,
    string Perspective);
