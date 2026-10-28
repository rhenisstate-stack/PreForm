/**
 * PrepFord Brand Configuration
 * Centralized source of truth for application branding, assets, and metadata.
 */

export const BRAND = {
  name: "PrepFord",
  fullName: "PrepFord",
  wordmarkLines: ["Prep", "Ford"] as const,
  tagline: "Prepare with clarity",
  description:
    "A focused learning platform for NCLEX-RN and NCLEX-PN candidates, built with clinical accuracy and transparent assessment at its core.",
  logo: {
    assetPath: "/prepford-logo.png",
    alt: "PrepFord logo",
    width: 1024,
    height: 1024,
  },
  favicon: {
    assetPath: "/prepford-logo.png",
    type: "image/png",
  },
  supportEmail: "support@prepford.com",
  educatorsEmail: "educators@prepford.com",
  legalEmail: "legal@prepford.com",
  socials: {
    linkedin: "https://www.linkedin.com/company/prepford",
    twitter: "https://x.com/prepford",
    youtube: "https://www.youtube.com/@prepford",
    facebook: "https://www.facebook.com/prepford",
  },
} as const;

export type BrandConfig = typeof BRAND;
