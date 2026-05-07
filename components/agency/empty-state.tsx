import * as React from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-[14px] rounded-[8px]",
        "bg-[var(--color-bg-surface)] ring-1 ring-[var(--color-stroke-soft)]",
        "px-[24px] py-[56px] text-center",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-[48px] items-center justify-center rounded-full",
          "bg-[color-mix(in_oklab,var(--color-brand-400)_14%,transparent)]",
          "ring-1 ring-[color-mix(in_oklab,var(--color-brand-400)_24%,transparent)]",
          "text-[var(--color-brand-400)]",
        )}
      >
        {icon}
      </span>
      <div className="flex max-w-[420px] flex-col gap-[6px]">
        <h2 className="text-[16px] font-semibold leading-[22px] text-[var(--color-text-strong)]">
          {title}
        </h2>
        <p className="text-[13px] leading-[20px] text-[var(--color-text-soft)]">
          {description}
        </p>
      </div>
      {action ? <div className="mt-[6px]">{action}</div> : null}
    </div>
  );
}
