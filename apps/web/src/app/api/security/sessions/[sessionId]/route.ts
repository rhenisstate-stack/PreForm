import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveSession, clearSessionCookie } from "@/lib/session";
import { securityService } from "@/lib/api-services";

export async function DELETE(
  request: Request,
  props: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await resolveSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await props.params;
    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Session ID is required." }, { status: 400 });
    }

    const apiRes = await securityService.revokeSession(sessionId, session);
    if (!apiRes.success || !apiRes.data) {
      return NextResponse.json(
        { success: false, error: apiRes.error || "Failed to terminate session." },
        { status: apiRes.status || 500 }
      );
    }

    // If learner revoked their current session, clear their session cookie
    const isCurrent = sessionId === session.sessionId;

    if (isCurrent) {
      const cookieStore = await cookies();
      clearSessionCookie(cookieStore);
    }

    return NextResponse.json(apiRes.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
