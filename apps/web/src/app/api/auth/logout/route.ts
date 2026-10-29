import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveSession, revokeSession } from "@/lib/session";

export async function POST(request?: Request) {
  try {
    const session = await resolveSession(request);
    if (session && session.sessionId) {
      revokeSession(session.sessionId);
    }

    const cookieStore = await cookies();
    cookieStore.set("preform_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("[Logout API] Error:", err);
    return NextResponse.json({ success: false, error: "Logout failed" }, { status: 500 });
  }
}
