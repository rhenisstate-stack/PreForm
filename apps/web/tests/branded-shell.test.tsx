import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { BrandedLoading } from "@/components/layout/branded-loading";
import {
  PersonalizedWelcome,
  formatRoleTitle,
  getAuthorizedWorkspace,
} from "@/components/layout/personalized-welcome";
import type { AuthUser } from "@/lib/auth-context";

describe("BrandedLoading Component", () => {
  it("renders accessible status container with PrepFord branding", () => {
    render(<BrandedLoading message="Loading student workspace..." fullScreen={false} />);

    const statusContainer = screen.getByRole("status");
    expect(statusContainer).toBeInTheDocument();
    expect(statusContainer).toHaveAttribute("aria-live", "polite");

    // Logo image with verified prepford-logo path
    const logoImg = screen.getByAltText(/PrepFord logo/i);
    expect(logoImg).toBeInTheDocument();
    expect(logoImg.getAttribute("src")).toContain("prepford-logo.jpg");

    // Loading message
    expect(screen.getAllByText("Loading student workspace...")[0]).toBeInTheDocument();
  });

  it("renders genuine percentage when measurable progress is passed", () => {
    render(<BrandedLoading message="Synchronizing clinical modules..." progressPercent={72} fullScreen={false} />);

    // Shows 72%
    expect(screen.getByText("72%")).toBeInTheDocument();
    const srOnly = screen.getByText(/Synchronizing clinical modules... \(72% complete\)/i);
    expect(srOnly).toBeInTheDocument();
  });

  it("renders indeterminate progress bar when progress percentage is omitted", () => {
    const { container } = render(<BrandedLoading fullScreen={false} />);

    // Indeterminate bar is present
    const indeterminateBar = container.querySelector(".motion-safe\\:animate-\\[indeterminate_1\\.5s_infinite_ease-in-out\\]");
    expect(indeterminateBar).toBeInTheDocument();
  });
});

describe("PersonalizedWelcome Component & Role-Aware Navigation", () => {
  const studentUser: AuthUser = {
    id: "student-101",
    email: "jane.doe@nursing.edu",
    name: "Jane Doe",
    displayName: "Jane Doe, BSN",
    role: "student",
    pathway: "rn",
  };

  const adminUser: AuthUser = {
    id: "admin-201",
    email: "sarah.admin@prepford.com",
    name: "Sarah Admin",
    displayName: "Dr. Sarah Admin",
    role: "superadmin",
    pathway: "rn",
  };

  it("renders personalized greeting and pathway badge using trusted profile data", () => {
    render(<PersonalizedWelcome user={studentUser} />);

    expect(screen.getByText(/Welcome back, Jane Doe, BSN\./i)).toBeInTheDocument();
    expect(screen.getByText("NCLEX-RN")).toBeInTheDocument();
    expect(screen.getByText("Candidate")).toBeInTheDocument();
  });

  it("routes student candidate to /dashboard workspace", () => {
    render(<PersonalizedWelcome user={studentUser} />);

    const ctaLink = screen.getByRole("link", { name: /Open Student Study Workspace/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/dashboard");
  });

  it("routes administrator to /admin workspace", () => {
    render(<PersonalizedWelcome user={adminUser} />);

    expect(screen.getByText(/Welcome back, Dr\. Sarah Admin\./i)).toBeInTheDocument();
    expect(screen.getByText("Super Administrator")).toBeInTheDocument();

    const ctaLink = screen.getByRole("link", { name: /Open Administrator Workspace/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/admin");
  });

  it("correctly resolves authorized destinations across diverse roles", () => {
    expect(getAuthorizedWorkspace("student").path).toBe("/dashboard");
    expect(getAuthorizedWorkspace("candidate").path).toBe("/dashboard");
    expect(getAuthorizedWorkspace("admin").path).toBe("/admin");
    expect(getAuthorizedWorkspace("content_manager").path).toBe("/admin");
    expect(getAuthorizedWorkspace("exam-manager").path).toBe("/admin");
    expect(getAuthorizedWorkspace("question_reviewer").path).toBe("/admin");
    expect(getAuthorizedWorkspace("superadmin").path).toBe("/admin");
  });

  it("formats role titles professionally", () => {
    expect(formatRoleTitle("superadmin")).toBe("Super Administrator");
    expect(formatRoleTitle("admin")).toBe("Administrator");
    expect(formatRoleTitle("content-manager")).toBe("Content Manager");
    expect(formatRoleTitle("exam_manager")).toBe("Exam Manager");
    expect(formatRoleTitle("question-reviewer")).toBe("Question Reviewer");
    expect(formatRoleTitle("student")).toBe("Candidate");
  });
});
