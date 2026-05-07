import * as React from "react";
import { cn } from "@/lib/cn";

export function KpiCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  deltaTone?: "neutral" | "positive" | "negative";
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[8px] bg-[var(--color-bg-surface)] p-[16px]",
        "ring-1 ring-[var(--color-stroke-soft)]",
        className,
      )}
    >
      <div className="tp-overline text-[var(--color-text-soft)]">{label}</div>
      <div className="mt-[10px] text-[28px] font-semibold leading-[34px] tabular-nums text-[var(--color-text-strong)]">
        {value}
      </div>
      {delta !== undefined || hint !== undefined ? (
        <div className="mt-[6px] flex items-baseline gap-[8px] text-[12px]">
          {delta !== undefined ? (
            <span
              className={cn(
                "font-semibold tabular-nums",
                deltaTone === "positive" && "text-emerald-300",
                deltaTone === "negative" && "text-rose-300",
                deltaTone === "neutral" && "text-[var(--color-text-sub)]",
              )}
            >
              {delta}
            </span>
          ) : null}
          {hint !== undefined ? (
            <span className="text-[var(--color-text-soft)]">{hint}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
