using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Enums;
using CausalExplorer.Domain.Events;
using FluentAssertions;

namespace CausalExplorer.Domain.Tests.Entities;

public sealed class CausalEdgeTests
{
    [Fact]
    public void Create_WithValidParameters_ShouldReturnCausalEdge()
    {
        var from = Guid.NewGuid();
        var to   = Guid.NewGuid();

        var edge = CausalEdge.Create(
            from, to,
            CausalRelationshipType.DirectlyCaused,
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
    public void Create_ShouldRaiseCausalEdgeAddedDomainEvent()
    {
        var edge = CausalEdge.Create(
            Guid.NewGuid(), Guid.NewGuid(),
            CausalRelationshipType.ContributedTo,
            0.6m, Perspective.Economic, "Contributing factor.");

        edge.DomainEvents.Should().ContainSingle()
            .Which.Should().BeOfType<CausalEdgeAddedDomainEvent>();
    }

    [Fact]
    public void Create_WithSameFromAndToId_ShouldThrowArgumentException()
    {
        var id  = Guid.NewGuid();
        var act = () => CausalEdge.Create(
            id, id, CausalRelationshipType.Correlated,
            0.5m, Perspective.Structural, "Self-loop.");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void UpdateStrength_WithOutOfRangeValue_ShouldThrow()
    {
        var edge = CausalEdge.Create(
            Guid.NewGuid(), Guid.NewGuid(),
            CausalRelationshipType.Contested,
            0.5m, Perspective.Revisionist, "Explanation.");

        var act = () => edge.UpdateStrength(1.5m);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
