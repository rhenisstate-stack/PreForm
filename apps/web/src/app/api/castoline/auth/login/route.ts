import { NextRequest, NextResponse } from "next/server";
import type {
  LexmaCastoLoginPayload,
  LexmaCastoLoginResponseRaw,
} from "@/lib/lexmacasto/contracts";
import { LEXMACASTO_AUTH_ENDPOINTS } from "@/lib/lexmacasto/contracts";
import {
  extractCastoCredentialsFromLogin,
  extractSiteMetadataFromRequestHeaders,
  lexmaCastoRequest,
  sanitizeAuthUser,
} from "@/lib/lexmacasto/client";
import { setServerCastoSession, validateSameOriginRequest } from "@/lib/lexmacasto/session";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 32 * 1024;

export async function POST(request: NextRequest) {
  const csrf = validateSameOriginRequest(request);
  if (!csrf.ok) {
    return NextResponse.json(
      { success: false, message: csrf.reason },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { success: false, message: "Content-Type must be application/json." },
      { status: 415, headers: NO_STORE_HEADERS }
    );
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to read request body." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (Buffer.byteLength(rawText, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { success: false, message: "Request body exceeds maximum allowed size." },
      { status: 413, headers: NO_STORE_HEADERS }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON request body." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : undefined;
  const pin = typeof body.pin === "string" ? body.pin : undefined;
  const loginMethod =
    typeof body.loginMethod === "string" && body.loginMethod.trim()
      ? body.loginMethod.trim()
      : pin
        ? "pin"
        : "password";

  if (!email) {
    return NextResponse.json(
      { success: false, message: "Email is required." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  if (loginMethod === "password" && !password) {
    return NextResponse.json(
      { success: false, message: "Password is required." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  if (loginMethod === "pin" && !pin) {
    return NextResponse.json(
      { success: false, message: "PIN is required." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const payload: LexmaCastoLoginPayload = {
    email,
    loginMethod,
    ...(password !== undefined ? { password } : {}),
    ...(pin !== undefined ? { pin } : {}),
    ...(typeof body.LoginProvider === "string" && body.LoginProvider
      ? { LoginProvider: body.LoginProvider }
      : { LoginProvider: "email" }),
    ...(typeof body.challenge === "string" && body.challenge ? { challenge: body.challenge } : {}),
    ...(typeof body.fingerprint === "string" && body.fingerprint
      ? { fingerprint: body.fingerprint }
      : {}),
    ...(typeof body.dashboardName === "string" && body.dashboardName
      ? { dashboardName: body.dashboardName }
      : {}),
  };

  const siteMeta = extractSiteMetadataFromRequestHeaders(
    request.headers,
    "/api/castoline/auth/login"
  );
  if (siteMeta.siteIpAddress) {
    payload.ipAddress = siteMeta.siteIpAddress;
  }

  const result = await lexmaCastoRequest<LexmaCastoLoginResponseRaw>(
    LEXMACASTO_AUTH_ENDPOINTS.LOGIN,
    {
      method: "POST",
      body: payload,
      siteMeta,
    }
  );

  if (!result.ok || !result.data) {
    return NextResponse.json(
      {
        success: false,
        message: result.message,
        errorCode: result.errorCode,
        errors: result.errors,
      },
      { status: result.status, headers: NO_STORE_HEADERS }
    );
  }

  const credentials = extractCastoCredentialsFromLogin(result.data);
  const rawUser = result.data.user ?? result.data.data?.user;
  const sanitizedUser = sanitizeAuthUser(rawUser);

  if (!credentials || !sanitizedUser) {
    return NextResponse.json(
      {
        success: false,
        message: "Authentication response was incomplete.",
        errorCode: "UNEXPECTED_RESPONSE",
      },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }

  const rawRedirect =
    (typeof result.data.redirect_url === "string" && result.data.redirect_url) ||
    (typeof result.data.data?.redirect_url === "string" && result.data.data.redirect_url) ||
    undefined;
  const safeRedirect =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : undefined;

  const response = NextResponse.json(
    {
      success: true,
      message: result.message,
      data: sanitizedUser,
      ...(safeRedirect ? { redirect_url: safeRedirect } : {}),
    },
    { headers: NO_STORE_HEADERS }
  );

  setServerCastoSession(response, credentials, sanitizedUser.dashboardName || payload.dashboardName);
  return response;
}
