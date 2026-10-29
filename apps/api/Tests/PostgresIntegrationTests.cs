using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;

namespace Preform.Api.Tests;

public class PostgresTestFixture : WebApplicationFactory<Program>
{
    public const string ConnectionString = "Host=localhost;Port=5432;Database=prepford;Username=postgres;Password=postgres";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseNpgsql(ConnectionString);
            });
        });
    }

    public async Task InitializePostgresDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<PostgresTestFixture>>();

        await context.Database.MigrateAsync();
        await CatalogSeeder.SeedAsync(context, logger);
    }

    public static void AddGatewayHeaders(HttpClient client, string userId, string email, string role, string name = "Test User")
    {
        var secret = "prepford-default-internal-gateway-secret-32-chars!";
        var payload = $"{userId}|{email}|{role}";
        var sig = Convert.ToHexString(
            HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(payload))
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
}

public class PostgresIntegrationTests : IClassFixture<PostgresTestFixture>
{
    private readonly PostgresTestFixture _factory;

    public PostgresIntegrationTests(PostgresTestFixture factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Schema_DatabaseMigrationsAndSeeding_CreatesAllTables()
    {
        await _factory.InitializePostgresDatabaseAsync();

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Verify core tables exist and can be queried
        var roleCount = await context.Roles.CountAsync();
        Assert.True(roleCount >= 6, $"Expected at least 6 roles seeded, found {roleCount}");

        var candidateRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "candidate");
        Assert.NotNull(candidateRole);

        var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "admin");
        Assert.NotNull(adminRole);

        var programmes = await context.Programmes.ToListAsync();
        Assert.True(programmes.Count >= 2);
    }

    [Fact]
    public async Task ReferentialIntegrity_UserSessionWithoutValidUser_ThrowsDbUpdateException()
    {
        await _factory.InitializePostgresDatabaseAsync();

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var orphanSession = new UserSession
        {
            Id = "sess_" + Guid.NewGuid().ToString("N"),
            UserId = "non_existent_user_id_" + Guid.NewGuid().ToString("N"),
            Email = "orphan@example.com",
            TokenHash = "hash_" + Guid.NewGuid().ToString("N"),
            Role = "candidate",
            DisplayName = "Orphan Session",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            Revoked = false
        };

        context.UserSessions.Add(orphanSession);

        await Assert.ThrowsAsync<DbUpdateException>(async () =>
        {
            await context.SaveChangesAsync();
        });
    }

    [Fact]
    public async Task UniqueConstraint_DuplicateUserEmail_ThrowsDbUpdateException()
    {
        await _factory.InitializePostgresDatabaseAsync();

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var uniqueEmail = $"unique_{Guid.NewGuid():N}@nursing.edu";
        var user1 = new User
        {
            Id = "usr_" + Guid.NewGuid().ToString("N"),
            Email = uniqueEmail,
            DisplayName = "User One",
            PasswordHash = "RESET_REQUIRED_test",
            Pathway = "rn",
            ActivePlan = "NCLEX-RN Complete",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var user2 = new User
        {
            Id = "usr_" + Guid.NewGuid().ToString("N"),
            Email = uniqueEmail,
            DisplayName = "User Two Duplicate",
            PasswordHash = "RESET_REQUIRED_test",
            Pathway = "rn",
            ActivePlan = "NCLEX-RN Complete",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Users.Add(user1);
        await context.SaveChangesAsync();

        context.Users.Add(user2);
        await Assert.ThrowsAsync<DbUpdateException>(async () =>
        {
            await context.SaveChangesAsync();
        });
    }

    [Fact]
    public async Task TransactionRollback_PreservesCleanState_WhenCheckoutFails()
    {
        await _factory.InitializePostgresDatabaseAsync();

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Create a test user
        var testUser = new User
        {
            Id = "usr_tx_" + Guid.NewGuid().ToString("N"),
            Email = $"tx_{Guid.NewGuid():N}@nursing.edu",
            DisplayName = "Transaction Test User",
            PasswordHash = "RESET_REQUIRED_test",
            Pathway = "rn",
            ActivePlan = "None",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(testUser);
        await context.SaveChangesAsync();

        var orderId = "ord_tx_" + Guid.NewGuid().ToString("N");

        // Begin transaction and simulate a failure before commit
        await using (var tx = await context.Database.BeginTransactionAsync())
        {
            var plan = await context.SubscriptionPlans.FirstOrDefaultAsync(p => p.IsActive);
            Assert.NotNull(plan);

            var order = new Order
            {
                Id = orderId,
                UserId = testUser.Id,
                PlanId = plan.Id,
                AmountCents = plan.PriceCents,
                Currency = "usd",
                Status = OrderStatus.Pending,
                ProviderSessionId = "prov_" + Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            context.Orders.Add(order);
            await context.SaveChangesAsync();

            // Simulate unexpected failure and roll back
            await tx.RollbackAsync();
        }

        // Verify order does NOT exist in PostgreSQL after rollback
        using var verifyScope = _factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var foundOrder = await verifyContext.Orders.FindAsync(orderId);
        Assert.Null(foundOrder);
    }

    [Fact]
    public async Task RBAC_AdminSubscriptions_CandidateAccessIsForbidden_403()
    {
        await _factory.InitializePostgresDatabaseAsync();
        var client = _factory.CreateClient();

        PostgresTestFixture.AddGatewayHeaders(client, "usr_cand_01", "cand@nursing.edu", "candidate");

        var response = await client.GetAsync("/api/v1/admin/subscriptions");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RBAC_AdminSubscriptions_InstructorAccessIsForbidden_403()
    {
        await _factory.InitializePostgresDatabaseAsync();
        var client = _factory.CreateClient();

        PostgresTestFixture.AddGatewayHeaders(client, "usr_inst_01", "instructor@nursing.edu", "instructor");

        var response = await client.GetAsync("/api/v1/admin/subscriptions");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RBAC_AdminSubscriptions_AdminAccessIsAllowed_200()
    {
        await _factory.InitializePostgresDatabaseAsync();
        var client = _factory.CreateClient();

        PostgresTestFixture.AddGatewayHeaders(client, "usr_admin_01", "admin@prepford.edu", "admin");

        var response = await client.GetAsync("/api/v1/admin/subscriptions");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task RBAC_AdminSubscriptions_SuperAdminAccessIsAllowed_200()
    {
        await _factory.InitializePostgresDatabaseAsync();
        var client = _factory.CreateClient();

        PostgresTestFixture.AddGatewayHeaders(client, "usr_super_01", "superadmin@prepford.edu", "superadmin");

        var response = await client.GetAsync("/api/v1/admin/subscriptions");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task RBAC_AdminSubscriptions_Unauthenticated_Returns401()
    {
        await _factory.InitializePostgresDatabaseAsync();
        var client = _factory.CreateClient();
        // Clear all authorization headers
        client.DefaultRequestHeaders.Clear();

        var response = await client.GetAsync("/api/v1/admin/subscriptions");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Profile_DisallowedRoleAndPlanTampering_IgnoredOrRejected()
    {
        await _factory.InitializePostgresDatabaseAsync();

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var candidate = new User
        {
            Id = "usr_tamper_" + Guid.NewGuid().ToString("N"),
            Email = $"tamper_{Guid.NewGuid():N}@nursing.edu",
            DisplayName = "Honest Candidate",
            PasswordHash = "RESET_REQUIRED_test",
            Pathway = "rn",
            ActivePlan = "NCLEX-RN Complete",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(candidate);
        await context.SaveChangesAsync();

        var client = _factory.CreateClient();
        PostgresTestFixture.AddGatewayHeaders(client, candidate.Id, candidate.Email, "candidate", candidate.DisplayName);

        // Attempt to tamper with role, activePlan, or pathway via profile PUT
        var tamperPayload = new
        {
            displayName = "Tampered Candidate",
            role = "admin",
            activePlan = "NCLEX-RN & PN All-Access",
            pathway = "both"
        };

        var putResponse = await client.PutAsJsonAsync("/api/v1/profile", tamperPayload);
        putResponse.EnsureSuccessStatusCode();

        // Verify in PostgreSQL that role and activePlan were NOT escalated
        using var verifyScope = _factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var updatedUser = await verifyContext.Users.FindAsync(candidate.Id);

        Assert.NotNull(updatedUser);
        Assert.Equal("Tampered Candidate", updatedUser.DisplayName);
        Assert.Equal("rn", updatedUser.Pathway);
        Assert.Equal("NCLEX-RN Complete", updatedUser.ActivePlan);
    }

    [Fact]
    public async Task Webhook_InvalidSignature_ReturnsBadRequest_400()
    {
        await _factory.InitializePostgresDatabaseAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Clear();

        client.DefaultRequestHeaders.Add("X-Webhook-Signature", "invalid_forged_signature_hash");

        var payload = new PaymentWebhookRequest
        {
            EventId = "evt_" + Guid.NewGuid().ToString("N"),
            EventType = "checkout.session.completed",
            OrderId = "ord_001",
            ProviderSessionId = "sess_" + Guid.NewGuid().ToString("N"),
            AmountCents = 5900
        };

        var response = await client.PostAsJsonAsync("/api/v1/webhooks/payments", payload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task FailurePath_SafeErrorResponses_NeverLeakStackTraces()
    {
        await _factory.InitializePostgresDatabaseAsync();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Clear();

        // Send a malformed register request (empty email)
        var malformedRequest = new RegisterRequest
        {
            Email = "",
            Password = "",
            DisplayName = ""
        };

        var response = await client.PostAsJsonAsync("/api/v1/auth/register", malformedRequest);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("at Preform.", body);
        Assert.DoesNotContain("System.Exception", body);
        Assert.DoesNotContain("Npgsql.NpgsqlException", body);
        Assert.DoesNotContain("PostgresException", body);
    }
}
