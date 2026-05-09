import * as React from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "soft-orange";

const variantClasses: Record<Variant, string> = {
  neutral:
    "bg-[var(--color-bg-tint-6)] text-[var(--color-text-strong)]",
  brand: "bg-[var(--color-brand-100)] text-[var(--color-brand-400)]",
  success: "bg-emerald-500/15 text-emerald-400",
  warning: "bg-amber-500/15 text-amber-400",
  danger: "bg-rose-500/15 text-rose-400",
  "soft-orange": "text-[var(--color-accent-orange)]",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

export function Badge({
  className,
  variant = "neutral",
  size = "sm",
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[6px] whitespace-nowrap font-semibold",
        size === "sm"
          ? "h-[22px] rounded-[6px] px-[8px] text-[11px] leading-[14px]"
          : "h-[28px] rounded-[8px] px-[10px] text-[12px] leading-[16px]",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
