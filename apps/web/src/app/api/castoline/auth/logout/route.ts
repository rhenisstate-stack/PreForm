import { NextRequest, NextResponse } from "next/server";
import {
  LEXMACASTO_AUTH_ENDPOINTS,
  type LexmaCastoLogoutPayload,
} from "@/lib/lexmacasto/contracts";
import { extractSiteMetadataFromRequestHeaders, lexmaCastoRequest } from "@/lib/lexmacasto/client";
import {
  clearServerCastoSession,
  getServerCastoDashboardHint,
  getServerCastoSession,
  validateSameOriginRequest,
} from "@/lib/lexmacasto/session";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  const csrf = validateSameOriginRequest(request);
  if (!csrf.ok) {
    return NextResponse.json(
      { success: false, message: csrf.reason },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text) as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON request body." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const scope = body.scope === "relative" ? "relative" : "distinct";
  const endpoint =
    scope === "relative"
      ? LEXMACASTO_AUTH_ENDPOINTS.LOGOUT_RELATIVE
      : LEXMACASTO_AUTH_ENDPOINTS.LOGOUT_DISTINCT;

  const session = await getServerCastoSession(request);
  const dashboardHint = await getServerCastoDashboardHint(request);
  const targetDashboard =
    (typeof body.target_dashboard === "string" && body.target_dashboard.trim()) ||
    dashboardHint ||
    "learner";

  if (!session) {
    const response = NextResponse.json(
      {
        success: true,
        message: "Signed out locally.",
        data: "Signed out locally.",
      },
      { headers: NO_STORE_HEADERS }
    );
    clearServerCastoSession(response);
    return response;
  }

  const siteMeta = extractSiteMetadataFromRequestHeaders(
    request.headers,
    "/api/castoline/auth/logout"
  );
  const payload: LexmaCastoLogoutPayload = {
    target_dashboard: targetDashboard,
  };

  const result = await lexmaCastoRequest(endpoint, {
    method: "POST",
    body: payload,
    session,
    siteMeta,
  });

  if (!result.ok) {
    const response = NextResponse.json(
      {
        success: false,
        message: result.message || "Backend session revocation failed.",
        errorCode: result.errorCode,
      },
      { status: result.status >= 400 ? result.status : 502, headers: NO_STORE_HEADERS }
    );
    clearServerCastoSession(response);
    return response;
  }

  const response = NextResponse.json(
    {
      success: true,
      message: result.message || "Signed out.",
      data: "Signed out.",
    },
    { headers: NO_STORE_HEADERS }
  );
  clearServerCastoSession(response);
  return response;
}
