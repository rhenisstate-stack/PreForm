using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.Models;
using Preform.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddScoped<IProgrammeService, ProgrammeService>();

// CORS for the Next.js frontend (WEB_ORIGIN, default http://localhost:3000)
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

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "PREform NCLEX API", Version = "v1" });
});

// Add EF Core with Npgsql
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var connectionString = config["DATABASE_URL"];
    if (string.IsNullOrEmpty(connectionString))
    {
        throw new InvalidOperationException("DATABASE_URL configuration is required.");
    }
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "public");
    });
});

// Health checks
builder.Services.AddHealthChecks()
    .AddCheck("database", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy());

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "PREform NCLEX API v1");
        c.RoutePrefix = string.Empty;
    });
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.UseCors("AllowFrontend");

app.MapControllers();
app.MapHealthChecks("/api/v1/health/live");
app.MapHealthChecks("/api/v1/health/ready");

// Ensure database is created and migrated
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();

    // Seed initial data
    if (!dbContext.Programmes.Any())
    {
        dbContext.Programmes.AddRange(
            new Programme
            {
                Code = ProgrammeCode.RN,
                DisplayName = "NCLEX-RN",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new Programme
            {
                Code = ProgrammeCode.PN,
                DisplayName = "NCLEX-PN",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        );
        dbContext.SaveChanges();
    }
}

app.Run();

public partial class Program { }
