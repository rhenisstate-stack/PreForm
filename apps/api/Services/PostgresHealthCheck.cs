using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Preform.Api.Data;

namespace Preform.Api.Services;

public class PostgresHealthCheck : IHealthCheck
{
    private readonly IServiceProvider _serviceProvider;

    public PostgresHealthCheck(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var canConnect = await db.Database.CanConnectAsync(cancellationToken);
            return canConnect
                ? HealthCheckResult.Healthy("PostgreSQL datastore is reachable and healthy.")
                : HealthCheckResult.Unhealthy("PostgreSQL connection check failed.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("PostgreSQL health probe encountered an error.", ex);
        }
    }
}
