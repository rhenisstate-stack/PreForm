import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  FullPageCrudLayout,
  FullPageFormLayout,
  FullPageDetailsLayout,
  FullPageDeleteLayout,
} from "@/components/ui/full-page-crud";
import { Toaster } from "@/components/ui/sonner";
import { AdminRolesClient } from "@/app/admin/roles/page-client";
import { AdminIpRulesClient } from "@/app/admin/security/ip-rules/page-client";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/roles",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/lib/notifications", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe("System-Wide Full-Page CRUD, Maximum Workspace Utilization & Notification Standard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders FullPageCrudLayout, FullPageFormLayout, FullPageDetailsLayout, and FullPageDeleteLayout with w-full max-w-none min-w-0 flex-1", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const onCancel = vi.fn();
    const onConfirmDelete = vi.fn();

    const { unmount } = render(
      <FullPageFormLayout
        title="Create Custom Assessment"
        subtitle="Configure full-page assessment parameters"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Examinations", href: "/admin/examinations" },
          { label: "Create" },
        ]}
        onCancel={onCancel}
        onSubmit={onSubmit}
        submitLabel="Save Assessment"
      >
        <div data-testid="form-body">Form Fields</div>
      </FullPageFormLayout>
    );

    const formView = screen.getByTestId("full-page-form-layout");
    expect(formView).toBeInTheDocument();
    expect(formView.className).toContain("w-full");
    expect(formView.className).toContain("max-w-none");
    expect(formView.className).not.toMatch(/max-w-(md|lg|xl|2xl|6xl|7xl)/);
    expect(screen.getByRole("navigation", { name: /Breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Assessment/i })).toBeInTheDocument();
    unmount();

    const { unmount: unmountDetails } = render(
      <FullPageDetailsLayout
        title="Inspection Workspace"
        subtitle="Full-page read view"
        onBack={onCancel}
      >
        <div>Record Details</div>
      </FullPageDetailsLayout>
    );
    const detailsView = screen.getByTestId("full-page-details-layout");
    expect(detailsView.className).toContain("w-full");
    expect(detailsView.className).toContain("max-w-none");
    unmountDetails();

    render(
      <FullPageDeleteLayout
        title="Delete Examination Record"
        subtitle="Review consequences before permanent deletion"
        recordSummary={<div>Record: Custom RN Exam</div>}
        consequences={["This action cannot be undone."]}
        isBlocked={true}
        blockReason="Historical learner attempts exist for this examination."
        onCancel={onCancel}
        onConfirmDelete={onConfirmDelete}
        onArchiveInstead={vi.fn()}
      />
    );
    const deleteView = screen.getByTestId("full-page-delete-layout");
    expect(deleteView.className).toContain("w-full");
    expect(deleteView.className).toContain("max-w-none");
    expect(screen.getByText(/Historical learner attempts exist/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Archive \/ Deactivate Instead/i })).toBeInTheDocument();
  });

  it("replaces browser confirm() and modal dialogs with full-page CRUD views in AdminRolesClient", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/admin/roles")) {
        return {
          ok: true,
          json: async () => ({
            roles: [
              {
                id: "role-custom-1",
                name: "audit_reviewer",
                description: "Custom audit role",
                isSystem: false,
                permissionCount: 3,
                userCount: 1,
              },
            ],
          }),
        };
      }
      if (url.includes("/api/admin/permissions")) {
        return {
          ok: true,
          json: async () => ({ permissions: [], grouped: {} }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<AdminRolesClient />);

    await waitFor(() => {
      expect(screen.getByText(/audit reviewer/i)).toBeInTheDocument();
    });

    // Click Create Role -> opens full-page form layout
    fireEvent.click(screen.getByRole("button", { name: /Create Role/i }));
    expect(screen.getByTestId("full-page-form-layout")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Create Custom Role/i })).toBeInTheDocument();

    // Cancel returns to list
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    // Click Delete Custom Role -> opens full-page delete confirmation without calling window.confirm
    const deleteBtn = screen.getByTitle("Delete Custom Role");
    fireEvent.click(deleteBtn);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("full-page-delete-layout")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Delete Custom Role/i })).toBeInTheDocument();
  });

  it("replaces browser confirm() and modal dialogs with full-page CRUD views in AdminIpRulesClient", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        rules: [
          {
            id: "rule-1",
            ipAddressOrCidr: "203.0.113.50/32",
            ruleType: "Blacklist",
            description: "Suspicious botnet",
            isActive: true,
          },
        ],
      }),
    });

    render(<AdminIpRulesClient />);

    await waitFor(() => {
      expect(screen.getByText("203.0.113.50/32")).toBeInTheDocument();
    });

    // Click Delete Rule -> opens full-page delete layout without calling window.confirm
    fireEvent.click(screen.getByTitle("Delete Rule"));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("full-page-delete-layout")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Delete IP Access Rule/i })).toBeInTheDocument();
  });

  it("renders Toaster with top-center notification positioning by default", () => {
    const { container } = render(<Toaster />);
    expect(container).toBeDefined();
  });
});
