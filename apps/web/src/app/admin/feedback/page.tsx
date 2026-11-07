import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminFeedbackClient } from "./page-client";
import { BrandedLoading } from "@/components/layout/branded-loading";

export const metadata: Metadata = {
  title: "Feedback & Issue Moderation",
  description: "Review and resolve candidate question challenges, clinical suggestions, and technical bug reports.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-16 flex items-center justify-center">
          <BrandedLoading message="Loading feedback moderation..." fullScreen={false} />
        </div>
      }
    >
      <AdminFeedbackClient />
    </Suspense>
  );
}
