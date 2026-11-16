import { NextRequest, NextResponse } from "next/server";
import {
  buildCurrentUserEndpointPath,
  type LexmaCastoAuthUserRaw,
} from "@/lib/lexmacasto/contracts";
import {
  extractSiteMetadataFromRequestHeaders,
  lexmaCastoRequest,
  sanitizeAuthUser,
} from "@/lib/lexmacasto/client";
import { clearServerCastoSession, getServerCastoSession } from "@/lib/lexmacasto/session";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const session = await getServerCastoSession(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Not authenticated.", errorCode: "UNAUTHORIZED" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const siteMeta = extractSiteMetadataFromRequestHeaders(
    request.headers,
    "/api/castoline/auth/me"
  );
  const result = await lexmaCastoRequest<
    {
      user?: LexmaCastoAuthUserRaw;
      data?: LexmaCastoAuthUserRaw | { user?: LexmaCastoAuthUserRaw };
    } & LexmaCastoAuthUserRaw
  >(buildCurrentUserEndpointPath(), {
    method: "GET",
    session,
    siteMeta,
  });

  if (!result.ok || !result.data) {
    const response = NextResponse.json(
      {
        success: false,
        message: result.message,
        errorCode: result.errorCode,
      },
      { status: result.status, headers: NO_STORE_HEADERS }
    );
    if (result.status === 401 || result.status === 403) {
      clearServerCastoSession(response);
    }
    return response;
  }

  const dataNested =
    result.data.data && typeof result.data.data === "object"
      ? "user" in result.data.data
        ? result.data.data.user
        : (result.data.data as LexmaCastoAuthUserRaw)
      : undefined;
  const rawUser = result.data.user ?? dataNested ?? result.data;
  const sanitizedUser = sanitizeAuthUser(rawUser as LexmaCastoAuthUserRaw);

  if (!sanitizedUser) {
    const response = NextResponse.json(
      {
        success: false,
        message: "Unable to verify authenticated user profile.",
        errorCode: "UNAUTHORIZED",
      },
      { status: 401, headers: NO_STORE_HEADERS }
    );
    clearServerCastoSession(response);
    return response;
  }

  return NextResponse.json(
    {
      success: true,
      message: "OK",
      data: sanitizedUser,
    },
    { headers: NO_STORE_HEADERS }
  );
}
