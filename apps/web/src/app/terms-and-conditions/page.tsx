import type { Metadata } from "next";
import Link from "next/link";
import { Scale, ArrowRight, AlertCircle, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms and Conditions | PREform NCLEX",
  description:
    "Terms and conditions governing the use of the PREform NCLEX learning platform, candidate subscriptions, educational materials, intellectual property, and disclaimers.",
};

interface TermsSection {
  id: string;
  title: string;
  content: {
    paragraphs: string[];
    subsections?: {
      title: string;
      items: string[];
    }[];
  };
}

const termsSections: TermsSection[] = [
  {
    id: "section-1",
    title: "1. Acceptance of Terms & Platform Access",
    content: {
      paragraphs: [
        "These Terms and Conditions ('Terms') constitute a legally binding agreement between you ('Candidate', 'User', or 'you') and PREform NCLEX ('PREform', 'we', 'us', or 'our') governing your access to and use of our website, web applications, question banks, clinical rationales, diagnostic assessments, and associated educational services (collectively, the 'Services').",
        "By accessing our platform, creating an account, or purchasing a subscription, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must not access or use the Services.",
      ],
    },
  },
  {
    id: "section-2",
    title: "2. Eligibility & Candidate Status",
    content: {
      paragraphs: [
        "The Services are intended solely for adult individuals who are nursing students, graduate nurses, international nursing graduates, or candidates preparing for professional nurse licensure examinations.",
        "By using the platform, you represent and warrant that you are at least 18 years of age (or the age of majority in your jurisdiction) and possess the legal capacity to enter into these Terms.",
      ],
    },
  },
  {
    id: "section-3",
    title: "3. Account Registration & Security Responsibilities",
    content: {
      paragraphs: [
        "To access full question banks and save assessment progress, you must register an account using either email credentials or verified Google authentication.",
      ],
      subsections: [
        {
          title: "Account Responsibilities",
          items: [
            "Accurate Data: You agree to provide true, accurate, and complete registration information and promptly update changes.",
            "Credential Confidentiality: You are solely responsible for maintaining the confidentiality of your credentials. You must not share, transfer, or sell your account login to any other individual.",
            "Single-User License: Every account represents a single-seat personal license. Simultaneous sessions from disparate geographical locations or suspicious concurrent access may trigger automated security holds.",
            "Unauthorized Access: You agree to notify PREform immediately at security@preformnclex.com upon discovering any unauthorized use of your account.",
          ],
        },
      ],
    },
  },
  {
    id: "section-4",
    title: "4. Permitted & Prohibited Platform Uses",
    content: {
      paragraphs: [
        "You are granted a limited, personal, non-exclusive, non-transferable, and revocable license to access the Services solely for your personal licensure preparation.",
      ],
      subsections: [
        {
          title: "Strictly Prohibited Actions",
          items: [
            "Scraping & Extraction: Using automated bots, web scrapers, crawlers, or harvesting scripts to extract questions, rationales, images, or code.",
            "Commercial Exploitation: Reselling, sublicensing, broadcasting, or distributing PREform test materials, clinical case studies, or mock exams.",
            "Security Circumvention: Attempting to probe, bypass, reverse-engineer, or tamper with security controls, rate limiters, or token verification logic.",
            "Unauthorized Screen Capture: Systematically capturing, publishing, or sharing question banks on external social media channels or forums.",
            "Disruption: Introducing viruses, worms, denial-of-service payloads, or any destructive computer code.",
          ],
        },
      ],
    },
  },
  {
    id: "section-5",
    title: "5. Educational Content & Intellectual Property",
    content: {
      paragraphs: [
        "All content hosted on the PREform platform—including text, questions, case studies, answer rationales, images, diagrams, algorithms, layout, software code, and design tokens—is the proprietary intellectual property of PREform NCLEX or its content licensors and is protected by copyright, trademark, and trade secret laws.",
        "No right, title, or interest in or to our intellectual property is transferred to you. All rights not expressly granted under these Terms are reserved by PREform.",
      ],
    },
  },
  {
    id: "section-6",
    title: "6. Candidate Use License & Anti-Piracy Restrictions",
    content: {
      paragraphs: [
        "You may view and interact with our materials solely via standard web browser software during an active subscription or preview period. You may not print bulk question compendiums, export items to external flashcard databases, or compile commercial test preparation study aids from our intellectual property.",
        "PREform actively monitors for unauthorized distribution of its copyrighted question banks. Suspected piracy or unauthorized commercial resale will result in immediate permanent account termination without refund and may be pursued through statutory copyright infringement remedies.",
      ],
    },
  },
  {
    id: "section-7",
    title: "7. Subscription & Paid Access Provisions",
    content: {
      paragraphs: [
        "PREform offers tiered subscription plans (e.g., 30-day, 60-day, 90-day, or multi-month access) for NCLEX-RN and NCLEX-PN pathways. Access begins immediately upon successful payment confirmation and terminates at the conclusion of the purchased billing term unless renewed.",
      ],
    },
  },
  {
    id: "section-8",
    title: "8. Pricing, Billing & Renewal Terms",
    content: {
      paragraphs: [
        "Pricing for subscriptions is displayed clearly in United States Dollars (USD) or designated local currencies prior to checkout. All purchases are billed through secure, PCI-compliant payment gateways.",
        "If a recurring subscription plan is selected, your payment method will be charged at the start of each renewal interval until explicitly cancelled. You may manage or cancel renewal settings at any time through your Account Portal prior to the next billing date.",
      ],
    },
  },
  {
    id: "section-9",
    title: "9. Refund & Cancellation Terms",
    content: {
      paragraphs: [
        "Due to the immediate digital delivery and full access to proprietary question banks upon subscription activation, refund requests are evaluated on an individual administrative basis in accordance with our commercial policy:",
      ],
      subsections: [
        {
          title: "Refund Framework",
          items: [
            "Technical Inaccessibility: If a verified technical defect on PREform's infrastructure prevents platform access for more than 48 continuous hours, candidates are entitled to prorated credit or a full refund upon timely report.",
            "Unused Subscriptions: Refund requests submitted within 48 hours of initial purchase where zero test questions have been attempted may be granted less administrative payment processing fees.",
            "Completed or Active Study: Once a candidate has actively engaged with question banks or completed mock assessments, subscriptions are strictly non-refundable.",
          ],
        },
      ],
    },
  },
  {
    id: "section-10",
    title: "10. Service Availability, Maintenance & Modifications",
    content: {
      paragraphs: [
        "We strive to maintain 99.9% uptime, but we do not warrant that the Services will be uninterrupted, error-free, or continuously available.",
        "We reserve the right to perform scheduled maintenance, update question banks to align with new NCLEX test plan releases, deprecate obsolete features, or modify application functionality. When feasible, major scheduled maintenance will be announced in advance via the candidate dashboard.",
      ],
    },
  },
  {
    id: "section-11",
    title: "11. User Feedback & Communications",
    content: {
      paragraphs: [
        "If you submit feedback, suggestions, question critiques, or clinical suggestions to PREform, you grant us an irrevocable, perpetual, royalty-free license to use and incorporate that feedback into future platform iterations without obligation or compensation to you.",
      ],
    },
  },
  {
    id: "section-12",
    title: "12. Third-Party Links & Integrations",
    content: {
      paragraphs: [
        "Our platform may reference third-party resources, clinical guidelines, or regulatory state nursing boards. PREform does not endorse, control, or assume liability for the availability, accuracy, or content of third-party platforms.",
      ],
    },
  },
  {
    id: "section-13",
    title: "13. Crucial Examination & Educational Disclaimers",
    content: {
      paragraphs: [
        "Please read this section carefully as it defines the scope and limitations of the PREform NCLEX platform:",
      ],
      subsections: [
        {
          title: "Mandatory Disclaimers",
          items: [
            "Independent Study Platform: PREform NCLEX is an independent preparation product and is NOT affiliated with, sponsored by, or endorsed by the National Council of State Boards of Nursing, Inc. (NCSBN).",
            "Trademark Notice: NCLEX®, NCLEX-RN®, and NCLEX-PN® are registered trademarks of the National Council of State Boards of Nursing, Inc. (NCSBN). Any use of these marks on our site is strictly for nominative reference to describe exam preparation pathways.",
            "No Examination Guarantee: PREform provides diagnostic signals, readiness indicators, and practice analytics. However, examination outcomes depend on individual candidate knowledge, testing environment, and clinical competence. PREform makes NO guarantee, warranty, or representation that completing our question banks guarantees passing the NCLEX or obtaining licensure.",
            "Not Medical Advice: Platform content is designed solely for educational review by nursing candidates. It does NOT constitute medical diagnosis, clinical treatment protocols, or advice for live patient care. Clinical judgment must always be guided by institutional policies and licensed healthcare providers.",
          ],
        },
      ],
    },
  },
  {
    id: "section-14",
    title: "14. Limitation of Liability",
    content: {
      paragraphs: [
        "To the maximum extent permitted by applicable law, in no event shall PREform NCLEX, its directors, officers, employees, nurse educators, or agents be liable for any indirect, punitive, incidental, special, or consequential damages arising out of or in connection with your use of or inability to use the Services.",
        "In all circumstances, PREform's aggregate liability for all claims relating to the Services shall be limited to the greater of \$50 USD or the total amount paid by you to PREform for subscription access during the three (3) months preceding the incident giving rise to liability.",
      ],
    },
  },
  {
    id: "section-15",
    title: "15. Indemnification",
    content: {
      paragraphs: [
        "You agree to defend, indemnify, and hold harmless PREform NCLEX, its officers, directors, employees, and educational contractors from and against any claims, liabilities, damages, judgments, awards, losses, costs, or expenses (including reasonable legal fees) arising out of your violation of these Terms, unauthorized redistribution of test materials, or infringement of intellectual property rights.",
      ],
    },
  },
  {
    id: "section-16",
    title: "16. Suspension & Termination",
    content: {
      paragraphs: [
        "We reserve the right, in our sole discretion, to suspend or terminate your account and access to the Services immediately, without prior notice or refund, if we determine that you have breached these Terms, engaged in fraudulent activities, or attempted to harvest proprietary question banks.",
      ],
    },
  },
  {
    id: "section-17",
    title: "17. Governing Law & Dispute Resolution",
    content: {
      paragraphs: [
        "Administrative Note: The governing law and jurisdiction clause is designated for formal corporate legal review prior to final commercial execution.",
        "Unless mandatory consumer legislation in your local jurisdiction provides otherwise, these Terms shall be construed and governed in accordance with applicable commercial laws. In the event of any controversy or claim arising out of or relating to these Terms, the parties agree to first seek informal resolution in good faith by contacting legal@preformnclex.com before initiating formal legal proceedings.",
      ],
    },
  },
  {
    id: "section-18",
    title: "18. Contact Information & Legal Notices",
    content: {
      paragraphs: [
        "For legal inquiries, copyright notices, or questions regarding these Terms, please contact us at:",
        "Email: legal@preformnclex.com (or via our Contact Us portal at /contact)",
        "Attention: PREform NCLEX Legal Compliance Department.",
      ],
    },
  },
];

export default function TermsAndConditionsPage() {
  return (
    <div className="bg-background min-h-[calc(100vh-4.5rem)]">
      {/* Page Header */}
      <section className="border-b border-border bg-card/60 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-foreground" aria-current="page">
                Terms and Conditions
              </li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Legal Agreement
            </span>
            <h1 className="mt-2 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Terms and Conditions
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Last Updated: <strong className="text-foreground">October 27, 2026</strong> • Version 2.0
            </p>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              These Terms and Conditions govern your access to the PREform NCLEX examination preparation platform, candidate subscriptions, diagnostic assessments, and intellectual property.
            </p>
          </div>
        </div>
      </section>

      {/* Legal Counsel Notice Callout */}
      <section className="border-b border-border bg-amber-500/10 py-3 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Administrative Notice:</strong> This document reflects the technical and service delivery model of PREform NCLEX. Specific commercial terms (such as refund windows and dispute venues) remain subject to formal corporate legal review.
          </span>
        </div>
      </section>

      {/* Main Document Body: Sidebar TOC + Sections */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Desktop Table of Contents Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 rounded-xl border border-border bg-card p-6 shadow-sm max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="flex items-center gap-2 text-secondary font-serif font-semibold text-sm mb-4">
              <FileText className="h-4 w-4" />
              <span>Table of Contents</span>
            </div>
            <nav aria-label="Terms and Conditions Sections">
              <ol className="space-y-1.5 text-xs">
                {termsSections.map((sec) => (
                  <li key={sec.id}>
                    <a
                      href={`#${sec.id}`}
                      className="block py-1 text-muted-foreground hover:text-secondary hover:underline transition-colors"
                    >
                      {sec.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          {/* Main Legal Sections */}
          <main className="lg:col-span-8 space-y-12">
            {termsSections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24 space-y-4">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground border-b border-border pb-2">
                  {section.title}
                </h2>

                <div className="space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {section.content.paragraphs.map((para, pIdx) => (
                    <p key={pIdx}>{para}</p>
                  ))}
                </div>

                {section.content.subsections && (
                  <div className="mt-4 space-y-4">
                    {section.content.subsections.map((sub, sIdx) => (
                      <div key={sub.title} className="rounded-lg border border-border bg-card/60 p-4 sm:p-5">
                        <h3 className="font-semibold text-foreground text-sm mb-3">{sub.title}</h3>
                        <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                          {sub.items.map((item, iIdx) => (
                            <li key={iIdx} className="flex items-start gap-2">
                              <span className="text-secondary font-bold shrink-0 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}

            {/* Bottom Support Callout */}
            <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-foreground">Questions about our Terms?</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Our compliance and candidate support team can answer any questions about our candidate license terms.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/90 transition-colors shadow-sm shrink-0"
              >
                <span>Contact Support</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}
