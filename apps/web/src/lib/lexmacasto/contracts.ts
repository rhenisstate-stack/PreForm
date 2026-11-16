/**
 * Verified LexmaCasto / Qlex-Nursing backend API contracts for PrepFord (WEBSITE_12).
 * Based on direct inspection of Qlex-Nursing reference implementation and NURVIA precedent.
 * Never invent unsupported endpoints (e.g. /csrf, /refresh, /api/castoline/auth/me).
 */

export const LEXMACASTO_AUTH_ENDPOINTS = {
  LOGIN: "/api/castoline/auth/login",
  REGISTER: "/api/castoline/auth/register",
  CURRENT_USER: "/api/castoline/system/user/list/current",
  LOGOUT_DISTINCT: "/api/castoline/auth/logout/sessions/distinct",
  LOGOUT_RELATIVE: "/api/castoline/auth/logout/sessions/relative",
} as const;

export const LEXMACASTO_STRATA_ENDPOINTS = {
  // Main strata
  categories: {
    path: "/api/castoline/strata/main/categories/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  subcategories: {
    path: "/api/castoline/strata/main/subcategories/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  domains: {
    path: "/api/castoline/strata/main/domains/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },

  // Learning strata
  programs: {
    path: "/api/castoline/strata/learning/programs/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  courses: {
    path: "/api/castoline/strata/learning/courses/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  subjects: {
    path: "/api/castoline/strata/learning/subjects/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  units: {
    path: "/api/castoline/strata/learning/units/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  lessons: {
    path: "/api/castoline/strata/learning/lessons/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  topics: {
    path: "/api/castoline/strata/learning/topics/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  concepts: {
    path: "/api/castoline/strata/learning/concepts/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  facts: {
    path: "/api/castoline/strata/learning/facts/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },

  // Assessment strata
  assessments: {
    path: "/api/castoline/strata/assessment/assessments/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  exams: {
    path: "/api/castoline/strata/assessment/exams/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  examsLive: {
    path: "/api/castoline/strata/assessment/exams/list/live",
    fetchtype: "live",
    requiresAuth: true,
  },
  sections: {
    path: "/api/castoline/strata/assessment/sections/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  questions: {
    path: "/api/castoline/strata/assessment/questions/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },

  // Institution strata (verified route is `classes`)
  institutions: {
    path: "/api/castoline/strata/institution/institutions/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  schools: {
    path: "/api/castoline/strata/institution/schools/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  departments: {
    path: "/api/castoline/strata/institution/departments/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  divisions: {
    path: "/api/castoline/strata/institution/divisions/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  cohorts: {
    path: "/api/castoline/strata/institution/cohorts/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
  classes: {
    path: "/api/castoline/strata/institution/classes/list/absolute",
    fetchtype: "absolute",
    requiresAuth: false,
  },
} as const;

export type StrataResourceKey = keyof typeof LEXMACASTO_STRATA_ENDPOINTS;

export function isStrataResourceKey(value: string): value is StrataResourceKey {
  return Object.prototype.hasOwnProperty.call(LEXMACASTO_STRATA_ENDPOINTS, value);
}

/**
 * Builds a LexmaCasto strata path with the mandatory `fetchtype` query parameter.
 * Prevents callers from omitting or overriding `fetchtype`.
 */
export function buildStrataEndpointPath(
  resource: StrataResourceKey,
  queryParams?: Record<string, string | number | boolean | undefined | null>
): string {
  const def = LEXMACASTO_STRATA_ENDPOINTS[resource];
  const params = new URLSearchParams();
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (key === "fetchtype") continue;
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
  }
  params.set("fetchtype", def.fetchtype);
  return `${def.path}?${params.toString()}`;
}

export function buildCurrentUserEndpointPath(): string {
  return `${LEXMACASTO_AUTH_ENDPOINTS.CURRENT_USER}?fetchtype=current`;
}

export type LoginMethod = "password" | "pin" | "provider" | string;

export interface LexmaCastoLoginPayload {
  email: string;
  password?: string;
  pin?: string;
  loginMethod: LoginMethod;
  LoginProvider?: string;
  challenge?: string;
  fingerprint?: string;
  ipAddress?: string;
  dashboardName?: string;
  role?: string;
}

export interface LexmaCastoRegisterPayload {
  username: string;
  email: string;
  phone?: string;
  password?: string;
  passwordConfirmation?: string;
  pin?: string;
  pinConfirmation?: string;
  loginMethod: LoginMethod;
  agree: boolean;
  role?: string;
  dashboardName?: string;
  provider?: string;
  providerPayload?: Record<string, unknown>;
  challenge?: string;
}

export interface LexmaCastoLogoutPayload {
  target_dashboard: string;
}

export interface LexmaCastoAuthUserRaw {
  id?: string;
  guidId?: string;
  userId?: string;
  username?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  roles?: string[];
  castoBadge?: string;
  castoLine?: string;
  dashboardName?: string;
  avatarUrl?: string;
  [key: string]: unknown;
}

export interface LexmaCastoLoginResponseRaw {
  success?: boolean;
  message?: string;
  user?: LexmaCastoAuthUserRaw;
  redirect_url?: string;
  data?: {
    user?: LexmaCastoAuthUserRaw;
    redirect_url?: string;
    castoBadge?: string;
    castoLine?: string;
  };
  castoBadge?: string;
  castoLine?: string;
}

export interface StrataPagedData<T = Record<string, unknown>> {
  items: T[];
  skewPage: number;
  skewPerPage: number;
  skewTotal: number;
  skewTotalPages: number;
}

export interface StrataEnvelope<T = Record<string, unknown>> {
  success: boolean;
  message?: string;
  data: StrataPagedData<T>;
}

export interface StrataRecord extends Record<string, unknown> {
  id?: string | number;
  _id?: string;
  uuid?: string;
  name?: string;
  title?: string;
  slug?: string;
  code?: string;
  description?: string;
}
