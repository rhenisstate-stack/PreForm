"use client";

import * as React from "react";
import Image from "next/image";
import { BRAND } from "@/lib/brand";

interface BrandedLoadingProps {
  message?: string;
  progressPercent?: number; // Genuine measurable percentage only, undefined for indeterminate
  fullScreen?: boolean;
}

export function BrandedLoading({
  message = "Loading your PrepFord workspace...",
  progressPercent,
  fullScreen = true,
}: BrandedLoadingProps) {
  const isDeterminate = typeof progressPercent === "number" && progressPercent >= 0 && progressPercent <= 100;

  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-4 transition-all"
    : "flex flex-col items-center justify-center p-8 transition-all";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={containerClasses}
    >
      <div className="relative mb-6 flex items-center justify-center">
        {/* Glow backdrop ring */}
        <div className="absolute h-24 w-24 rounded-2xl bg-secondary/15 blur-xl motion-safe:animate-pulse" />
        
        {/* PrepFord Verified Brand Logo */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card p-2 shadow-lg">
          <Image
            src={BRAND.logo.assetPath}
            alt={BRAND.logo.alt}
            width={72}
            height={72}
            priority
            className="h-full w-full rounded-xl object-contain"
          />
        </div>
      </div>

      {/* Brand Title */}
      <div className="text-center">
        <h2 className="text-xl font-serif font-bold text-foreground tracking-tight">
          {BRAND.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground font-medium">
          {message}
        </p>
      </div>

      {/* Progress Bar: Genuine Measurable OR Indeterminate */}
      <div className="mt-6 w-56 sm:w-64">
        {isDeterminate ? (
          <div className="space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-secondary transition-all duration-300 ease-out"
                style={{ width: `${Math.round(progressPercent)}%` }}
              />
            </div>
            <p className="text-right text-xs font-mono text-muted-foreground">
              {Math.round(progressPercent)}%
            </p>
          </div>
        ) : (
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-secondary motion-safe:animate-[indeterminate_1.5s_infinite_ease-in-out]" />
          </div>
        )}
      </div>

      <span className="sr-only">
        {isDeterminate ? `${message} (${Math.round(progressPercent)}% complete)` : message}
      </span>
    </div>
  );
}
