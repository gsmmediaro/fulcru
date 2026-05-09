"use client";

import * as React from "react";
import type { ThemePreference } from "@/lib/agency/types";

type Props = {
  /** The user's persisted preference. */
  theme: ThemePreference;
};

/**
 * Mirrors the user's theme preference into the live DOM and writes it
 * back to a cookie so the next SSR pass can paint the right palette
 * before hydration. Listens for OS-level changes when the user picks
 * "auto" so the .dark class flips without a reload.
 */
export function ThemeApplier({ theme }: Props) {
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);

    // Persist for SSR. 1-year max-age, lax so it survives basic redirects.
    document.cookie = `fulcru_theme=${theme}; path=/; max-age=31536000; samesite=lax`;

    // Keep the legacy `dark` class in sync so any `dark:` Tailwind rules
    // and the `@custom-variant dark` keep working.
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark =
        theme === "dark" || (theme === "auto" && mql.matches);
      root.classList.toggle("dark", isDark);
    };

    apply();

    if (theme === "auto") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
    return undefined;
  }, [theme]);

  return null;
}
