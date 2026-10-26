import * as React from "react";
import { cn } from "@/lib/utils";
import * as BadgePrimitive from "@radix-ui/react-badge";

const Badge = React.forwardRef<
  React.ElementRef<typeof BadgePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof BadgePrimitive.Root>
>(({ className, variant, ...props }, ref) => (
  <BadgePrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      variants[variant],
      className
    )}
    {...props}
  />
));
Badge.displayName = BadgePrimitive.Root.displayName;

const variants = {
  default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary:
    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive:
    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "text-ink",
  success: "border-transparent bg-green/10 text-green-dark",
};

export { Badge, variants };
