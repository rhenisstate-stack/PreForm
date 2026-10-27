import { cookies } from "next/headers";
import { NextResponse } from "next/server";

interface CandidateSession {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  displayName?: string;
  role?: string;
  pathway?: "rn" | "pn";
  picture?: string;
  provider?: string;
  targetExamDate?: string;
  activePlan?: string;
  emailNotifications?: boolean;
  studyReminders?: boolean;
  updatedAt?: string;
  [key: string]: unknown;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("preform_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let sessionData: CandidateSession = {};

    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
    }

    if (!sessionData.email) {
      return NextResponse.json({ success: false, error: "Session missing email" }, { status: 401 });
    }

    const profile = {
      id: sessionData.sub || sessionData.id || "candidate-1",
      email: sessionData.email,
      name: sessionData.name || sessionData.displayName || "Nursing Candidate",
      displayName: sessionData.displayName || sessionData.name || "Nursing Candidate",
      role: sessionData.role || "candidate",
      pathway: sessionData.pathway || "rn",
      targetExamDate: sessionData.targetExamDate || "2026-11-30",
      activePlan: sessionData.activePlan || "NCLEX-RN Complete Preparation Plan",
      provider: sessionData.provider || "credentials",
      emailNotifications: sessionData.emailNotifications !== undefined ? sessionData.emailNotifications : true,
      studyReminders: sessionData.studyReminders !== undefined ? sessionData.studyReminders : true,
    };

    return NextResponse.json({ success: true, profile });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("Profile GET error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("preform_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let sessionData: CandidateSession = {};
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, pathway, targetExamDate, emailNotifications, studyReminders } = body;

    const updatedSession: CandidateSession = {
      ...sessionData,
      displayName: displayName || sessionData.displayName,
      name: displayName || sessionData.name,
      pathway: pathway || sessionData.pathway || "rn",
      targetExamDate: targetExamDate || sessionData.targetExamDate,
      emailNotifications: emailNotifications !== undefined ? emailNotifications : sessionData.emailNotifications,
      studyReminders: studyReminders !== undefined ? studyReminders : sessionData.studyReminders,
      updatedAt: new Date().toISOString(),
    };

    cookieStore.set("preform_session", JSON.stringify(updatedSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: updatedSession.sub || updatedSession.id || "candidate-1",
        email: updatedSession.email,
        name: updatedSession.name,
        displayName: updatedSession.displayName,
        role: updatedSession.role || "candidate",
        pathway: updatedSession.pathway || "rn",
        targetExamDate: updatedSession.targetExamDate,
        activePlan: updatedSession.activePlan || "NCLEX-RN Complete Preparation Plan",
        provider: updatedSession.provider || "credentials",
        emailNotifications: updatedSession.emailNotifications,
        studyReminders: updatedSession.studyReminders,
      },
    });
  } catch (err) {
    console.error("Profile PUT error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
