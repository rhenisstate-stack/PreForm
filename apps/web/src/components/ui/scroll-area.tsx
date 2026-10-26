"use client";

import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
import * as React from "react";

const ScrollArea = ScrollAreaPrimitive.Root;
const ScrollAreaScrollbar = ScrollAreaPrimitive.Scrollbar;
const ScrollAreaThumb = ScrollAreaPrimitive.Thumb;
const ScrollAreaCorner = ScrollAreaPrimitive.Corner;
const ScrollAreaViewport = ScrollAreaPrimitive.Viewport;

const ScrollAreaIndicator = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Thumb>,
 React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Thumb>
>(({ className, ...props }, ref) => (
  <ScrollAreaPrimitive.Thumb
    ref={ref}
    className={cn("rounded-full border-bg px-2", className)}
    {...props}
  />
));

export {
  ScrollArea,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaIndicator,
  ScrollAreaViewport,
  ScrollAreaCorner,
};
