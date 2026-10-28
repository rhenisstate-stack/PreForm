import { describe, it, expect } from "vitest";
import {
  signInSchema,
  signUpSchema,
  sanitizeReturnUrl,
  MIN_PASSWORD_LENGTH,
} from "@/lib/validation/auth";

describe("Authentication Validation Schemas", () => {
  describe("signInSchema", () => {
    it("rejects empty fields", () => {
      const result = signInSchema.safeParse({ email: "", password: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.email).toBeDefined();
        expect(errors.password).toBeDefined();
      }
    });

    it("rejects invalid email formats", () => {
      const result = signInSchema.safeParse({ email: "invalid-email", password: "SomePassword123!" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.email).toContain("Please enter a valid email address");
      }
    });

    it("accepts valid email and password", () => {
      const result = signInSchema.safeParse({
        email: "student@example.com",
        password: "ValidPassword123!",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("student@example.com");
        expect(result.data.rememberMe).toBe(false);
      }
    });

    it("respects rememberMe boolean flag", () => {
      const result = signInSchema.safeParse({
        email: "student@example.com",
        password: "ValidPassword123!",
        rememberMe: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rememberMe).toBe(true);
      }
    });
  });

  describe("signUpSchema", () => {
    const validBaseInput = {
      fullName: "Jane Doe",
      email: "jane.doe@example.com",
      pathway: "rn" as const,
      password: "C0mpl3x#P@ssw0rd!2026",
      agreeTerms: true as const,
    };

    it("accepts valid registration data meeting all criteria", () => {
      const result = signUpSchema.safeParse(validBaseInput);
      expect(result.success).toBe(true);
    });

    it("validates pathway selection between rn and pn", () => {
      const pnResult = signUpSchema.safeParse({ ...validBaseInput, pathway: "pn" });
      expect(pnResult.success).toBe(true);

      const invalidResult = signUpSchema.safeParse({ ...validBaseInput, pathway: "other" });
      expect(invalidResult.success).toBe(false);
    });

    it("rejects full name that is too short", () => {
      const result = signUpSchema.safeParse({ ...validBaseInput, fullName: "J" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.fullName).toContain(
          "Full name must be at least 2 characters"
        );
      }
    });

    it("rejects password shorter than minimum length", () => {
      const result = signUpSchema.safeParse({ ...validBaseInput, password: "Ab1!" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password).toContain(
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
        );
      }
    });

    it("rejects weak passwords with zxcvbn score < 3 even if length >= 8", () => {
      // 8+ characters but common dictionary words/patterns
      const weakPasswords = ["password123", "qwertyuiop", "1234567890", "iloveyou1"];
      for (const pwd of weakPasswords) {
        const result = signUpSchema.safeParse({ ...validBaseInput, password: pwd });
        expect(result.success).toBe(false);
        if (!result.success) {
          const errors = result.error.flatten().fieldErrors.password;
          expect(errors).toBeDefined();
          expect(errors?.some((msg) => msg.includes("too weak"))).toBe(true);
        }
      }
    });

    it("requires agreement to terms and conditions", () => {
      const result = signUpSchema.safeParse({ ...validBaseInput, agreeTerms: false });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.agreeTerms).toBeDefined();
      }
    });
  });

  describe("sanitizeReturnUrl", () => {
    it("defaults to /dashboard when input is missing, empty, or whitespace", () => {
      expect(sanitizeReturnUrl(undefined)).toBe("/dashboard");
      expect(sanitizeReturnUrl(null)).toBe("/dashboard");
      expect(sanitizeReturnUrl("")).toBe("/dashboard");
      expect(sanitizeReturnUrl("   ")).toBe("/dashboard");
      // Explicit custom fallback
      expect(sanitizeReturnUrl(undefined, "/courses")).toBe("/courses");
    });

    it("preserves safe internal application paths and query/hash parameters", () => {
      expect(sanitizeReturnUrl("/")).toBe("/");
      expect(sanitizeReturnUrl("/cart")).toBe("/cart");
      expect(sanitizeReturnUrl("/cart?add=rn-pro-quarter")).toBe("/cart?add=rn-pro-quarter");
      expect(sanitizeReturnUrl("/nclex-rn#rn-study-plans")).toBe("/nclex-rn#rn-study-plans");
      expect(sanitizeReturnUrl("/study-guide/pharmacology")).toBe("/study-guide/pharmacology");
      expect(sanitizeReturnUrl("/dashboard")).toBe("/dashboard");
    });

    it("rejects external origins, protocol-relative URLs, backslash bypasses, and non-HTTP schemes", () => {
      expect(sanitizeReturnUrl("https://evil.example.com")).toBe("/dashboard");
      expect(sanitizeReturnUrl("http://evil.example.com/cart")).toBe("/dashboard");
      expect(sanitizeReturnUrl("//evil.example.com")).toBe("/dashboard");
      expect(sanitizeReturnUrl("///evil.example.com")).toBe("/dashboard");
      expect(sanitizeReturnUrl("/\\evil.example.com")).toBe("/dashboard");
      expect(sanitizeReturnUrl("/cart\\@evil.example.com")).toBe("/dashboard");
      expect(sanitizeReturnUrl("javascript:alert(1)")).toBe("/dashboard");
      expect(sanitizeReturnUrl("data:text/html,<script>alert(1)</script>")).toBe("/dashboard");
    });

    it("rejects single- and double-encoded path bypasses and malformed percent-encodings", () => {
      expect(sanitizeReturnUrl("/%2f/evil.example.com")).toBe("/dashboard");
      expect(sanitizeReturnUrl("/%5cevil.example.com")).toBe("/dashboard");
      expect(sanitizeReturnUrl("/%2f%2fevil.example.com")).toBe("/dashboard");
      expect(sanitizeReturnUrl("/%252f/evil.example.com")).toBe("/dashboard");
      expect(sanitizeReturnUrl("/%E0%A4%A")).toBe("/dashboard");
    });

    it("rejects auth-loop paths such as /sign-in, /sign-up, and /api/auth", () => {
      expect(sanitizeReturnUrl("/sign-in")).toBe("/dashboard");
      expect(sanitizeReturnUrl("/sign-in?from=/cart")).toBe("/dashboard");
      expect(sanitizeReturnUrl("/sign-up")).toBe("/dashboard");
      expect(sanitizeReturnUrl("/api/auth/google")).toBe("/dashboard");
    });
  });
});
