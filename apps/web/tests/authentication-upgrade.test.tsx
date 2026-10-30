import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  normalizeFullName,
  validateFullName,
  getEmailValidationError,
  signUpSchema,
  signUpFormSchema,
  signInSchema,
} from "@/lib/validation/auth";
import {
  mapAuthHttpStatusToMessage,
  mapHttpStatusToMessage,
  mapAuthErrorCode,
} from "@/lib/error-mapping";
import { getApiBaseUrl } from "@/lib/api-client";
import PublicHeader from "@/components/layout/public-header";
import PublicFooter from "@/components/layout/public-footer";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { ECGHeartbeat, buildNormalSinusRhythmPath } from "@/components/auth/ecg-heartbeat";
import { AuthLoadingSkeleton } from "@/components/auth/auth-loading-skeleton";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { SignUpPageClient } from "@/app/sign-up/page-client";
import { SignInPageClient } from "@/app/sign-in/page-client";

// Router & pathname mocks
const mockPush = vi.fn();
const mockRefresh = vi.fn();
let currentPathname = "/sign-up";
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: mockRefresh,
    prefetch: vi.fn(),
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => currentSearchParams,
}));

// Auth context mock
const mockLogin = vi.fn();
const mockRegisterUser = vi.fn();

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    registerUser: mockRegisterUser,
    logout: vi.fn(),
    refreshSession: vi.fn(),
  }),
}));

describe("Authentication Connectivity & Experience Upgrade", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRefresh.mockReset();
    mockLogin.mockReset();
    mockRegisterUser.mockReset();
    currentPathname = "/sign-up";
    currentSearchParams = new URLSearchParams();
  });

  describe("1. Full-Name Mandatory Validation", () => {
    it("rejects single names (e.g. 'Mark')", () => {
      const res = validateFullName("Mark");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("Please enter your full name using at least two names.");

      const schemaRes = signUpSchema.safeParse({
        fullName: "Mark",
        email: "mark@example.com",
        pathway: "rn",
        password: "C0mpl3x#Password!2026",
        agreeTerms: true,
      });
      expect(schemaRes.success).toBe(false);
      if (!schemaRes.success) {
        expect(schemaRes.error.flatten().fieldErrors.fullName).toContain(
          "Please enter your full name using at least two names."
        );
      }
    });

    it("accepts two-word and multi-word names", () => {
      const validNames = [
        "Mark Gitau",
        "Mary Jane",
        "Mary Jane Gitau",
        "Mark Kinyanjui Gitau",
      ];
      for (const name of validNames) {
        const res = validateFullName(name);
        expect(res.isValid).toBe(true);

        const schemaRes = signUpSchema.safeParse({
          fullName: name,
          email: "candidate@prepford.com",
          pathway: "rn",
          password: "C0mpl3x#Password!2026",
          agreeTerms: true,
        });
        expect(schemaRes.success).toBe(true);
      }
    });

    it("normalizes repeated and leading/trailing whitespace", () => {
      const raw = "   Mark    Gitau   ";
      expect(normalizeFullName(raw)).toBe("Mark Gitau");
      const res = validateFullName(raw);
      expect(res.isValid).toBe(true);
    });

    it("accepts hyphenated and apostrophe-containing names", () => {
      const names = ["Mary-Jane Watson", "Patrick O'Connor", "Jean-Luc Picard"];
      for (const name of names) {
        expect(validateFullName(name).isValid).toBe(true);
      }
    });

    it("rejects empty names and names with only spaces", () => {
      expect(validateFullName("").isValid).toBe(false);
      expect(validateFullName("   ").isValid).toBe(false);
    });
  });

  describe("2. Email Contextual Feedback", () => {
    it("returns specific guidance when email is empty", () => {
      expect(getEmailValidationError("")).toBe("Email address is required.");
      expect(getEmailValidationError("   ")).toBe("Email address is required.");
    });

    it("advises user to include @ and a domain when @ is missing", () => {
      expect(getEmailValidationError("mark")).toBe(
        "Please enter a valid email address, including @ and a domain."
      );
    });

    it("advises user to enter complete address when domain is absent after @", () => {
      expect(getEmailValidationError("mark@")).toBe("Please enter a complete email address.");
    });

    it("advises user to enter a valid domain when TLD/dot is absent", () => {
      expect(getEmailValidationError("mark@gmail")).toBe(
        "Please enter a valid email domain, such as gmail.com."
      );
    });

    it("accepts standard providers without arbitrary domain discrimination", () => {
      const validEmails = [
        "mark@gmail.com",
        "mark@yahoo.com",
        "nurse@outlook.com",
        "candidate@prepfordnclex.com",
        "student@university.edu",
      ];
      for (const email of validEmails) {
        expect(getEmailValidationError(email)).toBeNull();
      }
    });
  });

  describe("3. Password & Confirmation Validation", () => {
    it("accepts matching password and confirmation in signUpFormSchema", () => {
      const res = signUpFormSchema.safeParse({
        fullName: "Sarah Connor",
        email: "sarah@example.com",
        pathway: "rn",
        password: "C0mpl3x#Password!2026",
        confirmPassword: "C0mpl3x#Password!2026",
        agreeTerms: true,
      });
      expect(res.success).toBe(true);
    });

    it("rejects mismatched password and confirmation", () => {
      const res = signUpFormSchema.safeParse({
        fullName: "Sarah Connor",
        email: "sarah@example.com",
        pathway: "rn",
        password: "C0mpl3x#Password!2026",
        confirmPassword: "DifferentPassword123!",
        agreeTerms: true,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.flatten().fieldErrors.confirmPassword).toContain(
          "Password confirmation does not match."
        );
      }
    });
  });

  describe("4. HTTP Status & Auth Error Mapping", () => {
    it("maps 400 to input review message", () => {
      expect(mapAuthHttpStatusToMessage(400)).toBe("Please review the information you entered.");
    });

    it("maps 401 to incorrect credentials message", () => {
      expect(mapAuthHttpStatusToMessage(401)).toBe("The email or password is incorrect.");
    });

    it("maps 403 to permission message", () => {
      expect(mapAuthHttpStatusToMessage(403)).toBe(
        "Your account does not currently have permission to access this resource."
      );
    });

    it("maps 404 to auth service not found message instead of raw API error", () => {
      expect(mapAuthHttpStatusToMessage(404)).toBe(
        "The requested authentication service could not be found. Please try again or contact support."
      );
      expect(mapAuthHttpStatusToMessage(404, "API request failed with status 404")).toBe(
        "The requested authentication service could not be found. Please try again or contact support."
      );
    });

    it("maps 409 to account exists message", () => {
      expect(mapAuthHttpStatusToMessage(409)).toBe("An account with this email address already exists.");
    });

    it("maps 422 to invalid information message", () => {
      expect(mapAuthHttpStatusToMessage(422)).toBe("Some of the information provided is invalid.");
    });

    it("maps 429 to rate limit message", () => {
      expect(mapAuthHttpStatusToMessage(429)).toBe("Too many attempts. Please wait before trying again.");
    });

    it("maps 500 to internal error message", () => {
      expect(mapAuthHttpStatusToMessage(500)).toBe("Something went wrong on our server. Please try again shortly.");
    });

    it("maps 502, 503, 504 to service unreachable message", () => {
      expect(mapAuthHttpStatusToMessage(502)).toBe(
        "We are temporarily unable to reach the authentication service. Please try again shortly."
      );
      expect(mapAuthHttpStatusToMessage(503)).toBe(
        "We are temporarily unable to reach the authentication service. Please try again shortly."
      );
      expect(mapAuthHttpStatusToMessage(504)).toBe(
        "We are temporarily unable to reach the authentication service. Please try again shortly."
      );
    });

    it("maps known auth error codes cleanly", () => {
      expect(mapAuthErrorCode("email_already_exists")).toBe(
        "An account with this email address already exists. Please sign in instead."
      );
      expect(mapAuthErrorCode("invalid_credentials")).toBe(
        "Invalid email or password. Please verify your credentials and try again."
      );
    });
  });

  describe("5. Backend Base URL Connectivity", () => {
    it("never defaults to port 3000 even if process.env.PORT is 3000", () => {
      const origPort = process.env.PORT;
      const origGateway = process.env.API_GATEWAY_URL;
      const origInternal = process.env.INTERNAL_API_URL;
      try {
        delete process.env.API_GATEWAY_URL;
        delete process.env.INTERNAL_API_URL;
        delete process.env.NEXT_PUBLIC_API_URL;
        process.env.PORT = "3000";

        const baseUrl = getApiBaseUrl();
        expect(baseUrl).not.toBe("http://127.0.0.1:3000");
        expect(baseUrl).toBe("http://127.0.0.1:4000");
      } finally {
        if (origPort) process.env.PORT = origPort;
        if (origGateway) process.env.API_GATEWAY_URL = origGateway;
        if (origInternal) process.env.INTERNAL_API_URL = origInternal;
      }
    });
  });

  describe("6. Full-Screen Layout Exclusions (Header & Footer Suppression)", () => {
    it("suppresses PublicHeader on /sign-in and /sign-up", () => {
      currentPathname = "/sign-in";
      const { container: signInContainer } = render(<PublicHeader />);
      expect(signInContainer.firstChild).toBeNull();

      currentPathname = "/sign-up";
      const { container: signUpContainer } = render(<PublicHeader />);
      expect(signUpContainer.firstChild).toBeNull();
    });

    it("suppresses PublicFooter on /sign-in and /sign-up", () => {
      currentPathname = "/sign-in";
      const { container: signInContainer } = render(<PublicFooter />);
      expect(signInContainer.firstChild).toBeNull();

      currentPathname = "/sign-up";
      const { container: signUpContainer } = render(<PublicFooter />);
      expect(signUpContainer.firstChild).toBeNull();
    });

    it("suppresses AnnouncementBar on /sign-in and /sign-up", () => {
      currentPathname = "/sign-in";
      const mockAnnouncements = [
        { id: "ann-1", title: "NCLEX Update", destination: "/courses" },
      ];
      const { container } = render(
        <AnnouncementBar announcements={mockAnnouncements} isLoading={false} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("7. ECG Heartbeat & Auth Loading Skeleton Components", () => {
    it("ECGHeartbeat renders authentic normal sinus rhythm waveform without arbitrary zigzags", () => {
      const { container } = render(<ECGHeartbeat />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      const nsrPath = buildNormalSinusRhythmPath();
      expect(nsrPath).toContain("C "); // Cubic bezier curves for P and T domes
      expect(nsrPath).toContain("M 0 48"); // Isoelectric baseline
    });

    it("AuthLoadingSkeleton renders accessible loading status with PrepFord branding", () => {
      render(<AuthLoadingSkeleton variant="sign-in" message="Verifying clinical credentials…" />);
      const statusElement = screen.getByRole("status");
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveTextContent("Verifying clinical credentials…");
      expect(screen.getByTestId("auth-loading-skeleton")).toBeInTheDocument();
    });
  });

  describe("8. Premium Brand Panel & Form Experience", () => {
    it("AuthBrandPanel renders brand storytelling headline and interactive clinical cards", () => {
      render(<AuthBrandPanel mode="sign-in" />);
      expect(
        screen.getByText("Your journey to nursing excellence continues here.")
      ).toBeInTheDocument();
      expect(screen.getByText(/NGN Case Studies/i)).toBeInTheDocument();
      expect(screen.getByText(/Readiness Assessment/i)).toBeInTheDocument();
      expect(screen.getByTestId("auth-brand-panel")).toBeInTheDocument();
    });

    it("SignUpPageClient renders all required fields including pathway and confirm password", () => {
      currentPathname = "/sign-up";
      render(<SignUpPageClient />);

      expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Create password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Confirm password$/i)).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /NCLEX-RN/i })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /NCLEX-PN/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Create account$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeInTheDocument();
    });

    it("SignUpPageClient validates full name requiring at least two names before submitting", async () => {
      const user = userEvent.setup();
      render(<SignUpPageClient />);

      await user.type(screen.getByLabelText(/Full name/i), "SingleName");
      await user.type(screen.getByLabelText(/Email address/i), "mark@example.com");
      await user.type(screen.getByLabelText(/^Create password$/i), "C0mpl3x#P@ssw0rd!2026");
      await user.type(screen.getByLabelText(/^Confirm password$/i), "C0mpl3x#P@ssw0rd!2026");
      await user.click(screen.getByRole("checkbox"));
      await user.click(screen.getByRole("button", { name: /^Create account$/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Please enter your full name using at least two names.")
        ).toBeInTheDocument();
      });
      expect(mockRegisterUser).not.toHaveBeenCalled();
    });

    it("SignUpPageClient successfully submits with valid multi-word name and matching passwords", async () => {
      mockRegisterUser.mockResolvedValueOnce({ success: true });
      const user = userEvent.setup();
      render(<SignUpPageClient />);

      await user.type(screen.getByLabelText(/Full name/i), "Mark Gitau");
      await user.type(screen.getByLabelText(/Email address/i), "mark.gitau@prepford.com");
      await user.type(screen.getByLabelText(/^Create password$/i), "C0mpl3x#P@ssw0rd!2026");
      await user.type(screen.getByLabelText(/^Confirm password$/i), "C0mpl3x#P@ssw0rd!2026");
      await user.click(screen.getByRole("checkbox"));
      await user.click(screen.getByRole("button", { name: /^Create account$/i }));

      await waitFor(() => {
        expect(mockRegisterUser).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith("/courses");
      });
    });

    it("SignInPageClient displays password visibility toggle", async () => {
      const user = userEvent.setup();
      render(<SignInPageClient />);

      const passwordInput = screen.getByLabelText(/^Password$/i);
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleBtn = screen.getByLabelText(/Show password/i);
      await user.click(toggleBtn);
      expect(passwordInput).toHaveAttribute("type", "text");

      const hideBtn = screen.getByLabelText(/Hide password/i);
      await user.click(hideBtn);
      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });
});
