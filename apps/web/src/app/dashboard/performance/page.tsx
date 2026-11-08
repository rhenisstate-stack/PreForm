"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { PerformanceIntelligenceView } from "@/components/learner/performance/performance-intelligence-view";
import { BrandedLoading } from "@/components/layout/branded-loading";

export default function DashboardPerformancePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading && user) {
      if (user.pathway === "pn") {
        router.replace("/dashboard/pn/performance");
      } else {
        router.replace("/dashboard/rn/performance");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <BrandedLoading fullScreen message="Resolving performance intelligence..." />;
  }

  return <PerformanceIntelligenceView initialPathway={user?.pathway === "pn" ? "pn" : "rn"} />;
}
