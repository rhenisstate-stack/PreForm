import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: `Administration Workspace | ${BRAND.name}`,
  description: "Management dashboard for curriculum, question bank, assessment engine, user access, and audit logging.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      {/* Shared admin chrome: sidebar, breadcrumbs, search, theme/account controls.
          Auth display gates live inside AdminShell; every data operation is still
          authorized server-side by the API and BFF verifyAdminAuth(). */}
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
