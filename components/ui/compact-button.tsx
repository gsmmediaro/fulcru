"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/cn";

type Variant = "neutral" | "brand" | "ghost";
type Size = "xs" | "sm" | "md";

interface CompactButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: Variant;
  size?: Size;
  "aria-label": string;
}

const variantClasses: Record<Variant, string> = {
  neutral: cn(
    "bg-transparent text-[var(--color-text-soft)]",
    "hover:bg-[color-mix(in_oklab,white_6%,transparent)] hover:text-[var(--color-text-strong)]",
  ),
  brand: cn(
    "bg-transparent text-[var(--color-brand-400)]",
    "hover:bg-[color-mix(in_oklab,var(--color-brand-400)_10%,transparent)]",
  ),
  ghost: "text-[var(--color-text-strong)] hover:bg-white/5",
};

const sizeClasses: Record<Size, string> = {
  xs: "size-[24px] rounded-[6px]",
  sm: "size-[32px] rounded-[6px]",
  md: "size-[36px] rounded-[8px]",
};

export const CompactButton = React.forwardRef<
  HTMLButtonElement,
  CompactButtonProps
>(
  (
    {
      className,
      variant = "neutral",
      size = "sm",
      asChild,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : "button"}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center",
          "transition-[background-color,color] duration-150 ease-out",
          "outline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--color-brand-400)]",
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
CompactButton.displayName = "CompactButton";
