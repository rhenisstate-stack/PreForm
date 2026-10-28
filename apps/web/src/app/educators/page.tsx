import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "For Educators | PrepFord NCLEX",
  description:
    "Information for nursing educators and training institutions about PrepFord NCLEX learning tools, progress reporting, and institutional enquiries.",
};

export default function EducatorsPage() {
  return (
    <>
      <section className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-secondary">
              For Educators
            </p>
            <h1 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl">
              Teaching tools for nursing educators
            </h1>
            <p className="mt-6 text-muted-foreground max-w-xl mx-auto lg:text-lg">
              PrepFord NCLEX supports nursing educators and training institutions
              with practice questions, readiness assessments, and progress
              reporting for RN and PN candidates.
            </p>
          </div>

          <div className="mt-16 space-y-8">
            <div className="rounded-2xl bg-card p-6 shadow-sm">
              <h2 className="text-lg font-serif font-semibold text-foreground">Practice and assessment tools</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Assign original NCLEX-style questions and readiness assessments
                to learners. Track completion and performance by topic.
              </p>
            </div>

            <div className="rounded-2xl bg-card p-6 shadow-sm">
              <h2 className="text-lg font-serif font-semibold text-foreground">Progress reporting</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                View learner accuracy by topic, question type, and time.
                Identify weak areas and demonstrated strengths.
              </p>
            </div>

            <div className="rounded-2xl bg-card p-6 shadow-sm">
              <h2 className="text-lg font-serif font-semibold text-foreground">Institutional enquiry</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Interested in group access or institutional licensing? Contact us
                to discuss your needs.
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-secondary hover:underline transition-colors"
              >
                Send an enquiry <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <p className="mt-12 text-sm text-muted-foreground">
            Institutional reporting, cohort management, bulk licensing, and LMS
            integration are planned capabilities. Contact us for current
            availability.
          </p>
        </div>
      </section>
    </>
  );
}
