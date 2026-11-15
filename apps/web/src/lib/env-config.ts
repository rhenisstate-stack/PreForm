export interface PrepfordEnvConfig {
  appName: string;
  appTitle: string;
  appDomain: string;
  appKey: string;
  activeBackend: string;
  dotnetBaseUrl: string;
  resolvedBackendUrl: string;
  isHttpsBackend: boolean;
  isProduction: boolean;
}

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: PrepfordEnvConfig;
}

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname.toLowerCase());
}

function parseHttpUrl(raw: string | undefined): URL | null {
  if (!raw || !raw.trim()) return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Resolves the canonical remote ASP.NET Core backend base URL.
 * Prioritizes SKEW_LINE_DOTNET_BASE_URL when SKEW_LINE_ACTIVE_BACKEND=dotnet,
 * and prevents production builds from silently falling back to localhost.
 */
export function resolveBackendBaseUrl(): string {
  const activeBackend = process.env.SKEW_LINE_ACTIVE_BACKEND?.trim().toLowerCase();
  const skewLineUrl = process.env.SKEW_LINE_DOTNET_BASE_URL?.trim();
  const legacyUrl =
    process.env.API_GATEWAY_URL?.trim() ||
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  const candidate =
    activeBackend === "dotnet" && skewLineUrl
      ? skewLineUrl
      : legacyUrl || skewLineUrl || "";

  const isProd = process.env.NODE_ENV === "production";
  const isStrictProd = isProd && process.env.APP_ENV === "production";

  if (candidate) {
    const parsed = parseHttpUrl(candidate);
    if (!parsed) {
      throw new Error(
        `Invalid backend URL configuration: "${candidate}". Expected a valid http:// or https:// URL.`
      );
    }
    if (isStrictProd && isLocalHostname(parsed.hostname)) {
      throw new Error(
        `Production configuration error: backend URL "${candidate}" cannot target localhost (${parsed.hostname}).`
      );
    }
    return candidate.replace(/\/+$/, "");
  }

  if (isStrictProd) {
    throw new Error(
      "Missing backend URL configuration in production: set SKEW_LINE_DOTNET_BASE_URL (or API_GATEWAY_URL)."
    );
  }

  const backendPort =
    process.env.BACKEND_PORT?.trim() ||
    (process.env.PORT && process.env.PORT !== "3000" ? process.env.PORT.trim() : "4000");

  return `http://127.0.0.1:${backendPort}`;
}

/**
 * Validates PrepFord environment configuration for SKEW_LINE remote .NET backend integration.
 * Never exposes secrets or credentials in its return payload.
 */
export function validatePrepfordEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const appName = process.env.SKEW_LINE_APP_NAME?.trim() || "";
  const appTitle = process.env.SKEW_LINE_APP_TITLE?.trim() || "";
  const appDomain = process.env.SKEW_LINE_APP_DOMAIN?.trim() || "";
  const appKey = process.env.SKEW_LINE_APP_KEY?.trim() || "";
  const activeBackend = process.env.SKEW_LINE_ACTIVE_BACKEND?.trim() || "";
  const dotnetBaseUrl = process.env.SKEW_LINE_DOTNET_BASE_URL?.trim() || "";
  const isProduction = process.env.NODE_ENV === "production";

  if (!appName) {
    errors.push("Missing SKEW_LINE_APP_NAME (expected 'Prepford').");
  } else if (appName.toLowerCase() !== "prepford") {
    errors.push(`Invalid SKEW_LINE_APP_NAME "${appName}" (expected 'Prepford').`);
  }

  if (!appKey) {
    errors.push("Missing SKEW_LINE_APP_KEY (expected 'WEBSITE_1').");
  } else if (appKey !== "WEBSITE_1") {
    errors.push(`Invalid SKEW_LINE_APP_KEY "${appKey}" (expected 'WEBSITE_1').`);
  }

  if (!activeBackend) {
    errors.push("Missing SKEW_LINE_ACTIVE_BACKEND (expected 'dotnet').");
  } else if (activeBackend.toLowerCase() !== "dotnet") {
    errors.push(`Invalid SKEW_LINE_ACTIVE_BACKEND "${activeBackend}" (expected 'dotnet').`);
  }

  let resolvedBackendUrl = "";
  let isHttpsBackend = false;

  try {
    resolvedBackendUrl = resolveBackendBaseUrl();
    const parsed = parseHttpUrl(resolvedBackendUrl);
    if (!parsed) {
      errors.push(`Resolved backend URL "${resolvedBackendUrl}" is not a valid HTTP/HTTPS URL.`);
    } else {
      isHttpsBackend = parsed.protocol === "https:";
      if (isProduction && isLocalHostname(parsed.hostname)) {
        errors.push(`Production build must not target localhost backend "${resolvedBackendUrl}".`);
      }
      if (!isHttpsBackend && !isLocalHostname(parsed.hostname)) {
        warnings.push(
          `Remote backend URL "${resolvedBackendUrl}" uses unencrypted HTTP. Do not transmit production credentials or bearer tokens over unencrypted HTTP without TLS/reverse-proxy termination.`
        );
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Failed to resolve backend URL.");
  }

  if (dotnetBaseUrl && !parseHttpUrl(dotnetBaseUrl)) {
    errors.push(`SKEW_LINE_DOTNET_BASE_URL "${dotnetBaseUrl}" is not a valid HTTP/HTTPS URL.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config: {
      appName,
      appTitle,
      appDomain,
      appKey,
      activeBackend,
      dotnetBaseUrl,
      resolvedBackendUrl,
      isHttpsBackend,
      isProduction,
    },
  };
}
