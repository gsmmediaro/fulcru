"use client";

import * as React from "react";
import { RiCheckLine } from "@remixicon/react";
import { cn } from "@/lib/cn";

type ChipProps = {
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function Chip({
  selected,
  onClick,
  multi = false,
  disabled = false,
  className,
  children,
}: ChipProps) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group inline-flex h-[36px] cursor-pointer items-center gap-[10px]",
        "rounded-[8px] px-[14px]",
        "text-[14px] leading-[20px] font-semibold",
        "transition-[background-color,color,box-shadow] duration-150 ease-out",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-app)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? cn(
              "bg-[color-mix(in_oklab,var(--color-brand-400)_14%,transparent)]",
              "text-[var(--color-brand-400)]",
              "ring-2 ring-[var(--color-brand-400)] ring-inset",
            )
          : cn(
              "bg-[var(--color-bg-surface-elevated)]",
              "text-[var(--color-text-strong)]",
              "ring-1 ring-[var(--color-stroke-soft)] ring-inset",
              "hover:bg-[color-mix(in_oklab,white_4%,var(--color-bg-surface-elevated))]",
              "hover:ring-[var(--color-stroke-sub)]",
            ),
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex shrink-0 items-center justify-center",
          multi
            ? "size-[16px] rounded-[4px]"
            : "size-[14px] rounded-full",
          selected
            ? "bg-[var(--color-brand-400)] text-[#0b1f21]"
            : "bg-transparent ring-1 ring-[var(--color-stroke-strong)] ring-inset",
        )}
      >
        {selected ? (
          multi ? (
            <RiCheckLine size={12} />
          ) : (
            <span className="size-[6px] rounded-full bg-[#0b1f21]" />
          )
        ) : null}
      </span>
      <span>{children}</span>
    </button>
  );
}

export function ChipGroup({
  children,
  multi,
  ariaLabel,
  className,
}: {
  children: React.ReactNode;
  multi?: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role={multi ? "group" : "radiogroup"}
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-[8px]", className)}
    >
      {children}
    </div>
  );
}
