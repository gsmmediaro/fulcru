"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileDrawer } from "./mobile-drawer";
import { useLocale } from "@/lib/i18n/provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Close drawer when viewport widens past xl (≥1280px)
  React.useEffect(() => {
    const mql = window.matchMedia("(min-width: 1280px)");
    const handler = () => mql.matches && setDrawerOpen(false);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      {/* Static sidebar - visible only at xl and up */}
      <div className="hidden shrink-0 xl:block">
        <Sidebar />
      </div>

      {/* Mobile/tablet drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setDrawerOpen(true)} />
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          <main className="px-[16px] pb-[40px] pt-[20px] sm:px-[24px] sm:pt-[24px] lg:px-[32px] lg:pt-[32px]">
            <div className="mx-auto w-full max-w-[1136px]">{children}</div>
          </main>
        </div>
        <footer className="shrink-0 border-t border-[var(--color-stroke-soft)] px-[16px] py-[18px] sm:px-[24px] lg:px-[32px]">
          <div className="mx-auto flex w-full max-w-[1136px] flex-col gap-[12px] text-[12px] text-[var(--color-text-soft)] sm:flex-row sm:items-center sm:justify-between">
            <span>{t("footer.tagline", { year: new Date().getFullYear() })}</span>
            <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[6px] sm:gap-x-[20px]">
              <a className="hover:text-[var(--color-text-strong)]" href="#">
                {t("footer.terms")}
              </a>
              <a className="hover:text-[var(--color-text-strong)]" href="#">
                {t("footer.privacy")}
              </a>
              <a className="hover:text-[var(--color-text-strong)]" href="#">
                {t("footer.aup")}
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
