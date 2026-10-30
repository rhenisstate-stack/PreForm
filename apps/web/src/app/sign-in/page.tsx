import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInPageClient } from "./page-client";
import { AuthLoadingSkeleton } from "@/components/auth/auth-loading-skeleton";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your PrepFord NCLEX account to access your learning dashboard, practice questions, and subscription.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
          <AuthLoadingSkeleton variant="sign-in" message="Loading PrepFord sign in…" />
        </div>
      }
    >
      <SignInPageClient />
    </Suspense>
  );
}
