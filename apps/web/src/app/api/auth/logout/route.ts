import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authService } from "@/lib/api-services";
import { resolveSession, revokeSession, clearSessionCookie } from "@/lib/session";

export async function POST(request?: Request) {
  try {
    const session = await resolveSession(request);

    if (session) {
      // Invalidate on backend authority
      await authService.logout(session).catch((err) => {
        console.warn("[Logout API] Backend session invalidation warning:", err);
      });

      if (session.sessionId) {
        revokeSession(session.sessionId);
      }
    }

    const cookieStore = await cookies();
    clearSessionCookie(cookieStore);

    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("[Logout API] Error:", err);
    return NextResponse.json({ success: false, error: "Logout failed" }, { status: 500 });
  }
}
