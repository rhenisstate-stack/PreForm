"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Layers } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProgrammes } from "@/hooks/use-api";
import { CourseFinderQuiz } from "@/components/home/course-finder";
import { FAQPreview } from "@/components/home/faq-preview";
import { PRODUCTS, type Product } from "@/lib/products";

interface SubscriptionsPageClientProps {
  initialPlans?: Product[];
}

export function SubscriptionsPageClient({ initialPlans }: SubscriptionsPageClientProps) {
  const { data: programmes } = useProgrammes();
  const [plans, setPlans] = React.useState<Product[]>(() => {
    if (initialPlans && initialPlans.length > 0) {
      return initialPlans;
    }
    return PRODUCTS.filter((p) => p.isActive !== false && p.planType !== "readiness");
  });

  const [pathwayFilter, setPathwayFilter] = React.useState<"all" | "RN" | "PN" | "Both">("all");
  const [intervalFilter, setIntervalFilter] = React.useState<"month" | "quarter">("month");

  // Refresh plans from authoritative API
  React.useEffect(() => {
    let isMounted = true;
    async function fetchPlans() {
      try {
        const res = await fetch("/api/subscriptions");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.plans) && data.plans.length > 0) {
            setPlans(data.plans.filter((p: Product) => p.planType !== "readiness"));
          }
        }
      } catch {
        // Fallback remains initial plans or PRODUCTS
      }
    }
    fetchPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter plans based on active pathway and interval
  const displayedPlans = React.useMemo(() => {
    const filtered = plans.filter((p) => {
      if (pathwayFilter === "all") return true;
      if (pathwayFilter === "Both") return p.pathway === "Both";
      return p.pathway === pathwayFilter || p.pathway === "Both";
    });

    // If "all" is selected and monthly interval, return the 3 flagship tiers: Starter, Pro, Premium
    if (pathwayFilter === "all" && intervalFilter === "month") {
      const rnStarter = filtered.find((p) => p.id === "rn-starter") || filtered.find((p) => p.planType === "starter");
      const rnPro = filtered.find((p) => p.id === "rn-pro") || filtered.find((p) => p.planType === "pro");
      const prepPremium = filtered.find((p) => p.id === "prep-premium") || filtered.find((p) => p.planType === "premium");

      const curated: Product[] = [];
      if (rnStarter) curated.push(rnStarter);
      if (rnPro) curated.push(rnPro);
      if (prepPremium) curated.push(prepPremium);

      if (curated.length >= 3) {
        return curated;
      }
    }

    // Otherwise filter by selected billing interval
    const intervalMatched = filtered.filter((p) => p.billingInterval === intervalFilter);
    if (intervalMatched.length > 0) {
      return intervalMatched.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    }

    return filtered.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [plans, pathwayFilter, intervalFilter]);

  const getButtonLabel = (plan: Product) => {
    if (plan.id === "rn-starter" || plan.id === "pn-starter" || plan.slug === "nclex-rn-starter") {
      return "Choose Starter Plan";
    }
    if (plan.id === "rn-pro" || plan.id === "pn-pro" || plan.slug === "nclex-rn-pro") {
      return "Choose Pro Plan";
    }
    if (plan.id === "prep-premium" || plan.id === "prep-premium-90" || plan.slug === "nclex-all-access") {
      return "Choose Premium Plan";
    }
    if (plan.planType === "starter") return "Choose Starter Plan";
    if (plan.planType === "pro") return "Choose Pro Plan";
    if (plan.planType === "premium") return "Choose Premium Plan";
    return `Choose ${plan.name} Plan`;
  };

  const getPathwayBadge = (pathway: "RN" | "PN" | "Both") => {
    if (pathway === "Both") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary">
          <Layers className="h-3.5 w-3.5" /> RN &amp; PN Dual Access
        </span>
      );
    }
    return (
      <span className="text-xs sm:text-sm font-medium text-muted-foreground">
        {pathway} pathway
      </span>
    );
  };

  return (
    <>
      <section className="pt-20 pb-24 px-4 lg:pt-28 lg:pb-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center lg:max-w-3xl lg:mx-auto">
            <p className="text-xs font-medium uppercase tracking-wider text-secondary">
              Authoritative NCLEX Pricing
            </p>
            <h1 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-6 text-muted-foreground max-w-xl mx-auto lg:text-lg">
              Select a verified plan that matches your exam preparation timeline. Every plan
              includes access to original NCLEX-style questions, clinical judgment rationales, and domain progress analytics.
            </p>

            {/* Pathway Selection Switcher */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground mr-2">Filter Pathway:</span>
              <button
                type="button"
                onClick={() => setPathwayFilter("all")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  pathwayFilter === "all"
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                All Plans
              </button>
              <button
                type="button"
                onClick={() => setPathwayFilter("RN")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  pathwayFilter === "RN"
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                NCLEX-RN
              </button>
              <button
                type="button"
                onClick={() => setPathwayFilter("PN")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  pathwayFilter === "PN"
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                NCLEX-PN
              </button>
              <button
                type="button"
                onClick={() => setPathwayFilter("Both")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  pathwayFilter === "Both"
                    ? "bg-secondary text-secondary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                Dual Access (RN &amp; PN)
              </button>
            </div>

            {/* Billing Interval Toggle */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground">Term:</span>
              <button
                type="button"
                onClick={() => setIntervalFilter("month")}
                className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                  intervalFilter === "month"
                    ? "bg-primary/10 text-primary font-bold dark:bg-primary/20 dark:text-teal-300"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                30-Day Monthly
              </button>
              <span className="text-muted-foreground/40">•</span>
              <button
                type="button"
                onClick={() => setIntervalFilter("quarter")}
                className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                  intervalFilter === "quarter"
                    ? "bg-primary/10 text-primary font-bold dark:bg-primary/20 dark:text-teal-300"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                90-Day Quarterly (Save up to 18%)
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedPlans.map((plan) => {
              const isFeatured = plan.popular || plan.planType === "pro";
              const buttonText = getButtonLabel(plan);
              const customStyles = {
                ...(plan.bgColour ? { backgroundColor: plan.bgColour } : {}),
                ...(plan.textColour ? { color: plan.textColour } : {}),
              };

              return (
                <Card
                  key={plan.id}
                  style={customStyles}
                  className={`flex flex-col justify-between h-full relative rounded-3xl p-6 sm:p-8 transition-all hover:shadow-xl ${
                    isFeatured
                      ? "ring-2 ring-secondary shadow-lg bg-card"
                      : "shadow-md ring-1 ring-border/60 bg-card"
                  }`}
                >
                  {/* Badge Text */}
                  {(plan.badgeText || isFeatured) && (
                    <Badge
                      style={plan.accentColour ? { backgroundColor: plan.accentColour, color: "#ffffff" } : undefined}
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-4 py-1 text-xs font-semibold text-secondary-foreground shadow-sm whitespace-nowrap"
                    >
                      {plan.badgeText || (isFeatured ? "Most Popular" : "Featured")}
                    </Badge>
                  )}

                  <div className="flex-1 flex flex-col">
                    <div>
                      <h2 className="text-2xl font-serif font-bold tracking-tight text-foreground">
                        {plan.name}
                      </h2>
                      <div className="mt-1">
                        {getPathwayBadge(plan.pathway)}
                      </div>
                      {plan.description && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 flex flex-wrap items-baseline gap-2">
                      <span className="text-4xl font-serif font-bold text-foreground">
                        ${plan.price}
                      </span>
                      {plan.originalPrice && (
                        <span className="text-sm line-through text-muted-foreground">
                          ${plan.originalPrice}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-muted-foreground">
                        {plan.currency} / {plan.billingInterval === "quarter" ? "quarter" : plan.billingInterval === "month" ? "month" : "one-time"}
                      </span>
                    </div>

                    <ul className="mt-6 space-y-3 flex-1 text-sm text-foreground/90">
                      {plan.features.map((feature, idx) => (
                        <li key={`${plan.id}-feat-${idx}`} className="flex items-start gap-2.5">
                          <CheckCircle2
                            style={plan.accentColour ? { color: plan.accentColour } : undefined}
                            className="h-4 w-4 shrink-0 text-secondary mt-0.5"
                            aria-hidden="true"
                          />
                          <span className="leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Accessible Full CTA Button */}
                  <div className="mt-8 pt-4 border-t border-border/40">
                    <Link
                      href={`/cart?add=${encodeURIComponent(plan.id)}`}
                      style={plan.accentColour ? { backgroundColor: plan.accentColour } : undefined}
                      className="w-full min-h-[44px] py-2.5 px-4 inline-flex items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary shadow-sm text-center"
                    >
                      <span className="truncate">{buttonText}</span>
                      <span className="sr-only">for ${plan.price} per {plan.billingInterval === "quarter" ? "quarter" : "month"}</span>
                      <ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pathways Directory */}
          {programmes && programmes.length > 0 && (
            <div className="mt-16 pt-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">Available pathways</h2>
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
                        className="text-sm font-medium text-secondary hover:underline inline-flex items-center gap-1"
                      >
                        <span>View {p.displayName}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <CourseFinderQuiz />
      <FAQPreview />
    </>
  );
}
