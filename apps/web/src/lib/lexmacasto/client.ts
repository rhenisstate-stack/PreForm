/**
 * Centralized server-side HTTP client for LexmaCasto / Qlex-Nursing backend communication.
 * Enforces WEBSITE_12 identity isolation, required site headers, custom Casto authentication
 * headers, timeouts, route allowlisting, and safe error normalization.
 */

import crypto from "node:crypto";
import {
  SkewLineConfigurationError,
  resolveSkewLineIdentity,
} from "@/lib/env-config";
import {
  buildCastoAuthHeaders,
  buildSiteHeaders,
  sanitizeHeaderValue,
  type CastoSessionCredentials,
  type OptionalSiteMetadata,
} from "./headers";
import type {
  LexmaCastoAuthUserRaw,
  LexmaCastoLoginResponseRaw,
  StrataEnvelope,
  StrataRecord,
} from "./contracts";

const DEFAULT_TIMEOUT_MS = 20_000;

export type NormalizedBackendErrorCode =
  | "CONFIGURATION_ERROR"
  | "MISSING_APP_IDENTITY"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "BACKEND_ERROR"
  | "UNEXPECTED_RESPONSE";

export interface LexmaCastoResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  message: string;
  errorCode?: NormalizedBackendErrorCode;
  errors?: string[];
}

export interface LexmaCastoRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  session?: CastoSessionCredentials | null;
  siteMeta?: OptionalSiteMetadata;
  timeoutMs?: number;
  headers?: Record<string, string>;
  requireHttps?: boolean;
}

/**
 * Prevents SSRF and arbitrary URL forwarding: only allowlisted `/api/castoline/...` paths are permitted.
 */
export function assertSafeBackendPath(path: string): string {
  if (!path || typeof path !== "string") {
    throw new Error("Backend path is required.");
  }
  if (/[\r\n\0]/.test(path)) {
    throw new Error("Invalid characters in backend API path.");
  }
  const trimmed = path.trim();
  if (!trimmed.startsWith("/api/castoline/") || trimmed.startsWith("//") || trimmed.includes("..")) {
    throw new Error("Invalid or non-allowlisted LexmaCasto backend API path.");
  }
  return trimmed;
}

function mapStatusToErrorCode(status: number): NormalizedBackendErrorCode {
  if (status === 400 || status === 422) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "BACKEND_ERROR";
  return "BACKEND_ERROR";
}

function sanitizeBackendMessage(rawMessage: unknown, status: number): string {
  if (typeof rawMessage !== "string" || !rawMessage.trim()) {
    if (status === 401) return "Authentication is required.";
    if (status === 403) return "You do not have permission to perform this action.";
    if (status === 404) return "The requested resource was not found.";
    if (status === 409) return "The request conflicts with an existing record.";
    if (status === 429) return "Too many requests. Please wait a moment and try again.";
    if (status >= 500) return "The backend service is temporarily unavailable.";
    return `Request failed (${status}).`;
  }

  const msg = rawMessage.trim();
  const firstLine = msg.split(/\r?\n/)[0].slice(0, 300);
  if (
    /at\s+\S+\s+\(|stack\s*trace|sql\s+exception|connection\s+string|108\.61\.9\.189|SKEW_LINE_APP_KEY|WEBSITE_12/i.test(
      firstLine
    )
  ) {
    return status >= 500
      ? "The backend service encountered an internal error."
      : "Request could not be completed.";
  }
  return firstLine;
}

export function extractSiteMetadataFromRequestHeaders(
  incomingHeaders: Headers,
  pathname?: string
): OptionalSiteMetadata {
  const forwardedFor = incomingHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = incomingHeaders.get("x-real-ip")?.trim();
  const userAgent = incomingHeaders.get("user-agent")?.trim();
  const referer = incomingHeaders.get("referer")?.trim();
  const requestId = incomingHeaders.get("x-request-id")?.trim() || crypto.randomUUID();

  return {
    sitePath: sanitizeHeaderValue(pathname, 256),
    siteIpAddress: sanitizeHeaderValue(forwardedFor || realIp, 64),
    siteBrowser: sanitizeHeaderValue(userAgent, 256),
    siteReferrer: sanitizeHeaderValue(referer, 256),
    siteTime: new Date().toISOString(),
    siteRequestId: sanitizeHeaderValue(requestId, 64),
  };
}

/**
 * Executes an authenticated or public server-to-server request to the LexmaCasto backend.
 */
export async function lexmaCastoRequest<T = unknown>(
  path: string,
  options: LexmaCastoRequestOptions = {}
): Promise<LexmaCastoResult<T>> {
  let identity;
  try {
    identity = resolveSkewLineIdentity({ requireHttps: options.requireHttps });
  } catch (err) {
    if (err instanceof SkewLineConfigurationError) {
      const isIdentity = err.code === "INVALID_SKEW_LINE_CONFIG";
      return {
        ok: false,
        status: 503,
        message: err.message,
        errorCode: isIdentity ? "MISSING_APP_IDENTITY" : "CONFIGURATION_ERROR",
      };
    }
    return {
      ok: false,
      status: 503,
      message: "Backend configuration is invalid.",
      errorCode: "CONFIGURATION_ERROR",
    };
  }

  let safePath: string;
  try {
    safePath = assertSafeBackendPath(path);
  } catch (err) {
    return {
      ok: false,
      status: 400,
      message: err instanceof Error ? err.message : "Invalid API path.",
      errorCode: "VALIDATION_ERROR",
    };
  }

  const targetUrl = `${identity.dotnetBaseUrl}${safePath}`;
  const method = options.method || "GET";
  const siteHeaders = buildSiteHeaders(identity, options.siteMeta);
  const authHeaders = buildCastoAuthHeaders(options.session);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers || {}),
    // Server-owned privileged headers ALWAYS override any caller-supplied headers
    ...siteHeaders,
    ...authHeaders,
  };

  let bodyString: string | undefined;
  if (options.body !== undefined && method !== "GET") {
    headers["Content-Type"] = "application/json";
    bodyString = JSON.stringify(options.body);
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(new Error("Backend request timed out")), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: bodyString,
      signal: controller.signal,
      redirect: "manual",
      cache: "no-store",
    });

    if (response.status >= 300 && response.status < 400) {
      return {
        ok: false,
        status: response.status === 302 ? 404 : response.status,
        message: "The requested backend endpoint is unavailable or redirected.",
        errorCode: "NOT_FOUND",
      };
    }

    const rawText = await response.text();
    if (!rawText) {
      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          message: "OK",
        };
      }
      return {
        ok: false,
        status: response.status,
        message: sanitizeBackendMessage(undefined, response.status),
        errorCode: mapStatusToErrorCode(response.status),
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return {
        ok: false,
        status: response.ok ? 502 : response.status,
        message: response.ok
          ? "Unexpected non-JSON response from backend."
          : sanitizeBackendMessage(undefined, response.status),
        errorCode: response.ok ? "UNEXPECTED_RESPONSE" : mapStatusToErrorCode(response.status),
      };
    }

    const record = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
    const rawMsg = record.message ?? record.error;

    if (!response.ok || record.success === false) {
      const errors = Array.isArray(record.errors)
        ? record.errors
            .filter((e): e is string => typeof e === "string")
            .map((e) => sanitizeBackendMessage(e, response.status))
        : undefined;
      return {
        ok: false,
        status: response.ok ? 400 : response.status,
        message: sanitizeBackendMessage(rawMsg, response.status),
        errorCode: mapStatusToErrorCode(response.ok ? 400 : response.status),
        errors,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: parsed as T,
      message: typeof rawMsg === "string" ? rawMsg : "OK",
    };
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === "AbortError" || /timed out/i.test(err.message));
    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      message: isTimeout
        ? "The backend service took too long to respond."
        : "Unable to reach the backend service.",
      errorCode: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extracts `castoLine` and `castoBadge` from LexmaCasto login response without exposing them to callers.
 */
export function extractCastoCredentialsFromLogin(
  payload: LexmaCastoLoginResponseRaw | undefined
): CastoSessionCredentials | null {
  if (!payload || typeof payload !== "object") return null;
  const userObj = payload.user ?? payload.data?.user;
  const castoLine =
    (typeof userObj?.castoLine === "string" && userObj.castoLine.trim()) ||
    (typeof payload.data?.castoLine === "string" && payload.data.castoLine.trim()) ||
    (typeof payload.castoLine === "string" && payload.castoLine.trim()) ||
    "";
  const castoBadge =
    (typeof userObj?.castoBadge === "string" && userObj.castoBadge.trim()) ||
    (typeof payload.data?.castoBadge === "string" && payload.data.castoBadge.trim()) ||
    (typeof payload.castoBadge === "string" && payload.castoBadge.trim()) ||
    "";

  if (!castoLine || !castoBadge) return null;
  return { castoLine, castoBadge };
}

/**
 * Maps a raw LexmaCasto user object to PrepFord's sanitized user DTO (stripping castoLine/castoBadge).
 */
export function sanitizeAuthUser(rawUser: LexmaCastoAuthUserRaw | undefined | null) {
  if (!rawUser || typeof rawUser !== "object") return null;

  const id = String(rawUser.guidId ?? rawUser.id ?? rawUser.userId ?? rawUser.email ?? "");
  const email = typeof rawUser.email === "string" ? rawUser.email : "";
  const name =
    (typeof rawUser.name === "string" && rawUser.name) ||
    (typeof rawUser.fullName === "string" && rawUser.fullName) ||
    (typeof rawUser.username === "string" && rawUser.username) ||
    email;
  const role =
    (typeof rawUser.role === "string" && rawUser.role) ||
    (Array.isArray(rawUser.roles) && typeof rawUser.roles[0] === "string" && rawUser.roles[0]) ||
    "Learner";

  if (!email && !id) return null;

  return {
    id,
    name,
    email,
    role,
    dashboardName: typeof rawUser.dashboardName === "string" ? rawUser.dashboardName : undefined,
    avatarUrl: typeof rawUser.avatarUrl === "string" ? rawUser.avatarUrl : undefined,
  };
}

/**
 * Normalizes a LexmaCasto Academic Strata envelope.
 */
export function normalizeStrataEnvelope<T extends StrataRecord = StrataRecord>(
  raw: unknown
): StrataEnvelope<T> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const dataObj = (obj.data && typeof obj.data === "object" ? obj.data : obj) as Record<
    string,
    unknown
  >;

  const items = Array.isArray(dataObj.items) ? (dataObj.items as T[]) : [];
  const skewPage = typeof dataObj.skewPage === "number" ? dataObj.skewPage : 1;
  const skewPerPage =
    typeof dataObj.skewPerPage === "number" ? dataObj.skewPerPage : items.length || 20;
  const skewTotal = typeof dataObj.skewTotal === "number" ? dataObj.skewTotal : items.length;
  const skewTotalPages = typeof dataObj.skewTotalPages === "number" ? dataObj.skewTotalPages : 1;

  return {
    success: obj.success !== false,
    message: typeof obj.message === "string" ? obj.message : undefined,
    data: {
      items,
      skewPage,
      skewPerPage,
      skewTotal,
      skewTotalPages,
    },
  };
}
