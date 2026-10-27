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
  title: {
    default: `${BRAND.fullName} | ${BRAND.tagline}`,
    template: `%s | ${BRAND.fullName}`,
  },
  description: BRAND.description,
  icons: {
    icon: [
      { url: BRAND.favicon.assetPath, type: BRAND.favicon.type },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: BRAND.favicon.assetPath,
    apple: BRAND.favicon.assetPath,
  },
  openGraph: {
    title: `${BRAND.fullName} | ${BRAND.tagline}`,
    description: BRAND.description,
    siteName: BRAND.fullName,
    images: [
      {
        url: BRAND.logo.assetPath,
        width: BRAND.logo.width,
        height: BRAND.logo.height,
        alt: BRAND.logo.alt,
      },
    ],
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
