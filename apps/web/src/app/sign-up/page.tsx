import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpPageClient } from "./page-client";
import { AuthLoadingSkeleton } from "@/components/auth/auth-loading-skeleton";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a PrepFord NCLEX account to start preparing for your NCLEX-RN or NCLEX-PN exam.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
          <AuthLoadingSkeleton variant="sign-up" message="Loading PrepFord registration…" />
        </div>
      }
    >
      <SignUpPageClient />
    </Suspense>
  );
}
