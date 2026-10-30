/**
 * PrepFord Centralized Notification System
 *
 * Provides a unified, accessible, and brand-consistent toast notification interface
 * powered by shadcn/ui Sonner. Supports auto-dismissal, manual dismissal,
 * loading-to-success/error transitions, debounced duplicate suppression,
 * and automatic sanitization of technical error messages.
 */

import * as React from "react";
import { toast as sonnerToast } from "sonner";
import { sanitizeErrorMessage } from "./error-mapping";

export interface NotifyAction {
  label: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export interface NotifyOptions {
  description?: string;
  duration?: number;
  id?: string | number;
  action?: NotifyAction;
  cancel?: {
    label: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  };
  onDismiss?: () => void;
  onAutoClose?: () => void;
}

// Recent toast cache for anti-spam duplicate suppression (1.5s window)
const recentNotifications = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 1500;

function shouldSuppress(key: string): boolean {
  const now = Date.now();
  const lastTime = recentNotifications.get(key);
  if (lastTime && now - lastTime < DEDUPLICATION_WINDOW_MS) {
    return true;
  }
  recentNotifications.set(key, now);
  // Clean up cache periodically
  if (recentNotifications.size > 50) {
    for (const [k, time] of recentNotifications.entries()) {
      if (now - time > DEDUPLICATION_WINDOW_MS * 2) {
        recentNotifications.delete(k);
      }
    }
  }
  return false;
}

function resolveCancel(cancel?: NotifyOptions["cancel"]) {
  if (!cancel) return undefined;
  return {
    label: cancel.label,
    onClick: cancel.onClick || (() => {}),
  };
}

export const notify = {
  /**
   * Displays a successful operation toast with PrepFord medical-teal styling.
   * Default duration: 4000ms.
   */
  success(message: string, options?: NotifyOptions): string | number {
    const dedupeKey = `success:${message}:${options?.description || ""}`;
    if (shouldSuppress(dedupeKey)) {
      return options?.id || dedupeKey;
    }

    return sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      id: options?.id,
      action: options?.action,
      cancel: resolveCancel(options?.cancel),
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose,
    });
  },

  /**
   * Displays an error toast with user-friendly sanitization.
   * Keeps errors visible for 6000ms by default to give learners adequate time to read.
   */
  error(error: unknown, options?: NotifyOptions): string | number {
    const cleanMessage = sanitizeErrorMessage(error, "We couldn't complete that operation. Please try again.");
    const dedupeKey = `error:${cleanMessage}:${options?.description || ""}`;
    if (shouldSuppress(dedupeKey)) {
      return options?.id || dedupeKey;
    }

    return sonnerToast.error(cleanMessage, {
      description: options?.description,
      duration: options?.duration ?? 6000,
      id: options?.id,
      action: options?.action,
      cancel: resolveCancel(options?.cancel),
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose,
    });
  },

  /**
   * Displays an amber warning toast for cautionary situations.
   * Default duration: 5000ms.
   */
  warning(message: string, options?: NotifyOptions): string | number {
    const dedupeKey = `warning:${message}:${options?.description || ""}`;
    if (shouldSuppress(dedupeKey)) {
      return options?.id || dedupeKey;
    }

    return sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      id: options?.id,
      action: options?.action,
      cancel: resolveCancel(options?.cancel),
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose,
    });
  },

  /**
   * Displays an informational toast with deep navy / sky accents.
   * Default duration: 4000ms.
   */
  info(message: string, options?: NotifyOptions): string | number {
    const dedupeKey = `info:${message}:${options?.description || ""}`;
    if (shouldSuppress(dedupeKey)) {
      return options?.id || dedupeKey;
    }

    return sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      id: options?.id,
      action: options?.action,
      cancel: resolveCancel(options?.cancel),
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose,
    });
  },

  /**
   * Displays a persistent loading toast that returns an ID for later resolution.
   */
  loading(message: string, options?: Omit<NotifyOptions, "duration">): string | number {
    return sonnerToast.loading(message, {
      description: options?.description,
      id: options?.id,
    });
  },

  /**
   * Wraps an async Promise with automatic loading -> success / error transitions.
   */
  promise<T>(
    promise: Promise<T>,
    data: {
      loading: string;
      success: string | ((result: T) => string);
      error: string | ((err: unknown) => string);
      description?: string | ((data: T) => string);
    },
    options?: NotifyOptions
  ) {
    return sonnerToast.promise(promise, {
      loading: data.loading,
      success: (result: T) => {
        if (typeof data.success === "function") {
          return data.success(result);
        }
        return data.success;
      },
      error: (err: unknown) => {
        if (typeof data.error === "function") {
          return data.error(err);
        }
        return sanitizeErrorMessage(err, data.error);
      },
      description: options?.description,
      duration: options?.duration ?? 4000,
      id: options?.id,
    });
  },

  /**
   * Manually dismisses an active notification by ID, or all if no ID is passed.
   */
  dismiss(id?: string | number): void {
    sonnerToast.dismiss(id);
  },
};

export default notify;
