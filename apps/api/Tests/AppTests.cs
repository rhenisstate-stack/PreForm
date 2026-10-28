using Xunit;
using Preform.Api.Controllers;
using Preform.Api.Services;
using Preform.Api.Data;
using Preform.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Mvc.Testing;
using Preform.Api.DTOs;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;

namespace Preform.Api.Tests;

public class HealthControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingHealthDb"));
            });
        });
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
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingProgrammeControllerDb"));
            });
        });

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (!context.Programmes.Any(p => p.Code == ProgrammeCode.RN))
        {
            context.Programmes.AddRange(
                new Programme { Code = ProgrammeCode.RN, DisplayName = "NCLEX-RN", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new Programme { Code = ProgrammeCode.PN, DisplayName = "NCLEX-PN", IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
            );
            context.SaveChanges();
        }
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

public class ProfileImageServiceAndControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    private static readonly byte[] ValidPngBytes = new byte[]
    {
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01
    };

    private static readonly byte[] ValidJpegBytes = new byte[]
    {
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
        0x00, 0x48, 0x00, 0x00, 0xFF, 0xD9
    };

    public ProfileImageServiceAndControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingProfileImageDb"));
            });
        });
    }

    [Fact]
    public async Task UploadGetReplaceAndDeleteProfileImage_PersistsInDatabase()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Id", "user-101");
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Email", "jane.candidate@nursing.edu");
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Name", "Jane Candidate");

        // 1. Upload valid PNG
        var putResponse = await client.PutAsync("/api/v1/profile/image", new ByteArrayContent(ValidPngBytes));
        putResponse.EnsureSuccessStatusCode();

        // 2. Retrieve binary image
        var getResponse = await client.GetAsync("/api/v1/profile/image");
        getResponse.EnsureSuccessStatusCode();
        Assert.Equal("image/png", getResponse.Content.Headers.ContentType?.MediaType);
        var retrievedBytes = await getResponse.Content.ReadAsByteArrayAsync();
        Assert.Equal(ValidPngBytes, retrievedBytes);

        // 3. Replace with valid JPEG
        var replaceResponse = await client.PutAsync("/api/v1/profile/image", new ByteArrayContent(ValidJpegBytes));
        replaceResponse.EnsureSuccessStatusCode();

        var getReplaced = await client.GetAsync("/api/v1/profile/image");
        getReplaced.EnsureSuccessStatusCode();
        Assert.Equal("image/jpeg", getReplaced.Content.Headers.ContentType?.MediaType);
        Assert.Equal(ValidJpegBytes, await getReplaced.Content.ReadAsByteArrayAsync());

        // 4. Delete image
        var deleteResponse = await client.DeleteAsync("/api/v1/profile/image");
        deleteResponse.EnsureSuccessStatusCode();

        var getAfterDelete = await client.GetAsync("/api/v1/profile/image");
        Assert.Equal(HttpStatusCode.NotFound, getAfterDelete.StatusCode);
    }

    [Fact]
    public async Task UploadInvalidFormatOrOversized_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Id", "user-102");
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Email", "alex@nursing.edu");

        var invalidSvgOrHtml = System.Text.Encoding.UTF8.GetBytes("<svg onload='alert(1)'></svg>");
        var badFormatRes = await client.PutAsync("/api/v1/profile/image", new ByteArrayContent(invalidSvgOrHtml));
        Assert.Equal(HttpStatusCode.BadRequest, badFormatRes.StatusCode);
    }

    [Fact]
    public async Task UploadOrGetForAnotherUser_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Id", "user-101");
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Email", "jane@nursing.edu");

        var forbiddenPut = await client.PutAsync("/api/v1/profile/image?targetUserId=user-999", new ByteArrayContent(ValidPngBytes));
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenPut.StatusCode);

        var forbiddenGet = await client.GetAsync("/api/v1/profile/image?userId=user-999");
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenGet.StatusCode);
    }
}

public class SubscriptionsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public SubscriptionsControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingSubscriptionsDb"));
            });
        });
    }

    [Fact]
    public async Task GetActivePlans_ReturnsPlansAndHandlesLookup()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.SubscriptionPlans.AddRange(
                new SubscriptionPlan
                {
                    Id = "plan-rn-pro",
                    Code = "nclex-rn-pro",
                    Name = "NCLEX-RN Complete Preparation",
                    PriceCents = 5900,
                    Interval = SubscriptionInterval.Monthly,
                    IsActive = true
                },
                new SubscriptionPlan
                {
                    Id = "plan-prep-premium",
                    Code = "all-access",
                    Name = "NCLEX-RN & PN All-Access",
                    PriceCents = 8900,
                    Interval = SubscriptionInterval.Monthly,
                    IsActive = true
                },
                new SubscriptionPlan
                {
                    Id = "plan-archived",
                    Code = "legacy-plan",
                    Name = "Archived Plan",
                    PriceCents = 1900,
                    Interval = SubscriptionInterval.Monthly,
                    IsActive = false
                }
            );
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient();

        // 1. Get active plans
        var response = await client.GetAsync("/api/v1/subscriptions");
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.True(body.GetProperty("success").GetBoolean());
        var plans = body.GetProperty("plans");
        Assert.True(plans.GetArrayLength() >= 2);

        // 2. Lookup existing plan by code
        var planRes = await client.GetAsync("/api/v1/subscriptions/all-access");
        planRes.EnsureSuccessStatusCode();

        // 3. Lookup non-existent plan
        var missingRes = await client.GetAsync("/api/v1/subscriptions/non-existent-code");
        Assert.Equal(HttpStatusCode.NotFound, missingRes.StatusCode);
    }
}
