"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import {
  signUpFormSchema,
  sanitizeReturnUrl,
  normalizeFullName,
  getEmailValidationError,
  type SignUpFormInput,
} from "@/lib/validation/auth";
import { useAuth } from "@/lib/auth-context";
import { BRAND } from "@/lib/brand";
import { notify } from "@/lib/notifications";
import { mapAuthErrorCode, sanitizeErrorMessage } from "@/lib/error-mapping";

function getGoogleErrorMessage(errorParam: string | null): string | null {
  if (!errorParam) return null;
  return (
    mapAuthErrorCode(errorParam) ||
    "Google sign-in is temporarily unavailable. Please try again later or sign in using your email and password."
  );
}

export function SignUpPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerUser } = useAuth();
  const errorParam = searchParams.get("error");
  const urlError = React.useMemo(() => getGoogleErrorMessage(errorParam), [errorParam]);

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (urlError) {
      notify.error(urlError, { id: "signup-url-error" });
    }
  }, [urlError]);

  const displayError = errorMessage || urlError;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormInput>({
    resolver: zodResolver(signUpFormSchema as unknown as Parameters<typeof zodResolver>[0]),
    defaultValues: {
      fullName: "",
      email: "",
      pathway: "rn",
      password: "",
      confirmPassword: "",
      agreeTerms: false as unknown as true,
    },
    mode: "onTouched",
  });

  const currentPathway = watch("pathway");
  const currentPassword = watch("password");
  const currentEmail = watch("email");

  const contextualEmailHint = React.useMemo(() => {
    if (!currentEmail || errors.email) return null;
    return getEmailValidationError(currentEmail);
  }, [currentEmail, errors.email]);

  const onSubmit = async (data: SignUpFormInput) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const normalizedData = {
        ...data,
        fullName: normalizeFullName(data.fullName),
      };

      const result = await registerUser(normalizedData);
      if (result.success) {
        notify.success("Account created successfully! Welcome to PrepFord.");
        const rawReturn = searchParams.get("from") || searchParams.get("returnUrl");
        // Newly registered learners land directly on their learner workspace.
        const from = sanitizeReturnUrl(rawReturn, "/dashboard");
        router.push(from);
        router.refresh();
      } else {
        const cleanMsg = sanitizeErrorMessage(result.error, "Failed to create account. Please review your details.");
        setErrorMessage(cleanMsg);
        notify.error(cleanMsg);
      }
    } catch {
      const netMsg = "We are temporarily unable to reach the authentication service. Please try again shortly.";
      setErrorMessage(netMsg);
      notify.error(netMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:grid lg:grid-cols-12 bg-background">
      {/* Left Column: Brand Storytelling & Interactive Visual (50-55% desktop width) */}
      <AuthBrandPanel mode="sign-up" />

      {/* Right Column: Authentication Form (45-50% desktop width) */}
      <div className="relative flex flex-1 flex-col justify-between px-6 py-8 sm:px-10 md:px-14 lg:col-span-6 xl:col-span-5 min-h-screen">
        {/* Top Bar with Theme Switcher and Compact Mobile Brand Mark */}
        <div className="flex items-center justify-between w-full mb-6">
          <div className="lg:hidden">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-xl font-serif font-bold text-foreground"
              aria-label="PrepFord home"
            >
              <div className="h-10 w-10 rounded-xl bg-muted p-1 border border-border shadow-xs flex items-center justify-center shrink-0">
                <Image
                  src={BRAND.logo.assetPath}
                  alt={BRAND.logo.alt}
                  width={40}
                  height={40}
                  className="h-full w-full object-contain"
                />
              </div>
              <span
                data-testid="brand-wordmark-stacked-mobile"
                className="flex flex-col font-serif tracking-tight font-bold leading-none text-left -space-y-0.5 justify-center"
              >
                <span className="text-base leading-none text-secondary">Prep</span>
                <span className="text-base leading-none text-foreground">Ford</span>
              </span>
            </Link>
          </div>

          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </div>

        {/* Center Form Container */}
        <div className="mx-auto w-full max-w-md my-auto py-4">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-tight text-foreground">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Select your examination pathway and create your credentials to begin your study journey.
            </p>
          </div>

          {/* Accessible Error / Status Alert */}
          {displayError && (
            <div
              className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive dark:border-destructive/30 dark:bg-destructive/15"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
                <p className="leading-snug font-medium">{displayError}</p>
              </div>
            </div>
          )}

          {/* Google Authentication Option */}
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

          {/* Registration Form */}
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
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
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
                  className={`w-full rounded-lg border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-xs ${
                    errors.fullName ? "border-destructive focus-visible:ring-destructive" : "border-input"
                  }`}
                />
              </div>
              {errors.fullName && (
                <p id="fullName-error" className="flex items-center gap-1.5 text-xs text-destructive mt-1.5 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
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
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
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
                  className={`w-full rounded-lg border bg-background pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-xs ${
                    errors.email ? "border-destructive focus-visible:ring-destructive" : "border-input"
                  }`}
                />
              </div>
              {errors.email ? (
                <p id="email-error" className="flex items-center gap-1.5 text-xs text-destructive mt-1.5 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.email.message}</span>
                </p>
              ) : contextualEmailHint ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 pl-1">
                  {contextualEmailHint}
                </p>
              ) : null}
            </div>

            {/* Examination Pathway Selection Cards */}
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
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                    currentPathway === "rn"
                      ? "border-secondary bg-secondary/10 ring-1 ring-secondary shadow-xs"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                      NCLEX-RN
                    </span>
                    {currentPathway === "rn" && <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />}
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
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                    currentPathway === "pn"
                      ? "border-secondary bg-secondary/10 ring-1 ring-secondary shadow-xs"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                      NCLEX-PN
                    </span>
                    {currentPathway === "pn" && <CheckCircle2 className="h-4 w-4 text-secondary shrink-0" />}
                  </div>
                  <span className="text-xs font-medium text-foreground mt-1">
                    Practical / Vocational
                  </span>
                </button>
              </div>
              {errors.pathway && (
                <p className="flex items-center gap-1.5 text-xs text-destructive mt-1.5 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.pathway.message}</span>
                </p>
              )}
            </div>

            {/* Create Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                Create password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
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
                  className={`w-full rounded-lg border bg-background pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-xs ${
                    errors.password ? "border-destructive focus-visible:ring-destructive" : "border-input"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
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
                <p id="password-error" className="flex items-center gap-1.5 text-xs text-destructive mt-1.5 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.password.message}</span>
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-foreground"
              >
                Confirm password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                  {...register("confirmPassword")}
                  className={`w-full rounded-lg border bg-background pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors shadow-xs ${
                    errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : "border-input"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="flex items-center gap-1.5 text-xs text-destructive mt-1.5 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.confirmPassword.message}</span>
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
                <span className="leading-normal">
                  I agree to the{" "}
                  <Link href="/terms-and-conditions" className="text-secondary hover:underline font-medium">
                    Terms and Conditions
                  </Link>{" "}
                  and acknowledge the{" "}
                  <Link href="/privacy-policy" className="text-secondary hover:underline font-medium">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {errors.agreeTerms && (
                <p id="terms-error" className="flex items-center gap-1.5 text-xs text-destructive mt-1.5 pl-6 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.agreeTerms.message}</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 font-medium rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 mt-2 h-11"
            >
              {isLoading || isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  <span>Creating account…</span>
                </span>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Switch to Sign-In */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href={(() => {
                  const rawReturn = searchParams.get("from") || searchParams.get("returnUrl");
                  const safeFrom = sanitizeReturnUrl(rawReturn, "");
                  return safeFrom ? `/sign-in?from=${encodeURIComponent(safeFrom)}` : "/sign-in";
                })()}
                className="font-semibold text-secondary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Legal Links */}
        <div className="mt-auto pt-6 text-center text-xs text-muted-foreground">
          <span>Official NCLEX-RN® and NCLEX-PN® Candidate Portal • </span>
          <Link href="/terms-and-conditions" className="hover:text-foreground underline underline-offset-2">
            Terms of Use
          </Link>
          <span> • </span>
          <Link href="/privacy-policy" className="hover:text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
