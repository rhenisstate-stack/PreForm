import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PRODUCTS, getProductById } from "@/lib/products";
import {
  getAllSubscriptionPlans,
  getSubscriptionPlanById,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  archiveSubscriptionPlan,
} from "@/lib/subscription-store";
import { checkContrastRatio, isValidHexColor } from "@/lib/color-contrast";
import { SubscriptionsPageClient } from "@/app/subscriptions/page-client";
import { GET as getPublicSubscriptions } from "@/app/api/subscriptions/route";
import { GET as getAdminSubscriptions, POST as postAdminSubscription } from "@/app/api/admin/subscriptions/route";
import {
  GET as getAdminSubscriptionById,
  PUT as putAdminSubscription,
  DELETE as deleteAdminSubscription,
} from "@/app/api/admin/subscriptions/[id]/route";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/subscriptions",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock hooks
vi.mock("@/hooks/use-api", () => ({
  useProgrammes: () => ({
    data: [
      { code: "RN", displayName: "Registered Nurse (NCLEX-RN)", isActive: true },
      { code: "PN", displayName: "Practical Nurse (NCLEX-PN)", isActive: true },
    ],
  }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "test-admin", role: "admin", email: "admin@prepfordnclex.com" },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

describe("Subscription Catalogue & Entitlement Consistency", () => {
  it("verifies dual-access plans (prep-premium & prep-premium-90) grant both rn and pn entitlements", () => {
    const monthlyPremium = getProductById("prep-premium");
    expect(monthlyPremium).toBeDefined();
    expect(monthlyPremium?.pathway).toBe("Both");
    expect(monthlyPremium?.entitlements).toEqual(expect.arrayContaining(["rn", "pn"]));
    expect(monthlyPremium?.price).toBe(89);

    const quarterlyPremium = getProductById("prep-premium-90");
    expect(quarterlyPremium).toBeDefined();
    expect(quarterlyPremium?.pathway).toBe("Both");
    expect(quarterlyPremium?.entitlements).toEqual(expect.arrayContaining(["rn", "pn"]));
    expect(quarterlyPremium?.price).toBe(229);
  });

  it("verifies single-access RN plans grant only 'rn' entitlement", () => {
    const rnStarter = getProductById("rn-starter");
    expect(rnStarter).toBeDefined();
    expect(rnStarter?.pathway).toBe("RN");
    expect(rnStarter?.entitlements).toEqual(["rn"]);

    const rnPro = getProductById("rn-pro");
    expect(rnPro).toBeDefined();
    expect(rnPro?.pathway).toBe("RN");
    expect(rnPro?.entitlements).toEqual(["rn"]);
    expect(rnPro?.price).toBe(59);

    // Verify feature bullets do not falsely advertise PN access
    const featuresStr = rnPro?.features.join(" ") || "";
    expect(featuresStr).not.toContain("RN & PN");
    expect(featuresStr).not.toContain("both RN and PN");
  });

  it("verifies single-access PN plans grant only 'pn' entitlement", () => {
    const pnStarter = getProductById("pn-starter");
    expect(pnStarter).toBeDefined();
    expect(pnStarter?.pathway).toBe("PN");
    expect(pnStarter?.entitlements).toEqual(["pn"]);

    const pnPro = getProductById("pn-pro");
    expect(pnPro).toBeDefined();
    expect(pnPro?.pathway).toBe("PN");
    expect(pnPro?.entitlements).toEqual(["pn"]);
    expect(pnPro?.price).toBe(59);
  });

  it("confirms subscriptions page does not advertise dual pathway for rn-pro or pn-pro", () => {
    render(<SubscriptionsPageClient />);

    // Pro plan card on subscriptions page must link to rn-pro and specify RN pathway
    const proCard = screen.getByText("NCLEX-RN Complete Preparation").closest(".rounded-3xl");
    expect(proCard).toBeInTheDocument();
    expect(within(proCard as HTMLElement).getByText(/RN pathway/i)).toBeInTheDocument();
    expect(within(proCard as HTMLElement).queryByText(/Full question bank \(RN & PN\)/i)).not.toBeInTheDocument();

    // Premium plan card must specify RN & PN Dual Access
    const premiumCard = screen.getByText("NCLEX-RN & PN All-Access").closest(".rounded-3xl");
    expect(premiumCard).toBeInTheDocument();
    expect(within(premiumCard as HTMLElement).getByText(/RN & PN Dual Access/i)).toBeInTheDocument();
  });
});

describe("Color Contrast & WCAG Safeguards", () => {
  it("correctly identifies valid and invalid hex colors", () => {
    expect(isValidHexColor("#ffffff")).toBe(true);
    expect(isValidHexColor("#0d9488")).toBe(true);
    expect(isValidHexColor("#123")).toBe(true);
    expect(isValidHexColor("invalid")).toBe(false);
    expect(isValidHexColor("#12345")).toBe(false);
  });

  it("calculates contrast ratios and enforces WCAG AA minimum threshold (3.0:1)", () => {
    // Black on White: ~21:1
    const highContrast = checkContrastRatio("#000000", "#ffffff");
    expect(highContrast).toBeGreaterThan(20);

    // Dark teal on White: > 4.5:1
    const goodContrast = checkContrastRatio("#0f766e", "#ffffff");
    expect(goodContrast).toBeGreaterThan(4.5);

    // Light gray on White: < 3.0:1 (Fails)
    const badContrast = checkContrastRatio("#cccccc", "#ffffff");
    expect(badContrast).toBeLessThan(3.0);
  });
});

describe("Admin API Endpoints & RBAC Validation", () => {
  it("rejects unauthorized requests without session cookie with 401", async () => {
    const unauthReq = new Request("http://localhost/api/admin/subscriptions");
    const res = await getAdminSubscriptions(unauthReq);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("rejects non-admin role with 403", async () => {
    const req = new Request("http://localhost/api/admin/subscriptions", {
      headers: {
        cookie: `preform_session=${encodeURIComponent(JSON.stringify({ role: "candidate", email: "learner@prepford.com" }))}`,
      },
    });
    const res = await postAdminSubscription(req);
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
  });

  it("validates required fields, price > 0, and accessible contrast when creating plans", async () => {
    // Missing required fields
    const adminCookie = `preform_session=${encodeURIComponent(JSON.stringify({ role: "admin", email: "admin@prepford.com" }))}`;

    const badPriceReq = new Request("http://localhost/api/admin/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: adminCookie,
      },
      body: JSON.stringify({
        name: "Invalid Plan",
        slug: "invalid-plan",
        description: "Test description",
        pathway: "RN",
        planType: "pro",
        price: -10,
        billingInterval: "month",
        features: ["Feature 1"],
      }),
    });
    const badPriceRes = await postAdminSubscription(badPriceReq);
    expect(badPriceRes.status).toBe(400);
    const badPriceJson = await badPriceRes.json();
    expect(badPriceJson.error).toContain("Price must be a positive number");

    // Inaccessible contrast
    const badContrastReq = new Request("http://localhost/api/admin/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: adminCookie,
      },
      body: JSON.stringify({
        name: "Low Contrast Plan",
        slug: "low-contrast-plan",
        description: "Test description",
        pathway: "RN",
        planType: "pro",
        price: 49,
        billingInterval: "month",
        features: ["Feature 1"],
        bgColour: "#ffffff",
        textColour: "#eeeeee", // Low contrast (< 1.5:1)
      }),
    });
    const badContrastRes = await postAdminSubscription(badContrastReq);
    expect(badContrastRes.status).toBe(400);
    const badContrastJson = await badContrastRes.json();
    expect(badContrastJson.error).toContain("Insufficient color contrast");
  });

  it("creates, updates, and non-destructively archives a plan", async () => {
    const adminCookie = `preform_session=${encodeURIComponent(JSON.stringify({ role: "admin", email: "admin@prepford.com" }))}`;
    const testSlug = `custom-test-plan-${Date.now()}`;

    // 1. Create plan
    const createReq = new Request("http://localhost/api/admin/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: adminCookie,
      },
      body: JSON.stringify({
        name: "Test Admin Plan",
        slug: testSlug,
        description: "A test plan created via admin API",
        pathway: "Both",
        planType: "premium",
        price: 99,
        billingInterval: "month",
        features: ["Feature A", "Feature B"],
        displayOrder: 99,
      }),
    });
    const createRes = await postAdminSubscription(createReq);
    expect(createRes.status).toBe(201);
    const createJson = await createRes.json();
    expect(createJson.success).toBe(true);
    const planId = createJson.plan.id;

    // 2. Public API includes this active plan
    const publicRes = await getPublicSubscriptions();
    const publicJson = await publicRes.json();
    expect(publicJson.plans.some((p: { id: string }) => p.id === planId)).toBe(true);

    // 3. Update plan price and badge
    const updateReq = new Request(`http://localhost/api/admin/subscriptions/${planId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        cookie: adminCookie,
      },
      body: JSON.stringify({
        price: 109,
        badgeText: "Admin Special",
      }),
    });
    const updateRes = await putAdminSubscription(updateReq, { params: Promise.resolve({ id: planId }) });
    expect(updateRes.status).toBe(200);
    const updateJson = await updateRes.json();
    expect(updateJson.plan.price).toBe(109);
    expect(updateJson.plan.badgeText).toBe("Admin Special");

    // 4. Archive plan (non-destructive soft delete: is_active = 0)
    const deleteReq = new Request(`http://localhost/api/admin/subscriptions/${planId}`, {
      method: "DELETE",
      headers: {
        cookie: adminCookie,
      },
    });
    const deleteRes = await deleteAdminSubscription(deleteReq, { params: Promise.resolve({ id: planId }) });
    expect(deleteRes.status).toBe(200);

    // 5. Verify plan is excluded from public API responses
    const publicAfterDeleteRes = await getPublicSubscriptions();
    const publicAfterDeleteJson = await publicAfterDeleteRes.json();
    expect(publicAfterDeleteJson.plans.some((p: { id: string }) => p.id === planId)).toBe(false);

    // 6. Verify plan is still retrievable in Admin query with isActive: false (preserving past candidate subscriptions)
    const adminGetReq = new Request("http://localhost/api/admin/subscriptions", {
      headers: {
        cookie: adminCookie,
      },
    });
    const adminGetRes = await getAdminSubscriptions(adminGetReq);
    const adminGetJson = await adminGetRes.json();
    const archivedPlan = adminGetJson.plans.find((p: { id: string }) => p.id === planId);
    expect(archivedPlan).toBeDefined();
    expect(archivedPlan.isActive).toBe(false);
  });
});
