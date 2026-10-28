import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInPageClient } from "./page-client";

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
        <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center bg-background text-muted-foreground text-sm">
          Loading sign in…
        </div>
      }
    >
      <SignInPageClient />
    </Suspense>
  );
}
