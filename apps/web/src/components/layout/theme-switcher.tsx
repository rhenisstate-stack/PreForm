"use client";

import * as React from "react";
import { useTheme as useNextThemes } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useNextThemes();

  const toggleTheme = (nextTheme: string) => {
    setTheme(nextTheme);
  };

  const ActiveIcon = icons[theme ?? "system"];

  return (
    <div className="relative inline-block text-foreground">
      <button
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Change theme"
        aria-haspopup="true"
        aria-expanded="false"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const options = ["system", "light", "dark"];
            const current = options.indexOf(theme ?? "system");
            const next = options[(current + 1) % options.length];
            toggleTheme(next);
          }
        }}
      >
        <ActiveIcon className="h-4 w-4" />
        <span className="hidden sm:block capitalize">{theme}</span>
      </button>
      <div className="absolute right-0 mt-2 w-40 rounded-md border border-border bg-popover p-1 shadow-lg">
        {["system", "light", "dark"].map((option) => {
          const OptionIcon = icons[option];
          return (
            <button
              key={option}
              className={`flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-sm ${
                option === theme
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              onClick={() => toggleTheme(option)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleTheme(option);
                }
              }}
            >
              <OptionIcon className="h-4 w-4" />
              <span className="capitalize">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
