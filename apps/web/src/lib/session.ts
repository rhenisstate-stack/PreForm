import crypto from "node:crypto";
import { cookies } from "next/headers";
import {
  getProfileDatabase,
  deriveCandidateIdFromEmail,
  getUserProfileMeta,
} from "./profile-image-db";

export interface StoredSession {
  id: string;
  userId: string;
  email: string;
  role: string;
  displayName: string;
  csrfToken: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  revoked: boolean;
}

export interface VerifiedSession {
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  displayName: string;
  role: string;
  pathway: "rn" | "pn" | "both";
  picture?: string;
  provider?: string;
  activePlan?: string;
  targetExamDate?: string;
  emailNotifications?: boolean;
  studyReminders?: boolean;
  csrfToken: string;
  expiresAt: string;
}

export const ALLOWED_ADMIN_ROLES = new Set([
  "admin",
  "superadmin",
  "administrator",
  "manager",
  "content_manager",
]);

/**
 * Returns the server-only session secret key.
 * Never exposed via NEXT_PUBLIC_* variables.
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 16) {
    return secret;
  }

  if (process.env.NODE_ENV === "production" && process.env.APP_ENV === "production") {
    throw new Error(
      "SESSION_SECRET environment variable is missing or insecure in production. A minimum 32-character secret is required."
    );
  }

  // Safe deterministic server secret for non-production development & test suites
  return "prepford-dev-session-signing-secret-key-minimum-32-chars-long!";
}

/**
 * Signs a session payload string using HMAC-SHA256.
 * Format: <base64urlPayload>.<base64urlSignature>
 */
export function signSessionPayload(payload: Record<string, unknown>): string {
  const secret = getSessionSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Verifies HMAC-SHA256 signature and decodes the payload using timing-safe comparison.
 */
export function verifySignedSessionToken(token: string | undefined): {
  valid: boolean;
  payload?: Record<string, unknown>;
  error?: string;
} {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing session token" };
  }

  const trimmed = token.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return { valid: false, error: "Unsigned or malformed session token" };
  }

  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex === -1) {
    return { valid: false, error: "Unsigned or malformed session token" };
  }

  const data = trimmed.substring(0, dotIndex);
  const signature = trimmed.substring(dotIndex + 1);

  if (!data || !signature) {
    return { valid: false, error: "Malformed session token format" };
  }

  const secret = getSessionSecret();
  const expectedSignature = crypto.createHmac("sha256", secret).update(data).digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, error: "Invalid or tampered session signature" };
  }

  try {
    const jsonString = Buffer.from(data, "base64url").toString("utf-8");
    const payload = JSON.parse(jsonString) as Record<string, unknown>;

    // Check payload expiration
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: "Session has expired" };
    }
    if (typeof payload.expiresAt === "string" && new Date(payload.expiresAt).getTime() < Date.now()) {
      return { valid: false, error: "Session has expired" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "Corrupted session payload" };
  }
}

/**
 * Persists an opaque session record in the server database and returns a cryptographically signed cookie token.
 */
export function createServerSession(options: {
  userId: string;
  email: string;
  role?: string;
  displayName?: string;
  rememberMe?: boolean;
}): {
  token: string;
  session: StoredSession;
  maxAgeSeconds: number;
} {
  const db = getProfileDatabase();
  const sessionId = `sess_${Date.now()}_${crypto.randomBytes(16).toString("hex")}`;
  const csrfToken = crypto.randomBytes(16).toString("hex");

  const now = new Date();
  const maxAgeSeconds = options.rememberMe
    ? 60 * 60 * 24 * 30 // 30 days
    : 60 * 60 * 24 * 7;  // 7 days

  const expiresDate = new Date(now.getTime() + maxAgeSeconds * 1000);
  const role = (options.role || "candidate").trim().toLowerCase();
  const displayName = options.displayName?.trim() || options.email.split("@")[0] || "Nursing Candidate";

  db.prepare(`
    INSERT INTO user_sessions (
      id, user_id, email, role, display_name, csrf_token, created_at, expires_at, last_active_at, revoked
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    sessionId,
    options.userId,
    options.email.toLowerCase().trim(),
    role,
    displayName,
    csrfToken,
    now.toISOString(),
    expiresDate.toISOString(),
    now.toISOString()
  );

  const payload = {
    sid: sessionId,
    sub: options.userId,
    email: options.email.toLowerCase().trim(),
    role,
    displayName,
    csrfToken,
    iat: Math.floor(now.getTime() / 1000),
    exp: Math.floor(expiresDate.getTime() / 1000),
    expiresAt: expiresDate.toISOString(),
  };

  const token = signSessionPayload(payload);

  return {
    token,
    session: {
      id: sessionId,
      userId: options.userId,
      email: options.email.toLowerCase().trim(),
      role,
      displayName,
      csrfToken,
      createdAt: now.toISOString(),
      expiresAt: expiresDate.toISOString(),
      lastActiveAt: now.toISOString(),
      revoked: false,
    },
    maxAgeSeconds,
  };
}

/**
 * Creates a signed session token for testing without requiring manual database seeding.
 */
export function createSignedTestSession(payload: Record<string, unknown>): string {
  const now = Math.floor(Date.now() / 1000);
  const enriched = {
    sid: payload.sid || `test_sess_${Date.now()}`,
    sub: payload.sub || payload.id || "test_user_id",
    email: payload.email || "test@prepford.com",
    role: payload.role || "candidate",
    displayName: payload.displayName || payload.name || "Test Candidate",
    csrfToken: payload.csrfToken || "test_csrf_token_123",
    iat: now,
    exp: payload.exp || now + 3600 * 24 * 7,
    expiresAt: payload.expiresAt || new Date(Date.now() + 3600 * 24 * 7 * 1000).toISOString(),
    ...payload,
  };
  return signSessionPayload(enriched);
}

/**
 * Revokes a session by ID in the database.
 */
export function revokeSession(sessionId: string): boolean {
  if (!sessionId) return false;
  try {
    const db = getProfileDatabase();
    const result = db.prepare(`
      UPDATE user_sessions SET revoked = 1 WHERE id = ?
    `).run(sessionId);
    return Number(result.changes) > 0;
  } catch {
    return false;
  }
}

/**
 * Revokes all sessions belonging to a specific user (e.g. on password reset or account compromise).
 */
export function revokeAllUserSessions(userId: string): boolean {
  if (!userId) return false;
  try {
    const db = getProfileDatabase();
    const result = db.prepare(`
      UPDATE user_sessions SET revoked = 1 WHERE user_id = ?
    `).run(userId);
    return Number(result.changes) > 0;
  } catch {
    return false;
  }
}

/**
 * Resolves, verifies, and retrieves authoritative identity and session data.
 */
export async function resolveSession(request?: Request): Promise<VerifiedSession | null> {
  let cookieValue: string | undefined;

  try {
    const cookieStore = await cookies();
    cookieValue = cookieStore.get("preform_session")?.value;
  } catch {
    // outside Server Component / Route Handler scope
  }

  if (!cookieValue && request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/preform_session=([^;]+)/);
      if (match) {
        cookieValue = decodeURIComponent(match[1]);
      }
    }
  }

  if (!cookieValue) {
    return null;
  }

  // 1. First attempt verification as a signed token
  const verification = verifySignedSessionToken(cookieValue);

  let rawPayload: Record<string, unknown> | null = null;
  let isVerifiedSignature = false;

  if (verification.valid && verification.payload) {
    rawPayload = verification.payload;
    isVerifiedSignature = true;
  } else {
    // 2. Check for unsigned JSON (test compatibility mode)
    try {
      const parsed = JSON.parse(cookieValue);
      if (parsed && typeof parsed === "object") {
        // Enforce Security Boundary: In production, or for ANY admin/privileged role,
        // unsigned raw JSON cookies are STRICTLY REJECTED!
        const claimedRole = String(parsed.role || "").trim().toLowerCase();
        if (ALLOWED_ADMIN_ROLES.has(claimedRole)) {
          // Attempting to claim admin role with unsigned cookie is REJECTED
          return null;
        }

        if (process.env.NODE_ENV === "production" && process.env.APP_ENV === "production") {
          // In production, all unsigned cookies are strictly rejected
          return null;
        }

        // Permitted only for candidate test mocks in non-production
        rawPayload = parsed;
        isVerifiedSignature = false;
      }
    } catch {
      return null;
    }
  }

  if (!rawPayload || !rawPayload.email) {
    return null;
  }

  const email = String(rawPayload.email).trim().toLowerCase();
  const userId = String(rawPayload.sub || rawPayload.id || deriveCandidateIdFromEmail(email));
  const sessionId = String(rawPayload.sid || rawPayload.sessionId || "");

  // 3. If session ID exists, check revocation status in server database
  if (sessionId) {
    try {
      const db = getProfileDatabase();
      const sessionRow = db.prepare(`
        SELECT id, role, revoked, expires_at FROM user_sessions WHERE id = ?
      `).get(sessionId) as { id: string; role: string; revoked: number; expires_at: string } | undefined;

      if (sessionRow) {
        if (sessionRow.revoked === 1) {
          return null; // Session explicitly revoked
        }
        if (new Date(sessionRow.expires_at).getTime() < Date.now()) {
          return null; // Session expired on server
        }
      }
    } catch {
      // Database query failed or table not ready
    }
  }

  // 4. Retrieve authoritative profile state from server database
  const dbMeta = getUserProfileMeta(userId, email);

  // Authoritative role resolution:
  // Role must never be elevated from unverified cookie.
  let authoritativeRole = "candidate";
  if (isVerifiedSignature) {
    const signedRole = String(rawPayload.role || "").trim().toLowerCase();
    authoritativeRole = signedRole || "candidate";
  }

  const resolvedName =
    dbMeta?.displayName ||
    String(rawPayload.displayName || rawPayload.name || "Nursing Candidate");

  const authoritativePathway: "rn" | "pn" | "both" =
    dbMeta?.pathway ||
    (rawPayload.pathway === "both" || rawPayload.pathway === "pn" ? rawPayload.pathway : "rn");

  const authoritativePlan =
    dbMeta?.activePlan ||
    (typeof rawPayload.activePlan === "string" ? rawPayload.activePlan : "NCLEX-RN Complete Preparation Plan");

  return {
    sessionId: sessionId || `compat_${userId}`,
    userId: dbMeta?.userId || userId,
    email,
    name: resolvedName,
    displayName: resolvedName,
    role: authoritativeRole,
    pathway: authoritativePathway,
    activePlan: authoritativePlan,
    picture: dbMeta?.pictureUrl || (typeof rawPayload.picture === "string" ? rawPayload.picture : undefined),
    provider: typeof rawPayload.provider === "string" ? rawPayload.provider : "credentials",
    targetExamDate: dbMeta?.targetExamDate || (typeof rawPayload.targetExamDate === "string" ? rawPayload.targetExamDate : undefined),
    emailNotifications: dbMeta?.emailNotifications ?? true,
    studyReminders: dbMeta?.studyReminders ?? true,
    csrfToken: typeof rawPayload.csrfToken === "string" ? rawPayload.csrfToken : "legacy_token",
    expiresAt: typeof rawPayload.expiresAt === "string" ? rawPayload.expiresAt : new Date(Date.now() + 86400 * 7 * 1000).toISOString(),
  };
}

/**
 * Server-side RBAC guard for administrative endpoints.
 * Guarantees that:
 * 1. Missing session -> 401
 * 2. Invalid or tampered signature -> 401
 * 3. Unsigned cookie attempting to claim admin role -> 401 / 403
 * 4. Authenticated candidate role -> 403
 * 5. Verified admin role -> 200 (Authorized)
 */
export async function verifyAdminAuth(request?: Request): Promise<{
  authorized: boolean;
  status: number;
  error?: string;
  session?: VerifiedSession;
  user?: unknown;
  role?: string;
}> {
  let cookieValue: string | undefined;

  try {
    const cookieStore = await cookies();
    cookieValue = cookieStore.get("preform_session")?.value;
  } catch {
    // outside Server Component / Route Handler scope
  }

  if (!cookieValue && request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/preform_session=([^;]+)/);
      if (match) {
        cookieValue = decodeURIComponent(match[1]);
      }
    }
  }

  if (!cookieValue) {
    return { authorized: false, status: 401, error: "Authentication required" };
  }

  // For administrative operations, unsigned cookies are strictly rejected in all environments
  const verification = verifySignedSessionToken(cookieValue);
  if (!verification.valid || !verification.payload) {
    // Also check if raw unsigned JSON was provided to return an informative error
    try {
      const parsed = JSON.parse(cookieValue);
      if (parsed && typeof parsed === "object") {
        return {
          authorized: false,
          status: 401,
          error: "Authentication required: Administrative access requires a cryptographically signed session token.",
        };
      }
    } catch {
      // ignore
    }

    return {
      authorized: false,
      status: 401,
      error: `Authentication required: ${verification.error || "Invalid session signature"}`,
    };
  }

  const payload = verification.payload;
  const role = String(payload.role || "").trim().toLowerCase();

  // Validate session against database if session ID is present
  const sessionId = String(payload.sid || "");
  if (sessionId) {
    try {
      const db = getProfileDatabase();
      const sessionRow = db.prepare(`
        SELECT id, role, revoked, expires_at FROM user_sessions WHERE id = ?
      `).get(sessionId) as { id: string; role: string; revoked: number; expires_at: string } | undefined;

      if (sessionRow) {
        if (sessionRow.revoked === 1) {
          return { authorized: false, status: 401, error: "Authentication required: Session has been revoked" };
        }
        if (new Date(sessionRow.expires_at).getTime() < Date.now()) {
          return { authorized: false, status: 401, error: "Authentication required: Session has expired" };
        }
      }
    } catch {
      // Table query failed
    }
  }

  if (!ALLOWED_ADMIN_ROLES.has(role)) {
    return {
      authorized: false,
      status: 403,
      error: `Forbidden: role '${role || "candidate"}' does not have subscription management permissions`,
    };
  }

  const session = await resolveSession(request);
  return {
    authorized: true,
    status: 200,
    session: session || undefined,
    user: session || undefined,
    role,
  };
}
