/**
 * Server-managed HttpOnly cookie session & same-origin CSRF guard for PrepFord's LexmaCasto integration.
 * Backend session credentials (`x-casto-line`, `x-casto-badge`) are stored ONLY in
 * HttpOnly cookies and never exposed to browser JavaScript.
 */

import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import type { CastoSessionCredentials } from "./headers";

export const PREPFORD_CASTO_LINE_COOKIE = "prepford_casto_line";
export const PREPFORD_CASTO_BADGE_COOKIE = "prepford_casto_badge";
export const PREPFORD_CASTO_DASHBOARD_COOKIE = "prepford_casto_dashboard";

const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function getCastoSessionCookieOptions(isProduction = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: DEFAULT_SESSION_MAX_AGE_SECONDS,
  };
}

export function getClearedCastoCookieOptions(isProduction = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };
}

/**
 * Reads server-managed HttpOnly Casto session credentials from incoming request cookies.
 */
export async function getServerCastoSession(
  request?: NextRequest
): Promise<CastoSessionCredentials | null> {
  if (request) {
    const castoLine = request.cookies.get(PREPFORD_CASTO_LINE_COOKIE)?.value?.trim();
    const castoBadge = request.cookies.get(PREPFORD_CASTO_BADGE_COOKIE)?.value?.trim();
    if (castoLine && castoBadge) {
      return { castoLine, castoBadge };
    }
  }

  try {
    const cookieStore = await cookies();
    const castoLine = cookieStore.get(PREPFORD_CASTO_LINE_COOKIE)?.value?.trim();
    const castoBadge = cookieStore.get(PREPFORD_CASTO_BADGE_COOKIE)?.value?.trim();
    if (!castoLine || !castoBadge) {
      return null;
    }
    return { castoLine, castoBadge };
  } catch {
    return null;
  }
}

export async function getServerCastoDashboardHint(
  request?: NextRequest
): Promise<string | undefined> {
  if (request) {
    const reqVal = request.cookies.get(PREPFORD_CASTO_DASHBOARD_COOKIE)?.value?.trim();
    if (reqVal) return reqVal;
  }
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(PREPFORD_CASTO_DASHBOARD_COOKIE)?.value?.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Attaches HttpOnly Casto session cookies to a NextResponse.
 */
export function setServerCastoSession(
  response: NextResponse,
  credentials: CastoSessionCredentials,
  dashboardName?: string,
  isProduction = process.env.NODE_ENV === "production"
): void {
  const opts = getCastoSessionCookieOptions(isProduction);
  response.cookies.set(PREPFORD_CASTO_LINE_COOKIE, credentials.castoLine, opts);
  response.cookies.set(PREPFORD_CASTO_BADGE_COOKIE, credentials.castoBadge, opts);
  if (dashboardName) {
    response.cookies.set(PREPFORD_CASTO_DASHBOARD_COOKIE, dashboardName, opts);
  }
}

/**
 * Expires/clears all Casto session cookies on a NextResponse.
 */
export function clearServerCastoSession(
  response: NextResponse,
  isProduction = process.env.NODE_ENV === "production"
): void {
  const opts = getClearedCastoCookieOptions(isProduction);
  response.cookies.set(PREPFORD_CASTO_LINE_COOKIE, "", opts);
  response.cookies.set(PREPFORD_CASTO_BADGE_COOKIE, "", opts);
  response.cookies.set(PREPFORD_CASTO_DASHBOARD_COOKIE, "", opts);
}

/**
 * Validates same-origin CSRF protection for cookie-authenticated state-changing requests.
 * Rejects cross-site browser requests without requiring an unsupported backend /csrf endpoint.
 * Does not trust arbitrary X-Forwarded-Host headers.
 */
export function validateSameOriginRequest(
  request: NextRequest,
  options: { allowMissingOriginInTest?: boolean } = {}
): { ok: true } | { ok: false; reason: string } {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { ok: true };
  }

  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (secFetchSite === "cross-site") {
    return { ok: false, reason: "Cross-site state-changing request rejected." };
  }

  const expectedHost = (request.headers.get("host") || request.nextUrl.host || "").toLowerCase();
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host.toLowerCase() !== expectedHost) {
        return { ok: false, reason: "Request origin mismatch." };
      }
      return { ok: true };
    } catch {
      return { ok: false, reason: "Invalid request origin header." };
    }
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host.toLowerCase() !== expectedHost) {
        return { ok: false, reason: "Request referer mismatch." };
      }
      return { ok: true };
    } catch {
      return { ok: false, reason: "Invalid request referer header." };
    }
  }

  if (secFetchSite === "same-origin") {
    return { ok: true };
  }

  if (options.allowMissingOriginInTest && process.env.NODE_ENV === "test") {
    return { ok: true };
  }

  return { ok: false, reason: "Missing Origin or Referer header on state-changing request." };
}
