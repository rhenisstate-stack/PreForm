"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Icon } from "lucide-react";
import { useTheme as useThemeHook } from "@/hooks/use-theme";

export function ThemeSwitcher() {
  const { theme, setTheme, mounted } = useThemeHook();

  const toggleTheme = (nextTheme: string) => {
    setTheme(nextTheme);
  };

  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const activeIcon = icons[theme] ?? icons.system;

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative inline-block text-ink">
      <button
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        aria-label="Change theme"
        aria-haspopup="true"
        aria-expanded="false"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const options = ["system", "light", "dark"];
            const current = options.indexOf(theme);
            const next = options[(current + 1) % options.length];
            toggleTheme(next);
          }
        }}
      >
        <activeIcon className="h-4 w-4" />
        <span className="hidden sm:block capitalize">{theme}</span>
      </button>
      <div className="absolute right-0 mt-2 w-40 rounded-md border border-line bg-white p-1 shadow-lg">
        {["system", "light", "dark"].map((option) => (
          <button
            key={option}
            className={`flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-sm ${
              option === theme
                ? "bg-accent text-accent-foreground"
                : "text-ink hover:bg-accent"
            }`}
            onClick={() => toggleTheme(option)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleTheme(option);
              }
            }}
          >
            <icons[option] className="h-4 w-4" />
            <span className="capitalize">{option}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
