"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type TextImagePosition = "left" | "right";
export type TextImageVariant = "default" | "card" | "feature" | "muted" | "navy" | "teal";
export type TextImageAspectRatio = "16/9" | "4/3" | "1/1" | "3/2" | "auto";
export type TextImageContainerWidth = "default" | "narrow" | "wide" | "full";
export type TextImageVerticalAlign = "center" | "top" | "bottom";
export type TextImageColumnRatio = "50-50" | "60-40" | "40-60";
export type TextImageMobileOrder = "first" | "last";

export interface TextImageAction {
  label: string;
  href: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  icon?: React.ComponentType<{ className?: string }>;
  isExternal?: boolean;
  onClick?: () => void;
  dataTestId?: string;
  ariaLabel?: string;
  className?: string;
}

export interface TextImageSectionProps {
  id?: string;
  dataTestId?: string;
  className?: string;

  // Layout & Container configuration
  imagePosition?: TextImagePosition;
  variant?: TextImageVariant;
  containerWidth?: TextImageContainerWidth;
  verticalAlign?: TextImageVerticalAlign;
  columnRatio?: TextImageColumnRatio;
  mobileImageOrder?: TextImageMobileOrder;

  // Text Content
  eyebrow?: React.ReactNode;
  heading: React.ReactNode;
  headingLevel?: "h1" | "h2" | "h3";
  description?: React.ReactNode;
  children?: React.ReactNode;

  // Actions
  primaryAction?: TextImageAction;
  secondaryAction?: TextImageAction;

  // Image & Visual
  imageSrc: string;
  imageAlt: string;
  imagePriority?: boolean;
  imageAspectRatio?: TextImageAspectRatio;
  imageCaption?: string;
  imageBadge?: React.ReactNode;
  imageObjectFit?: "cover" | "contain";
  imageClassName?: string;
  imageContainerClassName?: string;
  fallbackImageSrc?: string;

  // Custom slots
  customVisual?: React.ReactNode;
}

const CONTAINER_WIDTH_CLASSES: Record<TextImageContainerWidth, string> = {
  narrow: "max-w-5xl",
  default: "max-w-7xl",
  wide: "max-w-(--breakpoint-2xl)",
  full: "w-full",
};

const VARIANT_CONTAINER_CLASSES: Record<TextImageVariant, string> = {
  default: "bg-transparent",
  muted: "bg-muted/40 border border-border/40 rounded-3xl",
  card: "bg-card text-card-foreground border border-border/70 rounded-3xl shadow-sm hover:shadow-md transition-shadow",
  feature: "bg-linear-to-br from-slate-900 via-slate-900 to-[#142B4A] text-white border border-slate-800 rounded-3xl shadow-xl",
  navy: "bg-[#142B4A] text-white rounded-3xl shadow-lg border border-navy/40",
  teal: "bg-teal-950/40 text-foreground border border-teal-500/20 rounded-3xl shadow-md",
};

const ASPECT_RATIO_CLASSES: Record<TextImageAspectRatio, string> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  "3/2": "aspect-[3/2]",
  auto: "h-auto min-h-[260px] sm:min-h-[340px]",
};

export function TextImageSection({
  id,
  dataTestId,
  className,
  imagePosition = "right",
  variant = "default",
  containerWidth = "default",
  verticalAlign = "center",
  columnRatio = "50-50",
  mobileImageOrder = "last",
  eyebrow,
  heading,
  headingLevel = "h2",
  description,
  children,
  primaryAction,
  secondaryAction,
  imageSrc,
  imageAlt,
  imagePriority = false,
  imageAspectRatio = "16/9",
  imageCaption,
  imageBadge,
  imageObjectFit = "cover",
  imageClassName,
  imageContainerClassName,
  fallbackImageSrc = "/images/illustrations/prepford-landing-hero.png",
  customVisual,
}: TextImageSectionProps) {
  const [currentSrc, setCurrentSrc] = React.useState(imageSrc);
  const [hasError, setHasError] = React.useState(false);

  // Sync if imageSrc prop changes
  React.useEffect(() => {
    setCurrentSrc(imageSrc);
    setHasError(false);
  }, [imageSrc]);

  const handleImageError = () => {
    if (!hasError && fallbackImageSrc && currentSrc !== fallbackImageSrc) {
      setCurrentSrc(fallbackImageSrc);
      setHasError(true);
    }
  };

  const HeadingTag = headingLevel;

  // Grid column distribution
  const textColSpan = {
    "50-50": "lg:col-span-6",
    "60-40": "lg:col-span-7",
    "40-60": "lg:col-span-5",
  }[columnRatio];

  const imageColSpan = {
    "50-50": "lg:col-span-6",
    "60-40": "lg:col-span-5",
    "40-60": "lg:col-span-7",
  }[columnRatio];

  // Vertical alignment
  const alignClass = {
    center: "items-center",
    top: "items-start",
    bottom: "items-end",
  }[verticalAlign];

  const isDarkVariant = variant === "feature" || variant === "navy";

  // Visual element (Image or Custom Visual)
  const visualElement = (
    <div
      data-testid={dataTestId ? `${dataTestId}-visual` : "text-image-visual"}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl bg-muted/60 transition-all",
        variant === "card" ? "border border-border/50 shadow-xs" : "shadow-md",
        imageContainerClassName
      )}
    >
      {customVisual ? (
        customVisual
      ) : (
        <div className={cn("relative w-full overflow-hidden", ASPECT_RATIO_CLASSES[imageAspectRatio])}>
          <Image
            src={currentSrc}
            alt={imageAlt}
            priority={imagePriority}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, (max-width: 1280px) 50vw, 640px"
            onError={handleImageError}
            className={cn(
              "w-full h-full transition-transform duration-500 hover:scale-[1.02]",
              imageObjectFit === "contain" ? "object-contain" : "object-cover",
              imageClassName
            )}
          />

          {imageBadge && (
            <div className="absolute top-3.5 left-3.5 z-10">
              {typeof imageBadge === "string" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md shadow-xs">
                  {imageBadge}
                </span>
              ) : (
                imageBadge
              )}
            </div>
          )}
        </div>
      )}

      {imageCaption && (
        <p className="px-4 py-2.5 text-center text-xs text-muted-foreground bg-muted/40 border-t border-border/40">
          {imageCaption}
        </p>
      )}
    </div>
  );

  // Text element
  const textElement = (
    <div
      data-testid={dataTestId ? `${dataTestId}-content` : "text-image-content"}
      className="flex flex-col justify-center space-y-5"
    >
      {eyebrow && (
        <div className="inline-block">
          {typeof eyebrow === "string" ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                isDarkVariant
                  ? "bg-teal-400/20 text-teal-300"
                  : "bg-teal-500/10 text-teal-700 dark:text-teal-400"
              )}
            >
              {eyebrow}
            </span>
          ) : (
            eyebrow
          )}
        </div>
      )}

      <HeadingTag
        className={cn(
          "font-serif font-bold tracking-tight leading-tight",
          headingLevel === "h1" && "text-3xl sm:text-4xl lg:text-5xl",
          headingLevel === "h2" && "text-2xl sm:text-3xl lg:text-4xl",
          headingLevel === "h3" && "text-xl sm:text-2xl lg:text-3xl",
          isDarkVariant ? "text-white" : "text-foreground"
        )}
      >
        {heading}
      </HeadingTag>

      {description && (
        <div
          className={cn(
            "text-base sm:text-lg leading-relaxed",
            isDarkVariant ? "text-slate-300" : "text-muted-foreground"
          )}
        >
          {description}
        </div>
      )}

      {children && <div className="pt-1">{children}</div>}

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-3">
          {primaryAction && (
            <Button
              asChild
              size="lg"
              variant={primaryAction.variant || "default"}
              data-testid={primaryAction.dataTestId}
              aria-label={primaryAction.ariaLabel}
              onClick={primaryAction.onClick}
              className={cn(
                "w-full sm:w-auto font-semibold rounded-xl shadow-xs",
                isDarkVariant && !primaryAction.variant
                  ? "bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold"
                  : "",
                primaryAction.className
              )}
            >
              <Link
                href={primaryAction.href}
                target={primaryAction.isExternal ? "_blank" : undefined}
                rel={primaryAction.isExternal ? "noopener noreferrer" : undefined}
              >
                {primaryAction.icon && (
                  <primaryAction.icon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>{primaryAction.label}</span>
              </Link>
            </Button>
          )}

          {secondaryAction && (
            <Button
              asChild
              size="lg"
              variant={secondaryAction.variant || "outline"}
              data-testid={secondaryAction.dataTestId}
              aria-label={secondaryAction.ariaLabel}
              onClick={secondaryAction.onClick}
              className={cn(
                "w-full sm:w-auto font-semibold rounded-xl",
                isDarkVariant
                  ? "border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700 hover:text-white"
                  : "",
                secondaryAction.className
              )}
            >
              <Link
                href={secondaryAction.href}
                target={secondaryAction.isExternal ? "_blank" : undefined}
                rel={secondaryAction.isExternal ? "noopener noreferrer" : undefined}
              >
                {secondaryAction.icon && (
                  <secondaryAction.icon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>{secondaryAction.label}</span>
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <section
      id={id}
      data-testid={dataTestId}
      className={cn("w-full transition-colors", className)}
    >
      <div className={cn("mx-auto", CONTAINER_WIDTH_CLASSES[containerWidth])}>
        <div
          className={cn(
            "p-6 sm:p-8 lg:p-12",
            VARIANT_CONTAINER_CLASSES[variant]
          )}
        >
          <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16", alignClass)}>
            {/* Desktop Left Column / Mobile Order */}
            <div
              className={cn(
                imagePosition === "left" ? imageColSpan : textColSpan,
                imagePosition === "left"
                  ? mobileImageOrder === "first"
                    ? "order-1 lg:order-1"
                    : "order-2 lg:order-1"
                  : mobileImageOrder === "first"
                  ? "order-2 lg:order-1"
                  : "order-1 lg:order-1"
              )}
            >
              {imagePosition === "left" ? visualElement : textElement}
            </div>

            {/* Desktop Right Column / Mobile Order */}
            <div
              className={cn(
                imagePosition === "left" ? textColSpan : imageColSpan,
                imagePosition === "left"
                  ? mobileImageOrder === "first"
                    ? "order-2 lg:order-2"
                    : "order-1 lg:order-2"
                  : mobileImageOrder === "first"
                  ? "order-1 lg:order-2"
                  : "order-2 lg:order-2"
              )}
            >
              {imagePosition === "left" ? textElement : visualElement}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
