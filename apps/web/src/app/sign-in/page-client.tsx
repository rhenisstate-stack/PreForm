"use client";

import * as React from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignInPageClient() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);

    // Simulate authenticating against backend contract
    setTimeout(() => {
      setIsLoading(false);
      // Inform candidate of scaffold status as documented in decisions.md
      setErrorMessage(
        "Account services are currently in preview mode. Live student authentication will be available in Phase 4."
      );
    }, 800);
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] flex items-stretch bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col lg:grid lg:grid-cols-12">
        {/* Left Information & Brand Panel (Archer Review inspired) */}
        <div className="relative hidden lg:col-span-5 lg:flex lg:flex-col lg:justify-between bg-[#142B4A] p-10 xl:p-14 text-white overflow-hidden">
          {/* Subtle decorative background glow */}
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#0D9488]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#0D9488]/15 blur-3xl pointer-events-none" />

          {/* Top Brand Identity */}
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-2.5 text-2xl font-serif font-bold text-white mb-12">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0D9488] text-white font-serif font-bold text-xl shadow-md">
                P
              </span>
              <span className="tracking-tight">PREform <span className="text-xs font-sans font-bold tracking-widest text-[#0D9488] uppercase">NCLEX</span></span>
            </Link>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0D9488]/20 border border-[#0D9488]/30 px-3 py-1 text-xs font-semibold text-[#14B8A6] mb-4">
              <ShieldCheck className="h-3.5 w-3.5" />
              Focused Clinical Learning
            </span>

            <h1 className="text-3xl xl:text-4xl font-serif font-semibold leading-tight text-white">
              Welcome back to your NCLEX preparation studio.
            </h1>

            <p className="mt-4 text-base text-slate-300 leading-relaxed">
              Continue your structured journey toward licensure with original Next Gen NCLEX items, detailed clinical rationales, and category mastery tracking.
            </p>

            {/* Platform Highlights */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0D9488]/25 text-[#14B8A6]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Original Clinical Questions</h3>
                  <p className="text-xs text-slate-300 mt-0.5">High-yield RN and PN practice questions built around client need categories.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0D9488]/25 text-[#14B8A6]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Next Generation Case Studies</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Realistic clinical judgment scenarios reflecting the updated NCSBN exam model.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0D9488]/25 text-[#14B8A6]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Transparent Progress Tracking</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Objective analytics that highlight strengths and target knowledge gaps.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Candidate Reassurance Card */}
          <div className="relative z-10 mt-12 rounded-xl bg-white/5 border border-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0D9488] text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Built for Nursing Candidates</p>
                <p className="text-[11px] text-slate-300">Dedicated pathways for NCLEX-RN and NCLEX-PN.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Authentication Panel */}
        <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 md:px-12 lg:col-span-7 xl:px-16">
          <div className="mx-auto w-full max-w-md">
            {/* Mobile Header Branding */}
            <div className="mb-8 lg:hidden text-center">
              <Link href="/" className="inline-flex items-center gap-2 text-xl font-serif font-bold text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-white font-serif font-bold text-lg shadow-sm">
                  P
                </span>
                <span>PREform <span className="text-xs font-sans font-bold text-secondary uppercase">NCLEX</span></span>
              </Link>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-tight text-foreground">
                Sign in to your account
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your registered email and password to access your study portal.
              </p>
            </div>

            {/* Error / Status Alert */}
            {errorMessage && (
              <div
                className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
                role="alert"
              >
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-foreground"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-medium text-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-md border border-input bg-background pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                  />
                  <span>Remember this device</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 font-medium shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Signing in…
                  </span>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Don&rsquo;t have an account yet?{" "}
                <Link
                  href="/sign-up"
                  className="font-semibold text-secondary hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Information Dialog */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-serif font-semibold text-foreground">Password Recovery</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Self-service password reset will be activated with the Phase 4 authentication service. Please contact our support team at{" "}
              <Link href="/contact" className="text-secondary underline" onClick={() => setShowForgotModal(false)}>
                our contact page
              </Link>{" "}
              if you require assistance.
            </p>
            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForgotModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
