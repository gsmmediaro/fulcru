"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RiTranslate2, RiArrowDownSLine } from "@remixicon/react";
import { useLocale } from "@/lib/i18n/provider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/dict";
import { cn } from "@/lib/cn";

export function AuthLanguageToggle() {
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(next: Locale) {
    setLocale(next);
    router.refresh();
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-[6px] rounded-[6px] px-[8px] py-[6px]",
          "text-[13px] font-medium text-[var(--color-text-sub)]",
          "hover:bg-[var(--color-bg-tint-5)] hover:text-[var(--color-text-strong)]",
          "transition-colors duration-150",
        )}
      >
        <RiTranslate2 size={16} />
        <span>{LOCALE_LABELS[locale]}</span>
        <RiArrowDownSLine
          size={14}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 top-[36px] z-10 min-w-[140px] rounded-[8px] bg-[var(--color-bg-surface-elevated)] p-[4px] ring-1 ring-[var(--color-stroke-soft)] shadow-[var(--shadow-regular-md)]"
        >
          {LOCALES.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === locale}
                onClick={() => pick(l)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[4px] px-[10px] py-[8px]",
                  "text-[13px]",
                  l === locale
                    ? "bg-[color-mix(in_oklab,var(--color-brand-400)_14%,transparent)] text-[var(--color-brand-400)] font-semibold"
                    : "text-[var(--color-text-strong)] hover:bg-[var(--color-bg-tint-5)]",
                )}
              >
                <span>{LOCALE_LABELS[l]}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
