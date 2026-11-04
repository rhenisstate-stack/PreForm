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

    public static string ResolveOperatingSystemFamily(string ua)
    {
        var os = ResolveOperatingSystem(ua);
        if (os.StartsWith("Windows", StringComparison.OrdinalIgnoreCase)) return "Windows";
        if (os.Contains("iOS", StringComparison.OrdinalIgnoreCase) || os.Equals("iPadOS", StringComparison.OrdinalIgnoreCase)) return "iOS";
        if (os.Equals("macOS", StringComparison.OrdinalIgnoreCase)) return "macOS";
        if (os.Equals("Android", StringComparison.OrdinalIgnoreCase)) return "Android";
        if (os.Equals("Linux", StringComparison.OrdinalIgnoreCase)) return "Linux";
        if (os.Equals("ChromeOS", StringComparison.OrdinalIgnoreCase)) return "ChromeOS";
        return "Unknown";
    }

    public static bool IsOperatingSystemChanged(string? uaA, string? uaB)
    {
        if (string.IsNullOrWhiteSpace(uaA) || string.IsNullOrWhiteSpace(uaB)) return false;
        var famA = ResolveOperatingSystemFamily(uaA);
        var famB = ResolveOperatingSystemFamily(uaB);
        if (famA == "Unknown" || famB == "Unknown") return false;
        return !string.Equals(famA, famB, StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsBrowserFamilyChanged(string? uaA, string? uaB)
    {
        if (string.IsNullOrWhiteSpace(uaA) || string.IsNullOrWhiteSpace(uaB)) return false;
        var bA = ResolveBrowser(uaA);
        var bB = ResolveBrowser(uaB);
        if (bA == "Web Browser" || bB == "Web Browser") return false;
        return !string.Equals(bA, bB, StringComparison.OrdinalIgnoreCase);
    }

    public class ClientContextRiskAssessment
    {
        public bool IsOsChanged { get; set; }
        public bool IsBrowserChanged { get; set; }
        public bool IsIpChanged { get; set; }
        public string Severity { get; set; } = "Informational"; // Informational, Low, Medium, High, Critical
        public string? DetectedAnomaly { get; set; }
        public string? RecommendedAction { get; set; }
    }

    public static ClientContextRiskAssessment AssessContextChange(
        string? baselineUa,
        string? currentUa,
        string? baselineIp,
        string? currentIp)
    {
        var assessment = new ClientContextRiskAssessment();

        // 1. Evaluate User-Agent OS change (High severity: OS swap on same active session)
        if (!string.IsNullOrWhiteSpace(baselineUa) && !string.IsNullOrWhiteSpace(currentUa))
        {
            if (IsOperatingSystemChanged(baselineUa, currentUa))
            {
                assessment.IsOsChanged = true;
                assessment.Severity = "High";
                assessment.DetectedAnomaly = "SuspiciousSessionContext";
                assessment.RecommendedAction = "FlagContextAnomaly";
                return assessment;
            }

            if (IsBrowserFamilyChanged(baselineUa, currentUa))
            {
                assessment.IsBrowserChanged = true;
                assessment.Severity = "Medium";
                assessment.DetectedAnomaly = "UserAgentChanged";
                assessment.RecommendedAction = "UpdateSessionContext";
            }
        }

        // 2. Evaluate IP Change (Informational severity: mobile/residential network drift)
        if (!string.IsNullOrWhiteSpace(baselineIp) && !string.IsNullOrWhiteSpace(currentIp) &&
            !string.Equals(baselineIp.Trim(), currentIp.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            assessment.IsIpChanged = true;
            if (assessment.Severity == "Informational")
            {
                assessment.Severity = "Informational";
                assessment.DetectedAnomaly = "IpAddressChanged";
            }
        }

        return assessment;
    }
}
