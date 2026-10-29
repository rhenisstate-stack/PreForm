import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import {
  extractFromSqlite,
  transformAndValidate,
  generateSqlScript,
  executeMigration,
} from "../../../tools/migration/migrator.ts";
import {
  isProductionDatabaseTarget,
  validateImageMagicBytes,
  computeSha256,
} from "../../../tools/migration/validator.ts";
import { createSanitizedFixture } from "../../../tools/migration/fixtures/create-sample-fixture.ts";

describe("Phase 4 — Safe SQLite-to-PostgreSQL Data Migration Tests", () => {
  const tempFixturePath = path.resolve("apps/web/.data/test_migration_fixture.sqlite");

  beforeEach(() => {
    createSanitizedFixture(tempFixturePath);
  });

  afterEach(() => {
    if (fs.existsSync(tempFixturePath)) {
      try {
        fs.unlinkSync(tempFixturePath);
      } catch {
        // ignore
      }
    }
  });

  describe("1. Extraction & Schema Parsing", () => {
    it("extracts all four core tables from SQLite source", () => {
      const data = extractFromSqlite(tempFixturePath);

      expect(data.users.length).toBe(3);
      expect(data.images.length).toBe(2);
      expect(data.plans.length).toBe(2);
      expect(data.sessions.length).toBe(3);
    });
  });

  describe("2. Transformation, Validation & Type Conversions", () => {
    it("transforms prices from dollars to cents and maps intervals to EF Core enums", () => {
      const raw = extractFromSqlite(tempFixturePath);
      const transformed = transformAndValidate(raw);

      const rnPro = transformed.plans.find((p) => p.id === "rn-pro");
      expect(rnPro).toBeDefined();
      expect(rnPro?.priceCents).toBe(5900); // 59 * 100
      expect(rnPro?.originalPriceCents).toBe(7900); // 79 * 100
      expect(rnPro?.interval).toBe(1); // Monthly = 1
      expect(rnPro?.billingInterval).toBe("month");
      expect(rnPro?.isActive).toBe(true);

      const archivedPlan = transformed.plans.find((p) => p.id === "rn-legacy-archived");
      expect(archivedPlan).toBeDefined();
      expect(archivedPlan?.isActive).toBe(false);
      expect(archivedPlan?.originalPriceCents).toBeNull();
    });

    it("verifies image magic bytes and confirms SHA-256 integrity", () => {
      const raw = extractFromSqlite(tempFixturePath);
      const transformed = transformAndValidate(raw);

      expect(transformed.images.length).toBe(1); // 1 valid image, 1 orphan skipped
      const claraImg = transformed.images[0];
      expect(claraImg.userId).toBe("usr_cand_valid_001");
      expect(claraImg.contentType).toBe("image/png");

      const magicCheck = validateImageMagicBytes(claraImg.imageData);
      expect(magicCheck.valid).toBe(true);
      expect(magicCheck.detectedType).toBe("image/png");

      const computed = computeSha256(claraImg.imageData);
      expect(claraImg.sha256Hash).toBe(computed);
    });

    it("assigns cryptographically secure reset markers instead of plaintext or weak passwords", () => {
      const raw = extractFromSqlite(tempFixturePath);
      const transformed = transformAndValidate(raw);

      for (const u of transformed.users) {
        expect(u.passwordHash).toMatch(/^RESET_REQUIRED_[a-f0-9]{32}$/);
        expect(u.passwordHash).not.toContain("password");
        expect(u.passwordHash).not.toContain("123");
      }
    });
  });

  describe("3. Conflict Detection, Orphan Handling & Privilege Guarding", () => {
    it("detects and skips orphan profile images and orphan sessions without corresponding user", () => {
      const raw = extractFromSqlite(tempFixturePath);
      const transformed = transformAndValidate(raw);

      // Orphan image check
      const imageConflicts = transformed.conflicts.filter((c) => c.entity === "image");
      expect(imageConflicts.length).toBe(1);
      expect(imageConflicts[0].id).toBe("img_orphan_999");
      expect(imageConflicts[0].reason).toContain("Orphan image references non-existent user ID");

      // Orphan session check
      const sessionConflicts = transformed.conflicts.filter((c) => c.entity === "session");
      expect(sessionConflicts.length).toBe(1);
      expect(sessionConflicts[0].id).toBe("sess_orphan_999");
      expect(sessionConflicts[0].reason).toContain("Orphan session references non-existent user ID");
    });

    it("detects duplicate emails across distinct user IDs and rejects duplicates", () => {
      const raw = extractFromSqlite(tempFixturePath);
      // Inject duplicate email with a different user_id
      raw.users.push({
        user_id: "usr_duplicate_email_attacker",
        email: "clara.candidate@example.edu", // duplicate of clara!
        display_name: "Imposter Clara",
        pathway: "rn",
        target_exam_date: "2026-11-30",
        active_plan: "NCLEX-RN Complete Preparation Plan",
        email_notifications: 1,
        study_reminders: 1,
        has_profile_image: 0,
        profile_image_updated_at: null,
        updated_at: "2026-10-25T10:00:00Z",
      });

      const transformed = transformAndValidate(raw);
      const userConflicts = transformed.conflicts.filter((c) => c.entity === "user");

      expect(userConflicts.length).toBe(1);
      expect(userConflicts[0].id).toBe("usr_duplicate_email_attacker");
      expect(userConflicts[0].reason).toContain("Duplicate email");
      expect(transformed.users.some((u) => u.id === "usr_duplicate_email_attacker")).toBe(false);
    });

    it("preserves candidate role and requires explicit session verification for admin role", () => {
      const raw = extractFromSqlite(tempFixturePath);
      const transformed = transformAndValidate(raw);

      const clara = transformed.users.find((u) => u.id === "usr_cand_valid_001");
      expect(clara?.role).toBe("candidate");

      const marcus = transformed.users.find((u) => u.id === "usr_admin_valid_002");
      expect(marcus?.role).toBe("admin");
    });

    it("enforces session revocation policy: all legacy sessions imported in Revoked state", () => {
      const raw = extractFromSqlite(tempFixturePath);
      const transformed = transformAndValidate(raw);

      expect(transformed.sessions.length).toBe(2); // 2 valid sessions, 1 orphan skipped
      for (const s of transformed.sessions) {
        expect(s.revoked).toBe(true);
        expect(s.tokenHash).toMatch(/^legacy_migrated_revoked_sess_/);
      }
    });

    it("flags ambiguous paid plan claims into review queue without inventing phantom orders", () => {
      const raw = extractFromSqlite(tempFixturePath);
      const transformed = transformAndValidate(raw);

      expect(transformed.ambiguousEntitlements.length).toBe(1);
      const queueItem = transformed.ambiguousEntitlements[0];
      expect(queueItem.userId).toBe("usr_ambig_paid_003");
      expect(queueItem.claimedPlan).toContain("All-Access");
      expect(queueItem.reason).toContain("claims paid plan without verified Order");
    });
  });

  describe("4. Production Safety Guard & Dry-Run Behavior", () => {
    it("detects production database URLs and refuses migration", () => {
      expect(isProductionDatabaseTarget("postgresql://user:pass@prepford_prod.internal:5432/prepford")).toBe(true);
      expect(isProductionDatabaseTarget("postgresql://user:pass@localhost:5432/prepford-production")).toBe(true);
      expect(isProductionDatabaseTarget("postgresql://user:pass@localhost:5432/prepford")).toBe(false);
      expect(isProductionDatabaseTarget("postgresql://postgres:postgres@127.0.0.1:5432/prepford_test")).toBe(false);
    });

    it("throws a Safety Refusal error when executing against a production connection string", async () => {
      const raw = extractFromSqlite(tempFixturePath);
      const transformed = transformAndValidate(raw);

      await expect(
        executeMigration(null, transformed, {
          connectionString: "postgresql://postgres:secret@rds.amazonaws.com/production",
        })
      ).rejects.toThrow(/SAFETY REFUSAL: Target connection string points to a production environment/);
    });

    it("dry-run generates a complete reconciliation report without executing database writes", async () => {
      const raw = extractFromSqlite(tempFixturePath);
      const transformed = transformAndValidate(raw);

      const report = await executeMigration(null, transformed, { dryRun: true });

      expect(report.dryRun).toBe(true);
      expect(report.success).toBe(true);
      expect(report.stats.users.sourceCount).toBe(3);
      expect(report.stats.users.insertedCount).toBe(3);
      expect(report.stats.images.sourceCount).toBe(2);
      expect(report.stats.images.insertedCount).toBe(1);
      expect(report.stats.images.conflictCount).toBe(1); // orphan skipped
      expect(report.conflicts.length).toBe(2); // 1 orphan image + 1 orphan session
      expect(report.ambiguousEntitlements.length).toBe(1);
    });
  });

  describe("5. Idempotent SQL Generation", () => {
    it("generates SQL with transaction wrappers and ON CONFLICT handling", () => {
      const raw = extractFromSqlite(tempFixturePath);
      const transformed = transformAndValidate(raw);

      const sql = generateSqlScript(transformed);

      expect(sql).toContain("BEGIN TRANSACTION;");
      expect(sql).toContain("COMMIT;");
      expect(sql).toContain(`INSERT INTO "Roles"`);
      expect(sql).toContain(`INSERT INTO "Users"`);
      expect(sql).toContain(`ON CONFLICT ("Id") DO UPDATE`);
      expect(sql).toContain(`INSERT INTO "SubscriptionPlans"`);
      expect(sql).toContain(`INSERT INTO "UserSessions"`);
      expect(sql).toContain(`ON CONFLICT ("Id") DO NOTHING`);
    });
  });
});
