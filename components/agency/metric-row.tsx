import * as React from "react";
import { cn } from "@/lib/cn";

export function MetricRow({
  label,
  value,
  sub,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: "brand" | "emerald" | "amber" | "rose";
  className?: string;
}) {
  const accentClass =
    accent === "brand"
      ? "text-[var(--color-brand-400)]"
      : accent === "emerald"
        ? "text-emerald-300"
        : accent === "amber"
          ? "text-amber-300"
          : accent === "rose"
            ? "text-rose-300"
            : "text-[var(--color-text-strong)]";
  return (
    <div
      className={cn(
        "rounded-[8px] bg-[var(--color-bg-surface)] p-[16px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        className,
      )}
    >
      <div className="tp-overline text-[var(--color-text-soft)]">{label}</div>
      <div
        className={cn(
          "mt-[10px] text-[24px] font-semibold leading-[30px] tabular-nums",
          accentClass,
        )}
      >
        {value}
      </div>
      {sub !== undefined ? (
        <div className="mt-[6px] text-[12px] text-[var(--color-text-soft)]">
          {sub}
        </div>
      ) : null}
    </div>
  );
}
