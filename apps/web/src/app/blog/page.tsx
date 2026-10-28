import { Suspense } from "react";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { BlogPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "PrepFord Blog | NCLEX Learning Hub & Clinical Judgment",
  description:
    "Clinical study strategies, Next Gen NCLEX breakdowns, high-alert pharmacology reviews, and evidence-based test preparation guides written by nurse educators.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "PrepFord Blog | NCLEX Learning Hub & Clinical Judgment",
    description:
      "Clinical study strategies, Next Gen NCLEX breakdowns, high-alert pharmacology reviews, and evidence-based test preparation guides written by nurse educators.",
    url: "/blog",
    siteName: BRAND.fullName,
    type: "website",
  },
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
