"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const footerLinks = [
  {
    heading: "Preform",
    links: [
      { label: "About", href: "/" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    heading: "NCLEX Pathways",
    links: [
      { label: "NCLEX-RN", href: "/nclex-rn" },
      { label: "NCLEX-PN", href: "/nclex-pn" },
      { label: "Courses", href: "/courses" },
      { label: "Subscription comparison", href: "/subscriptions" },
      { label: "Try Now", href: "#try-now" },
    ],
  },
  {
    heading: "Learning",
    links: [
      { label: "Our Features", href: "/features" },
      { label: "Practice Questions", href: "#practice" },
      { label: "Readiness Assessments", href: "#readiness" },
      { label: "Study Resources", href: "#resources" },
      { label: "Testimonials", href: "/testimonials" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    heading: "Educators & Support",
    links: [
      { label: "For Educators", href: "/educators" },
      { label: "Contact Us", href: "/contact" },
      { label: "Support Centre", href: "/contact" },
      { label: "Cookie Settings", href: "#cookie-settings" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms and Conditions", href: "/terms-and-conditions" },
      { label: "Privacy Policy", href: "/privacy-policy" },
    ],
  },
];

export default function PublicFooter() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="border-t border-border bg-card">
      <div className="px-4 py-8 lg:px-8 lg:py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {footerLinks.map((column) => (
            <div key={column.heading}>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {column.heading}
              </h3>
              <ul className="mt-4 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-secondary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-secondary p-1 text-white font-serif font-bold text-lg">P</span>
            <span className="text-sm font-semibold text-foreground">PREform NCLEX</span>
          </div>
          {year !== null && (
            <p className="text-xs text-muted-foreground">
              © {year} Preform NCLEX. All rights reserved.
            </p>
          )}
          <div className="flex items-center gap-4">
            <a href="#" className="text-muted-foreground hover:text-secondary transition-colors" aria-label="LinkedIn" />
            <a href="#" className="text-muted-foreground hover:text-secondary transition-colors" aria-label="X" />
          </div>
        </div>
      </div>
    </footer>
  );
}
