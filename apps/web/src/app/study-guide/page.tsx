import type { Metadata } from "next";
import { Suspense } from "react";
import { StudyGuideIndexClient } from "./page-client";

export const metadata: Metadata = {
  title: {
    absolute: "Nursing Study Guide & Notes | PrepFord",
  },
  description:
    "Browse PrepFord's available nursing study notes and subject-based learning resources.",
  alternates: {
    canonical: "/study-guide",
  },
  openGraph: {
    title: "Nursing Study Guide & Notes | PrepFord",
    description:
      "Browse PrepFord's available nursing study notes and subject-based learning resources.",
    url: "/study-guide",
    type: "website",
  },
};

export default function StudyGuidePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center bg-background text-muted-foreground text-sm">
          Loading clinical study guide…
        </div>
      }
    >
      <StudyGuideIndexClient />
    </Suspense>
  );
}
