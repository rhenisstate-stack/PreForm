import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/session";

export async function GET(request?: Request) {
  try {
    const session = await resolveSession(request);

    if (!session || !session.email) {
      return NextResponse.json({ authenticated: false, user: null });
    }

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
