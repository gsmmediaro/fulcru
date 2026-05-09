"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";

export const Dropdown = DropdownMenuPrimitive.Root;
export const DropdownTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownPortal = DropdownMenuPrimitive.Portal;

export const DropdownContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 8, align = "end", ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      align={align}
      className={cn(
        "z-50 min-w-[200px] overflow-hidden",
        "rounded-[6px] bg-[var(--color-bg-surface-elevated)] p-[6px]",
        "ring-1 ring-[var(--color-stroke-sub)]",
        "shadow-[var(--shadow-regular-lg)]",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownContent.displayName = "DropdownContent";

export const DropdownItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "flex cursor-pointer items-center gap-[10px] h-[36px] px-[10px] rounded-[6px]",
      "text-[14px] leading-[20px] text-[var(--color-text-strong)]",
      "outline-none data-[highlighted]:bg-[var(--color-bg-tint-6)]",
      className,
    )}
    {...props}
  />
));
DropdownItem.displayName = "DropdownItem";

export const DropdownSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("my-[4px] h-px bg-[var(--color-stroke-soft)]", className)}
    {...props}
  />
));
DropdownSeparator.displayName = "DropdownSeparator";

export const DropdownLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-[10px] py-[6px] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-soft)]",
      className,
    )}
    {...props}
  />
));
DropdownLabel.displayName = "DropdownLabel";
