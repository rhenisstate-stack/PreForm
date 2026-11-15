import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "tests/setup.ts")],
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    testTimeout: 20000,
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 4,
      },
    },
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
