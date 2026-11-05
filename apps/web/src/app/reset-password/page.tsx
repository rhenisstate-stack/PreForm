"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [validating, setValidating] = React.useState(true);
  const [tokenValid, setTokenValid] = React.useState(false);
  const [maskedEmail, setMaskedEmail] = React.useState<string | null>(null);
  const [tokenError, setTokenError] = React.useState<string | null>(null);

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setValidating(false);
      setTokenValid(false);
      setTokenError("Missing password reset token. Please request a new link.");
      return;
    }

    async function checkToken() {
      try {
        const res = await fetch("/api/auth/validate-reset-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (res.ok && data.valid) {
          setTokenValid(true);
          setMaskedEmail(data.maskedEmail || null);
        } else {
          setTokenValid(false);
          setTokenError(data.error || "The reset link is invalid or has expired.");
        }
      } catch {
        setTokenValid(false);
        setTokenError("Unable to verify reset link. Please check your connection.");
      } finally {
        setValidating(false);
      }
    }

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (newPassword.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Password reset failed.");
      }

      setSubmitSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset password.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="text-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">Verifying reset token security...</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="space-y-6 text-center">
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl space-y-2">
          <ShieldAlert className="h-8 w-8 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold text-destructive">Invalid or Expired Link</h2>
          <p className="text-xs text-muted-foreground">
            {tokenError || "This password reset token is no longer valid. For your security, reset links expire after 15 minutes and can only be used once."}
          </p>
        </div>

        <Button asChild className="w-full">
          <Link href="/forgot-password">Request a New Reset Link</Link>
        </Button>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
            Password Reset Successful
          </h2>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            Your password has been changed. All previous active sessions have been securely terminated.
          </p>
        </div>

        <Button asChild className="w-full">
          <Link href="/sign-in">Sign In Now</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {maskedEmail && (
        <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground text-center">
          Resetting password for: <span className="font-semibold text-foreground">{maskedEmail}</span>
        </div>
      )}

      {formError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
          {formError}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
          New Password
        </label>
        <div className="relative">
          <Input
            id="newPassword"
            type="password"
            required
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="pl-10"
            disabled={submitting}
            autoComplete="new-password"
          />
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
          Confirm Password
        </label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type="password"
            required
            placeholder="Re-type new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-10"
            disabled={submitting}
            autoComplete="new-password"
          />
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating password...
          </>
        ) : (
          "Save New Password"
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md bg-card border rounded-2xl shadow-sm p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Set new password</h1>
          <p className="text-sm text-muted-foreground">
            Please enter and confirm your new secure password.
          </p>
        </div>

        <React.Suspense fallback={<div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}>
          <ResetPasswordContent />
        </React.Suspense>
      </div>
    </div>
  );
}
