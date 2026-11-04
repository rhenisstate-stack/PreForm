import type { Metadata } from "next";
import { Suspense } from "react";
import { SecuritySettingsClient } from "./page-client";

export const metadata: Metadata = {
  title: "Account Security & Device Management | PrepFord NCLEX",
  description: "View and manage your active PrepFord sessions, signed-in devices, and account security history.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SecuritySettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto" />
            <p className="text-sm text-muted-foreground">Loading security settings...</p>
          </div>
        </div>
      }
    >
      <SecuritySettingsClient />
    </Suspense>
  );
}
