import { useTheme as useNextThemes } from "next-themes";
import { useEffect, useState, useCallback } from "react";

export function useTheme() {
  const { theme, setTheme, mounted } = useNextThemes();
  return { theme, setTheme, mounted };
}
