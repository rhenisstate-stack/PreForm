import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  deriveCandidateIdFromEmail,
  getUserProfileMeta,
  upsertUserProfileMeta,
} from "@/lib/profile-image-db";

interface CandidateSession {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  displayName?: string;
  role?: string;
  pathway?: "rn" | "pn" | "both";
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

    const userId =
      sessionData.sub || sessionData.id || deriveCandidateIdFromEmail(sessionData.email);
    const dbMeta = getUserProfileMeta(userId, sessionData.email);

    const resolvedName =
      dbMeta?.displayName ||
      sessionData.displayName ||
      sessionData.name ||
      "Nursing Candidate";

    const profile = {
      id: dbMeta?.userId || userId,
      email: sessionData.email,
      name: resolvedName,
      displayName: resolvedName,
      role: sessionData.role || "candidate",
      pathway: dbMeta?.pathway || sessionData.pathway || "rn",
      targetExamDate: dbMeta?.targetExamDate || sessionData.targetExamDate || "2026-11-30",
      activePlan:
        dbMeta?.activePlan ||
        sessionData.activePlan ||
        "NCLEX-RN Complete Preparation Plan",
      provider: sessionData.provider || "credentials",
      emailNotifications:
        dbMeta !== null
          ? dbMeta.emailNotifications
          : sessionData.emailNotifications !== undefined
            ? sessionData.emailNotifications
            : true,
      studyReminders:
        dbMeta !== null
          ? dbMeta.studyReminders
          : sessionData.studyReminders !== undefined
            ? sessionData.studyReminders
            : true,
      hasProfileImage: dbMeta?.hasProfileImage ?? Boolean(sessionData.picture),
      picture: dbMeta?.pictureUrl || sessionData.picture,
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

    if (!sessionData.email) {
      return NextResponse.json({ success: false, error: "Session missing email" }, { status: 401 });
    }

    const body = await request.json();
    const {
      displayName,
      pathway,
      targetExamDate,
      activePlan,
      emailNotifications,
      studyReminders,
    } = body;

    const userId =
      sessionData.sub || sessionData.id || deriveCandidateIdFromEmail(sessionData.email);

    const savedRecord = upsertUserProfileMeta({
      userId,
      email: sessionData.email,
      displayName: displayName || sessionData.displayName || sessionData.name || "Nursing Candidate",
      pathway: pathway || sessionData.pathway || "rn",
      targetExamDate: targetExamDate || sessionData.targetExamDate,
      activePlan: activePlan || sessionData.activePlan,
      emailNotifications:
        emailNotifications !== undefined ? emailNotifications : sessionData.emailNotifications,
      studyReminders:
        studyReminders !== undefined ? studyReminders : sessionData.studyReminders,
    });

    const updatedSession: CandidateSession = {
      ...sessionData,
      sub: savedRecord.userId,
      displayName: savedRecord.displayName,
      name: savedRecord.displayName,
      pathway: savedRecord.pathway,
      targetExamDate: savedRecord.targetExamDate,
      activePlan: savedRecord.activePlan,
      emailNotifications: savedRecord.emailNotifications,
      studyReminders: savedRecord.studyReminders,
      picture: savedRecord.pictureUrl || sessionData.picture,
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
        id: savedRecord.userId,
        email: sessionData.email,
        name: savedRecord.displayName,
        displayName: savedRecord.displayName,
        role: updatedSession.role || "candidate",
        pathway: savedRecord.pathway,
        targetExamDate: savedRecord.targetExamDate,
        activePlan: savedRecord.activePlan,
        provider: updatedSession.provider || "credentials",
        emailNotifications: savedRecord.emailNotifications,
        studyReminders: savedRecord.studyReminders,
        hasProfileImage: savedRecord.hasProfileImage,
        picture: savedRecord.pictureUrl || updatedSession.picture,
      },
    });
  } catch (err) {
    console.error("Profile PUT error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
