namespace Preform.Api.Configuration;

public class ReverseProxyOptions
{
    public const string SectionName = "ReverseProxy";

    /// <summary>
    /// Explicit IP addresses of trusted reverse proxies.
    /// Default includes standard loopback addresses (127.0.0.1, ::1).
    /// </summary>
    public string[] KnownProxies { get; set; } = new[] { "127.0.0.1", "::1" };

    /// <summary>
    /// Trusted IP networks in CIDR notation (e.g., "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16").
    /// </summary>
    public string[] KnownNetworks { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Limit on the number of proxy hops to trust from the rightmost address.
    /// Default is 1 (immediate trusted proxy).
    /// </summary>
    public int ForwardLimit { get; set; } = 1;

    /// <summary>
    /// When true, requires that X-Forwarded-For and X-Forwarded-Proto counts match.
    /// </summary>
    public bool RequireHeaderSymmetry { get; set; } = false;
}
