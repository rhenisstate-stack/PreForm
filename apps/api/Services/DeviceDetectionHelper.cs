using System.Text.RegularExpressions;

namespace Preform.Api.Services;

public static class DeviceDetectionHelper
{
    public static string GetDeviceLabel(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
        {
            return "Standard Web Browser";
        }

        var ua = userAgent.Trim();

        var os = ResolveOperatingSystem(ua);
        var browser = ResolveBrowser(ua);
        var deviceType = ResolveDeviceType(ua);

        if (deviceType == "Mobile" || deviceType == "Tablet")
        {
            return $"{browser} on {os} ({deviceType})";
        }

        return $"{browser} on {os}";
    }

    public static string ResolveOperatingSystem(string ua)
    {
        if (ua.Contains("Windows NT 10.0", StringComparison.OrdinalIgnoreCase)) return "Windows 10/11";
        if (ua.Contains("Windows", StringComparison.OrdinalIgnoreCase)) return "Windows";
        if (ua.Contains("iPhone", StringComparison.OrdinalIgnoreCase)) return "iOS (iPhone)";
        if (ua.Contains("iPad", StringComparison.OrdinalIgnoreCase)) return "iPadOS";
        if (ua.Contains("Android", StringComparison.OrdinalIgnoreCase)) return "Android";
        if (ua.Contains("Mac OS X", StringComparison.OrdinalIgnoreCase) || ua.Contains("Macintosh", StringComparison.OrdinalIgnoreCase)) return "macOS";
        if (ua.Contains("CrOS", StringComparison.OrdinalIgnoreCase)) return "ChromeOS";
        if (ua.Contains("Linux", StringComparison.OrdinalIgnoreCase)) return "Linux";

        return "Unknown OS";
    }

    public static string ResolveBrowser(string ua)
    {
        if (ua.Contains("Edg/", StringComparison.OrdinalIgnoreCase)) return "Microsoft Edge";
        if (ua.Contains("OPR/", StringComparison.OrdinalIgnoreCase) || ua.Contains("Opera", StringComparison.OrdinalIgnoreCase)) return "Opera";
        if (ua.Contains("Firefox/", StringComparison.OrdinalIgnoreCase)) return "Firefox";
        if (ua.Contains("Chrome/", StringComparison.OrdinalIgnoreCase) && !ua.Contains("Edg/", StringComparison.OrdinalIgnoreCase)) return "Chrome";
        if (ua.Contains("Safari/", StringComparison.OrdinalIgnoreCase) && !ua.Contains("Chrome/", StringComparison.OrdinalIgnoreCase)) return "Safari";

        return "Web Browser";
    }

    public static string ResolveDeviceType(string ua)
    {
        if (ua.Contains("iPad", StringComparison.OrdinalIgnoreCase) || ua.Contains("Tablet", StringComparison.OrdinalIgnoreCase)) return "Tablet";
        if (ua.Contains("Mobile", StringComparison.OrdinalIgnoreCase) || ua.Contains("iPhone", StringComparison.OrdinalIgnoreCase) || ua.Contains("Android", StringComparison.OrdinalIgnoreCase)) return "Mobile";

        return "Desktop";
    }
}
