import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  deriveCandidateIdFromEmail,
  getUserProfileMeta,
} from "@/lib/profile-image-db";

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
      pathway?: "rn" | "pn" | "both";
      picture?: string;
      provider?: string;
      activePlan?: string;
      targetExamDate?: string;
    } = {};

    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ authenticated: false, user: null });
    }

    if (!sessionData.email) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const userId =
      sessionData.sub || sessionData.id || deriveCandidateIdFromEmail(sessionData.email);
    const dbMeta = getUserProfileMeta(userId, sessionData.email);
    const resolvedName =
      dbMeta?.displayName ||
      sessionData.displayName ||
      sessionData.name ||
      "Nursing Candidate";

    const user = {
      id: dbMeta?.userId || userId,
      email: sessionData.email,
      name: resolvedName,
      displayName: resolvedName,
      role: sessionData.role || "candidate",
      pathway: dbMeta?.pathway || sessionData.pathway || "rn",
      picture: dbMeta?.pictureUrl || sessionData.picture,
      provider: sessionData.provider || "credentials",
      activePlan: dbMeta?.activePlan || sessionData.activePlan || undefined,
      targetExamDate: dbMeta?.targetExamDate || sessionData.targetExamDate || undefined,
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
