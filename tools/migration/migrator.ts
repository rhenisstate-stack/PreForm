import crypto from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import type {
  SqliteUserProfile,
  SqliteUserProfileImage,
  SqliteSubscriptionPlan,
  SqliteUserSession,
  PostgresUser,
  PostgresUserProfileImage,
  PostgresSubscriptionPlan,
  PostgresUserSession,
  MigrationConflict,
  AmbiguousEntitlementRecord,
  MigrationReconciliationReport,
  EntityReconciliationStats,
} from "./types.ts";
import {
  computeSha256,
  mapIntervalToEnum,
  normalizeEmail,
  validateImageMagicBytes,
  isProductionDatabaseTarget,
} from "./validator.ts";

interface SqliteDatabaseSync {
  prepare: (sql: string) => { all: () => unknown[] };
  close: () => void;
}

function getDatabaseConstructor(): new (loc: string, opt?: any) => SqliteDatabaseSync {
  const proc = process as any;
  const modId = ["node", "sqlite"].join(":");
  if (typeof proc.getBuiltinModule === "function") {
    const mod = proc.getBuiltinModule(modId);
    if (mod?.DatabaseSync) return mod.DatabaseSync;
  }
  const req = createRequire(import.meta.url || path.join(process.cwd(), "package.json"));
  return req(modId).DatabaseSync;
}

export interface ExtractedSqliteData {
  users: SqliteUserProfile[];
  images: SqliteUserProfileImage[];
  plans: SqliteSubscriptionPlan[];
  sessions: SqliteUserSession[];
}

export interface TransformedMigrationData {
  users: PostgresUser[];
  images: PostgresUserProfileImage[];
  plans: PostgresSubscriptionPlan[];
  sessions: PostgresUserSession[];
  conflicts: MigrationConflict[];
  ambiguousEntitlements: AmbiguousEntitlementRecord[];
  checksums: {
    users: string;
    images: string;
    plans: string;
    sessions: string;
  };
}

/**
 * Extracts raw tables from SQLite database.
 */
export function extractFromSqlite(dbPath: string): ExtractedSqliteData {
  const DatabaseConstructor = getDatabaseConstructor();
  const db = new DatabaseConstructor(dbPath, { open: true, readOnly: true });

  try {
    const tableRows = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;
    const tableNames = new Set(tableRows.map((r) => r.name));

    const users: SqliteUserProfile[] = tableNames.has("user_profiles")
      ? (db.prepare("SELECT * FROM user_profiles").all() as unknown as SqliteUserProfile[])
      : [];

    const images: SqliteUserProfileImage[] = tableNames.has("user_profile_images")
      ? (db.prepare("SELECT * FROM user_profile_images").all() as unknown as SqliteUserProfileImage[])
      : [];

    const plans: SqliteSubscriptionPlan[] = tableNames.has("subscription_plans")
      ? (db.prepare("SELECT * FROM subscription_plans").all() as unknown as SqliteSubscriptionPlan[])
      : [];

    const sessions: SqliteUserSession[] = tableNames.has("user_sessions")
      ? (db.prepare("SELECT * FROM user_sessions").all() as unknown as SqliteUserSession[])
      : [];

    return { users, images, plans, sessions };
  } finally {
    db.close();
  }
}

/**
 * Validates, normalizes, detects conflicts, and maps SQLite entities to PostgreSQL target shapes.
 */
export function transformAndValidate(raw: ExtractedSqliteData): TransformedMigrationData {
  const conflicts: MigrationConflict[] = [];
  const ambiguousEntitlements: AmbiguousEntitlementRecord[] = [];

  // ── 1. Transform Users ──────────────────────────────────────────────────
  const transformedUsers: PostgresUser[] = [];
  const seenEmails = new Map<string, string>(); // email -> userId
  const seenUserIds = new Set<string>();

  for (const rawUser of raw.users) {
    const normalizedEmail = normalizeEmail(rawUser.email);

    // Conflict Check: Duplicate email across different IDs
    if (seenEmails.has(normalizedEmail)) {
      conflicts.push({
        entity: "user",
        id: rawUser.user_id,
        identifier: normalizedEmail,
        reason: `Duplicate email '${normalizedEmail}' already mapped to user ID '${seenEmails.get(normalizedEmail)}'.`,
        actionTaken: "skipped",
      });
      continue;
    }

    // Conflict Check: Duplicate user ID
    if (seenUserIds.has(rawUser.user_id)) {
      conflicts.push({
        entity: "user",
        id: rawUser.user_id,
        identifier: rawUser.user_id,
        reason: `Duplicate user ID '${rawUser.user_id}' encountered.`,
        actionTaken: "skipped",
      });
      continue;
    }

    // Role resolution from sessions
    const userSessionRows = raw.sessions.filter((s) => s.user_id === rawUser.user_id);
    const hasAdminSession = userSessionRows.some(
      (s) => s.role.toLowerCase() === "admin" || s.role.toLowerCase() === "superadmin"
    );
    const assignedRole = hasAdminSession ? "admin" : "candidate";

    // Ambiguous paid entitlement detection
    const isFreePlan =
      !rawUser.active_plan ||
      rawUser.active_plan.toLowerCase().includes("complete preparation plan") ||
      rawUser.active_plan.toLowerCase().includes("starter");

    if (!isFreePlan) {
      ambiguousEntitlements.push({
        userId: rawUser.user_id,
        email: normalizedEmail,
        claimedPlan: rawUser.active_plan,
        pathway: rawUser.pathway,
        reason: "User profile claims paid plan without verified Order or PaymentTransaction in source database.",
      });
    }

    const secureResetToken = crypto.randomBytes(16).toString("hex");
    const passwordHashPlaceholder = `RESET_REQUIRED_${secureResetToken}`;

    const updatedAtDate = rawUser.updated_at ? new Date(rawUser.updated_at) : new Date();
    const createdAtDate =
      userSessionRows.length > 0 && userSessionRows[0].created_at
        ? new Date(userSessionRows[0].created_at)
        : updatedAtDate;

    transformedUsers.push({
      id: rawUser.user_id,
      email: normalizedEmail,
      passwordHash: passwordHashPlaceholder,
      displayName: rawUser.display_name?.trim() || "Nursing Candidate",
      pathway: rawUser.pathway?.trim().toLowerCase() || "rn",
      targetExamDate: rawUser.target_exam_date || "2026-11-30",
      activePlan: rawUser.active_plan || "NCLEX-RN Complete Preparation Plan",
      emailNotifications: Boolean(rawUser.email_notifications),
      studyReminders: Boolean(rawUser.study_reminders),
      isActive: true,
      hasProfileImage: Boolean(rawUser.has_profile_image),
      profileImageUpdatedAt: rawUser.profile_image_updated_at
        ? new Date(rawUser.profile_image_updated_at)
        : null,
      createdAt: isNaN(createdAtDate.getTime()) ? new Date() : createdAtDate,
      updatedAt: isNaN(updatedAtDate.getTime()) ? new Date() : updatedAtDate,
      role: assignedRole,
    });

    seenEmails.set(normalizedEmail, rawUser.user_id);
    seenUserIds.add(rawUser.user_id);
  }

  // ── 2. Transform Profile Images ─────────────────────────────────────────
  const transformedImages: PostgresUserProfileImage[] = [];
  const validUserIds = new Set(transformedUsers.map((u) => u.id));

  for (const rawImage of raw.images) {
    // Orphan Check
    if (!validUserIds.has(rawImage.user_id)) {
      conflicts.push({
        entity: "image",
        id: rawImage.id,
        identifier: rawImage.user_id,
        reason: `Orphan image references non-existent user ID '${rawImage.user_id}'.`,
        actionTaken: "skipped",
      });
      continue;
    }

    // Binary Magic Bytes Validation
    const magicResult = validateImageMagicBytes(rawImage.image_data);
    if (!magicResult.valid) {
      conflicts.push({
        entity: "image",
        id: rawImage.id,
        identifier: rawImage.user_id,
        reason: `Image binary magic byte check failed: ${magicResult.error}`,
        actionTaken: "skipped",
      });
      continue;
    }

    // SHA-256 Hash Recalculation
    const computedHash = computeSha256(rawImage.image_data);
    if (rawImage.sha256_hash && rawImage.sha256_hash.toLowerCase() !== computedHash) {
      conflicts.push({
        entity: "image",
        id: rawImage.id,
        identifier: rawImage.user_id,
        reason: `Image checksum mismatch: stored '${rawImage.sha256_hash}' vs computed '${computedHash}'.`,
        actionTaken: "skipped",
      });
      continue;
    }

    const createdDate = rawImage.created_at ? new Date(rawImage.created_at) : new Date();
    const updatedDate = rawImage.updated_at ? new Date(rawImage.updated_at) : new Date();

    transformedImages.push({
      id: rawImage.id || `img_${rawImage.user_id}`,
      userId: rawImage.user_id,
      userEmail: normalizeEmail(rawImage.user_email),
      imageData: rawImage.image_data,
      contentType: magicResult.detectedType || rawImage.content_type || "image/png",
      sizeBytes: rawImage.size_bytes || rawImage.image_data.length,
      sha256Hash: computedHash,
      createdAt: isNaN(createdDate.getTime()) ? new Date() : createdDate,
      updatedAt: isNaN(updatedDate.getTime()) ? new Date() : updatedDate,
    });
  }

  // ── 3. Transform Subscription Plans ─────────────────────────────────────
  const transformedPlans: PostgresSubscriptionPlan[] = [];
  const seenPlanSlugs = new Set<string>();

  for (const rawPlan of raw.plans) {
    const slug = rawPlan.slug?.trim().toLowerCase();
    if (seenPlanSlugs.has(slug)) {
      conflicts.push({
        entity: "plan",
        id: rawPlan.id,
        identifier: slug,
        reason: `Duplicate plan slug '${slug}'.`,
        actionTaken: "skipped",
      });
      continue;
    }

    let featuresJson = "[]";
    try {
      const parsed = JSON.parse(rawPlan.features_json);
      featuresJson = JSON.stringify(parsed);
    } catch {
      featuresJson = "[]";
    }

    let entitlementsJson = "[\"rn\"]";
    try {
      const parsed = JSON.parse(rawPlan.entitlements_json);
      entitlementsJson = JSON.stringify(parsed);
    } catch {
      entitlementsJson = "[\"rn\"]";
    }

    const createdDate = rawPlan.created_at ? new Date(rawPlan.created_at) : new Date();
    const updatedDate = rawPlan.updated_at ? new Date(rawPlan.updated_at) : new Date();

    transformedPlans.push({
      id: rawPlan.id,
      slug,
      name: rawPlan.name,
      code: rawPlan.id.toUpperCase(),
      description: rawPlan.description,
      audience: rawPlan.audience,
      pathway: rawPlan.pathway,
      planType: rawPlan.plan_type,
      priceCents: Math.round((rawPlan.price || 0) * 100),
      originalPriceCents:
        rawPlan.original_price !== null && rawPlan.original_price !== undefined
          ? Math.round(rawPlan.original_price * 100)
          : null,
      currency: rawPlan.currency || "USD",
      interval: mapIntervalToEnum(rawPlan.billing_interval),
      billingInterval: rawPlan.billing_interval || "month",
      durationLabel: rawPlan.duration_label,
      featuresJson,
      popular: Boolean(rawPlan.popular),
      bgColour: rawPlan.bg_colour,
      accentColour: rawPlan.accent_colour,
      textColour: rawPlan.text_colour,
      badgeText: rawPlan.badge_text,
      displayOrder: rawPlan.display_order ?? 0,
      isActive: Boolean(rawPlan.is_active ?? 1),
      entitlementsJson,
      createdAt: isNaN(createdDate.getTime()) ? new Date() : createdDate,
      updatedAt: isNaN(updatedDate.getTime()) ? new Date() : updatedDate,
    });

    seenPlanSlugs.add(slug);
  }

  // ── 4. Transform Sessions (Revocation Enforcement) ──────────────────────
  const transformedSessions: PostgresUserSession[] = [];

  for (const rawSession of raw.sessions) {
    if (!validUserIds.has(rawSession.user_id)) {
      conflicts.push({
        entity: "session",
        id: rawSession.id,
        identifier: rawSession.user_id,
        reason: `Orphan session references non-existent user ID '${rawSession.user_id}'.`,
        actionTaken: "skipped",
      });
      continue;
    }

    const createdDate = rawSession.created_at ? new Date(rawSession.created_at) : new Date();
    const expiresDate = rawSession.expires_at ? new Date(rawSession.expires_at) : new Date();
    const lastActiveDate = rawSession.last_active_at ? new Date(rawSession.last_active_at) : new Date();

    // Security Enforcement: All legacy sessions imported with Revoked = true
    transformedSessions.push({
      id: rawSession.id,
      userId: rawSession.user_id,
      email: normalizeEmail(rawSession.email),
      role: rawSession.role?.trim().toLowerCase() || "candidate",
      displayName: rawSession.display_name?.trim() || "Nursing Candidate",
      tokenHash: `legacy_migrated_revoked_${rawSession.id}`,
      csrfToken: rawSession.csrf_token || "legacy_csrf",
      createdAt: isNaN(createdDate.getTime()) ? new Date() : createdDate,
      expiresAt: isNaN(expiresDate.getTime()) ? new Date() : expiresDate,
      lastActiveAt: isNaN(lastActiveDate.getTime()) ? new Date() : lastActiveDate,
      revoked: true,
    });
  }

  // ── Checksums ───────────────────────────────────────────────────────────
  const checksums = {
    users: computeSha256(
      transformedUsers.map((u) => `${u.id}:${u.email}:${u.pathway}:${u.activePlan}`).join("|")
    ),
    images: computeSha256(
      transformedImages.map((i) => `${i.id}:${i.userId}:${i.sha256Hash}`).join("|")
    ),
    plans: computeSha256(
      transformedPlans.map((p) => `${p.id}:${p.slug}:${p.priceCents}:${p.isActive}`).join("|")
    ),
    sessions: computeSha256(
      transformedSessions.map((s) => `${s.id}:${s.userId}:${s.revoked}`).join("|")
    ),
  };

  return {
    users: transformedUsers,
    images: transformedImages,
    plans: transformedPlans,
    sessions: transformedSessions,
    conflicts,
    ambiguousEntitlements,
    checksums,
  };
}

/**
 * Generates an idempotent, parameterized PostgreSQL SQL migration script.
 */
export function generateSqlScript(data: TransformedMigrationData): string {
  const lines: string[] = [
    "-- PrepFord SQLite-to-PostgreSQL Authoritative Migration Script",
    "-- Generated: " + new Date().toISOString(),
    "BEGIN TRANSACTION;",
    "",
    "-- 1. Seed Required RBAC Roles",
    `INSERT INTO "Roles" ("Id", "Name", "Description", "IsSystem", "CreatedAt")`,
    `VALUES`,
    `  ('role_candidate', 'candidate', 'Standard nursing examination candidate', true, NOW()),`,
    `  ('role_admin', 'admin', 'Administrative privileges for subscription and platform management', true, NOW())`,
    `ON CONFLICT ("Id") DO NOTHING;`,
    "",
  ];

  // 2. Subscription Plans
  lines.push("-- 2. Subscription Plans");
  for (const p of data.plans) {
    const esc = (s: string | null) => (s ? `'${s.replace(/'/g, "''")}'` : "NULL");
    lines.push(
      `INSERT INTO "SubscriptionPlans" (`,
      `  "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",`,
      `  "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",`,
      `  "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",`,
      `  "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"`,
      `) VALUES (`,
      `  ${esc(p.id)}, ${esc(p.slug)}, ${esc(p.name)}, ${esc(p.code)}, ${esc(p.description)}, ${esc(p.audience)},`,
      `  ${esc(p.pathway)}, ${esc(p.planType)}, ${p.priceCents}, ${p.originalPriceCents ?? "NULL"},`,
      `  ${esc(p.currency)}, ${p.interval}, ${esc(p.billingInterval)}, ${esc(p.durationLabel)},`,
      `  ${esc(p.featuresJson)}, ${p.popular}, ${esc(p.bgColour)}, ${esc(p.accentColour)}, ${esc(p.textColour)},`,
      `  ${esc(p.badgeText)}, ${p.displayOrder}, ${p.isActive}, ${esc(p.entitlementsJson)},`,
      `  '${p.createdAt.toISOString()}', '${p.updatedAt.toISOString()}'`,
      `) ON CONFLICT ("Id") DO UPDATE SET`,
      `  "Name" = EXCLUDED."Name",`,
      `  "Description" = EXCLUDED."Description",`,
      `  "PriceCents" = EXCLUDED."PriceCents",`,
      `  "IsActive" = EXCLUDED."IsActive",`,
      `  "UpdatedAt" = EXCLUDED."UpdatedAt";`
    );
  }
  lines.push("");

  // 3. Users & UserRoles
  lines.push("-- 3. Users and User Roles");
  for (const u of data.users) {
    const esc = (s: string | null) => (s ? `'${s.replace(/'/g, "''")}'` : "NULL");
    lines.push(
      `INSERT INTO "Users" (`,
      `  "Id", "Email", "PasswordHash", "DisplayName", "Pathway", "TargetExamDate", "ActivePlan",`,
      `  "EmailNotifications", "StudyReminders", "IsActive", "HasProfileImage", "ProfileImageUpdatedAt",`,
      `  "CreatedAt", "UpdatedAt"`,
      `) VALUES (`,
      `  ${esc(u.id)}, ${esc(u.email)}, ${esc(u.passwordHash)}, ${esc(u.displayName)}, ${esc(u.pathway)},`,
      `  ${esc(u.targetExamDate)}, ${esc(u.activePlan)}, ${u.emailNotifications}, ${u.studyReminders},`,
      `  ${u.isActive}, ${u.hasProfileImage}, ${u.profileImageUpdatedAt ? `'${u.profileImageUpdatedAt.toISOString()}'` : "NULL"},`,
      `  '${u.createdAt.toISOString()}', '${u.updatedAt.toISOString()}'`,
      `) ON CONFLICT ("Id") DO UPDATE SET`,
      `  "DisplayName" = EXCLUDED."DisplayName",`,
      `  "Pathway" = EXCLUDED."Pathway",`,
      `  "TargetExamDate" = EXCLUDED."TargetExamDate",`,
      `  "UpdatedAt" = EXCLUDED."UpdatedAt";`,
      "",
      `INSERT INTO "UserRoles" ("UserId", "RoleId")`,
      `VALUES (${esc(u.id)}, ${u.role === "admin" ? "'role_admin'" : "'role_candidate'"})`,
      `ON CONFLICT DO NOTHING;`
    );
  }
  lines.push("");

  // 4. User Sessions
  lines.push("-- 4. User Sessions (Revoked)");
  for (const s of data.sessions) {
    const esc = (str: string | null) => (str ? `'${str.replace(/'/g, "''")}'` : "NULL");
    lines.push(
      `INSERT INTO "UserSessions" (`,
      `  "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",`,
      `  "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"`,
      `) VALUES (`,
      `  ${esc(s.id)}, ${esc(s.userId)}, ${esc(s.email)}, ${esc(s.role)}, ${esc(s.displayName)},`,
      `  ${esc(s.tokenHash)}, ${esc(s.csrfToken)}, '${s.createdAt.toISOString()}',`,
      `  '${s.expiresAt.toISOString()}', '${s.lastActiveAt.toISOString()}', ${s.revoked}`,
      `) ON CONFLICT ("Id") DO NOTHING;`
    );
  }
  lines.push("");

  lines.push("COMMIT;");
  return lines.join("\n");
}

/**
 * Executes migration against PostgreSQL with transaction safety, idempotency, and reconciliation.
 */
export async function executeMigration(
  pgClient: any,
  data: TransformedMigrationData,
  options: {
    dryRun?: boolean;
    forceProduction?: boolean;
    connectionString?: string;
  } = {}
): Promise<MigrationReconciliationReport> {
  const isProd = isProductionDatabaseTarget(options.connectionString || "");
  if (isProd && !options.forceProduction) {
    throw new Error(
      "SAFETY REFUSAL: Target connection string points to a production environment. Live production migration is prohibited in Phase 4."
    );
  }

  const stats = {
    users: {
      sourceCount: data.users.length + data.conflicts.filter((c) => c.entity === "user").length,
      targetCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: data.conflicts.filter((c) => c.entity === "user").length,
      conflictCount: data.conflicts.filter((c) => c.entity === "user").length,
      checksum: data.checksums.users,
    },
    images: {
      sourceCount: data.images.length + data.conflicts.filter((c) => c.entity === "image").length,
      targetCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: data.conflicts.filter((c) => c.entity === "image").length,
      conflictCount: data.conflicts.filter((c) => c.entity === "image").length,
      checksum: data.checksums.images,
    },
    plans: {
      sourceCount: data.plans.length + data.conflicts.filter((c) => c.entity === "plan").length,
      targetCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: data.conflicts.filter((c) => c.entity === "plan").length,
      conflictCount: data.conflicts.filter((c) => c.entity === "plan").length,
      checksum: data.checksums.plans,
    },
    sessions: {
      sourceCount:
        data.sessions.length + data.conflicts.filter((c) => c.entity === "session").length,
      targetCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: data.conflicts.filter((c) => c.entity === "session").length,
      conflictCount: data.conflicts.filter((c) => c.entity === "session").length,
      checksum: data.checksums.sessions,
    },
  };

  if (options.dryRun || !pgClient) {
    // In dry run mode, return simulated reconciliation without writing
    stats.users.insertedCount = data.users.length;
    stats.users.targetCount = data.users.length;
    stats.images.insertedCount = data.images.length;
    stats.images.targetCount = data.images.length;
    stats.plans.insertedCount = data.plans.length;
    stats.plans.targetCount = data.plans.length;
    stats.sessions.insertedCount = data.sessions.length;
    stats.sessions.targetCount = data.sessions.length;

    return {
      timestamp: new Date().toISOString(),
      dryRun: true,
      sourceDbPath: "SQLite",
      targetHost: "localhost",
      targetDatabase: "prepford",
      success: true,
      stats,
      conflicts: data.conflicts,
      ambiguousEntitlements: data.ambiguousEntitlements,
    };
  }

  // Live Database Execution
  await pgClient.query("BEGIN;");
  try {
    // 1. Ensure Roles
    await pgClient.query(`
      INSERT INTO "Roles" ("Id", "Name", "Description", "IsSystem", "CreatedAt")
      VALUES
        ('role_candidate', 'candidate', 'Standard nursing examination candidate', true, NOW()),
        ('role_admin', 'admin', 'Administrative privileges for subscription and platform management', true, NOW())
      ON CONFLICT ("Id") DO NOTHING;
    `);

    // 2. Insert Subscription Plans
    for (const p of data.plans) {
      await pgClient.query(
        `
        INSERT INTO "SubscriptionPlans" (
          "Id", "Slug", "Name", "Code", "Description", "Audience", "Pathway", "PlanType",
          "PriceCents", "OriginalPriceCents", "Currency", "Interval", "BillingInterval",
          "DurationLabel", "FeaturesJson", "Popular", "BgColour", "AccentColour", "TextColour",
          "BadgeText", "DisplayOrder", "IsActive", "EntitlementsJson", "CreatedAt", "UpdatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        ) ON CONFLICT ("Id") DO UPDATE SET
          "Name" = EXCLUDED."Name",
          "Description" = EXCLUDED."Description",
          "PriceCents" = EXCLUDED."PriceCents",
          "IsActive" = EXCLUDED."IsActive",
          "UpdatedAt" = EXCLUDED."UpdatedAt";
      `,
        [
          p.id,
          p.slug,
          p.name,
          p.code,
          p.description,
          p.audience,
          p.pathway,
          p.planType,
          p.priceCents,
          p.originalPriceCents,
          p.currency,
          p.interval,
          p.billingInterval,
          p.durationLabel,
          p.featuresJson,
          p.popular,
          p.bgColour,
          p.accentColour,
          p.textColour,
          p.badgeText,
          p.displayOrder,
          p.isActive,
          p.entitlementsJson,
          p.createdAt,
          p.updatedAt,
        ]
      );
      stats.plans.insertedCount++;
    }

    // 3. Insert Users & UserRoles
    for (const u of data.users) {
      await pgClient.query(
        `
        INSERT INTO "Users" (
          "Id", "Email", "PasswordHash", "DisplayName", "Pathway", "TargetExamDate", "ActivePlan",
          "EmailNotifications", "StudyReminders", "IsActive", "HasProfileImage", "ProfileImageUpdatedAt",
          "CreatedAt", "UpdatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) ON CONFLICT ("Id") DO UPDATE SET
          "DisplayName" = EXCLUDED."DisplayName",
          "Pathway" = EXCLUDED."Pathway",
          "TargetExamDate" = EXCLUDED."TargetExamDate",
          "UpdatedAt" = EXCLUDED."UpdatedAt";
      `,
        [
          u.id,
          u.email,
          u.passwordHash,
          u.displayName,
          u.pathway,
          u.targetExamDate,
          u.activePlan,
          u.emailNotifications,
          u.studyReminders,
          u.isActive,
          u.hasProfileImage,
          u.profileImageUpdatedAt,
          u.createdAt,
          u.updatedAt,
        ]
      );
      stats.users.insertedCount++;

      const roleId = u.role === "admin" ? "role_admin" : "role_candidate";
      await pgClient.query(
        `INSERT INTO "UserRoles" ("UserId", "RoleId") VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
        [u.id, roleId]
      );
    }

    // 4. Insert Profile Images
    for (const img of data.images) {
      await pgClient.query(
        `
        INSERT INTO "UserProfileImages" (
          "Id", "UserId", "UserEmail", "ImageData", "ContentType", "SizeBytes", "Sha256Hash",
          "CreatedAt", "UpdatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        ) ON CONFLICT ("UserId") DO UPDATE SET
          "ImageData" = EXCLUDED."ImageData",
          "ContentType" = EXCLUDED."ContentType",
          "SizeBytes" = EXCLUDED."SizeBytes",
          "Sha256Hash" = EXCLUDED."Sha256Hash",
          "UpdatedAt" = EXCLUDED."UpdatedAt";
      `,
        [
          img.id,
          img.userId,
          img.userEmail,
          img.imageData,
          img.contentType,
          img.sizeBytes,
          img.sha256Hash,
          img.createdAt,
          img.updatedAt,
        ]
      );
      stats.images.insertedCount++;
    }

    // 5. Insert Sessions (Revoked)
    for (const s of data.sessions) {
      await pgClient.query(
        `
        INSERT INTO "UserSessions" (
          "Id", "UserId", "Email", "Role", "DisplayName", "TokenHash", "CsrfToken",
          "CreatedAt", "ExpiresAt", "LastActiveAt", "Revoked"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) ON CONFLICT ("Id") DO NOTHING;
      `,
        [
          s.id,
          s.userId,
          s.email,
          s.role,
          s.displayName,
          s.tokenHash,
          s.csrfToken,
          s.createdAt,
          s.expiresAt,
          s.lastActiveAt,
          s.revoked,
        ]
      );
      stats.sessions.insertedCount++;
    }

    await pgClient.query("COMMIT;");

    // Reconcile total target counts
    const countUsersRes = await pgClient.query(`SELECT COUNT(*) as c FROM "Users";`);
    stats.users.targetCount = Number(countUsersRes.rows[0].c);

    const countPlansRes = await pgClient.query(`SELECT COUNT(*) as c FROM "SubscriptionPlans";`);
    stats.plans.targetCount = Number(countPlansRes.rows[0].c);

    const countImagesRes = await pgClient.query(`SELECT COUNT(*) as c FROM "UserProfileImages";`);
    stats.images.targetCount = Number(countImagesRes.rows[0].c);

    const countSessionsRes = await pgClient.query(`SELECT COUNT(*) as c FROM "UserSessions";`);
    stats.sessions.targetCount = Number(countSessionsRes.rows[0].c);

    return {
      timestamp: new Date().toISOString(),
      dryRun: false,
      sourceDbPath: "SQLite",
      targetHost: "localhost",
      targetDatabase: "prepford",
      success: true,
      stats,
      conflicts: data.conflicts,
      ambiguousEntitlements: data.ambiguousEntitlements,
    };
  } catch (err) {
    await pgClient.query("ROLLBACK;");
    throw err;
  }
}
