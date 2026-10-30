import { type CookieConsent } from "@/types/cookie";

export const COOKIE_CONSENT_KEY = "prepford:cookie-consent";
export const LEGACY_COOKIE_CONSENT_KEY = "preform:cookie-consent";
export const COOKIE_CONSENT_VERSION = 1;

export function getStoredConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY) || localStorage.getItem(LEGACY_COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    return parsed as CookieConsent;
  } catch {
    return null;
  }
}

export function saveConsent(consent: CookieConsent): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
}
