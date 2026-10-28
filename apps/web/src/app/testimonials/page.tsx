import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { TestimonialsPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Candidate Experiences & Reflections | PrepFord NCLEX",
  description:
    "Explore candidate preparation workflows and clinical learning experiences with PrepFord NCLEX question rationales and Next Generation case studies.",
  alternates: {
    canonical: "/testimonials",
  },
  openGraph: {
    title: "Candidate Experiences & Reflections | PrepFord NCLEX",
    description:
      "Explore candidate preparation workflows and clinical learning experiences with PrepFord NCLEX question rationales and Next Generation case studies.",
    url: "/testimonials",
    siteName: BRAND.fullName,
    type: "website",
  },
};

export default function TestimonialsPage() {
  return <TestimonialsPageClient />;
}
