import { PRODUCTS, type Product } from "./products";

// ── Color and Accessibility Calculations (WCAG AA Compliance) ──

export function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(hex.trim());
}

export function getLuminance(hex: string): number {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function validateSubscriptionColors(colors: {
  bgColour?: string | null;
  accentColour?: string | null;
  textColour?: string | null;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { bgColour, accentColour, textColour } = colors;

  if (bgColour && !isValidHexColor(bgColour)) {
    errors.push(`Invalid background colour hex code: '${bgColour}'`);
  }
  if (accentColour && !isValidHexColor(accentColour)) {
    errors.push(`Invalid accent colour hex code: '${accentColour}'`);
  }
  if (textColour && !isValidHexColor(textColour)) {
    errors.push(`Invalid text colour hex code: '${textColour}'`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  if (bgColour && textColour) {
    const contrast = getContrastRatio(bgColour, textColour);
    if (contrast < 4.5) {
      errors.push(
        `Insufficient color contrast: Contrast ratio between background (${bgColour}) and text (${textColour}) is ${contrast.toFixed(
          2
        )}:1, which is below the WCAG AA minimum requirement of 4.5:1 for standard text.`
      );
    }
  }

  if (bgColour && accentColour) {
    const contrast = getContrastRatio(bgColour, accentColour);
    if (contrast < 3.0) {
      errors.push(
        `Insufficient color contrast: Contrast ratio between background (${bgColour}) and accent (${accentColour}) is ${contrast.toFixed(
          2
        )}:1, which is below the WCAG AA minimum requirement of 3.0:1 for graphical UI elements.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ── In-Memory Catalog Access (Zero SQLite Runtime Dependency) ──
// Active runtime authority is PostgreSQL accessed through ASP.NET Core API.
// This in-memory catalog provides static fallbacks and isolated unit testing support.

const memoryPlans: Product[] = [...PRODUCTS];

export function getAllSubscriptionPlans(includeInactive = false): Product[] {
  return includeInactive
    ? memoryPlans
    : memoryPlans.filter((p) => p.isActive !== false);
}

export function getSubscriptionPlanById(id: string): Product | undefined {
  if (!id) return undefined;
  const normalized = id.trim().toLowerCase();
  return memoryPlans.find(
    (p) =>
      p.id.toLowerCase() === normalized ||
      (p.slug && p.slug.toLowerCase() === normalized)
  );
}

export function getSubscriptionPlanByIdOrSlug(idOrSlug: string): Product | undefined {
  return getSubscriptionPlanById(idOrSlug);
}

export interface PlanMutationInput {
  name: string;
  slug: string;
  description: string;
  audience?: string;
  pathway: "RN" | "PN" | "Both";
  planType: "starter" | "pro" | "premium" | "readiness";
  price: number;
  originalPrice?: number;
  currency?: string;
  billingInterval: "month" | "quarter" | "one-time";
  durationLabel?: string;
  features: string[];
  popular?: boolean;
  bgColour?: string;
  accentColour?: string;
  textColour?: string;
  badgeText?: string;
  displayOrder?: number;
  isActive?: boolean;
  entitlements?: ("rn" | "pn")[];
}

export function createSubscriptionPlan(input: PlanMutationInput): Product {
  const newPlan: Product = {
    id: input.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    slug: input.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    name: input.name.trim(),
    description: input.description.trim(),
    audience: input.audience?.trim(),
    pathway: input.pathway,
    planType: input.planType,
    price: input.price,
    originalPrice: input.originalPrice,
    currency: input.currency || "USD",
    billingInterval: input.billingInterval,
    durationLabel: input.durationLabel?.trim(),
    features: input.features,
    popular: Boolean(input.popular),
    bgColour: input.bgColour?.trim(),
    accentColour: input.accentColour?.trim(),
    textColour: input.textColour?.trim(),
    badgeText: input.badgeText?.trim(),
    displayOrder: typeof input.displayOrder === "number" ? input.displayOrder : 99,
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
    entitlements: input.entitlements,
  };

  memoryPlans.push(newPlan);
  return newPlan;
}

export function updateSubscriptionPlan(
  id: string,
  updates: Partial<PlanMutationInput>
): Product | null {
  const index = memoryPlans.findIndex(
    (p) => p.id.toLowerCase() === id.toLowerCase() || p.slug?.toLowerCase() === id.toLowerCase()
  );
  if (index === -1) return null;

  const existing = memoryPlans[index];
  const updated: Product = {
    ...existing,
    ...updates,
    id: existing.id,
    displayOrder: typeof updates.displayOrder === "number" ? updates.displayOrder : existing.displayOrder,
    isActive: updates.isActive !== undefined ? Boolean(updates.isActive) : existing.isActive,
    entitlements: updates.entitlements ?? existing.entitlements,
  };

  memoryPlans[index] = updated;
  return updated;
}

export function archiveSubscriptionPlan(id: string): boolean {
  const plan = getSubscriptionPlanById(id);
  if (!plan) return false;
  plan.isActive = false;
  return true;
}
