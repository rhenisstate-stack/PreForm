import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { NotesManager } from "@/components/learner/study-studio/notes-manager";

export const metadata: Metadata = {
  title: `Personal Study Notes | ${BRAND.name}`,
  description: "Personal rich-text clinical notebook with AI summaries, checklists, and flashcard conversion.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotesPage() {
  return <NotesManager />;
}
