using CasualExplorer.Domain.Common;

namespace CasualExplorer.Domain.ValueObjects;

/// <summary>
/// Enumeration of human-readable confidence levels derived from a numeric score.
/// </summary>
public enum ConfidenceLevelKind
{
    /// <summary>Score &gt; 0.85 — broad consensus and strong evidence.</summary>
    Established,

    /// <summary>Score &gt; 0.65 — accepted by most analysts with minor caveats.</summary>
    WidelyAccepted,

    /// <summary>Score &gt; 0.40 — actively debated with competing interpretations.</summary>
    Debated,

    /// <summary>Score ≤ 0.40 — limited evidence; treated as a working hypothesis.</summary>
    Speculative
}

/// <summary>
/// Value object that wraps a numeric confidence score and exposes a derived
/// <see cref="ConfidenceLevelKind"/> classification.
/// </summary>
public sealed class ConfidenceLevel : BaseValueObject
{
    /// <summary>Gets the raw numeric score in the range [0, 1].</summary>
    public decimal Score { get; }

    /// <summary>Gets the qualitative classification derived from <see cref="Score"/>.</summary>
    public ConfidenceLevelKind Kind { get; }

    private ConfidenceLevel(decimal score)
    {
        Score = score;
        Kind = score switch
        {
            > 0.85m => ConfidenceLevelKind.Established,
            > 0.65m => ConfidenceLevelKind.WidelyAccepted,
            > 0.40m => ConfidenceLevelKind.Debated,
            _        => ConfidenceLevelKind.Speculative
        };
    }

    /// <summary>
    /// Creates a <see cref="ConfidenceLevel"/> from a numeric score.
    /// </summary>
    /// <param name="score">A decimal value in the range [0, 1].</param>
    /// <returns>A new <see cref="ConfidenceLevel"/> instance.</returns>
    /// <exception cref="ArgumentOutOfRangeException">
    /// Thrown when <paramref name="score"/> is outside [0, 1].
    /// </exception>
    public static ConfidenceLevel FromScore(decimal score)
    {
        if (score is < 0m or > 1m)
            throw new ArgumentOutOfRangeException(
                nameof(score), "Confidence score must be between 0 and 1.");

        return new ConfidenceLevel(score);
    }

    /// <inheritdoc />
    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Score;
    }

    /// <inheritdoc />
    public override string ToString() => $"{Kind} ({Score:P0})";
}
