"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { useAuth } from "@/lib/auth-context";

function getGoogleErrorMessage(errorParam: string | null): string | null {
  if (errorParam === "google_not_configured") {
    return "Google authentication is not yet configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment.";
  }
  if (errorParam === "google_cancelled") {
    return "Google registration was cancelled or consent was not granted. Please try again.";
  }
  if (errorParam === "state_mismatch" || errorParam === "csrf_detected") {
    return "Security verification failed (state mismatch). Please try again.";
  }
  if (errorParam === "token_exchange_failed" || errorParam === "auth_failed") {
    return "Unable to complete Google registration at this time. Please try creating an account with email.";
  }
  return null;
}

export function SignUpPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerUser } = useAuth();
  const errorParam = searchParams.get("error");
  const urlError = React.useMemo(() => getGoogleErrorMessage(errorParam), [errorParam]);

  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const displayError = errorMessage || urlError;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema as unknown as Parameters<typeof zodResolver>[0]),
    defaultValues: {
      fullName: "",
      email: "",
      pathway: "rn",
      password: "",
      agreeTerms: false as unknown as true,
    },
    mode: "onTouched",
  });

  const currentPathway = watch("pathway");
  const currentPassword = watch("password");

  const onSubmit = async (data: SignUpInput) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await registerUser(data);
      if (result.success) {
        const from = searchParams.get("from") || searchParams.get("returnUrl") || "/courses";
        router.push(from);
        router.refresh();
      } else {
        setErrorMessage(result.error || "Failed to create account. Please check your details.");
      }
    } catch {
      setErrorMessage("An unexpected network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
            <Link href="/" className="inline-flex items-center gap-2.5 text-2xl font-serif font-bold text-white mb-12" aria-label="PrepFord home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/prepford-logo.jpg"
                alt="PrepFord logo"
                className="h-9 w-9 rounded-lg object-contain shadow-md border border-white/20"
                width={36}
                height={36}
              />
              <span className="tracking-tight">PrepFord</span>
            </Link>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0D9488]/20 border border-[#0D9488]/30 px-3 py-1 text-xs font-semibold text-[#14B8A6] mb-4">
              <ShieldCheck className="h-3.5 w-3.5" />
              Comprehensive Licensure Preparation
            </span>

            <h1 className="text-3xl xl:text-4xl font-serif font-semibold leading-tight text-white">
              Structured preparation engineered for first-time pass rates.
            </h1>

            <p className="mt-4 text-base text-slate-300 leading-relaxed">
              Join nursing students preparing for RN and PN licensure with rigorous Next Gen practice, adaptive performance tracking, and verified clinical rationales.
            </p>

            {/* Platform Highlights */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0D9488]/25 text-[#14B8A6]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Targeted Examination Pathways</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Custom question pools tailored specifically to either NCLEX-RN or NCLEX-PN.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0D9488]/25 text-[#14B8A6]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Clinical Judgment Mastery</h3>
                  <p className="text-xs text-slate-300 mt-0.5">NGN item formats: matrix, bowtie, drop-down, and 6-question clinical case studies.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0D9488]/25 text-[#14B8A6]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Readiness Predictors</h3>
                  <p className="text-xs text-slate-300 mt-0.5">Benchmark your category performance before stepping into the testing center.</p>
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
                <p className="text-xs font-semibold text-white">Free Trial Included</p>
                <p className="text-[11px] text-slate-300">Test sample questions immediately after registration.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Authentication Panel */}
        <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 md:px-12 lg:col-span-7 xl:px-16">
          <div className="mx-auto w-full max-w-md">
            {/* Mobile Header Branding */}
            <div className="mb-8 lg:hidden text-center">
              <Link href="/" className="inline-flex items-center gap-2 text-xl font-serif font-bold text-foreground" aria-label="PrepFord home">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/prepford-logo.jpg"
                  alt="PrepFord logo"
                  className="h-8 w-8 rounded-lg object-contain shadow-xs border border-border/50"
                  width={32}
                  height={32}
                />
                <span>PrepFord</span>
              </Link>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-tight text-foreground">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Select your licensure track and register to begin your exam preparation.
              </p>
            </div>

            {/* Error / Status Alert */}
            {displayError && (
              <div
                className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">{displayError}</p>
                </div>
              </div>
            )}

            {/* Google Authentication */}
            <div className="mb-6">
              <GoogleAuthButton source="sign-up" />
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 font-medium text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Jane Doe"
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? "fullName-error" : undefined}
                    {...register("fullName")}
                    className={`w-full rounded-md border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-sm ${
                      errors.fullName ? "border-destructive focus-visible:ring-destructive" : "border-input"
                    }`}
                  />
                </div>
                {errors.fullName && (
                  <p id="fullName-error" className="flex items-center gap-1 text-xs text-destructive mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{errors.fullName.message}</span>
                  </p>
                )}
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
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    {...register("email")}
                    className={`w-full rounded-md border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-sm ${
                      errors.email ? "border-destructive focus-visible:ring-destructive" : "border-input"
                    }`}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="flex items-center gap-1 text-xs text-destructive mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{errors.email.message}</span>
                  </p>
                )}
              </div>

              {/* Exam Pathway Selection Cards */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Examination pathway
                </label>
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Examination pathway">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={currentPathway === "rn"}
                    onClick={() => setValue("pathway", "rn", { shouldValidate: true })}
                    className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                      currentPathway === "rn"
                        ? "border-secondary bg-secondary/10 ring-1 ring-secondary"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                        NCLEX-RN
                      </span>
                      {currentPathway === "rn" && <CheckCircle2 className="h-4 w-4 text-secondary" />}
                    </div>
                    <span className="text-xs font-medium text-foreground mt-1">
                      Registered Nurse
                    </span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={currentPathway === "pn"}
                    onClick={() => setValue("pathway", "pn", { shouldValidate: true })}
                    className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                      currentPathway === "pn"
                        ? "border-secondary bg-secondary/10 ring-1 ring-secondary"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                        NCLEX-PN
                      </span>
                      {currentPathway === "pn" && <CheckCircle2 className="h-4 w-4 text-secondary" />}
                    </div>
                    <span className="text-xs font-medium text-foreground mt-1">
                      Practical / Vocational
                    </span>
                  </button>
                </div>
                {errors.pathway && (
                  <p className="flex items-center gap-1 text-xs text-destructive mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{errors.pathway.message}</span>
                  </p>
                )}
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
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby="password-strength password-error"
                    {...register("password")}
                    className={`w-full rounded-md border bg-background pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-sm ${
                      errors.password ? "border-destructive focus-visible:ring-destructive" : "border-input"
                    }`}
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

                {/* zxcvbn password-strength meter & feedback */}
                <PasswordStrengthIndicator password={currentPassword} id="password-strength" />

                {errors.password && (
                  <p id="password-error" className="flex items-center gap-1 text-xs text-destructive mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{errors.password.message}</span>
                  </p>
                )}
              </div>

              {/* Terms and Privacy Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    aria-invalid={Boolean(errors.agreeTerms)}
                    aria-describedby={errors.agreeTerms ? "terms-error" : undefined}
                    {...register("agreeTerms")}
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
                {errors.agreeTerms && (
                  <p id="terms-error" className="flex items-center gap-1 text-xs text-destructive mt-1.5 pl-6">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{errors.agreeTerms.message}</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 font-medium shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading || isSubmitting ? (
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
