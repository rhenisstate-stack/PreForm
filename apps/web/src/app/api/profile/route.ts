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

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Request body must be an object" }, { status: 400 });
    }

    const userId =
      sessionData.sub || sessionData.id || deriveCandidateIdFromEmail(sessionData.email);
    const currentDbMeta = getUserProfileMeta(userId, sessionData.email);
    const authoritativePathway: "rn" | "pn" | "both" =
      currentDbMeta?.pathway || sessionData.pathway || "rn";
    const authoritativePlan: string =
      currentDbMeta?.activePlan ||
      sessionData.activePlan ||
      "NCLEX-RN Complete Preparation Plan";
    const authoritativeRole = sessionData.role || "candidate";

    // ── Security Boundary: Enforce Allowlist & Prevent Entitlement Elevation ──
    // Reject any attempt to elevate privileges or self-grant subscriptions/roles.
    if (body.role !== undefined && body.role !== authoritativeRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Role cannot be modified via profile update." },
        { status: 403 }
      );
    }

    if (body.pathway !== undefined && body.pathway !== authoritativePathway) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Examination pathway and entitlements cannot be modified via profile update. Paid plans must be acquired through verified checkout.",
        },
        { status: 403 }
      );
    }

    if (body.activePlan !== undefined && body.activePlan !== authoritativePlan) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Active subscription plan cannot be self-assigned via profile update.",
        },
        { status: 403 }
      );
    }

    // Protected entitlement / billing fields that must never be injected
    const protectedFields = [
      "planId",
      "entitlements",
      "subscriptionStatus",
      "isSubscribed",
      "paymentStatus",
      "accessExpiresAt",
      "expiresAt",
      "startsAt",
      "transactionId",
      "stripeCustomerId",
      "stripeSubscriptionId",
    ];

    for (const field of protectedFields) {
      if (body[field] !== undefined) {
        return NextResponse.json(
          {
            success: false,
            error: `Unauthorized: Field '${field}' is protected and cannot be modified via profile update.`,
          },
          { status: 403 }
        );
      }
    }

    // ── Field Validation for Permitted Fields ──
    const { displayName, targetExamDate, emailNotifications, studyReminders } = body;

    if (displayName !== undefined) {
      if (typeof displayName !== "string" || displayName.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "Display name cannot be empty." },
          { status: 400 }
        );
      }
      if (displayName.trim().length > 100) {
        return NextResponse.json(
          { success: false, error: "Display name cannot exceed 100 characters." },
          { status: 400 }
        );
      }
    }

    if (targetExamDate !== undefined) {
      if (typeof targetExamDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(targetExamDate.trim())) {
        return NextResponse.json(
          { success: false, error: "Target exam date must be in YYYY-MM-DD format." },
          { status: 400 }
        );
      }
    }

    if (emailNotifications !== undefined && typeof emailNotifications !== "boolean") {
      return NextResponse.json(
        { success: false, error: "emailNotifications must be a boolean." },
        { status: 400 }
      );
    }

    if (studyReminders !== undefined && typeof studyReminders !== "boolean") {
      return NextResponse.json(
        { success: false, error: "studyReminders must be a boolean." },
        { status: 400 }
      );
    }

    // ── Safe Persisted Write (Always Retaining Authoritative Entitlements) ──
    const savedRecord = upsertUserProfileMeta({
      userId,
      email: sessionData.email,
      displayName:
        typeof displayName === "string" && displayName.trim().length > 0
          ? displayName.trim()
          : (currentDbMeta?.displayName || sessionData.displayName || sessionData.name || "Nursing Candidate"),
      pathway: authoritativePathway,
      targetExamDate:
        typeof targetExamDate === "string" && targetExamDate.trim().length > 0
          ? targetExamDate.trim()
          : (currentDbMeta?.targetExamDate || sessionData.targetExamDate || "2026-11-30"),
      activePlan: authoritativePlan,
      emailNotifications:
        typeof emailNotifications === "boolean"
          ? emailNotifications
          : (currentDbMeta?.emailNotifications ?? sessionData.emailNotifications ?? true),
      studyReminders:
        typeof studyReminders === "boolean"
          ? studyReminders
          : (currentDbMeta?.studyReminders ?? sessionData.studyReminders ?? true),
    });

    const updatedSession: CandidateSession = {
      ...sessionData,
      sub: savedRecord.userId,
      displayName: savedRecord.displayName,
      name: savedRecord.displayName,
      role: authoritativeRole,
      pathway: authoritativePathway,
      targetExamDate: savedRecord.targetExamDate,
      activePlan: authoritativePlan,
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
        role: authoritativeRole,
        pathway: authoritativePathway,
        targetExamDate: savedRecord.targetExamDate,
        activePlan: authoritativePlan,
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
