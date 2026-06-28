using System.Text.RegularExpressions;

namespace CasualExplorer.Infrastructure.Search;

/// <summary>
/// Normalises natural-language search text into terms useful for persistence lookups.
/// </summary>
internal static class SearchTextProcessor
{
    private static readonly Regex TokenRegex = new("[a-z0-9]+", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "about", "after", "again", "against", "also", "and", "are", "because",
        "been", "being", "but", "can", "could", "did", "does", "doing", "for",
        "from", "had", "has", "have", "here", "how", "into", "just", "may",
        "might", "must", "not", "over", "shall", "should", "that", "the",
        "their", "them", "then", "there", "these", "they", "this", "those",
        "time", "was", "were", "what", "when", "where", "which", "while",
        "who", "whom", "whose", "why", "will", "with", "would", "your",
        "seeing"
    };

    public static IReadOnlyList<string> GetKeywords(string query)
    {
        return TokenRegex.Matches(query.ToLowerInvariant())
            .Select(match => NormaliseToken(match.Value))
            .Where(token => token.Length > 2 && !StopWords.Contains(token))
            .Distinct()
            .ToList();
    }

    public static int GetMinimumMatchCount(IReadOnlyCollection<string> keywords) =>
        keywords.Count <= 1 ? keywords.Count : 2;

    public static int Score(string title, string summary, IReadOnlyCollection<string> keywords)
    {
        if (keywords.Count == 0)
            return 0;

        var lowerTitle = title.ToLowerInvariant();
        var lowerSummary = summary.ToLowerInvariant();

        return keywords.Sum(keyword =>
            (lowerTitle.Contains(keyword, StringComparison.Ordinal) ? 3 : 0) +
            (lowerSummary.Contains(keyword, StringComparison.Ordinal) ? 1 : 0));
    }

    private static string NormaliseToken(string token)
    {
        if (token.Length > 4 && token.EndsWith('s'))
            return token[..^1];

        return token;
    }
}
