using System.Web;
using Npgsql;

namespace Preform.Api.Data;

/// <summary>
/// Helper for converting connection strings or postgresql:// URLs into canonical Npgsql connection strings.
/// </summary>
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
            }
        }

        return builder.ConnectionString;
    }
}
