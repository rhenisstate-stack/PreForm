import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminMediaClient } from "./page-client";
import { BrandedLoading } from "@/components/layout/branded-loading";

export const metadata: Metadata = {
  title: "Central Media & Asset Management",
  description: "Centrally manage exhibits, diagrams, study guide figures, blog media, and video thumbnails with referential integrity protection.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminMediaPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-16 flex items-center justify-center">
          <BrandedLoading message="Loading central media library..." fullScreen={false} />
        </div>
      }
    >
      <AdminMediaClient />
    </Suspense>
  );
}
