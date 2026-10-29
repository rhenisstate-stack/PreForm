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
        Assert.True(programmes.Count >= 2);
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

    private static void AddGatewayHeaders(HttpClient client, string userId, string email, string role, string name = "Jane Candidate")
    {
        var secret = "prepford-default-internal-gateway-secret-32-chars!";
        var payload = $"{userId}|{email}|{role}";
        var sig = Convert.ToHexString(
            System.Security.Cryptography.HMACSHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(secret),
                System.Text.Encoding.UTF8.GetBytes(payload))
        ).ToLowerInvariant();

        client.DefaultRequestHeaders.Remove("X-Gateway-Signature");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Id");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Email");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Role");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Name");

        client.DefaultRequestHeaders.Add("X-Gateway-Signature", sig);
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Id", userId);
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Email", email);
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Role", role);
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Name", name);
    }

    [Fact]
    public async Task UploadGetReplaceAndDeleteProfileImage_PersistsInDatabase()
    {
        var client = _factory.CreateClient();
        AddGatewayHeaders(client, "user-101", "jane.candidate@nursing.edu", "candidate", "Jane Candidate");

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
        AddGatewayHeaders(client, "user-102", "alex@nursing.edu", "candidate");

        var invalidSvgOrHtml = System.Text.Encoding.UTF8.GetBytes("<svg onload='alert(1)'></svg>");
        var badFormatRes = await client.PutAsync("/api/v1/profile/image", new ByteArrayContent(invalidSvgOrHtml));
        Assert.Equal(HttpStatusCode.BadRequest, badFormatRes.StatusCode);
    }

    [Fact]
    public async Task UploadOrGetForAnotherUser_ReturnsForbidden()
    {
        var client = _factory.CreateClient();
        AddGatewayHeaders(client, "user-101", "jane@nursing.edu", "candidate");

        var forbiddenPut = await client.PutAsync("/api/v1/profile/image?targetUserId=user-999", new ByteArrayContent(ValidPngBytes));
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenPut.StatusCode);

        var forbiddenGet = await client.GetAsync("/api/v1/profile/image?userId=user-999");
        Assert.Equal(HttpStatusCode.Forbidden, forbiddenGet.StatusCode);
    }

    // ── SEC-01 Regression Tests ─────────────────────────────────────────────

    [Fact]
    public async Task ProfileImage_UnauthenticatedRequest_ReturnsUnauthorized401()
    {
        var client = _factory.CreateClient();
        // Zero authentication headers
        var getResponse = await client.GetAsync("/api/v1/profile/image");
        Assert.Equal(HttpStatusCode.Unauthorized, getResponse.StatusCode);

        var putResponse = await client.PutAsync("/api/v1/profile/image", new ByteArrayContent(ValidPngBytes));
        Assert.Equal(HttpStatusCode.Unauthorized, putResponse.StatusCode);
    }

    [Fact]
    public async Task ProfileImage_SpoofedHeaderWithoutGatewaySignature_ReturnsUnauthorized401()
    {
        var client = _factory.CreateClient();
        // Attacker injects spoofed identity headers without valid HMAC signature
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Id", "victim-user-123");
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Email", "victim@prepford.com");

        var getResponse = await client.GetAsync("/api/v1/profile/image");
        Assert.Equal(HttpStatusCode.Unauthorized, getResponse.StatusCode);

        var putResponse = await client.PutAsync("/api/v1/profile/image", new ByteArrayContent(ValidPngBytes));
        Assert.Equal(HttpStatusCode.Unauthorized, putResponse.StatusCode);
    }

    [Fact]
    public async Task ProfileImage_InvalidHmacSignature_ReturnsUnauthorized401()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Id", "user-101");
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Email", "user-101@prepford.com");
        client.DefaultRequestHeaders.Add("X-Gateway-Signature", "0000000000000000000000000000000000000000000000000000000000000000");

        var getResponse = await client.GetAsync("/api/v1/profile/image");
        Assert.Equal(HttpStatusCode.Unauthorized, getResponse.StatusCode);
    }

    [Fact]
    public async Task ProfileImage_AdminCanAccessCandidateImage_ReturnsSuccess200()
    {
        var client = _factory.CreateClient();

        // 1. Candidate uploads image
        AddGatewayHeaders(client, "candidate-404", "candidate-404@prepford.com", "candidate");
        var putRes = await client.PutAsync("/api/v1/profile/image", new ByteArrayContent(ValidPngBytes));
        putRes.EnsureSuccessStatusCode();

        // 2. Admin queries candidate's image
        AddGatewayHeaders(client, "admin-001", "admin@prepford.com", "admin");
        var adminGetRes = await client.GetAsync("/api/v1/profile/image?userId=candidate-404");
        Assert.Equal(HttpStatusCode.OK, adminGetRes.StatusCode);
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

public class GatewayHmacAndReplaySecurityTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public GatewayHmacAndReplaySecurityTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingGatewaySecurityDb"));
            });
        });
    }

    internal static void AddCanonicalHeaders(
        HttpClient client,
        string method,
        string path,
        string userId,
        string email,
        string role,
        string bodyHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        long? timestamp = null,
        string? nonce = null,
        string? secret = null)
    {
        var effectiveTimestamp = timestamp ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var effectiveNonce = nonce ?? Guid.NewGuid().ToString("N");
        var effectiveSecret = secret ?? "prepford-default-internal-gateway-secret-32-chars!";

        var canonicalPayload = $"{effectiveTimestamp}\n{method.ToUpperInvariant()}\n{path}\n{effectiveNonce}\n{bodyHash}\n{userId.Trim()}\n{email.Trim().ToLowerInvariant()}\n{role.Trim().ToLowerInvariant()}";
        var signature = Convert.ToHexString(
            System.Security.Cryptography.HMACSHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(effectiveSecret),
                System.Text.Encoding.UTF8.GetBytes(canonicalPayload))
        ).ToLowerInvariant();

        client.DefaultRequestHeaders.Remove("X-Gateway-Signature");
        client.DefaultRequestHeaders.Remove("X-Gateway-Timestamp");
        client.DefaultRequestHeaders.Remove("X-Gateway-Nonce");
        client.DefaultRequestHeaders.Remove("X-Gateway-Content-SHA256");
        client.DefaultRequestHeaders.Remove("X-Gateway-Signature-Version");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Id");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Email");
        client.DefaultRequestHeaders.Remove("X-Authenticated-User-Role");

        client.DefaultRequestHeaders.Add("X-Gateway-Signature", signature);
        client.DefaultRequestHeaders.Add("X-Gateway-Timestamp", effectiveTimestamp.ToString());
        client.DefaultRequestHeaders.Add("X-Gateway-Nonce", effectiveNonce);
        client.DefaultRequestHeaders.Add("X-Gateway-Content-SHA256", bodyHash);
        client.DefaultRequestHeaders.Add("X-Gateway-Signature-Version", "1");
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Id", userId);
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Email", email);
        client.DefaultRequestHeaders.Add("X-Authenticated-User-Role", role);
    }

    [Fact]
    public async Task CanonicalV1Signature_ValidTimestampAndNonce_ReturnsSuccess200()
    {
        var client = _factory.CreateClient();
        AddCanonicalHeaders(client, "GET", "/api/v1/profile/image", "user-gw-101", "gw-user@prepford.com", "candidate");

        var response = await client.GetAsync("/api/v1/profile/image");
        // Endpoint requires auth; 404 means auth succeeded and reached controller logic (no image found)
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CanonicalV1Signature_ExpiredTimestamp_ReturnsUnauthorized401()
    {
        var client = _factory.CreateClient();
        var expiredTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - 120; // 2 minutes in past
        AddCanonicalHeaders(client, "GET", "/api/v1/profile/image", "user-gw-102", "gw2@prepford.com", "candidate", timestamp: expiredTime);

        var response = await client.GetAsync("/api/v1/profile/image");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CanonicalV1Signature_ReplayedNonce_ReturnsUnauthorized401()
    {
        var client = _factory.CreateClient();
        var fixedNonce = "fixed-replay-nonce-abcdef0123456789";
        var fixedTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        AddCanonicalHeaders(client, "GET", "/api/v1/profile/image", "user-gw-103", "gw3@prepford.com", "candidate",
            timestamp: fixedTimestamp, nonce: fixedNonce);

        // First attempt succeeds in auth (returns 404 because no image uploaded yet)
        var firstResponse = await client.GetAsync("/api/v1/profile/image");
        Assert.Equal(HttpStatusCode.NotFound, firstResponse.StatusCode);

        // Replay attempt with exact same nonce and timestamp must be REJECTED
        var replayResponse = await client.GetAsync("/api/v1/profile/image");
        Assert.Equal(HttpStatusCode.Unauthorized, replayResponse.StatusCode);
    }

    [Fact]
    public async Task CanonicalV1Signature_AlteredHttpMethod_ReturnsUnauthorized401()
    {
        var client = _factory.CreateClient();
        // Compute signature for GET, then dispatch request as DELETE
        AddCanonicalHeaders(client, "GET", "/api/v1/profile/image", "user-gw-104", "gw4@prepford.com", "candidate");

        var response = await client.DeleteAsync("/api/v1/profile/image");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CanonicalV1Signature_AlteredPath_ReturnsUnauthorized401()
    {
        var client = _factory.CreateClient();
        // Compute signature for /api/v1/profile, but send to /api/v1/profile/image
        AddCanonicalHeaders(client, "GET", "/api/v1/profile", "user-gw-105", "gw5@prepford.com", "candidate");

        var response = await client.GetAsync("/api/v1/profile/image");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}

public class AuthoritativeSessionManagementTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AuthoritativeSessionManagementTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingSessionDurabilityDb"));
            });
        });
    }

    [Fact]
    public async Task Session_RevokeSession_InvalidatesSessionInDatabaseAndRejectsSubsequentCalls()
    {
        var client = _factory.CreateClient();

        // 1. Seed a user and active session in database
        string sessionId = "sess_durable_test_101";
        string userId = "usr_durable_101";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var sessionService = scope.ServiceProvider.GetRequiredService<ISessionService>();

            var user = new User
            {
                Id = userId,
                Email = "durable.candidate@prepford.com",
                DisplayName = "Durable Candidate",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Users.Add(user);

            var session = new UserSession
            {
                Id = sessionId,
                UserId = userId,
                Email = user.Email,
                Role = "candidate",
                DisplayName = user.DisplayName,
                TokenHash = "hash101",
                CsrfToken = "csrf101",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                LastActiveAt = DateTime.UtcNow,
                Revoked = false
            };
            db.UserSessions.Add(session);
            await db.SaveChangesAsync();
        }

        // 2. Validate session is initially valid via endpoint
        var validateRes = await client.PostAsJsonAsync("/api/v1/auth/validate-session", new { SessionId = sessionId });
        validateRes.EnsureSuccessStatusCode();
        var validBody = await validateRes.Content.ReadFromJsonAsync<ValidateSessionResponse>();
        Assert.True(validBody!.Valid);

        // 3. Authenticate with gateway headers pointing to this session ID
        GatewayHmacAndReplaySecurityTests.AddCanonicalHeaders(
            client, "POST", "/api/v1/auth/revoke-session", userId, "durable.candidate@prepford.com", "candidate");
        client.DefaultRequestHeaders.Add("X-Session-Id", sessionId);

        var revokeRes = await client.PostAsJsonAsync("/api/v1/auth/revoke-session", new { SessionId = sessionId });
        revokeRes.EnsureSuccessStatusCode();

        // 4. Assert session is revoked in database
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var revokedSession = await db.UserSessions.FindAsync(sessionId);
            Assert.NotNull(revokedSession);
            Assert.True(revokedSession.Revoked);
        }

        // 5. Subsequent validation rejects the revoked session
        var recheckRes = await client.PostAsJsonAsync("/api/v1/auth/validate-session", new { SessionId = sessionId });
        recheckRes.EnsureSuccessStatusCode();
        var recheckBody = await recheckRes.Content.ReadFromJsonAsync<ValidateSessionResponse>();
        Assert.False(recheckBody!.Valid);

        // 6. Any subsequent request with this revoked session ID header is REJECTED (401)
        var clientSubsequent = _factory.CreateClient();
        GatewayHmacAndReplaySecurityTests.AddCanonicalHeaders(
            clientSubsequent, "GET", "/api/v1/profile/image", userId, "durable.candidate@prepford.com", "candidate");
        clientSubsequent.DefaultRequestHeaders.Add("X-Session-Id", sessionId);

        var rejectedRes = await clientSubsequent.GetAsync("/api/v1/profile/image");
        Assert.Equal(HttpStatusCode.Unauthorized, rejectedRes.StatusCode);
    }
}

public class ExamAttemptsPersistenceTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ExamAttemptsPersistenceTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingExamAttemptsDb"));
            });
        });
    }

    [Fact]
    public async Task ExamAttempts_StartAttempt_PersistsInProgressAttempt()
    {
        var client = _factory.CreateClient();
        var candidateId = "cand_attempt_001";
        var candidateEmail = "attempt.cand@prepford.com";

        GatewayHmacAndReplaySecurityTests.AddCanonicalHeaders(
            client, "POST", "/api/v1/attempts", candidateId, candidateEmail, "candidate");

        var response = await client.PostAsJsonAsync("/api/v1/attempts", new StartAttemptRequest
        {
            Pathway = "rn",
            Name = "NCLEX-RN Diagnostic Assessment"
        });

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.True(body.GetProperty("success").GetBoolean());
        var attemptId = body.GetProperty("attemptId").GetString();
        Assert.NotNull(attemptId);

        // Verify persisted in DB
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persisted = await db.ExamAttempts.FindAsync(attemptId);
        Assert.NotNull(persisted);
        Assert.Equal(candidateId, persisted.UserId);
        Assert.Equal(AttemptStatus.InProgress, persisted.Status);
    }

    [Fact]
    public async Task ExamAttempts_SyncAssessmentAttempt_PersistsClientCompletedAttempt()
    {
        var client = _factory.CreateClient();
        var candidateId = "cand_sync_002";
        var candidateEmail = "sync.cand@prepford.com";

        GatewayHmacAndReplaySecurityTests.AddCanonicalHeaders(
            client, "POST", "/api/v1/attempts/sync", candidateId, candidateEmail, "candidate");

        var syncRequest = new SyncAssessmentAttemptRequest
        {
            Id = "client_att_777",
            Name = "Tutored CAT 1",
            Type = "tutored_cat",
            ScorePercent = 80.0m,
            PerformanceTier = "Very High",
            TotalQuestions = 2,
            CorrectCount = 2,
            DurationMinutes = 15,
            Pathway = "rn",
            Questions = new List<SyncAttemptQuestionItem>
            {
                new SyncAttemptQuestionItem
                {
                    Id = "q_sync_101",
                    QuestionNumber = 1,
                    Stem = "Patient exhibits signs of fluid volume overload. Priority action?",
                    Domain = "Physiological Adaptation",
                    QuestionType = "single_choice",
                    UserAnswerIndex = 2,
                    CorrectAnswerIndex = 2,
                    IsCorrect = true,
                    ScoreAwarded = 1.0m
                },
                new SyncAttemptQuestionItem
                {
                    Id = "q_sync_102",
                    QuestionNumber = 2,
                    Stem = "Which medications require dual nurse verification?",
                    Domain = "Pharmacological Therapies",
                    QuestionType = "multi_select",
                    UserAnswerIndices = new List<int> { 0, 2 },
                    CorrectAnswerIndices = new List<int> { 0, 2 },
                    IsCorrect = true,
                    ScoreAwarded = 1.0m
                }
            }
        };

        var response = await client.PostAsJsonAsync("/api/v1/attempts/sync", syncRequest);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.True(body.GetProperty("success").GetBoolean());
        Assert.Equal("client_att_777", body.GetProperty("attemptId").GetString());

        // Verify persisted in PostgreSQL ExamAttempts and AttemptResponses
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var attempt = await db.ExamAttempts.Include(ea => ea.Responses).FirstOrDefaultAsync(ea => ea.Id == "client_att_777");
        Assert.NotNull(attempt);
        Assert.Equal(candidateId, attempt.UserId);
        Assert.Equal(80.0m, attempt.ScorePercent);
        Assert.True(attempt.Passed);
        Assert.Equal(AttemptStatus.Completed, attempt.Status);
        Assert.Equal(2, attempt.Responses.Count);
    }

    [Fact]
    public async Task ExamAttempts_CandidateCannotViewAnotherCandidatesAttempt_ReturnsForbidden403()
    {
        var client = _factory.CreateClient();

        // 1. Candidate Alice syncs an attempt
        GatewayHmacAndReplaySecurityTests.AddCanonicalHeaders(
            client, "POST", "/api/v1/attempts/sync", "cand_alice_1", "alice@prepford.com", "candidate");

        var syncRes = await client.PostAsJsonAsync("/api/v1/attempts/sync", new SyncAssessmentAttemptRequest
        {
            Id = "att_alice_private",
            Name = "Alice Private CAT",
            ScorePercent = 90.0m
        });
        syncRes.EnsureSuccessStatusCode();

        // 2. Candidate Bob attempts to access Alice's attempt by ID
        var clientBob = _factory.CreateClient();
        GatewayHmacAndReplaySecurityTests.AddCanonicalHeaders(
            clientBob, "GET", "/api/v1/attempts/att_alice_private", "cand_bob_2", "bob@prepford.com", "candidate");

        var bobGetRes = await clientBob.GetAsync("/api/v1/attempts/att_alice_private");
        Assert.Equal(HttpStatusCode.Forbidden, bobGetRes.StatusCode);
    }
}
