import { describe, it, expect } from "vitest";
import { verifyNoSqliteRuntime } from "../../../scripts/verify-no-sqlite-runtime";

describe("PrepFord Phase 6 Architecture Guard — Zero SQLite Runtime Enforcement", () => {
  it("enforces that no active runtime code in apps/web/src or apps/api imports or uses SQLite", () => {
    const result = verifyNoSqliteRuntime();

    if (!result.success) {
      console.error("Architecture Violations:", result.violations);
    }

    expect(result.violations).toEqual([]);
    expect(result.success).toBe(true);
    expect(result.scannedFileCount).toBeGreaterThan(10);
  });
});
