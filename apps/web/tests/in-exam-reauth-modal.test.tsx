import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import { InExamReauthModal } from "@/components/assessments/in-exam-reauth-modal";

describe("Phase 7: InExamReauthModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <InExamReauthModal
        isOpen={false}
        attemptId="att_123"
        userEmail="alice@prepford.com"
        onReauthenticated={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders non-dismissible modal with reassurance banner and reason description", () => {
    render(
      <InExamReauthModal
        isOpen={true}
        attemptId="att_123"
        userEmail="alice@prepford.com"
        reasonCode="SESSION_IDLE_TIMEOUT"
        onReauthenticated={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Session Reauthentication Required")).toBeInTheDocument();
    expect(
      screen.getByText("Your session timed out due to a period of inactivity.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your Examination Progress is Preserved")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your examination attempt, persisted answers, and server-authoritative timer are safely preserved/i)
    ).toBeInTheDocument();
  });

  it("prevents modal dismissal on Escape key", () => {
    render(
      <InExamReauthModal
        isOpen={true}
        attemptId="att_123"
        userEmail="alice@prepford.com"
        onReauthenticated={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog");
    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    window.dispatchEvent(escapeEvent);

    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(dialog).toBeInTheDocument();
  });

  it("submits password and invokes onReauthenticated on success", async () => {
    const onReauthenticated = vi.fn();

    const mockResponseData = {
      success: true,
      sessionId: "sess_recovered_456",
      user: { id: "u1", email: "alice@prepford.com", role: "candidate" },
      attempt: {
        id: "att_123",
        remainingSeconds: 1800,
        timeLimitMinutes: 60,
        status: "InProgress",
        totalResponses: 10,
        responses: [],
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponseData,
    });

    render(
      <InExamReauthModal
        isOpen={true}
        attemptId="att_123"
        userEmail="alice@prepford.com"
        onReauthenticated={onReauthenticated}
      />
    );

    const passwordInput = screen.getByLabelText(/Enter Password to Continue/i);
    fireEvent.change(passwordInput, { target: { value: "CorrectPassword123!" } });

    const submitBtn = screen.getByRole("button", { name: /Verify & Resume Exam/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/exam-attempts/att_123/reauthenticate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "alice@prepford.com",
            password: "CorrectPassword123!",
          }),
        })
      );
      expect(onReauthenticated).toHaveBeenCalledWith(mockResponseData);
    });
  });

  it("displays error message when reauthentication credentials fail", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        errorCode: "INVALID_CREDENTIALS",
        error: "Invalid password.",
      }),
    });

    render(
      <InExamReauthModal
        isOpen={true}
        attemptId="att_123"
        userEmail="alice@prepford.com"
        onReauthenticated={vi.fn()}
      />
    );

    const passwordInput = screen.getByLabelText(/Enter Password to Continue/i);
    fireEvent.change(passwordInput, { target: { value: "WrongPassword" } });

    const submitBtn = screen.getByRole("button", { name: /Verify & Resume Exam/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Invalid password. Please check your credentials and try again.")
      ).toBeInTheDocument();
    });
  });

  it("displays authoritative message when examination attempt deadline has expired", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        errorCode: "ATTEMPT_EXPIRED",
        error: "The time limit has expired.",
      }),
    });

    render(
      <InExamReauthModal
        isOpen={true}
        attemptId="att_123"
        userEmail="alice@prepford.com"
        onReauthenticated={vi.fn()}
      />
    );

    const passwordInput = screen.getByLabelText(/Enter Password to Continue/i);
    fireEvent.change(passwordInput, { target: { value: "CorrectPassword123!" } });

    const submitBtn = screen.getByRole("button", { name: /Verify & Resume Exam/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("The authoritative time limit for this examination has expired. Continuation is no longer permitted.")
      ).toBeInTheDocument();
    });
  });

  it("supports abandon examination confirmation flow", () => {
    const onAbandon = vi.fn();

    render(
      <InExamReauthModal
        isOpen={true}
        attemptId="att_123"
        userEmail="alice@prepford.com"
        onReauthenticated={vi.fn()}
        onAbandon={onAbandon}
      />
    );

    const abandonBtn = screen.getByRole("button", { name: /Abandon Examination/i });
    fireEvent.click(abandonBtn);

    expect(screen.getByText("Abandon attempt?")).toBeInTheDocument();
    const confirmBtn = screen.getByRole("button", { name: /Yes, Exit/i });
    fireEvent.click(confirmBtn);

    expect(onAbandon).toHaveBeenCalled();
  });
});
