import type { Metadata } from "next";
import { Suspense } from "react";
import { LearnerVideosClient } from "./page-client";
import { BrandedLoading } from "@/components/layout/branded-loading";

export const metadata: Metadata = {
  title: "Clinical Video Lectures & Media Library",
  description: "Watch high-yield NCLEX clinical judgment lectures, pharmacology breakdowns, and prioritization case studies with progress tracking.",
};

export default function LearnerVideosPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-16 flex items-center justify-center">
          <BrandedLoading message="Loading video library..." fullScreen={false} />
        </div>
      }
    >
      <LearnerVideosClient />
    </Suspense>
  );
}
