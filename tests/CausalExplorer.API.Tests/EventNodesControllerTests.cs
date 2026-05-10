using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CausalExplorer.Domain.Entities;
using CausalExplorer.Domain.Enums;
using CausalExplorer.Domain.Interfaces;
using Moq;

namespace CausalExplorer.API.Tests;

/// <summary>
/// Integration tests for the EventNodes controller endpoints:
/// <c>GET /api/v1/EventNodes/search</c> and <c>GET /api/v1/EventNodes</c>.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class EventNodesControllerTests
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public EventNodesControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client  = factory.CreateApiClient();
    }

    // ── Search ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Search_WithMatchingQuery_Returns200AndResults()
    {
        // Arrange
        var nodes = BuildSeedNodes();
        _factory.SetupEventNodes(nodes);

        // Act
        var response = await _client.GetAsync("/api/v1/EventNodes/search?q=china");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("totalCount").GetInt32().Should().Be(nodes.Count);
        body.GetProperty("items").GetArrayLength().Should().Be(nodes.Count);
    }

    [Fact]
    public async Task Search_WithEmptyQuery_Returns400()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/EventNodes/search?q=");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Search_WhenNoResults_Returns200WithEmptyItems()
    {
        // Arrange
        _factory.EventNodeRepositoryMock
            .Setup(r => r.SearchAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<EventNode>());

        // Act
        var response = await _client.GetAsync("/api/v1/EventNodes/search?q=zzznomatch");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("totalCount").GetInt32().Should().Be(0);
        body.GetProperty("items").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Search_WithoutAuthentication_Returns200()
    {
        // The search endpoint should be publicly accessible.
        // Arrange
        _factory.SetupEventNodes(BuildSeedNodes());

        // Act — use the default factory client (no auth header)
        var response = await _client.GetAsync("/api/v1/EventNodes/search?q=trade");

        // Assert — 200 not 401
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Paged list ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_Returns200WithPaginationMetadata()
    {
        // Arrange
        var nodes = BuildSeedNodes();
        _factory.SetupEventNodes(nodes);

        // Act
        var response = await _client.GetAsync("/api/v1/EventNodes?page=1&pageSize=10");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("page").GetInt32().Should().Be(1);
        body.GetProperty("pageSize").GetInt32().Should().BeGreaterThanOrEqualTo(1);
    }

    // ── GetById ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_WithNonExistentId_Returns404()
    {
        // Arrange
        var id = Guid.NewGuid();
        _factory.EventNodeRepositoryMock
            .Setup(r => r.GetByIdAsync(id, It.IsAny<CancellationToken>()))
            .ReturnsAsync((EventNode?)null);

        // Act
        var response = await _client.GetAsync($"/api/v1/EventNodes/{id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetById_WithExistingId_Returns200()
    {
        // Arrange
        var node = BuildSeedNodes().First();
        _factory.EventNodeRepositoryMock
            .Setup(r => r.GetByIdAsync(node.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(node);

        // GetById handler also calls edge repo — return empty lists.
        _factory.CausalEdgeRepositoryMock
            .Setup(r => r.GetByToEventAsync(node.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<CausalEdge>());
        _factory.CausalEdgeRepositoryMock
            .Setup(r => r.GetByFromEventAsync(node.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<CausalEdge>());

        // Act
        var response = await _client.GetAsync($"/api/v1/EventNodes/{node.Id}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("id").GetString().Should().Be(node.Id.ToString());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static IReadOnlyList<EventNode> BuildSeedNodes() =>
        new List<EventNode>
        {
            EventNode.Create(
                "China Joins the WTO",
                "The People's Republic of China formally joined the WTO on 11 December 2001.",
                new DateTime(2001, 12, 11, 0, 0, 0, DateTimeKind.Utc),
                EventDomain.Economics,
                confidenceScore: 0.98m,
                freshnessScore: 0.75m),

            EventNode.Create(
                "Trump Administration Imposes Section 301 Tariffs on Chinese Goods",
                "Beginning in July 2018, the US imposed tariffs of 25% on $34 billion of Chinese goods.",
                new DateTime(2018, 7, 6, 0, 0, 0, DateTimeKind.Utc),
                EventDomain.Economics,
                confidenceScore: 0.99m,
                freshnessScore: 0.80m),
        };
}
