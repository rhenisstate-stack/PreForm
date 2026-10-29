import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { TestimonialsPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Candidate Reflections & Testimonials | PrepFord NCLEX",
  description:
    "Real progress and meaningful preparation. Explore how nursing candidates leverage PrepFord's structured rationales, NGN case studies, and clinical study workflows.",
  alternates: {
    canonical: "/testimonials",
  },
  openGraph: {
    title: "Candidate Reflections & Testimonials | PrepFord NCLEX",
    description:
      "Real progress and meaningful preparation. Explore how nursing candidates leverage PrepFord's structured rationales, NGN case studies, and clinical study workflows.",
    url: "/testimonials",
    siteName: BRAND.fullName,
    type: "website",
    images: [
      {
        url: "/images/testimonials/prepford-testimonials-hero.jpg",
        width: 1200,
        height: 675,
        alt: "PrepFord Testimonials - Smiling nursing graduate with cap and stethoscope",
      },
    ],
  },
};

export default function TestimonialsPage() {
  return <TestimonialsPageClient />;
}
