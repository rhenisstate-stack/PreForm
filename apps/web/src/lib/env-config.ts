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

export interface SkewLineIdentity {
  appName: string;
  appTitle: string;
  appDomain: string;
  appKey: string;
  activeBackend: string;
  dotnetBaseUrl: string;
}

export class SkewLineConfigurationError extends Error {
  code: string;

  constructor(message: string, code: string = "CONFIGURATION_ERROR") {
    super(message);
    this.name = "SkewLineConfigurationError";
    this.code = code;
  }
}

export const PREPFORD_IDENTITY_CONSTANTS = {
  APP_NAME: "Prepford",
  APP_TITLE: "Prepford",
  APP_DOMAIN: "https://www.prepford.com/",
  APP_KEY: "WEBSITE_12",
  ACTIVE_BACKEND: "dotnet",
} as const;

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

function normalizeDomainForComparison(raw: string): string {
  return raw.trim().toLowerCase().replace(/\/+$/, "");
}

/**
 * Resolves PrepFord's own authoritative ASP.NET Core 8 API base URL
 * (for /api/v1/* examination, question bank, learner, and admin routes).
 * Never routes PrepFord-local /api/v1/* traffic to the remote LexmaCasto host.
 */
export function resolvePrepfordApiBaseUrl(): string {
  const candidate =
    process.env.API_GATEWAY_URL?.trim() ||
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "";

  const isProd = process.env.NODE_ENV === "production";
  const isStrictProd = isProd && process.env.APP_ENV === "production";

  if (candidate) {
    const parsed = parseHttpUrl(candidate);
    if (!parsed) {
      throw new Error(
        `Invalid PrepFord API URL configuration: "${candidate}". Expected a valid http:// or https:// URL.`
      );
    }
    if (isStrictProd && isLocalHostname(parsed.hostname)) {
      throw new Error(
        `Production configuration error: PrepFord API URL "${candidate}" cannot target localhost (${parsed.hostname}).`
      );
    }
    return candidate.replace(/\/+$/, "");
  }

  if (isStrictProd) {
    throw new Error(
      "Missing PrepFord API URL configuration in production: set API_GATEWAY_URL or INTERNAL_API_URL."
    );
  }

  const backendPort =
    process.env.BACKEND_PORT?.trim() ||
    (process.env.PORT && process.env.PORT !== "3000" ? process.env.PORT.trim() : "4000");

  return `http://127.0.0.1:${backendPort}`;
}

/**
 * Resolves and validates the LexmaCasto / Qlex-Nursing remote .NET backend URL
 * from SKEW_LINE_DOTNET_BASE_URL. Fails closed if missing, malformed, or insecure in strict production.
 */
export function resolveSkewLineBaseUrl(options: { requireHttps?: boolean } = {}): string {
  const activeBackend = process.env.SKEW_LINE_ACTIVE_BACKEND?.trim().toLowerCase();
  const skewLineUrl = process.env.SKEW_LINE_DOTNET_BASE_URL?.trim();

  if (activeBackend && activeBackend !== "dotnet") {
    throw new SkewLineConfigurationError(
      `Unsupported SKEW_LINE_ACTIVE_BACKEND="${activeBackend}". Expected "dotnet".`,
      "UNSUPPORTED_BACKEND"
    );
  }

  if (!skewLineUrl || skewLineUrl.startsWith("<")) {
    throw new SkewLineConfigurationError(
      "Missing SKEW_LINE_DOTNET_BASE_URL configuration for LexmaCasto backend.",
      "MISSING_BACKEND_URL"
    );
  }

  const parsed = parseHttpUrl(skewLineUrl);
  if (!parsed) {
    throw new SkewLineConfigurationError(
      `Invalid SKEW_LINE_DOTNET_BASE_URL configuration: "${skewLineUrl}". Expected a valid http:// or https:// URL.`,
      "INVALID_BACKEND_URL"
    );
  }

  const isProd = process.env.NODE_ENV === "production";
  const isStrictProd = isProd && process.env.APP_ENV === "production";

  if (isStrictProd && isLocalHostname(parsed.hostname)) {
    throw new SkewLineConfigurationError(
      `Production configuration error: SKEW_LINE_DOTNET_BASE_URL "${skewLineUrl}" cannot target localhost (${parsed.hostname}).`,
      "INSECURE_PRODUCTION_ORIGIN"
    );
  }

  const requireHttps = options.requireHttps ?? isStrictProd;
  if (requireHttps && parsed.protocol !== "https:") {
    throw new SkewLineConfigurationError(
      "HTTPS is required for production authentication-bearing traffic to SKEW_LINE_DOTNET_BASE_URL.",
      "INSECURE_PRODUCTION_ORIGIN"
    );
  }

  return parsed.toString().replace(/\/+$/, "");
}

/**
 * Alias for LexmaCasto remote backend URL resolution.
 */
export function resolveBackendBaseUrl(options: { requireHttps?: boolean } = {}): string {
  return resolveSkewLineBaseUrl(options);
}

/**
 * Validates PrepFord environment configuration for SKEW_LINE remote .NET backend integration.
 * Enforces WEBSITE_12 identity isolation and never falls back to another website's key.
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
  const isStrictProd = isProduction && process.env.APP_ENV === "production";

  if (!appName) {
    errors.push("Missing SKEW_LINE_APP_NAME (expected 'Prepford').");
  } else if (appName !== PREPFORD_IDENTITY_CONSTANTS.APP_NAME) {
    errors.push(`Invalid SKEW_LINE_APP_NAME "${appName}" (expected 'Prepford').`);
  }

  if (!appTitle) {
    errors.push("Missing SKEW_LINE_APP_TITLE (expected 'Prepford').");
  } else if (appTitle !== PREPFORD_IDENTITY_CONSTANTS.APP_TITLE) {
    errors.push(`Invalid SKEW_LINE_APP_TITLE "${appTitle}" (expected 'Prepford').`);
  }

  if (!appDomain || appDomain.startsWith("<")) {
    errors.push("Missing SKEW_LINE_APP_DOMAIN (expected 'https://www.prepford.com/').");
  } else {
    const parsedDomain = parseHttpUrl(appDomain);
    if (!parsedDomain) {
      errors.push(`Invalid SKEW_LINE_APP_DOMAIN "${appDomain}". Expected a valid HTTPS URL.`);
    } else if (
      normalizeDomainForComparison(appDomain) !==
      normalizeDomainForComparison(PREPFORD_IDENTITY_CONSTANTS.APP_DOMAIN)
    ) {
      errors.push(
        `Invalid SKEW_LINE_APP_DOMAIN "${appDomain}" (expected '${PREPFORD_IDENTITY_CONSTANTS.APP_DOMAIN}').`
      );
    }
  }

  if (!appKey || appKey.startsWith("<")) {
    errors.push("Missing SKEW_LINE_APP_KEY (expected 'WEBSITE_12').");
  } else if (appKey !== PREPFORD_IDENTITY_CONSTANTS.APP_KEY) {
    errors.push(
      `Invalid SKEW_LINE_APP_KEY "${appKey}" (expected 'WEBSITE_12'; cross-website fallback is prohibited).`
    );
  }

  if (!activeBackend) {
    errors.push("Missing SKEW_LINE_ACTIVE_BACKEND (expected 'dotnet').");
  } else if (activeBackend.toLowerCase() !== PREPFORD_IDENTITY_CONSTANTS.ACTIVE_BACKEND) {
    errors.push(`Invalid SKEW_LINE_ACTIVE_BACKEND "${activeBackend}" (expected 'dotnet').`);
  }

  let resolvedBackendUrl = "";
  let isHttpsBackend = false;

  try {
    resolvedBackendUrl = resolveSkewLineBaseUrl({ requireHttps: false });
    const parsed = parseHttpUrl(resolvedBackendUrl);
    if (!parsed) {
      errors.push(`Resolved backend URL "${resolvedBackendUrl}" is not a valid HTTP/HTTPS URL.`);
    } else {
      isHttpsBackend = parsed.protocol === "https:";
      if (isStrictProd && isLocalHostname(parsed.hostname)) {
        errors.push(`Production build must not target localhost backend "${resolvedBackendUrl}".`);
      }
      if (!isHttpsBackend && !isLocalHostname(parsed.hostname)) {
        const transportMsg =
          "Remote SKEW_LINE backend uses unencrypted HTTP. Configure an HTTPS/TLS reverse proxy before transmitting production credentials.";
        if (isStrictProd) {
          errors.push(transportMsg);
        } else {
          warnings.push(transportMsg);
        }
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Failed to resolve SKEW_LINE backend URL.");
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

/**
 * Resolves and validates PrepFord's server-side SKEW_LINE identity.
 * Fails closed if any required identity field or backend URL is missing or invalid.
 */
export function resolveSkewLineIdentity(options: { requireHttps?: boolean } = {}): SkewLineIdentity {
  const result = validatePrepfordEnvironment();
  if (!result.valid) {
    throw new SkewLineConfigurationError(
      `PrepFord SKEW_LINE configuration invalid: ${result.errors.join(" ")}`,
      "INVALID_SKEW_LINE_CONFIG"
    );
  }
  const dotnetBaseUrl = resolveSkewLineBaseUrl(options);
  return {
    appName: result.config.appName,
    appTitle: result.config.appTitle,
    appDomain: result.config.appDomain,
    appKey: result.config.appKey,
    activeBackend: result.config.activeBackend,
    dotnetBaseUrl,
  };
}
