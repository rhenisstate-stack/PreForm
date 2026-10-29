import crypto from "node:crypto";

/**
 * Validates image binary header bytes against known magic signatures.
 */
export function validateImageMagicBytes(buffer: Buffer | Uint8Array): {
  valid: boolean;
  detectedType?: "image/jpeg" | "image/png" | "image/webp";
  error?: string;
} {
  if (!buffer || buffer.length < 12) {
    return { valid: false, error: "Image buffer is too short to determine file format." };
  }

  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, detectedType: "image/jpeg" };
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
    return { valid: true, detectedType: "image/png" };
  }

  // WebP: RIFF .... WEBP
  const riff = bytes.toString("ascii", 0, 4);
  const webp = bytes.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return { valid: true, detectedType: "image/webp" };
  }

  return { valid: false, error: "Invalid image magic bytes. Only JPEG, PNG, and WebP are permitted." };
}

/**
 * Computes SHA-256 hash of a buffer or string.
 */
export function computeSha256(data: Buffer | Uint8Array | string): string {
  const hash = crypto.createHash("sha256");
  if (typeof data === "string") {
    hash.update(data, "utf8");
  } else {
    hash.update(data);
  }
  return hash.digest("hex").toLowerCase();
}

/**
 * Normalizes email address for consistent case-insensitive uniqueness checks.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Maps billing interval string to ASP.NET Core EF Core SubscriptionInterval enum:
 * Monthly = 1, Quarterly = 2, Annual = 3, OneTime = 4
 */
export function mapIntervalToEnum(interval: string): number {
  const normalized = (interval || "").trim().toLowerCase();
  switch (normalized) {
    case "quarter":
    case "quarterly":
      return 2;
    case "annual":
    case "year":
    case "yearly":
      return 3;
    case "one-time":
    case "lifetime":
      return 4;
    case "month":
    case "monthly":
    default:
      return 1;
  }
}

/**
 * Detects whether a database connection string or target environment represents a production database.
 */
export function isProductionDatabaseTarget(connectionString: string): boolean {
  if (!connectionString) return false;

  const lower = connectionString.toLowerCase();
  if (
    lower.includes("prepford_prod") ||
    lower.includes("prepford-production") ||
    lower.includes("database=production") ||
    lower.includes("db=production") ||
    lower.includes("prod.prepford.internal") ||
    lower.includes("rds.amazonaws.com/production")
  ) {
    return true;
  }

  if (process.env.APP_ENV === "production" || process.env.NODE_ENV === "production") {
    if (!lower.includes("localhost") && !lower.includes("127.0.0.1") && !lower.includes("test")) {
      return true;
    }
  }

  return false;
}
