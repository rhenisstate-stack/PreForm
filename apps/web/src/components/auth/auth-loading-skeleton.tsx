"use client";

import * as React from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { ECGHeartbeat } from "@/components/auth/ecg-heartbeat";
import { BRAND } from "@/lib/brand";

interface AuthLoadingSkeletonProps {
  message?: string;
  variant?: "sign-in" | "sign-up" | "generic";
  className?: string;
}

export function AuthLoadingSkeleton({
  message = "Authenticating with PrepFord clinical portal…",
  variant = "sign-in",
  className = "",
}: AuthLoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full max-w-md mx-auto space-y-6 ${className}`}
      data-testid="auth-loading-skeleton"
    >
      <span className="sr-only">{message}</span>

      {/* Brand Logo & Animated Pulse Badge */}
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-2 rounded-2xl bg-teal-500/20 blur-md animate-pulse" />
          <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-teal-500/30 bg-background/80 p-1.5 shadow-md">
            <Image
              src={BRAND.logo.assetPath}
              alt={BRAND.logo.alt}
              width={56}
              height={56}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>

        {/* Live ECG wave strip */}
        <div className="w-full max-w-[280px] h-10 px-2 py-1 rounded-lg bg-slate-900/40 dark:bg-slate-950/60 border border-teal-500/20">
          <ECGHeartbeat height={40} width={280} showCardioGlow={false} />
        </div>

        <p className="text-xs font-medium text-teal-600 dark:text-teal-400 tracking-wide uppercase">
          {message}
        </p>
      </div>

      {/* Form Skeletons reflecting Sign-In or Sign-Up composition */}
      <div className="space-y-4 pt-2">
        <div className="space-y-2 text-center sm:text-left">
          <Skeleton className="h-7 w-48 mx-auto sm:mx-0 rounded-lg" />
          <Skeleton className="h-4 w-72 mx-auto sm:mx-0 rounded-md" />
        </div>

        {/* Third-party button skeleton */}
        <Skeleton className="h-10 w-full rounded-md" />

        {/* Divider skeleton */}
        <div className="flex items-center gap-3 py-1">
          <Skeleton className="h-[1px] flex-1" />
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-[1px] flex-1" />
        </div>

        {/* Form fields */}
        {variant === "sign-up" && (
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        )}

        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {variant === "sign-up" && (
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36 rounded" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-16 rounded" />
            {variant === "sign-in" && <Skeleton className="h-3 w-24 rounded" />}
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {variant === "sign-up" && (
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        )}

        {/* Primary CTA Skeleton */}
        <Skeleton className="h-11 w-full rounded-xl mt-3" />
      </div>
    </div>
  );
}
