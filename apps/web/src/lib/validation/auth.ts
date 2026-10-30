import { z } from "zod";
import zxcvbn from "zxcvbn";

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_ZXCVBN_SCORE = 3; // Baseline acceptable strength: Strong (3) or Very Strong (4)

/**
 * Normalizes a full name by trimming edge whitespace and collapsing multiple spaces.
 */
export function normalizeFullName(raw: string): string {
  if (!raw) return "";
  return raw.trim().replace(/\s+/g, " ");
}

/**
 * Validates that a full name contains at least two distinct name parts.
 * Preserves hyphenated, apostrophe-containing, and international name characters.
 */
export function validateFullName(raw: string): { isValid: boolean; error?: string } {
  const normalized = normalizeFullName(raw);
  if (!normalized) {
    return { isValid: false, error: "Please enter your full name using at least two names." };
  }
  if (normalized.length < 2) {
    return { isValid: false, error: "Full name must be at least 2 characters" };
  }
  const segments = normalized.split(" ").filter((s) => s.trim().length > 0);
  if (segments.length < 2) {
    return { isValid: false, error: "Please enter your full name using at least two names." };
  }
  return { isValid: true };
}

/**
 * Validates email format with specific, contextual feedback.
 * Does not arbitrarily restrict email domains.
 */
export function getEmailValidationError(value: string): string | null {
  if (value === undefined || value === null) {
    return "Email address is required.";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "Email address is required.";
  }
  if (!trimmed.includes("@")) {
    return "Please enter a valid email address, including @ and a domain.";
  }
  const parts = trimmed.split("@");
  if (parts.length < 2 || !parts[1] || parts[1].trim() === "") {
    return "Please enter a complete email address.";
  }
  if (parts.length > 2) {
    return "Please enter a valid email address.";
  }
  const domain = parts[1].trim();
  if (!domain.includes(".") || domain.endsWith(".") || domain.startsWith(".") || domain.split(".").pop()?.length === 0) {
    return "Please enter a valid email domain, such as gmail.com.";
  }
  // Standard RFC-compatible regex check for remaining syntactic validity
  const standardEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!standardEmailRegex.test(trimmed)) {
    return "Please enter a valid email address.";
  }
  return null;
}

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
  rememberMe: z
    .boolean()
    .default(false),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name cannot exceed 100 characters")
      .refine(
        (val) => {
          const segments = normalizeFullName(val).split(" ").filter(Boolean);
          return segments.length >= 2;
        },
        {
          message: "Please enter your full name using at least two names.",
        }
      ),
    email: z
      .string()
      .trim()
      .min(1, "Email address is required")
      .email("Please enter a valid email address"),
    pathway: z.enum(["rn", "pn"], {
      errorMap: () => ({ message: "Please select an examination pathway (NCLEX-RN or NCLEX-PN)" }),
    }),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(MAX_PASSWORD_LENGTH, `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`)
      .refine(
        (val) => {
          const result = zxcvbn(val);
          return result.score >= MIN_ZXCVBN_SCORE;
        },
        {
          message: "Password is too weak. Please include a mix of uppercase, lowercase, numbers, or symbols.",
        }
      ),
    confirmPassword: z.string().optional(),
    agreeTerms: z.literal(true, {
      errorMap: () => ({
        message: "You must accept the Terms and Conditions and acknowledge the Privacy Policy",
      }),
    }),
  })
  .refine(
    (data) => {
      if (data.confirmPassword !== undefined && data.confirmPassword !== "") {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Password confirmation does not match.",
      path: ["confirmPassword"],
    }
  );

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signUpFormSchema = signUpSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password confirmation does not match.",
    path: ["confirmPassword"],
  });

export type SignUpFormInput = z.infer<typeof signUpFormSchema>;

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Fair" | "Strong" | "Very strong";
  colorClass: string;
  warning?: string;
  suggestions: string[];
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      label: "Very weak",
      colorClass: "bg-destructive",
      suggestions: ["Enter a password to estimate strength."],
    };
  }

  const result = zxcvbn(password);
  const score = result.score as 0 | 1 | 2 | 3 | 4;

  const scoreMap: Record<0 | 1 | 2 | 3 | 4, { label: PasswordStrengthResult["label"]; colorClass: string }> = {
    0: { label: "Very weak", colorClass: "bg-destructive" },
    1: { label: "Weak", colorClass: "bg-orange-500" },
    2: { label: "Fair", colorClass: "bg-amber-500" },
    3: { label: "Strong", colorClass: "bg-teal-600" },
    4: { label: "Very strong", colorClass: "bg-emerald-600" },
  };

  return {
    score,
    label: scoreMap[score].label,
    colorClass: scoreMap[score].colorClass,
    warning: result.feedback.warning || undefined,
    suggestions: result.feedback.suggestions || [],
  };
}

const DISALLOWED_RETURN_PATH_PREFIXES = ["/sign-in", "/sign-up", "/api/auth"];

function hasUnsafePathSequence(value: string): boolean {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    value.includes("\\") ||
    value.includes("://") ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    return true;
  }
  return false;
}

function isDisallowedAuthPath(pathname: string): boolean {
  const lowerPath = pathname.toLowerCase();
  for (const prefix of DISALLOWED_RETURN_PATH_PREFIXES) {
    if (
      lowerPath === prefix ||
      lowerPath.startsWith(`${prefix}/`) ||
      lowerPath.startsWith(`${prefix}?`)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Validates and normalizes an internal post-authentication redirect path.
 * Prevents open-redirect vulnerabilities (external URLs, protocol-relative URLs,
 * backslash bypasses, encoded-path bypasses, non-HTTP schemes, control characters,
 * and auth loops). Defaults to "/dashboard" for learner sign-in flows.
 */
export function sanitizeReturnUrl(
  raw: string | null | undefined,
  defaultPath: string = "/dashboard"
): string {
  if (!raw || typeof raw !== "string") {
    return defaultPath;
  }

  const trimmed = raw.trim();
  if (!trimmed || hasUnsafePathSequence(trimmed)) {
    return defaultPath;
  }

  // Decode up to two times to detect single- or double-encoded bypasses (e.g. /%2f/evil.com, /%5cevil.com)
  let decodedOnce: string;
  let decodedTwice: string;
  try {
    decodedOnce = decodeURIComponent(trimmed);
    decodedTwice = decodeURIComponent(decodedOnce);
  } catch {
    // Reject malformed percent-encoding sequences
    return defaultPath;
  }

  if (hasUnsafePathSequence(decodedOnce) || hasUnsafePathSequence(decodedTwice)) {
    return defaultPath;
  }

  try {
    const base = "http://localhost";
    const parsed = new URL(trimmed, base);
    const parsedDecoded = new URL(decodedOnce, base);

    if (
      parsed.origin !== base ||
      parsedDecoded.origin !== base ||
      !parsed.pathname.startsWith("/") ||
      parsed.pathname.startsWith("//") ||
      !parsedDecoded.pathname.startsWith("/") ||
      parsedDecoded.pathname.startsWith("//")
    ) {
      return defaultPath;
    }

    if (
      isDisallowedAuthPath(parsed.pathname) ||
      isDisallowedAuthPath(parsedDecoded.pathname)
    ) {
      return defaultPath;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return defaultPath;
  }
}
