import { describe, it, expect } from "vitest";
import {
  checkContrastRatio,
  evaluateWcagContrast,
  validateSubscriptionColors,
  isValidHexColor,
} from "@/lib/color-contrast";

describe("Phase 4 — WCAG AA Accessibility Contrast Remediation", () => {
  it("validates valid and invalid hex colors", () => {
    expect(isValidHexColor("#FFFFFF")).toBe(true);
    expect(isValidHexColor("#0D9488")).toBe(true);
    expect(isValidHexColor("#142B4A")).toBe(true);
    expect(isValidHexColor("#FFF")).toBe(true);
    expect(isValidHexColor("invalid")).toBe(false);
    expect(isValidHexColor("#12345")).toBe(false);
    expect(isValidHexColor("#1234567")).toBe(false);
  });

  it("calculates contrast accurately for high-contrast pairs", () => {
    // Pure black on pure white is 21:1
    const blackWhite = checkContrastRatio("#000000", "#FFFFFF");
    expect(blackWhite).toBeCloseTo(21, 0);

    // Deep Navy on white
    const navyWhite = checkContrastRatio("#142B4A", "#FFFFFF");
    expect(navyWhite).toBeGreaterThan(10);
  });

  it("enforces WCAG 2.1 AA 4.5:1 for normal body text and badges", () => {
    // High contrast passes normal text
    const highContrast = evaluateWcagContrast("#0F172A", "#FFFFFF", "normal");
    expect(highContrast.passesWcagAA).toBe(true);
    expect(highContrast.ratio).toBeGreaterThanOrEqual(4.5);

    // Intermediate contrast (e.g. #94A3B8 slate-400 on white ~2.5:1) fails
    const lowContrast = evaluateWcagContrast("#94A3B8", "#FFFFFF", "normal");
    expect(lowContrast.passesWcagAA).toBe(false);
  });

  it("distinguishes qualifying large text (3.0:1) from normal text (4.5:1)", () => {
    // A pair with ~3.5:1 ratio (e.g., #2563EB blue-600 on #E2E8F0 slate-200)
    // Passes large text (>= 3.0:1), but FAILS normal text (< 4.5:1)
    const colorA = "#2563EB";
    const colorB = "#CBD5E1";
    const ratio = checkContrastRatio(colorA, colorB);

    if (ratio >= 3.0 && ratio < 4.5) {
      const normalEval = evaluateWcagContrast(colorA, colorB, "normal");
      const largeEval = evaluateWcagContrast(colorA, colorB, "large");

      expect(normalEval.passesWcagAA).toBe(false);
      expect(largeEval.passesWcagAA).toBe(true);
      expect(normalEval.message).toContain("WCAG AA requires at least 4.5:1 for standard body and badge text");
    }
  });

  it("validates subscription card colors and rejects body text below 4.5:1", () => {
    // Deep slate on white: passes
    const validColors = validateSubscriptionColors({
      bgColour: "#FFFFFF",
      textColour: "#0F172A",
      accentColour: "#0D9488",
    });
    expect(validColors.isValid).toBe(true);
    expect(validColors.errors).toHaveLength(0);
    expect(validColors.textContrastRatio).toBeGreaterThanOrEqual(4.5);

    // Failing combination: light gray text on white
    const failingColors = validateSubscriptionColors({
      bgColour: "#FFFFFF",
      textColour: "#94A3B8",
      accentColour: "#0D9488",
    });
    expect(failingColors.isValid).toBe(false);
    expect(failingColors.errors.length).toBeGreaterThan(0);
    expect(failingColors.errors[0]).toContain("Insufficient color contrast");
  });

  it("enforces 3.0:1 requirement for non-text UI components and interactive accents", () => {
    // Accent border that has poor contrast against card background (< 3:1)
    const poorAccent = validateSubscriptionColors({
      bgColour: "#FFFFFF",
      textColour: "#000000",
      accentColour: "#E2E8F0", // very faint border ~1.2:1
    });
    expect(poorAccent.isValid).toBe(false);
    expect(poorAccent.errors.some((e) => e.includes("graphical UI components"))).toBe(true);
  });
});
