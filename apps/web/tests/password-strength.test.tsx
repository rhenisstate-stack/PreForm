import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { evaluatePasswordStrength } from "@/lib/validation/auth";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";

describe("Password Strength Evaluation & Indicator", () => {
  describe("evaluatePasswordStrength helper", () => {
    it("returns score 0 and prompt for empty password", () => {
      const result = evaluatePasswordStrength("");
      expect(result.score).toBe(0);
      expect(result.label).toBe("Very weak");
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("evaluates trivial passwords as weak or very weak", () => {
      const result = evaluatePasswordStrength("password");
      expect(result.score).toBeLessThanOrEqual(1);
      expect(["Very weak", "Weak"]).toContain(result.label);
    });

    it("evaluates high-entropy passwords as strong or very strong", () => {
      const result = evaluatePasswordStrength("K9#m$P2!vL7&qZ@4");
      expect(result.score).toBeGreaterThanOrEqual(3);
      expect(["Strong", "Very strong"]).toContain(result.label);
    });
  });

  describe("PasswordStrengthIndicator component", () => {
    it("renders nothing when password is empty", () => {
      const { container } = render(<PasswordStrengthIndicator password="" />);
      expect(container.firstChild).toBeNull();
    });

    it("renders warning and baseline requirement when password is weak", () => {
      render(<PasswordStrengthIndicator password="abc" />);
      
      expect(screen.getByText(/Strength:/i)).toBeInTheDocument();
      expect(screen.getByText("Minimum: Strong")).toBeInTheDocument();
    });

    it("renders success state when password meets or exceeds baseline", () => {
      render(<PasswordStrengthIndicator password="C0mpl3x#P@ssw0rd!2026" />);

      expect(screen.getByText(/Strength:/i)).toBeInTheDocument();
      expect(screen.getByText("Meets security baseline")).toBeInTheDocument();
    });
  });
});
