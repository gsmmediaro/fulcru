import * as React from "react";
import Link from "next/link";
import { RiArrowLeftLine } from "@remixicon/react";
import { Logo } from "@/components/brand/logo";
import { getT } from "@/lib/i18n/server";

export async function LegalShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  const { t } = await getT();
  const year = new Date().getFullYear();
  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{
        background:
          "radial-gradient(ellipse 90% 55% at 50% -10%, color-mix(in oklab, var(--color-brand-400) 10%, var(--color-bg-app)) 0%, var(--color-bg-app) 55%), var(--color-bg-app)",
      }}
    >
      <header className="flex items-center justify-between px-[24px] py-[20px] md:px-[40px]">
        <Link href="/" aria-label="Fulcru">
          <Logo size={32} />
        </Link>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-[6px] rounded-[6px] px-[10px] py-[6px] text-[13px] font-medium leading-[18px] text-[var(--color-text-soft)] transition-colors hover:text-[var(--color-text-strong)]"
        >
          <RiArrowLeftLine size={14} />
          {t("legal.backToApp")}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[760px] flex-1 px-[24px] pb-[80px] pt-[32px] md:px-[40px]">
        <div className="mb-[32px]">
          <h1 className="text-[32px] font-semibold leading-[40px] tracking-[-0.02em] text-[var(--color-text-strong)]">
            {title}
          </h1>
          <p className="mt-[8px] text-[13px] leading-[20px] text-[var(--color-text-soft)]">
            {t("legal.lastUpdated", { date: lastUpdated })}
          </p>
        </div>

        <article className="legal-prose">{children}</article>
      </main>

      <footer className="border-t border-[var(--color-stroke-soft)] px-[24px] py-[20px] text-center text-[12px] leading-[16px] text-[var(--color-text-soft)] md:px-[40px]">
        <span>{t("auth.copyright", { year })}</span>
        <span className="mx-[10px] text-[var(--color-text-soft)] opacity-50">
          ·
        </span>
        <Link
          href="/terms"
          className="hover:text-[var(--color-text-strong)]"
        >
          {t("signup.terms")}
        </Link>
        <span className="mx-[10px] text-[var(--color-text-soft)] opacity-50">
          ·
        </span>
        <Link
          href="/privacy"
          className="hover:text-[var(--color-text-strong)]"
        >
          {t("signup.privacy")}
        </Link>
      </footer>
    </div>
  );
}
