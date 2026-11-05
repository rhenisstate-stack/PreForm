using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Preform.Api.Common;
using Preform.Api.Configuration;
using Preform.Api.Data;
using Preform.Api.Formatters;
using Preform.Api.Models;
using Preform.Api.Security;
using Preform.Api.Services;
using Preform.Api.Services.Email;
using Preform.Api.Services.Grading;
using Preform.Api.Services.PasswordReset;
using Preform.Api.Services.RateLimiting;
using Preform.Api.Services.Security;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers(options =>
{
    options.OutputFormatters.RemoveType<SystemTextJsonOutputFormatter>();
    options.OutputFormatters.Insert(0, new StreamJsonOutputFormatter());
});

// RFC 7807 Problem Details & Global Exception Handler
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// Trusted Reverse Proxy Configuration
var reverseProxyOptions = builder.Configuration.GetSection(ReverseProxyOptions.SectionName).Get<ReverseProxyOptions>()
    ?? new ReverseProxyOptions();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownProxies.Clear();
    options.KnownNetworks.Clear();

    foreach (var proxy in reverseProxyOptions.KnownProxies)
    {
        if (System.Net.IPAddress.TryParse(proxy, out var ip))
        {
            options.KnownProxies.Add(ip);
        }
    }

    foreach (var network in reverseProxyOptions.KnownNetworks)
    {
        var parts = network.Split('/');
        if (parts.Length == 2 && System.Net.IPAddress.TryParse(parts[0], out var prefix) && int.TryParse(parts[1], out var prefixLength))
        {
            options.KnownNetworks.Add(new IPNetwork(prefix, prefixLength));
        }
    }

    options.ForwardLimit = reverseProxyOptions.ForwardLimit;
    if (reverseProxyOptions.RequireHeaderSymmetry)
    {
        options.RequireHeaderSymmetry = true;
    }
});

// Domain Services & Password Hasher
builder.Services.AddSingleton<IGatewayReplayProtection, GatewayReplayProtection>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<ISessionSecurityService, SessionSecurityService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<ICheckoutService, CheckoutService>();
builder.Services.AddScoped<IProgrammeService, ProgrammeService>();
builder.Services.AddScoped<IProfileImageService, ProfileImageService>();
builder.Services.AddSingleton<IQuestionTypeRegistry>(QuestionTypeRegistry.Instance);
builder.Services.AddScoped<IQuestionTypeService, QuestionTypeService>();
builder.Services.AddScoped<IQuestionTypeContractValidator, QuestionTypeContractValidator>();
builder.Services.AddScoped<IAdminBootstrapService, AdminBootstrapService>();
// Examination grading foundation (P2)
builder.Services.AddSingleton<IQuestionGraderResolver, QuestionGraderResolver>();
builder.Services.AddScoped<IResponseValidationService, ResponseValidationService>();
builder.Services.AddScoped<IAttemptQuestionService, AttemptQuestionService>();
// AI Study Studio (Phase 1): server-authoritative spaced repetition scheduling
builder.Services.AddScoped<ISpacedRepetitionService, SpacedRepetitionService>();
builder.Services.AddScoped<IFlashcardService, FlashcardService>();
// Examination Domain Foundation (P3.1)
builder.Services.AddScoped<IExaminationCodeService, ExaminationCodeService>();
builder.Services.AddScoped<IExamLifecycleService, ExamLifecycleService>();

// Phase 1 Security, Observability, Rate Limiting & Identity Foundations
builder.Services.AddScoped<ISharedRateLimitingService, PostgresRateLimitingService>();
builder.Services.AddScoped<IEmailSender, DevelopmentEmailSender>();
builder.Services.AddScoped<IPasswordResetService, PasswordResetService>();
builder.Services.AddScoped<IIpAccessService, IpAccessService>();
builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();

// Phase 2 Curriculum Taxonomy & Question Bank
builder.Services.AddScoped<ICurriculumService, CurriculumService>();
builder.Services.AddScoped<IQuestionBankService, QuestionBankService>();

// Authentication with PrepfordAuth scheme (Bearer Session Token & Gateway HMAC)
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = PrepfordAuthSchemeOptions.SchemeName;
    options.DefaultChallengeScheme = PrepfordAuthSchemeOptions.SchemeName;
})
.AddScheme<PrepfordAuthSchemeOptions, PrepfordAuthHandler>(PrepfordAuthSchemeOptions.SchemeName, null);

// Authorization Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdmin", policy =>
        policy.RequireRole("admin", "superadmin", "administrator"));

    options.AddPolicy("RequireSuperAdmin", policy =>
        policy.RequireRole("superadmin"));

    // Matches documented RoleHierarchy normalization (administrator -> admin):
    // the super-admin/admin-type roles must be consistently privileged across
    // RequireAdmin and RequireContentManager.Previously "administrator" was
    // accepted by RequireAdmin but rejected here — an asymmetry fixed in P0.
    options.AddPolicy("RequireContentManager", policy =>
        policy.RequireRole("content_manager", "admin", "superadmin", "administrator"));

    options.AddPolicy("RequireExamManager", policy =>
        policy.RequireRole("exam_manager", "superadmin"));

    // Granular RBAC Permission Policies
    foreach (var perm in PermissionsCatalog.All)
    {
        options.AddPolicy($"Permission:{perm.Key}", policy =>
            policy.Requirements.Add(new PermissionRequirement(perm.Key)));
    }
});

// CORS for Next.js frontend (WEB_ORIGIN, default http://localhost:3000)
var webOrigin = builder.Configuration["WEB_ORIGIN"] ?? "http://localhost:3000";
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(webOrigin)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "PrepFord API", Version = "v1" });
});

// EF Core with Npgsql PostgreSQL
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var gateBConn = config["PREFORM_GATEB_TEST_CONNECTION_STRING"];
    var dbUrl = config["DATABASE_URL"];
    var defaultConn = config.GetConnectionString("DefaultConnection");

    var rawConn = !string.IsNullOrWhiteSpace(gateBConn)
        ? gateBConn
        : (!string.IsNullOrWhiteSpace(dbUrl)
            ? dbUrl
            : (!string.IsNullOrWhiteSpace(defaultConn)
                ? defaultConn
                : "Host=localhost;Port=5432;Database=prepford;Username=postgres;Password=local-dev-only-change-me"));

    var connectionString = ConnectionStringHelper.ToNpgsqlConnectionString(rawConn);

    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "public");
    });
});

// Robust Health checks: liveness check & relational database readiness check
builder.Services.AddHealthChecks()
    .AddCheck("liveness", () => HealthCheckResult.Healthy())
    .AddCheck<PostgresHealthCheck>("database", tags: new[] { "ready" });

var app = builder.Build();

// 1. Forwarded Headers (MUST run before any middleware inspecting remote IP or scheme)
app.UseForwardedHeaders();

// 2. Correlation ID Propagation & Request Tracing Scope
app.UseMiddleware<CorrelationIdMiddleware>();

// 3. RFC 7807 Problem Details Global Exception Handler
app.UseExceptionHandler();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "PrepFord API v1");
        c.RoutePrefix = string.Empty;
    });
}

// 4. IP Access Blacklist / Whitelist Filter
app.UseMiddleware<IpFilteringMiddleware>();

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/api/v1/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = r => r.Name == "liveness"
});
app.MapHealthChecks("/api/v1/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = r => r.Tags.Contains("ready") || r.Name == "database"
});

// Ensure database is migrated and seeded on startup
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    if (dbContext.Database.IsRelational())
    {
        try
        {
            logger.LogInformation("Applying EF Core migrations to PostgreSQL...");
            dbContext.Database.Migrate();

            // Seed initial programmes, roles, and canonical subscription plans
            CatalogSeeder.SeedAsync(dbContext, logger).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Database migration on startup was deferred or skipped.");
        }
    }
    else
    {
        dbContext.Database.EnsureCreated();
        CatalogSeeder.SeedAsync(dbContext, logger).GetAwaiter().GetResult();
    }
}

// Check for administrative bootstrap command
if (args.Contains("--bootstrap-superadmin") || string.Equals(app.Configuration["BOOTSTRAP_SUPERADMIN_ENABLED"], "true", StringComparison.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var bootstrapService = scope.ServiceProvider.GetRequiredService<IAdminBootstrapService>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    string email = app.Configuration["SUPERADMIN_EMAIL"] ?? string.Empty;
    string password = app.Configuration["SUPERADMIN_PASSWORD"] ?? string.Empty;
    string displayName = app.Configuration["SUPERADMIN_DISPLAY_NAME"] ?? "PrepFord Super Admin";
    bool allowRecovery = string.Equals(app.Configuration["SUPERADMIN_ALLOW_RECOVERY"], "true", StringComparison.OrdinalIgnoreCase);

    for (int i = 0; i < args.Length; i++)
    {
        if (args[i] == "--email" && i + 1 < args.Length) email = args[i + 1];
        if (args[i] == "--password" && i + 1 < args.Length) password = args[i + 1];
        if (args[i] == "--name" && i + 1 < args.Length) displayName = args[i + 1];
        if (args[i] == "--allow-recovery") allowRecovery = true;
    }

    var result = bootstrapService.BootstrapSuperAdminAsync(email, password, displayName, allowRecovery).GetAwaiter().GetResult();
    if (!result.Success)
    {
        logger.LogError("Super Admin bootstrap failed: {Message}", result.Message);
        if (args.Contains("--bootstrap-superadmin"))
        {
            Environment.ExitCode = 1;
            return;
        }
    }
    else
    {
        logger.LogInformation("Super Admin bootstrap succeeded: {Message} (UserId: {UserId})", result.Message, result.UserId);
        if (args.Contains("--bootstrap-superadmin"))
        {
            Environment.ExitCode = 0;
            return;
        }
    }
}

app.Run();

public partial class Program { }
