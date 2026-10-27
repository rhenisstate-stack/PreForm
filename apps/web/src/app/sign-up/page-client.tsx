"use client";

import * as React from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignUpPageClient() {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pathway, setPathway] = React.useState<"rn" | "pn">("rn");
  const [agreeTerms, setAgreeTerms] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("Please accept the Terms and Conditions and Privacy Policy.");
      return;
    }

    setIsLoading(true);

    // Simulate registration processing against backend contract
    setTimeout(() => {
      setIsLoading(false);
      setErrorMessage(
        "Platform registration is currently in scaffold preview. Full candidate onboarding will open in Phase 4."
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
              Evidence-Based Preparation
            </span>

            <h1 className="text-3xl xl:text-4xl font-serif font-semibold leading-tight text-white">
              Start your journey to NCLEX licensure with confidence.
            </h1>

            <p className="mt-4 text-base text-slate-300 leading-relaxed">
              Prepare for the NCLEX-RN or NCLEX-PN with high-yield questions, Next Generation clinical case studies, and transparent readiness feedback.
            </p>

            {/* Platform Highlights */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0D9488]/25 text-[#14B8A6]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Dedicated Exam Pathways</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Specialized question banks tailored specifically to RN or PN scope of practice.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0D9488]/25 text-[#14B8A6]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">In-Depth Clinical Rationales</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Clear explanations for correct and incorrect options to develop true diagnostic reasoning.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0D9488]/25 text-[#14B8A6]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">No Inflated Guarantees</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Transparent readiness scoring based directly on client-needs category mastery.</p>
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
                <p className="text-xs font-semibold text-white">NCSBN Blueprint Aligned</p>
                <p className="text-[11px] text-slate-300">Covers Safe and Effective Care, Health Promotion, Psychosocial, and Physiological Integrity.</p>
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
                Create your account
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Select your licensure track and register to begin your exam preparation.
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
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Full Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-foreground"
                >
                  Full name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    required
                    className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-sm"
                  />
                </div>
              </div>

              {/* Email Address */}
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

              {/* Exam Pathway Selection Cards */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Examination pathway
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPathway("rn")}
                    className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                      pathway === "rn"
                        ? "border-secondary bg-secondary/10 ring-1 ring-secondary"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                        NCLEX-RN
                      </span>
                      {pathway === "rn" && <CheckCircle2 className="h-4 w-4 text-secondary" />}
                    </div>
                    <span className="text-xs font-medium text-foreground mt-1">
                      Registered Nurse
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPathway("pn")}
                    className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                      pathway === "pn"
                        ? "border-secondary bg-secondary/10 ring-1 ring-secondary"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                        NCLEX-PN
                      </span>
                      {pathway === "pn" && <CheckCircle2 className="h-4 w-4 text-secondary" />}
                    </div>
                    <span className="text-xs font-medium text-foreground mt-1">
                      Practical / Vocational
                    </span>
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  Create password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
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
                <p className="text-[11px] text-muted-foreground">
                  Must be at least 8 characters long.
                </p>
              </div>

              {/* Terms and Privacy Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring shrink-0"
                  />
                  <span>
                    I agree to the{" "}
                    <Link href="/terms-and-conditions" className="text-secondary hover:underline font-medium">
                      Terms and Conditions
                    </Link>{" "}
                    and have read the{" "}
                    <Link href="/privacy-policy" className="text-secondary hover:underline font-medium">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 font-medium shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Creating account…
                  </span>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="font-semibold text-secondary hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
