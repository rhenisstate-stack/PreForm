import { validatePrepfordEnvironment } from "./env-config";

export interface BackendConnectivityDiagnostics {
  configuredBackendUrl: string;
  applicationIdentity: {
    appName: string;
    appKey: string;
    activeBackend: string;
  };
  connectivityStatus: "reachable" | "degraded" | "unreachable";
  healthEndpointStatus: number | null;
  healthPayload: string | null;
  documentationAvailable: boolean;
  documentationCheckedPaths: string[];
  transportSecurity: {
    isHttps: boolean;
    warning: string | null;
  };
  environmentValidation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  lastCheckedAt: string;
  lastSuccessfulVerificationAt: string | null;
}

let lastSuccessfulVerificationAt: string | null = null;

/**
 * Performs a safe, non-destructive connectivity diagnostic against the configured remote ASP.NET Core backend.
 * Never exposes credentials, access tokens, session secrets, or internal server stack traces.
 */
export async function checkRemoteBackendConnectivity(
  timeoutMs: number = 5000
): Promise<BackendConnectivityDiagnostics> {
  const envResult = validatePrepfordEnvironment();
  const baseUrl = envResult.config.resolvedBackendUrl;
  const now = new Date().toISOString();

  let connectivityStatus: "reachable" | "degraded" | "unreachable" = "unreachable";
  let healthEndpointStatus: number | null = null;
  let healthPayload: string | null = null;

  if (baseUrl) {
    try {
      const healthRes = await fetch(`${baseUrl}/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "manual",
      });
      healthEndpointStatus = healthRes.status;
      if (healthRes.ok) {
        const text = await healthRes.text();
        healthPayload = text.slice(0, 100);
        connectivityStatus = "reachable";
        lastSuccessfulVerificationAt = now;
      } else {
        connectivityStatus = "degraded";
      }
    } catch {
      connectivityStatus = "unreachable";
    }
  }

  // Probe OpenAPI/Swagger availability safely without assuming it exists
  const docPaths = ["/swagger/v1/swagger.json", "/openapi/v1.json"];
  let documentationAvailable = false;

  if (baseUrl && connectivityStatus !== "unreachable") {
    for (const docPath of docPaths) {
      try {
        const docRes = await fetch(`${baseUrl}${docPath}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(timeoutMs),
          redirect: "manual",
        });
        const ct = docRes.headers.get("content-type") || "";
        if (docRes.ok && ct.includes("application/json")) {
          documentationAvailable = true;
          break;
        }
      } catch {
        // Ignore individual doc probe failures
      }
    }
  }

  return {
    configuredBackendUrl: baseUrl,
    applicationIdentity: {
      appName: envResult.config.appName || "Prepford",
      appKey: envResult.config.appKey || "WEBSITE_1",
      activeBackend: envResult.config.activeBackend || "dotnet",
    },
    connectivityStatus,
    healthEndpointStatus,
    healthPayload,
    documentationAvailable,
    documentationCheckedPaths: docPaths,
    transportSecurity: {
      isHttps: envResult.config.isHttpsBackend,
      warning: envResult.config.isHttpsBackend
        ? null
        : "Backend URL uses plain HTTP. Configure HTTPS/TLS reverse proxy before transmitting production credentials.",
    },
    environmentValidation: {
      valid: envResult.valid,
      errors: envResult.errors,
      warnings: envResult.warnings,
    },
    lastCheckedAt: now,
    lastSuccessfulVerificationAt,
  };
}
