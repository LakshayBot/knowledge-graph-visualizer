using CausalExplorer.Domain.ValueObjects;
using CausalExplorer.Domain.Enums;
using FluentAssertions;

namespace CausalExplorer.Domain.Tests.ValueObjects;

public sealed class SourceTests
{
    [Fact]
    public void Create_WithValidParameters_ShouldReturnSource()
    {
        var source = Source.Create(
            "https://reuters.com/article",
            "Reuters Article",
            new DateTime(2023, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            0.90m,
            SourceType.News);

        source.Should().NotBeNull();
        source.Url.Should().Be("https://reuters.com/article");
        source.ReliabilityScore.Should().Be(0.90m);
    }

    [Fact]
    public void Create_WithInvalidUrl_ShouldThrowArgumentException()
    {
        var act = () => Source.Create(
            "not-a-url", "Title",
            DateTime.UtcNow, 0.5m, SourceType.Academic);

        act.Should().Throw<ArgumentException>().WithParameterName("url");
    }

    [Fact]
    public void TwoSourcesWithSameUrlAndType_ShouldBeEqual()
    {
        // Equality is based on URL (lowercased), PublishedDate, and SourceType — title/score are ignored.
        var date = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var a = Source.Create("https://example.com", "Title A", date, 0.8m, SourceType.News);
        var b = Source.Create("https://example.com", "Title B", date, 0.5m, SourceType.News);

        a.Should().Be(b);
    }

    [Fact]
    public void TwoSourcesWithDifferentTypes_ShouldNotBeEqual()
    {
        var date = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var a = Source.Create("https://example.com", "Title", date, 0.8m, SourceType.News);
        var b = Source.Create("https://example.com", "Title", date, 0.8m, SourceType.Government);

        a.Should().NotBe(b);
    }
}
