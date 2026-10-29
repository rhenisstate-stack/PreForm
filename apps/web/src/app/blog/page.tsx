import { Suspense } from "react";
import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { BlogPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "PrepFord Nursing Insights | NCLEX Learning Hub & Clinical Judgment",
  description:
    "Editorial guides on Next Generation NCLEX case studies, clinical judgment frameworks, high-alert pharmacology reviews, and evidence-based study strategies written by nurse educators.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "PrepFord Nursing Insights | NCLEX Learning Hub & Clinical Judgment",
    description:
      "Editorial guides on Next Generation NCLEX case studies, clinical judgment frameworks, high-alert pharmacology reviews, and evidence-based study strategies written by nurse educators.",
    url: "/blog",
    siteName: BRAND.fullName,
    type: "website",
    images: [
      {
        url: "/images/blog/prepford-blog-hero.jpg",
        width: 1200,
        height: 675,
        alt: "PrepFord Nursing Insights - Student studying with laptop and clinical notes",
      },
    ],
  },
};

export default function BlogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4.5rem)] flex items-center justify-center bg-background text-muted-foreground text-sm">
          Loading nursing insights…
        </div>
      }
    >
      <BlogPageClient />
    </Suspense>
  );
}
