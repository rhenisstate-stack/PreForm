export interface SqliteUserProfile {
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
  updated_at: string;
}

export interface SqliteUserProfileImage {
  id: string;
  user_id: string;
  user_email: string;
  image_data: Buffer | Uint8Array;
  content_type: string;
  size_bytes: number;
  sha256_hash: string;
  created_at: string;
  updated_at: string;
}

export interface SqliteSubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description: string;
  audience: string | null;
  pathway: string;
  plan_type: string;
  price: number;
  original_price: number | null;
  currency: string;
  billing_interval: string;
  duration_label: string | null;
  features_json: string;
  popular: number;
  bg_colour: string | null;
  accent_colour: string | null;
  text_colour: string | null;
  badge_text: string | null;
  display_order: number;
  is_active: number;
  entitlements_json: string;
  created_at: string;
  updated_at: string;
}

export interface SqliteUserSession {
  id: string;
  user_id: string;
  email: string;
  role: string;
  display_name: string;
  csrf_token: string;
  created_at: string;
  expires_at: string;
  last_active_at: string;
  revoked: number;
}

// ── Target PostgreSQL DTOs ──────────────────────────────────────────────

export interface PostgresUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  pathway: string;
  targetExamDate: string;
  activePlan: string;
  emailNotifications: boolean;
  studyReminders: boolean;
  isActive: boolean;
  hasProfileImage: boolean;
  profileImageUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: string;
}

export interface PostgresUserProfileImage {
  id: string;
  userId: string;
  userEmail: string;
  imageData: Buffer | Uint8Array;
  contentType: string;
  sizeBytes: number;
  sha256Hash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostgresSubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  code: string;
  description: string;
  audience: string | null;
  pathway: string;
  planType: string;
  priceCents: number;
  originalPriceCents: number | null;
  currency: string;
  interval: number; // 1=Monthly, 2=Quarterly, 3=Annual, 4=OneTime
  billingInterval: string;
  durationLabel: string | null;
  featuresJson: string;
  popular: boolean;
  bgColour: string | null;
  accentColour: string | null;
  textColour: string | null;
  badgeText: string | null;
  displayOrder: number;
  isActive: boolean;
  entitlementsJson: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostgresUserSession {
  id: string;
  userId: string;
  email: string;
  role: string;
  displayName: string;
  tokenHash: string;
  csrfToken: string;
  createdAt: Date;
  expiresAt: Date;
  lastActiveAt: Date;
  revoked: boolean;
}

// ── Migration Report & Reconciliation Types ─────────────────────────────

export interface MigrationConflict {
  entity: "user" | "image" | "plan" | "session";
  id: string;
  identifier: string;
  reason: string;
  actionTaken: "skipped" | "queued_for_review" | "merged";
}

export interface AmbiguousEntitlementRecord {
  userId: string;
  email: string;
  claimedPlan: string;
  pathway: string;
  reason: string;
}

export interface EntityReconciliationStats {
  sourceCount: number;
  targetCount: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  conflictCount: number;
  checksum: string;
}

export interface MigrationReconciliationReport {
  timestamp: string;
  dryRun: boolean;
  sourceDbPath: string;
  targetHost: string;
  targetDatabase: string;
  success: boolean;
  stats: {
    users: EntityReconciliationStats;
    images: EntityReconciliationStats;
    plans: EntityReconciliationStats;
    sessions: EntityReconciliationStats;
  };
  conflicts: MigrationConflict[];
  ambiguousEntitlements: AmbiguousEntitlementRecord[];
}
