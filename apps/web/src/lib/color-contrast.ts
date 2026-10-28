/**
 * WCAG 2.1 color contrast calculation and hex color validation utilities.
 * Client-safe (zero Node.js dependencies).
 */

export const WCAG_AA_NORMAL_TEXT_MIN_RATIO = 4.5;
export const WCAG_AA_LARGE_TEXT_MIN_RATIO = 3.0;
export const WCAG_AA_UI_COMPONENT_MIN_RATIO = 3.0;
export const WCAG_AAA_NORMAL_TEXT_MIN_RATIO = 7.0;
export const WCAG_AAA_LARGE_TEXT_MIN_RATIO = 4.5;

export type TextSizeCategory = "normal" | "large" | "ui-component";

export interface ContrastEvaluation {
  ratio: number;
  category: TextSizeCategory;
  requiredRatio: number;
  passesWcagAA: boolean;
  passesWcagAAA: boolean;
  message: string;
}

export interface SubscriptionColorValidationResult {
  isValid: boolean;
  textContrastRatio?: number;
  accentContrastRatio?: number;
  errors: string[];
}

export function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function checkContrastRatio(hex1: string, hex2: string): number {
  if (!isValidHexColor(hex1) || !isValidHexColor(hex2)) {
    return 1;
  }

  const parseHex = (h: string) => {
    let clean = h.replace("#", "");
    if (clean.length === 3) {
      clean = clean.split("").map((c) => c + c).join("");
    }
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  const [r1, g1, b1] = parseHex(hex1);
  const [r2, g2, b2] = parseHex(hex2);

  const l1 = getRelativeLuminance(r1, g1, b1);
  const l2 = getRelativeLuminance(r2, g2, b2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Evaluates contrast between two colors against WCAG 2.1 guidelines based on text size or UI category.
 */
export function evaluateWcagContrast(
  foregroundHex: string,
  backgroundHex: string,
  category: TextSizeCategory = "normal"
): ContrastEvaluation {
  const ratio = checkContrastRatio(foregroundHex, backgroundHex);
  const requiredRatio =
    category === "normal"
      ? WCAG_AA_NORMAL_TEXT_MIN_RATIO
      : category === "large"
        ? WCAG_AA_LARGE_TEXT_MIN_RATIO
        : WCAG_AA_UI_COMPONENT_MIN_RATIO;

  const aaaRequiredRatio =
    category === "normal"
      ? WCAG_AAA_NORMAL_TEXT_MIN_RATIO
      : WCAG_AAA_LARGE_TEXT_MIN_RATIO;

  const passesWcagAA = ratio >= requiredRatio;
  const passesWcagAAA = ratio >= aaaRequiredRatio;

  let message = `Contrast ratio is ${ratio.toFixed(2)}:1.`;
  if (!passesWcagAA) {
    if (category === "normal") {
      message = `Insufficient contrast (${ratio.toFixed(2)}:1). WCAG AA requires at least 4.5:1 for standard body and badge text (3.0:1 only qualifies for large headings >= 24px or 18.5px bold).`;
    } else if (category === "large") {
      message = `Insufficient contrast (${ratio.toFixed(2)}:1). WCAG AA requires at least 3.0:1 for large text (>= 24px or 18.5px bold).`;
    } else {
      message = `Insufficient contrast (${ratio.toFixed(2)}:1). WCAG AA requires at least 3.0:1 for graphical UI components and interactive borders.`;
    }
  } else if (passesWcagAAA) {
    message += " Meets WCAG Level AAA criteria.";
  } else {
    message += " Meets WCAG Level AA criteria.";
  }

  return {
    ratio,
    category,
    requiredRatio,
    passesWcagAA,
    passesWcagAAA,
    message,
  };
}

/**
 * Validates subscription card color combinations for public catalogue rendering.
 * Enforces 4.5:1 for body and badge text against card background,
 * and 3.0:1 for graphical accents / borders against background.
 */
export function validateSubscriptionColors(input: {
  bgColour?: string;
  textColour?: string;
  accentColour?: string;
}): SubscriptionColorValidationResult {
  const errors: string[] = [];
  const bg = input.bgColour?.trim();
  const text = input.textColour?.trim();
  const accent = input.accentColour?.trim();

  if (bg && !isValidHexColor(bg)) {
    errors.push("Background color must be a valid hex color code (e.g. #FFFFFF).");
  }
  if (text && !isValidHexColor(text)) {
    errors.push("Text color must be a valid hex color code (e.g. #0F172A).");
  }
  if (accent && !isValidHexColor(accent)) {
    errors.push("Accent color must be a valid hex color code (e.g. #0D9488).");
  }

  let textContrastRatio: number | undefined;
  let accentContrastRatio: number | undefined;

  if (bg && text && isValidHexColor(bg) && isValidHexColor(text)) {
    const textEval = evaluateWcagContrast(text, bg, "normal");
    textContrastRatio = textEval.ratio;
    if (!textEval.passesWcagAA) {
      errors.push(textEval.message);
    }
  }

  if (bg && accent && isValidHexColor(bg) && isValidHexColor(accent)) {
    const accentEval = evaluateWcagContrast(accent, bg, "ui-component");
    accentContrastRatio = accentEval.ratio;
    if (!accentEval.passesWcagAA) {
      errors.push(accentEval.message);
    }
  }

  return {
    isValid: errors.length === 0,
    textContrastRatio,
    accentContrastRatio,
    errors,
  };
}
