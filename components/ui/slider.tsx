"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  ariaLabel?: string;
  /**
   * Suffix shown to the right of the slider in a chip. Pass a string like
   * `"1.5×"` or a node for richer content (e.g. an editable input).
   */
  trailing?: React.ReactNode;
  /**
   * Override the fill color for the active portion of the track. Defaults to
   * `--color-brand-400`.
   */
  fillColor?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
};

/**
 * AlignUI-style slider. Renders a thin track with a range fill, a clean
 * round thumb, and an optional trailing chip showing the value or a small
 * editable input. Built on a native <input type="range"> so it ships with
 * accessible keyboard handling for free.
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
  trailing,
  fillColor = "var(--color-brand-400)",
  className,
  id,
  disabled,
}: SliderProps) {
  const safe = Math.min(max, Math.max(min, value));
  const pct = max === min ? 0 : ((safe - min) / (max - min)) * 100;

  return (
    <div className={cn("flex items-center gap-[12px]", className)}>
      <div className="relative flex-1">
        {/* Track */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-[var(--color-bg-tint-8)]"
        />
        {/* Range */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full transition-[width] duration-100"
          style={{ width: `${pct}%`, background: fillColor }}
        />
        {/* Native input on top, thumb visible, track invisible (covered by divs) */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={safe}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "relative block h-[20px] w-full cursor-pointer appearance-none bg-transparent outline-none",
            // WebKit/Blink
            "[&::-webkit-slider-runnable-track]:h-[4px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent",
            "[&::-webkit-slider-thumb]:-mt-[6px] [&::-webkit-slider-thumb]:size-[16px] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0",
            "[&::-webkit-slider-thumb]:bg-[var(--color-text-strong)]",
            "[&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgb(0_0_0/0.3),0_0_0_1px_var(--color-stroke-soft)]",
            "[&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:duration-150",
            "hover:[&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgb(0_0_0/0.35),0_0_0_4px_color-mix(in_oklab,var(--color-brand-400)_18%,transparent)]",
            "active:[&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgb(0_0_0/0.4),0_0_0_5px_color-mix(in_oklab,var(--color-brand-400)_28%,transparent)]",
            "focus-visible:[&::-webkit-slider-thumb]:shadow-[0_1px_2px_rgb(0_0_0/0.4),0_0_0_4px_color-mix(in_oklab,var(--color-brand-400)_32%,transparent)]",
            // Firefox
            "[&::-moz-range-track]:h-[4px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent",
            "[&::-moz-range-thumb]:size-[16px] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
            "[&::-moz-range-thumb]:bg-[var(--color-text-strong)]",
            "[&::-moz-range-thumb]:shadow-[0_1px_2px_rgb(0_0_0/0.3),0_0_0_1px_var(--color-stroke-soft)]",
            "[&::-moz-range-thumb]:transition-shadow [&::-moz-range-thumb]:duration-150",
            "hover:[&::-moz-range-thumb]:shadow-[0_1px_2px_rgb(0_0_0/0.35),0_0_0_4px_color-mix(in_oklab,var(--color-brand-400)_18%,transparent)]",
            "focus-visible:[&::-moz-range-thumb]:shadow-[0_1px_2px_rgb(0_0_0/0.4),0_0_0_4px_color-mix(in_oklab,var(--color-brand-400)_32%,transparent)]",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        />
      </div>
      {trailing ? (
        <div
          className={cn(
            "flex items-center gap-[6px] rounded-[6px]",
            "bg-[var(--color-bg-tint-3)] px-[10px] py-[6px]",
            "ring-1 ring-[var(--color-stroke-soft)]",
            "text-[13px] font-semibold tabular-nums normal-case tracking-normal text-[var(--color-text-strong)]",
          )}
        >
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
