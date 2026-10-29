import { NextResponse } from "next/server";
import { authService } from "@/lib/api-services";
import { resolveSession } from "@/lib/session";

export async function GET(request?: Request) {
  try {
    const session = await resolveSession(request);

    if (!session || !session.email) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Query backend for authoritative state
    const apiRes = await authService.getSession(session);

    if (apiRes.success && apiRes.data?.authenticated && apiRes.data.user) {
      const bUser = apiRes.data.user;
      return NextResponse.json({
        authenticated: true,
        user: {
          id: bUser.id || session.userId,
          email: bUser.email || session.email,
          name: bUser.displayName || bUser.name || session.displayName,
          displayName: bUser.displayName || bUser.name || session.displayName,
          role: bUser.role || session.role,
          pathway: bUser.pathway || session.pathway,
          picture: bUser.picture || session.picture,
          provider: session.provider || "credentials",
          activePlan: bUser.activePlan || session.activePlan,
          targetExamDate: bUser.targetExamDate || session.targetExamDate,
        },
      });
    }

    if (apiRes.status === 401) {
      // Backend rejected session as revoked or invalid
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Resilient fallback to verified signed session claims if backend is temporarily unreachable
    const user = {
      id: session.userId,
      email: session.email,
      name: session.displayName,
      displayName: session.displayName,
      role: session.role,
      pathway: session.pathway,
      picture: session.picture,
      provider: session.provider || "credentials",
      activePlan: session.activePlan || undefined,
      targetExamDate: session.targetExamDate || undefined,
    };

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("[Session API] Error retrieving session:", err);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
