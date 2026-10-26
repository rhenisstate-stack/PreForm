"use client";

import { Sonner as SonnerComponent, toast as sonnerToast } from "sonner";
import type { ToastActionElement, ToastProps } from "sonner";

export const Toaster = SonnerComponent;
export const toast = sonnerToast;

export type { ToastActionElement, ToastProps };
