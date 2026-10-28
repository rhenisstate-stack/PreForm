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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: BRAND.favicon.assetPath, type: BRAND.favicon.type },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: BRAND.favicon.assetPath,
    apple: BRAND.favicon.assetPath,
  },
  openGraph: {
    title: "PrepFord | NCLEX-RN & NCLEX-PN Exam Preparation",
    description:
      "Prepare for the NCLEX-RN and NCLEX-PN with PrepFord's available nursing practice questions, study notes, and learning resources.",
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
    title: "PrepFord | NCLEX-RN & NCLEX-PN Exam Preparation",
    description:
      "Prepare for the NCLEX-RN and NCLEX-PN with PrepFord's available nursing practice questions, study notes, and learning resources.",
    images: [BRAND.logo.assetPath],
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
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
