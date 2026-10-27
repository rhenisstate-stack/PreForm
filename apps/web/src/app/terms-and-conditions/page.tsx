import Link from "next/link";

export const metadata = {
  title: "Terms and Conditions | PREform NCLEX",
  description:
    "PREform NCLEX terms and conditions governing use of the platform and subscriptions.",
};

export default function TermsAndConditionsPage() {
  return (
    <>
      <section className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-secondary">
              Legal
            </p>
            <h1 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl">
              Terms and Conditions
            </h1>
          </div>

          <div className="mt-12 space-y-6 text-sm text-muted-foreground leading-relaxed">
            <p>
              These terms govern your use of Preform NCLEX. They are provided as
              a development layout and should be reviewed by qualified legal
              counsel before production use.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">Acceptance of terms</h2>
            <p>
              By accessing or using Preform NCLEX, you agree to these terms.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">Account responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activity under your account.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">Subscriptions and billing</h2>
            <p>
              Subscription products provide access to NCLEX preparation content
              for the stated duration. Pricing, renewal, and cancellation terms
              are presented before purchase.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">Educational disclaimer</h2>
            <p>
              Preform NCLEX is an educational study aid. It is not a substitute
              for clinical judgment or professional medical advice. Readiness
              indicators are practice-based signals and do not guarantee an
              official exam outcome.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">Contact</h2>
            <p>
              For questions about these terms, contact us through our{" "}
              <Link href="/contact" className="text-secondary hover:underline">contact page</Link>.
            </p>

            <p className="mt-8 text-xs text-muted">
              Effective date: to be confirmed upon legal review.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
