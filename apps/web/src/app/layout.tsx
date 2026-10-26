import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/providers";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import PublicFooter from "@/components/layout/public-footer";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "PREform NCLEX | Prepare with clarity",
    template: "%s | PREform NCLEX",
  },
  description:
    "A focused learning platform for NCLEX-RN and NCLEX-PN candidates, being built with clinical accuracy and transparent assessment at its core.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AnnouncementBar announcements={null} isLoading={false} />
          <PublicHeader />
          <main className="min-h-screen">{children}</main>
          <PublicFooter />
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
