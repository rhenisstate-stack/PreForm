import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

interface SqliteStatementSync {
  run: (...params: unknown[]) => { changes: number | bigint; lastInsertRowid: number | bigint };
  get: (...params: unknown[]) => unknown;
}

interface SqliteDatabaseSync {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatementSync;
  close: () => void;
}

function loadSqliteDatabaseConstructor(): new (location: string) => SqliteDatabaseSync {
  const procWithBuiltin = process as unknown as {
    getBuiltinModule?: (id: string) => { DatabaseSync: new (location: string) => SqliteDatabaseSync } | undefined;
  };
  const moduleId = ["node", "sqlite"].join(":");
  if (typeof procWithBuiltin.getBuiltinModule === "function") {
    const mod = procWithBuiltin.getBuiltinModule(moduleId);
    if (mod?.DatabaseSync) {
      return mod.DatabaseSync;
    }
  }
  const req = createRequire(path.join(process.cwd(), "package.json"));
  const fallbackMod = req(moduleId) as {
    DatabaseSync: new (location: string) => SqliteDatabaseSync;
  };
  return fallbackMod.DatabaseSync;
}

export const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MIN_PROFILE_IMAGE_BYTES = 16;

export type SupportedImageMimeType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export interface StoredProfileImageMeta {
  id: string;
  userId: string;
  userEmail: string;
  contentType: SupportedImageMimeType;
  sizeBytes: number;
  sha256Hash: string;
  updatedAt: string;
  imageUrl: string;
}

export interface StoredProfileImageBinary {
  imageData: Uint8Array;
  contentType: SupportedImageMimeType;
  sizeBytes: number;
  sha256Hash: string;
  updatedAt: string;
}

export interface StoredUserProfileRecord {
  userId: string;
  email: string;
  displayName: string;
  pathway: "rn" | "pn" | "both";
  targetExamDate: string;
  activePlan: string;
  emailNotifications: boolean;
  studyReminders: boolean;
  hasProfileImage: boolean;
  profileImageUpdatedAt: string | null;
  pictureUrl: string | undefined;
}

/**
 * Deterministically derives a user ID from a normalized email when needed so
 * repeat logins for the same candidate map to the same database record.
 */
export function deriveCandidateIdFromEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const digest = createHash("sha256").update(normalized).digest("hex").slice(0, 20);
  return `prf_usr_${digest}`;
}

/**
 * Inspects actual binary magic bytes to verify genuine raster image content.
 * Never trusts file extensions or client-supplied Content-Type headers alone.
 */
export function detectVerifiedImageMimeType(bytes: Uint8Array): SupportedImageMimeType | null {
  if (!bytes || bytes.byteLength < MIN_PROFILE_IMAGE_BYTES) {
    return null;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF: GIF87a or GIF89a
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

let dbInstance: SqliteDatabaseSync | null = null;
let currentDbPath: string | null = null;

function resolveDatabasePath(): string {
  if (process.env.PREPFORD_SQLITE_PATH) {
    return process.env.PREPFORD_SQLITE_PATH;
  }
  const dataDir = path.join(process.cwd(), ".data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "prepford.sqlite");
}

function getDatabase(): SqliteDatabaseSync {
  const targetPath = resolveDatabasePath();
  if (dbInstance && currentDbPath === targetPath) {
    return dbInstance;
  }

  if (targetPath !== ":memory:") {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const DatabaseSync = loadSqliteDatabaseConstructor();
  const db = new DatabaseSync(targetPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      pathway TEXT NOT NULL DEFAULT 'rn',
      target_exam_date TEXT NOT NULL DEFAULT '2026-11-30',
      active_plan TEXT NOT NULL DEFAULT 'NCLEX-RN Complete Preparation Plan',
      email_notifications INTEGER NOT NULL DEFAULT 1,
      study_reminders INTEGER NOT NULL DEFAULT 1,
      has_profile_image INTEGER NOT NULL DEFAULT 0,
      profile_image_updated_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profile_images (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      user_email TEXT NOT NULL UNIQUE,
      image_data BLOB NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      sha256_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'candidate',
      display_name TEXT NOT NULL,
      csrf_token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, revoked);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(email, revoked);
  `);

  dbInstance = db;
  currentDbPath = targetPath;
  return db;
}

export function getProfileDatabase(): SqliteDatabaseSync {
  return getDatabase();
}

export function resetProfileDatabaseForTesting(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // ignore close errors
    }
    dbInstance = null;
    currentDbPath = null;
  }
}

export function buildProfileImageUrl(updatedAtOrHash?: string | null): string {
  const version = updatedAtOrHash ? encodeURIComponent(updatedAtOrHash) : "1";
  return `/api/profile/image?v=${version}`;
}

/**
 * Projection query that fetches user profile metadata WITHOUT loading binary image blobs.
 */
export function getUserProfileMeta(userId: string, email: string): StoredUserProfileRecord | null {
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();

  const stmt = db.prepare(`
    SELECT
      p.user_id,
      p.email,
      p.display_name,
      p.pathway,
      p.target_exam_date,
      p.active_plan,
      p.email_notifications,
      p.study_reminders,
      p.has_profile_image,
      p.profile_image_updated_at,
      i.sha256_hash AS image_hash
    FROM user_profiles p
    LEFT JOIN user_profile_images i
      ON i.user_email = p.email OR i.user_id = p.user_id
    WHERE p.email = ? OR p.user_id = ?
    LIMIT 1
  `);

  const row = stmt.get(normalizedEmail, userId) as
    | {
        user_id: string;
        email: string;
        display_name: string;
        pathway: string;
        target_exam_date: string;
        active_plan: string;
        email_notifications: number;
        study_reminders: number;
        has_profile_image: number;
        profile_image_updated_at: string | null;
        image_hash: string | null;
      }
    | undefined;

  if (!row) {
    // Also check if an image exists directly in user_profile_images even before profile save
    const imgMetaStmt = db.prepare(`
      SELECT sha256_hash, updated_at
      FROM user_profile_images
      WHERE user_email = ? OR user_id = ?
      LIMIT 1
    `);
    const imgRow = imgMetaStmt.get(normalizedEmail, userId) as
      | { sha256_hash: string; updated_at: string }
      | undefined;

    if (!imgRow) {
      return null;
    }

    return {
      userId,
      email: normalizedEmail,
      displayName: "Nursing Candidate",
      pathway: "rn",
      targetExamDate: "2026-11-30",
      activePlan: "NCLEX-RN Complete Preparation Plan",
      emailNotifications: true,
      studyReminders: true,
      hasProfileImage: true,
      profileImageUpdatedAt: imgRow.updated_at,
      pictureUrl: buildProfileImageUrl(imgRow.sha256_hash),
    };
  }

  const hasImage = Boolean(row.has_profile_image || row.image_hash);
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    pathway: row.pathway === "both" ? "both" : row.pathway === "pn" ? "pn" : "rn",
    targetExamDate: row.target_exam_date,
    activePlan: row.active_plan,
    emailNotifications: Boolean(row.email_notifications),
    studyReminders: Boolean(row.study_reminders),
    hasProfileImage: hasImage,
    profileImageUpdatedAt: row.profile_image_updated_at,
    pictureUrl: hasImage
      ? buildProfileImageUrl(row.image_hash || row.profile_image_updated_at)
      : undefined,
  };
}

export function upsertUserProfileMeta(input: {
  userId: string;
  email: string;
  displayName: string;
  pathway: "rn" | "pn" | "both";
  targetExamDate?: string;
  activePlan?: string;
  emailNotifications?: boolean;
  studyReminders?: boolean;
}): StoredUserProfileRecord {
  const db = getDatabase();
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = getUserProfileMeta(input.userId, normalizedEmail);
  const now = new Date().toISOString();

  const effectiveUserId = existing?.userId || input.userId || deriveCandidateIdFromEmail(normalizedEmail);
  const displayName = input.displayName.trim() || existing?.displayName || "Nursing Candidate";
  const pathway = input.pathway || existing?.pathway || "rn";
  const targetExamDate = input.targetExamDate || existing?.targetExamDate || "2026-11-30";
  const activePlan = input.activePlan || existing?.activePlan || "NCLEX-RN Complete Preparation Plan";
  const emailNotifications =
    input.emailNotifications !== undefined ? input.emailNotifications : (existing?.emailNotifications ?? true);
  const studyReminders =
    input.studyReminders !== undefined ? input.studyReminders : (existing?.studyReminders ?? true);
  const hasProfileImage = existing?.hasProfileImage ?? false;
  const profileImageUpdatedAt = existing?.profileImageUpdatedAt ?? null;

  const stmt = db.prepare(`
    INSERT INTO user_profiles (
      user_id,
      email,
      display_name,
      pathway,
      target_exam_date,
      active_plan,
      email_notifications,
      study_reminders,
      has_profile_image,
      profile_image_updated_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      display_name = excluded.display_name,
      pathway = excluded.pathway,
      target_exam_date = excluded.target_exam_date,
      active_plan = excluded.active_plan,
      email_notifications = excluded.email_notifications,
      study_reminders = excluded.study_reminders,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    effectiveUserId,
    normalizedEmail,
    displayName,
    pathway,
    targetExamDate,
    activePlan,
    emailNotifications ? 1 : 0,
    studyReminders ? 1 : 0,
    hasProfileImage ? 1 : 0,
    profileImageUpdatedAt,
    now
  );

  return getUserProfileMeta(effectiveUserId, normalizedEmail)!;
}

export function saveProfileImageBinary(input: {
  userId: string;
  userEmail: string;
  displayName?: string;
  imageBytes: Uint8Array;
}): StoredProfileImageMeta {
  if (!input.userId || !input.userEmail) {
    throw new Error("Authenticated user identity is required.");
  }

  if (!input.imageBytes || input.imageBytes.byteLength === 0) {
    throw new Error("Image file cannot be empty.");
  }

  if (input.imageBytes.byteLength > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Profile image exceeds the maximum allowed size of 2 MB.");
  }

  const verifiedMime = detectVerifiedImageMimeType(input.imageBytes);
  if (!verifiedMime) {
    throw new Error(
      "Unsupported or invalid image file. Please upload a valid PNG, JPEG, WebP, or GIF image."
    );
  }

  const db = getDatabase();
  const normalizedEmail = input.userEmail.trim().toLowerCase();
  const now = new Date().toISOString();
  const sha256Hash = createHash("sha256").update(input.imageBytes).digest("hex");

  // Ensure user_profiles row exists without overwriting existing fields
  const existingProfile = getUserProfileMeta(input.userId, normalizedEmail);
  const effectiveUserId =
    existingProfile?.userId || input.userId || deriveCandidateIdFromEmail(normalizedEmail);

  const upsertProfileStmt = db.prepare(`
    INSERT INTO user_profiles (
      user_id,
      email,
      display_name,
      pathway,
      target_exam_date,
      active_plan,
      email_notifications,
      study_reminders,
      has_profile_image,
      profile_image_updated_at,
      updated_at
    ) VALUES (?, ?, ?, 'rn', '2026-11-30', 'NCLEX-RN Complete Preparation Plan', 1, 1, 1, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      has_profile_image = 1,
      profile_image_updated_at = excluded.profile_image_updated_at,
      updated_at = excluded.updated_at
  `);

  upsertProfileStmt.run(
    effectiveUserId,
    normalizedEmail,
    input.displayName || existingProfile?.displayName || "Nursing Candidate",
    now,
    now
  );

  // Replace any prior image for this userId or email
  const deleteOldStmt = db.prepare(`
    DELETE FROM user_profile_images
    WHERE user_id = ? OR user_email = ?
  `);
  deleteOldStmt.run(effectiveUserId, normalizedEmail);

  const id = randomUUID();
  const insertImgStmt = db.prepare(`
    INSERT INTO user_profile_images (
      id,
      user_id,
      user_email,
      image_data,
      content_type,
      size_bytes,
      sha256_hash,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertImgStmt.run(
    id,
    effectiveUserId,
    normalizedEmail,
    input.imageBytes,
    verifiedMime,
    input.imageBytes.byteLength,
    sha256Hash,
    now,
    now
  );

  return {
    id,
    userId: effectiveUserId,
    userEmail: normalizedEmail,
    contentType: verifiedMime,
    sizeBytes: input.imageBytes.byteLength,
    sha256Hash,
    updatedAt: now,
    imageUrl: buildProfileImageUrl(sha256Hash),
  };
}

export function getProfileImageBinary(
  userId: string,
  userEmail: string
): StoredProfileImageBinary | null {
  const db = getDatabase();
  const normalizedEmail = userEmail.trim().toLowerCase();

  const stmt = db.prepare(`
    SELECT
      image_data,
      content_type,
      size_bytes,
      sha256_hash,
      updated_at
    FROM user_profile_images
    WHERE user_email = ? OR user_id = ?
    LIMIT 1
  `);

  const row = stmt.get(normalizedEmail, userId) as
    | {
        image_data: Uint8Array;
        content_type: SupportedImageMimeType;
        size_bytes: number;
        sha256_hash: string;
        updated_at: string;
      }
    | undefined;

  if (!row || !row.image_data) {
    return null;
  }

  return {
    imageData: new Uint8Array(row.image_data),
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    sha256Hash: row.sha256_hash,
    updatedAt: row.updated_at,
  };
}

export function deleteProfileImageBinary(userId: string, userEmail: string): boolean {
  const db = getDatabase();
  const normalizedEmail = userEmail.trim().toLowerCase();
  const now = new Date().toISOString();

  const delStmt = db.prepare(`
    DELETE FROM user_profile_images
    WHERE user_email = ? OR user_id = ?
  `);
  const result = delStmt.run(normalizedEmail, userId);

  const updateProfileStmt = db.prepare(`
    UPDATE user_profiles
    SET has_profile_image = 0,
        profile_image_updated_at = NULL,
        updated_at = ?
    WHERE email = ? OR user_id = ?
  `);
  updateProfileStmt.run(now, normalizedEmail, userId);

  return Number(result.changes) > 0;
}
