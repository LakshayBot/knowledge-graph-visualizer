using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CasualExplorer.Domain.Entities;
using CasualExplorer.Domain.Interfaces;
using Moq;

namespace CasualExplorer.API.Tests;

/// <summary>
/// Integration tests for <c>POST /api/v1/auth/register</c> and
/// <c>POST /api/v1/auth/login</c>.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public sealed class AuthControllerTests
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client  = factory.CreateApiClient();

        // Default user repo behaviour: nothing exists, add is a no-op.
        factory.UserRepositoryMock.Reset();
        factory.UserRepositoryMock
            .Setup(r => r.EmailExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        factory.UserRepositoryMock
            .Setup(r => r.UsernameExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        factory.UserRepositoryMock
            .Setup(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
    }

    // ── Register ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Register_WithValidPayload_Returns201AndTokens()
    {
        // Arrange — default setup already in constructor
        var payload = new
        {
            email           = $"test_{Guid.NewGuid():N}@example.com",
            username        = $"user_{Guid.NewGuid():N}"[..16],
            password        = "P@ssw0rd123!",
            confirmPassword = "P@ssw0rd123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", payload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("accessToken").GetString().Should().NotBeNullOrEmpty();
        body.GetProperty("refreshToken").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Register_WithMismatchedPasswords_Returns400()
    {
        // Arrange
        var payload = new
        {
            email           = "test@example.com",
            username        = "testuser",
            password        = "P@ssw0rd123!",
            confirmPassword = "DifferentPassword!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", payload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_WithInvalidEmail_Returns400()
    {
        // Arrange
        var payload = new
        {
            email           = "not-an-email",
            username        = "testuser",
            password        = "P@ssw0rd123!",
            confirmPassword = "P@ssw0rd123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", payload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_Returns409()
    {
        // Arrange
        _factory.UserRepositoryMock
            .Setup(r => r.EmailExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var payload = new
        {
            email           = "taken@example.com",
            username        = "uniqueuser",
            password        = "P@ssw0rd123!",
            confirmPassword = "P@ssw0rd123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", payload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_WithInvalidCredentials_Returns403()
    {
        // The login handler throws ForbiddenAccessException on bad credentials.
        // Arrange — user not found returns 403 (mapped from ForbiddenAccessException).
        _factory.UserRepositoryMock
            .Setup(r => r.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        var payload = new { email = "nobody@example.com", password = "wrongpassword" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", payload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
