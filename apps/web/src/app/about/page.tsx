import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { AboutPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "About PrepFord | Clinical Excellence & NCLEX Preparation",
  description:
    "Learn about PrepFord's mission, nurse educator curriculum team, and evidence-based clinical judgment approach to NCLEX-RN and NCLEX-PN licensure preparation.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About PrepFord | Clinical Excellence & NCLEX Preparation",
    description:
      "Learn about PrepFord's mission, nurse educator curriculum team, and evidence-based clinical judgment approach to NCLEX-RN and NCLEX-PN licensure preparation.",
    url: "/about",
    siteName: BRAND.fullName,
    type: "website",
  },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
