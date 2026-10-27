import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfilePageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Candidate Profile & Study Access | PrepFord NCLEX",
  description: "Manage your NCLEX candidate credentials, pathway target, active subscriptions, and account security.",
};

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
            <p className="text-sm text-muted-foreground">Loading candidate profile...</p>
          </div>
        </div>
      }
    >
      <ProfilePageClient />
    </Suspense>
  );
}
