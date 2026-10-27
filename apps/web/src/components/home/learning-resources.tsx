"use client";

import Link from "next/link";
import { BookOpen, Newspaper, HelpCircle, GraduationCap, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ResourceItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  actionText: string;
}

const resources: ResourceItem[] = [
  {
    icon: <BookOpen className="h-5 w-5 text-secondary" />,
    title: "Complete Course Catalogue",
    description:
      "Explore structured preparation courses for NCLEX-RN and NCLEX-PN with adaptive practice, pharmacology modules, and CAT simulations.",
    href: "/courses",
    actionText: "Browse Courses",
  },
  {
    icon: <Newspaper className="h-5 w-5 text-secondary" />,
    title: "Clinical Blog & Study Guides",
    description:
      "Articles written by nursing educators breaking down the NGN Clinical Judgment Measurement Model, high-alert pharmacology, and exam strategy.",
    href: "/blog",
    actionText: "Read Study Articles",
  },
  {
    icon: <GraduationCap className="h-5 w-5 text-secondary" />,
    title: "Free Sample Diagnostic Questions",
    description:
      "Experience original NGN single-best-answer and unfolding case questions with detailed clinical rationales before subscribing.",
    href: "/courses?type=practice",
    actionText: "Try Sample Questions",
  },
  {
    icon: <HelpCircle className="h-5 w-5 text-secondary" />,
    title: "Candidate Support & Advising",
    description:
      "Have questions regarding your exam timeline, subscription access, or study strategy? Our support team is here to assist.",
    href: "/contact",
    actionText: "Contact Support",
  },
];

export function LearningResources() {
  return (
    <section id="resources" className="pt-20 pb-24 px-4 bg-muted/40 lg:pt-32 lg:pb-32 lg:px-8 border-t border-border">
      <div className="mx-auto max-w-7xl">
        <div className="text-center lg:max-w-3xl lg:mx-auto">
          <p className="text-xs font-medium uppercase tracking-wider text-secondary">
            Learning &amp; Resources
          </p>
          <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl">
            Everything for your NCLEX journey
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Access free study guides, question bank samples, educator articles, and personalized candidate support.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {resources.map((item) => (
            <Card key={item.title} className="flex flex-col h-full border-border bg-card shadow-sm hover:shadow transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/15 mb-3">
                  {item.icon}
                </div>
                <CardTitle className="text-lg font-serif text-foreground leading-snug">
                  {item.title}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {item.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline pt-2"
                >
                  <span>{item.actionText}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
