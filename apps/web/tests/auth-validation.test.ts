import { describe, it, expect } from "vitest";
import { signInSchema, signUpSchema, MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";

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
});
