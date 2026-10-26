using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Mvc.Testing;
using Preform.Api.DTOs;
using System.Net;
using System.Net.Http.Json;

namespace Preform.Api.Tests;

public class HealthControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Live_ReturnsOk()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/health/live");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.Equal("ok", body!["status"]);
    }

    [Fact]
    public async Task Ready_ReturnsOkWhenDatabaseIsAvailable()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/health/ready");

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.Equal("ready", body!["status"]);
    }
}

public class ProgrammeControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ProgrammeControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Override DATABASE_URL to use test database if needed
            });
        });
    }

    [Fact]
    public async Task GetProgrammes_ReturnsRNandPN()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/programmes");

        response.EnsureSuccessStatusCode();
        var programmes = await response.Content.ReadFromJsonAsync<List<ProgrammeDto>>();

        Assert.NotNull(programmes);
        Assert.Equal(2, programmes.Count);
        Assert.Contains(programmes, p => p.Code == "RN");
        Assert.Contains(programmes, p => p.Code == "PN");
    }

    [Fact]
    public async Task GetProgrammeByCode_RN_ReturnsNCLEXRN()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/programmes/code/RN");

        response.EnsureSuccessStatusCode();
        var programme = await response.Content.ReadFromJsonAsync<ProgrammeDto>();

        Assert.NotNull(programme);
        Assert.Equal("RN", programme.Code);
        Assert.Equal("NCLEX-RN", programme.DisplayName);
    }

    [Fact]
    public async Task GetProgrammeByCode_Invalid_ReturnsNotFound()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/v1/programmes/code/XX");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CreateProgramme_ValidRequest_CreatesProgramme()
    {
        var client = _factory.CreateClient();
        var request = new CreateProgrammeRequest
        {
            Code = "TEST",
            DisplayName = "Test Programme",
            IsActive = true
        };

        var response = await client.PostAsJsonAsync("/api/v1/programmes", request);

        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<ProgrammeDto>();

        Assert.NotNull(created);
        Assert.Equal("TEST", created.Code);
        Assert.Equal("Test Programme", created.DisplayName);
        Assert.True(created.IsActive);
    }

    [Fact]
    public async Task CreateProgramme_DuplicateCode_ReturnsConflict()
    {
        var client = _factory.CreateClient();

        // First create
        var request1 = new CreateProgrammeRequest
        {
            Code = "DUP",
            DisplayName = "Duplicate Programme",
            IsActive = true
        };
        var response1 = await client.PostAsJsonAsync("/api/v1/programmes", request1);
        response1.EnsureSuccessStatusCode();

        // Second create with same code
        var request2 = new CreateProgrammeRequest
        {
            Code = "DUP",
            DisplayName = "Duplicate Programme 2",
            IsActive = true
        };
        var response2 = await client.PostAsJsonAsync("/api/v1/programmes", request2);

        Assert.Equal(HttpStatusCode.Conflict, response2.StatusCode);
    }

    [Fact]
    public async Task CreateProgramme_InvalidCode_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        var request = new CreateProgrammeRequest
        {
            Code = "",
            DisplayName = "Invalid Programme",
            IsActive = true
        };

        var response = await client.PostAsJsonAsync("/api/v1/programmes", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}

public class ProgrammeServiceTests
{
    [Fact]
    public async Task GetAllProgrammesAsync_ReturnsOrderedList()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: "TestProgrammeDb")
            .Options;

        using var context = new AppDbContext(options);
        context.Programmes.AddRange(
            new Programme { Id = "p1", Code = ProgrammeCode.PN, DisplayName = "NCLEX-PN", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Programme { Id = "p2", Code = ProgrammeCode.RN, DisplayName = "NCLEX-RN", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        context.SaveChanges();

        var service = new ProgrammeService(context);

        // Act
        var result = await service.GetAllProgrammesAsync();

        // Assert
        var list = result.ToList();
        Assert.Equal(2, list.Count);
        Assert.Equal("RN", list[0].Code);
        Assert.Equal("PN", list[1].Code);
    }

    [Fact]
    public async Task GetProgrammeByCodeAsync_ValidCode_ReturnsProgramme()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: "TestProgrammeDb2")
            .Options;

        using var context = new AppDbContext(options);
        context.Programmes.Add(
            new Programme { Id = "p1", Code = ProgrammeCode.RN, DisplayName = "NCLEX-RN", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        context.SaveChanges();

        var service = new ProgrammeService(context);

        var result = await service.GetProgrammeByCodeAsync("RN");

        Assert.NotNull(result);
        Assert.Equal("RN", result.Code);
        Assert.Equal("NCLEX-RN", result.DisplayName);
    }

    [Fact]
    public async Task CreateProgrammeAsync_DuplicateCode_ThrowsInvalidOperationException()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: "TestProgrammeDb3")
            .Options;

        using var context = new AppDbContext(options);
        context.Programmes.Add(
            new Programme { Id = "p1", Code = ProgrammeCode.RN, DisplayName = "NCLEX-RN", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        context.SaveChanges();

        var service = new ProgrammeService(context);

        var request = new CreateProgrammeRequest { Code = "RN", DisplayName = "Duplicate RN", IsActive = true };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateProgrammeAsync(request));
    }
}
