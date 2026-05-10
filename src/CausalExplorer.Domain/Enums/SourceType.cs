namespace CausalExplorer.Domain.Enums;

/// <summary>
/// Classifies the provenance type of a supporting source document.
/// </summary>
public enum SourceType
{
    /// <summary>Mainstream or investigative journalism outlet.</summary>
    News = 1,

    /// <summary>Peer-reviewed academic paper or conference proceeding.</summary>
    Academic = 2,

    /// <summary>Official government document, statement, or data release.</summary>
    Government = 3,

    /// <summary>Analysis or report from a policy research or think-tank organisation.</summary>
    ThinkTank = 4
}
