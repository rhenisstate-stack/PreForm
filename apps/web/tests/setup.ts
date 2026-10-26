import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "node:util";

Object.assign(globalThis, { TextEncoder, TextDecoder });

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
