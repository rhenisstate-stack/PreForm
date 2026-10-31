import type { ReactNode } from "react";
import { StudyStudioShell } from "@/components/learner/study-studio/study-studio-shell";

/**
 * Authenticated shell for the PrepFord AI Study Studio routes
 * (`/dashboard/study/*`). Authentication itself is enforced client-side
 * against the verified session, consistent with the learner dashboard.
 */
export default function StudyStudioLayout({ children }: { children: ReactNode }) {
  return <StudyStudioShell>{children}</StudyStudioShell>;
}
