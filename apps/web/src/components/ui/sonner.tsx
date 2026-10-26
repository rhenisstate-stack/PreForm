"use client";

import { toast as sonnerToast, type Toast as SonnerToastType } from "sonner";
import { Sonner as SonnerComponent } from "sonner";

export const Toaster = SonnerComponent;
export const toast = sonnerToast;

export type { SonnerToastType as Toast };
export type { ToastActionElement, ToastProps } from "sonner";
