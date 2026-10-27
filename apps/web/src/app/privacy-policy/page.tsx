import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | PREform NCLEX",
  description:
    "PREform NCLEX privacy policy — how we collect, use, and protect your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <section className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-secondary">
              Legal
            </p>
            <h1 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl">
              Privacy Policy
            </h1>
          </div>

          <div className="mt-12 space-y-6 text-sm text-muted-foreground leading-relaxed">
            <p>
              This privacy policy describes how Preform NCLEX collects, uses,
              and protects your personal information. It is provided as a
              development layout and should be reviewed by qualified legal counsel
              before production use.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">Information we collect</h2>
            <p>
              We may collect account information (name, email), learning and
              assessment activity, and support enquiry details. We do not collect
              payment card data directly; payment processing is handled by our
              payment provider.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">How we use your information</h2>
            <p>
              We use your information to provide access to learning content, track
              progress, process subscriptions, and respond to support enquiries.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">Your rights</h2>
            <p>
              You may request access to, correction of, or deletion of your
              personal data by contacting us through the support channels on this
              site.
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-8">Contact</h2>
            <p>
              For privacy enquiries, contact us through our <Link href="/contact" className="text-secondary hover:underline">contact page</Link>.
            </p>

            <p className="mt-8 text-xs text-muted-foreground">
              Effective date: to be confirmed upon legal review.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
