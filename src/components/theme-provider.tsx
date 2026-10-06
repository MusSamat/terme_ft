"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "terme_theme";

interface ThemeContextValue {
  theme: Theme;
  /** The theme actually applied. Light-only now, so always "light". */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" ? raw : "system";
}

// Light-only — the dark theme is retired (parity with the Flutter app). The
// provider keeps the `theme` state + `setTheme` for API compatibility, but it
// never applies the `.dark` class, so every `dark:` utility stays inert.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const resolvedTheme: "light" | "dark" = "light";

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      if (next === "system") window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable (private mode)
    }
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/**
 * Inline no-flash script — injected in the root layout <head>. Light-only, so it
 * just guarantees the `.dark` class is never present before hydration.
 */
export const THEME_INIT_SCRIPT = `(function(){try{document.documentElement.classList.remove("dark")}catch(e){}})()`;
