using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Enums;
using CasualExplorer.Domain.Events;
using CasualExplorer.Domain.ValueObjects;
using FluentAssertions;

namespace CasualExplorer.Domain.Tests.Entities;

public sealed class EventNodeTests
{
    // ── Creation ──────────────────────────────────────────────────────────────

    [Fact]
    public void Create_WithValidParameters_ShouldReturnEventNode()
    {
        // Arrange & Act
        var node = EventNode.Create(
            "Fall of the Berlin Wall",
            "The Berlin Wall fell on 9 November 1989, ending the division of Germany.",
            new DateTime(1989, 11, 9, 0, 0, 0, DateTimeKind.Utc),
            EventDomain.Geopolitics,
            0.95m,
            0.80m);

        // Assert
        node.Should().NotBeNull();
        node.Id.Should().NotBeEmpty();
        node.Title.Should().Be("Fall of the Berlin Wall");
        node.ConfidenceScore.Should().Be(0.95m);
        node.IsVerified.Should().BeFalse();
    }

    [Fact]
    public void Create_ShouldRaiseEventNodeCreatedDomainEvent()
    {
        var node = EventNode.Create(
            "Test Event", "Test summary.", DateTime.UtcNow,
            EventDomain.Economics, 0.7m, 0.6m);

        node.DomainEvents.Should().ContainSingle()
            .Which.Should().BeOfType<EventNodeCreatedDomainEvent>();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null!)]
    public void Create_WithBlankTitle_ShouldThrowArgumentException(string? title)
    {
        var act = () => EventNode.Create(
            title!, "Valid summary.", DateTime.UtcNow,
            EventDomain.Social, 0.5m, 0.5m);

        act.Should().Throw<ArgumentException>()
            .WithParameterName("title");
    }

    [Theory]
    [InlineData(-0.1)]
    [InlineData(1.01)]
    public void Create_WithOutOfRangeConfidenceScore_ShouldThrow(decimal score)
    {
        var act = () => EventNode.Create(
            "Title", "Summary.", DateTime.UtcNow,
            EventDomain.Technology, score, 0.5m);

        act.Should().Throw<ArgumentOutOfRangeException>()
            .WithParameterName("confidenceScore");
    }

    // ── Verify ────────────────────────────────────────────────────────────────

    [Fact]
    public void Verify_WhenNotVerified_ShouldSetIsVerifiedAndRaiseDomainEvent()
    {
        var node = EventNode.Create(
            "Title", "Summary.", DateTime.UtcNow,
            EventDomain.Military, 0.8m, 0.7m);

        node.ClearDomainEvents();
        node.Verify(Guid.NewGuid());

        node.IsVerified.Should().BeTrue();
        node.DomainEvents.Should().ContainSingle()
            .Which.Should().BeOfType<EventNodeVerifiedDomainEvent>();
    }

    [Fact]
    public void Verify_WhenAlreadyVerified_ShouldThrowInvalidOperationException()
    {
        var node = EventNode.Create(
            "Title", "Summary.", DateTime.UtcNow,
            EventDomain.Cultural, 0.8m, 0.7m);

        node.Verify(Guid.NewGuid());

        var act = () => node.Verify(Guid.NewGuid());
        act.Should().Throw<InvalidOperationException>();
    }

    // ── ConfidenceLevel ───────────────────────────────────────────────────────

    [Theory]
    [InlineData(0.90, "Established")]
    [InlineData(0.70, "WidelyAccepted")]
    [InlineData(0.50, "Debated")]
    [InlineData(0.30, "Speculative")]
    public void GetConfidenceLevel_ShouldReturnCorrectKind(decimal score, string expectedKind)
    {
        var node = EventNode.Create(
            "Title", "Summary.", DateTime.UtcNow,
            EventDomain.Environmental, score, 0.5m);

        node.GetConfidenceLevel().Kind.ToString().Should().Be(expectedKind);
    }

    // ── Sources ───────────────────────────────────────────────────────────────

    [Fact]
    public void AddSource_WithValidSource_ShouldAddToSources()
    {
        var node = EventNode.Create(
            "Title", "Summary.", DateTime.UtcNow,
            EventDomain.Geopolitics, 0.8m, 0.7m);

        var source = Source.Create(
            "https://example.com/article",
            "Example Article",
            new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            0.85m,
            SourceType.News);

        node.AddSource(source);

        node.Sources.Should().ContainSingle();
    }
}
