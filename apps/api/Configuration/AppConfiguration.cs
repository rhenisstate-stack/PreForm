using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Preform.Api.Configuration;

public static class AppConfiguration
{
    public static IServiceCollection AddConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton(configuration);
        return services;
    }
}
