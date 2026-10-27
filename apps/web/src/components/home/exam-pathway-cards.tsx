"use client";

import Link from "next/link";
import { ShoppingCart, CheckCircle2, Clock } from "lucide-react";
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
  imageSrc: string;
  imageAlt: string;
  features: string[];
  detailsHref: string;
  cartHref: string;
}

const products: ProductCardData[] = [
  {
    id: "rn-pro",
    code: "RN",
    title: "NCLEX-RN Complete Preparation",
    audience: "Registered Nurse preparation",
    description:
      "Comprehensive licensure preparation aligning with the NCSBN Clinical Judgment Measurement Model, CAT simulation, and verified rationales.",
    price: 59,
    interval: "month",
    duration: "Monthly Access",
    popular: true,
    imageSrc: "/image1.jpg",
    imageAlt: "NCLEX-RN candidate engaging in clinical simulation",
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
    audience: "Practical / Vocational Nurse preparation",
    description:
      "Targeted preparation for practical and vocational licensure, emphasizing patient assignment, vital sign evaluation, and safe medication practices.",
    price: 59,
    interval: "month",
    duration: "Monthly Access",
    imageSrc: "/image2.jpg",
    imageAlt: "NCLEX-PN candidate reviewing clinical charts",
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
    imageSrc: "/image3.jpg",
    imageAlt: "Healthcare study team working on advanced pharmacology case studies",
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
    <section id="products" className="scroll-mt-20 pt-20 pb-24 px-4 lg:pt-28 lg:pb-32 lg:px-8 bg-card/40 border-t border-border">
      <div className="mx-auto max-w-7xl">
        <div className="text-center lg:max-w-3xl lg:mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Product &amp; Pathway Discovery
          </p>
          <h2 className="mt-3 text-3xl font-serif font-bold tracking-tight text-foreground sm:text-4xl">
            PrepFord NCLEX Preparation Products
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Every PrepFord preparation plan delivers authentic NCSBN-aligned questions, transparent scoring, and actionable clinical rationales.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((p) => (
            <Card
              key={p.id}
              className={`flex flex-col h-full relative transition-shadow hover:shadow-lg overflow-hidden bg-card ${
                p.popular ? "border-secondary ring-1 ring-secondary" : "border-border"
              }`}
            >
              {p.popular && (
                <Badge className="absolute top-3 right-3 z-10 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground shadow-sm">
                  Most Popular
                </Badge>
              )}

              {/* Product Header Image */}
              <div className="relative h-48 w-full overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageSrc}
                  alt={p.imageAlt}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                <Badge
                  variant="outline"
                  className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-xs border-secondary/40 text-secondary font-bold text-xs"
                >
                  {p.code} Pathway
                </Badge>
              </div>

              <CardHeader className="pb-3 pt-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {p.duration}
                  </span>
                </div>
                <CardTitle className="text-xl font-serif font-bold text-foreground">
                  {p.title}
                </CardTitle>
                <CardDescription className="text-xs text-secondary font-medium">
                  {p.audience}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 flex-1 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {p.description}
                </p>

                <div className="pt-2 border-t border-border/60">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
                    Key Features Included:
                  </span>
                  <ul className="space-y-2">
                    {p.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="pt-4 border-t border-border flex flex-col gap-3">
                <div className="flex items-baseline justify-between w-full">
                  <div>
                    <span className="text-3xl font-serif font-bold text-foreground">
                      ${p.price}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      / {p.interval}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-sm">
                    Verified Plan
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium"
                  >
                    <Link href={p.detailsHref}>
                      {p.code === "ALL-ACCESS" ? "Explore Subscriptions" : "Explore Course Details"}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs"
                  >
                    <Link href={p.cartHref}>
                      <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                      Enroll Now — ${p.price}
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
