"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProgrammes } from "@/hooks/use-api";

interface CourseCardProps {
  title: string;
  pathway: "RN" | "PN";
  description: string;
  href: string;
  badge: string;
}

const courses: CourseCardProps[] = [
  {
    title: "NCLEX-RN Complete Preparation",
    pathway: "RN",
    description: "Full question bank, readiness assessments, and progress tracking for registered nurse candidates.",
    href: "/subscriptions?programme=RN",
    badge: "RN",
  },
  {
    title: "NCLEX-PN Complete Preparation",
    pathway: "PN",
    description: "Full question bank, readiness assessments, and progress tracking for practical/vocational nurse candidates.",
    href: "/subscriptions?programme=PN",
    badge: "PN",
  },
  {
    title: "RN Practice Questions",
    pathway: "RN",
    description: "Sample NCLEX-RN style questions with detailed rationales.",
    href: "/courses?programme=RN&type=practice",
    badge: "RN",
  },
  {
    title: "PN Practice Questions",
    pathway: "PN",
    description: "Sample NCLEX-PN style questions with detailed rationales.",
    href: "/courses?programme=PN&type=practice",
    badge: "PN",
  },
];

export function CoursesPageClient() {
  const { data: programmes } = useProgrammes();

  return (
    <>
      <section className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center lg:max-w-3xl lg:mx-auto">
            <p className="text-xs font-medium uppercase tracking-wider text-secondary">
              Course catalogue
            </p>
            <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl">
              Choose your preparation
            </h2>
            <p className="mt-6 text-muted-foreground max-w-xl mx-auto lg:text-lg">
              Select the pathway that matches your licensure exam. Each course
              includes original questions, detailed rationales, and progress tracking.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c) => (
              <Card key={c.title} className="flex flex-col h-full">
                <CardHeader>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline">{c.badge}</Badge>
                  </div>
                  <CardTitle className="mt-2 text-lg">{c.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </CardContent>
                <CardFooter>
                  <Link
                    href={c.href}
                    className="inline-flex items-center gap-1 text-sm font-medium text-secondary hover:underline transition-colors"
                  >
                    Explore {c.pathway} <ArrowRight className="h-3 w-3" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          {programmes && programmes.length > 0 && (
            <div className="mt-16 border-t border-border pt-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Available pathways</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {programmes.map((p: { code: string; displayName: string; isActive: boolean }) => (
                  <Card key={p.code}>
                    <CardHeader>
                      <CardTitle>{p.displayName}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">
                        {p.isActive ? "Available for enrolment" : "Not currently available"}
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Link
                        href={`/nclex-${p.code.toLowerCase()}`}
                        className="text-sm font-medium text-secondary hover:underline"
                      >
                        View {p.displayName}
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
