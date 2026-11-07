import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { AdminNotesClient } from "./page-client";

export const metadata: Metadata = {
  title: `Study Notes Management | ${BRAND.name} Admin`,
  description: "Curate, publish, and govern official NCLEX study notes with rich formatting and taxonomy.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminNotesPage() {
  return <AdminNotesClient />;
}
