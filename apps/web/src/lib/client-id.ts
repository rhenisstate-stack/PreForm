import crypto from "node:crypto";

export const CLIENT_ID_COOKIE_NAME = "prepford_client_id";
export const CLIENT_ID_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1 year (365 days)

export interface CookieStoreLike {
  get(name: string): { name: string; value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
}

/**
 * Validates whether a client ID matches the canonical format:
 * "cid_" followed by 32 lowercase hex characters (16 random bytes).
 */
export function isValidClientId(clientId: unknown): clientId is string {
  if (typeof clientId !== "string") return false;
  return /^cid_[0-9a-f]{32}$/.test(clientId.trim());
}

/**
 * Generates an unpredictable, cryptographically secure client ID.
 */
export function generateClientId(): string {
  return `cid_${crypto.randomBytes(16).toString("hex")}`;
}

/**
 * Sets the persistent client ID cookie on the response / cookieStore.
 */
export function setClientIdCookie(
  cookieStore: CookieStoreLike,
  clientId: string
): void {
  const isProd = process.env.NODE_ENV === "production";
  cookieStore.set(CLIENT_ID_COOKIE_NAME, clientId, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: CLIENT_ID_MAX_AGE_SECONDS,
  });
}

/**
 * Resolves the client ID from an incoming request or cookieStore.
 * If missing or invalid, generates a fresh valid client ID and persists it to the cookieStore.
 */
export function ensureClientId(
  cookieStore: CookieStoreLike,
  request?: Request
): { clientId: string; isNew: boolean } {
  // 1. Try reading from cookieStore
  let rawClientId = cookieStore.get(CLIENT_ID_COOKIE_NAME)?.value;

  // 2. Fallback to reading raw Cookie header from request if cookieStore does not have it yet
  if (!rawClientId && request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:prepford_client_id)=([^;]+)/);
      if (match) {
        rawClientId = decodeURIComponent(match[1]);
      }
    }
  }

  // 3. Validate existing client ID format
  if (rawClientId && isValidClientId(rawClientId)) {
    return { clientId: rawClientId.trim(), isNew: false };
  }

  // 4. Missing or invalid format -> generate fresh unpredictable ID and persist
  const newClientId = generateClientId();
  try {
    setClientIdCookie(cookieStore, newClientId);
  } catch {
    // Graceful handling outside mutable cookie store contexts
  }

  return { clientId: newClientId, isNew: true };
}
