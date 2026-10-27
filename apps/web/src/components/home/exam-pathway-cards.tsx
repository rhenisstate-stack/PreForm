"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface PathwayCardProps {
  id: "rn" | "pn";
  code: string;
  title: string;
  audience: string;
  description: string;
  href: string;
}

const pathways: PathwayCardProps[] = [
  {
    id: "rn",
    code: "RN",
    title: "NCLEX-RN",
    audience: "Registered Nurse candidates",
    description:
      "A dedicated pathway for candidates preparing for the National Council Licensure Examination for Registered Nurses.",
    href: "/nclex-rn",
  },
  {
    id: "pn",
    code: "PN",
    title: "NCLEX-PN",
    audience: "Practical / Vocational Nurse candidates",
    description:
      "A dedicated pathway for candidates preparing for the National Council Licensure Examination for Practical Nurses.",
    href: "/nclex-pn",
  },
];

export function ExamPathwayCards() {
  return (
    <section id="pathways" className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center lg:max-w-3xl lg:mx-auto">
          <p className="text-xs font-medium uppercase tracking-wider text-green">
            One platform. Two pathways.
          </p>
          <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-ink sm:text-4xl">
            Your programme, your preparation.
          </h2>
          <p className="mt-6 text-muted max-w-xl mx-auto lg:text-lg">
            RN and PN learning belong in one thoughtful experience, with space
            for the differences that matter.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {pathways.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow group">
              <CardHeader>
                <div className="flex items-start gap-2">
                  <span className="flex shrink-0 items-center justify-center rounded bg-green/10 p-1 text-green">
                    <span
                      className="text-xs font-bold text-green-dark"
                      aria-hidden="true"
                    >
                      {p.code}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                    {p.audience}
                  </span>
                </div>
                <CardTitle className="mt-2 text-lg font-serif">{p.title}</CardTitle>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-muted">
                    <span className="flex shrink-0 items-center text-green" aria-hidden="true">✓</span>
                    Original NCLEX-style questions
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted">
                    <span className="flex shrink-0 items-center text-green" aria-hidden="true">✓</span>
                    Detailed answer rationales
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted">
                    <span className="flex shrink-0 items-center text-green" aria-hidden="true">✓</span>
                    Progress tracking &amp; analytics
                  </li>
                  <li className="flex items-start gap-2 text-sm text-muted">
                    <span className="flex shrink-0 items-center text-green" aria-hidden="true">✓</span>
                    Readiness assessments
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Link
                  href={p.href}
                  className="inline-flex items-center justify-between w-full rounded-md border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Explore {p.title}
                  <ArrowRight className="ml-2 h-4 w-4 text-green transition-transform group-hover:translate-x-1" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
