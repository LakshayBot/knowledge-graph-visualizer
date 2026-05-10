namespace CausalExplorer.Domain.Enums;

/// <summary>
/// Describes the causal relationship between two event nodes in a causal graph.
/// </summary>
public enum CausalRelationshipType
{
    /// <summary>One event was the direct and sufficient cause of another.</summary>
    DirectlyCaused = 1,

    /// <summary>One event created the necessary preconditions for another to occur.</summary>
    EnabledConditionsFor = 2,

    /// <summary>One event was one of several contributing factors to another.</summary>
    ContributedTo = 3,

    /// <summary>The causal link is actively disputed among analysts or sources.</summary>
    Contested = 4,

    /// <summary>The events are correlated but a causal direction is not established.</summary>
    Correlated = 5
}
