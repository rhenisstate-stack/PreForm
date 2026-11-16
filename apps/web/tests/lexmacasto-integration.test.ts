import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  buildCastoAuthHeaders,
  buildSiteHeaders,
  redactHeadersForLog,
  redactPayloadForLog,
  sanitizeHeaderValue,
} from "@/lib/lexmacasto/headers";
import {
  buildCurrentUserEndpointPath,
  buildStrataEndpointPath,
  isStrataResourceKey,
} from "@/lib/lexmacasto/contracts";
import { assertSafeBackendPath, lexmaCastoRequest } from "@/lib/lexmacasto/client";
import {
  PREPFORD_CASTO_BADGE_COOKIE,
  PREPFORD_CASTO_LINE_COOKIE,
  validateSameOriginRequest,
} from "@/lib/lexmacasto/session";
import { POST as castoLoginRoute } from "@/app/api/castoline/auth/login/route";
import { POST as castoRegisterRoute } from "@/app/api/castoline/auth/register/route";
import { GET as castoMeRoute } from "@/app/api/castoline/auth/me/route";
import { POST as castoLogoutRoute } from "@/app/api/castoline/auth/logout/route";
import { GET as castoStrataRoute } from "@/app/api/castoline/strata/[resource]/route";
import { GET as configStatusRoute } from "@/app/api/castoline/config-status/route";

describe("PrepFord LexmaCasto (WEBSITE_12) Integration & Security", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.SKEW_LINE_APP_NAME = "Prepford";
    process.env.SKEW_LINE_APP_TITLE = "Prepford";
    process.env.SKEW_LINE_APP_DOMAIN = "https://www.prepford.com/";
    process.env.SKEW_LINE_APP_KEY = "WEBSITE_12";
    process.env.SKEW_LINE_ACTIVE_BACKEND = "dotnet";
    process.env.SKEW_LINE_DOTNET_BASE_URL = "http://108.61.9.189:8008";
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("A. Identity & Header Construction", () => {
    it("constructs authoritative WEBSITE_12 site headers and strips CRLF injection", () => {
      const headers = buildSiteHeaders(
        {
          appName: "Prepford",
          appTitle: "Prepford",
          appDomain: "https://www.prepford.com/",
          appKey: "WEBSITE_12",
          activeBackend: "dotnet",
          dotnetBaseUrl: "http://108.61.9.189:8008",
        },
        {
          sitePath: "/api/castoline/auth/login\r\nX-Injected: evil",
          siteBrowser: "VitestAgent",
        }
      );

      expect(headers["x-site-key"]).toBe("WEBSITE_12");
      expect(headers["x-site-domain"]).toBe("https://www.prepford.com/");
      expect(headers["x-site-name"]).toBe("Prepford");
      expect(headers["x-site-path"]).toBe("/api/castoline/auth/loginX-Injected: evil");
      expect(headers["x-site-brouser"]).toBe("VitestAgent");
    });

    it("builds x-casto-line and x-casto-badge headers and redacts sensitive logs", () => {
      const authHeaders = buildCastoAuthHeaders({
        castoLine: "line-secret-123",
        castoBadge: "badge-secret-456",
      });
      expect(authHeaders).toEqual({
        "x-casto-line": "line-secret-123",
        "x-casto-badge": "badge-secret-456",
      });

      const redactedH = redactHeadersForLog({
        "x-site-key": "WEBSITE_12",
        "x-casto-line": "line-secret-123",
        "x-casto-badge": "badge-secret-456",
        "x-site-name": "Prepford",
      });
      expect(redactedH["x-site-key"]).toBe("[REDACTED]");
      expect(redactedH["x-casto-line"]).toBe("[REDACTED]");
      expect(redactedH["x-casto-badge"]).toBe("[REDACTED]");
      expect(redactedH["x-site-name"]).toBe("Prepford");

      const redactedP = redactPayloadForLog({
        email: "learner@prepford.com",
        password: "SecretPassword!123",
      }) as Record<string, unknown>;
      expect(redactedP.email).toBe("learner@prepford.com");
      expect(redactedP.password).toBe("[REDACTED]");
      expect(sanitizeHeaderValue("  ok\x00value  ")).toBe("okvalue");
    });

    it("fails closed when WEBSITE_12 is missing or replaced with WEBSITE_11", async () => {
      process.env.SKEW_LINE_APP_KEY = "WEBSITE_11";
      const res = await lexmaCastoRequest("/api/castoline/auth/login", { method: "POST" });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(503);
      expect(res.errorCode).toBe("MISSING_APP_IDENTITY");
    });
  });

  describe("B. Route Allowlist & Fetchtype Contract", () => {
    it("enforces mandatory fetchtype on current user and strata endpoints", () => {
      expect(buildCurrentUserEndpointPath()).toBe(
        "/api/castoline/system/user/list/current?fetchtype=current"
      );
      expect(buildStrataEndpointPath("categories", { fetchtype: "hacked", page: 2 })).toBe(
        "/api/castoline/strata/main/categories/list/absolute?page=2&fetchtype=absolute"
      );
      expect(buildStrataEndpointPath("examsLive")).toBe(
        "/api/castoline/strata/assessment/exams/list/live?fetchtype=live"
      );
      expect(isStrataResourceKey("categories")).toBe(true);
      expect(isStrataResourceKey("unknown_strata")).toBe(false);
    });

    it("rejects non-allowlisted or SSRF-like backend paths", () => {
      expect(() => assertSafeBackendPath("/api/v1/auth/login")).toThrow();
      expect(() => assertSafeBackendPath("https://evil.com/api/castoline/auth/login")).toThrow();
      expect(() => assertSafeBackendPath("/api/castoline/../secret")).toThrow();
      expect(() => assertSafeBackendPath("/api/castoline/auth/login\r\n")).toThrow();
      expect(assertSafeBackendPath("/api/castoline/auth/login")).toBe(
        "/api/castoline/auth/login"
      );
    });
  });

  describe("C. BFF Auth Routes, HttpOnly Cookies & Security Guards", () => {
    it("login stores castoLine/castoBadge in HttpOnly cookies and never exposes them in JSON", async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
        capturedHeaders = (init?.headers || {}) as Record<string, string>;
        return new Response(
          JSON.stringify({
            success: true,
            message: "Authenticated",
            user: {
              guidId: "user-guid-12",
              email: "nurse@prepford.com",
              name: "Jane Nurse",
              role: "Learner",
              castoLine: "upstream-casto-line-token",
              castoBadge: "upstream-casto-badge-token",
              dashboardName: "learner",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }) as unknown as typeof fetch;

      const req = new NextRequest("http://localhost:3000/api/castoline/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          host: "localhost:3000",
          origin: "http://localhost:3000",
          "x-site-key": "WEBSITE_11",
          "x-site-domain": "https://evil.example/",
        },
        body: JSON.stringify({
          email: "nurse@prepford.com",
          password: "ValidPassword!123",
          loginMethod: "password",
        }),
      });

      const res = await castoLoginRoute(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");

      // Server-owned headers must override any browser-supplied x-site-key / x-site-domain
      expect(capturedHeaders["x-site-key"]).toBe("WEBSITE_12");
      expect(capturedHeaders["x-site-domain"]).toBe("https://www.prepford.com/");

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.email).toBe("nurse@prepford.com");
      expect(JSON.stringify(body)).not.toContain("upstream-casto-line-token");
      expect(JSON.stringify(body)).not.toContain("upstream-casto-badge-token");

      const setCookie = res.headers.get("set-cookie") || "";
      expect(setCookie).toContain(PREPFORD_CASTO_LINE_COOKIE);
      expect(setCookie).toContain(PREPFORD_CASTO_BADGE_COOKIE);
      expect(setCookie.toLowerCase()).toContain("httponly");
    });

    it("rejects cross-site POST requests with 403 CSRF guard", async () => {
      const req = new NextRequest("http://localhost:3000/api/castoline/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          host: "localhost:3000",
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        },
        body: JSON.stringify({ email: "a@b.com", password: "x" }),
      });

      expect(validateSameOriginRequest(req).ok).toBe(false);
      const res = await castoLoginRoute(req);
      expect(res.status).toBe(403);
    });

    it("register forces role=Learner and forwards to /api/castoline/auth/register", async () => {
      let forwardedBody: Record<string, unknown> = {};
      globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
        forwardedBody = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
        return new Response(JSON.stringify({ success: true, message: "Registered" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }) as unknown as typeof fetch;

      const req = new NextRequest("http://localhost:3000/api/castoline/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          username: "New Learner",
          email: "new@prepford.com",
          password: "StrongPassword!123",
          passwordConfirmation: "StrongPassword!123",
          role: "SuperAdmin",
        }),
      });

      const res = await castoRegisterRoute(req);
      expect(res.status).toBe(201);
      expect(forwardedBody.role).toBe("Learner");
    });

    it("me validates session via ?fetchtype=current and clears cookies on upstream 401", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Expired session" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      ) as unknown as typeof fetch;

      const req = new NextRequest("http://localhost:3000/api/castoline/auth/me", {
        method: "GET",
        headers: {
          cookie: `${PREPFORD_CASTO_LINE_COOKIE}=l1; ${PREPFORD_CASTO_BADGE_COOKIE}=b1`,
        },
      });

      const res = await castoMeRoute(req);
      expect(res.status).toBe(401);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const setCookie = res.headers.get("set-cookie") || "";
      expect(setCookie).toContain(`${PREPFORD_CASTO_LINE_COOKIE}=;`);
    });

    it("logout revokes upstream distinct session and clears local Casto cookies", async () => {
      let calledUrl = "";
      globalThis.fetch = vi.fn().mockImplementation(async (url) => {
        calledUrl = String(url);
        return new Response(JSON.stringify({ success: true, message: "Logged out" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as unknown as typeof fetch;

      const req = new NextRequest("http://localhost:3000/api/castoline/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          host: "localhost:3000",
          origin: "http://localhost:3000",
          cookie: `${PREPFORD_CASTO_LINE_COOKIE}=l1; ${PREPFORD_CASTO_BADGE_COOKIE}=b1`,
        },
        body: JSON.stringify({ scope: "distinct", target_dashboard: "learner" }),
      });

      const res = await castoLogoutRoute(req);
      expect(res.status).toBe(200);
      expect(calledUrl).toContain("/api/castoline/auth/logout/sessions/distinct");
      const setCookie = res.headers.get("set-cookie") || "";
      expect(setCookie).toContain(`${PREPFORD_CASTO_LINE_COOKIE}=;`);
    });

    it("strata route rejects unknown resources and enforces auth for examsLive", async () => {
      const unknownReq = new NextRequest("http://localhost:3000/api/castoline/strata/hacked", {
        method: "GET",
      });
      const unknownRes = await castoStrataRoute(unknownReq, {
        params: Promise.resolve({ resource: "hacked" }),
      });
      expect(unknownRes.status).toBe(404);

      const liveReq = new NextRequest("http://localhost:3000/api/castoline/strata/examsLive", {
        method: "GET",
      });
      const liveRes = await castoStrataRoute(liveReq, {
        params: Promise.resolve({ resource: "examsLive" }),
      });
      expect(liveRes.status).toBe(401);
    });

    it("config-status returns non-secret diagnostics without leaking WEBSITE_12 or backend IP", async () => {
      const res = await configStatusRoute();
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const text = await res.text();
      expect(text).not.toContain("WEBSITE_12");
      expect(text).not.toContain("108.61.9.189");
    });
  });
});
