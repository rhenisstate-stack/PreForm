export const metadata = {
  title: "Sign In | PREform NCLEX",
  description:
    "Sign in to your Preform NCLEX account to access your learning dashboard, practice questions, and subscription.",
};

import { Suspense } from "react";
import { SignInPageClient } from "./page-client";

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
