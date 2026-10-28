import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/checkout/route";
import { resetProfileDatabaseForTesting, getUserProfileMeta } from "@/lib/profile-image-db";

let mockSessionValue: string | undefined = undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === "preform_session" && mockSessionValue) {
        return { name: "preform_session", value: mockSessionValue };
      }
      return undefined;
    },
    set: vi.fn((name: string, val: string) => {
      if (name === "preform_session") {
        mockSessionValue = val;
      }
    }),
  }),
}));

describe("Phase 3 — Checkout Security & Payment Lifecycle Remediation", () => {
  const candidateEmail = "alex.checkout@nursing.edu";
  const candidateUserId = "prf_usr_alex_checkout_456";

  beforeEach(() => {
    resetProfileDatabaseForTesting();
    mockSessionValue = undefined;
    vi.clearAllMocks();
  });

  it("1. rejects unauthenticated checkout initiation with 401 Unauthorized", async () => {
    mockSessionValue = undefined;

    const req = new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: "rn-pro" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Authentication required");
  });

  it("2. rejects checkout with missing or empty planId (400 Bad Request)", async () => {
    mockSessionValue = JSON.stringify({
      sub: candidateUserId,
      email: candidateEmail,
      name: "Alex Candidate",
      role: "candidate",
      pathway: "rn",
    });

    const req = new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("Plan identifier is required");
  });

  it("3. returns 404 when planId does not exist in the database catalogue", async () => {
    mockSessionValue = JSON.stringify({
      sub: candidateUserId,
      email: candidateEmail,
      name: "Alex Candidate",
      role: "candidate",
      pathway: "rn",
    });

    const req = new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: "non-existent-fake-plan-999" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("does not exist in the catalogue");
  });

  it("4. authoritatively resolves single-pathway plan (rn-pro) without client-supplied tampering", async () => {
    mockSessionValue = JSON.stringify({
      sub: candidateUserId,
      email: candidateEmail,
      name: "Alex Candidate",
      role: "candidate",
      pathway: "rn",
    });

    // Client attempts to claim price is $0 and pathway is "both"
    const req = new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: "rn-pro",
        price: 0,
        pathway: "both",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.plan.pathway).toBe("rn"); // Resolved authoritatively from catalog!
    expect(data.plan.name).toContain("NCLEX-RN");
  });

  it("5. authoritatively resolves dual-pathway bundle (prep-premium) granting both pathways", async () => {
    mockSessionValue = JSON.stringify({
      sub: candidateUserId,
      email: candidateEmail,
      name: "Alex Candidate",
      role: "candidate",
      pathway: "rn",
    });

    const req = new Request("http://localhost:3000/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: "prep-premium",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.plan.pathway).toBe("both");

    // Profile record in database reflects authoritative dual access
    const savedMeta = getUserProfileMeta(candidateUserId, candidateEmail);
    expect(savedMeta?.pathway).toBe("both");
    expect(savedMeta?.activePlan).toContain("PrepFord Premium Complete Access");
  });
});
