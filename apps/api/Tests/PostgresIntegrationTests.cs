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
using Npgsql;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;
using Preform.Api.Services;
using Xunit;
using Xunit.Abstractions;

namespace Preform.Api.Tests;

public class PostgresTestFixture : WebApplicationFactory<Program>
{
    private const string RequiredDatabaseName = "prepford_gateb_verification";
    private const string ConnectionStringEnvironmentVariable = "PREFORM_GATEB_TEST_CONNECTION_STRING";

    public static string ConnectionString
    {
        get
        {
            var configured = Environment.GetEnvironmentVariable(ConnectionStringEnvironmentVariable);
            if (string.IsNullOrWhiteSpace(configured))
            {
                throw new InvalidOperationException(
                    $"Set {ConnectionStringEnvironmentVariable} to an isolated loopback PostgreSQL database named {RequiredDatabaseName}.");
            }

            var connectionString = new NpgsqlConnectionStringBuilder(configured);
            if (!IPAddress.TryParse(connectionString.Host, out var address)
                || !IPAddress.IsLoopback(address)
                || !string.Equals(connectionString.Database, RequiredDatabaseName, StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    $"PostgreSQL integration tests only accept a loopback connection to the isolated {RequiredDatabaseName} database.");
            }

            return connectionString.ConnectionString;
        }
    }


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
                options.LogTo(Console.WriteLine, LogLevel.Information);
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

[Collection("PostgreSQL integration tests")]
public class PostgresIntegrationTests : IClassFixture<PostgresTestFixture>
{
    private readonly PostgresTestFixture _factory;
    private readonly ITestOutputHelper? _output;

    public PostgresIntegrationTests(PostgresTestFixture factory, ITestOutputHelper? output = null)
    {
        _factory = factory;
        _output = output;
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

        // 1. Attempt to tamper with role, activePlan, or pathway via profile PUT -> MUST BE REJECTED with 403
        var tamperPayload = new
        {
            displayName = "Tampered Candidate",
            role = "admin",
            activePlan = "NCLEX-RN & PN All-Access",
            pathway = "both"
        };

        var tamperResponse = await client.PutAsJsonAsync("/api/v1/profile", tamperPayload);
        Assert.Equal(HttpStatusCode.Forbidden, tamperResponse.StatusCode);

        // 2. Legitimate update of allowed fields (displayName, studyReminders) -> MUST SUCCEED with 200 OK
        var legitimatePayload = new
        {
            displayName = "Updated Candidate Name",
            studyReminders = false
        };

        var validResponse = await client.PutAsJsonAsync("/api/v1/profile", legitimatePayload);
        validResponse.EnsureSuccessStatusCode();

        // 3. Verify in PostgreSQL that allowed updates persisted and disallowed fields remained untouched
        using var verifyScope = _factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var updatedUser = await verifyContext.Users.FindAsync(candidate.Id);

        Assert.NotNull(updatedUser);
        Assert.Equal("Updated Candidate Name", updatedUser.DisplayName);
        Assert.False(updatedUser.StudyReminders);
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
        Assert.DoesNotContain("at Prepford.", body);
        Assert.DoesNotContain("at Preform.", body);
        Assert.DoesNotContain("System.Exception", body);
        Assert.DoesNotContain("Npgsql.NpgsqlException", body);
        Assert.DoesNotContain("PostgresException", body);
    }

    [Fact]
    public async Task Postgres_SequenceAllocation_GeneratesSequentialCodesFromDatabaseSequences()
    {
        await _factory.InitializePostgresDatabaseAsync();
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var service = scope.ServiceProvider.GetRequiredService<IExaminationCodeService>();

        var rnCode1 = await service.AllocateCodeAsync("rn");
        var rnCode2 = await service.AllocateCodeAsync("rn");
        var pnCode1 = await service.AllocateCodeAsync("pn");

        Assert.Matches(@"^RN-EX-\d{6}$", rnCode1);
        Assert.Matches(@"^RN-EX-\d{6}$", rnCode2);
        Assert.Matches(@"^PN-EX-\d{6}$", pnCode1);
        Assert.NotEqual(rnCode1, rnCode2);
    }

    [Fact]
    public async Task Postgres_PartialUniqueIndexes_EnforcesSinglePublishedAndSingleDraftPerFamily()
    {
        await _factory.InitializePostgresDatabaseAsync();
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var examFam = new Examination
        {
            Id = "fam_pg_" + Guid.NewGuid().ToString("N"),
            Code = "RN-EX-" + Random.Shared.Next(100000, 999999).ToString("D6"),
            Pathway = "rn",
            Title = "Postgres Verification Exam",
            CreatedBy = "admin_pg"
        };
        context.Examinations.Add(examFam);

        var rev1 = new Exam
        {
            Id = "rev_pg_pub1_" + Guid.NewGuid().ToString("N"),
            ExaminationId = examFam.Id,
            RevisionNumber = 1,
            LifecycleState = ExamLifecycleState.Published,
            IsPublished = true,
            Title = "Rev 1 Published",
            Pathway = "rn",
            CreatedBy = "admin_pg"
        };
        context.Exams.Add(rev1);
        await context.SaveChangesAsync();

        // Attempting to insert a SECOND Published revision under the same ExaminationId
        // must trigger a PostgreSQL unique constraint violation (IX_Exams_ExaminationId_SinglePublished)
        var rev2DuplicatePublished = new Exam
        {
            Id = "rev_pg_pub2_" + Guid.NewGuid().ToString("N"),
            ExaminationId = examFam.Id,
            RevisionNumber = 2,
            LifecycleState = ExamLifecycleState.Published,
            IsPublished = true,
            Title = "Rev 2 Duplicate Published",
            Pathway = "rn",
            CreatedBy = "admin_pg"
        };
        context.Exams.Add(rev2DuplicatePublished);

        var exPub = await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
        Assert.Contains("IX_Exams_ExaminationId_SinglePublished", exPub.InnerException?.Message ?? exPub.Message);

        // Detach the failed entity to clean context tracker
        context.Entry(rev2DuplicatePublished).State = EntityState.Detached;

        // Now test ActiveDraft partial unique index
        var draft1 = new Exam
        {
            Id = "rev_pg_draft1_" + Guid.NewGuid().ToString("N"),
            ExaminationId = examFam.Id,
            RevisionNumber = 3,
            LifecycleState = ExamLifecycleState.Draft,
            IsPublished = false,
            Title = "Rev 3 Draft",
            Pathway = "rn",
            CreatedBy = "admin_pg"
        };
        context.Exams.Add(draft1);
        await context.SaveChangesAsync();

        var draft2Duplicate = new Exam
        {
            Id = "rev_pg_draft2_" + Guid.NewGuid().ToString("N"),
            ExaminationId = examFam.Id,
            RevisionNumber = 4,
            LifecycleState = ExamLifecycleState.Draft,
            IsPublished = false,
            Title = "Rev 4 Duplicate Draft",
            Pathway = "rn",
            CreatedBy = "admin_pg"
        };
        context.Exams.Add(draft2Duplicate);

        var exDraft = await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
        Assert.Contains("IX_Exams_ExaminationId_ActiveDraft", exDraft.InnerException?.Message ?? exDraft.Message);
    }

    [Fact]
    public async Task Postgres_AttemptMetadataSnapshot_PersistsAndQueriesJsonb()
    {
        await _factory.InitializePostgresDatabaseAsync();
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var user = await context.Users.FirstOrDefaultAsync() ?? new User
        {
            Id = "usr_pg_" + Guid.NewGuid().ToString("N"),
            Email = "pg.user@prepford.com",
            PasswordHash = "hash",
            DisplayName = "PG User"
        };
        if (context.Entry(user).State == EntityState.Detached)
        {
            context.Users.Add(user);
        }

        var exam = new Exam
        {
            Id = "exam_pg_snap_" + Guid.NewGuid().ToString("N"),
            Title = "Postgres Snapshot Practice Exam",
            Pathway = "rn",
            PassingScorePercent = 75.0m,
            IsPublished = true,
            LifecycleState = ExamLifecycleState.Published
        };
        context.Exams.Add(exam);
        await context.SaveChangesAsync();

        var snapshotJson = JsonSerializer.Serialize(new
        {
            schemaVersion = 1,
            snapshotCreatedAtUtc = DateTime.UtcNow,
            examination = new { id = exam.ExaminationId ?? exam.Id, code = "RN-EX-000001", pathway = "rn", title = exam.Title },
            revision = new { id = exam.Id, revisionNumber = 1, title = exam.Title, timeLimitMinutes = exam.TimeLimitMinutes, passingScorePercent = exam.PassingScorePercent }
        });

        var attempt = new ExamAttempt
        {
            Id = "att_jsonb_" + Guid.NewGuid().ToString("N"),
            UserId = user.Id,
            ExamId = exam.Id,
            Status = AttemptStatus.InProgress,
            ScorePercent = 0.0m,
            Passed = false,
            StartedAt = DateTime.UtcNow,
            MetadataSnapshot = snapshotJson
        };
        context.ExamAttempts.Add(attempt);
        await context.SaveChangesAsync();

        // Read back from database
        using var readScope = _factory.Services.CreateScope();
        var readContext = readScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persisted = await readContext.ExamAttempts.FindAsync(attempt.Id);

        Assert.NotNull(persisted);
        Assert.NotNull(persisted.MetadataSnapshot);
        using var doc = JsonDocument.Parse(persisted.MetadataSnapshot);
        Assert.Equal(1, doc.RootElement.GetProperty("schemaVersion").GetInt32());
    }

    [Fact]
    public async Task Postgres_QuestionMembershipAndMetadataUpdate_WorksAtomically()
    {
        await _factory.InitializePostgresDatabaseAsync();
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var examFam = new Examination
        {
            Id = "exam_fam_pg_m_" + Guid.NewGuid().ToString("N"),
            Pathway = "rn",
            Code = "RN-EX-" + Guid.NewGuid().ToString("N")[..6].ToUpperInvariant(),
            Title = "Postgres Authoring Licensure Exam",
            CreatedBy = "admin_pg"
        };
        context.Examinations.Add(examFam);

        var draftRevision = new Exam
        {
            Id = "rev_pg_auth_" + Guid.NewGuid().ToString("N"),
            ExaminationId = examFam.Id,
            RevisionNumber = 1,
            LifecycleState = ExamLifecycleState.Draft,
            ConcurrencyToken = 1,
            Title = "Draft Rev 1",
            Pathway = "rn",
            CreatedBy = "admin_pg"
        };
        context.Exams.Add(draftRevision);

        var question = new Question
        {
            Id = "q_pg_m_" + Guid.NewGuid().ToString("N"),
            Stem = "Postgres Membership Clinical Question",
            Pathway = "rn",
            Status = QuestionStatus.Approved,
            QuestionTypeKey = "single-choice"
        };
        context.Questions.Add(question);
        await context.SaveChangesAsync();

        // 1. Author question association
        var examQuestion = new ExamQuestion
        {
            Id = "eq_pg_" + Guid.NewGuid().ToString("N"),
            ExamId = draftRevision.Id,
            QuestionId = question.Id,
            DisplayOrder = 1
        };
        context.ExamQuestions.Add(examQuestion);
        draftRevision.ConcurrencyToken++;
        await context.SaveChangesAsync();

        // 2. Verify duplicate question index in PostgreSQL throws DbUpdateException
        var dupQuestion = new ExamQuestion
        {
            Id = "eq_pg_dup_" + Guid.NewGuid().ToString("N"),
            ExamId = draftRevision.Id,
            QuestionId = question.Id,
            DisplayOrder = 2
        };
        context.ExamQuestions.Add(dupQuestion);
        var ex = await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
        Assert.Contains("IX_ExamQuestions_ExamId_QuestionId", ex.InnerException?.Message ?? ex.Message);
    }

    [Fact]
    public async Task Postgres_ExaminationLibraryQuery_FiltersSortsAndPaginatesAgainstPostgreSql()
    {
        await _factory.InitializePostgresDatabaseAsync();
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var lifecycleService = scope.ServiceProvider.GetRequiredService<IExamLifecycleService>();

        var adminClaims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "admin_pg_disc"),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim("role", "Admin")
        }, "TestAuth"));

        var suffix = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();

        // 1. Seed RN family with Rev 1 (Published) and Rev 2 (Draft)
        var rnFam = new Examination
        {
            Id = "fam_rn_pg_" + suffix,
            Pathway = "rn",
            Code = "RN-EX-" + suffix,
            Title = $"NCLEX-RN Postgres Discovery Exam {suffix}",
            CreatedBy = "admin_pg_disc",
            CreatedAt = DateTime.UtcNow
        };
        context.Examinations.Add(rnFam);

        var rnRev1 = new Exam
        {
            Id = "rev_rn_1_" + suffix,
            ExaminationId = rnFam.Id,
            RevisionNumber = 1,
            LifecycleState = ExamLifecycleState.Published,
            IsPublished = true,
            Title = $"RN Discovery Rev 1 Published {suffix}",
            Pathway = "rn",
            CreatedBy = "admin_pg_disc"
        };
        var rnRev2 = new Exam
        {
            Id = "rev_rn_2_" + suffix,
            ExaminationId = rnFam.Id,
            RevisionNumber = 2,
            LifecycleState = ExamLifecycleState.Draft,
            IsPublished = false,
            Title = $"RN Discovery Rev 2 Draft {suffix}",
            Pathway = "rn",
            CreatedBy = "admin_pg_disc"
        };
        context.Exams.AddRange(rnRev1, rnRev2);

        // 2. Seed PN family with Rev 1 (Published)
        var pnFam = new Examination
        {
            Id = "fam_pn_pg_" + suffix,
            Pathway = "pn",
            Code = "PN-EX-" + suffix,
            Title = $"NCLEX-PN Postgres Discovery Exam {suffix}",
            CreatedBy = "admin_pg_disc",
            CreatedAt = DateTime.UtcNow
        };
        context.Examinations.Add(pnFam);

        var pnRev1 = new Exam
        {
            Id = "rev_pn_1_" + suffix,
            ExaminationId = pnFam.Id,
            RevisionNumber = 1,
            LifecycleState = ExamLifecycleState.Published,
            IsPublished = true,
            Title = $"PN Discovery Rev 1 Published {suffix}",
            Pathway = "pn",
            CreatedBy = "admin_pg_disc"
        };
        context.Exams.Add(pnRev1);

        await context.SaveChangesAsync();

        // 3. Query RN pathway
        var rnQueryResult = await lifecycleService.QueryExaminationsAsync(new ExaminationQueryParameters
        {
            Pathway = "rn",
            Search = suffix
        }, adminClaims);

        Assert.True(rnQueryResult.Success);
        var rnItem = Assert.Single(rnQueryResult.Items);
        Assert.Equal(rnFam.Code, rnItem.Code);
        Assert.Equal(2, rnItem.RevisionCount);
        Assert.NotNull(rnItem.PublishedRevision);
        Assert.Equal(1, rnItem.PublishedRevision!.RevisionNumber);
        Assert.NotNull(rnItem.LatestRevision);
        Assert.Equal(2, rnItem.LatestRevision!.RevisionNumber);

        // 4. Query by RevisionStatus = "Draft"
        var draftQueryResult = await lifecycleService.QueryExaminationsAsync(new ExaminationQueryParameters
        {
            RevisionStatus = "Draft",
            Search = suffix
        }, adminClaims);

        Assert.Single(draftQueryResult.Items);
        Assert.Equal(rnFam.Id, draftQueryResult.Items[0].Id);

        // 5. Query Family Revisions in PostgreSQL
        var familyRevsResult = await lifecycleService.GetFamilyRevisionsAsync(rnFam.Id, adminClaims);
        Assert.True(familyRevsResult.Success);
        Assert.Equal(2, familyRevsResult.Revisions.Count);
        // Descending order verification
        Assert.Equal(2, familyRevsResult.Revisions[0].RevisionNumber);
        Assert.Equal(1, familyRevsResult.Revisions[1].RevisionNumber);
    }

    [Fact]
    public async Task Postgres_ExaminationLibraryQuery_GroupedQuestionCounts_TranslatesToSqlAndCalculatesAccurately()
    {
        await _factory.InitializePostgresDatabaseAsync();
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var adminClaims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "admin_pg_counts"),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim("role", "Admin")
        }, "TestAuth"));

        var suffix = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();

        // 1. Seed Questions for memberships
        var q1 = new Question { Id = $"q_{suffix}_1", Stem = "Clinical Q1", Pathway = "rn", Status = QuestionStatus.Published, QuestionTypeKey = "single-choice" };
        var q2 = new Question { Id = $"q_{suffix}_2", Stem = "Clinical Q2", Pathway = "rn", Status = QuestionStatus.Published, QuestionTypeKey = "single-choice" };
        var q3 = new Question { Id = $"q_{suffix}_3", Stem = "Clinical Q3", Pathway = "rn", Status = QuestionStatus.Published, QuestionTypeKey = "single-choice" };
        var q4 = new Question { Id = $"q_{suffix}_4", Stem = "Clinical Q4", Pathway = "pn", Status = QuestionStatus.Published, QuestionTypeKey = "single-choice" };
        var q5 = new Question { Id = $"q_{suffix}_5", Stem = "Clinical Q5", Pathway = "pn", Status = QuestionStatus.Published, QuestionTypeKey = "single-choice" };
        var q6 = new Question { Id = $"q_{suffix}_6", Stem = "Clinical Q6", Pathway = "pn", Status = QuestionStatus.Published, QuestionTypeKey = "single-choice" };
        var q7 = new Question { Id = $"q_{suffix}_7", Stem = "Clinical Q7", Pathway = "pn", Status = QuestionStatus.Published, QuestionTypeKey = "single-choice" };
        context.Questions.AddRange(q1, q2, q3, q4, q5, q6, q7);

        // 2. Seed Family 1 (RN) with Rev 1 (3 questions) and Rev 2 (0 questions)
        var rnFam = new Examination
        {
            Id = "fam_rn_cnt_" + suffix,
            Pathway = "rn",
            Code = "RN-CNT-" + suffix,
            Title = $"NCLEX-RN Count Exam {suffix}",
            CreatedBy = "admin_pg_counts",
            CreatedAt = DateTime.UtcNow
        };
        context.Examinations.Add(rnFam);

        var rnRev1 = new Exam
        {
            Id = "rev_rn_c1_" + suffix,
            ExaminationId = rnFam.Id,
            RevisionNumber = 1,
            LifecycleState = ExamLifecycleState.Published,
            IsPublished = true,
            Title = $"RN Count Rev 1 Published {suffix}",
            Pathway = "rn",
            CreatedBy = "admin_pg_counts"
        };
        var rnRev2 = new Exam
        {
            Id = "rev_rn_c2_" + suffix,
            ExaminationId = rnFam.Id,
            RevisionNumber = 2,
            LifecycleState = ExamLifecycleState.Draft,
            IsPublished = false,
            Title = $"RN Count Rev 2 Draft {suffix}",
            Pathway = "rn",
            CreatedBy = "admin_pg_counts"
        };
        context.Exams.AddRange(rnRev1, rnRev2);

        context.ExamQuestions.AddRange(
            new ExamQuestion { Id = $"eq_{suffix}_1", ExamId = rnRev1.Id, QuestionId = q1.Id, DisplayOrder = 1 },
            new ExamQuestion { Id = $"eq_{suffix}_2", ExamId = rnRev1.Id, QuestionId = q2.Id, DisplayOrder = 2 },
            new ExamQuestion { Id = $"eq_{suffix}_3", ExamId = rnRev1.Id, QuestionId = q3.Id, DisplayOrder = 3 }
        );

        // 3. Seed Family 2 (PN) with Rev 1 (4 questions)
        var pnFam = new Examination
        {
            Id = "fam_pn_cnt_" + suffix,
            Pathway = "pn",
            Code = "PN-CNT-" + suffix,
            Title = $"NCLEX-PN Count Exam {suffix}",
            CreatedBy = "admin_pg_counts",
            CreatedAt = DateTime.UtcNow
        };
        context.Examinations.Add(pnFam);

        var pnRev1 = new Exam
        {
            Id = "rev_pn_c1_" + suffix,
            ExaminationId = pnFam.Id,
            RevisionNumber = 1,
            LifecycleState = ExamLifecycleState.Published,
            IsPublished = true,
            Title = $"PN Count Rev 1 Published {suffix}",
            Pathway = "pn",
            CreatedBy = "admin_pg_counts"
        };
        context.Exams.Add(pnRev1);

        context.ExamQuestions.AddRange(
            new ExamQuestion { Id = $"eq_{suffix}_4", ExamId = pnRev1.Id, QuestionId = q4.Id, DisplayOrder = 1 },
            new ExamQuestion { Id = $"eq_{suffix}_5", ExamId = pnRev1.Id, QuestionId = q5.Id, DisplayOrder = 2 },
            new ExamQuestion { Id = $"eq_{suffix}_6", ExamId = pnRev1.Id, QuestionId = q6.Id, DisplayOrder = 3 },
            new ExamQuestion { Id = $"eq_{suffix}_7", ExamId = pnRev1.Id, QuestionId = q7.Id, DisplayOrder = 4 }
        );

        await context.SaveChangesAsync();

        // 4. Set up an isolated DbContext with SQL command logging to capture queries
        var executedSqlCommands = new List<string>();
        var loggingOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(PostgresTestFixture.ConnectionString)
            .LogTo(msg => executedSqlCommands.Add(msg), LogLevel.Information)
            .Options;

        using var testContext = new AppDbContext(loggingOptions);
        var service = new ExamLifecycleService(testContext);

        // 5. Execute Query for RN pathway
        executedSqlCommands.Clear();
        var rnResult = await service.QueryExaminationsAsync(new ExaminationQueryParameters
        {
            Pathway = "rn",
            Search = suffix
        }, adminClaims);

        Assert.True(rnResult.Success);
        var rnItem = Assert.Single(rnResult.Items);
        Assert.Equal(rnFam.Code, rnItem.Code);
        Assert.Equal(2, rnItem.RevisionCount);

        // Verify Question counts
        Assert.NotNull(rnItem.PublishedRevision);
        Assert.Equal(1, rnItem.PublishedRevision!.RevisionNumber);
        Assert.Equal(3, rnItem.PublishedRevision.QuestionCount); // 3 questions

        Assert.NotNull(rnItem.LatestRevision);
        Assert.Equal(2, rnItem.LatestRevision!.RevisionNumber);
        Assert.Equal(0, rnItem.LatestRevision.QuestionCount); // 0 questions

        // Verify legacy list populated correctly
        var legacyFam = Assert.Single(rnResult.Examinations);
        Assert.Equal(3, legacyFam.Revisions.First(r => r.Id == rnRev1.Id).QuestionCount);
        Assert.Equal(0, legacyFam.Revisions.First(r => r.Id == rnRev2.Id).QuestionCount);

        // 6. Inspect captured SQL
        // Query 1: COUNT(*) for pagination
        // Query 2: Paged slice of examinations + child revisions (NO join to ExamQuestions)
        // Query 3: Grouped COUNT(*) on ExamQuestions
        foreach (var cmd in executedSqlCommands)
        {
            _output?.WriteLine("CAPTURED SQL: " + cmd);
        }

        // Verify that the paged slice query does NOT include ExamQuestions
        var pagedSliceQuery = executedSqlCommands.FirstOrDefault(c => c.Contains("FROM \"Examinations\"") || c.Contains("FROM ("));
        Assert.NotNull(pagedSliceQuery);
        Assert.DoesNotContain("ExamQuestions", pagedSliceQuery);

        // Verify that the question count query groups by ExamId and counts in SQL
        var groupedCountQuery = executedSqlCommands.FirstOrDefault(c => c.Contains("ExamQuestions"));
        Assert.NotNull(groupedCountQuery);
        Assert.Contains("GROUP BY", groupedCountQuery, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("count(*)", groupedCountQuery, StringComparison.OrdinalIgnoreCase);

        // 7. Verify Candidate restricted viewer
        var candidateClaims = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "cand_pg_cnt"),
            new Claim(ClaimTypes.Role, "Candidate"),
            new Claim("role", "Candidate")
        }, "TestAuth"));

        var candResult = await service.QueryExaminationsAsync(new ExaminationQueryParameters
        {
            Search = suffix
        }, candidateClaims);

        Assert.True(candResult.Success);
        Assert.Equal(2, candResult.Items.Count); // rnFam and pnFam
        var candRn = candResult.Items.First(i => i.Id == rnFam.Id);
        Assert.Equal(1, candRn.RevisionCount); // only published revision
        Assert.NotNull(candRn.PublishedRevision);
        Assert.Equal(3, candRn.PublishedRevision!.QuestionCount);
        Assert.Equal(1, candRn.LatestRevision?.RevisionNumber); // draft revision (rev 2) not exposed as latest
        Assert.Equal("Published", candRn.LatestRevision?.LifecycleState);
    }
}
