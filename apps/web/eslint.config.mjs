import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
    "tests/**",
    "**/*.test.*",
    "**/*.spec.*",
    ".tmp*/**",
    "*.tmp*",
    ".tmp-login-debug.mjs",
  ]),
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
    },
  },
  // PrepFord notification standard: raw Sonner may only be imported by the
  // central notification service and the global Toaster component. All other
  // modules must use `notify` from "@/lib/notifications".
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/notifications.{ts,tsx}",
      "src/components/ui/sonner.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["sonner", "sonner/*"],
              message:
                "Use the centralized notification service (import { notify } from '@/lib/notifications'). Direct Sonner imports are reserved for the global Toaster and notify service.",
            },
          ],
        },
      ],
    },
  },
  // The root layout is the only place allowed to mount the global Toaster.
  {
    files: ["src/app/layout.tsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
