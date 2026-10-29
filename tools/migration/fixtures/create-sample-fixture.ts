import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function createSanitizedFixture(fixturePath: string): void {
  const dir = path.dirname(fixturePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(fixturePath)) {
    fs.unlinkSync(fixturePath);
  }

  const db = new DatabaseSync(fixturePath, { open: true });

  db.exec(`
    CREATE TABLE user_profiles (
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

    CREATE TABLE user_profile_images (
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

    CREATE TABLE subscription_plans (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      audience TEXT,
      pathway TEXT NOT NULL,
      plan_type TEXT NOT NULL,
      price INTEGER NOT NULL,
      original_price INTEGER,
      currency TEXT NOT NULL DEFAULT 'USD',
      billing_interval TEXT NOT NULL,
      duration_label TEXT,
      features_json TEXT NOT NULL,
      popular INTEGER NOT NULL DEFAULT 0,
      bg_colour TEXT,
      accent_colour TEXT,
      text_colour TEXT,
      badge_text TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      entitlements_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE user_sessions (
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
  `);

  // 1. Valid Candidate Profile
  db.prepare(`
    INSERT INTO user_profiles (
      user_id, email, display_name, pathway, target_exam_date, active_plan,
      email_notifications, study_reminders, has_profile_image, updated_at
    ) VALUES (
      'usr_cand_valid_001', 'clara.candidate@example.edu', 'Clara Candidate, BSN', 'rn',
      '2026-12-01', 'NCLEX-RN Complete Preparation Plan', 1, 1, 1, '2026-10-25T10:00:00Z'
    )
  `).run();

  // 2. Valid Admin Profile
  db.prepare(`
    INSERT INTO user_profiles (
      user_id, email, display_name, pathway, target_exam_date, active_plan,
      email_notifications, study_reminders, has_profile_image, updated_at
    ) VALUES (
      'usr_admin_valid_002', 'admin.marcus@example.edu', 'Marcus Administrator', 'both',
      '2026-11-30', 'NCLEX-RN Complete Preparation Plan', 1, 0, 0, '2026-10-25T10:00:00Z'
    )
  `).run();

  // 3. User with Ambiguous Paid Plan (No Order)
  db.prepare(`
    INSERT INTO user_profiles (
      user_id, email, display_name, pathway, target_exam_date, active_plan,
      email_notifications, study_reminders, has_profile_image, updated_at
    ) VALUES (
      'usr_ambig_paid_003', 'ambig.student@example.edu', 'Ambig Student', 'both',
      '2026-11-30', 'NCLEX-RN & PN All-Access Lifetime Comprehensive Access', 1, 1, 0, '2026-10-25T10:00:00Z'
    )
  `).run();

  // 4. Valid Profile Image for Clara (1x1 PNG)
  const validPngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  const pngHash = crypto.createHash("sha256").update(validPngBytes).digest("hex").toLowerCase();

  db.prepare(`
    INSERT INTO user_profile_images (
      id, user_id, user_email, image_data, content_type, size_bytes, sha256_hash, created_at, updated_at
    ) VALUES (
      'img_valid_001', 'usr_cand_valid_001', 'clara.candidate@example.edu', ?, 'image/png', ?, ?, '2026-10-25T10:00:00Z', '2026-10-25T10:00:00Z'
    )
  `).run(validPngBytes, validPngBytes.length, pngHash);

  // 5. Orphan Profile Image (references non-existent user)
  db.prepare(`
    INSERT INTO user_profile_images (
      id, user_id, user_email, image_data, content_type, size_bytes, sha256_hash, created_at, updated_at
    ) VALUES (
      'img_orphan_999', 'usr_ghost_non_existent', 'ghost@example.edu', ?, 'image/png', ?, ?, '2026-10-25T10:00:00Z', '2026-10-25T10:00:00Z'
    )
  `).run(validPngBytes, validPngBytes.length, pngHash);

  // 6. Subscription Plans (Active, Archived, and Different Intervals)
  db.prepare(`
    INSERT INTO subscription_plans (
      id, slug, name, description, pathway, plan_type, price, original_price,
      currency, billing_interval, features_json, is_active, entitlements_json, created_at, updated_at
    ) VALUES (
      'rn-pro', 'nclex-rn-pro', 'NCLEX-RN Complete Preparation', 'Full review', 'RN', 'pro',
      59, 79, 'USD', 'month', '["QBank"]', 1, '["rn"]', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z'
    )
  `).run();

  db.prepare(`
    INSERT INTO subscription_plans (
      id, slug, name, description, pathway, plan_type, price, original_price,
      currency, billing_interval, features_json, is_active, entitlements_json, created_at, updated_at
    ) VALUES (
      'rn-legacy-archived', 'nclex-rn-legacy-archived', 'Archived Old Plan', 'Legacy', 'RN', 'pro',
      49, null, 'USD', 'month', '[]', 0, '["rn"]', '2026-01-01T00:00:00Z', '2026-05-01T00:00:00Z'
    )
  `).run();

  // 7. Sessions (Candidate, Admin, and Orphan)
  db.prepare(`
    INSERT INTO user_sessions (
      id, user_id, email, role, display_name, csrf_token, created_at, expires_at, last_active_at, revoked
    ) VALUES (
      'sess_cand_001', 'usr_cand_valid_001', 'clara.candidate@example.edu', 'candidate',
      'Clara Candidate', 'csrf_cand_1', '2026-10-25T10:00:00Z', '2026-11-01T10:00:00Z', '2026-10-25T11:00:00Z', 0
    )
  `).run();

  db.prepare(`
    INSERT INTO user_sessions (
      id, user_id, email, role, display_name, csrf_token, created_at, expires_at, last_active_at, revoked
    ) VALUES (
      'sess_admin_002', 'usr_admin_valid_002', 'admin.marcus@example.edu', 'admin',
      'Marcus Administrator', 'csrf_admin_2', '2026-10-25T10:00:00Z', '2026-11-01T10:00:00Z', '2026-10-25T11:00:00Z', 0
    )
  `).run();

  // Orphan session
  db.prepare(`
    INSERT INTO user_sessions (
      id, user_id, email, role, display_name, csrf_token, created_at, expires_at, last_active_at, revoked
    ) VALUES (
      'sess_orphan_999', 'usr_ghost_non_existent', 'ghost@example.edu', 'candidate',
      'Ghost User', 'csrf_ghost', '2026-10-25T10:00:00Z', '2026-11-01T10:00:00Z', '2026-10-25T11:00:00Z', 0
    )
  `).run();

  db.close();
}
