import { NextResponse } from "next/server";
import { authService } from "@/lib/api-services";
import type { BackendUserSummary } from "@/lib/api-services";
import { resolveBrowserPictureUrl } from "@/lib/profile-picture";
import { resolveSession } from "@/lib/session";

/**
 * Maps a backend user summary to the browser-facing authenticated user object.
 * The profile picture is derived from authoritative backend metadata rather
 * than trusted client state, so the avatar persists across login, logout and
 * session restoration.
 */
function mapSessionUser(
  bUser: BackendUserSummary | null | undefined,
  session: NonNullable<Awaited<ReturnType<typeof resolveSession>>>
) {
  return {
    id: bUser?.id || session.userId,
    email: bUser?.email || session.email,
    name: bUser?.displayName || bUser?.name || session.displayName,
    displayName: bUser?.displayName || bUser?.name || session.displayName,
    role: bUser?.role || session.role,
    pathway: bUser?.pathway || session.pathway,
    picture: resolveBrowserPictureUrl({
      hasProfileImage: bUser?.hasProfileImage ?? Boolean(session.picture),
      profileImageUpdatedAt: bUser?.profileImageUpdatedAt,
      picture: bUser?.picture || session.picture,
    }),
    provider: session.provider || "credentials",
    activePlan: bUser?.activePlan || session.activePlan,
    targetExamDate: bUser?.targetExamDate || session.targetExamDate,
  };
}

export async function GET(request?: Request) {
  try {
    const session = await resolveSession(request);

    if (!session || !session.email) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Query backend for authoritative state
    const apiRes = await authService.getSession(session);

    if (apiRes.success && apiRes.data?.authenticated && apiRes.data.user) {
      return NextResponse.json({
        authenticated: true,
        user: mapSessionUser(apiRes.data.user, session),
      });
    }

    if (apiRes.status === 401) {
      // Backend rejected session as revoked or invalid
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Resilient fallback to verified signed session claims if backend is temporarily unreachable
    const user = mapSessionUser(null, session);

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
