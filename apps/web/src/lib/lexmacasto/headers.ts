/**
 * Centralized LexmaCasto site & authentication header builders for PrepFord.
 * Server-only: never import this module in client components.
 */

import type { SkewLineIdentity } from "@/lib/env-config";

export interface OptionalSiteMetadata {
  siteName?: string;
  sitePath?: string;
  siteIpAddress?: string;
  siteLocation?: string;
  siteCountry?: string;
  siteBrowser?: string;
  siteTime?: string;
  siteReferrer?: string;
  siteMobile?: string;
  siteRequestId?: string;
  siteSessionId?: string;
}

export interface CastoSessionCredentials {
  castoLine: string;
  castoBadge: string;
}

const SENSITIVE_HEADER_NAMES = new Set([
  "x-site-key",
  "x-casto-line",
  "x-casto-badge",
  "authorization",
  "cookie",
  "set-cookie",
]);

const SENSITIVE_BODY_KEYS = new Set([
  "password",
  "passwordconfirmation",
  "confirmpassword",
  "newpassword",
  "pin",
  "pinconfirmation",
  "challenge",
  "castoline",
  "castobadge",
  "x-casto-line",
  "x-casto-badge",
  "x-site-key",
  "providerpayload",
  "token",
]);

/**
 * Strips CR/LF/control characters to prevent HTTP header injection.
 */
export function sanitizeHeaderValue(value: string | undefined | null, maxLen = 512): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/[\r\n\0\x01-\x1F\x7F]/g, "").trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, maxLen);
}

/**
 * Generates required (`x-site-key`, `x-site-domain`) and optional sanitized `x-site-*` headers.
 * Note: `x-site-brouser` intentionally preserves the Qlex-Nursing/LexmaCasto backend spelling.
 */
export function buildSiteHeaders(
  identity: SkewLineIdentity,
  meta?: OptionalSiteMetadata
): Record<string, string> {
  const siteKey = sanitizeHeaderValue(identity.appKey, 512);
  const siteDomain = sanitizeHeaderValue(identity.appDomain, 512);

  if (!siteKey || !siteDomain) {
    throw new Error("Cannot construct site headers: missing PrepFord application identity.");
  }

  const headers: Record<string, string> = {
    "x-site-key": siteKey,
    "x-site-domain": siteDomain,
  };

  const optionalMap: Array<[string, string | undefined]> = [
    ["x-site-name", meta?.siteName ?? identity.appName],
    ["x-site-path", meta?.sitePath],
    ["x-site-ip-address", meta?.siteIpAddress],
    ["x-site-location", meta?.siteLocation],
    ["x-site-country", meta?.siteCountry],
    ["x-site-brouser", meta?.siteBrowser],
    ["x-site-time", meta?.siteTime],
    ["x-site-referrer", meta?.siteReferrer],
    ["x-site-mobile", meta?.siteMobile],
    ["x-site-request-id", meta?.siteRequestId],
    ["x-site-session-id", meta?.siteSessionId],
  ];

  for (const [headerName, rawValue] of optionalMap) {
    const clean = sanitizeHeaderValue(rawValue, 256);
    if (clean) {
      headers[headerName] = clean;
    }
  }

  return headers;
}

/**
 * Builds custom LexmaCasto authentication headers (`x-casto-line`, `x-casto-badge`).
 */
export function buildCastoAuthHeaders(
  session: CastoSessionCredentials | null | undefined
): Record<string, string> {
  if (!session) return {};
  const castoLine = sanitizeHeaderValue(session.castoLine, 2048);
  const castoBadge = sanitizeHeaderValue(session.castoBadge, 2048);
  if (!castoLine || !castoBadge) return {};
  return {
    "x-casto-line": castoLine,
    "x-casto-badge": castoBadge,
  };
}

/**
 * Redacts sensitive headers for safe diagnostic logging.
 */
export function redactHeadersForLog(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_NAMES.has(key.toLowerCase())) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Redacts sensitive payload properties for safe diagnostic logging.
 */
export function redactPayloadForLog(payload: unknown): unknown {
  if (payload === null || payload === undefined) return payload;
  if (typeof payload !== "object") return payload;
  if (Array.isArray(payload)) {
    return payload.map((item) => redactPayloadForLog(item));
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (SENSITIVE_BODY_KEYS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactPayloadForLog(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
