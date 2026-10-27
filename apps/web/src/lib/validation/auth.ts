import { z } from "zod";
import zxcvbn from "zxcvbn";

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_ZXCVBN_SCORE = 3; // Baseline acceptable strength: Strong (3) or Very Strong (4)

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

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
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
    .refine((val) => {
      const result = zxcvbn(val);
      return result.score >= MIN_ZXCVBN_SCORE;
    }, {
      message: "Password is too weak. Please include a mix of uppercase, lowercase, numbers, or symbols.",
    }),
  agreeTerms: z.literal(true, {
    errorMap: () => ({
      message: "You must accept the Terms and Conditions and acknowledge the Privacy Policy",
    }),
  }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

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
