"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import type { ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group font-sans"
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl text-sm font-sans",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground text-xs font-semibold rounded-lg",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground text-xs font-semibold rounded-lg",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground",
          success:
            "group-[.toaster]:border-teal-500/30 group-[.toaster]:text-teal-950 dark:group-[.toaster]:text-teal-100",
          error:
            "group-[.toaster]:border-destructive/30 group-[.toaster]:text-destructive",
          warning:
            "group-[.toaster]:border-amber-500/30 group-[.toaster]:text-amber-950 dark:group-[.toaster]:text-amber-100",
          info:
            "group-[.toaster]:border-sky-500/30 group-[.toaster]:text-sky-950 dark:group-[.toaster]:text-sky-100",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, sonnerToast as toast };
export type { ToasterProps };
