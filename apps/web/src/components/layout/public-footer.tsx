"use client";

import Link from "next/link";
import { Linkedin, Twitter, Youtube, Facebook } from "lucide-react";

interface FooterColumn {
  heading: string;
  links: { label: string; href: string }[];
}

const footerColumns: FooterColumn[] = [
  {
    heading: "NCLEX Pathways",
    links: [
      { label: "NCLEX-RN Overview", href: "/nclex-rn" },
      { label: "NCLEX-PN Overview", href: "/nclex-pn" },
      { label: "Course Catalogue", href: "/courses" },
      { label: "Practice Questions", href: "/courses?type=practice" },
      { label: "Subscription Plans", href: "/subscriptions" },
      { label: "Create Account", href: "/sign-up" },
    ],
  },
  {
    heading: "Learning Resources",
    links: [
      { label: "Blog & Learning Hub", href: "/blog" },
      { label: "Platform Features", href: "/features" },
      { label: "Readiness Assessments", href: "/courses" },
      { label: "Candidate Testimonials", href: "/testimonials" },
      { label: "Exam Preparation FAQs", href: "/faq" },
    ],
  },
  {
    heading: "Support & Community",
    links: [
      { label: "Help & FAQs", href: "/faq" },
      { label: "Contact Us", href: "/contact" },
      { label: "For Nursing Educators", href: "/educators" },
      { label: "Candidate Portal Login", href: "/sign-in" },
    ],
  },
  {
    heading: "Legal & Governance",
    links: [
      { label: "Terms and Conditions", href: "/terms-and-conditions" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "About PREform", href: "/" },
    ],
  },
];

const socialLinks = [
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/preform-nclex",
    icon: Linkedin,
  },
  {
    name: "X (formerly Twitter)",
    href: "https://x.com/preformnclex",
    icon: Twitter,
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@preformnclex",
    icon: Youtube,
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/preformnclex",
    icon: Facebook,
  },
];

export default function PublicFooter() {
  const currentYear = 2026;

  return (
    <footer className="border-t border-border bg-card text-card-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Top Section: Brand Overview & Link Grid */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Brand Info Column */}
          <div className="lg:col-span-4 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-xl font-serif font-semibold text-foreground hover:opacity-90 transition-opacity"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-white font-serif font-bold text-lg shadow-sm">
                P
              </span>
              <span>
                PREform <span className="text-xs font-sans font-bold text-secondary uppercase">NCLEX</span>
              </span>
            </Link>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              An independent, clinically grounded examination preparation platform dedicated to helping nursing candidates succeed on the NCLEX-RN® and NCLEX-PN® licensure exams.
            </p>

            {/* Social Profile Links */}
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
                Connect With Us
              </p>
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-muted hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors shadow-sm"
                      aria-label={`Follow PREform NCLEX on ${social.name}`}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Navigation Columns Grid */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {footerColumns.map((col) => (
              <div key={col.heading} className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {col.heading}
                </h3>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-xs sm:text-sm text-muted-foreground hover:text-secondary hover:underline transition-colors block py-0.5"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section: Trademark Disclaimer & Copyright */}
        <div className="mt-12 border-t border-border pt-8 space-y-4">
          <div className="rounded-lg bg-muted/40 p-4 border border-border/60">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Official Examination Disclaimer: </strong>
              PREform NCLEX is an independent test preparation and educational platform. NCLEX-RN® and NCLEX-PN® are registered trademarks of the National Council of State Boards of Nursing, Inc. (NCSBN). PREform NCLEX is not affiliated with, sponsored by, or endorsed by the National Council of State Boards of Nursing, Inc. Diagnostic readiness indicators are signals based on practice performance and do not guarantee an official examination pass result.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground pt-2">
            <p>© {currentYear} PREform NCLEX. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/terms-and-conditions" className="hover:text-secondary transition-colors">
                Terms of Use
              </Link>
              <Link href="/privacy-policy" className="hover:text-secondary transition-colors">
                Privacy Policy
              </Link>
              <Link href="/contact" className="hover:text-secondary transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
