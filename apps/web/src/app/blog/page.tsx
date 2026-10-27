import { Suspense } from "react";
import { BlogPageClient } from "./page-client";

export const metadata = {
  title: "PREform Blog | NCLEX Learning Hub & Clinical Judgment",
  description:
    "Clinical study strategies, Next Gen NCLEX breakdowns, high-alert pharmacology reviews, and evidence-based test preparation guides written by nurse educators.",
};

export default function BlogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center bg-background text-muted-foreground text-sm">
          Loading learning hub…
        </div>
      }
    >
      <BlogPageClient />
    </Suspense>
  );
}
