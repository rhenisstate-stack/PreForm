/**
 * @deprecated Legacy compatibility wrapper.
 *
 * PrepFord standard is the centralised notification service in
 * `@/lib/notifications` (success / error / warning / info / loading / promise)
 * rendered by the single global `<Toaster position="top-center" />` mounted in
 * the root layout. New code must not import raw Sonner directly.
 */
import { notify } from "@/lib/notifications";

export function useToast() {
  return {
    toast: notify,
  };
}
