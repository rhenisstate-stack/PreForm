import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminBlogClient } from "./page-client";
import { BrandedLoading } from "@/components/layout/branded-loading";

export const metadata: Metadata = {
  title: "Blog & Editorial Publishing Workspace",
  description: "Author, review, schedule, and publish clinical nursing editorial articles, study guides, and NCLEX strategy posts.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminBlogPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-16 flex items-center justify-center">
          <BrandedLoading message="Loading editorial workspace..." fullScreen={false} />
        </div>
      }
    >
      <AdminBlogClient />
    </Suspense>
  );
}
