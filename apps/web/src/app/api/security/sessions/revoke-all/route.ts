import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveSession, clearSessionCookie } from "@/lib/session";
import { securityService } from "@/lib/api-services";

export async function POST(request: Request) {
  try {
    const session = await resolveSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const apiRes = await securityService.revokeAllSessions(session);
    if (!apiRes.success || !apiRes.data) {
      return NextResponse.json(
        { success: false, error: apiRes.error || "Failed to terminate all sessions." },
        { status: apiRes.status || 500 }
      );
    }

    // Revoking all sessions terminates the current session as well
    const cookieStore = await cookies();
    clearSessionCookie(cookieStore);

    return NextResponse.json(apiRes.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
