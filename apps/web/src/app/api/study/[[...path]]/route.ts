import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";
import { resolveSession } from "@/lib/session";

/**
 * BFF proxy for the PrepFord AI Study Studio backend module
 * (`api/v1/study/*` on the ASP.NET Core API).
 *
 * The browser only talks to same-origin `/api/study/...`; this handler
 * enforces session authentication, restricts forwarded paths to the
 * documented study segment vocabulary (preventing route smuggling), and
 * re-signs requests with the gateway HMAC for the verified learner identity.
 *
 * Learner ownership is additionally enforced inside the backend flashcard
 * service — this proxy never widens authorization.
 */

const ALLOWED_PATH_PATTERN = /^[A-Za-z0-9_-]+$/;

// Next.js generated route types treat the optional catch-all as potentially
// undefined (`{ path?: string[] }`), so the RouteContext must accept that.
type RouteContext = { params: Promise<{ path?: string[] }> };

function buildBackendPath(segments: string[], searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return `/api/v1/study/${segments.join("/")}${query ? `?${query}` : ""}`;
}

async function proxy(request: NextRequest, ctx: RouteContext) {
  try {
    const session = await resolveSession(request);
    if (!session || !session.email) {
      return NextResponse.json(
        { success: false, error: "Authentication required for study studio access." },
        { status: 401 }
      );
    }

    const { path: segments = [] } = await ctx.params;
    if (segments.length === 0 || segments.some((s) => !ALLOWED_PATH_PATTERN.test(s))) {
      // Reject rather than silently filter so a crafted URL can never be
      // meaningfully rewritten into a different backend route.
      return NextResponse.json({ success: false, error: "Invalid study endpoint." }, { status: 400 });
    }

    const backendPath = buildBackendPath(segments, request.nextUrl.searchParams);
    const method = request.method.toUpperCase();

    let payload: unknown = undefined;
    if (method === "POST") {
      try {
        payload = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: "Request body must be valid JSON." },
          { status: 400 }
        );
      }
    }

    // Route strictly by HTTP method — segment counts are incidental and must
    // not influence forwarding (e.g. GET /flashcards/due is two segments).
    let res: { status: number; data?: unknown };
    switch (method) {
      case "GET":
      case "HEAD":
        res = await apiClient.get<unknown>(backendPath, { session });
        break;
      case "POST":
        res = await apiClient.post<unknown>(backendPath, payload, { session });
        break;
      case "DELETE":
        res = await apiClient.delete<unknown>(backendPath, { session });
        break;
      default:
        return NextResponse.json(
          { success: false, error: `Method ${method} is not supported by the study studio.` },
          { status: 405 }
        );
    }

    return NextResponse.json(res.data ?? { success: false }, { status: res.status });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("[Study BFF] Error:", err);
    return NextResponse.json(
      { success: false, error: "Study studio is temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  return proxy(request, ctx);
}

export async function HEAD(request: NextRequest, ctx: RouteContext) {
  return proxy(request, ctx);
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  return proxy(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  return proxy(request, ctx);
}
