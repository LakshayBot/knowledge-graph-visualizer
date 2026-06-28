namespace CasualExplorer.API;

/// <summary>Named rate-limiter policy identifiers used across controllers.</summary>
public static class RateLimitPolicies
{
    /// <summary>20 req/min per remote IP — applied to anonymous endpoints.</summary>
    public const string Anonymous      = "anonymous";

    /// <summary>100 req/min per authenticated user — default for protected endpoints.</summary>
    public const string Authenticated  = "authenticated";

    /// <summary>10 req/min per authenticated user — applied to expensive AI operations.</summary>
    public const string AiExpensive    = "ai-expensive";
}
