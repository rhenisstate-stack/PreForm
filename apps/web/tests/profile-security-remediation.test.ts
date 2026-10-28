import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, PUT } from "@/app/api/profile/route";
import { resetProfileDatabaseForTesting, upsertUserProfileMeta } from "@/lib/profile-image-db";

let mockCookieValue: string | undefined = undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === "preform_session" && mockCookieValue) {
        return { name: "preform_session", value: mockCookieValue };
      }
      return undefined;
    },
    set: vi.fn((name: string, val: string) => {
      if (name === "preform_session") {
        mockCookieValue = val;
      }
    }),
  }),
}));

describe("Phase 1 — Profile Security & Paid-Access Authorization Remediation", () => {
  const candidateEmail = "jane.learner@nursing.edu";
  const candidateUserId = "prf_usr_jane_learner_123";

  beforeEach(() => {
    resetProfileDatabaseForTesting();
    mockCookieValue = undefined;
    vi.clearAllMocks();

    // Seed clean initial free candidate profile
    upsertUserProfileMeta({
      userId: candidateUserId,
      email: candidateEmail,
      displayName: "Jane Learner",
      pathway: "rn",
      targetExamDate: "2026-12-15",
      activePlan: "NCLEX-RN Complete Preparation Plan",
      emailNotifications: true,
      studyReminders: true,
    });
  });

  it("1. rejects unauthenticated profile updates with 401 Unauthorized", async () => {
    mockCookieValue = undefined;

    const req = new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Hacker Name" }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe("Unauthorized");
  });

  it("2. permits authenticated candidate to update permitted profile fields (displayName, targetExamDate, notifications)", async () => {
    mockCookieValue = JSON.stringify({
      sub: candidateUserId,
      email: candidateEmail,
      name: "Jane Learner",
      role: "candidate",
      pathway: "rn",
    });

    const req = new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Nurse Jane L., BSN",
        targetExamDate: "2027-01-20",
        emailNotifications: false,
        studyReminders: false,
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.profile.displayName).toBe("Nurse Jane L., BSN");
    expect(data.profile.targetExamDate).toBe("2027-01-20");
    expect(data.profile.emailNotifications).toBe(false);
    expect(data.profile.studyReminders).toBe(false);
    expect(data.profile.pathway).toBe("rn"); // pathway unchanged
  });

  it("3. rejects attempts by normal candidate to grant themselves a paid plan (403 Forbidden)", async () => {
    mockCookieValue = JSON.stringify({
      sub: candidateUserId,
      email: candidateEmail,
      name: "Jane Learner",
      role: "candidate",
      pathway: "rn",
      activePlan: "NCLEX-RN Complete Preparation Plan",
    });

    const req = new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activePlan: "NCLEX-RN & PN All-Access Lifetime Comprehensive Access",
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Active subscription plan cannot be self-assigned");
  });

  it("4. rejects attempts by normal candidate to elevate pathway or grant dual-pathway access (403 Forbidden)", async () => {
    mockCookieValue = JSON.stringify({
      sub: candidateUserId,
      email: candidateEmail,
      name: "Jane Learner",
      role: "candidate",
      pathway: "rn",
    });

    const req = new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pathway: "both",
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Examination pathway and entitlements cannot be modified");
  });

  it("5. rejects attempts to escalate privileges to admin or superadmin (403 Forbidden)", async () => {
    mockCookieValue = JSON.stringify({
      sub: candidateUserId,
      email: candidateEmail,
      name: "Jane Learner",
      role: "candidate",
      pathway: "rn",
    });

    const req = new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "admin",
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Role cannot be modified");
  });

  it("6. rejects attempts to inject protected billing fields (subscriptionStatus, planId, isSubscribed) (403 Forbidden)", async () => {
    mockCookieValue = JSON.stringify({
      sub: candidateUserId,
      email: candidateEmail,
      name: "Jane Learner",
      role: "candidate",
      pathway: "rn",
    });

    const req = new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriptionStatus: "active",
        isSubscribed: true,
        planId: "prep-premium",
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("is protected and cannot be modified");
  });

  it("7. validates input types and rejects invalid dates or empty names with 400 Bad Request", async () => {
    mockCookieValue = JSON.stringify({
      sub: candidateUserId,
      email: candidateEmail,
      name: "Jane Learner",
      role: "candidate",
      pathway: "rn",
    });

    // Invalid date format
    const badDateReq = new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetExamDate: "invalid-date-string",
      }),
    });
    const badDateRes = await PUT(badDateReq);
    expect(badDateRes.status).toBe(400);

    // Empty display name
    const badNameReq = new Request("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "   ",
      }),
    });
    const badNameRes = await PUT(badNameReq);
    expect(badNameRes.status).toBe(400);
  });

  it("8. verifies GET /api/profile returns authoritative database profile information", async () => {
    mockCookieValue = JSON.stringify({
      sub: candidateUserId,
      email: candidateEmail,
      name: "Jane Learner",
      role: "candidate",
      pathway: "rn",
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.profile.email).toBe(candidateEmail);
    expect(data.profile.pathway).toBe("rn");
    expect(data.profile.role).toBe("candidate");
  });
});
