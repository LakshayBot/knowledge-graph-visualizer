namespace CausalExplorer.Domain.Enums;

/// <summary>
/// Represents the analytical perspective from which a causal relationship is interpreted.
/// </summary>
public enum Perspective
{
    /// <summary>The dominant, consensus-driven interpretation from established institutions.</summary>
    Mainstream = 1,

    /// <summary>An interpretation framed around national interests and power dynamics.</summary>
    Geopolitical = 2,

    /// <summary>An interpretation focusing on systemic, institutional, or structural forces.</summary>
    Structural = 3,

    /// <summary>An interpretation driven by financial incentives and economic rationality.</summary>
    Economic = 4,

    /// <summary>An interpretation that challenges or revises the mainstream historical narrative.</summary>
    Revisionist = 5
}
