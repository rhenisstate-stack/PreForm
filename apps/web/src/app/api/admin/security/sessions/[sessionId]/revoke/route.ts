import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/admin/authz";
import { adminSecurityService } from "@/lib/api-services";

export async function POST(
  request: Request,
  props: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await resolveSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isSuperAdmin(session.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Super Administrator authorization required." },
        { status: 403 }
      );
    }

    const { sessionId } = await props.params;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Session ID is required." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" && body.reason.trim().length >= 3
      ? body.reason.trim()
      : "Administrative revocation by Super Administrator";

    const apiRes = await adminSecurityService.revokeSession(sessionId, reason, session);
    if (!apiRes.success || !apiRes.data) {
      return NextResponse.json(
        { success: false, error: apiRes.error || "Failed to revoke session." },
        { status: apiRes.status || 500 }
      );
    }

    return NextResponse.json(apiRes.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
