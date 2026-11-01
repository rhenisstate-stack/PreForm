"use client";

import * as React from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

/**
 * Admin route-segment error boundary (uncaught render/data errors).
 * Expected API failures are handled by admin data hooks + AdminErrorState;
 * this catches anything that escapes to the layout.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Client-side observability only; never surface raw internals to users.
    console.error("[Admin] Unhandled route error:", error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-20 px-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
        <TriangleAlert className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-serif font-bold text-foreground mb-3">
        Something went wrong
      </h1>
      <p className="text-muted-foreground mb-8 text-sm">
        An unexpected error occurred while loading the administrative workspace. Please try again, or return to the overview.
      </p>
      <div className="flex justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  );
}
