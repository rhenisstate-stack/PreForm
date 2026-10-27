"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProgrammes } from "@/hooks/use-api";

interface PlanCardProps {
  name: string;
  pathway: "RN" | "PN" | "Both";
  price: number;
  currency: string;
  interval: string;
  features: string[];
  isFeatured?: boolean;
  href: string;
}

const plans: PlanCardProps[] = [
  {
    name: "Starter",
    pathway: "Both",
    price: 29,
    currency: "USD",
    interval: "month",
    features: [
      "Access to sample questions",
      "Detailed answer rationales",
      "Basic progress tracking",
    ],
    href: "/cart?add=rn-starter",
  },
  {
    name: "Pro",
    pathway: "Both",
    price: 59,
    currency: "USD",
    interval: "month",
    features: [
      "Full question bank (RN & PN)",
      "Readiness assessments",
      "Progress analytics",
      "Study plans",
      "Priority support",
    ],
    isFeatured: true,
    href: "/cart?add=rn-pro",
  },
  {
    name: "Premium",
    pathway: "Both",
    price: 89,
    currency: "USD",
    interval: "month",
    features: [
      "Everything in Pro",
      "Case studies and NGN practice",
      "AI-assisted study tools (limited)",
      "Personalised study recommendations",
    ],
    href: "/cart?add=prep-premium",
  },
];

export function SubscriptionsPageClient() {
  const { data: programmes } = useProgrammes();

  return (
    <>
      <section className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center lg:max-w-3xl lg:mx-auto">
            <p className="text-xs font-medium uppercase tracking-wider text-secondary">
              Choose your plan
            </p>
            <h1 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-6 text-muted-foreground max-w-xl mx-auto lg:text-lg">
              Select a plan that matches your exam preparation needs. All plans
              include access to original NCLEX-style questions and detailed
              rationales.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.name} className={`flex flex-col h-full relative ${plan.isFeatured ? "ring-2 ring-secondary" : ""}`}>
                {plan.isFeatured && (
                  <Badge className="absolute top-4 left-1/2 -translate-x-1/2 rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                    Most popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.pathway} pathway</p>
                </CardHeader>
                <CardContent className="pt-0 flex-1">
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-serif font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-sm text-muted-foreground">{plan.currency}</span>
                    <span className="text-sm text-muted-foreground">/{plan.interval}</span>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="flex shrink-0 items-center text-secondary" aria-hidden="true">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link
                    href={plan.href}
                    className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 shadow-sm"
                  >
                    Select plan <ArrowRight className="ml-2 h-4 w-4" />
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
