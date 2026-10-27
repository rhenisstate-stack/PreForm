import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "node:util";
import { vi } from "vitest";

Object.assign(globalThis, { TextEncoder, TextDecoder });

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock matchMedia for next-themes system theme detection
const createMatchMedia = () => ({
  matches: false,
  media: "",
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: createMatchMedia,
});

// Mock ResizeObserver for Radix NavigationMenu component
Object.defineProperty(globalThis, "ResizeObserver", {
  value: class ResizeObserver {
    observe = () => {};
    unobserve = () => {};
    disconnect = () => {};
  },
  writable: true,
});
