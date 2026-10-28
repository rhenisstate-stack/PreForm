import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface AppIllustrationProps {
  src: string;
  alt: string;
  priority?: boolean;
  aspectRatio?: "16/9" | "4/3" | "1/1" | "3/2" | "auto";
  className?: string;
  imageClassName?: string;
  isDecorative?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  caption?: string;
  dataTestId?: string;
}

export function AppIllustration({
  src,
  alt,
  priority = false,
  aspectRatio = "auto",
  className,
  imageClassName,
  isDecorative = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 640px",
  width = 800,
  height = 500,
  caption,
  dataTestId,
}: AppIllustrationProps) {
  const aspectClass = {
    "16/9": "aspect-video",
    "4/3": "aspect-4/3",
    "1/1": "aspect-square",
    "3/2": "aspect-3/2",
    auto: "",
  }[aspectRatio];

  return (
    <figure
      data-testid={dataTestId}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all",
        aspectClass,
        className
      )}
    >
      <Image
        src={src}
        alt={isDecorative ? "" : alt}
        aria-hidden={isDecorative ? true : undefined}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        className={cn(
          "w-full h-full object-cover object-center transition-transform duration-300",
          imageClassName
        )}
      />
      {caption && (
        <figcaption className="p-2 text-center text-xs text-muted-foreground bg-muted/40 border-t border-border/40">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
