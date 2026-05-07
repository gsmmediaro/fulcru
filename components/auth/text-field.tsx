"use client";

import * as React from "react";
import { RiEyeLine, RiEyeOffLine } from "@remixicon/react";
import { cn } from "@/lib/cn";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  error?: string;
  hint?: string;
  togglePassword?: boolean;
  showLabel?: string;
  hideLabel?: string;
};

export const TextField = React.forwardRef<HTMLInputElement, Props>(
  function TextField(
    {
      label,
      error,
      hint,
      togglePassword,
      showLabel = "Show password",
      hideLabel = "Hide password",
      type = "text",
      id,
      className,
      ...rest
    },
    ref,
  ) {
    const [reveal, setReveal] = React.useState(false);
    const finalType = togglePassword && reveal ? "text" : type;
    const reactId = React.useId();
    const fieldId = id ?? reactId;
    return (
      <div className={cn("flex flex-col gap-[6px]", className)}>
        <label
          htmlFor={fieldId}
          className="text-[13px] font-medium leading-[18px] text-[var(--color-text-sub)]"
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={finalType}
            aria-invalid={!!error}
            className={cn(
              "h-[40px] w-full rounded-[6px] px-[12px]",
              togglePassword ? "pr-[40px]" : "",
              "text-[14px] leading-[20px] text-[var(--color-text-strong)]",
              "bg-[var(--color-bg-surface-elevated)]",
              "border outline-none",
              error
                ? "border-[var(--color-accent-red)]"
                : "border-[var(--color-stroke-soft)]",
              "focus:border-[var(--color-brand-400)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--color-brand-400)_28%,transparent)]",
              "placeholder:text-[var(--color-text-soft)]",
              "transition-[border-color,box-shadow] duration-150",
            )}
            {...rest}
          />
          {togglePassword ? (
            <button
              type="button"
              onClick={() => setReveal((p) => !p)}
              aria-label={reveal ? hideLabel : showLabel}
              className={cn(
                "absolute right-[8px] top-1/2 -translate-y-1/2 flex size-[28px] items-center justify-center rounded-[4px]",
                "text-[var(--color-text-soft)] hover:text-[var(--color-text-strong)] hover:bg-[color-mix(in_oklab,white_6%,transparent)]",
                "transition-colors duration-150",
              )}
            >
              {reveal ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="text-[12px] leading-[16px] text-[var(--color-accent-red)]">
            {error}
          </p>
        ) : hint ? (
          <p className="text-[12px] leading-[16px] text-[var(--color-text-soft)]">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
