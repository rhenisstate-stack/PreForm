import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Administration Workspace | ${BRAND.name}`,
  description: "Management dashboard for curriculum, question bank, assessment engine, user access, and audit logging.",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
