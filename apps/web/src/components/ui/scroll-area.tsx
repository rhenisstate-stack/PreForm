"use client";

import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
import * as React from "react";

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("rounded-md border-border bg-card p-1", className)}
    {...props}
  />
));
ScrollArea.displayName = "ScrollArea";

const ScrollAreaScrollbar = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Scrollbar>
>(({ className, ...props }, ref) => (
  <ScrollAreaPrimitive.Scrollbar
    ref={ref}
    className={cn("h-4 w-4", className)}
    {...props}
  />
));
ScrollAreaScrollbar.displayName = "ScrollAreaScrollbar";

const ScrollAreaThumb = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Thumb>
>(({ className, ...props }, ref) => (
  <ScrollAreaPrimitive.Thumb
    ref={ref}
    className={cn("rounded-full border-bg px-2", className)}
    {...props}
  />
));
ScrollAreaThumb.displayName = "ScrollAreaThumb";

const ScrollAreaViewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ScrollAreaPrimitive.Viewport
    ref={ref}
    className={cn("h-full w-full", className)}
    {...props}
  />
));
ScrollAreaViewport.displayName = "ScrollAreaViewport";

export {
  ScrollArea,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
};
