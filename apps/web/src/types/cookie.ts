export type CookieCategory = "necessary" | "preferences" | "analytics" | "marketing";

export interface CookieConsent {
  version: number;
  timestamp: number;
  necessary: boolean;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
}

export const DEFAULT_CONSENT: CookieConsent = {
  version: 1,
  timestamp: Date.now(),
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
};
