import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveBackendBaseUrl, validatePrepfordEnvironment } from "@/lib/env-config";
import { apiClient, getApiBaseUrl } from "@/lib/api-client";
import { checkRemoteBackendConnectivity } from "@/lib/backend-diagnostics";

describe("Remote .NET Backend Environment & Integration", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.SKEW_LINE_APP_NAME = "Prepford";
    process.env.SKEW_LINE_APP_TITLE = "Prepford";
    process.env.SKEW_LINE_APP_DOMAIN = "https://www.prepford.com/";
    process.env.SKEW_LINE_APP_KEY = "WEBSITE_1";
    process.env.SKEW_LINE_ACTIVE_BACKEND = "dotnet";
    process.env.SKEW_LINE_DOTNET_BASE_URL = "http://108.61.9.189:8008";
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("prioritizes SKEW_LINE_DOTNET_BASE_URL over local gateway defaults when active backend is dotnet", () => {
    process.env.INTERNAL_API_URL = "http://localhost:4000";
    process.env.API_GATEWAY_URL = "http://localhost:4000";
    expect(resolveBackendBaseUrl()).toBe("http://108.61.9.189:8008");
    expect(getApiBaseUrl()).toBe("http://108.61.9.189:8008");
  });

  it("rejects localhost fallback in strict production builds", () => {
    (process.env as Record<string, string>).NODE_ENV = "production";
    process.env.APP_ENV = "production";
    process.env.SKEW_LINE_DOTNET_BASE_URL = "http://localhost:4000";
    expect(() => resolveBackendBaseUrl()).toThrow(/cannot target localhost/i);
  });

  it("validates SKEW_LINE variables and emits HTTP transport warning for unencrypted remote host", () => {
    const result = validatePrepfordEnvironment();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.config.appKey).toBe("WEBSITE_1");
    expect(result.config.activeBackend).toBe("dotnet");
    expect(result.config.isHttpsBackend).toBe(false);
    expect(result.warnings.some((w) => w.includes("unencrypted HTTP"))).toBe(true);
  });

  it("reports validation errors when required SKEW_LINE variables are invalid or missing", () => {
    process.env.SKEW_LINE_APP_KEY = "WRONG_KEY";
    process.env.SKEW_LINE_ACTIVE_BACKEND = "node";
    const result = validatePrepfordEnvironment();
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it("treats unexpected HTML Page Not Found responses as 404 API failures instead of JSON success", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("<!DOCTYPE html><html><title>Page Not Found - Master Bank</title></html>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    ) as unknown as typeof fetch;

    const res = await apiClient.get("/api/v1/examinations");
    expect(res.success).toBe(false);
    expect(res.status).toBe(404);
    expect(res.error).toContain("not found");
  });

  it("collects safe connectivity diagnostics without exposing secrets", async () => {
    process.env.SESSION_SECRET = "super-secret-value-never-expose";
    process.env.GATEWAY_SHARED_SECRET = "gateway-secret-never-expose";

    globalThis.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return new Response('"healthy"', {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("", {
        status: 302,
        headers: { Location: "/web/restoration/lost" },
      });
    }) as unknown as typeof fetch;

    const diag = await checkRemoteBackendConnectivity(2000);
    expect(diag.connectivityStatus).toBe("reachable");
    expect(diag.healthEndpointStatus).toBe(200);
    expect(diag.documentationAvailable).toBe(false);
    expect(diag.applicationIdentity.appKey).toBe("WEBSITE_1");
    const serialized = JSON.stringify(diag);
    expect(serialized).not.toContain("super-secret-value-never-expose");
    expect(serialized).not.toContain("gateway-secret-never-expose");
  });
});
