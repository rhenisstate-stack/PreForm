"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Contact Us | PREform NCLEX",
  description:
    "Contact PREform NCLEX for account, subscription, technical support, or educator enquiries.",
};

const contactCategories = [
  "General enquiry",
  "Technical support",
  "Account and access",
  "Subscription and payment",
  "NCLEX-RN learning",
  "NCLEX-PN learning",
  "Educator or institutional enquiry",
];

export default function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <>
      {submitted ? (
        <section className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
          <div className="mx-auto max-w-lg">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Message sent</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-6">
                <p className="text-muted text-center">
                  Thank you for contacting Preform NCLEX. We&rsquo;ll get back
                  to you as soon as possible.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link href="/" className="text-sm font-medium text-green hover:underline">
                    Return to homepage
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : (
        <section className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-green">
                Get in touch
              </p>
              <h1 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-ink sm:text-4xl">
                Contact us
              </h1>
              <p className="mt-6 text-muted max-w-xl mx-auto lg:text-lg">
                Have a question about Preform NCLEX? Select the category that
                best matches your enquiry.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="mt-12 space-y-4"
            >
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium text-ink">
                  Enquiry category
                </label>
                <select
                  id="category"
                  defaultValue={contactCategories[0]}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {contactCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-ink">
                  Your name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-ink">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-ink">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  placeholder="How can we help you?"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Send message
              </Button>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
