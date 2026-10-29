import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getUserProfileMeta,
  upsertUserProfileMeta,
} from "@/lib/profile-image-db";
import { resolveSession, signSessionPayload } from "@/lib/session";

export async function GET(request?: Request) {
  try {
    const session = await resolveSession(request);

    if (!session || !session.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const dbMeta = getUserProfileMeta(session.userId, session.email);

    const resolvedName =
      dbMeta?.displayName ||
      session.displayName ||
      session.name ||
      "Nursing Candidate";

    const profile = {
      id: dbMeta?.userId || session.userId,
      email: session.email,
      name: resolvedName,
      displayName: resolvedName,
      role: session.role || "candidate",
      pathway: dbMeta?.pathway || session.pathway || "rn",
      targetExamDate: dbMeta?.targetExamDate || session.targetExamDate || "2026-11-30",
      activePlan:
        dbMeta?.activePlan ||
        session.activePlan ||
        "NCLEX-RN Complete Preparation Plan",
      provider: session.provider || "credentials",
      emailNotifications:
        dbMeta !== null
          ? dbMeta.emailNotifications
          : session.emailNotifications !== undefined
            ? session.emailNotifications
            : true,
      studyReminders:
        dbMeta !== null
          ? dbMeta.studyReminders
          : session.studyReminders !== undefined
            ? session.studyReminders
            : true,
      hasProfileImage: Boolean(dbMeta?.hasProfileImage || session.picture),
      picture: dbMeta?.pictureUrl || session.picture,
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
    const session = await resolveSession(request);

    if (!session || !session.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
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

    const currentDbMeta = getUserProfileMeta(session.userId, session.email);
    const authoritativePathway: "rn" | "pn" | "both" =
      currentDbMeta?.pathway || session.pathway || "rn";
    const authoritativePlan: string =
      currentDbMeta?.activePlan ||
      session.activePlan ||
      "NCLEX-RN Complete Preparation Plan";
    const authoritativeRole = session.role || "candidate";

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
      userId: session.userId,
      email: session.email,
      displayName:
        typeof displayName === "string" && displayName.trim().length > 0
          ? displayName.trim()
          : (currentDbMeta?.displayName || session.displayName || session.name || "Nursing Candidate"),
      pathway: authoritativePathway,
      targetExamDate:
        typeof targetExamDate === "string" && targetExamDate.trim().length > 0
          ? targetExamDate.trim()
          : (currentDbMeta?.targetExamDate || session.targetExamDate || "2026-11-30"),
      activePlan: authoritativePlan,
      emailNotifications:
        typeof emailNotifications === "boolean"
          ? emailNotifications
          : (currentDbMeta?.emailNotifications ?? session.emailNotifications ?? true),
      studyReminders:
        typeof studyReminders === "boolean"
          ? studyReminders
          : (currentDbMeta?.studyReminders ?? session.studyReminders ?? true),
    });

    const updatedToken = signSessionPayload({
      sid: session.sessionId,
      sub: savedRecord.userId,
      email: session.email,
      displayName: savedRecord.displayName,
      name: savedRecord.displayName,
      role: authoritativeRole,
      pathway: authoritativePathway,
      targetExamDate: savedRecord.targetExamDate,
      activePlan: authoritativePlan,
      emailNotifications: savedRecord.emailNotifications,
      studyReminders: savedRecord.studyReminders,
      picture: savedRecord.pictureUrl || session.picture,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
      updatedAt: new Date().toISOString(),
    });

    const cookieStore = await cookies();
    cookieStore.set("preform_session", updatedToken, {
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
        email: session.email,
        name: savedRecord.displayName,
        displayName: savedRecord.displayName,
        role: authoritativeRole,
        pathway: authoritativePathway,
        targetExamDate: savedRecord.targetExamDate,
        activePlan: authoritativePlan,
        provider: session.provider || "credentials",
        emailNotifications: savedRecord.emailNotifications,
        studyReminders: savedRecord.studyReminders,
        hasProfileImage: savedRecord.hasProfileImage,
        picture: savedRecord.pictureUrl || session.picture,
      },
    });
  } catch (err) {
    console.error("Profile PUT error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
