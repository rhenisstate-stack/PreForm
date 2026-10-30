/**
 * PrepFord Centralized Error Mapping & Sanitization Utility
 *
 * Normalizes backend error responses, HTTP status codes, network exceptions,
 * and authentication failure codes into clear, user-centered plain English messages.
 * Prevents leaks of internal implementation details, environment variables,
 * database errors, and stack traces.
 */

export interface ErrorDetails {
  title?: string;
  message: string;
  actionableHint?: string;
  isRetryable?: boolean;
}

const LEAKY_PATTERNS = [
  /GOOGLE_CLIENT_(ID|SECRET)/i,
  /DATABASE_URL/i,
  /POSTGRES/i,
  /SQLITE/i,
  /Npgsql/i,
  /Microsoft\.EntityFrameworkCore/i,
  /Exception/i,
  /Stack trace/i,
  /at (?:[a-zA-Z0-9_.]+\/)+[a-zA-Z0-9_.]+\.ts:\d+:\d+/i,
  /at [a-zA-Z0-9_]+\.Api\./i,
  /SELECT .* FROM/i,
];

/**
 * Checks whether an error string contains internal technical or security details.
 */
export function isLeakyError(msg: string): boolean {
  return LEAKY_PATTERNS.some((pattern) => pattern.test(msg));
}

/**
 * Maps known authentication error codes to user-friendly messages.
 */
export function mapAuthErrorCode(code: string | null | undefined): string | null {
  if (!code) return null;

  switch (code.trim().toLowerCase()) {
    case "google_not_configured":
      return "Google sign-in is temporarily unavailable. Please try again later or sign in using your email and password.";
    case "google_cancelled":
      return "Google sign-in was cancelled. Please try again or sign in with your email and password.";
    case "state_mismatch":
    case "csrf_detected":
      return "Your sign-in session expired or could not be verified. Please try again.";
    case "token_exchange_failed":
    case "auth_failed":
      return "Unable to complete Google authentication at this time. Please sign in using your email and password.";
    case "invalid_credentials":
      return "Invalid email or password. Please verify your credentials and try again.";
    case "account_locked":
    case "account_disabled":
      return "This account is temporarily suspended. Please contact PrepFord student support.";
    case "email_already_exists":
    case "duplicate_email":
      return "An account with this email address already exists. Please sign in instead.";
    case "weak_password":
      return "Please choose a stronger password with at least 8 characters including letters, numbers, and symbols.";
    case "session_expired":
      return "Your session has ended. Please sign in again to continue.";
    default:
      return null;
  }
}

/**
 * Maps an HTTP status code to a user-centered fallback explanation.
 */
export function mapHttpStatusToMessage(status: number): string {
  switch (status) {
    case 400:
      return "Please check the information entered and try again.";
    case 401:
      return "Your session has ended. Please sign in again.";
    case 403:
      return "You do not have permission to access this study resource.";
    case 404:
      return "The requested study content or resource could not be found.";
    case 409:
      return "A conflict occurred with this request. Please review your details and try again.";
    case 422:
      return "Some details could not be validated. Please check the fields and try again.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "The PrepFord study service is temporarily unavailable. Please try again in a few moments.";
    default:
      return "We couldn't complete that request. Please try again shortly.";
  }
}

/**
 * Maps authentication HTTP status codes and backend responses to clear, actionable user messages.
 * Replaces generic failures like "API request failed with status 404" with specific guidance.
 */
export function mapAuthHttpStatusToMessage(status: number, backendError?: string | null): string {
  // If a specific, non-leaky backend message exists, prioritize it when appropriate
  if (backendError && typeof backendError === "string") {
    const trimmed = backendError.trim();
    const isGenericFailure = /^API request failed with status \d+/i.test(trimmed);
    if (!isLeakyError(trimmed) && !isGenericFailure) {
      const codeMapped = mapAuthErrorCode(trimmed);
      if (codeMapped) return codeMapped;
      // Preserve explicit domain/validation messages returned by the backend
      if (
        trimmed.length > 5 &&
        !trimmed.startsWith("<!DOCTYPE") &&
        !trimmed.includes("Exception")
      ) {
        return trimmed;
      }
    }
  }

  switch (status) {
    case 400:
      return "Please review the information you entered.";
    case 401:
      return "The email or password is incorrect.";
    case 403:
      return "Your account does not currently have permission to access this resource.";
    case 404:
      return "The requested authentication service could not be found. Please try again or contact support.";
    case 409:
      return "An account with this email address already exists.";
    case 422:
      return "Some of the information provided is invalid.";
    case 429:
      return "Too many attempts. Please wait before trying again.";
    case 500:
      return "Something went wrong on our server. Please try again shortly.";
    case 502:
    case 503:
    case 504:
      return "We are temporarily unable to reach the authentication service. Please try again shortly.";
    default:
      return "We were unable to complete authentication. Please try again shortly.";
  }
}

/**
 * Cleanses and sanitizes any raw error input, ensuring no technical internals leak to the UI.
 */
export function sanitizeErrorMessage(raw: unknown, fallback: string = "An unexpected error occurred. Please try again."): string {
  if (!raw) return fallback;

  let message = "";
  if (typeof raw === "string") {
    message = raw.trim();
  } else if (raw instanceof Error) {
    message = raw.message.trim();
  } else if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.error === "string") message = obj.error;
    else if (typeof obj.message === "string") message = obj.message;
    else if (typeof obj.title === "string") message = obj.title;
  }

  if (!message) return fallback;

  // Check auth error codes first
  const authMapped = mapAuthErrorCode(message);
  if (authMapped) return authMapped;

  // Check network error strings
  const lower = message.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("econnrefused") ||
    lower.includes("network request failed")
  ) {
    return "We couldn't connect to the server. Check your connection and try again.";
  }

  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("aborterror")) {
    return "The request took longer than expected to complete. Please try again.";
  }

  // Prevent leaky developer errors
  if (isLeakyError(message)) {
    return fallback;
  }

  return message;
}
