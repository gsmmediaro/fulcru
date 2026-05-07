"use client";

import * as React from "react";
import { RiCheckLine } from "@remixicon/react";
import { cn } from "@/lib/cn";

type StepperProps = {
  total: number;
  current: number;
  onJumpBack?: (step: number) => void;
};

export function Stepper({ total, current, onJumpBack }: StepperProps) {
  const pct = total > 1 ? ((current - 1) / (total - 1)) * 100 : 0;
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="relative h-[4px] w-full overflow-visible">
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 right-0 rounded-full bg-[var(--color-stroke-soft)]"
        />
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-brand-400)] transition-[width] duration-[420ms]"
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between">
          {Array.from({ length: total }).map((_, i) => {
            const stepNum = i + 1;
            const past = stepNum < current;
            const active = stepNum === current;
            const future = stepNum > current;
            const interactive = past && !!onJumpBack;
            return (
              <button
                key={stepNum}
                type="button"
                aria-label={`Pasul ${stepNum} din ${total}`}
                aria-current={active ? "step" : undefined}
                disabled={!interactive}
                onClick={() =>
                  interactive ? onJumpBack?.(stepNum) : undefined
                }
                className={cn(
                  "flex shrink-0 items-center justify-center transition-transform duration-200",
                  interactive && "cursor-pointer hover:scale-110",
                  !interactive && "cursor-default",
                  active
                    ? "size-[12px] rounded-full bg-[var(--color-brand-400)] ring-[3px] ring-[color-mix(in_oklab,var(--color-brand-400)_28%,transparent)]"
                    : past
                      ? "size-[16px] rounded-full bg-[var(--color-brand-400)] text-[#0b1f21]"
                      : future
                        ? "size-[10px] rounded-full bg-[var(--color-bg-app)] ring-2 ring-inset ring-[var(--color-stroke-strong)]"
                        : "",
                )}
              >
                {past ? <RiCheckLine size={10} /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
