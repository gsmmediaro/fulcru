"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { RiArrowDownSLine, RiCheckLine } from "@remixicon/react";
import { cn } from "@/lib/cn";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const SelectGroup = SelectPrimitive.Group;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    leadingIcon?: React.ReactNode;
  }
>(({ className, children, leadingIcon, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "group inline-flex w-full items-center justify-between gap-[10px]",
      "h-[40px] px-[12px] rounded-[6px]",
      "bg-[color-mix(in_oklab,white_3%,transparent)]",
      "ring-1 ring-[var(--color-stroke-soft)]",
      "text-[14px] leading-[20px] text-[var(--color-text-strong)]",
      "transition-[box-shadow,background-color] duration-150",
      "hover:ring-[var(--color-stroke-sub)]",
      "data-[state=open]:ring-[var(--color-brand-400)]",
      "focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)] focus-visible:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="flex items-center gap-[10px] truncate">
      {leadingIcon ? (
        <span className="text-[var(--color-text-soft)]">{leadingIcon}</span>
      ) : null}
      <span className="truncate">{children}</span>
    </span>
    <SelectPrimitive.Icon asChild>
      <RiArrowDownSLine
        size={18}
        className="shrink-0 text-[var(--color-text-soft)] transition-transform duration-200 group-data-[state=open]:rotate-180"
      />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(
  (
    { className, children, position = "popper", sideOffset = 6, ...props },
    ref,
  ) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        sideOffset={sideOffset}
        className={cn(
          "z-[100] min-w-[var(--radix-select-trigger-width)] overflow-hidden",
          "rounded-[8px] bg-[var(--color-bg-surface-elevated)] p-[6px]",
          "ring-1 ring-[var(--color-stroke-sub)]",
          "shadow-[var(--shadow-regular-lg)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="max-h-[280px]">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  ),
);
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-[8px]",
      "h-[36px] px-[10px] pr-[28px] rounded-[6px]",
      "text-[14px] leading-[20px] text-[var(--color-text-strong)]",
      "outline-none",
      "data-[highlighted]:bg-[color-mix(in_oklab,white_6%,transparent)]",
      "data-[state=checked]:text-[var(--color-brand-400)]",
      "data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed",
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="absolute right-[10px] inline-flex">
      <RiCheckLine size={16} className="text-[var(--color-brand-400)]" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
