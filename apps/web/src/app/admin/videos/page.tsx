import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminVideosClient } from "./page-client";
import { BrandedLoading } from "@/components/layout/branded-loading";

export const metadata: Metadata = {
  title: "Clinical Video Management",
  description: "Curate, organize, and publish clinical learning videos, playlists, and lecture metadata with privacy-enhanced streaming.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminVideosPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-16 flex items-center justify-center">
          <BrandedLoading message="Loading video management..." fullScreen={false} />
        </div>
      }
    >
      <AdminVideosClient />
    </Suspense>
  );
}
