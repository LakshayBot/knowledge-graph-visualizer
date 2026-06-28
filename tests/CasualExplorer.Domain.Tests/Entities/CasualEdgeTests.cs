using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Enums;
using CasualExplorer.Domain.Events;
using FluentAssertions;

namespace CasualExplorer.Domain.Tests.Entities;

public sealed class CasualEdgeTests
{
    [Fact]
    public void Create_WithValidParameters_ShouldReturnCasualEdge()
    {
        var from = Guid.NewGuid();
        var to   = Guid.NewGuid();

        var edge = CasualEdge.Create(
            from, to,
            CasualRelationshipType.DirectlyCaused,
            0.85m,
            Perspective.Mainstream,
            "Austerity measures directly led to increased unemployment.");

        edge.Should().NotBeNull();
        edge.FromEventId.Should().Be(from);
        edge.ToEventId.Should().Be(to);
        edge.Strength.Should().Be(0.85m);
        edge.IsContested.Should().BeFalse();
    }

    [Fact]
    public void Create_ShouldRaiseCasualEdgeAddedDomainEvent()
    {
        var edge = CasualEdge.Create(
            Guid.NewGuid(), Guid.NewGuid(),
            CasualRelationshipType.ContributedTo,
            0.6m, Perspective.Economic, "Contributing factor.");

        edge.DomainEvents.Should().ContainSingle()
            .Which.Should().BeOfType<CasualEdgeAddedDomainEvent>();
    }

    [Fact]
    public void Create_WithSameFromAndToId_ShouldThrowArgumentException()
    {
        var id  = Guid.NewGuid();
        var act = () => CasualEdge.Create(
            id, id, CasualRelationshipType.Correlated,
            0.5m, Perspective.Structural, "Self-loop.");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void UpdateStrength_WithOutOfRangeValue_ShouldThrow()
    {
        var edge = CasualEdge.Create(
            Guid.NewGuid(), Guid.NewGuid(),
            CasualRelationshipType.Contested,
            0.5m, Perspective.Revisionist, "Explanation.");

        var act = () => edge.UpdateStrength(1.5m);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
