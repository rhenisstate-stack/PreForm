"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export function PublicRouteOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHiddenRoute =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up");

  if (isHiddenRoute) {
    return null;
  }
  return <>{children}</>;
}
