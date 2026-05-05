import * as React from "react";
import { cn } from "@/lib/cn";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { bleed?: boolean }
>(({ className, bleed, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-[8px] bg-[var(--color-bg-surface)]",
      "ring-1 ring-[var(--color-stroke-soft)]",
      "transition-[box-shadow,transform] duration-200",
      bleed ? "p-0" : "p-[24px]",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";
