import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { notify } from "@/lib/notifications";
import {
  sanitizeErrorMessage,
  mapAuthErrorCode,
  mapHttpStatusToMessage,
  isLeakyError,
} from "@/lib/error-mapping";
import {
  TestimonialAvatar,
  getDeterministicGenericAvatar,
} from "@/components/testimonials/testimonial-avatar";
import { toast as sonnerToast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe("PrepFord Centralized Notification & Error Mapping System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Error Sanitization & Leaky Developer Protection", () => {
    it("detects and flags leaky environment variables and developer strings", () => {
      expect(isLeakyError("Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET")).toBe(true);
      expect(isLeakyError("Connection failed: DATABASE_URL is invalid")).toBe(true);
      expect(isLeakyError("Npgsql.NpgsqlException: Connection refused")).toBe(true);
      expect(isLeakyError("at Preform.Api.Controllers.AuthController.Login()")).toBe(true);
      expect(isLeakyError("Valid candidate input error")).toBe(false);
    });

    it("maps google_not_configured to clean user-facing guidance", () => {
      const msg = mapAuthErrorCode("google_not_configured");
      expect(msg).toBe(
        "Google sign-in is temporarily unavailable. Please try again later or sign in using your email and password."
      );
      expect(msg).not.toContain("GOOGLE_CLIENT_ID");
      expect(msg).not.toContain("GOOGLE_CLIENT_SECRET");
    });

    it("maps other auth errors to user-friendly messages without technical jargon", () => {
      expect(mapAuthErrorCode("state_mismatch")).toBe(
        "Your sign-in session expired or could not be verified. Please try again."
      );
      expect(mapAuthErrorCode("invalid_credentials")).toBe(
        "Invalid email or password. Please verify your credentials and try again."
      );
      expect(mapAuthErrorCode("google_cancelled")).toContain("Google sign-in was cancelled");
    });

    it("sanitizes raw errors and replaces leaky developer errors with safe fallback", () => {
      const leakyMsg = "Fatal: GOOGLE_CLIENT_SECRET missing at Preform.Api.Program.cs:42";
      const sanitized = sanitizeErrorMessage(leakyMsg, "Safe fallback");
      expect(sanitized).toBe("Safe fallback");
    });

    it("maps standard HTTP status codes to plain-language explanations", () => {
      expect(mapHttpStatusToMessage(401)).toContain("session has ended");
      expect(mapHttpStatusToMessage(403)).toContain("permission");
      expect(mapHttpStatusToMessage(404)).toContain("could not be found");
      expect(mapHttpStatusToMessage(429)).toContain("Too many requests");
      expect(mapHttpStatusToMessage(500)).toContain("temporarily unavailable");
    });
  });

  describe("Centralized Notify Utility", () => {
    it("dispatches notify.success to Sonner with 4000ms default duration", () => {
      notify.success("Profile saved successfully");
      expect(sonnerToast.success).toHaveBeenCalledWith(
        "Profile saved successfully",
        expect.objectContaining({ duration: 4000 })
      );
    });

    it("dispatches notify.error with sanitization and 6000ms duration", () => {
      notify.error("Network request failed: Failed to fetch");
      expect(sonnerToast.error).toHaveBeenCalledWith(
        "We couldn't connect to the server. Check your connection and try again.",
        expect.objectContaining({ duration: 6000 })
      );
    });

    it("dispatches notify.warning and notify.info with custom durations", () => {
      notify.warning("Exam voucher expires in 24 hours", { duration: 8000 });
      expect(sonnerToast.warning).toHaveBeenCalledWith(
        "Exam voucher expires in 24 hours",
        expect.objectContaining({ duration: 8000 })
      );

      notify.info("New practice rationales available");
      expect(sonnerToast.info).toHaveBeenCalledWith(
        "New practice rationales available",
        expect.objectContaining({ duration: 4000 })
      );
    });

    it("suppresses rapid duplicate notifications within the deduplication window", () => {
      notify.success("Study session saved");
      notify.success("Study session saved");
      expect(sonnerToast.success).toHaveBeenCalledTimes(1);
    });
  });

  describe("TestimonialAvatar Component", () => {
    it("renders image-based avatar without text initials fallback", () => {
      render(
        <TestimonialAvatar
          src="/images/avatars/avatar-female-1.png"
          displayName="Maya T., BSN"
        />
      );

      const avatarImg = screen.getByRole("img", { name: /Maya T., BSN profile avatar/i });
      expect(avatarImg).toBeInTheDocument();
      expect(avatarImg.getAttribute("src")).toContain("avatar-female-1.png");
    });

    it("deterministically assigns consistent generic avatars when no photo is provided", () => {
      const avatarA1 = getDeterministicGenericAvatar("Sarah M.");
      const avatarA2 = getDeterministicGenericAvatar("Sarah M.");
      expect(avatarA1).toBe(avatarA2);
      expect(avatarA1).toMatch(/^\/images\/avatars\/avatar-[\w-]+\.png$/);

      render(<TestimonialAvatar displayName="Jordan M." />);
      const img = screen.getByRole("img", { name: /Jordan M\. profile avatar/i });
      expect(img).toBeInTheDocument();
      expect(img.getAttribute("src")).toMatch(/avatar-[\w-]+\.png/);
    });

    it("protects candidate privacy in anonymous display mode", () => {
      render(<TestimonialAvatar displayName="Anonymous Candidate" isAnonymous />);
      const img = screen.getByRole("img", { name: /Anonymous candidate avatar/i });
      expect(img).toBeInTheDocument();
      expect(img.getAttribute("src")).toContain("avatar-default.png");
    });

    it("handles image load failure gracefully by falling back to default avatar", () => {
      render(
        <TestimonialAvatar
          src="/invalid-broken-path.jpg"
          displayName="Alex R."
        />
      );

      const img = screen.getByRole("img");
      fireEvent.error(img);

      expect(img.getAttribute("src")).toContain("avatar-default.png");
    });
  });
});
