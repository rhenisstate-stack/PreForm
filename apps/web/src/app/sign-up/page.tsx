export const metadata = {
  title: "Create Account | PrepFord NCLEX",
  description:
    "Create a PrepFord NCLEX account to start preparing for your NCLEX-RN or NCLEX-PN exam.",
};

import { Suspense } from "react";
import { SignUpPageClient } from "./page-client";

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center bg-background text-muted-foreground text-sm">
          Loading registration…
        </div>
      }
    >
      <SignUpPageClient />
    </Suspense>
  );
}
