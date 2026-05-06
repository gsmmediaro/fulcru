import * as React from "react";
import { cn } from "@/lib/cn";

export function Logo({
  className,
  wordmarkClassName,
  showWordmark = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  wordmarkClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <div
      className={cn("flex items-center gap-[10px]", className)}
      aria-label="Fulcra"
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "relative flex size-[32px] shrink-0 items-center justify-center rounded-[9px]",
          "bg-[color-mix(in_oklab,var(--color-brand-400)_18%,transparent)]",
          "ring-1 ring-[color-mix(in_oklab,var(--color-brand-400)_28%,transparent)]",
          "transition-transform duration-[260ms] ease-[var(--ease-soft-spring,cubic-bezier(.22,1.2,.36,1))]",
          "group-hover/logo:rotate-[-3deg] group-hover/logo:scale-[1.04]",
        )}
      >
        <svg
          viewBox="0 0 32 32"
          className="size-[20px] text-[var(--color-brand-400)]"
          fill="none"
        >
          <path
            d="M4 13.5 L28 9.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M11 17.5 L21 17.5 L16 26 Z"
            fill="currentColor"
          />
          <circle cx="16" cy="11.5" r="1.5" fill="currentColor" />
        </svg>
      </span>
      {showWordmark ? (
        <span
          className={cn(
            "text-[18px] font-semibold tracking-[-0.01em] leading-none",
            "text-[var(--color-text-strong)]",
            wordmarkClassName,
          )}
        >
          Fulcra
        </span>
      ) : null}
    </div>
  );
}
