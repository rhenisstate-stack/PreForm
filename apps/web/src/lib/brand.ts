/**
 * PrepFord Brand Configuration
 * Centralized source of truth for application branding, assets, and metadata.
 */

export const BRAND = {
  name: "PrepFord",
  fullName: "PrepFord NCLEX",
  tagline: "Prepare with clarity",
  description:
    "A focused learning platform for NCLEX-RN and NCLEX-PN candidates, built with clinical accuracy and transparent assessment at its core.",
  logo: {
    assetPath: "/favicon-logo.jpg",
    alt: "PrepFord NCLEX logo",
    width: 1024,
    height: 1024,
  },
  favicon: {
    assetPath: "/favicon-logo.jpg",
    type: "image/jpeg",
  },
  supportEmail: "support@prepfordnclex.com",
  educatorsEmail: "educators@prepfordnclex.com",
  legalEmail: "legal@prepfordnclex.com",
  socials: {
    linkedin: "https://www.linkedin.com/company/prepford-nclex",
    twitter: "https://x.com/prepfordnclex",
    youtube: "https://www.youtube.com/@prepfordnclex",
    facebook: "https://www.facebook.com/prepfordnclex",
  },
} as const;

export type BrandConfig = typeof BRAND;
