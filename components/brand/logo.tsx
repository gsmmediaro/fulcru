import * as React from "react";
import { cn } from "@/lib/cn";

export function Logo({
  className,
  wordmarkClassName,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { wordmarkClassName?: string }) {
  return (
    <div
      className={cn("flex items-center gap-[8px]", className)}
      aria-label="IPRoyal"
      {...props}
    >
      <svg viewBox="0 0 32 32" className="size-[32px] shrink-0" aria-hidden>
        <defs>
          <linearGradient id="crown-g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6be3eb" />
            <stop offset="100%" stopColor="#19bdc8" />
          </linearGradient>
        </defs>
        <path
          d="M4 23 L9 9 L13 17 L16 6 L19 17 L23 9 L28 23 Z"
          fill="url(#crown-g)"
          stroke="#19bdc8"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={cn(
          "text-[18px] font-bold tracking-tight text-[var(--color-brand-400)]",
          wordmarkClassName,
        )}
      >
        IPRoyal
      </span>
    </div>
  );
}
