import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("preform_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    let sessionData: {
      sub?: string;
      id?: string;
      email?: string;
      name?: string;
      displayName?: string;
      role?: string;
      pathway?: "rn" | "pn";
      picture?: string;
      provider?: string;
    } = {};

    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ authenticated: false, user: null });
    }

    if (!sessionData.email) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const user = {
      id: sessionData.sub || sessionData.id || "candidate-1",
      email: sessionData.email,
      name: sessionData.name || sessionData.displayName || "Nursing Candidate",
      displayName: sessionData.displayName || sessionData.name || "Nursing Candidate",
      role: sessionData.role || "candidate",
      pathway: sessionData.pathway || "rn",
      picture: sessionData.picture,
      provider: sessionData.provider || "credentials",
    };

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (err) {
    console.error("[Session API] Error retrieving session:", err);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
