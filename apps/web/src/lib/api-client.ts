import crypto from "node:crypto";
import type { VerifiedSession } from "./session";

export interface ApiClientOptions extends RequestInit {
  session?: VerifiedSession | null;
  token?: string;
  timeoutMs?: number;
  correlationId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  status: number;
  data?: T;
  error?: string;
  headers: Headers;
}

export class ApiClientError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number = 500, data?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

export type MockApiHandler = (
  endpoint: string,
  options: ApiClientOptions
) => Promise<ApiResponse | null> | ApiResponse | null;

let currentMockHandler: MockApiHandler | null = null;

/**
 * Sets a mock handler for testing API client dispatches in unit and integration tests.
 */
export function setMockApiHandler(handler: MockApiHandler | null): void {
  currentMockHandler = handler;
}

export function getMockApiHandler(): MockApiHandler | null {
  return currentMockHandler;
}

/**
 * Returns the base URL for the backend ASP.NET Core API.
 */
export function getApiBaseUrl(): string {
  const envUrl =
    process.env.API_GATEWAY_URL?.trim() ||
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  if (envUrl && envUrl.length > 0) {
    return envUrl.replace(/\/+$/, "");
  }

  return "http://127.0.0.1:5000";
}

/**
 * Returns the shared secret used for HMAC mutual gateway signing between Next.js BFF and ASP.NET Core.
 */
export function getGatewaySecret(): string {
  const secret = process.env.GATEWAY_SHARED_SECRET?.trim();
  if (secret && secret.length >= 16) {
    return secret;
  }

  if (process.env.NODE_ENV === "production" && process.env.APP_ENV === "production") {
    throw new Error(
      "GATEWAY_SHARED_SECRET is required in production environments to secure BFF-to-backend communication."
    );
  }

  return "prepford-default-internal-gateway-secret-32-chars!";
}

/**
 * Generates mutual authentication gateway headers for a verified session.
 */
export function createGatewayAuthHeaders(
  session?: VerifiedSession | null,
  correlationId?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Correlation-Id": correlationId || `corr_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`,
  };

  if (!session || !session.userId || !session.email) {
    return headers;
  }

  const userId = session.userId.trim();
  const email = session.email.trim().toLowerCase();
  const role = (session.role || "candidate").trim().toLowerCase();
  const name = (session.displayName || session.name || "Nursing Candidate").trim();

  const secret = getGatewaySecret();
  const payloadToSign = `${userId}|${email}|${role}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadToSign)
    .digest("hex")
    .toLowerCase();

  headers["X-Gateway-Signature"] = signature;
  headers["X-Authenticated-User-Id"] = userId;
  headers["X-Authenticated-User-Email"] = email;
  headers["X-Authenticated-User-Role"] = role;
  headers["X-Authenticated-User-Name"] = name;

  return headers;
}

/**
 * Dispatches an HTTP request to the ASP.NET Core API with security headers, timeout control, and typed JSON responses.
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  const timeoutMs = options.timeoutMs ?? 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestHeaders = new Headers(options.headers || {});

  // Mutual Gateway HMAC Headers
  if (options.session) {
    const gatewayHeaders = createGatewayAuthHeaders(options.session, options.correlationId);
    for (const [key, val] of Object.entries(gatewayHeaders)) {
      if (!requestHeaders.has(key)) {
        requestHeaders.set(key, val);
      }
    }
  }

  // Bearer Token Auth
  if (options.token && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${options.token}`);
  }

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  // Check if a mock handler is configured (e.g. during test suites)
  if (currentMockHandler) {
    const mockResult = await currentMockHandler(normalizedEndpoint, {
      ...options,
      headers: requestHeaders,
    });
    if (mockResult) {
      clearTimeout(timeoutId);
      return mockResult as ApiResponse<T>;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: requestHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") || "";
    let parsedData: unknown = undefined;

    if (contentType.includes("application/json")) {
      try {
        parsedData = await response.json();
      } catch {
        parsedData = null;
      }
    } else if (contentType.includes("text/")) {
      parsedData = await response.text();
    } else {
      parsedData = await response.blob();
    }

    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      if (parsedData && typeof parsedData === "object") {
        const errorObj = parsedData as Record<string, unknown>;
        if (typeof errorObj.error === "string") {
          errorMessage = errorObj.error;
        } else if (typeof errorObj.message === "string") {
          errorMessage = errorObj.message;
        } else if (typeof errorObj.title === "string") {
          errorMessage = errorObj.title;
        }
      }

      return {
        success: false,
        status: response.status,
        error: errorMessage,
        data: parsedData as T,
        headers: response.headers,
      };
    }

    return {
      success: true,
      status: response.status,
      data: parsedData as T,
      headers: response.headers,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.toLowerCase().includes("aborted"));

    const message = isAbort
      ? `Backend request timed out after ${timeoutMs}ms`
      : err instanceof Error
        ? err.message
        : "Failed to communicate with backend API";

    return {
      success: false,
      status: isAbort ? 504 : 503,
      error: message,
      headers: new Headers(),
    };
  }
}

export const apiClient = {
  get: <T = unknown>(endpoint: string, options?: ApiClientOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T = unknown>(endpoint: string, body?: unknown, options?: ApiClientOptions) => {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const isBuffer = Buffer.isBuffer(body) || body instanceof Uint8Array;
    const headers = new Headers(options?.headers || {});

    let requestBody: BodyInit | undefined;
    if (isFormData || isBuffer) {
      requestBody = body as BodyInit;
    } else if (body !== undefined) {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      requestBody = JSON.stringify(body);
    }

    return apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      headers,
      body: requestBody,
    });
  },

  put: <T = unknown>(endpoint: string, body?: unknown, options?: ApiClientOptions) => {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const isBuffer = Buffer.isBuffer(body) || body instanceof Uint8Array;
    const headers = new Headers(options?.headers || {});

    let requestBody: BodyInit | undefined;
    if (isFormData || isBuffer) {
      requestBody = body as BodyInit;
    } else if (body !== undefined) {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      requestBody = JSON.stringify(body);
    }

    return apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      headers,
      body: requestBody,
    });
  },

  delete: <T = unknown>(endpoint: string, options?: ApiClientOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};
