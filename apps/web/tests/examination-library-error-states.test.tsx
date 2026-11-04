import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminExaminationsClient } from "@/app/admin/examinations/page-client";

let mockUser: { id: string; role: string; displayName?: string; email?: string } | null = {
  id: "adm_123",
  role: "admin",
  displayName: "System Administrator",
  email: "admin@prepford.com",
};
const mockIsLoading = false;
const mockIsAuthenticated = true;

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: mockIsAuthenticated,
    isLoading: mockIsLoading,
    login: vi.fn(),
    registerUser: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * These tests lock in the distinct failure states of the examination library
 * query: authentication (401) and authorization (403) failures must be
 * distinguishable from transient server faults, and must not trigger query
 * retries (which would turn an authentication failure into an unbounded
 * refetch loop).
 */
describe("P3.3 Examination Library Error State Distinction", () => {
  let queryClient: QueryClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  const renderCatalogue = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AdminExaminationsClient />
      </QueryClientProvider>
    );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, retryDelay: 0 },
      },
    });
    vi.restoreAllMocks();
  });

  it("renders a session-expired state with a sign-in affordance and no retry loop on 401", async () => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ success: false, error: "Authentication required" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderCatalogue();

    await waitFor(() => {
      expect(screen.getByText(/session has expired/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /sign in again/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    // Authentication failures must not spin into an unbounded refetch loop.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renders a permission-denied state without retry on 403", async () => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () =>
        Promise.resolve({
          success: false,
          error: "Forbidden: role 'candidate' does not have subscription management permissions",
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderCatalogue();

    await waitFor(() => {
      expect(screen.getByText(/does not have permission to view the examination catalogue/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/contact a super administrator/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renders the transient failure state with a retry affordance on 500", async () => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ success: false, error: "Internal server error" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderCatalogue();

    await waitFor(
      () => {
        expect(screen.getByText(/failed to load examination library catalogue/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in again/i })).not.toBeInTheDocument();
  });
});
