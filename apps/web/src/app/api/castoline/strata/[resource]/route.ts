import { NextRequest, NextResponse } from "next/server";
import {
  buildStrataEndpointPath,
  isStrataResourceKey,
  LEXMACASTO_STRATA_ENDPOINTS,
} from "@/lib/lexmacasto/contracts";
import {
  extractSiteMetadataFromRequestHeaders,
  lexmaCastoRequest,
  normalizeStrataEnvelope,
} from "@/lib/lexmacasto/client";
import { getServerCastoSession } from "@/lib/lexmacasto/session";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const ALLOWED_FILTER_PARAMS = new Set([
  "page",
  "perPage",
  "search",
  "sortColumn",
  "sortDirection",
  "categoryId",
  "subCategoryId",
  "domainId",
  "programId",
  "courseId",
  "subjectId",
  "unitId",
  "lessonId",
  "topicId",
  "conceptId",
  "assessmentId",
  "examId",
  "sectionId",
  "institutionId",
  "schoolId",
  "departmentId",
  "divisionId",
  "cohortId",
  "classId",
]);

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> }
) {
  const { resource } = await context.params;
  if (!isStrataResourceKey(resource)) {
    return NextResponse.json(
      { success: false, message: "Unknown or non-allowlisted strata resource." },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const def = LEXMACASTO_STRATA_ENDPOINTS[resource];
  const session = await getServerCastoSession(request);
  if (def.requiresAuth && !session) {
    return NextResponse.json(
      { success: false, message: "Authentication is required for this resource." },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const query: Record<string, string | number> = {
    page: clampInt(searchParams.get("page"), 1, 1000, 1),
    perPage: clampInt(searchParams.get("perPage"), 1, 100, 20),
  };

  for (const [key, value] of searchParams.entries()) {
    if (key === "fetchtype" || key === "page" || key === "perPage") continue;
    if (ALLOWED_FILTER_PARAMS.has(key) && value.trim()) {
      query[key] = value.trim().slice(0, 128);
    }
  }

  const upstreamPath = buildStrataEndpointPath(resource, query);
  const siteMeta = extractSiteMetadataFromRequestHeaders(
    request.headers,
    `/api/castoline/strata/${resource}`
  );

  const result = await lexmaCastoRequest(upstreamPath, {
    method: "GET",
    session,
    siteMeta,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        message: result.message,
        errorCode: result.errorCode,
      },
      { status: result.status, headers: NO_STORE_HEADERS }
    );
  }

  const normalized = normalizeStrataEnvelope(result.data);
  if (!normalized) {
    return NextResponse.json(
      {
        success: false,
        message: "Unexpected strata response format.",
        errorCode: "UNEXPECTED_RESPONSE",
      },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(normalized, { headers: NO_STORE_HEADERS });
}
