"use client";

import { Toaster as ToasterComponent, toast as sonnerToast } from "sonner";
import type { ToasterProps } from "sonner";

export const Toaster = ToasterComponent;
export const toast = sonnerToast;

export type { ToasterProps };
