import type { Metadata } from "next";
import { FeaturesPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Features | PrepFord NCLEX",
  description:
    "Explore PrepFord NCLEX features: unfolding EHR case studies, step-by-step pathophysiologic rationales, adaptive CAT assessments, and 7-domain study notes.",
  alternates: {
    canonical: "/features",
  },
};

export default function FeaturesPage() {
  return <FeaturesPageClient />;
}
