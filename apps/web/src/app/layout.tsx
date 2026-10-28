import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import PublicHeader from "@/components/layout/public-header";
import PublicFooter from "@/components/layout/public-footer";
import { Toaster } from "@/components/ui/sonner";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://prepfordnclex.com"),
  title: {
    default: "PrepFord | NCLEX-RN & NCLEX-PN Exam Preparation",
    template: "%s | PrepFord",
  },
  description:
    "Prepare for the NCLEX-RN and NCLEX-PN with PrepFord's available nursing practice questions, study notes, and learning resources.",
  keywords: [
    "NCLEX-RN",
    "NCLEX-PN",
    "Next Generation NCLEX",
    "NGN",
    "Nursing Exam Preparation",
    "Client Needs",
    "Nursing Study Guide",
    "Clinical Judgment",
    "CAT Practice",
    "PrepFord",
  ],
  authors: [{ name: "PrepFord Clinical Education Team" }],
  creator: "PrepFord",
  publisher: "PrepFord",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: BRAND.favicon.assetPath, type: BRAND.favicon.type },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "PrepFord | NCLEX-RN & NCLEX-PN Exam Preparation",
    description:
      "Prepare for the NCLEX-RN and NCLEX-PN with PrepFord's available nursing practice questions, study notes, and learning resources.",
    siteName: BRAND.fullName,
    type: "website",
    url: "https://prepfordnclex.com",
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
    title: "PrepFord | NCLEX-RN & NCLEX-PN Exam Preparation",
    description:
      "Prepare for the NCLEX-RN and NCLEX-PN with PrepFord's available nursing practice questions, study notes, and learning resources.",
    images: [BRAND.logo.assetPath],
  },
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://prepfordnclex.com/#organization",
      name: BRAND.fullName,
      url: "https://prepfordnclex.com",
      logo: "https://prepfordnclex.com/prepford-logo.png",
      description: BRAND.description,
      sameAs: [
        BRAND.socials.linkedin,
        BRAND.socials.twitter,
        BRAND.socials.youtube,
        BRAND.socials.facebook,
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://prepfordnclex.com/#website",
      url: "https://prepfordnclex.com",
      name: BRAND.fullName,
      publisher: {
        "@id": "https://prepfordnclex.com/#organization",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData),
          }}
        />
        <Providers attribute="class" defaultTheme="system" enableSystem>
          <AnnouncementBar announcements={null} isLoading={false} />
          <PublicHeader />
          <main className="min-h-screen">{children}</main>
          <PublicFooter />
          <Toaster position="bottom-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
