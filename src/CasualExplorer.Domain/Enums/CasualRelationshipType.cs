namespace CasualExplorer.Domain.Enums;

/// <summary>
/// Describes the casual relationship between two event nodes in a casual graph.
/// </summary>
public enum CasualRelationshipType
{
    /// <summary>One event was the direct and sufficient cause of another.</summary>
    DirectlyCaused = 1,

    /// <summary>One event created the necessary preconditions for another to occur.</summary>
    EnabledConditionsFor = 2,

    /// <summary>One event was one of several contributing factors to another.</summary>
    ContributedTo = 3,

    /// <summary>The casual link is actively disputed among analysts or sources.</summary>
    Contested = 4,

    /// <summary>The events are correlated but a casual direction is not established.</summary>
    Correlated = 5
}
