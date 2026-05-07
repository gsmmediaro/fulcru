"use client";

import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/i18n/provider";
import type { InvoiceStatus } from "@/lib/agency/types";

const KEYS: Record<InvoiceStatus, string> = {
  draft: "invoiceStatus.draft",
  sent: "invoiceStatus.sent",
  paid: "invoiceStatus.paid",
  overdue: "invoiceStatus.overdue",
};

const CLASSES: Record<InvoiceStatus, string> = {
  draft:
    "bg-[color-mix(in_oklab,white_6%,transparent)] text-[var(--color-text-soft)] ring-[var(--color-stroke-soft)]",
  sent: "bg-[color-mix(in_oklab,var(--color-brand-400)_18%,transparent)] text-[var(--color-brand-400)] ring-[color-mix(in_oklab,var(--color-brand-400)_28%,transparent)]",
  paid: "bg-[color-mix(in_oklab,var(--color-accent-green)_18%,transparent)] text-emerald-300 ring-[color-mix(in_oklab,var(--color-accent-green)_28%,transparent)]",
  overdue:
    "bg-[color-mix(in_oklab,#f43f5e_18%,transparent)] text-rose-300 ring-[color-mix(in_oklab,#f43f5e_28%,transparent)]",
};

export function InvoiceStatusPill({
  status,
  className,
}: {
  status: InvoiceStatus;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[6px] px-[8px] py-[3px] text-[11px] font-semibold ring-1",
        CLASSES[status],
        className,
      )}
    >
      {t(KEYS[status])}
    </span>
  );
}
