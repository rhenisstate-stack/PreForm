using Npgsql;
using Xunit;

namespace Preform.Api.Tests;

public class DbConnectionStringTests
{
    [Fact]
    public void Npgsql_CanParse_StandardKeyValue()
    {
        var cs = "Host=localhost;Port=5432;Database=prepford;Username=postgres;Password=local-dev-only-change-me";
        var builder = new NpgsqlConnectionStringBuilder(cs);
        Assert.Equal("localhost", builder.Host);
        Assert.Equal(5432, builder.Port);
        Assert.Equal("prepford", builder.Database);
        Assert.Equal("postgres", builder.Username);
    }

    [Fact]
    public void Npgsql_CanParse_PostgresUrl()
    {
        var url = "postgresql://postgres:local-dev-only-change-me@localhost:5432/prepford";
        var builder = new NpgsqlConnectionStringBuilder(url);
        Assert.Equal("localhost", builder.Host);
        Assert.Equal(5432, builder.Port);
        Assert.Equal("prepford", builder.Database);
        Assert.Equal("postgres", builder.Username);
    }

    [Fact]
    public void Npgsql_CanParse_PostgresUrlWithQueryParam()
    {
        var url = "postgresql://postgres:local-dev-only-change-me@localhost:5432/prepford?schema=public";
        // Let's see if Npgsql accepts this URL or if it requires stripping query params
        try
        {
            var builder = new NpgsqlConnectionStringBuilder(url);
            Assert.Equal("prepford", builder.Database);
        }
        catch (Exception ex)
        {
            Assert.Fail($"Npgsql threw on URL with query param: {ex.Message}");
        }
    }
}
