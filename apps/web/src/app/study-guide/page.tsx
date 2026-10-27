import { Suspense } from "react";
import { StudyGuideIndexClient } from "./page-client";

export const metadata = {
  title: "PrepFord Study Guide & Clinical Nursing Notes | NCLEX-RN & NCLEX-PN",
  description:
    "Free clinical nursing study notes and high-yield NCLEX revision guides organized by category: Med-Surg, Pharmacology, Maternal-Newborn, Pediatrics, Mental Health, Fundamentals, and Delegation.",
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
