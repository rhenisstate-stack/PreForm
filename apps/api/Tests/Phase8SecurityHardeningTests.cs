using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Preform.Api.Controllers;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;
using Preform.Api.Services.Grading;
using Xunit;

namespace Preform.Api.Tests;

public class Phase8SecurityHardeningTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public Phase8SecurityHardeningTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("TestingPhase8SecurityHardeningDb"));
            });
        });
    }

    private static AppDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }

    private static JsonElement ToJsonElement(object? value)
    {
        var json = JsonSerializer.Serialize(value);
        return JsonDocument.Parse(json).RootElement;
    }

    private static (ExamAttemptsController controller, SessionSecurityService sessionSecurity, PasswordHasher<User> hasher) CreateController(
        AppDbContext context,
        string? callerUserId = null,
        string callerRole = "candidate")
    {
        var nullLogger = NullLogger<ExamAttemptsController>.Instance;
        var resolver = new QuestionGraderResolver(QuestionTypeRegistry.Instance);
        var validationService = new ResponseValidationService(context, resolver);
        var questionService = new AttemptQuestionService(context);
        var sessionLogger = NullLogger<SessionSecurityService>.Instance;
        var sessionSecurity = new SessionSecurityService(context, sessionLogger);
        var hasher = new PasswordHasher<User>();

        var controller = new ExamAttemptsController(
            context,
            nullLogger,
            validationService,
            questionService,
            sessionSecurity,
            hasher);

        var claims = new List<Claim>();
        if (!string.IsNullOrWhiteSpace(callerUserId))
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, callerUserId));
            claims.Add(new Claim(ClaimTypes.Role, callerRole));
            claims.Add(new Claim("role", callerRole));
        }

        var identity = new ClaimsIdentity(claims, callerUserId != null ? "TestAuth" : null);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity)
            }
        };

        return (controller, sessionSecurity, hasher);
    }

    private static async Task<(User user, Exam exam, ExamAttempt attempt)> SeedExamAttemptAsync(
        AppDbContext context,
        PasswordHasher<User> hasher,
        string userId = "user_p8_01",
        string email = "learner_p8@prepford.com",
        string password = "CorrectPassword123!",
        int timeLimitMinutes = 60,
        DateTime? startedAt = null)
    {
        var user = new User
        {
            Id = userId,
            Email = email,
            DisplayName = "Phase 8 Candidate",
            IsActive = true,
            SecurityVersion = 1,
            Pathway = "rn",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        context.Users.Add(user);

        var exam = new Exam
        {
            Id = $"exam_{Guid.NewGuid():N}",
            Title = "NCLEX-RN Phase 8 Comprehensive Exam",
            Pathway = "rn",
            TimeLimitMinutes = timeLimitMinutes,
            LifecycleState = ExamLifecycleState.Published,
            IsPublished = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Exams.Add(exam);

        var attempt = new ExamAttempt
        {
            Id = $"attempt_{Guid.NewGuid():N}",
            UserId = user.Id,
            ExamId = exam.Id,
            Status = AttemptStatus.InProgress,
            StartedAt = startedAt ?? DateTime.UtcNow.AddMinutes(-10),
            Exam = exam,
            User = user
        };
        context.ExamAttempts.Add(attempt);

        await context.SaveChangesAsync();
        return (user, exam, attempt);
    }

    [Fact]
    public async Task Reauthenticate_RateLimit_AfterFiveFailedAttempts_Returns429TooManyRequests()
    {
        ExamAttemptsController.ResetReauthRateLimitsForTesting();
        using var context = CreateInMemoryContext(nameof(Reauthenticate_RateLimit_AfterFiveFailedAttempts_Returns429TooManyRequests));
        var (controller, _, hasher) = CreateController(context);
        var (user, exam, attempt) = await SeedExamAttemptAsync(context, hasher);

        // Fail 5 times with bad password
        for (int i = 1; i <= 5; i++)
        {
            var failResult = await controller.ReauthenticateAttempt(
                attempt.Id,
                new ReauthenticateAttemptRequest { Email = user.Email, Password = "WrongPassword!" },
                default);

            var unauthResult = Assert.IsType<UnauthorizedObjectResult>(failResult);
            Assert.Equal(401, unauthResult.StatusCode);
        }

        // The 6th attempt must be rejected with 429 Too Many Requests
        var rateLimitedResult = await controller.ReauthenticateAttempt(
            attempt.Id,
            new ReauthenticateAttemptRequest { Email = user.Email, Password = "WrongPassword!" },
            default);

        var objectResult = Assert.IsType<ObjectResult>(rateLimitedResult);
        Assert.Equal(StatusCodes.Status429TooManyRequests, objectResult.StatusCode);

        var data = ToJsonElement(objectResult.Value);
        Assert.False(data.GetProperty("success").GetBoolean());
        Assert.Equal("RATE_LIMIT_EXCEEDED", data.GetProperty("errorCode").GetString());
        Assert.True(controller.Response.Headers.ContainsKey("Retry-After"));
    }

    [Fact]
    public async Task Reauthenticate_RateLimit_ClearsOnSuccessfulReauthentication()
    {
        ExamAttemptsController.ResetReauthRateLimitsForTesting();
        using var context = CreateInMemoryContext(nameof(Reauthenticate_RateLimit_ClearsOnSuccessfulReauthentication));
        var (controller, _, hasher) = CreateController(context);
        var (user, exam, attempt) = await SeedExamAttemptAsync(context, hasher);

        // Fail 2 times
        for (int i = 1; i <= 2; i++)
        {
            var failResult = await controller.ReauthenticateAttempt(
                attempt.Id,
                new ReauthenticateAttemptRequest { Email = user.Email, Password = "WrongPassword!" },
                default);
            Assert.IsType<UnauthorizedObjectResult>(failResult);
        }

        // Succeed on 3rd attempt
        var successResult = await controller.ReauthenticateAttempt(
            attempt.Id,
            new ReauthenticateAttemptRequest { Email = user.Email, Password = "CorrectPassword123!" },
            default);

        var okResult = Assert.IsType<OkObjectResult>(successResult);
        var data = ToJsonElement(okResult.Value);
        Assert.True(data.GetProperty("success").GetBoolean());
        Assert.Equal(attempt.Id, data.GetProperty("attempt").GetProperty("id").GetString());
    }

    [Fact]
    public async Task GatewayHMAC_SessionUserMismatch_FailsAuthentication()
    {
        // Tests Gateway HMAC Pathway B when X-Session-Id belongs to userB while headers claim userA
        var client = _factory.CreateClient();
        var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var userVictim = new User
        {
            Id = "user_victim_p8",
            Email = "victim@prepford.com",
            DisplayName = "Victim Learner",
            IsActive = true,
            SecurityVersion = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var userAttacker = new User
        {
            Id = "user_attacker_p8",
            Email = "attacker@prepford.com",
            DisplayName = "Attacker Learner",
            IsActive = true,
            SecurityVersion = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Users.AddRange(userVictim, userAttacker);

        var victimSession = new UserSession
        {
            Id = "sess_victim_p8_valid",
            UserId = userVictim.Id,
            ClientId = "cid_victim_01",
            TokenHash = "mock_hash_victim",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IdleExpiresAt = DateTime.UtcNow.AddDays(7),
            AbsoluteExpiresAt = DateTime.UtcNow.AddDays(7),
            LastActiveAt = DateTime.UtcNow,
            Revoked = false,
            SecurityVersion = 1,
            User = userVictim
        };
        db.UserSessions.Add(victimSession);
        await db.SaveChangesAsync();

        // Attacker creates valid canonical Gateway headers claiming identity of userAttacker,
        // but attaches X-Session-Id of userVictim
        GatewayHmacAndReplaySecurityTests.AddCanonicalHeaders(
            client,
            "GET",
            "/api/v1/profile/image",
            userAttacker.Id,
            userAttacker.Email,
            "candidate");

        client.DefaultRequestHeaders.Remove("X-Session-Id");
        client.DefaultRequestHeaders.Add("X-Session-Id", victimSession.Id);

        var response = await client.GetAsync("/api/v1/profile/image");

        // The request must fail with 401 Unauthorized because the session does not belong to userAttacker
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        if (response.Headers.TryGetValues("X-Auth-Failure-Code", out var codes))
        {
            Assert.Contains("SESSION_USER_MISMATCH", codes);
        }
    }
}
