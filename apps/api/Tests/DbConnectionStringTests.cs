using System.Collections.Specialized;
using System.Web;
using Npgsql;
using Xunit;

namespace Preform.Api.Tests;

public static class ConnectionStringHelper
{
    public static string ToNpgsqlConnectionString(string connectionStringOrUrl)
    {
        if (string.IsNullOrWhiteSpace(connectionStringOrUrl))
        {
            return connectionStringOrUrl;
        }

        var trimmed = connectionStringOrUrl.Trim();
        if (!trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
            !trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return trimmed;
        }

        var uri = new Uri(trimmed);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/')
        };

        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            var parts = uri.UserInfo.Split(':', 2);
            builder.Username = Uri.UnescapeDataString(parts[0]);
            if (parts.Length > 1)
            {
                builder.Password = Uri.UnescapeDataString(parts[1]);
            }
        }

        if (!string.IsNullOrEmpty(uri.Query))
        {
            var query = HttpUtility.ParseQueryString(uri.Query);
            foreach (string? key in query.AllKeys)
            {
                if (string.IsNullOrWhiteSpace(key)) continue;
                var val = query[key];
                if (string.Equals(key, "sslmode", StringComparison.OrdinalIgnoreCase))
                {
                    if (Enum.TryParse<SslMode>(val, true, out var sslMode))
                    {
                        builder.SslMode = sslMode;
                    }
                }
                else if (string.Equals(key, "pooling", StringComparison.OrdinalIgnoreCase))
                {
                    if (bool.TryParse(val, out var pooling))
                    {
                        builder.Pooling = pooling;
                    }
                }
                // Ignore query parameters that Npgsql doesn't directly map, such as schema=public
            }
        }

        return builder.ConnectionString;
    }
}

public class DbConnectionStringTests
{
    [Fact]
    public void Npgsql_CanParse_StandardKeyValue()
    {
        var cs = "Host=localhost;Port=5432;Database=prepford;Username=postgres;Password=local-dev-only-change-me";
        var parsed = ConnectionStringHelper.ToNpgsqlConnectionString(cs);
        var builder = new NpgsqlConnectionStringBuilder(parsed);
        Assert.Equal("localhost", builder.Host);
        Assert.Equal(5432, builder.Port);
        Assert.Equal("prepford", builder.Database);
        Assert.Equal("postgres", builder.Username);
        Assert.Equal("local-dev-only-change-me", builder.Password);
    }

    [Fact]
    public void Npgsql_CanParse_PostgresUrl()
    {
        var url = "postgresql://postgres:local-dev-only-change-me@localhost:5432/prepford";
        var parsed = ConnectionStringHelper.ToNpgsqlConnectionString(url);
        var builder = new NpgsqlConnectionStringBuilder(parsed);
        Assert.Equal("localhost", builder.Host);
        Assert.Equal(5432, builder.Port);
        Assert.Equal("prepford", builder.Database);
        Assert.Equal("postgres", builder.Username);
        Assert.Equal("local-dev-only-change-me", builder.Password);
    }

    [Fact]
    public void Npgsql_CanParse_PostgresUrlWithQueryParam()
    {
        var url = "postgresql://postgres:local-dev-only-change-me@localhost:5432/prepford?schema=public";
        var parsed = ConnectionStringHelper.ToNpgsqlConnectionString(url);
        var builder = new NpgsqlConnectionStringBuilder(parsed);
        Assert.Equal("localhost", builder.Host);
        Assert.Equal(5432, builder.Port);
        Assert.Equal("prepford", builder.Database);
        Assert.Equal("postgres", builder.Username);
        Assert.Equal("local-dev-only-change-me", builder.Password);
    }
}
