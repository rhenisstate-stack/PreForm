"use client";

import * as React from "react";
import { ShieldCheck, Lock, AlertTriangle, Eye, EyeOff, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ExamReauthResult {
  sessionId: string;
  user: {
    id: string;
    email: string;
    name: string;
    displayName: string;
    role: string;
    pathway?: string;
  };
  attempt: {
    id: string;
    startedAt: string;
    timeLimitMinutes: number;
    deadlineUtc: string | null;
    remainingSeconds: number | null;
    status: string;
    totalResponses: number;
    responses: Array<{
      questionId: string;
      selectedOptionsJson: string;
      timeSpentSeconds: number;
      answeredAt: string;
    }>;
  };
}

export interface InExamReauthModalProps {
  isOpen: boolean;
  attemptId: string;
  userEmail?: string;
  reasonCode?: string;
  onReauthenticated: (result: ExamReauthResult) => void;
  onAbandon?: () => void;
}

export function InExamReauthModal({
  isOpen,
  attemptId,
  userEmail = "",
  reasonCode = "SESSION_EXPIRED",
  onReauthenticated,
  onAbandon,
}: InExamReauthModalProps) {
  const [email, setEmail] = React.useState(userEmail);
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = React.useState(false);

  const passwordInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail]);

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setPassword("");
      setShowAbandonConfirm(false);
      // Auto-focus the password field
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Non-dismissible modal: intercept and block Escape key
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen]);

  if (!isOpen) return null;

  const getReasonExplanation = (code: string) => {
    switch (code) {
      case "SESSION_IDLE_TIMEOUT":
        return "Your session timed out due to a period of inactivity.";
      case "SESSION_ABSOLUTE_TIMEOUT":
        return "Your session reached its maximum allowable duration.";
      case "SESSION_REVOKED":
        return "Your session was signed out from another device or administratively refreshed.";
      case "SECURITY_VERSION_CHANGED":
        return "Account security credentials were updated. Reauthentication is required.";
      default:
        return "Your sign-in session has expired or requires renewal.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your password to continue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/exam-attempts/${encodeURIComponent(attemptId)}/reauthenticate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.errorCode === "ATTEMPT_EXPIRED") {
          setError("The authoritative time limit for this examination has expired. Continuation is no longer permitted.");
        } else if (data.errorCode === "CONCURRENT_SESSION_LIMIT_EXCEEDED") {
          setError("Concurrent session limit reached. Please close other active sessions before resuming.");
        } else if (data.errorCode === "ATTEMPT_OWNERSHIP_MISMATCH") {
          setError("Access forbidden: This examination belongs to a different candidate account.");
        } else if (data.errorCode === "INVALID_CREDENTIALS") {
          setError("Invalid password. Please check your credentials and try again.");
        } else {
          setError(data.error || "Reauthentication failed. Please try again.");
        }
        return;
      }

      // Successful reauthentication: invoke parent handler
      onReauthenticated(data);
    } catch {
      setError("Network interruption occurred during reauthentication. Please check your connection and retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="in-exam-reauth-title"
      aria-describedby="in-exam-reauth-desc"
      data-testid="in-exam-reauth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()} // Prevent accidental closing via backdrop
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start gap-3.5 border-b border-border pb-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="in-exam-reauth-title" className="font-serif font-bold text-lg text-foreground">
              Session Reauthentication Required
            </h2>
            <p id="in-exam-reauth-desc" className="text-xs text-muted-foreground mt-0.5">
              {getReasonExplanation(reasonCode)}
            </p>
          </div>
        </div>

        {/* Reassurance Banner */}
        <div
          data-testid="reassurance-banner"
          className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3.5 flex items-start gap-3 text-xs text-teal-800 dark:text-teal-200"
        >
          <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Your Examination Progress is Preserved</p>
            <p className="text-muted-foreground leading-relaxed">
              Your examination attempt, persisted answers, and server-authoritative timer are safely preserved. Reauthenticate to continue without leaving this examination.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            data-testid="reauth-error-alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2.5 text-xs text-destructive"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* Reauthentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (Readonly if available, or editable) */}
          <div className="space-y-1.5">
            <label htmlFor="reauth-email" className="text-xs font-semibold text-foreground">
              Candidate Account
            </label>
            <input
              id="reauth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={Boolean(userEmail)}
              required
              className="w-full text-xs rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-foreground disabled:opacity-75 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="reauth-password" className="text-xs font-semibold text-foreground">
              Enter Password to Continue
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                id="reauth-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Account password"
                required
                autoComplete="current-password"
                disabled={isSubmitting}
                className="w-full text-xs rounded-xl border border-border bg-background px-3.5 py-2.5 pr-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {onAbandon && (
                showAbandonConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-destructive font-medium">Abandon attempt?</span>
                    <button
                      type="button"
                      onClick={onAbandon}
                      className="text-xs text-destructive hover:underline font-semibold"
                    >
                      Yes, Exit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAbandonConfirm(false)}
                      className="text-xs text-muted-foreground hover:underline ml-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAbandonConfirm(true)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Abandon Examination
                  </button>
                )
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold px-4 py-2 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verify & Resume Exam</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
