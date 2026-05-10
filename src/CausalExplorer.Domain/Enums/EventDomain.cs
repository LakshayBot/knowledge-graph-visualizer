namespace CausalExplorer.Domain.Enums;

/// <summary>
/// Represents the high-level domain to which a causal event belongs.
/// </summary>
public enum EventDomain
{
    /// <summary>Events relating to international relations, diplomacy, and state politics.</summary>
    Geopolitics = 1,

    /// <summary>Events relating to markets, trade, fiscal and monetary policy.</summary>
    Economics = 2,

    /// <summary>Events relating to scientific discovery, innovation, and digital transformation.</summary>
    Technology = 3,

    /// <summary>Events relating to society, demographics, culture, and civil movements.</summary>
    Social = 4,

    /// <summary>Events relating to climate, ecology, natural disasters, and resource depletion.</summary>
    Environmental = 5,

    /// <summary>Events relating to armed conflict, defence, and security.</summary>
    Military = 6,

    /// <summary>Events relating to arts, media, identity, and cultural exchange.</summary>
    Cultural = 7
}
