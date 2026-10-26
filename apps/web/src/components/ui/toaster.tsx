"use client";

import { Sonner, type SonnerProps, toast as sonnerToast } from "sonner";
import { useToast } from "@/hooks/use-toast";

export { Sonner };
export type { SonnerProps };
export { useToast };

export const toast = {
  success: (message: string, options?: SonnerProps) =>
    sonnerToast.success(message, options),
  error: (message: string, options?: SonnerProps) =>
    sonnerToast.error(message, options),
  info: (message: string, options?: SonnerProps) =>
    sonnerToast.info(message, options),
  warning: (message: string, options?: SonnerProps) =>
    sonnerToast.warning(message, options),
};
