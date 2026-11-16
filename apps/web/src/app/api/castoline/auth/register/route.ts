import { NextRequest, NextResponse } from "next/server";
import type { LexmaCastoRegisterPayload } from "@/lib/lexmacasto/contracts";
import { LEXMACASTO_AUTH_ENDPOINTS } from "@/lib/lexmacasto/contracts";
import { extractSiteMetadataFromRequestHeaders, lexmaCastoRequest } from "@/lib/lexmacasto/client";
import { validateSameOriginRequest } from "@/lib/lexmacasto/session";

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

  const username =
    (typeof body.username === "string" && body.username.trim()) ||
    (typeof body.fullName === "string" && body.fullName.trim()) ||
    (typeof body.name === "string" && body.name.trim()) ||
    "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const password = typeof body.password === "string" ? body.password : undefined;
  const passwordConfirmation =
    typeof body.passwordConfirmation === "string"
      ? body.passwordConfirmation
      : typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : password;
  const pin = typeof body.pin === "string" ? body.pin : undefined;
  const pinConfirmation =
    typeof body.pinConfirmation === "string" ? body.pinConfirmation : pin;
  const loginMethod =
    typeof body.loginMethod === "string" && body.loginMethod.trim()
      ? body.loginMethod.trim()
      : pin
        ? "pin"
        : "password";
  const agree =
    body.agree !== undefined
      ? Boolean(body.agree)
      : body.agreeTerms !== undefined
        ? Boolean(body.agreeTerms)
        : true;

  if (!username) {
    return NextResponse.json(
      { success: false, message: "Full name or username is required." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  if (!email) {
    return NextResponse.json(
      { success: false, message: "Email is required." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
  if (loginMethod === "password") {
    if (!password) {
      return NextResponse.json(
        { success: false, message: "Password is required." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
    if (password !== passwordConfirmation) {
      return NextResponse.json(
        { success: false, message: "Passwords do not match." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
  }
  if (loginMethod === "pin") {
    if (!pin) {
      return NextResponse.json(
        { success: false, message: "PIN is required." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
    if (pin !== pinConfirmation) {
      return NextResponse.json(
        { success: false, message: "PINs do not match." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
  }

  // Prevent client-side privilege escalation: public registration is always Learner.
  const payload: LexmaCastoRegisterPayload = {
    username,
    email,
    loginMethod,
    agree,
    role: "Learner",
    ...(phone ? { phone } : {}),
    ...(password !== undefined ? { password, passwordConfirmation } : {}),
    ...(pin !== undefined ? { pin, pinConfirmation } : {}),
    ...(typeof body.dashboardName === "string" && body.dashboardName
      ? { dashboardName: body.dashboardName }
      : {}),
    ...(typeof body.provider === "string" && body.provider ? { provider: body.provider } : {}),
    ...(body.providerPayload && typeof body.providerPayload === "object"
      ? { providerPayload: body.providerPayload as Record<string, unknown> }
      : {}),
    ...(typeof body.challenge === "string" && body.challenge ? { challenge: body.challenge } : {}),
  };

  const siteMeta = extractSiteMetadataFromRequestHeaders(
    request.headers,
    "/api/castoline/auth/register"
  );

  const result = await lexmaCastoRequest<Record<string, unknown>>(
    LEXMACASTO_AUTH_ENDPOINTS.REGISTER,
    {
      method: "POST",
      body: payload,
      siteMeta,
    }
  );

  if (!result.ok) {
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

  return NextResponse.json(
    {
      success: true,
      message: result.message || "Registration completed.",
      data: "Registration completed.",
    },
    { status: result.status, headers: NO_STORE_HEADERS }
  );
}
