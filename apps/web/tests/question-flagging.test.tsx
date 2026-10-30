import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useQuestionFlag } from "@/lib/use-question-flag";
import { QuestionFlagButton } from "@/components/assessments/question-flag-button";

function TestFlagConsumer({ questionId }: { questionId: string }) {
  const { isFlagged, toggleFlag, isPending } = useQuestionFlag({ questionId });

  return (
    <div>
      <div data-testid="flag-status">{isFlagged ? "FLAGGED" : "UNFLAGGED"}</div>
      <button type="button" onClick={toggleFlag} disabled={isPending}>
        Toggle
      </button>
    </div>
  );
}

describe("Phase 11: TanStack Query Optimistic Question Flagging", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it("optimistically updates flag status before network response completes", async () => {
    let resolveNetwork: (val: unknown) => void;
    const networkPromise = new Promise((resolve) => {
      resolveNetwork = resolve;
    });

    vi.spyOn(global, "fetch").mockImplementation(() => networkPromise as Promise<Response>);

    render(
      <QueryClientProvider client={queryClient}>
        <TestFlagConsumer questionId="q-101" />
      </QueryClientProvider>
    );

    expect(screen.getByTestId("flag-status")).toHaveTextContent("UNFLAGGED");

    // Click toggle
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));

    // Optimistic update: cache is immediately updated to FLAGGED without waiting for network!
    expect(screen.getByTestId("flag-status")).toHaveTextContent("FLAGGED");

    // Now resolve network
    resolveNetwork!({
      ok: true,
      json: async () => ({ success: true, questionId: "q-101", isFlagged: true }),
    } as Response);

    await waitFor(() => {
      expect(screen.getByTestId("flag-status")).toHaveTextContent("FLAGGED");
    });
  });

  it("rolls back to previous state if network request fails", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network disconnect"));

    render(
      <QueryClientProvider client={queryClient}>
        <TestFlagConsumer questionId="q-102" />
      </QueryClientProvider>
    );

    expect(screen.getByTestId("flag-status")).toHaveTextContent("UNFLAGGED");

    // Click toggle
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));

    // Immediately shows FLAGGED optimistically
    expect(screen.getByTestId("flag-status")).toHaveTextContent("FLAGGED");

    // After network error occurs, cache rolls back to UNFLAGGED
    await waitFor(() => {
      expect(screen.getByTestId("flag-status")).toHaveTextContent("UNFLAGGED");
    });
  });

  it("QuestionFlagButton renders accessible attributes and toggles aria-pressed", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, isFlagged: true }),
    } as Response);

    render(
      <QueryClientProvider client={queryClient}>
        <QuestionFlagButton questionId="q-103" />
      </QueryClientProvider>
    );

    const btn = screen.getByRole("button", { name: /Flag question for review/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(btn);

    // After optimistic update
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Unflag question for review/i })).toBeInTheDocument();
      expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Flagged for Review")).toBeInTheDocument();
    });
  });
});
