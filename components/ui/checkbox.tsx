"use client";

import * as React from "react";
import { RiCheckLine, RiSubtractLine } from "@remixicon/react";
import { cn } from "@/lib/cn";

type CheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  size?: number;
  "aria-label"?: string;
};

export function Checkbox({
  checked,
  indeterminate,
  onCheckedChange,
  disabled,
  id,
  name,
  className,
  size = 20,
  ...rest
}: CheckboxProps) {
  const active = checked || indeterminate;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center",
        "transition-[background-color,border-color,box-shadow] duration-150",
        "rounded-[4px] border border-[color-mix(in_oklab,var(--color-brand-400)_55%,transparent)]",
        "hover:border-[var(--color-brand-400)]",
        active && "bg-[var(--color-brand-400)] border-[var(--color-brand-400)]",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        disabled={disabled}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="absolute inset-0 cursor-inherit opacity-0"
        aria-label={rest["aria-label"]}
      />
      {indeterminate ? (
        <RiSubtractLine size={14} className="text-[#232323]" />
      ) : checked ? (
        <RiCheckLine size={14} className="text-[#232323]" />
      ) : null}
    </span>
  );
}
