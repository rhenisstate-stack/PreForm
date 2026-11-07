import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { resolveSession } from "@/lib/session";

const ALLOWED_PATH_PATTERN = /^[A-Za-z0-9_-]+$/;

type RouteContext = { params: Promise<{ path?: string[] }> };

function buildBackendPath(segments: string[], searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return `/api/v1/admin/study-guides${segments.length > 0 ? `/${segments.join("/")}` : ""}${query ? `?${query}` : ""}`;
}

async function proxy(request: NextRequest, ctx: RouteContext) {
  try {
    const session = await resolveSession(request);
    if (!session || !session.email) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const role = (session.role || "").toLowerCase();
    if (!["admin", "superadmin", "administrator"].includes(role)) {
      return NextResponse.json({ success: false, error: "Administrative authorization required." }, { status: 403 });
    }

    const { path: segments = [] } = await ctx.params;
    if (segments.some((s) => !ALLOWED_PATH_PATTERN.test(s))) {
      return NextResponse.json({ success: false, error: "Invalid admin endpoint." }, { status: 400 });
    }

    const backendPath = buildBackendPath(segments, request.nextUrl.searchParams);
    const method = request.method.toUpperCase();

    let payload: unknown = undefined;
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      try {
        payload = await request.json();
      } catch {
        return NextResponse.json({ success: false, error: "Request body must be valid JSON." }, { status: 400 });
      }
    }

    let res: { status: number; data?: unknown };
    switch (method) {
      case "GET":
      case "HEAD":
        res = await apiClient.get<unknown>(backendPath, { session });
        break;
      case "POST":
        res = await apiClient.post<unknown>(backendPath, payload, { session });
        break;
      case "PUT":
        res = await apiClient.put<unknown>(backendPath, payload, { session });
        break;
      case "DELETE":
        res = await apiClient.delete<unknown>(backendPath, { session });
        break;
      default:
        return NextResponse.json({ success: false, error: `Method ${method} is not supported.` }, { status: 405 });
    }

    return NextResponse.json(res.data ?? { success: false }, { status: res.status });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[Admin Study Guides BFF] Error:", err);
    return NextResponse.json({ success: false, error: "Service unavailable." }, { status: 503 });
  }
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  return proxy(request, ctx);
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  return proxy(request, ctx);
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  return proxy(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  return proxy(request, ctx);
}
