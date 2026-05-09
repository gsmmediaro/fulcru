"use client";

import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cn } from "@/lib/cn";

type Variant = "primary" | "primary-orange" | "outline" | "ghost" | "link";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: Variant;
  size?: Size;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: cn(
    "bg-[var(--color-brand-400)] text-[#0b1f21]",
    "hover:bg-[var(--color-brand-500)]",
    "active:bg-[var(--color-brand-300)]",
    "focus-visible:shadow-[var(--shadow-button-brand-focus)]",
  ),
  "primary-orange": cn(
    "bg-[var(--color-accent-orange)] text-white",
    "hover:bg-[var(--color-accent-orange-hover)]",
    "active:bg-[var(--color-accent-orange-ring)]",
    "focus-visible:shadow-[var(--shadow-button-orange-focus)]",
  ),
  outline: cn(
    "border border-[var(--color-brand-400)] text-[var(--color-brand-400)] bg-transparent",
    "hover:bg-[color-mix(in_oklab,var(--color-brand-400)_10%,transparent)]",
    "active:bg-[color-mix(in_oklab,var(--color-brand-400)_18%,transparent)]",
    "focus-visible:shadow-[var(--shadow-button-brand-focus)]",
  ),
  ghost: cn(
    "text-[var(--color-text-sub)] hover:text-[var(--color-text-strong)]",
    "hover:bg-[var(--color-bg-tint-6)]",
  ),
  link: cn(
    "text-[var(--color-text-strong)] hover:text-[var(--color-brand-400)]",
    "underline-offset-4 hover:underline",
  ),
};

const sizeClasses: Record<Size, string> = {
  sm: "h-[32px] px-[10px] rounded-[4px] text-[12px] leading-[16px] font-semibold gap-[6px]",
  md: "h-[36px] px-[14px] rounded-[6px] text-[13px] leading-[18px] font-semibold gap-[8px]",
  lg: "h-[40px] px-[16px] rounded-[8px] text-[14px] leading-[20px] font-semibold gap-[8px]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      asChild,
      leadingIcon,
      trailingIcon,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center whitespace-nowrap",
          "transition-[background-color,color,border-color,box-shadow,scale] duration-150 ease-out",
          "outline-offset-2 focus-visible:outline-none select-none",
          "active:scale-[0.98]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {leadingIcon ? (
          <span className="-ml-1 flex shrink-0">{leadingIcon}</span>
        ) : null}
        <Slottable>{children}</Slottable>
        {trailingIcon ? (
          <span className="-mr-1 flex shrink-0">{trailingIcon}</span>
        ) : null}
      </Comp>
    );
  },
);
Button.displayName = "Button";
