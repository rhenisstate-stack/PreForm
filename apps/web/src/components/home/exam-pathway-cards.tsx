"use client";

import Link from "next/link";
import { ArrowRight, ShoppingCart, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProductCardData {
  id: string;
  code: string;
  title: string;
  audience: string;
  description: string;
  price: number;
  interval: string;
  duration: string;
  popular?: boolean;
  features: string[];
  detailsHref: string;
  cartHref: string;
}

const products: ProductCardData[] = [
  {
    id: "rn-pro",
    code: "RN",
    title: "NCLEX-RN Complete Preparation",
    audience: "Registered Nurse Candidates",
    description:
      "Comprehensive licensure preparation aligning with the NCSBN Clinical Judgment Measurement Model, CAT simulation, and verified rationales.",
    price: 59,
    interval: "month",
    duration: "Monthly Access",
    popular: true,
    features: [
      "3,500+ original NGN-style questions",
      "Detailed clinical answer rationales",
      "6 full-length adaptive CAT mock tests",
      "Clinical judgment measurement analytics",
    ],
    detailsHref: "/nclex-rn",
    cartHref: "/cart?add=rn-pro",
  },
  {
    id: "pn-pro",
    code: "PN",
    title: "NCLEX-PN Complete Preparation",
    audience: "Practical / Vocational Nurse Candidates",
    description:
      "Targeted preparation for practical and vocational licensure, emphasizing patient assignment, vital sign evaluation, and safe medication practices.",
    price: 59,
    interval: "month",
    duration: "Monthly Access",
    features: [
      "2,800+ practical nursing questions",
      "Detailed clinical answer rationales",
      "Adaptive CAT simulation exams",
      "Coordinated care & reporting analytics",
    ],
    detailsHref: "/nclex-pn",
    cartHref: "/cart?add=pn-pro",
  },
  {
    id: "prep-premium",
    code: "ALL-ACCESS",
    title: "NCLEX-RN & PN All-Access",
    audience: "Comprehensive & Dual Licensure Preparation",
    description:
      "Full access to both examination pathways, including unfolding multi-step case studies, high-alert pharmacology modules, and priority review.",
    price: 89,
    interval: "month",
    duration: "Monthly Access",
    features: [
      "Full question bank (RN & PN tracks)",
      "Unfolding 6-part NGN case studies",
      "Personalized daily study routine",
      "Priority educator email support",
    ],
    detailsHref: "/subscriptions",
    cartHref: "/cart?add=prep-premium",
  },
];

export function ExamPathwayCards() {
  return (
    <section id="pathways" className="pt-20 pb-24 px-4 lg:pt-32 lg:pb-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center lg:max-w-3xl lg:mx-auto">
          <p className="text-xs font-medium uppercase tracking-wider text-secondary">
            Product &amp; Pathway Discovery
          </p>
          <h2 className="mt-4 text-3xl font-serif font-semibold tracking-tight text-foreground sm:text-4xl">
            Choose your licensure preparation
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto lg:text-lg">
            Every PREform preparation plan delivers authentic NCSBN-aligned questions, transparent scoring, and actionable clinical rationales.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <Card
              key={p.id}
              className={`flex flex-col h-full relative transition-shadow hover:shadow-lg ${
                p.popular ? "border-secondary ring-1 ring-secondary" : "border-border"
              }`}
            >
              {p.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
                  Most Popular
                </Badge>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="outline" className="border-secondary/40 text-secondary font-bold text-xs">
                    {p.code}
                  </Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {p.duration}
                  </span>
                </div>
                <CardTitle className="text-xl font-serif text-foreground leading-snug">
                  {p.title}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground font-medium">
                  {p.audience}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 flex-1 space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-serif font-bold text-foreground">
                    ${p.price}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    USD / {p.interval}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {p.description}
                </p>

                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-foreground mb-2">Included in this plan:</p>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {p.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-border flex flex-col gap-2">
                <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
                  <Link href={p.cartHref} className="flex items-center justify-center gap-1.5">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Enroll Now — ${p.price}</span>
                  </Link>
                </Button>
                <Link
                  href={p.detailsHref}
                  className="w-full text-center text-xs font-medium text-secondary hover:underline py-1 flex items-center justify-center gap-1"
                >
                  <span>Explore Course Details</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
