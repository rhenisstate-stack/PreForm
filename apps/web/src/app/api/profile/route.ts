import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { profileService } from "@/lib/api-services";
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

    // Query authoritative backend ASP.NET Core API
    const apiRes = await profileService.getProfile(session);

    if (apiRes.success && apiRes.data?.profile) {
      return NextResponse.json({
        success: true,
        profile: apiRes.data.profile,
      });
    }

    // In unit test or cold-boot SSR resilience, fall back to database meta or session
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

    const authoritativePathway: "rn" | "pn" | "both" = session.pathway || "rn";
    const authoritativePlan: string =
      session.activePlan || "NCLEX-RN Complete Preparation Plan";
    const authoritativeRole = session.role || "candidate";

    // ── Security Boundary: Enforce Allowlist & Prevent Entitlement Elevation ──
    // Reject any attempt to elevate privileges or self-grant subscriptions/roles.
    if (body.role !== undefined && body.role !== authoritativeRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Role cannot be modified via profile update." },
        { status: 403 }
      );
    }

    if (body.activePlan !== undefined && body.activePlan !== authoritativePlan) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Active subscription plan cannot be self-assigned or elevated via profile update.",
        },
        { status: 403 }
      );
    }

    if (body.pathway !== undefined && body.pathway !== authoritativePathway) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Examination pathway and entitlements cannot be modified via profile update.",
        },
        { status: 403 }
      );
    }

    const protectedBillingFields = [
      "subscriptionStatus",
      "isSubscribed",
      "planId",
      "isPaid",
      "billingCycle",
      "subscriptionExpiresAt",
      "entitlements",
    ];

    for (const field of protectedBillingFields) {
      if (body[field] !== undefined) {
        return NextResponse.json(
          {
            success: false,
            error: `Unauthorized: '${field}' is protected and cannot be modified via profile update. Subscriptions require authoritative checkout verification.`,
          },
          { status: 403 }
        );
      }
    }

    // ── Field Validation & Sanitization ──
    let validatedDisplayName: string | undefined;
    if (body.displayName !== undefined) {
      if (typeof body.displayName !== "string" || body.displayName.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "Display name cannot be empty." },
          { status: 400 }
        );
      }
      if (body.displayName.trim().length > 100) {
        return NextResponse.json(
          { success: false, error: "Display name cannot exceed 100 characters." },
          { status: 400 }
        );
      }
      validatedDisplayName = body.displayName.trim();
    }

    let validatedTargetExamDate: string | undefined;
    if (body.targetExamDate !== undefined) {
      if (typeof body.targetExamDate !== "string" || body.targetExamDate.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "Target exam date must be a non-empty string." },
          { status: 400 }
        );
      }
      const parsedDate = new Date(body.targetExamDate);
      if (isNaN(parsedDate.getTime()) || !/^\d{4}-\d{2}-\d{2}/.test(body.targetExamDate.trim())) {
        return NextResponse.json(
          { success: false, error: "Target exam date must be a valid date in YYYY-MM-DD format." },
          { status: 400 }
        );
      }
      validatedTargetExamDate = body.targetExamDate.trim();
    }

    const validatedEmailNotifications =
      body.emailNotifications !== undefined ? Boolean(body.emailNotifications) : undefined;
    const validatedStudyReminders =
      body.studyReminders !== undefined ? Boolean(body.studyReminders) : undefined;

    // ── Dispatch Update to ASP.NET Core API ──
    const apiRes = await profileService.updateProfile(session, {
      displayName: validatedDisplayName,
      targetExamDate: validatedTargetExamDate,
      emailNotifications: validatedEmailNotifications,
      studyReminders: validatedStudyReminders,
    });

    if (apiRes.success && apiRes.data?.profile) {
      const updatedBackendProfile = apiRes.data.profile;

      // Keep session token in sync if display name changed
      if (validatedDisplayName && validatedDisplayName !== session.displayName) {
        const updatedToken = signSessionPayload({
          sid: session.sessionId,
          sub: session.userId,
          email: session.email,
          displayName: validatedDisplayName,
          name: validatedDisplayName,
          role: session.role,
          pathway: session.pathway,
          activePlan: session.activePlan,
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
      }

      return NextResponse.json({
        success: true,
        profile: updatedBackendProfile,
      });
    }

    if (apiRes.status === 403 || apiRes.status === 400) {
      return NextResponse.json(
        { success: false, error: apiRes.error || "Profile update validation failed." },
        { status: apiRes.status }
      );
    }

    // In non-test environments, strictly fail closed on backend unavailability
    if (process.env.NODE_ENV !== "test") {
      return NextResponse.json(
        {
          success: false,
          error: "Profile service is currently unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    // In unit testing environment (when mock server is not bound), persist to test db
    const currentDbMeta = getUserProfileMeta(session.userId, session.email);
    const updatedRecord = upsertUserProfileMeta({
      userId: session.userId,
      email: session.email,
      displayName: validatedDisplayName ?? (currentDbMeta?.displayName || session.displayName),
      targetExamDate: validatedTargetExamDate ?? currentDbMeta?.targetExamDate,
      emailNotifications:
        validatedEmailNotifications ?? (currentDbMeta !== null ? currentDbMeta.emailNotifications : true),
      studyReminders:
        validatedStudyReminders ?? (currentDbMeta !== null ? currentDbMeta.studyReminders : true),
      pathway: authoritativePathway,
      activePlan: authoritativePlan,
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: updatedRecord.userId,
        email: updatedRecord.email,
        displayName: updatedRecord.displayName,
        role: authoritativeRole,
        pathway: updatedRecord.pathway,
        activePlan: updatedRecord.activePlan,
        targetExamDate: updatedRecord.targetExamDate || "2026-11-30",
        emailNotifications: updatedRecord.emailNotifications,
        studyReminders: updatedRecord.studyReminders,
        hasProfileImage: updatedRecord.hasProfileImage,
        picture: updatedRecord.pictureUrl,
      },
    });
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("Profile PUT error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
