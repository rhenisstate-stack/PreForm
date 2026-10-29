using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Preform.Api.Data;
using Preform.Api.Formatters;
using Preform.Api.Models;
using Preform.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers(options =>
{
    options.OutputFormatters.RemoveType<SystemTextJsonOutputFormatter>();
    options.OutputFormatters.Insert(0, new StreamJsonOutputFormatter());
});

// Domain Services & Password Hasher
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<ICheckoutService, CheckoutService>();
builder.Services.AddScoped<IProgrammeService, ProgrammeService>();
builder.Services.AddScoped<IProfileImageService, ProfileImageService>();

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

    options.AddPolicy("RequireContentManager", policy =>
        policy.RequireRole("content_manager", "admin", "superadmin"));

    options.AddPolicy("RequireExamManager", policy =>
        policy.RequireRole("exam_manager", "superadmin"));
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
    var dbUrl = config["DATABASE_URL"];
    var defaultConn = config.GetConnectionString("DefaultConnection");

    var connectionString = !string.IsNullOrWhiteSpace(dbUrl)
        ? dbUrl
        : (!string.IsNullOrWhiteSpace(defaultConn)
            ? defaultConn
            : "Host=localhost;Port=5432;Database=prepford;Username=postgres;Password=postgres");

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

app.Run();

public partial class Program { }
