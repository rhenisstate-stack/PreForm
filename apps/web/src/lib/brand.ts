/**
 * PrepFord Brand Configuration
 * Centralized source of truth for application branding, assets, and metadata.
 */

export const BRAND = {
  name: "PrepFord",
  fullName: "PrepFord",
  tagline: "Prepare with clarity",
  description:
    "A focused learning platform for NCLEX-RN and NCLEX-PN candidates, built with clinical accuracy and transparent assessment at its core.",
  logo: {
    assetPath: "/prepford-logo.jpg",
    alt: "PrepFord logo",
    width: 1024,
    height: 1024,
  },
  favicon: {
    assetPath: "/prepford-logo.jpg",
    type: "image/jpeg",
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
