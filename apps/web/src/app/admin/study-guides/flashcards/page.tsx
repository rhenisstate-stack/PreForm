import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { AdminFlashcardsClient } from "./page-client";

export const metadata: Metadata = {
  title: `Flashcards Management | ${BRAND.name} Admin`,
  description: "Curate official flashcard decks, manage card styles, reorder cards, and configure SM-2 spacing.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminFlashcardsPage() {
  return <AdminFlashcardsClient />;
}
