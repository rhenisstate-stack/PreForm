import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { NCLEXPNPageClient } from "./page-client";

const PN_META_TITLE = "NCLEX-PN Exam Preparation | PrepFord";
const PN_META_DESCRIPTION =
  "Explore PrepFord’s NCLEX-PN preparation resources, nursing study guides, practice tools, and available study plans to support your exam preparation.";

export const metadata: Metadata = {
  title: {
    absolute: PN_META_TITLE,
  },
  description: PN_META_DESCRIPTION,
  alternates: {
    canonical: "/nclex-pn",
  },
  openGraph: {
    title: PN_META_TITLE,
    description: PN_META_DESCRIPTION,
    url: "/nclex-pn",
    siteName: BRAND.fullName,
    type: "website",
    images: [
      {
        url: BRAND.logo.assetPath,
        width: BRAND.logo.width,
        height: BRAND.logo.height,
        alt: BRAND.logo.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PN_META_TITLE,
    description: PN_META_DESCRIPTION,
    images: [BRAND.logo.assetPath],
  },
};

export default function PNPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "PrepFord NCLEX-PN Exam Preparation",
    description: PN_META_DESCRIPTION,
    provider: {
      "@type": "Organization",
      name: BRAND.fullName,
      url: "https://prepfordnclex.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <NCLEXPNPageClient />
    </>
  );
}
