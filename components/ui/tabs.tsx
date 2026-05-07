"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "relative flex items-center gap-[4px] border-b border-[var(--color-stroke-soft)]",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative inline-flex shrink-0 items-center justify-center whitespace-nowrap",
      "h-[40px] px-[14px] min-w-[88px] sm:h-[44px] sm:px-[18px] sm:min-w-[104px]",
      "text-[14px] leading-[20px] font-medium sm:text-[15px]",
      "text-[var(--color-text-soft)] cursor-pointer",
      "transition-colors duration-150 outline-none",
      "hover:text-[var(--color-text-strong)]",
      "data-[state=active]:text-[var(--color-brand-400)] data-[state=active]:font-semibold",
      "focus-visible:text-[var(--color-text-strong)]",
      // Base underline - animates scale + opacity with soft-spring easing
      "after:pointer-events-none after:absolute after:bottom-0 after:left-[14px] after:right-[14px] after:h-[2px]",
      "after:origin-center after:scale-x-0 after:rounded-full after:bg-[var(--color-brand-400)]",
      "after:transition-[transform,opacity] after:duration-[320ms] after:ease-[var(--ease-soft-spring)]",
      "data-[state=active]:after:scale-x-100",
      // Hover preview - soft underline that fades in for inactive tabs
      "data-[state=inactive]:hover:after:scale-x-[0.45] data-[state=inactive]:hover:after:opacity-40",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = TabsPrimitive.Content;
