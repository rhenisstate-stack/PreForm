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
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import {
  signInSchema,
  sanitizeReturnUrl,
  getEmailValidationError,
  type SignInInput,
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

export function SignInPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const errorParam = searchParams.get("error");
  const urlError = React.useMemo(() => getGoogleErrorMessage(errorParam), [errorParam]);

  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = React.useState(false);

  React.useEffect(() => {
    if (urlError) {
      notify.error(urlError, { id: "auth-url-error" });
    }
  }, [urlError]);

  const displayError = errorMessage || urlError;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema as unknown as Parameters<typeof zodResolver>[0]),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    mode: "onTouched",
  });

  const currentEmail = watch("email");
  const contextualEmailHint = React.useMemo(() => {
    if (!currentEmail || errors.email) return null;
    return getEmailValidationError(currentEmail);
  }, [currentEmail, errors.email]);

  const onSubmit = async (data: SignInInput) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await login(data);
      if (result.success) {
        notify.success("Signed in successfully. Welcome back!");
        const rawReturn = searchParams.get("from") || searchParams.get("returnUrl");
        const targetDestination = sanitizeReturnUrl(rawReturn, "/dashboard");
        router.push(targetDestination);
        router.refresh();
      } else {
        const cleanMsg = sanitizeErrorMessage(result.error, "The email or password is incorrect.");
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
      <AuthBrandPanel mode="sign-in" />

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
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Enter your registered email and password to access your study portal.
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
            <GoogleAuthButton source="sign-in" />
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

          {/* Sign-In Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

            {/* Password */}
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
                  className="text-xs font-medium text-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
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
              {errors.password && (
                <p id="password-error" className="flex items-center gap-1.5 text-xs text-destructive mt-1.5 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.password.message}</span>
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-muted-foreground select-none">
                <input
                  type="checkbox"
                  {...register("rememberMe")}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                />
                <span>Remember this device</span>
              </label>
            </div>

            {/* Submit CTA */}
            <Button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 font-medium rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 mt-2 h-11"
            >
              {isLoading || isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  <span>Signing in…</span>
                </span>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Switch to Sign-Up */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Don&rsquo;t have an account yet?{" "}
              <Link
                href={(() => {
                  const rawReturn = searchParams.get("from") || searchParams.get("returnUrl");
                  const safeFrom = sanitizeReturnUrl(rawReturn, "");
                  return safeFrom ? `/sign-up?from=${encodeURIComponent(safeFrom)}` : "/sign-up";
                })()}
                className="font-semibold text-secondary hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Legal Links */}
        <div className="mt-auto pt-6 text-center text-xs text-muted-foreground">
          <span>By signing in, you agree to our </span>
          <Link href="/terms-and-conditions" className="hover:text-foreground underline underline-offset-2">
            Terms of Service
          </Link>
          <span> and </span>
          <Link href="/privacy-policy" className="hover:text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>
          <span>.</span>
        </div>
      </div>

      {/* Forgot Password Recovery Dialog */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-serif font-semibold text-foreground">Password Recovery</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Self-service password reset will be activated with the Phase 4 authentication service. Please contact our candidate support team at{" "}
              <Link
                href="/contact"
                className="text-secondary underline"
                onClick={() => setShowForgotModal(false)}
              >
                our contact page
              </Link>{" "}
              if you require immediate assistance.
            </p>
            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForgotModal(false)}
                className="rounded-lg"
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
