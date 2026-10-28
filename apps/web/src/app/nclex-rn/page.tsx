import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { NCLEXRNPageClient } from "./page-client";

export const metadata: Metadata = {
  title: {
    absolute: "NCLEX-RN Exam Preparation | PrepFord",
  },
  description:
    "Explore PrepFord's NCLEX-RN study resources, nursing notes, practice tools, and available study plans to support your exam preparation.",
  alternates: {
    canonical: "/nclex-rn",
  },
  openGraph: {
    title: "NCLEX-RN Exam Preparation | PrepFord",
    description:
      "Explore PrepFord's NCLEX-RN study resources, nursing notes, practice tools, and available study plans to support your exam preparation.",
    url: "/nclex-rn",
    siteName: BRAND.fullName,
    type: "website",
    images: [
      {
        url: BRAND.logo,
        width: 512,
        height: 512,
        alt: "PrepFord NCLEX-RN Exam Preparation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NCLEX-RN Exam Preparation | PrepFord",
    description:
      "Explore PrepFord's NCLEX-RN study resources, nursing notes, practice tools, and available study plans to support your exam preparation.",
    images: [BRAND.logo],
  },
};

export default function RNPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "PrepFord NCLEX-RN Exam Preparation",
    description:
      "Explore PrepFord's NCLEX-RN study resources, nursing notes, practice tools, and available study plans to support your exam preparation.",
    provider: {
      "@type": "Organization",
      name: BRAND.fullName,
      url: "https://prepford.com",
    },
    educationalCredentialAwarded: "Registered Nurse (NCLEX-RN) Licensure Preparation",
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NCLEXRNPageClient />
    </>
  );
}
