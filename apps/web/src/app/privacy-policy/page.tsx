import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, AlertCircle, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | PrepFord NCLEX",
  description:
    "Comprehensive PrepFord NCLEX Privacy Policy detailing how candidate data, Google authentication, session cookies, assessment telemetry, and personal information are processed and protected.",
};

interface PolicySection {
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

const policySections: PolicySection[] = [
  {
    id: "section-1",
    title: "1. Introduction & Scope",
    content: {
      paragraphs: [
        "Welcome to PrepFord NCLEX ('PrepFord', 'we', 'us', or 'our'). PrepFord provides an independent examination preparation platform designed specifically for nursing licensure candidates preparing for the National Council Licensure Examination for Registered Nurses (NCLEX-RN®) and Practical Nurses (NCLEX-PN®).",
        "This Privacy Policy explains how PrepFord collects, uses, stores, discloses, and protects your personal data when you interact with our website, access our online question banks and diagnostic assessments, register an account, or communicate with our support personnel.",
        "We are committed to transparent, lawful, and secure handling of candidate information. Please read this Privacy Policy carefully to understand our data practices and your rights regarding your personal information.",
      ],
    },
  },
  {
    id: "section-2",
    title: "2. Definitions",
    content: {
      paragraphs: [
        "To ensure clarity throughout this document, the following terms have specific meanings:",
      ],
      subsections: [
        {
          title: "Key Definitions",
          items: [
            "'Candidate' or 'User' refers to any individual accessing or registered on the PrepFord platform.",
            "'Personal Data' means any information relating to an identified or identifiable natural person.",
            "'Assessment Telemetry' refers to question responses, timing data, topic proficiencies, exam scores, and readiness calculations generated during study sessions.",
            "'Services' encompasses the PrepFord web application, NCLEX question banks, rationales, diagnostic evaluations, and customer support channels.",
          ],
        },
      ],
    },
  },
  {
    id: "section-3",
    title: "3. Information Users Provide Directly",
    content: {
      paragraphs: [
        "We collect personal data that you voluntarily provide to us when interacting with the PrepFord platform:",
      ],
      subsections: [
        {
          title: "Categories of Directly Provided Data",
          items: [
            "Registration details: Full name, email address, password, and chosen licensure track (NCLEX-RN or NCLEX-PN).",
            "Profile preferences: Learning timeline, target examination date, and self-selected study topics.",
            "Communications: Inquiries, feedback, support messages submitted through our Contact Us form, email correspondence, or educator consultation requests.",
            "Survey and feedback inputs: Voluntary responses provided during user experience evaluations or feature feedback surveys.",
          ],
        },
      ],
    },
  },
  {
    id: "section-4",
    title: "4. Account & Authentication Information",
    content: {
      paragraphs: [
        "To safeguard candidate accounts and prevent unauthorized access to prep materials, PrepFord implements secure authentication mechanisms:",
        "Email/Password Authentication: When registering with email and password, passwords are never stored in plaintext. They are evaluated against high-entropy baseline security policies (zxcvbn score 3 or higher) and cryptographically hashed using salted, industry-standard key derivation functions before storage.",
        "Federated Google Authentication: When you sign in using Google OAuth 2.0, authentication occurs directly via Google's identity servers using the Authorization Code Flow with Proof Key for Code Exchange (PKCE, RFC 7636). We collect only your verified email address, full name, and unique Google account identifier provided by Google Identity Services. We never receive or store your Google account password.",
      ],
    },
  },
  {
    id: "section-5",
    title: "5. Usage, Diagnostic, Device & Technical Data",
    content: {
      paragraphs: [
        "When you use our learning tools, we automatically collect technical and performance telemetry necessary to deliver tailored study recommendations and maintain platform reliability:",
      ],
      subsections: [
        {
          title: "Collected Technical Telemetry",
          items: [
            "Device and network attributes: IP address (truncated or pseudonymized where feasible), browser type and version, operating system, preferred language, and screen resolution.",
            "Session logs: Timestamps of logins, page views, navigation paths, and error stack traces for application debugging.",
            "Assessment telemetry: Specific questions attempted, answer selections, time elapsed per item, scores achieved, and topic mastery indicators.",
          ],
        },
      ],
    },
  },
  {
    id: "section-6",
    title: "6. Cookies & Tracking Technologies",
    content: {
      paragraphs: [
        "PrepFord uses strictly necessary and functional cookies to ensure platform security, maintain login state, and remember your visual display preferences:",
      ],
      subsections: [
        {
          title: "Specific Cookies Deployed",
          items: [
            "'preform_session': A secure, HTTP-only, SameSite cookie used to maintain authenticated user sessions across requests.",
            "'preform_oauth_state': A short-lived, encrypted, HTTP-only cookie used exclusively to verify state integrity and prevent Cross-Site Request Forgery (CSRF) during Google OAuth handshakes.",
            "Theme preference cookies: Lightweight client storage tokens used to persist your choice of Light, Dark, or System visual mode across browsing sessions.",
          ],
        },
      ],
    },
  },
  {
    id: "section-7",
    title: "7. Third-Party Integrations & Google Identity",
    content: {
      paragraphs: [
        "PrepFord integrates select third-party infrastructure providers to support essential platform operations:",
        "Google OAuth 2.0 / OpenID Connect: Used for streamlined, secure single sign-on. Your interaction with Google's authentication modal is governed by the Google Privacy Policy (https://policies.google.com/privacy).",
        "Hosting & Infrastructure: Our web servers and databases reside within certified, compliant cloud hosting facilities adhering to SOC 2 and ISO/IEC 27001 data center security standards.",
      ],
    },
  },
  {
    id: "section-8",
    title: "8. How Personal Data Is Used",
    content: {
      paragraphs: [
        "We process candidate personal data strictly for legitimate educational, operational, and security purposes:",
      ],
      subsections: [
        {
          title: "Operational Purposes",
          items: [
            "Delivering tailored examination prep content, practice items, and question rationales.",
            "Calculating performance telemetry, domain readiness indicators, and individualized study recommendations.",
            "Authenticating candidates and safeguarding accounts against unauthorized intrusion.",
            "Responding to candidate inquiries, troubleshooting technical issues, and providing curriculum support.",
            "Conducting platform performance monitoring, bug triage, and application security audits.",
          ],
        },
      ],
    },
  },
  {
    id: "section-9",
    title: "9. Legal Bases for Processing",
    content: {
      paragraphs: [
        "Where applicable data protection legislation (such as GDPR Article 6, the Kenya Data Protection Act 2019, or UK GDPR) requires a recognized lawful basis, we process personal data under the following grounds:",
      ],
      subsections: [
        {
          title: "Applicable Legal Bases",
          items: [
            "Contractual Necessity: Processing required to fulfill our Terms and Conditions and provide your requested NCLEX preparation subscription.",
            "Legitimate Interests: Maintaining platform security, detecting fraud, improving study algorithms, and preventing abuse of prep materials.",
            "Consent: Where you have provided unambiguous consent for specific voluntary communications or optional survey feedback.",
            "Legal Compliance: Adhering to statutory tax, accounting, or judicial obligations.",
          ],
        },
      ],
    },
  },
  {
    id: "section-10",
    title: "10. Data Sharing & Service Providers",
    content: {
      paragraphs: [
        "PrepFord does not sell, rent, monetize, or trade candidate personal data. We never disclose your personal information to third-party advertisers or unauthorized data brokers.",
        "We share personal data strictly with vetted service providers bound by enforceable data processing agreements, including cloud hosting providers, database operators, customer support ticketing infrastructure, and transaction processors. These providers are authorized to process data solely to execute contracted services on our behalf.",
      ],
    },
  },
  {
    id: "section-11",
    title: "11. Payments & Transaction Information",
    content: {
      paragraphs: [
        "Subscription transactions on PrepFord are processed entirely through certified, PCI-DSS Level 1 compliant payment gateways. PrepFord does not store, intercept, or handle raw payment card numbers, CVVs, or bank account credentials on its servers.",
        "We receive only transaction confirmation metadata (e.g., transaction identifier, subscription plan purchased, renewal date, and billing postal code) required for subscription provisioning and accounting records.",
      ],
    },
  },
  {
    id: "section-12",
    title: "12. Analytics & Communications",
    content: {
      paragraphs: [
        "We utilize privacy-preserving diagnostic telemetry to identify server latency, broken routes, and accessibility friction points. We do not employ third-party tracking pixels that follow candidates across external web domains.",
        "Service Communications: We may send necessary transactional emails regarding account verification, password resets, subscription renewals, or critical security updates. You cannot opt out of essential transactional notices.",
      ],
    },
  },
  {
    id: "section-13",
    title: "13. Data Retention",
    content: {
      paragraphs: [
        "We retain candidate personal data only as long as necessary to fulfill the educational purposes for which it was collected, maintain your study history, and satisfy statutory tax or legal requirements.",
        "When an account is closed or deleted, assessment telemetry is either permanently destroyed or fully anonymized so that it can no longer be associated with any individual candidate.",
      ],
    },
  },
  {
    id: "section-14",
    title: "14. Data Security",
    content: {
      paragraphs: [
        "We apply rigorous technical and organizational safeguards to protect candidate data against unauthorized access, loss, or alteration:",
      ],
      subsections: [
        {
          title: "Technical Safeguards",
          items: [
            "Encryption in Transit: All web traffic is strictly enforced over HTTPS utilizing TLS 1.3 encryption.",
            "Encryption at Rest: Sensitive database storage, password digests, and backups are encrypted using AES-256.",
            "Access Governance: Strict principle-of-least-privilege access controls, multi-factor authentication (MFA) for administrative staff, and automated vulnerability scanning.",
          ],
        },
      ],
    },
  },
  {
    id: "section-15",
    title: "15. International Transfers",
    content: {
      paragraphs: [
        "PrepFord operates infrastructure that may process data on servers located outside your country of residence. Where personal data is transferred across international boundaries, we ensure appropriate cross-border transfer safeguards, such as Standard Contractual Clauses (SCCs) or adequacy decisions recognized by relevant regulatory authorities.",
      ],
    },
  },
  {
    id: "section-16",
    title: "16. User Access, Correction, Deletion & Privacy Rights",
    content: {
      paragraphs: [
        "Depending on your jurisdiction (including the European Economic Area, the United Kingdom, California, and Kenya under the Data Protection Act 2019), you may exercise specific statutory privacy rights:",
      ],
      subsections: [
        {
          title: "Your Rights Include",
          items: [
            "Right of Access: Request confirmation of whether we process your data and receive an exported copy of your personal records.",
            "Right to Rectification: Correct inaccurate or incomplete profile information.",
            "Right to Erasure ('Right to be Forgotten'): Request deletion of your account and associated personal data.",
            "Right to Restrict Processing: Limit how we process your information under specific contested circumstances.",
            "Right to Data Portability: Receive your assessment history in a structured, machine-readable format.",
            "Right to Object: Object to processing based on legitimate interests.",
          ],
        },
      ],
    },
  },
  {
    id: "section-17",
    title: "17. Children's & Minor Privacy",
    content: {
      paragraphs: [
        "PrepFord is designed exclusively for adult nursing candidates and nursing students preparing for professional licensure. We do not knowingly market to or solicit personal data from individuals under the age of 18. If we learn that personal data from a child has been collected, we will take prompt steps to delete that information.",
      ],
    },
  },
  {
    id: "section-18",
    title: "18. Third-Party Links",
    content: {
      paragraphs: [
        "Our platform and blog articles may contain informational hyperlinks to external websites (such as regulatory state boards of nursing, NCSBN publications, or clinical guidelines). PrepFord is not responsible for the privacy practices, content, or policies of third-party websites. We encourage you to review their policies upon visiting.",
      ],
    },
  },
  {
    id: "section-19",
    title: "19. Policy Updates",
    content: {
      paragraphs: [
        "We may update this Privacy Policy periodically to reflect enhancements to our platform, evolving legal requirements, or adjustments in our data handling practices.",
        "When material modifications occur, we will update the 'Last Updated' date at the top of this document and provide prominent notification via our website or email prior to the changes taking effect.",
      ],
    },
  },
  {
    id: "section-20",
    title: "20. Contact Details & Privacy Inquiries",
    content: {
      paragraphs: [
        "If you have questions, comments, or wish to exercise any of your statutory data protection rights, please contact our designated Data Protection team:",
        "Email: privacy@prepfordnclex.com (or via our Contact Us portal at /contact)",
        "Postal Address: PrepFord NCLEX Data Protection Office, Attn: Privacy Compliance Officer.",
      ],
    },
  },
];

export default function PrivacyPolicyPage() {
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
                Privacy Policy
              </li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Legal &amp; Data Governance
            </span>
            <h1 className="mt-2 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Last Updated: <strong className="text-foreground">October 27, 2026</strong> • Version 2.0
            </p>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              This Privacy Policy details how PrepFord NCLEX safeguards candidate data, session tokens, assessment telemetry, and personal information across our nursing licensure preparation services.
            </p>
          </div>
        </div>
      </section>

      {/* Legal Counsel Notice Callout */}
      <section className="border-b border-border bg-amber-500/10 py-3 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Administrative Notice:</strong> This document reflects the technical architecture and data processing operations of the PrepFord platform. Commercial deployment remains subject to formal legal review by qualified counsel.
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
            <nav aria-label="Privacy Policy Sections">
              <ol className="space-y-1.5 text-xs">
                {policySections.map((sec) => (
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
            {policySections.map((section) => (
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
                      <div key={sIdx} className="rounded-lg border border-border bg-card/60 p-4 sm:p-5">
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
                <h3 className="font-serif font-bold text-lg text-foreground">Have a specific privacy question?</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Our Data Protection team is available to assist you with privacy inquiries or data access requests.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/90 transition-colors shadow-sm shrink-0"
              >
                <span>Contact Privacy Team</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}
