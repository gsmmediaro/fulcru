"use client";

import * as React from "react";
import { RiArrowDownSLine } from "@remixicon/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/cn";

const PRESETS = [
  "#FF7A1A",
  "#F59E0B",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#A855F7",
  "#8B5CF6",
  "#3B82F6",
  "#06B6D4",
  "#14B8A6",
  "#10B981",
  "#22C55E",
  "#84CC16",
  "#EAB308",
  "#71717A",
  "#F8FAFC",
];

function isValidHex(v: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

export function ColorPicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [hex, setHex] = React.useState(value);
  React.useEffect(() => setHex(value), [value]);

  function commitHex(next: string) {
    if (isValidHex(next)) {
      onChange(next.startsWith("#") ? next : `#${next}`);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel ?? "Choose color"}
          className={cn(
            "inline-flex h-[40px] items-center gap-[10px] rounded-[6px] px-[8px]",
            "bg-[color-mix(in_oklab,white_3%,transparent)]",
            "ring-1 ring-[var(--color-stroke-soft)]",
            "text-[13px] font-medium normal-case tracking-normal text-[var(--color-text-strong)]",
            "transition-colors duration-150",
            "hover:ring-[var(--color-stroke-sub)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
            "data-[state=open]:ring-[var(--color-brand-400)]",
          )}
        >
          <span
            aria-hidden
            className="size-[20px] rounded-[4px] ring-1 ring-[var(--color-stroke-soft)]"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono uppercase tabular-nums">{value}</span>
          <RiArrowDownSLine
            size={16}
            className="text-[var(--color-text-soft)]"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[224px]" align="start" sideOffset={6}>
        <div className="grid grid-cols-8 gap-[6px]">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Use ${c}`}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className={cn(
                "size-[22px] rounded-[4px] transition-transform",
                "ring-1 ring-[var(--color-stroke-soft)]",
                "hover:scale-110",
                value.toLowerCase() === c.toLowerCase() &&
                  "ring-2 ring-white scale-110",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="mt-[10px] flex items-center gap-[8px]">
          <input
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            onBlur={(e) => commitHex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitHex((e.target as HTMLInputElement).value);
                setOpen(false);
              }
            }}
            placeholder="#FF7A1A"
            className={cn(
              "h-[32px] flex-1 rounded-[6px] bg-[color-mix(in_oklab,white_3%,transparent)]",
              "px-[8px] font-mono text-[12px] uppercase tabular-nums",
              "text-[var(--color-text-strong)] placeholder:text-[var(--color-text-soft)]",
              "ring-1 ring-[var(--color-stroke-soft)] outline-none",
              "focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)]",
            )}
          />
          <input
            type="color"
            value={isValidHex(hex) ? hex : value}
            onChange={(e) => onChange(e.target.value)}
            className="h-[32px] w-[40px] cursor-pointer rounded-[6px] border border-[var(--color-stroke-soft)] bg-transparent"
            aria-label="Color wheel"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
