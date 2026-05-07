"use client";

import * as React from "react";
import { translate, type Locale } from "./dict";

type Ctx = {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (next: Locale) => void;
};

const LocaleContext = React.createContext<Ctx | null>(null);

export const LOCALE_COOKIE = "fulcra_locale";

export function LocaleProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = React.useCallback((next: Locale) => {
    if (typeof document !== "undefined") {
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${oneYear}; samesite=lax`;
    }
    setLocaleState(next);
  }, []);

  const value = React.useMemo<Ctx>(
    () => ({
      locale,
      t: (key, vars) => translate(locale, key, vars),
      setLocale,
    }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Ctx {
  const ctx = React.useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: "en",
      t: (key) => key,
      setLocale: () => {},
    };
  }
  return ctx;
}
