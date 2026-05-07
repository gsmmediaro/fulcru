import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AuthLanguageToggle } from "./language-toggle";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/cn";

export async function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getT();
  const year = new Date().getFullYear();
  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{
        background:
          "radial-gradient(ellipse 90% 55% at 50% -10%, color-mix(in oklab, var(--color-brand-400) 14%, var(--color-bg-app)) 0%, var(--color-bg-app) 55%), var(--color-bg-app)",
      }}
    >
      <main className="flex flex-1 flex-col items-center justify-center gap-[32px] px-[16px] py-[48px]">
        <Link
          href="/"
          className="group/logo inline-flex items-center"
          aria-label="Fulcru"
        >
          <Logo size={40} />
        </Link>

        <div className="grid w-full max-w-[1080px] grid-cols-1 gap-[24px] md:grid-cols-2">
          {children}
        </div>

        <p className="text-[12px] leading-[16px] text-[var(--color-text-soft)]">
          {t("auth.copyright", { year })}
        </p>
      </main>
    </div>
  );
}

export function AuthCard({
  children,
  className,
  variant = "form",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "form" | "marketing";
}) {
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-[12px]",
        variant === "form"
          ? "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)] shadow-[var(--shadow-regular-md)]"
          : "bg-transparent ring-1 ring-[color-mix(in_oklab,var(--color-brand-400)_22%,transparent)]",
        className,
      )}
    >
      {children}
    </article>
  );
}

export function AuthCardLanguageToggle() {
  return <AuthLanguageToggle />;
}
