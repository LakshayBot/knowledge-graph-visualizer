using CausalExplorer.Application.Common.Interfaces;
using CausalExplorer.Application.EventNodes.Commands;
using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Enums;
using CausalExplorer.Domain.Interfaces;
using FluentAssertions;
using Moq;

namespace CausalExplorer.Application.Tests.Commands;

public sealed class CreateEventNodeCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly Mock<IEventNodeRepository> _repoMock = new();
    private readonly Mock<IVectorSearchService> _vectorSearchMock = new();

    public CreateEventNodeCommandHandlerTests()
    {
        _unitOfWorkMock.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        _repoMock.Setup(r => r.AddAsync(It.IsAny<EventNode>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _vectorSearchMock
            .Setup(v => v.UpsertEventEmbeddingAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
    }

    [Fact]
    public async Task Handle_WithValidCommand_ShouldReturnSuccessResult()
    {
        // Arrange
        var handler = new CreateEventNodeCommandHandler(
            _repoMock.Object, _unitOfWorkMock.Object, _vectorSearchMock.Object);

        var command = new CreateEventNodeCommand(
            "Global Financial Crisis",
            "The 2008 financial crisis was triggered by the collapse of the US housing market.",
            new DateTime(2008, 9, 15, 0, 0, 0, DateTimeKind.Utc),
            EventDomain.Economics,
            0.92m,
            0.75m,
            Perspectives: [],
            Sources: []);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Title.Should().Be("Global Financial Crisis");
        result.Domain.Should().Be("Economics");
        result.IsVerified.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_ShouldCallAddAsyncOnRepository()
    {
        var handler = new CreateEventNodeCommandHandler(
            _repoMock.Object, _unitOfWorkMock.Object, _vectorSearchMock.Object);

        var command = new CreateEventNodeCommand(
            "Test", "Test summary.", DateTime.UtcNow,
            EventDomain.Social, 0.5m, 0.5m,
            Perspectives: [],
            Sources: []);

        await handler.Handle(command, CancellationToken.None);

        _repoMock.Verify(r => r.AddAsync(
            It.IsAny<EventNode>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
