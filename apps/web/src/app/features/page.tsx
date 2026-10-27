export const metadata = {
  title: "Features | PREform NCLEX",
  description:
    "Explore Preform NCLEX features: question bank, detailed rationales, readiness assessments, progress tracking, and clinical judgment practice.",
};

const features = [
  {
    title: "NCLEX-style question bank",
    description:
      "Original single-best-answer, multiple-response, and NGN-style questions written by nursing educators.",
    icon: "Q",
  },
  {
    title: "Detailed answer rationales",
    description:
      "Understand why the correct answer is appropriate and why each distractor is less appropriate.",
    icon: "R",
  },
  {
    title: "Readiness assessments",
    description:
      "Server-scored practice exams with topic-level feedback and clear interpretation of results.",
    icon: "A",
  },
  {
    title: "Progress tracking",
    description:
      "Accuracy by topic, question type, and time, with explainable recommendations based on your data.",
    icon: "P",
  },
  {
    title: "Clinical judgment practice",
    description:
      "Case-study and Next Generation NCLEX-style questions that build clinical reasoning skills.",
    icon: "C",
  },
  {
    title: "Study plans",
    description:
      "Personalised study routines based on your performance and exam timeline.",
    icon: "S",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center lg:max-w-3xl lg:mx-auto">
            <p className="text-xs font-medium uppercase tracking-wider text-secondary">
              Our features
            </p>
            <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl">
              Everything you need to prepare
            </h2>
            <p className="mt-6 text-muted-foreground max-w-xl mx-auto lg:text-lg">
              Structured practice, honest scoring, and clear explanations built
              for NCLEX-RN and NCLEX-PN candidates.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex shrink-0 items-center justify-center rounded-md bg-secondary/15 p-3 text-secondary mb-4" aria-hidden="true">
                  <span className="text-sm font-bold">{f.icon}</span>
                </div>
                <h3 className="text-lg font-serif font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
