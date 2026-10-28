import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { TestimonialsPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Candidate Testimonials | PrepFord NCLEX",
  description:
    "Read authentic experiences from nursing candidates who prepared with PrepFord NCLEX question rationales and clinical judgment case studies.",
  alternates: {
    canonical: "/testimonials",
  },
  openGraph: {
    title: "Candidate Testimonials | PrepFord NCLEX",
    description:
      "Read authentic experiences from nursing candidates who prepared with PrepFord NCLEX question rationales and clinical judgment case studies.",
    url: "/testimonials",
    siteName: BRAND.fullName,
    type: "website",
  },
};

export default function TestimonialsPage() {
  return <TestimonialsPageClient />;
}
